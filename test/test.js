'use strict';

const cscServer = require('../lib');

const server = cscServer.createServer({ database: undefined });

// server.generateCredentials('robert.simion', (err) => {
//     if(err) console.log(err);
// });

server.listen(null, null, (error) => {
    if (error) console.log('Test Error!' + error);
    console.log('Listening...')
});