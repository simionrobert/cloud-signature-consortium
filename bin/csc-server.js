#!/usr/bin/env node

'use strict';

const cscServer = require('../lib'),
    os = require('os'),
    logger = require('winston'),
    argv = require('minimist')(process.argv.slice(2));
const { format } = logger;
const ifaces = os.networkInterfaces();

logger.configure({
    level: 'info',
    format: format.combine(
        format.colorize(),
        format.simple()
    ),
    transports: [
        new logger.transports.Console({
            silent: (argv.silent | argv.s) == true ? true : false
        })
    ]
});


if (argv.h || argv.help) {
    logger.log([
        'Options:',
        '  --listen, -l     Start the server',
        '  --port, -p       Port to use [8080]',
        '  --address, -a    Address to use [0.0.0.0]',
        '  --db, -d         Database URL [mongodb://localhost:27017/csc]',
        '  --init, -i       Create credential for user (generate cert, key pair, assign to user). Used with --use',
        '  --user           User to add once to the db. Used with --pass',
        '  --pass           Password of the user. Used with --user',
        '  --cert, -c       Path to ssl cert file (default: cert.pem).',
        '  --key, -k        Path to ssl key file (default: key.pem).',
        '  --passphrase     Path to ssl key file (default: 0000).',
        '  --silent, -s     Suppress log messages from output',
        '  --help, -h       Print this list and exit.',
        '',
        'Examples',
        '   csc-server -l',
        '   csc-server --user=username --pass=password'
    ].join('\n'));
    process.exit();
}

if (argv.user || argv.pass) {
    // Only register user
    if (argv.user && argv.pass) {
        const server = cscServer.createServer({ database: argv.db || argv.d });

        logger.info(`Creating the user ...`);
        server.registerUser(argv.user, argv.pass, function (err) {
            if (err) {
                logger.error(`An error occured when saving the user ${argv.user}. ${err}`);
                process.exit(1);
            }

            logger.info(`User ${argv.user} was saved in the database`);

            logger.info(`Generating credentials...`);
            const server = cscServer.createServer({ database: argv.db || argv.d });
            server.generateCredentials(argv.user, (err) => {
                if (err) logger.error(err);

                logger.info(`Certificate successfully generated!`);
                process.exit();
            });
        });
    } else {
        logger.error(`Options --user and --pass need to be used together!`);
        process.exit(1);
    }
} else if (argv.l || argv.listen) {
    // Start server
    listen();
} else {
    logger.error(`Nothing specified. Exiting!`);
    process.exit(1);
}


function listen() {
    const options = {
        host: argv.a || argv.address,
        port: argv.p || argv.port || parseInt(process.env.PORT, 10),
        database: argv.db || argv.d,
        cert: argv.C || argv.cert,
        key: argv.K || argv.key,
        passphrase: argv.passphrase
    };

    const server = cscServer.createServer(options);
    server.listen(options.port, options.host, function (error, port, host) {
        if (error) {
            logger.error(`csc-server has stopped due to: ${error}`);
            process.exit(1);
        }

        const canonicalHost = host === '0.0.0.0' ? '127.0.0.1' : host,
            protocol = 'https://';


        let addresses = [];
        if (argv.a && host !== '0.0.0.0') {
            addresses.push(('  ' + protocol + canonicalHost + ':' + (port.toString())));
        }
        else {
            Object.keys(ifaces).forEach(function (dev) {
                ifaces[dev].forEach(function (details) {
                    if (details.family === 'IPv4') {
                        addresses.push(('  ' + protocol + details.address + ':' + (port)));
                        addresses.push(('  ' + protocol + details.address + ':' + (port.toString())));
                    }
                });
            });
        }

        logger.info([
            'Starting up csc - server, serving through https\nAvailable on: ',
            addresses.join('\n')
        ].join('\n'));
        logger.info('Hit CTRL-C to stop the server');
    });
}

if (process.platform === 'win32') {
    require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    }).on('SIGINT', function () {
        process.emit('SIGINT');
    });
}

process.on('SIGINT', function () {
    logger.info('csc-server stopped.');
    process.exit();
});

process.on('SIGTERM', function () {
    logger.info('csc-server stopped.');
    process.exit();
});