'use strict';

const https = require('https');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const app = require('./app.js');
const User = require('./db').User;
const Credential = require('./db').Credential;
const crypto = require('crypto');
const config = require('./config').settings;
const SoftHSMDriver = require('./hsm/SoftHsmDriver');
const exec = require('child_process').exec;
const { Certificate } = require('@fidm/x509');


class CSCServer {
    constructor(options) {
        this.options = options || {};

        app.set('port', this.options.port || config.https.port);

        this.server = https.createServer({
            cert: fs.readFileSync(this.options.cert || (config.resources_path + '\\' + config.https.cert_SSL)),
            key: fs.readFileSync(this.options.key || (config.resources_path + '\\' + config.https.key_SSL)),
            passphrase: this.options.passphrase || config.https.SSL_key_passphrase
        }, app);

        this.hsm = new SoftHSMDriver(options.library);

        this.resources_path = `${path.resolve(config.resources_path)}`;
        this.openSSLPath = `${path.resolve(config.openSSL_path)}`;
        this.softhsmDriverPath = `${path.resolve(config.softhsm2_driver_path)}`;
    }

    listen(port, host, next) {
        mongoose.connection.on('connected', () => {
            /**
            * Start listening
            */
            let listener = this.server.listen({
                port: port || config.https.port,
                host: host || config.https.host
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

    generateCredentials(username, next) {
        mongoose.connection.on('connected', () => {
            console.log("Generating certificate...");

            // Generate certificate with OpenSSL in der format with unencrypted der keys
            let cmdToExec = (`"${this.openSSLPath}" req -x509 -outform der -newkey rsa:2048 -keyout ${config.token.key} -keyform der -nodes -out ${config.token.cert} -days 365 -subj "/C=GB/ST=London/L=London/O=Global Security/OU=IT Department/CN=example.com"`);
            exec(cmdToExec, { cwd: `${this.resources_path}` }, (error, stdout, stderr) => {
                if (error) {
                    console.log(stderr);
                    next(error); return;
                }

                // Convert cert der to pem
                console.log("Converting certificate...");

                let newCertificateName = config.token.cert.substr(0, config.token.cert.lastIndexOf(".")) + ".pem";
                let cmdToExec = (`"${this.openSSLPath}" x509 -inform der -in ${config.token.cert} -out ${newCertificateName}`);
                exec(cmdToExec, { cwd: `${this.resources_path}` }, (error, stdout, stderr) => {
                    if (error) {
                        console.log(stderr);
                        next(error); return;
                    }

                    crypto.randomBytes(8, (err, buffer) => {
                        if (err) { next(err); return; }
                        const credentialID = buffer.toString('hex');

                        // Import key on token
                        console.log("Importing key to token... ")
                        let cmdToExec = (`"${config.openSC_path}" --module "${this.softhsmDriverPath}" --slot ${config.token.slot} -l --pin ${config.token.pin} --id ${credentialID} --write-object "${this.resources_path}/${config.token.key}" --type privkey --private`);
                        exec(cmdToExec, { cwd: `${this.resources_path}` }, (error, stdout, stderr) => {
                            if (error) {
                                console.log(stderr);
                                next(error); return;
                            }

                            // Import certificate on token
                            console.log("Importing certificate to token... ")
                            let cmdToExec = (`"${config.openSC_path}" --module "${this.softhsmDriverPath}" --slot ${config.token.slot} -l --pin ${config.token.pin} --id ${credentialID} --write-object "${this.resources_path}/${config.token.cert}" --type cert`);
                            exec(cmdToExec, { cwd: `${this.resources_path}` }, (error, stdout, stderr) => {
                                if (error) {
                                    console.log(stderr);
                                    next(error); return;
                                }
                                // Save credential ID to the user provided
                                User.findOneAndUpdate({ user: username }, {
                                    $push: { 'credentials': credentialID }
                                }, (err, doc) => {
                                    if (err) { next(err); return; }
                                    if (!doc) { next('No doc'); return; }

                                    fs.readFile(`${config.resources_path}\\${newCertificateName}`, (err, certstr) => {
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
                    });
                });
            });
        });

        mongoose.connect(config.database_url, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true, useCreateIndex: true })
            .catch(err => next(err));
    }
}

module.exports.createServer = function (options) {
    return new CSCServer(options);
};