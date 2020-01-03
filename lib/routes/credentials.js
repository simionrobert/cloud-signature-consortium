'use strict';

const express = require('express');
const passport = require('passport');
const _ = require('lodash');
const moment = require('moment');
const validator = require('validator');
const crypto = require('crypto');
const { errors, settings } = require('../../config');
const Credential = require('../db').Credential;
const User = require('../db').User;

const router = express.Router();

router.post('/list',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      const user = req.user;
      const userID = req.body.userID;

      if (userID) return next(errors.notNullUserID);

      res.json({
         credentialIDs: user.credentials.map(x => x.credentialID)
      });
   });

router.post('/info',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      const credentialID = req.body.credentialID;
      const certificates = req.body.certificates || 'single';
      const certInfo = req.body.certInfo || false;
      const authInfo = req.body.authInfo || false;
      //const lang = req.body.lang || 'en_US';

      // Request validation
      if (certificates !== 'none' && certificates !== 'single' && certificates !== 'chain') {
         return next(errors.invalidCertificate);
      }

      // Bussiness
      Credential.findOne({ credentialID: credentialID }, function (err, doc) {
         if (err) return next(errors.databaseError);
         if (!doc) { return next(errors.invalidCredentialID); }

         // Create the response objectsd 
         let response = {
            description: doc.description,
            key: {
               status: doc.key.status,
               algo: doc.key.algo,
               len: doc.key.len,
               curve: doc.key.curve
            },
            authMode: doc.authMode,
            SCAL: doc.SCAL,
            multisign: doc.multisign,
            lang: doc.lang
         }

         switch (certificates) {
            case 'none':
               break;
            case 'single':
               response.cert = { certificates: doc.cert.certificates.slice(0, 1) };
               break;
            case 'chain':
               response.cert = { certificates: doc.cert.certificates };
               break;
            default:
               return next(errors.invalidCertificate);
         }

         if (certInfo === true) {
            let keys = {
               issuerDN: doc.cert.issuerDN,
               serialNumber: doc.cert.serialNumber,
               stasubjectDNtus: doc.cert.subjectDN,
               validFrom: moment(doc.cert.validFrom).format("YYYYMMDDHHmmss") + 'Z',
               validTo: moment(doc.cert.validTo).format("YYYYMMDDHHmmss") + 'Z'
            }
            if (response.cert !== undefined) {
               _.assign(response.cert, keys);
            } else {
               response.cert = keys;
            }
         }

         if (authInfo === true && doc.authMode === 'explicit') {
            if (doc.PIN.presence !== 'false') {
               response.PIN = {
                  presence: doc.PIN.presence,
                  format: doc.PIN.format,
                  label: doc.PIN.label,
                  description: doc.PIN.description
               };
            } else {
               response.PIN = {
                  presence: doc.PIN.presence
               };
            }

            if (doc.OTP.presence !== 'false') {
               response.OTP = {
                  presence: doc.OTP.presence,
                  type: doc.OTP.types,
                  format: doc.OTP.format,
                  label: doc.OTP.label,
                  description: doc.OTP.description,
                  ID: doc.OTP.ID,
                  provider: doc.OTP.provider
               };
            } else {
               response.OTP = {
                  presence: doc.OTP.presence
               };
            }
         }

         // send response
         res.json(response);
      });
   });

router.post('/authorise',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      const user = req.user;
      const credentialID = req.body.credentialID;
      const numSignatures = req.body.numSignatures;
      const hashes = req.body.hash;
      const pin = req.body.PIN;
      const otp = req.body.OTP;

      if (numSignatures === undefined || !validator.isNumeric(numSignatures)) { return next(errors.missingNumSignatures); }
      if (numSignatures < 1) { return next(errors.invalidNumSignatures); }
      let err = false;
      hashes.forEach(hash => {
         if (!validator.isBase64(hash)) { err = true; return; }
      })
      if (err) return next(errors.invalidBase64);

      // Bussiness
      Credential.findOne({ credentialID: credentialID }, function (err, doc) {
         if (err) return next(errors.databaseError);
         if (!doc) { return next(errors.invalidCredentialID); }

         if (doc.status === 'disabled') { return next(errors.disabledCredentialID); }
         if (doc.multisign < numSignatures) { return next(errors.tooHighNumSignatures); }

         // verify pin
         let userCredentialObject = user.credentials.find(x => x.credentialID === credentialID);
         if (userCredentialObject.pin !== pin) {
            return next(errors.invalidPIN);
         }

         // verify otp
         if (doc.OTP.presence === 'true') {
            if (userCredentialObject.otp.value !== otp) {
               return next(errors.invalidOTP);
            }
         }

         //generate SAD
         let timestamp = new Date();
         let key = timestamp.valueOf().toString();

         let sad = crypto.createHmac('sha512', key);
         hashes.forEach(hash => {
            sad.update(hash);
         });
         sad = sad.digest('hex');

         User.updateOne({ 'credentials.credentialID': credentialID },
            {
               '$set': {
                  'credentials.$.sad.value': sad,
                  'credentials.$.sad.timestamp': timestamp,
                  'credentials.$.sad.key': key
               }
            },
            function (err) {
               if (err) { return next(errors.databaseError); }

               // send response
               res.json({
                  SAD: sad,
                  expiresIn: settings.csc.sad_expiring_time
               });
            }
         );
      });
   });

router.post('/sendOTP',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      const credentialID = req.body.credentialID;

      // Bussiness
      Credential.findOne({ credentialID: credentialID }, function (err, doc) {
         if (err) return next(errors.databaseError);
         if (!doc) { return next(errors.invalidCredentialID); }

         if (doc.status == 'disabled') { return next(errors.disabledCredentialID); }

         //generate SAD
         const otp = Math.floor(100000 + Math.random() * 900000);

         User.updateOne({ 'credentials.credentialID': credentialID },
            {
               '$set': {
                  'credentials.$.otp.value': otp,
                  'credentials.$.otp.timestamp': Date.now()
               }
            },
            function (err) {
               if (err) { return next(errors.databaseError); }

               // send response
               res.json({
                  OTP: otp,
                  description: 'This is transmitted via email/phone message'
               });
            }
         );
      });
   });

router.post('/extendTransaction',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      return next(errors.notImplementedMethod);
   });

module.exports = router;
