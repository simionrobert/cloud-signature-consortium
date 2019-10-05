'use strict';

const express = require('express');
const config = require("../../config")

const router = express.Router();

router.post('/', function (req, res) {
   const lang = req.body.lang || "EN";
   if (lang === 'EN' || lang === 'RO')
      res.json(config.info.lang[lang]);
   else
      res.json(config.info.lang['EN']);
});

module.exports = router;