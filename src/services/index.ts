'use strict';

import https from 'https';
import fs from 'fs';
import mongoose, { Document } from 'mongoose';
import Credential from './db/Credential';
import Client from './db/Client';
import User from './db/User';
import crypto from 'crypto';
import { Certificate } from '@fidm/x509';
import * as utils from './utils';
import { exec } from 'child_process';
import logger from 'winston';
import { settings } from '../config';
import app from '../app.js';
import SoftHSMDriver from './hsm/SoftHsmDriver';

/*
 ** This class is the entry point of our app. It has all the methods our app uses
 */
export default class CSCServer {
  server: https.Server;
  hsm: SoftHSMDriver;

  listen(options:any, next:any) {
    app.set('port', options.port || settings.https.port);

    this.server = https.createServer(
      {
        cert: fs.readFileSync(options.cert || settings.https.certificate),
        key: fs.readFileSync(options.key || settings.https.private_key),
        passphrase: options.passphrase || settings.https.private_key_password
      },
      app
    );

    mongoose
      .connect(settings.database_url, {
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
        useCreateIndex: true
      })
      .catch((err:any) => next(err))
      .then(() => {
        let listener = this.server.listen(
          {
            port: options.port || settings.https.port
          },
          (err) =>{
            if (err) return next(err);
            next(
              undefined,
              listener.address().port,
              listener.address().address
            );
          }
        );
      });
  }

  registerUser(username: string, password: string, next) {
    mongoose
      .connect(settings.database_url, {
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
        useCreateIndex: true
      })
      .catch(err => next(err))
      .then(() => {
        let user = new User({
          user: username,
          password: crypto
            .createHash('sha256')
            .update(password)
            .digest('hex')
        });

        user.save(function(err) {
          next(err);
        });
      });
  }

  registerClient(
    name: string,
    id: string,
    secret: string,
    redirectUri: string,
    next
  ) {
    mongoose
      .connect(settings.database_url, {
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
        useCreateIndex: true
      })
      .catch(err => next(err))
      .then(() => {
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
  }

  generateCredentials(username: string, keypass: string, next) {
    mongoose
      .connect(settings.database_url, {
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
        useCreateIndex: true
      })
      .catch((err: any) => next(err))
      .then(() => {
        this.hsm = new SoftHSMDriver();

        this.hsm.generateCertificateAndKeys(
          (credentialID: string, certFile, err) => {
            if (err) {
              this.hsm.finalize();
              return next(err);
            }

            // Save credential ID to the user provided
            User.findOneAndUpdate(
              { user: username },
              {
                $push: {
                  credentials: {
                    credentialID: credentialID,
                    pin: utils.hash(keypass)
                  }
                }
              },
              (err: any, doc: Document) => {
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
                logger.info('Converting certificate...');

                const convertedCertFile = `${certFile.substr(
                  0,
                  certFile.lastIndexOf('.')
                )}.pem`;
                let cmdToExec = `"${settings.openSSL_path}" x509 -inform der -in "${certFile}" -out "${convertedCertFile}"`;
                exec(
                  cmdToExec,
                  { cwd: `${settings.resources_path}` },
                  error => {
                    if (error) {
                      this.finalize();
                      utils.deleteFile(`${convertedCertFile}`);
                      next(err);
                      return;
                    }

                    logger.info('Certificate successfully converted.');

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
                        description: 'Certificate',
                        key: {
                          status: 'enabled',
                          algo: [cert.publicKey.oid],
                          len: 2048,
                          curve: ''
                        },
                        cert: {
                          status: 'valid',
                          certificates: [
                            Buffer.from(cert.raw).toString('base64')
                          ],
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
                          provider: ''
                        },
                        multisign: 1,
                        lang: 'en-US'
                      });
                      credential.save(function(err) {
                        if (err) {
                          next(err);
                          return;
                        }

                        next(null, credentialID);
                      });
                    });
                  }
                );
              }
            );
          }
        );
      });
  }

  sign(credentialID: string, hashes: string[], signAlgo: string, next) {
    this.hsm = new SoftHSMDriver();
    this.hsm.sign(credentialID, hashes[0], signAlgo, (outputFile, error) => {
      if (error) {
        next(null, error);
        return;
      }
      fs.readFile(`${outputFile}`, (err, rawSignature) => {
        this.hsm.finalize();
        if (error) {
          next(null, err);
          return;
        }
        next(Buffer.from(rawSignature, 'binary').toString('base64'));
      });
    });
  }
}
