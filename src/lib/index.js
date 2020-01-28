'use strict';

const https = require('https');
const fs = require('fs');
const mongoose = require('mongoose');
const Credential = require('./db').Credential;
const crypto = require('crypto');
const { Certificate } = require('@fidm/x509');

const app = require('../app.js');
const User = require('./db').User;
const config = require('../config').settings;
const SoftHSMDriver = require('./hsm/SoftHsmDriver');


/*
** This class is the entry point of our app. It has all the methods our app uses
*/
class CSCServer {
    listen(options, next) {
        app.set('port', options.port || config.https.port);
        this.server = https.createServer({
            cert: fs.readFileSync(options.cert || config.https.cert_SSL),
            key: fs.readFileSync(options.key || config.https.key_SSL),
            passphrase: options.passphrase || config.https.SSL_key_passphrase
        }, app);

        mongoose.connection.on('connected', () => {
            let listener = this.server.listen({
                port: options.port || config.https.port,
                host: options.host || config.https.host
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
                if (err) {
                    this.hsm.finalize();
                    return next(err);
                }

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

                    fs.readFile(`${convertedCertFile}`, (err, certstr) => {
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
                                    type: 'online',
                                    format: 'N',
                                    label: 'Please provide the OTP sent to your number',
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

    sign(credentialID, hashes, signAlgo, next) {
        this.hsm = new SoftHSMDriver();
        this.hsm.sign(credentialID, hashes[0], signAlgo, (outputFile, error) => {
            if (error) { next(null, error); return; }
            fs.readFile(`${outputFile}`, (err, rawSignature) => {
                this.hsm.finalize();
                if (error) { next(null, err); return; }
                next(Buffer.from(rawSignature, 'binary').toString('base64'));
            });
        });
    }
}

module.exports.createServer = function () {
    return new CSCServer();
};