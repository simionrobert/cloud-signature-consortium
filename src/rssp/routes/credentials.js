var express = require('express');
var router = express.Router();
var passport = require('passport');

router.post('/list',
   passport.authenticate('basic', { session: false }),
   function (req, res, next) {
      res.json({ message: "Not Implemented Yet" });
   });
router.post('/info',
   passport.authenticate('basic', { session: false }),
   function (req, res, next) {
      res.json({ message: "Not Implemented Yet" });
   });
router.post('/authorise',
   passport.authenticate('basic', { session: false }),
   function (req, res, next) {
      res.json({ message: "Not Implemented Yet" });
   });
router.post('/extendTransaction',
   passport.authenticate('basic', { session: false }),
   function (req, res, next) {
      res.json({ message: "Not Implemented Yet" });
   });
router.post('/sendOTP',
   passport.authenticate('basic', { session: false }),
   function (req, res, next) {
      res.json({ message: "Not Implemented Yet" });
   });

module.exports = router;
