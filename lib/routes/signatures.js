'use strict';

var express = require('express');
var passport = require('passport');
var errors = require('../errors');

var router = express.Router();

router.post('/signHash',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      return next(errors.notImplementedMethod);
   });

router.post('/timestamp',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      return next(errors.notImplementedMethod);
   });

module.exports = router;