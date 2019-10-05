'use strict';

const express = require('express');
const passport = require('passport');
const errors = require('../errors');

const router = express.Router();

router.post('/signHash',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      return next(errors.notImplementedMethod);
   });

router.post('/timestamp',
   passport.authenticate('bearer', { session: false }), function (req, res, next) {
      return next(errors.notImplementedMethod);
   });

module.exports = router;