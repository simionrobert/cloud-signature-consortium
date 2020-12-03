'use strict';

const express = require('express');
const passport = require('passport');
const crypto = require('crypto');

const { errors, settings } = require('../../config');
const Token = require('../lib/db').Token;
const utils = require('../utils');
const router = express.Router();

router.post('/login',
  passport.authenticate(['basic', 'custom'], { session: false }), function (req, res, next) {
    try {
      const user = req.user;
      const rememberMe = req.body.rememberMe || false;

      // business logic
      if (rememberMe === true) {
        // generate a new refreshToken

        crypto.randomBytes(48, function (err, buffer) {
          if (err) return next(errors.internalServerError);
          const refreshToken = buffer.toString('hex');

          // update user with the refresh token and timestamp
          Token.updateOne({ user_id: user._id, type: 'refresh_token' }, {
            value: utils.hash(refreshToken),
            type: 'refresh_token',
            creation_date: Date.now(),
            user_id: user._id,
            client_id: ''
          }, { upsert: true }, (err) => {
            if (err) return next(errors.databaseError);

            // send response
            res.json({
              refresh_token: refreshToken,
              expires_in: settings.csc.refresh_token_expiring_time
            });
          });
        });

      } else {
        const refresh_token = req.body.refresh_token || null;
        if (refresh_token != null) {
          // generate accessToken using refreshToken

          crypto.randomBytes(48, function (err, buffer) {
            if (err) return next(errors.internalServerError);
            const accessToken = buffer.toString('hex');

            // update user with the access token or insert a new one (upsert option)
            Token.updateOne({ user_id: user._id, type: 'access_token' }, {
              value: utils.hash(accessToken),
              type: 'access_token',
              creation_date: Date.now(),
              user_id: user._id,
              client_id: ''
            }, { upsert: true }, (err) => {
              if (err) return next(errors.databaseError);

              // send response
              res.json({
                access_token: accessToken,
                expires_in: settings.csc.access_token_expiring_time
              });
            });
          });

        } else {
          // generate accessToken using username
          crypto.randomBytes(48, function (err, buffer) {
            if (err) return next(errors.internalServerError);
            const accessToken = buffer.toString('hex');

            // update user with the access token or insert a new one (upsert option)
            Token.updateOne({ user_id: user._id, type: 'access_token' }, {
              value: utils.hash(accessToken),
              type: 'access_token',
              creation_date: Date.now(),
              user_id: user._id,
              client_id: ''
            },
              { upsert: true },
              (err) => {
                if (err) return next(errors.databaseError);

                // send response
                res.json({
                  access_token: accessToken,
                  expires_in: settings.csc.access_token_expiring_time
                });
              });
          });
        }
      }
    } catch (e) {
      return next(errors.authError);
    }
  });

router.post('/revoke',
  passport.authenticate('bearer', { session: false }), function (req, res, next) {
    const user = req.user;
    const token = req.body.token;
    const hint = req.body.token_type_hint;

    if (token === undefined) return next(errors.missingTokenParameter);
    if (hint !== undefined && hint !== 'access_token' && hint !== 'refresh_token') return next(errors.invalidTokenHint);

    if (hint === undefined) {

      // update user with the access token and timestamp
      Token.findOneAndDelete({ user_id: user._id, value: utils.hash(token), type: 'access_token' }, (err, doc) => {
        if (err) return next(errors.databaseError);
        if (!doc) {

          // try with refresh token
          Token.findOneAndDelete({ user_id: user._id, value: utils.hash(token), type: 'refresh_token' }, (err, doc) => {
            if (err) return next(errors.databaseError);
            if (!doc) { return next(errors.invalidTokenParameter); }

            res.end();
          });
        } else {
          res.end();
        }
      });

    } else {
      if (hint === 'access_token') {
        Token.findOneAndDelete({ user_id: user._id, value: utils.hash(token), type: 'access_token' }, (err, doc) => {
          if (err) return next(errors.databaseError);
          if (!doc) { return next(errors.invalidTokenParameter); }

          res.end();
        });

      } else {
        Token.findOneAndDelete({ user_id: user._id, value: utils.hash(token), type: 'refresh_token' }, (err, doc) => {
          if (err) return next(errors.databaseError);
          if (!doc) { return next(errors.invalidTokenParameter); }

          Token.findOneAndDelete({ user_id: user._id, type: 'access_token' }, (err, doc) => {
            if (err) return next(errors.databaseError);
            if (!doc) { return next(errors.invalidTokenParameter); }

            res.end();
          });
        });
      }
    }
  });

module.exports = router;