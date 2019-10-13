'use strict';

const express = require('express');
const passport = require('passport');
const _ = require('lodash');
const moment = require('moment');
const validator = require('validator');
const { errors } = require('../config');
const Credential = require('../db').Credential;

const router = express.Router();

router.post('/list',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      const user = req.user;
      const userID = req.body.userID;

      if (userID) return next(errors.notNullUserID);

      res.json({
         credentialIDs: user.credentials
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
      const credentialID = req.body.credentialID;
      const numSignatures = req.body.numSignatures;
      const hash = req.body.hash;
      const pin = req.body.PIN;
      const otp = req.body.OTP;

      if (numSignatures === undefined || !validator.isNumeric(numSignatures)) { return next(errors.missingNumSignatures); }
      if (numSignatures < 1) { return next(errors.invalidNumSignatures); }

      // Bussiness
      Credential.findOne({ credentialID: credentialID }, function (err, doc) {
         if (err) return next(errors.databaseError);
         if (!doc) { return next(errors.invalidCredentialID); }

         if (doc.status == 'disabled') { return next(errors.disabledCredentialID); }
         if (doc.multisign < numSignatures) { return next(errors.tooHighNumSignatures); }

         // generate SAD
         // send response
         res.json();
      });
   });

router.post('/extendTransaction',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      return next(errors.notImplementedMethod);
   });

router.post('/sendOTP',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      return next(errors.notImplementedMethod);
   });

module.exports = router;
