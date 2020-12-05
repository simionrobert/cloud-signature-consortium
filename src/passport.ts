'use strict';

import passport from 'passport'; 
import   {BasicStrategy} from 'passport-http';
import *  as BearerStrategy  from'passport-http-bearer';
import  *  as CustomStrategy  from'passport-custom';
import  *  as ClientPasswordStrategy from'passport-oauth2-client-password';
import  *  as LocalStrategy from 'passport-local';
import * as validator from 'validator';

import  {Token} from './lib/db.ts';
import {User} from './lib/db.ts';
import  {Client} from './lib/db.ts';
import { errors } from './config';
import * as config  from '../config.ts';
import * as utils from'./services/utils';

/**
 * BasicStrategy
 *
 * Used by auth/login. 
 * This strategy is used to authenticate clients in place of users based on a username and password.
 * No need for session id cookie.
 */
function verifyUser(username, password, done) {
    User.findOne({ user: username }, function (err, user) {
        if (err) { return done(errors.databaseError); }
        if (!user) { return done(errors.unauthorisedClient, false); }
        if (!user.verifyPassword(password)) { return done(errors.accessDenied, false); }
        return done(null, user);
    });
}

passport.use(new BasicStrategy(verifyUser));

/**
 * LocalStrategy
 *
 * Used by the login form to auth users directly based on a username and password.
 * Anytime a request is made to authorize an application, we must ensure that
 * a user is logged in before asking them to approve the request.
 */
passport.use(new LocalStrategy.Strategy(verifyUser));

passport.serializeUser((user, done) => done(null, user.user));

passport.deserializeUser((username, done) => {
    User.findOne({ user: username }, function (err, user) {
        if (err) { return done(errors.databaseError, false); }
        if (!user) { return done(errors.unauthorisedClient, false); }

        return done(null, user);
    });
});

/**
 * BasicStrategy & ClientPasswordStrategy
 *
 * These strategies are used to authenticate registered OAuth clients. They are
 * employed to protect the `token` endpoint, which consumers use to obtain
 * access tokens. The OAuth 2.0 specification suggests that clients use the
 * HTTP Basic scheme to authenticate. Use of the client password strategy
 * allows clients to send the same credentials in the request body (as opposed
 * to the `Authorization` header). While this approach is not recommended by
 * the specification, in practice it is quite common.
 */

function verifyClient(clientId, clientSecret, done) {
    Client.findOne({ client_id: clientId }, (error, client) => {
        if (error) return done(error);
        if (!client) return done(null, false);
        if (!client.verify(clientSecret)) { return done(errors.accessDenied, false); }

        return done(null, client);
    });
}

passport.use('client-basic', new BasicStrategy(verifyClient));

passport.use(new ClientPasswordStrategy.Strategy(verifyClient));


/**
 * CustomStrategy
 *
 * Used by auth/login with the refresh_token set.
 * This strategy is used to authenticate clients in place of users based on the refresh token.
 */
passport.use(new CustomStrategy.Strategy(
    function (req, done) {
        if (req.body.refresh_token === null || req.body.refresh_token === undefined) {
            return done(errors.malformedAuthMethod);
        }

        if (!validator.isHexadecimal(req.body.refresh_token)) return done(errors.invalidRefreshTokenFormatParameter);

        Token.findOne({ 'value': utils.hash(req.body.refresh_token), type: 'refresh_token' }, function (err, doc) {
            if (err) { return done(errors.authError); }
            if (!doc) { return done(errors.invalidRefreshTokenParameter, false); }

            // check token availability
            if (doc.creation_date.getTime() + 1000 * config.settings.refresh_token_expiring_time < Date.now()) { return done(errors.invalidRefreshTokenParameter, false); }

            User.findOne({ _id: doc.user_id }, function (err, user) {
                if (err) { return done(errors.databaseError, false); }
                if (!user) { return done(errors.unauthorisedClient, false); }

                return done(null, user, { scope: 'all' });
            });
        });
    }
));

/**
 * BearerStrategy
 *
 * Both auth/login and oauth2/token are providing this token.
 * This strategy is used to authenticate only users based on an access token (normal or oauth2)
 * (aka a bearer token).
 */
passport.use(new BearerStrategy.Strategy(
    function (access_token, done) {
        if (access_token === null || access_token === undefined) {
            return done(errors.malformedAuthMethod);
        }

        if (!validator.isHexadecimal(access_token)) return done(errors.invalidAccessToken);

        Token.findOne({ 'value': utils.hash(access_token), type: 'access_token' }, function (err, doc) {
            if (err) { return done(errors.databaseError); }
            if (!doc) { return done(errors.invalidToken, false); }

            // check token availability
            if (doc.creation_date.getTime() + 1000 * config.settings.access_token_expiring_time < Date.now()) { return done(errors.invalidToken, false); }

            User.findOne({ _id: doc.user_id }, function (err, user) {
                if (err) { return done(errors.databaseError, false); }
                if (!user) { return done(errors.unauthorisedClient, false); }

                return done(null, user, { scope: 'all' });
            });
        });
    }
));