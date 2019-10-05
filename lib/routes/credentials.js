'use strict';

var express = require('express');
var passport = require('passport');
var errors = require('../errors');
var router = express.Router();

router.post('/list',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      var user = req.user;
      var userID = req.body.userID;

      if(userID) return next(errors.notNullUserID);

      res.json({
         credentialIDs: user.credentials
      });
   });
router.post('/info',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      return next(errors.notImplementedMethod);
   });
router.post('/authorise',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      return next(errors.notImplementedMethod);
   });
router.post('/extendTransaction',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      return next(errors.notImplementedMethod);
   });
router.post('/sendOTP',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      return next(errors.notImplementedMethod);
   });

module.exports = router;
