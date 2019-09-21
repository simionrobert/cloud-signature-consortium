#!/usr/bin/env node

/**
 * Module dependencies.
 */

'use strict';


var debug = require('debug')('rssp:server');
var https = require('https');
var fs = require('fs');
var mongoose = require('mongoose');

var app = require('../lib/app.js');
var config = require('../config').settings;

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || config.port);
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = https.createServer({
  key: fs.readFileSync(config.private_key_path),
  cert: fs.readFileSync(config.certificate_path),
  passphrase: config.passphrase
}, app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
mongoose.connect(config.database_url, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true });

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
