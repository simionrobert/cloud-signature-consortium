'use strict';
const logger = require('winston');
const exec = require('child_process').exec;
const config = require('../config').settings;
const fs = require('fs');
const utils = require('../utils');

class SoftHSMDriver {
    constructor(path) {
        this.lib = path;
        this.resources_path = `${path.resolve(config.resources_path)}`;
        this.softhsmDriverPath = `${path.resolve(config.softhsm2_driver_path)}`;
    }

    sign(credentialID, hash, tokenPIN, next) {
        logger.info("Signing data... ")

        // Write hash to disk
        let inputFile = `${this.resources_path}/in-${Date.now}`;
        let outputFile = `${this.resources_path}/out-${Date.now}`;
        fs.writeFile(`${inputFile}`, hash, function (err) {
            if (err) {
                return console.log(err);
            }

            // Create a temporary file with the hash content and then delete it. Used for pkcs11-tool
            let cmdToExec = (`"${config.openSC_path}" --module "${this.softhsmDriverPath}" --slot ${config.token.slot} --pin ${config.token.pin} --id ${credentialID} --input-file "${inputFile}" --output-file "${outputFile}"`);
            exec(cmdToExec, { cwd: `${this.resources_path}` }, (error, stdout, stderr) => {
                if (error) {
                    logger.error(stderr);
                    next(error); return;
                }

                logger.info("The signature was generated");

                // verify signature
                logger.info("The signature is valid");

                // read signature file


                // delete files
                utils.deleteFile(`${inputFile}`);
                utils.deleteFile(`${outputFile}`);

                // return signature
            });
        });
    }
}

module.exports = SoftHSMDriver;