'use strict';
const logger = require('winston');
const exec = require('child_process').exec;
const fs = require('fs');
const crypto = require('crypto');

const config = require('../../../config').settings;
const utils = require('../../utils');


class SoftHSMDriver {
    constructor() {
        this.state = 0;

        this.certFile = '';
        this.convertedCertFile = '';
        this.privateKeyFile = '';
        this.publicKeyFile = '';
        this.signatureFile = '';
    }

    finalize() {
        if (this.state === 1) {
            utils.deleteFile(`${this.signatureFile}`);
        }

        if (this.state === 2) {
            utils.deleteFile(`${this.privateKeyFile}`);
            utils.deleteFile(`${this.publicKeyFile}`);
            utils.deleteFile(`${this.certFile}`);
            utils.deleteFile(`${this.convertedCertFile}`);
        }
    }

    sign(credentialID, hash, signAlgo, next) {
        logger.info("Signing data... ")

        this.state = 1;
        let inputFile = `${config.resources_path}/in-${Date.now()}`;
        this.signatureFile = `${config.resources_path}/out-${Date.now()}`;


        // Create a temporary file with the hash content and then delete it. Used for pkcs11-tool
        fs.writeFile(`${inputFile}`, hash, (err) => {
            if (err) {
                return logger.error(err);
            }

            let cmdToExec = '';
            switch (signAlgo) {
                case "1.3.14.3.2.29": //sha1withRSA - RSA PKCSS v1.5
                    // pad the hash: perform step 2 of the RSA PKCS v1.5
                    hash = Buffer.concat([Buffer.from('3021300906052b0e03021a05000414', 'hex'), Buffer.from(hash)]);
                    cmdToExec = (`"${config.openSC_path}" -s -m RSA-PKCS --module "${config.softhsm2_driver_path}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --input-file "${inputFile}" --output-file "${this.signatureFile}"`);
                    break;
                case "1.2.840.113549.1.1.11": //sha256withRSA - RSA PKCSS v1.5
                    hash = Buffer.concat([Buffer.from('3031300d060960864801650304020105000420', 'hex'), Buffer.from(hash)]);
                    cmdToExec = (`"${config.openSC_path}" -s -m RSA-PKCS --module "${config.softhsm2_driver_path}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --input-file "${inputFile}" --output-file "${this.signatureFile}"`);
                    break;
                case "1.2.840.113549.1.1.13": //sha512withRSA - RSA PKCSS v1.5
                    hash = Buffer.concat([Buffer.from('3051300d060960864801650304020305000440', 'hex'), Buffer.from(hash)]);
                    cmdToExec = (`"${config.openSC_path}" -s -m RSA-PKCS --module "${config.softhsm2_driver_path}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --input-file "${inputFile}" --output-file "${this.signatureFile}"`);
                    break;
                default:
                    logger.error('HashAlgo parameter not supported');
                    utils.deleteFile(`${inputFile}`);
                    next(null, new Error("hashAlgo not supported"));
                    return;
            }

            // Pad and sign hash
            exec(cmdToExec, { cwd: `${config.resources_path}` }, (error, stdout, stderr) => {
                if (error) {
                    logger.error(stderr);
                    utils.deleteFile(`${inputFile}`);
                    next(null, error); return;
                }

                logger.info("The signature was generated");

                // verify signature
                switch (signAlgo) {
                    case "1.3.14.3.2.29": //sha1withRSA - RSA PKCSS v1.5
                        cmdToExec = (`"${config.openSC_path}" --id ${credentialID}  --verify -m RSA-PKCS --module "${config.softhsm2_driver_path}" --pin ${config.token.pin} --slot ${config.token.slot}  --input-file "${inputFile}" --signature-file "${this.signatureFile}"`); break;
                    case "1.2.840.113549.1.1.11": //sha256withRSA - RSA-m RSA-PKCS  PKCSS v1.5--pin ${config.token.pin} 
                        cmdToExec = (`"${config.openSC_path}" --id ${credentialID}  --verify -m RSA-PKCS --module "${config.softhsm2_driver_path}" --pin ${config.token.pin} --slot ${config.token.slot}  --input-file "${inputFile}" --signature-file "${this.signatureFile}"`); break;
                    case "1.2.840.113549.1.1.13": //sha512withRSA - RSA-m RSA-PKCS  PKCSS v1.5--pin ${config.token.pin} 
                        cmdToExec = (`"${config.openSC_path}" --id ${credentialID} --verify -m RSA-PKCS --module "${config.softhsm2_driver_path}" --pin ${config.token.pin} --slot ${config.token.slot}  --input-file "${inputFile}" --signature-file "${this.signatureFile}"`); break;
                    default:
                        logger.error('HashAlgo parameter not supported');
                        utils.deleteFile(`${inputFile}`);
                        next(null, new Error("hashAlgo not supported"));
                        return;
                }
                exec(cmdToExec, { cwd: `${config.resources_path}` }, (error) => {
                    if (error) {
                        utils.deleteFile(`${inputFile}`);
                        return next(null, new Error("Signature is invalid"));
                    }

                    logger.info("The signature is valid");
                    utils.deleteFile(`${inputFile}`);

                    next(this.signatureFile);
                });
            });
        });
    }

    generateCertificateAndKeys(next) {
        logger.info("Generating certificate and keys...");

        this.state = 2;
        const timestamp = Date.now();

        this.certFile = `${config.resources_path}/cert-${timestamp}.der`;
        this.privateKeyFile = `${config.resources_path}/private-key-${timestamp}.der`;
        this.publicKeyFile = `${config.resources_path}/public-key-${timestamp}.der`;
        this.convertedCertFile = `${this.certFile.substr(0, this.certFile.lastIndexOf("."))}.pem`;

        // Generate certificate with OpenSSL in der format with unencrypted der private key
        let cmdToExec = (`"${config.openSSL_path}" req -x509 -outform der -newkey rsa:2048 -keyout "${this.privateKeyFile}" -keyform der -nodes -out "${this.certFile}" -days 365 -subj "/C=GB/ST=London/L=London/O=Global Security/OU=IT Department/CN=example.com"`);
        exec(cmdToExec, { cwd: `${config.resources_path}` }, (error) => {
            if (error) {
                next(null, this.convertedCertFile, error); return;
            }

            // Extract the public key 
            cmdToExec = `openssl rsa -in "${this.privateKeyFile}" -outform pem -pubout -out "${this.publicKeyFile}"`;
            exec(cmdToExec, { cwd: `${config.resources_path}` }, (error) => {
                if (error) {
                    this.finalize();
                    next(null, this.convertedCertFile, error); return;
                }

                logger.info("Certificate and keys successfully generated.");
                logger.info("Converting certificate...");

                // Convert cert der to pem
                let cmdToExec = (`"${config.openSSL_path}" x509 -inform der -in "${this.certFile}" -out "${this.convertedCertFile}"`);
                exec(cmdToExec, { cwd: `${config.resources_path}` }, (error) => {
                    if (error) {
                        this.finalize();
                        next(null, this.convertedCertFile, error); return;
                    }
                    logger.info("Certificate successfully converted.");


                    // Generate random credentialID
                    crypto.randomBytes(8, (err, buffer) => {
                        if (err) {
                            this.finalize();
                            next(null, this.convertedCertFile, err);
                            return;
                        }
                        const credentialID = buffer.toString('hex');

                        // Import private key on token
                        logger.info("Importing keys to token... ")
                        let cmdToExec = (`"${config.openSC_path}" --module "${config.softhsm2_driver_path}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --write-object "${this.privateKeyFile}" --type privkey`);
                        exec(cmdToExec, { cwd: `${config.resources_path}` }, (error, stdout, stderr) => {
                            if (error) {
                                this.finalize();
                                logger.error(stderr);
                                next(credentialID, this.convertedCertFile, error); return;
                            }

                            // Import public key on token
                            cmdToExec = (`"${config.openSC_path}" --module "${config.softhsm2_driver_path}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --write-object "${this.publicKeyFile}" --type pubkey`);
                            exec(cmdToExec, { cwd: `${config.resources_path}` }, (error, stdout, stderr) => {
                                if (error) {
                                    this.finalize();
                                    logger.error(stderr);
                                    next(credentialID, this.convertedCertFile, error); return;
                                }

                                logger.info("Keys successfully imported to token.");

                                // Import certificate on token
                                logger.info("Importing certificate to token... ")
                                let cmdToExec = (`"${config.openSC_path}" --module "${config.softhsm2_driver_path}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --write-object "${this.certFile}" --type cert`);
                                exec(cmdToExec, { cwd: `${config.resources_path}` }, (error) => {
                                    if (error) {
                                        this.finalize();
                                        next(credentialID, this.convertedCertFile, error); return;
                                    }


                                    logger.info("Certificate successfully imported to token.");

                                    next(credentialID, this.convertedCertFile);
                                });
                            });
                        });
                    });
                });
            });
        });
    }
}

module.exports = SoftHSMDriver;