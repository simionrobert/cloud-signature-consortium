/* eslint-disable no-case-declarations */
'use strict';

const oauth2orize = require('oauth2orize');
const login = require('connect-ensure-login');
const Client = require('../lib/db').Client;
const Code = require('../lib/db').Code;
const Sad = require('../lib/db').Sad;
const Token = require('../lib/db').Token;
const { errors } = require('../../config');
const crypto = require('crypto');
const passport = require('passport');
const config = require('../../config');
const base64url = require('base64-url');
const utils = require('../utils');

// Create OAuth 2.0 server
const server = oauth2orize.createServer();

// Register serialization and deserialization functions.
//
// When a client redirects a user to user authorization endpoint, an
// authorization transaction is initiated. To complete the transaction, the
// user must authenticate and approve the authorization request. Because this
// may involve multiple HTTP request/response exchanges, the transaction is
// stored in the session.
//
// An application must supply serialization functions, which determine how the
// client object is serialized into the session. Typically this will be a
// simple matter of serializing the client's ID, and deserializing by finding
// the client by ID from the database.

server.serializeClient((client, done) => done(null, client.client_id));

server.deserializeClient((id, done) => {
  Client.findOne({ client_id: id }, function (err, client) {
    if (err) { return done(errors.databaseError, false); }
    if (!client) { return done(errors.unauthorisedClient, false); }

    return done(null, client);
  });
});

// Register supported grant types.
//
// invoked by  server.decision() 
//
// OAuth 2.0 specifies a framework that allows users to grant client
// applications limited access to their protected resources. It does this
// through a process of the user granting access, and the client exchanging
// the grant for an access token.

// Grant authorization codes. The callback takes the `client` requesting
// authorization, the `redirectUri` (which is used as a verifier in the
// subsequent exchange), the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application. The application issues a code, which is bound to these
// values, and will be exchanged for an access token.

server.grant(oauth2orize.grant.code((client, redirectUri, user, ares, done) => {

  // Do verifications. If there is an error, then it should call the request with error instead of returning json
  // The errors that are part of oauth2 are checked. The others aren't.

  if (ares.scope[0] === 'credential') {
    if (ares.credentialID === undefined || ares.credentialID === null || ares.credentialID === '') {
      done(errors.invalid_request);
    }
    if (ares.hash === undefined || ares.hash === null || ares.hash === '') {
      done(errors.invalid_request);
    }
    if (ares.numSignatures === undefined || ares.numSignatures === null || ares.numSignatures === '') {
      done(errors.invalid_request);
    }
  }

  crypto.randomBytes(48, function (err, buffer) {
    if (err) return done('server_error');

    switch (ares.scope[0]) {
      case 'service':
        // Update or insert => upsert
        Code.updateOne({ client_id: client._id, user_id: user._id, redirect_uri: redirectUri }, {
          value: utils.hash(buffer.toString('hex')),
          user_id: user._id,
          scope: ares.scope[0],
          client_id: client._id,
          redirect_uri: redirectUri
        }, { upsert: true }, (err) => {
          if (err) return done('server_error');

          return done(null, buffer.toString('hex'));
        });

        break;
      case 'credential':
        // Update or insert => upsert
        Code.updateOne({ client_id: client._id, user_id: user._id, redirect_uri: redirectUri }, {
          value: utils.hash(buffer.toString('hex')),
          user_id: user._id,
          scope: ares.scope[0],
          client_id: client._id,
          redirect_uri: redirectUri,
          credential_id: ares.credentialID,
          hashes: ares.hash.split(',').map(x => base64url.unescape(x)),
          num_signatures: ares.numSignatures
        }, { upsert: true }, (err) => {
          if (err) return done('server_error');

          return done(null, buffer.toString('hex'));
        });
        break;
      default:
        done('invalid_scope');
    }
  });
}));


// Exchange authorization codes for access tokens. The callback accepts the
// `client`, which is exchanging `code` and any `redirectUri` from the
// authorization request for verification. If these values are validated, the
// application issues an access token on behalf of the user who authorized the
// code. The issued access token response can include a refresh token and
// custom parameters by adding these to the `done()` call

server.exchange(oauth2orize.exchange.code((client, code, redirectUri, done) => {

  // This code can either be for service/credential authorization. It should be found by value
  Code.findOne({ value: utils.hash(code), client_id: client._id }, function (err, authCode) {
    if (err) { return done(err); }
    if (authCode === undefined || authCode === null) { return done(errors.internalServerError); }
    if (client._id.toString() !== authCode.client_id) { return done(errors.invalidClientId); }
    if (redirectUri !== authCode.redirect_uri) { return done(errors.notMatchRedirectUri); }

    // check token availability
    if (authCode.creation_date.getTime() + 1000 * config.settings.code_expiring_time < Date.now()) { return done(errors.invalidCode, false); }

    switch (authCode.scope) {
      case 'service':
        crypto.randomBytes(256, function (err, buffer) {
          if (err) return done(errors.internalServerError);

          const tokenValue = buffer.toString('hex');

          Token.updateOne({ client_id: authCode.client_id, type: 'access_token' }, {
            value: utils.hash(tokenValue),
            type: 'access_token',
            creation_date: Date.now(),
            user_id: authCode.user_id,
            client_id: authCode.client_id
          }, { upsert: true }, (err) => {
            if (err) return done(errors.databaseError);

            done(null, tokenValue, { token_type: "Bearer", expiresIn: config.settings.csc.access_token_expiring_time });
          });
        });
        break;

      case 'credential':
        //generate SAD. It gets deleted when the signature is done
        crypto.randomBytes(128, function (err, buffer) {
          if (err) return done(errors.internalServerError);

          const sadValue = buffer.toString('hex');
          const sad = new Sad({
            value: utils.hash(sadValue),
            hashes: authCode.hashes,
            credential_id: authCode.credential_id
          });

          sad.save((err) => {
            if (err) return done(errors.databaseError);

            // send response
            done(null, sadValue, { token_type: "SAD", expiresIn: config.settings.csc.sad_expiring_time });
          });
        });
        break;
      default:
        done(errors.internalServerError);
    }
  });
}));


// User authorization endpoint.
//
// Invoked after the user logs in.
// 
// `authorization` middleware accepts a `validate` callback which is
// responsible for validating the client making the authorization request. In
// doing so, is recommended that the `redirectUri` be checked against a
// registered value, although security requirements may vary across
// implementations. Once validated, the `done` callback must be invoked with
// a `client` instance, as well as the `redirectUri` to which the user will be
// redirected after an authorization decision is obtained.
//
// This middleware simply initializes a new authorization transaction. It is
// the application's responsibility to authenticate the user and render a dialog
// to obtain their approval (displaying details about the client requesting
// authorization). We accomplish that here by routing through `ensureLoggedIn()`
// first, and rendering the `dialog` view.

module.exports.authorization = [
  login.ensureLoggedIn(),
  server.authorization((clientId, redirectUri, done) => {
    Client.findOne({ client_id: clientId }, function (error, client) {
      if (error) return done(error);
      // WARNING: For security purposes, it is highly advisable to check that
      //          redirectUri provided by the client matches one registered with
      //          the server. For simplicity, this example does not. You have
      //          been warned.
      return done(null, client, redirectUri);
    });
  }),
  (request, response) => {
    response.render('dialog',
      {
        transactionId: request.oauth2.transactionID,
        user: request.user,
        client: request.oauth2.client,
        scopes: request.oauth2.req.scope,
        credentialID: request.query.credentialID,
        hash: request.query.hash,
        num_signatures: +request.query.numSignatures
      });
  },
];

// User decision endpoint.
//
// Invoked on get /oauth2/authorize/decision call
// 
// `decision` middleware processes a user's decision to allow or deny access
// requested by a client application. Based on the grant type requested by the
// client, the above grant middleware configured above will be invoked to send
// a response.

module.exports.decision = [
  login.ensureLoggedIn(),
  server.decision(function (req, done) {
    return done(null, {
      scope: req.oauth2.req.scope,
      credentialID: req.body.credentialID,
      hash: req.body.hash,
      numSignatures: +req.body.num_signatures
    }) // this is ares
  }) // invokes server.grant()
];


// Token endpoint.
//
// `token` middleware handles client requests to exchange authorization grants
// for access tokens. Based on the grant type being exchanged, the above
// exchange middleware will be invoked to handle the request. 
module.exports.token = [
  passport.authenticate(['client-basic', 'oauth2-client-password'], { session: false }),
  server.token(),
  server.errorHandler(),
];
