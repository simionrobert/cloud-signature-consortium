'use strict';

const passport = require('passport');
const login = require('connect-ensure-login');

const loginUrl = `/login`;

module.exports.index = [login.ensureLoggedIn(loginUrl), (request, response) => response.send('OAuth 2.0 Server')];

module.exports.loginForm = (request, response) => response.render('login');

module.exports.login = passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: loginUrl });

module.exports.logout = (request, response) => {
  request.logout();
  response.redirect(loginUrl);
};
