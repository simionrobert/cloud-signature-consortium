'use strict';

const cscServer = require('../lib');

const server = cscServer.createServer({ database: undefined });
server.generateCredentials('robert.simion', (err) => {
    if(err) console.log(err);
});
