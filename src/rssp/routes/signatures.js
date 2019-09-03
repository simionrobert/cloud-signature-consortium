var express = require('express');
var router = express.Router();
var passport = require('passport');

router.post('/signHash',
   passport.authenticate('basic', { session: false }),
   function (req, res, next) {
      res.json({ message: "Not Implemented Yet" });
   });

router.post('/timestamp',
   passport.authenticate('basic', { session: false }),
   function (req, res, next) {
      res.json({ message: "Not Implemented Yet" });
   });

module.exports = router;
