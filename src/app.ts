import express from "express";
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import logger from 'winston';
import passport from 'passport';
import session from 'express-session';
import ejs from 'ejs';
import path from 'path';
import { errors } from './config';
import * as infoRouter from './routes/info';
import * as  authRouter from './routes/auth';
import * as  credentialsRouter from './routes/credentials';
import * as  signaturesRouter from './routes/signatures';

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

export default app;
