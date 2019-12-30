'use strict';

const https = require('https');
const fs = require('fs');
const mongoose = require('mongoose');
const app = require('./app.js');
const User = require('./db').User;
const Credential = require('./db').Credential;
const crypto = require('crypto');
const config = require('../config').settings;
const utils = require('./utils');
const SoftHSMDriver = require('./hsm/SoftHsmDriver');
const { Certificate } = require('@fidm/x509');
const base64 = require('base64-js');

/*
** This class is the entry point of our app. It has all the methods our app uses
*/
class CSCServer {
    listen(options, next) {
        app.set('port', options.port || config.https.port);
        this.server = https.createServer({
            cert: fs.readFileSync(options.cert || (config.resources_path + '\\' + config.https.cert_SSL)),
            key: fs.readFileSync(options.key || (config.resources_path + '\\' + config.https.key_SSL)),
            passphrase: options.passphrase || config.https.SSL_key_passphrase
        }, app);

        mongoose.connection.on('connected', () => {
            let listener = this.server.listen({
                port:  options.port || config.https.port,
                host:  options.host || config.https.host
            }, function (err) {
                if (err) return next(err);
                next(undefined, listener.address().port, listener.address().address);
            });
        });

        mongoose.connect(config.database_url, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true, useCreateIndex: true })
            .catch(err => next(err));
    }

    registerUser(username, password, next) {
        mongoose.connection.on('connected', () => {
            mongoose.connection.removeAllListeners();

            let user = new User({
                user: username,
                password: crypto.createHash('sha256').update(password).digest('hex')
            });

            user.save(function (err) {
                next(err);
            });
        });

        mongoose.connect(config.database_url, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true, useCreateIndex: true })
            .catch(err => next(err));
    }

    generateCredentials(username, keypass, next) {
        this.hsm = new SoftHSMDriver();

        mongoose.connection.on('connected', () => {
            mongoose.connection.removeAllListeners();

            this.hsm.generateCertificateAndKeys((credentialID, convertedCertFile, err) => {
                if (err) next(err);

                // Save credential ID to the user provided
                User.findOneAndUpdate({ user: username }, {
                    $push: {
                        'credentials': {
                            credentialID: credentialID,
                            pin: keypass,
                            sad: "",
                            key: "",
                            timestamp: Date.now()
                        }
                    }
                }, (err, doc) => {
                    if (err) {
                        this.hsm.finalize();
                        next(err); return;
                    }
                    if (!doc) {
                        this.hsm.finalize();
                        next('No doc'); return;
                    }

                    fs.readFile(`${config.resources_path}\\${convertedCertFile}`, (err, certstr) => {
                        this.hsm.finalize();

                        if (err) { next(err); return; }
                        const cert = Certificate.fromPEM(certstr);

                        let credential = new Credential(
                            {
                                credentialID: credentialID,
                                description: "Certificate",
                                key: {
                                    status: "enabled",
                                    algo: [cert.publicKey.oid],
                                    len: 2048,
                                    curve: ""
                                },
                                cert: {
                                    status: "valid",
                                    certificates: [Buffer.from(cert.raw).toString('base64')],
                                    issuerDN: `CN=${cert.issuer.commonName},OU=${cert.issuer.organizationalUnitName},L=${cert.issuer.localityName},O=${cert.issuer.organizationName},C=${cert.issuer.countryName}`,
                                    serialNumber: cert.serialNumber,
                                    subjectDN: `CN=${cert.subject.commonName},OU=${cert.subject.organizationalUnitName},L=${cert.subject.localityName},O=${cert.subject.organizationName},C=${cert.subject.countryName}`,
                                    validFrom: cert.validFrom,
                                    validTo: cert.validTo
                                },
                                authMode: 'explicit',
                                SCAL: '1',
                                PIN: {
                                    presence: 'true',
                                    format: 'N',
                                    label: 'PIN',
                                    description: 'Please enter the signature PIN'
                                },
                                OTP: {
                                    presence: 'false',
                                    types: '',
                                    format: '',
                                    label: '',
                                    description: '',
                                    ID: '',
                                    provider: '',
                                },
                                multisign: 1,
                                lang: 'en-US'
                            });
                        credential.save(function (err) {
                            if (err) { next(err); return; }

                            next();
                        });
                    });
                });
            });
        });

        mongoose.connect(config.database_url, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true, useCreateIndex: true })
            .catch(err => next(err));
    }

    sign(credentialID, hash, hashAlgo, next) {
        this.hsm = new SoftHSMDriver();
        let alg = utils.getAlgorithmByOID(hashAlgo);
        this.hsm.sign(credentialID, hash, alg, (outputFile, error) => {
            if (error) { next(null, error); return; }
            fs.readFile(`${outputFile}`, (err, rawSignature) => {
                this.hsm.finalize();
                if (error) { next(null, err); return; }
                next(base64.fromByteArray(rawSignature));
            });
        });
    }
}

module.exports.createServer = function (options) {
    return new CSCServer(options);
};