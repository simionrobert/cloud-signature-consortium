'use strict';

var express = require('express');
var router = express.Router();
var passport = require('passport');
var errors = require('../errors');

router.post('/list',
   passport.authenticate('basic', { session: false }),
   function (req, res, next) {
      return next(errors.notImplementedMethod);
   });
router.post('/info',
   passport.authenticate('basic', { session: false }),
   function (req, res, next) {
      return next(errors.notImplementedMethod);
   });
router.post('/authorise',
   passport.authenticate('basic', { session: false }),
   function (req, res, next) {
      return next(errors.notImplementedMethod);
   });
router.post('/extendTransaction',
   passport.authenticate('basic', { session: false }),
   function (req, res, next) {
      return next(errors.notImplementedMethod);
   });
router.post('/sendOTP',
   passport.authenticate('basic', { session: false }),
   function (req, res, next) {
      return next(errors.notImplementedMethod);
   });

module.exports = router;
