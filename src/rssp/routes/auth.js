var express = require('express');
var router = express.Router();

router.get('/login', function (req, res, next) {
  var refresh_token = req.body.refresh_token;
  var rememberMe = req.body.rememberMe || false;
  var clientData = req.body.clientData;

  if (rememberMe) {
    // refresh token is present
  } else {

  }

});

router.get('/revoke', function (req, res, next) {
  res.json({ message: "Not Implemented Yet" });
});

module.exports = router;
