'use strict';

var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var passport = require('passport'),
  BasicStrategy = require('passport-http').BasicStrategy,
  BearerStrategy = require('passport-http-bearer').Strategy,
  CustomStrategy = require('passport-custom').Strategy;
var validator = require('validator');
var User = require('./db').User;
var errors = require('./errors');
var config = require('./config');


var infoRouter = require('./routes/info');
var authRouter = require('./routes/auth');
var credentialsRouter = require('./routes/credentials');
var signaturesRouter = require('./routes/signatures');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(helmet());

app.use('/csc/v1/info', infoRouter);
app.use('/csc/v1/auth', authRouter);
app.use('/csc/v1/credentials', credentialsRouter);
app.use('/csc/v1/signatures', signaturesRouter);


passport.use(new BasicStrategy(
  function (username, password, done) {
    User.findOne({ user: username }, function (err, user) {
      if (err) { return done(errors.internalServerError); }
      if (!user) { return done(errors.authError, false); }
      if (!user.verifyPassword(password)) { return done(errors.authError, false); }
      return done(null, user);
    });
  }
));
passport.use(new BearerStrategy(
  function (access_token, done) {
    // validate input format
    if (!validator.isHexadecimal(access_token)) return next(errors.invalidAccessToken);

    User.findOne({ 'access_token.value': access_token }, function (err, user) {
      if (err) { return done(errors.internalServerError); }
      if (!user) { return done(errors.invalidAccessToken, false); }

      // calculate refresh token time availability
      if (user.access_token.timestamp.getTime() + 1000 * config.access_token_expiring_time < Date.now()) { return done(errors.invalidAccessToken, false); }

      return done(null, user, { scope: 'all' });
    });
  }
));
passport.use(new CustomStrategy(
  function (req, done) {
    // validate input format
    if (!validator.isHexadecimal(req.body.refresh_token)) return next(errors.invalidRefreshTokenFormat);

    User.findOne({ 'refresh_token.value': req.body.refresh_token }, function (err, user) {
      if (err) { return done(errors.internalServerError); }
      if (!user) { return done(errors.invalidRefreshToken, false); }

      // calculate refresh token time availability
      if (user.refresh_token.timestamp.getTime() + 1000 * config.refresh_token_expiring_time < Date.now()) { return done(errors.invalidRefreshToken, false); }

      return done(null, user, { scope: 'all' });
    });
  }
));


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(errors.accessDenied);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  req.app.get('env') === 'development' ? console.log(err) : {};

  // render the error page
  if (err.status !== undefined) {
    res.status(err.status);
    return res.json({
      error: err.message,
      error_description: err.description
    });
  }

  // fallback for unknown application errors
  res.status(errors.internalServerError.status);
  res.json({
    error: errors.internalServerError.message,
    error_description: errors.internalServerError.description
  });
});

module.exports = app;
