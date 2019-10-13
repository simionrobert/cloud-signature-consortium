'use strict';

const express = require('express');
const passport = require('passport');
const crypto = require('crypto');
const {errors} = require('../config');
const User = require('../db').User;
const config = require('../config');

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
          User.findOneAndUpdate({ user: user.user }, {
            'refresh_token.value': refreshToken,
            'refresh_token.timestamp': Date.now(),
            'refresh_token.valid': true
          }, function (err, doc) {
            if (err) return next(errors.databaseError);
            if (!doc) { return next(errors.internalServerError); }

            // send response
            res.json({
              refresh_token: refreshToken,
              expires_in: config.settings.csc.refresh_token_expiring_time
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

            // update user with the access token and timestamp
            User.findOneAndUpdate({ user: user.user }, {
              'access_token.value': accessToken,
              'access_token.timestamp': Date.now(),
              'access_token.valid': true
            }, function (err, doc) {
              if (err) return next(errors.databaseError);
              if (!doc) { return next(errors.internalServerError); }

              // send response
              res.json({
                access_token: accessToken,
                expires_in: config.settings.csc.access_token_expiring_time
              });
            });
          });
        } else {
          // generate accessToken using username

          crypto.randomBytes(48, function (err, buffer) {
            if (err) return next(errors.internalServerError);
            const accessToken = buffer.toString('hex');

            // update user with the access token and timestamp
            User.findOneAndUpdate({ user: user.user }, {
              'access_token.value': accessToken,
              'access_token.timestamp': Date.now(),
              'access_token.valid': true
            }, function (err, doc) {
              if (err) return next(errors.databaseError);
              if (!doc) { return next(errors.internalServerError); }

              // send response
              res.json({
                access_token: accessToken,
                expires_in: config.settings.csc.access_token_expiring_time
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
      // try to find the access token type
      User.findOneAndUpdate({ user: user.user, 'access_token.value': token, 'access_token.valid': true }, {
        'access_token.valid': false
      }, function (err, doc) {
        if (err) return next(errors.databaseError);
        if (!doc) {
          // try with refresh token

          User.findOneAndUpdate({ user: user.user, 'refresh_token.value': token, 'refresh_token.valid': true }, {
            'refresh_token.valid': false,
            'access_token.valid': false
          }, function (err, doc) {
            if (err) return next(errors.databaseError);
            if (!doc) { return next(errors.invalidTokenParameter); }

            // send response
            res.end();
          });
        }

        // send response
        res.end();
      });

    } else {
      if (hint === 'access_token') {
        User.findOneAndUpdate({ user: user.user, 'access_token.value': token, 'access_token.valid': true }, {
          'access_token.valid': false
        }, function (err, doc) {
          if (err) return next(errors.databaseError);
          if (!doc) { return next(errors.invalidTokenParameter); }

          // send response
          res.end();
        });
      } else {
        // token is a  refresh_token

        User.findOneAndUpdate({ user: user.user, 'refresh_token.value': token, 'refresh_token.valid': true }, {
          'refresh_token.valid': false,
          'access_token.valid': false
        }, function (err, doc) {
          if (err) return next(errors.databaseError);
          if (!doc) { return next(errors.invalidTokenParameter); }

          // send response
          res.end();
        });
      }
    }
  });

module.exports = router;