import passport from 'passport';
import { Response, Request } from 'express';
import connectEnsureLogin from 'connect-ensure-login';

export const index = [
  connectEnsureLogin.ensureLoggedIn(`/login`),
  (request: Request, response: Response) =>
    response.send(
      `Application Client API endpoint was called with the authentication code <strong>${request.query.code}</strong>`
    )
];

export const loginForm = (request: Request, response: Response) =>
  response.render('login');

export const login = passport.authenticate('local', {
  successReturnToOrRedirect: '/',
  failureRedirect: `/login`
});

export const logout = (request: Request, response: Response) => {
  request.logout();
  response.redirect(`/login`);
};
