'use strict';

var express = require('./express');
var router = express.Router();
var config = require("../config")

router.post('/', function (req, res, next) {
   var lang = req.body.lang || "";
   res.json(config.getInfoConfig(lang));
});

module.exports = router;