'use strict';

var express = require('express');
var router = express.Router();
var passport = require('passport');
var errors = require('../errors');

router.post('/list',
   passport.authenticate('bearer', { session: false }),
   function (req, res, next) {
      return next(errors.notImplementedMethod);
   });
router.post('/info',
   passport.authenticate('bearer', { session: false }),
   function (req, res, next) {
      return next(errors.notImplementedMethod);
   });
router.post('/authorise',
   passport.authenticate('bearer', { session: false }),
   function (req, res, next) {
      return next(errors.notImplementedMethod);
   });
router.post('/extendTransaction',
   passport.authenticate('bearer', { session: false }),
   function (req, res, next) {
      return next(errors.notImplementedMethod);
   });
router.post('/sendOTP',
   passport.authenticate('bearer', { session: false }),
   function (req, res, next) {
      return next(errors.notImplementedMethod);
   });

module.exports = router;
