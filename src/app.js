'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const logger = require('winston');
const passport = require('passport');
const session = require('express-session');
const ejs = require('ejs');
const path = require('path');
const { errors } = require('../config');
const infoRouter = require('./routes/info'),
  authRouter = require('./routes/auth'),
  credentialsRouter = require('./routes/credentials'),
  signaturesRouter = require('./routes/signatures');

const app = express();

app.engine('ejs', ejs.__express);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './views'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev', {
  stream: {
    write: function (l) {
      logger.info(l);
    }
  }
}));
app.use(cookieParser());
app.use(helmet());
app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
require('./passport');

const base = '/csc/v1';
app.use(`${base}/info`, infoRouter);
app.use(`${base}/auth`, authRouter);
app.use(`${base}/credentials`, credentialsRouter);
app.use(`${base}/signatures`, signaturesRouter);

app.get(`/`, require('./routes/site').index);
app.get(`/login`, require('./routes/site').loginForm);
app.post(`/login`, require('./routes/site').login);
app.get(`/logout`, require('./routes/site').logout);

app.get(`/oauth2/authorize`, require('./routes/oauth2').authorization);
app.post(`/oauth2/authorize/decision`, require('./routes/oauth2').decision);
app.post(`/oauth2/token`, require('./routes/oauth2').token);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(errors.accessDenied);
});

// error handler
// eslint-disable-next-line no-unused-vars
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  req.app.get('env') === 'development' ? logger.info(err) : {};

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
