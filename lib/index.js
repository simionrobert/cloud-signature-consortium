'use strict';

var https = require('https');
var fs = require('fs');
var mongoose = require('mongoose');
var app = require('./app.js');


module.exports.createServer = function (options) {
    return new HttpServer(options);
};

function HttpServer(options) {
    this.options = options || {};

    /**
     * Store port in Express.
     */
    app.set('port', options.port);

    /**
     * Create HTTP server.
     */
    this.server = https.createServer({
        cert: fs.readFileSync(options.https.cert),
        key: fs.readFileSync(options.https.key),
        passphrase: options.https.passphrase
    }, app);
}

HttpServer.prototype.listen = function (port, host, next) {
    this.server.listen({
        port: port,
        host: host
    }, next);

    mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
    mongoose.connect(this.options.database, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true });
};