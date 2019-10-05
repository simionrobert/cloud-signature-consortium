'use strict';

const express = require('express');
const passport = require('passport');
const errors = require('../errors');
const router = express.Router();

router.post('/list',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      const user = req.user;
      const userID = req.body.userID;

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
