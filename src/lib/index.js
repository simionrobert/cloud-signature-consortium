'use strict';

const https = require('https');
const fs = require('fs');
const mongoose = require('mongoose');
const Credential = require('./db').Credential;
const Client = require('./db').Client;
const crypto = require('crypto');
const { Certificate } = require('@fidm/x509');
const utils = require('../utils');
const exec = require('child_process').exec;
const logger = require('winston');
const config = require('../../config').settings;
const app = require('../app.js');
const User = require('./db').User;
const SoftHSMDriver = require('./hsm/SoftHsmDriver');


/*
 ** This class is the entry point of our app. It has all the methods our app uses
 */
class CSCServer {
    listen(options, next) {
        app.set('port', options.port || config.https.port);

        this.server = https.createServer({
            cert: fs.readFileSync(options.cert || config.https.certificate),
            key: fs.readFileSync(options.key || config.https.private_key),
            passphrase: options.passphrase || config.https.private_key_password
        }, app);

        mongoose.connection.on('connected', () => {
            let listener = this.server.listen({
                port: options.port || config.https.port,
                host: options.host || config.https.host
            }, function(err) {
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

            user.save(function(err) {
                next(err);
            });
        });

        mongoose.connect(config.database_url, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true, useCreateIndex: true })
            .catch(err => next(err));
    }

    registerClient(name, id, secret, redirectUri, next) {
        mongoose.connection.on('connected', () => {
            mongoose.connection.removeAllListeners();

            let client = new Client({
                name: name,
                client_id: id,
                client_secret: utils.hash(secret),
                redirect_uri: redirectUri
            });

            client.save(function(err) {
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

            this.hsm.generateCertificateAndKeys((credentialID, certFile, err) => {
                if (err) {
                    this.hsm.finalize();
                    return next(err);
                }

                // Save credential ID to the user provided
                User.findOneAndUpdate({ user: username }, {
                    $push: {
                        'credentials': {
                            credentialID: credentialID,
                            pin: utils.hash(keypass)
                        }
                    }
                }, (err, doc) => {
                    if (err) {
                        this.hsm.finalize();
                        next(err);
                        return;
                    }
                    if (!doc) {
                        this.hsm.finalize();
                        next('No doc');
                        return;
                    }

                    // Convert cert der to pem
                    logger.info("Converting certificate...");

                    const convertedCertFile = `${certFile.substr(0, certFile.lastIndexOf("."))}.pem`;
                    let cmdToExec = (`"${config.openSSL_path}" x509 -inform der -in "${certFile}" -out "${convertedCertFile}"`);
                    exec(cmdToExec, { cwd: `${config.resources_path}` }, (error) => {
                        if (error) {
                            this.finalize();
                            utils.deleteFile(`${convertedCertFile}`);
                            next(err);
                            return;
                        }

                        logger.info("Certificate successfully converted.");

                        fs.readFile(`${convertedCertFile}`, (err, certstr) => {
                            utils.deleteFile(`${convertedCertFile}`);
                            this.hsm.finalize();

                            if (err) {
                                utils.deleteFile(`${convertedCertFile}`);
                                next(err);
                                return;
                            }
                            const cert = Certificate.fromPEM(certstr);

                            let credential = new Credential({
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
                                    presence: 'true',
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
                            credential.save(function(err) {
                                if (err) { next(err); return; }

                                next(null, credentialID);
                            });
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

module.exports.createServer = function() {
    return new CSCServer();
};