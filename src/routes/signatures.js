'use strict';

const express = require('express');
const passport = require('passport');
const validator = require('validator');
const crypto = require('crypto');

const { errors } = require('../config');
const csc = require('../lib');

const router = express.Router();

router.post('/signHash',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      /* the hashAlgo parameter is only needed when it cannot be derived from the signAlgo parameter. 
         In the case of RSA this is the case when you use the "1.2.840.113549.1.1.1" (RSA) or the "1.2.840.113549.1.1.10" 
      (RSASSAPSS) oids. In all other cases the hash algorithm is derived from the signature algorithm. 
         So as you are using OID "1.3.14.3.2.29" in your request (which corresponds to SHA1withRSA) you do not need to set 
      the signAlgo parameter. But if you specify the hash algorithm (as OID), anyway, this hash algorithm is used and it 
      is not derived from the signature algorithm. However, if you use an signature algorithm OID where the hash algorithm 
      is implicitly specified, you should avoid setting the hashAlgo parameter, too.
         The spec says for the hashAlgo parameter: 
         Specifies the OID of the algorithm used to calculate the hash value(s), in case it’s not implicitly specified by 
      the signAlgo algorithm. Only hashing algorithms as strong or stronger than SHA256 shall be used.*/

      const cscServer = csc.createServer();
      const user = req.user;
      const credentialID = req.body.credentialID;
      const sad = req.body.SAD;
      const hashes = req.body.hash;
      const hashAlgo = req.body.hashAlgo;
      const signAlgo = req.body.signAlgo;
      const signAlgoParams = req.body.signAlgoParams;
      const credential = user.credentials.find(x => x.credentialID === credentialID);

      // Verify credentialID
      if (credentialID === undefined || !validator.isAscii(credentialID)) { return next(errors.invalidCredentialID); }
      if (!credential) { return next(errors.invalidCredentialID); }

      // Verify hashes
      if (!(Array.isArray(hashes))) { return next(errors.missingHash); }
      if (hashes.length == 0) { return next(errors.emptyHash); }
      let err = false;
      hashes.forEach(hash => {
         if (!validator.isBase64(hash)) { err = true; return; }
         switch (Buffer.from(hash, 'base64').length) {
            case 20:
            case 32:
            case 64:
               return;
            default:
               return next(errors.invalidHashLenght);
         }
      });
      if (err) return next(errors.invalidBase64);

      // Verify hashAlgo
      switch (hashAlgo) {
         case "1.3.14.3.2.26": // SHA1
         case "2.16.840.1.101.3.4.2.1": // SHA256
         case "2.16.840.1.101.3.4.2.3": // SHA512
         case "1.3.6.1.4.1.2706.2.4.1.1": //MD5+SHA1
            break;
         case "":
         case undefined:
            if (signAlgo === '1.2.840.113549.1.1.1')
               return next(errors.missinghashAlgo);
            break;
         default:
            return next(errors.invalidhashAlgo);
      }

      // verify signAlgo
      switch (signAlgo) {
         case "1.3.14.3.2.29": //sha1withRSA
         case "1.2.840.113549.1.1.11": //sha256withRSA
         case "1.2.840.113549.1.1.13": //sha512withRSA
         case "1.2.840.113549.1.1.1": //SSL MD5+SHA1
            break;
         default:
            return next(errors.invalidsignAlgo);
      }

      // Verify sad
      if (sad === undefined || !validator.isAscii(sad)) { return next(errors.missingSAD); }
      if (!validator.isHash(sad, 'sha512')) { return next(errors.invalidSAD); }
      let currentSad = crypto.createHmac('sha512', credential.sad.key);
      hashes.forEach(hash => {
         currentSad.update(hash);
      });
      currentSad = currentSad.digest('hex');
      if (currentSad !== credential.sad.value) { return next(errors.unauthorisedHash); }


      // All is right
      cscServer.sign(credentialID, hashes.map(i => Buffer.from(i, 'base64')), signAlgo, (signature, error) => {
         if (error) { return next(errors.internalServerError); }
         res.json({
            signatures: [signature]
         });
      });
   });

router.post('/timestamp',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      return next(errors.notImplementedMethod);
   });

module.exports = router;