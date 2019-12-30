'use strict';
const logger = require('winston');
const exec = require('child_process').exec;
const config = require('../../config').settings;
const fs = require('fs');
const path = require('path');
const utils = require('../utils');
const crypto = require('crypto');

class SoftHSMDriver {
    constructor() {
        this.state = 0;

        this.resources_path = `${path.resolve(config.resources_path)}`;
        this.softhsmDriverPath = `${path.resolve(config.softhsm2_driver_path)}`;
        this.openSSLPath = `${path.resolve(config.openSSL_path)}`;

        this.certFile = '';
        this.keysFile = '';
        this.convertedCertFile = '';
        this.signatureFile = '';
    }

    finalize() {
        if (this.state === 1) {
            if (this.signatureFile !== '')
                utils.deleteFile(`${this.signatureFile}`);
        }
        if (this.state === 2) {
            if (this.keysFile !== '')
                utils.deleteFile(`${this.resources_path}/${this.keysFile}`);
            if (this.certFile !== '')
                utils.deleteFile(`${this.resources_path}/${this.certFile}`);
            if (this.convertedCertFile !== '')
                utils.deleteFile(`${this.resources_path}/${this.convertedCertFile}`);
        }
    }

    sign(credentialID, hash, hashAlgo, next) {
        this.state = 1;
        logger.info("Signing data... ")

        // Write hash to disk
        let inputFile = `${this.resources_path}/in-${Date.now}`;
        this.signatureFile = `${this.resources_path}/out-${Date.now}`;
        fs.writeFile(`${inputFile}`, hash, function (err) {
            if (err) {
                return console.log(err);
            }

            // Create a temporary file with the hash content and then delete it. Used for pkcs11-tool
            let cmdToExec = (`"${config.openSC_path}" --module "${this.softhsmDriverPath}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --input-file "${inputFile}" --signature-file "${this.signatureFile}"`);
            exec(cmdToExec, { cwd: `${this.resources_path}` }, (error, stdout, stderr) => {
                if (error) {
                    logger.error(stderr);
                    next(null, error); return;
                }

                logger.info("The signature was generated");

                // verify signature
                let cmdToExec = (`"${config.openSC_path}" --verify --module "${this.softhsmDriverPath}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --hash-algorithm=${hashAlgo} --input-file "${inputFile}" --signature-file "${this.signatureFile}"`);
                exec(cmdToExec, { cwd: `${this.resources_path}` }, (error, stdout, stderr) => {
                    if (error) {
                        logger.error(stderr);
                        next(null, error); return;
                    }

                    logger.info("The signature is valid");
                });


                // delete files
                utils.deleteFile(`${inputFile}`);

                // return signature
                next(this.signatureFile);
            });
        });
    }

    generateCertificateAndKeys(next) {
        this.state = 2;
        logger.info("Generating certificate and keys...");

        // Generate certificate with OpenSSL in der format with unencrypted der keys
        // for generatingCertificateAndKeys
        const timestamp = Date.now();
        this.certFile = `cert-${timestamp}`;
        this.keysFile = `keys-${timestamp}`;
        this.convertedCertFile = config.token.cert.substr(0, config.token.cert.lastIndexOf(".")) + ".pem";

        let cmdToExec = (`"${this.openSSLPath}" req -x509 -outform der -newkey rsa:2048 -keyout ${this.keysFile} -keyform der -nodes -out ${this.certFile} -days 365 -subj "/C=GB/ST=London/L=London/O=Global Security/OU=IT Department/CN=example.com"`);
        exec(cmdToExec, { cwd: `${this.resources_path}` }, (error, stdout, stderr) => {
            if (error) {
                next(null, this.convertedCertFile, error); return;
            }
            logger.info("Certificate and keys successfully generated.");

            // Convert cert der to pem
            logger.info("Converting certificate...");

            let cmdToExec = (`"${this.openSSLPath}" x509 -inform der -in ${config.token.cert} -out ${this.convertedCertFile}`);
            exec(cmdToExec, { cwd: `${this.resources_path}` }, (error, stdout, stderr) => {
                if (error) {
                    utils.deleteFile(`${this.resources_path}/${this.keysFile}`);
                    utils.deleteFile(`${this.resources_path}/${this.certFile}`);
                    next(null, this.convertedCertFile, error); return;
                }
                logger.info("Certificate successfully converted.");


                // Generate random credentialID
                crypto.randomBytes(8, (err, buffer) => {
                    if (err) {
                        utils.deleteFile(`${this.resources_path}/${this.keysFile}`);
                        utils.deleteFile(`${this.resources_path}/${this.certFile}`);
                        utils.deleteFile(`${this.resources_path}/${this.convertedCertFile}`);
                        next(null, this.convertedCertFile, err);
                        return;
                    }
                    const credentialID = buffer.toString('hex');

                    // Import key on token
                    logger.info("Importing key to token... ")
                    let cmdToExec = (`"${config.openSC_path}" --module "${this.softhsmDriverPath}" --slot ${config.token.slot} --pin ${config.token.pin} -m RSA-PKCS --id ${credentialID} --write-object "${this.resources_path}/${config.token.key}" --type privkey --private`);
                    exec(cmdToExec, { cwd: `${this.resources_path}` }, (error, stdout, stderr) => {
                        if (error) {
                            utils.deleteFile(`${this.resources_path}/${this.keysFile}`);
                            utils.deleteFile(`${this.resources_path}/${this.certFile}`);
                            utils.deleteFile(`${this.resources_path}/${this.convertedCertFile}`);
                            logger.error(stderr);
                            next(credentialID, this.convertedCertFile, error); return;
                        }

                        logger.info("Key successfully imported to token.");

                        // Import certificate on token
                        logger.info("Importing certificate to token... ")
                        let cmdToExec = (`"${config.openSC_path}" --module "${this.softhsmDriverPath}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --write-object "${this.resources_path}/${config.token.cert}" --type cert`);
                        exec(cmdToExec, { cwd: `${this.resources_path}` }, (error, stdout, stderr) => {
                            if (error) {
                                utils.deleteFile(`${this.resources_path}/${this.keysFile}`);
                                utils.deleteFile(`${this.resources_path}/${this.certFile}`);
                                utils.deleteFile(`${this.resources_path}/${this.convertedCertFile}`);
                                next(credentialID, this.convertedCertFile, error); return;
                            }

                            logger.info("Certificate successfully imported to token.");

                            next(credentialID, this.convertedCertFile);
                        });
                    });
                });
            });

        });
    }
}

module.exports = SoftHSMDriver;