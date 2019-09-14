'use strict';

var express = require('express');
var router = express.Router();
var passport = require('passport');
var errors = require('../errors');

router.post('/login',
  passport.authenticate('basic', { session: false }),
  function (req, res, next) {
    var refresh_token = req.body.refresh_token;
    var rememberMe = req.body.rememberMe || false;
    var clientData = req.body.clientData;

    if (rememberMe) {
      // refresh token is present
      return next(errors.invalidRefreshToken);
      res.json({ message: "Not Implemented Yet" });
    } else {
      res.json({ message: "Not Implemented Yet" });
    }
  });

router.post('/revoke',
  passport.authenticate('basic', { session: false }),
  function (req, res, next) {
    res.json({ message: "Not Implemented Yet" });
  });

module.exports = router;
