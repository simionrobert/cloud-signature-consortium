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
            if (this.keysFile !== '') {
                utils.deleteFile(`${this.resources_path}/${this.keysFile}.priv.der`);
                utils.deleteFile(`${this.resources_path}/${this.keysFile}.pub.der`);
            }
            if (this.certFile !== '')
                utils.deleteFile(`${this.resources_path}/${this.certFile}`);
            if (this.convertedCertFile !== '')
                utils.deleteFile(`${this.resources_path}/${this.convertedCertFile}`);
        }
    }

    sign(credentialID, hash, signAlgo, next) {
        this.state = 1;
        logger.info("Signing data... ")

        // Write hash to disk
        let inputFile = `${this.resources_path}/in-${Date.now()}`;
        this.signatureFile = `${this.resources_path}/out-${Date.now()}`;
        // Create a temporary file with the hash content and then delete it. Used for pkcs11-tool
        fs.writeFile(`${inputFile}`, hash, (err) => {
            if (err) {
                return console.log(err);
            }

            // Pad and sign hash
            //MD2:		(0x)30 20 30 0c 06 08 2a 86 48 86 f7 0d 02 02 05 00 04 10 || H.
            //MD5:		(0x)30 20 30 0c 06 08 2a 86 48 86 f7 0d 02 05 05 00 04 10 || H.
            //SHA - 1:   (0x)30 21 30 09 06 05 2b 0e 03 02 1a 05 00 04 14 || H.
            //SHA - 256: (0x)30 31 30 0d 06 09 60 86 48 01 65 03 04 02 01 05 00 04 20 || H.
            //SHA - 384: (0x)30 41 30 0d 06 09 60 86 48 01 65 03 04 02 02 05 00 04 30 || H.
            //SHA - 512: (0x)30 51 30 0d 06 09 60 86 48 01 65 03 04 02 03 05 00 04 40 || H. 
            let cmdToExec = '';
            switch (signAlgo) {
                case "1.3.14.3.2.29": //sha1withRSA - RSA PKCSS v1.5
                    // pad the hash: perform step 2 of the RSA PKCS v1.5
                    hash = Buffer.concat([Buffer.from('3021300906052b0e03021a05000414', 'hex'), Buffer.from(hash)]);
                    cmdToExec = (`"${config.openSC_path}" -s -m RSA-PKCS --module "${this.softhsmDriverPath}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --input-file "${inputFile}" --output-file "${this.signatureFile}"`);
                    break;
                case "1.2.840.113549.1.1.11": //sha256withRSA - RSA PKCSS v1.5
                    hash = Buffer.concat([Buffer.from('3031300d060960864801650304020105000420', 'hex'), Buffer.from(hash)]);
                    cmdToExec = (`"${config.openSC_path}" -s -m RSA-PKCS --module "${this.softhsmDriverPath}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --input-file "${inputFile}" --output-file "${this.signatureFile}"`);
                    break;
                case "1.2.840.113549.1.1.13": //sha512withRSA - RSA PKCSS v1.5
                    hash = Buffer.concat([Buffer.from('3051300d060960864801650304020305000440', 'hex'), Buffer.from(hash)]);
                    cmdToExec = (`"${config.openSC_path}" -s -m RSA-PKCS --module "${this.softhsmDriverPath}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --input-file "${inputFile}" --output-file "${this.signatureFile}"`);
                    break;
                default:
                    logger.error('HashAlgo parameter not supported');
                    next(null, new Error("hashAlgo not supported"));
                    return;
            }
            exec(cmdToExec, { cwd: `${this.resources_path}` }, (error, stdout, stderr) => {
                if (error) {
                    logger.error(stderr);
                    next(null, error); return;
                }

                logger.info("The signature was generated");

                // verify signature
                let cmdToExec = '';
                switch (signAlgo) {
                    case "1.3.14.3.2.29": //sha1withRSA - RSA PKCSS v1.5
                        cmdToExec = (`"${config.openSC_path}" --id ${credentialID}  --verify -m RSA-PKCS --module "${this.softhsmDriverPath}" --pin ${config.token.pin} --slot ${config.token.slot}  --input-file "${inputFile}" --signature-file "${this.signatureFile}"`); break;
                    case "1.2.840.113549.1.1.11": //sha256withRSA - RSA-m RSA-PKCS  PKCSS v1.5--pin ${config.token.pin} 
                        cmdToExec = (`"${config.openSC_path}" --id ${credentialID}  --verify -m RSA-PKCS --module "${this.softhsmDriverPath}" --pin ${config.token.pin} --slot ${config.token.slot}  --input-file "${inputFile}" --signature-file "${this.signatureFile}"`); break;
                    case "1.2.840.113549.1.1.13": //sha512withRSA - RSA-m RSA-PKCS  PKCSS v1.5--pin ${config.token.pin} 
                        cmdToExec = (`"${config.openSC_path}" --id ${credentialID} --verify -m RSA-PKCS --module "${this.softhsmDriverPath}" --pin ${config.token.pin} --slot ${config.token.slot}  --input-file "${inputFile}" --signature-file "${this.signatureFile}"`); break;
                    default:
                        logger.error('HashAlgo parameter not supported');
                        next(null, new Error("hashAlgo not supported"));
                        return;
                }
                exec(cmdToExec, { cwd: `${this.resources_path}` }, (error) => {
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
        this.state = 2;
        logger.info("Generating certificate and keys...");

        const timestamp = Date.now();
        this.certFile = `cert-${timestamp}`;
        this.keysFile = `key-${timestamp}`;
        this.convertedCertFile = config.token.cert.substr(0, config.token.cert.lastIndexOf(".")) + ".pem";

        // Generate certificate with OpenSSL in der format with unencrypted der private key
        let cmdToExec = (`"${this.openSSLPath}" req -x509 -outform der -newkey rsa:2048 -keyout ${this.keysFile}.priv.der -keyform der -nodes -out ${this.certFile} -days 365 -subj "/C=GB/ST=London/L=London/O=Global Security/OU=IT Department/CN=example.com"`);
        exec(cmdToExec, { cwd: `${this.resources_path}` }, (error) => {
            if (error) {
                next(null, this.convertedCertFile, error); return;
            }

            // Extract the public key 
            cmdToExec = `openssl rsa -in ${this.keysFile}.priv.der -outform pem -pubout -out ${this.keysFile}.pub.der`;
            exec(cmdToExec, { cwd: `${this.resources_path}` }, (error) => {
                if (error) {
                    this.finalize();
                    next(null, this.convertedCertFile, error); return;
                }

                logger.info("Certificate and keys successfully generated.");
                logger.info("Converting certificate...");

                // Convert cert der to pem
                let cmdToExec = (`"${this.openSSLPath}" x509 -inform der -in ${config.token.cert} -out ${this.convertedCertFile}`);
                exec(cmdToExec, { cwd: `${this.resources_path}` }, (error) => {
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
                        let cmdToExec = (`"${config.openSC_path}" --module "${this.softhsmDriverPath}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --write-object "${this.resources_path}/${this.keysFile}.priv.der" --type privkey`);
                        exec(cmdToExec, { cwd: `${this.resources_path}` }, (error, stdout, stderr) => {
                            if (error) {
                                this.finalize();
                                logger.error(stderr);
                                next(credentialID, this.convertedCertFile, error); return;
                            }

                            // Import public key on token
                            cmdToExec = (`"${config.openSC_path}" --module "${this.softhsmDriverPath}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --write-object "${this.resources_path}/${this.keysFile}.pub.der" --type pubkey`);
                            exec(cmdToExec, { cwd: `${this.resources_path}` }, (error, stdout, stderr) => {
                                if (error) {
                                    this.finalize();
                                    logger.error(stderr);
                                    next(credentialID, this.convertedCertFile, error); return;
                                }

                                logger.info("Keys successfully imported to token.");

                                // Import certificate on token
                                logger.info("Importing certificate to token... ")
                                let cmdToExec = (`"${config.openSC_path}" --module "${this.softhsmDriverPath}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --write-object "${this.resources_path}/${this.certFile}" --type cert`);
                                exec(cmdToExec, { cwd: `${this.resources_path}` }, (error) => {
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