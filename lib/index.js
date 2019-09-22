'use strict';

var https = require('https');
var fs = require('fs');
var mongoose = require('mongoose');
var app = require('./app.js');
var User = require('./db').User;
var crypto = require('crypto');
const config = require('../config').settings;


module.exports.createServer = function (options) {
    return new CSCServer(options);
};

function CSCServer(options) {
    this.options = options || {};

    /**
     * Store port in Express.
     */
    app.set('port', this.options.port || config.port);

    /**
     * Create HTTP server.
     */
    this.server = https.createServer({
        cert: fs.readFileSync(this.options.cert || config.certificate_path),
        key: fs.readFileSync(this.options.key || config.private_key_path),
        passphrase: this.options.passphrase || config.passphrase
    }, app);
}

CSCServer.prototype.listen = function (port, host, next) {
    /**
    * Connect to the mongoose DB
    */
    mongoose.connection.on('connected', () => {
        /**
        * Start listening
        */
        var listener = this.server.listen({
            port: port || config.port,
            host: host || config.host
        }, function (err) {
            if (err) return next(err);
            next(undefined, listener.address().port, listener.address().address);
        });
    });

    mongoose.connect(config.database_url, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true, useCreateIndex: true })
        .catch(err => next(err));
};

CSCServer.prototype.registerUser = function (username, password, next) {
    /**
    * Connect to the mongoose DB
    */
    mongoose.connection.on('connected', () => {
        var user = new User({
            user: username,
            password: crypto.createHash('sha256').update(password).digest('hex')
        });

        user.save(function (err) {
            next(err);
        });
    });

    mongoose.connect(config.database_url, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true, useCreateIndex: true })
        .catch(err => next(err));
};

