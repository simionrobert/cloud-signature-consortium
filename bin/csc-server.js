#!/usr/bin/env node

'use strict';

const cscServer = require('../lib'),
    chalk = require('chalk'),
    os = require('os'),
    argv = require('minimist')(process.argv.slice(2));

const ifaces = os.networkInterfaces();

if (argv.h || argv.help) {
    console.log([
        'Options:',
        '  --port, -p       Port to use [8080]',
        '  --address, -a    Address to use [0.0.0.0]',
        '  --db, -d         Database URL [mongodb://localhost:27017/csc]',
        '  --user           User to add once to the db. Used it with --pass',
        '  --pass           Password of the user. Used it with --user',
        '  --cert, -c       Path to ssl cert file (default: cert.pem).',
        '  --key, -k        Path to ssl key file (default: key.pem).',
        '  --passphrase     Path to ssl key file (default: 0000).',
        '  --silent, -s     Suppress log messages from output',
        '  --help, -h       Print this list and exit.',
        '',
        'Examples',
        '   csc-server',
        '   csc-server --user "username" --pass "password"'
    ].join('\n'));
    process.exit();
}

// Logger part
let logger;
if (!argv.s && !argv.silent) {
    logger = {
        info: console.log
    };
}
else if (chalk) {
    logger = {
        info: function () { }
    };
}

if (argv.user || argv.pass) {
    // Only register user
    if (argv.user && argv.pass) {
        const server = cscServer.createServer({ database: argv.db || argv.d });
        server.registerUser(argv.user, argv.pass, function (err) {
            if (err) {
                logger.info(chalk.yellow(`An error occured when saving the user ${argv.user}. ${err}`));
                process.exit(1);
            }

            logger.info(chalk.yellow(`User ${argv.user} was saved in the database`));
            process.exit();
        });
    } else {
        logger.info(chalk.red(`Options --user and --pass need to be used together!`));
        process.exit(1);
    }
} else {
    // Start server
    listen();
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
            logger.info(chalk.red(`csc-server has stopped due to: ${error}`));
            process.exit(1);
        }

        const canonicalHost = host === '0.0.0.0' ? '127.0.0.1' : host,
            protocol = 'https://';

        logger.info([
            chalk.yellow('Starting up csc-server, serving through'),
            chalk.cyan(' https'),
            chalk.yellow('\nAvailable on:')
        ].join(''));

        if (argv.a && host !== '0.0.0.0') {
            logger.info(('  ' + protocol + canonicalHost + ':' + chalk.green(port.toString())));
        }
        else {
            Object.keys(ifaces).forEach(function (dev) {
                ifaces[dev].forEach(function (details) {
                    if (details.family === 'IPv4') {
                        logger.info(('  ' + protocol + details.address + ':' + chalk.green(port)));
                        logger.info(('  ' + protocol + details.address + ':' + chalk.green(port.toString())));
                    }
                });
            });
        }

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
    logger.info(chalk.red('csc-server stopped.'));
    process.exit();
});

process.on('SIGTERM', function () {
    logger.info(chalk.red('csc-server stopped.'));
    process.exit();
});