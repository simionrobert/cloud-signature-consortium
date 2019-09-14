'use strict';

var express = require('express');
var router = express.Router();
var passport = require('passport');
var errors = require('../errors');

router.post('/login',
  passport.authenticate(['basic'], {
    session: false
  }),
  function (req, res, next) {
    var refresh_token = req.body.refresh_token || null;
    var rememberMe = req.body.rememberMe || false;
    var clientData = req.body.clientData;

    if (rememberMe) {
      // refresh token is present
      return next(errors.notImplementedMethod);
    } else {
      return next(errors.notImplementedMethod);
    }
  });

router.post('/revoke',
  passport.authenticate('basic', {
    session: false
  }),
  function (req, res, next) {
    return next(errors.notImplementedMethod);
  });

module.exports = router;