'use strict';

var express = require('express');
var router = express.Router();
var passport = require('passport');
var validator = require('validator');
var errors = require('../errors');
var User = require('../db').User;
var config = require('../config');


router.post('/login',
  passport.authenticate(['basic'], { session: false }),
  function (req, res, next) {
    var rememberMe = req.body.rememberMe || false;
    var refresh_token = req.body.refresh_token || null;
    var user = req.user.user;

    // validate input
    if (refresh_token != null) {
      if (!validator.isBase64(refresh_token)) {
        return next(errors.invalidRefreshTokenFormat);
      }
      return next(errors.notImplementedMethod);
      if (validator.equals(refresh_token, "")) next(errors.invalidRefreshToken);
    }

    // business logic
    if (rememberMe === true) {
      // refresh token will be returned
      return next(errors.notImplementedMethod);
    } else {
      User.findOne({ user: username }, function (err, user) {
        if (err) { return next(errors.internalServerError); }
        if (!user) { return next(errors.authError, false); }

        // generate unique accessToken
        var accessToken = "";

        // update user with the access token and timestamp
        

        // send response
        res.json({
          access_token: accessToken,
          expires_in: config.access_token_expiring_time
        });
      })

      return next(errors.notImplementedMethod);
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