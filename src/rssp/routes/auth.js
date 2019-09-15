'use strict';

var express = require('express');
var router = express.Router();
var passport = require('passport');
var errors = require('../errors');
var User = require('../db').User;
var config = require('../config');
var crypto = require('crypto');


router.post('/login',
  passport.authenticate(['basic', 'custom'], { session: false }),
  function (req, res, next) {
    var rememberMe = req.body.rememberMe || false;
    var user = req.user;

    // business logic
    if (rememberMe === true) {
      // generate a new refreshToken

      crypto.randomBytes(48, function (err, buffer) {
        if (err) return next(errors.internalServerError);
        var refreshToken = buffer.toString('hex');

        // update user with the refresh token and timestamp
        User.findOneAndUpdate({ user: user.user }, {
          'refresh_token.value': refreshToken,
          'refresh_token.timestamp': Date.now()
        }, function (err, doc) {
          if (err) return next(errors.internalServerError);
          if (!doc) { return next(errors.internalServerError); }

          // send response
          res.json({
            refresh_token: refreshToken,
            expires_in: config.refresh_token_expiring_time
          });
        });
      });
    } else {
      var refresh_token = req.body.refresh_token || null;
      if (refresh_token != null) {
        // generate accessToken using refreshToken

        crypto.randomBytes(48, function (err, buffer) {
          if (err) return next(errors.internalServerError);
          var accessToken = buffer.toString('hex');

          // update user with the access token and timestamp
          User.findOneAndUpdate({ user: user.user }, {
            'access_token.value': accessToken,
            'access_token.timestamp': Date.now()
          }, function (err, doc) {
            if (err) return next(errors.internalServerError);
            if (!doc) { return next(errors.internalServerError); }

            // send response
            res.json({
              access_token: accessToken,
              expires_in: config.access_token_expiring_time
            });
          });
        });
      } else {
        // generate accessToken using username

        crypto.randomBytes(48, function (err, buffer) {
          if (err) return next(errors.internalServerError);
          var accessToken = buffer.toString('hex');

          // update user with the access token and timestamp
          User.findOneAndUpdate({ user: user.user }, {
            'access_token.value': accessToken,
            'access_token.timestamp': Date.now()
          }, function (err, doc) {
            if (err) return next(errors.internalServerError);
            if (!doc) { return next(errors.internalServerError); }

            // send response
            res.json({
              access_token: accessToken,
              expires_in: config.access_token_expiring_time
            });
          });
        });
      }
    }
  });

router.post('/revoke',
  passport.authenticate('bearer', {
    session: false
  }),
  function (req, res, next) {
    return next(errors.notImplementedMethod);
  });

module.exports = router;