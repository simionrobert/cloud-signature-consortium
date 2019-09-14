'use strict';

var express = require('express');
var router = express.Router();
var passport = require('passport');
var errors = require('../errors');

router.post('/signHash',
   passport.authenticate('basic', {
      session: false
   }),
   function (req, res, next) {
      return next(errors.notImplementedMethod);
   });

router.post('/timestamp',
   passport.authenticate('basic', {
      session: false
   }),
   function (req, res, next) {
      return next(errors.notImplementedMethod);
   });

module.exports = router;