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
        }
    }

    sign(credentialID, hash, signAlgo, next) {
        logger.info("Signing data... ")

        this.state = 1;
        let inputFile = `${config.resources_path}/in-${Date.now()}`;
        this.signatureFile = `${config.resources_path}/out-${Date.now()}`;


        //MD2:		(0x)30 20 30 0c 06 08 2a 86 48 86 f7 0d 02 02 05 00 04 10 || H.
        //MD5:		(0x)30 20 30 0c 06 08 2a 86 48 86 f7 0d 02 05 05 00 04 10 || H.
        //SHA - 1:   (0x)30 21 30 09 06 05 2b 0e 03 02 1a 05 00 04 14 || H.
        //SHA - 256: (0x)30 31 30 0d 06 09 60 86 48 01 65 03 04 02 01 05 00 04 20 || H.
        //SHA - 384: (0x)30 41 30 0d 06 09 60 86 48 01 65 03 04 02 02 05 00 04 30 || H.
        //SHA - 512: (0x)30 51 30 0d 06 09 60 86 48 01 65 03 04 02 03 05 00 04 40 || H. 

        // Create a temporary file with the hash content and then delete it. Used for pkcs11-tool
        switch (signAlgo) {
            case "1.3.14.3.2.29": //sha1withRSA - RSA PKCSS v1.5
                // pad the hash: perform step 2 of the RSA PKCS v1.5
                hash = Buffer.concat([Buffer.from('3021300906052b0e03021a05000414', 'hex'), Buffer.from(hash)]);
                break;
            case "1.2.840.113549.1.1.11": //sha256withRSA - RSA PKCSS v1.5
                hash = Buffer.concat([Buffer.from('3031300d060960864801650304020105000420', 'hex'), Buffer.from(hash)]);
                break;
            case "1.2.840.113549.1.1.13": //sha512withRSA - RSA PKCSS v1.5
                hash = Buffer.concat([Buffer.from('3051300d060960864801650304020305000440', 'hex'), Buffer.from(hash)]);
                break;
            default:
                logger.error('HashAlgo parameter not supported');
                utils.deleteFile(`${inputFile}`);
                next(null, new Error("hashAlgo not supported"));
                return;
        }

        fs.writeFile(`${inputFile}`, hash, (err) => {
            if (err) {
                return logger.error(err);
            }

            let cmdToExec = (`"${config.openSC_path}" -s -m RSA-PKCS --module "${config.softhsm2_driver_path}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --input-file "${inputFile}" --output-file "${this.signatureFile}"`);
            exec(cmdToExec, { cwd: `${config.resources_path}` }, (error, stdout, stderr) => {
                if (error) {
                    logger.error(stderr);
                    utils.deleteFile(`${inputFile}`);
                    next(null, error);
                    return;
                }

                logger.info("The signature was generated");

                cmdToExec = (`"${config.openSC_path}" --id ${credentialID} --verify -m RSA-PKCS --module "${config.softhsm2_driver_path}" --pin ${config.token.pin} --slot ${config.token.slot}  --input-file "${inputFile}" --signature-file "${this.signatureFile}"`);
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
        this.privateKeyFile = `${config.resources_path}/private-key-${timestamp}.pem`;
        this.publicKeyFile = `${config.resources_path}/public-key-${timestamp}.pem`;

        // Generate certificate with OpenSSL in der format with unencrypted der private key
        let cmdToExec = (`"${config.openSSL_path}" req -x509 -outform der -newkey rsa:2048 -keyout "${this.privateKeyFile}" -nodes -out "${this.certFile}" -days 365 -subj "/C=GB/ST=Bucharest/L=Bucharest/O=MTA/OU=IT Department/CN=example.com"`);
        exec(cmdToExec, { cwd: `${config.resources_path}` }, (error) => {
            if (error) {
                next(null, this.certFile, error);
                return;
            }

            // Extract the public key 
            cmdToExec = `"${config.openSSL_path}" rsa -in "${this.privateKeyFile}" -inform pem -outform pem -pubout -out "${this.publicKeyFile}"`;
            exec(cmdToExec, { cwd: `${config.resources_path}` }, (error) => {
                if (error) {
                    this.finalize();
                    next(null, this.certFile, error);
                    return;
                }

                logger.info("Certificate and keys successfully generated.");

                // Generate random credentialID
                crypto.randomBytes(8, (err, buffer) => {
                    if (err) {
                        this.finalize();
                        next(null, this.certFile, err);
                        return;
                    }
                    const credentialID = buffer.toString('hex');

                    // Import private key on token
                    logger.info("Importing keys to token... ")
                    let cmdToExec = (`"${config.openSC_path}"  --write-object "${this.privateKeyFile}" --type privkey --module "${config.softhsm2_driver_path}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID}`);
                    exec(cmdToExec, { cwd: `${config.resources_path}` }, (error, stdout, stderr) => {
                        if (error) {
                            this.finalize();
                            logger.error(stderr);
                            next(credentialID, this.certFile, error);
                            return;
                        }

                        // Import public key on token
                        cmdToExec = (`"${config.openSC_path}" --write-object "${this.publicKeyFile}" --type pubkey --module "${config.softhsm2_driver_path}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID}`);
                        exec(cmdToExec, { cwd: `${config.resources_path}` }, (error, stdout, stderr) => {
                            if (error) {
                                this.finalize();
                                logger.error(stderr);
                                next(credentialID, this.certFile, error);
                                return;
                            }

                            logger.info("Keys successfully imported to token.");

                            // Import certificate on token
                            logger.info("Importing certificate to token... ")
                            let cmdToExec = (`"${config.openSC_path}"  --write-object "${this.certFile}" --type cert --module "${config.softhsm2_driver_path}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID}`);
                            exec(cmdToExec, { cwd: `${config.resources_path}` }, (error) => {
                                if (error) {
                                    this.finalize();
                                    next(credentialID, this.certFile, error);
                                    return;
                                }


                                logger.info("Certificate successfully imported to token.");

                                next(credentialID, this.certFile);
                            });
                        });
                    });
                });
            });
        });
    }
}

module.exports = SoftHSMDriver;