'use strict';

const cscServer = require('../lib');
const logger = require('winston');

const server = cscServer.createServer({ database: undefined });

server.listen(null, null, (error) => {
    if (error) logger.error('Test Error!' + error);
    logger.log('Listening...')
});