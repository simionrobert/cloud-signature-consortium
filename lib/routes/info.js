'use strict';

var express = require('./express');
var config = require("../../config")

var router = express.Router();

router.post('/', function (req, res) {
   var lang = req.body.lang || "EN";
   if (lang === 'EN' || lang === 'RO')
      res.json(config.info.lang[lang]);
   else
      res.json(config.info.lang['EN']);
});

module.exports = router;