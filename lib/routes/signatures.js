'use strict';

const express = require('express');
const passport = require('passport');
const { errors } = require('../../config');
const validator = require('validator');
const crypto = require('crypto');

const router = express.Router();

router.post('/signHash',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      const user = req.user;
      const credentialID = req.body.credentialID;
      const sad = req.body.SAD;
      const hash = req.body.hash;
      const hashAlgo = req.body.hashAlgo;
      const signAlgo = req.body.signAlgo;
      const signAlgoParams = req.body.signAlgoParams;
      const credential = user.credentials.find(x => x.credentialID === credentialID);

      if (sad === undefined || !validator.isAscii(sad)) { return next(errors.missingSAD); }
      if (!validator.isHash(sad, 'sha1')) { return next(errors.invalidSAD); }
      if (credentialID === undefined || !validator.isAscii(credentialID)) { return next(errors.invalidCredentialID); }
      if (!credential) { return next(errors.invalidCredentialID); }
      if (!Array.isArray(hash)) { return next(errors.missingHash); }
      if (hash.length == 0) { return next(errors.emptyHash); }
      if (!validator.isBase64(hash[0])) { return next(errors.invalidBase64); }
      if (crypto.createHmac('sha1', credential.key).update(hash[0]).digest('hex') !== credential.sad) { return next(errors.unauthorisedHash); }

      //continue

      return next(errors.notImplementedMethod);
   });

router.post('/timestamp',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      return next(errors.notImplementedMethod);
   });

module.exports = router;