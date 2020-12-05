#!/usr/bin/env node

import os from 'os';
import logger from 'winston';
import packageInfo from '../package.json';
import CSCServer from './services';

const ifaces = os.networkInterfaces();
const argv = require('minimist')(process.argv.slice(2), {
  string: ['pin', 'pass', 'id', 'secret', 'passphrase']
});

// Configure logger suppression or not
logger.configure({
  level: 'info',
  format: logger.format.combine(
    logger.format.colorize(),
    logger.format.simple()
  ),
  transports: [
    new logger.transports.Console({
      silent: (argv.silent | argv.s) === true ? true : false
    })
  ]
});

// Show help
if (argv.h || argv.help) {
  logger.info(
    [
      'Usage:',
      '   csc-server [options]',
      '',
      'Options:',
      '  --createUser    Create a user using the arguments below.',
      '       --user           Username of the user.',
      '       --pass           Password of the user.',
      '       --pin            PIN associated with the generated private key.',
      '',
      '  --createClient  Create an OAuth 2.0 client using the arguments below.',
      '       --name          Name of the client application.',
      '       --id            Client id.',
      '       --secret        Client_secret.',
      '       --redirectUri   Redirect_uri.',
      '',
      '  --listen, -l     Start the server',
      '       --silent, -s     Suppress log messages from output',
      '',
      '  --version, -v    Print the version and exit.',
      '  --help, -h       Print this list and exit.',
      '',
      'Examples',
      '   csc-server -l',
      '   csc-server --createUser --user=username --pass=password --pin=pin',
      '   csc-server --createClient --name=name --id=id --secret=secret --redirectUri=redirectUri'
    ].join('\n')
  );
  process.exit();
}

// Show version
if (argv.v || argv.version) {
  logger.info(`${packageInfo.name} version ${packageInfo.version}`);
  process.exit();
}

if (argv.createUser) {
  if (argv.user && argv.pass && argv.pin) {
    logger.info(`Creating the user ...`);
    const cscServer = new CSCServer();

    cscServer.registerUser(argv.user, argv.pass, function(err) {
      if (err) {
        logger.error(
          `An error occured when saving the user ${argv.user}. ${err}`
        );
        process.exit(1);
      }

      logger.info(`User ${argv.user} was successfully created!`);
      logger.info(`Generating credentials ...`);

      cscServer.generateCredentials(
        argv.user,
        argv.pin,
        (err, credentialID: string) => {
          if (err) {
            logger.error(err);
            process.exit();
          }

          logger.info(
            `Credentials successfully generated! His credentialID is ${credentialID}`
          );
          process.exit();
        }
      );
    });
  } else {
    logger.error(`Options --user, --pass and --pin need to be used together!`);
    process.exit(1);
  }
} else if (argv.createClient) {
  if (argv.name && argv.id && argv.secret && argv.redirectUri) {
    logger.info(`Creating the client ...`);
    const cscServer = new CSCServer();

    cscServer.registerClient(
      argv.name,
      argv.id,
      argv.secret,
      argv.redirectUri,
      function(err) {
        if (err) {
          logger.error(
            `An error occured when saving the client ${argv.name}. ${err}`
          );
          process.exit(1);
        }

        logger.info(`Client "${argv.name}" was successfully created!`);
        process.exit();
      }
    );
  } else {
    logger.error(
      `Options --name, --id, --secret and redirectUri need to be used together!`
    );
    process.exit(1);
  }
} else if (argv.l || argv.listen) {
  const options = {};
  const cscServer = new CSCServer();

  cscServer.listen(options, function(error, port: string, host: string) {
    if (error) {
      logger.error(`csc-server has stopped due to: ${error}`);
      process.exit(1);
    }

    const canonicalHost = host === '0.0.0.0' ? '127.0.0.1' : host,
      protocol = 'https://';

    let addresses = [];
    if (argv.a && host !== '0.0.0.0') {
      addresses.push('  ' + protocol + canonicalHost + ':' + port.toString());
    } else {
      Object.keys(ifaces).forEach(function(dev) {
        ifaces[dev].forEach(function(details) {
          if (details.family === 'IPv4') {
            addresses.push('  ' + protocol + details.address + ':' + port);
            addresses.push(
              '  ' + protocol + details.address + ':' + port.toString()
            );
          }
        });
      });
    }

    logger.info(
      [
        'Starting up csc - server, serving through https\nAvailable on: ',
        addresses.join('\n')
      ].join('\n')
    );
    logger.info('Hit CTRL-C to stop the server');
  });
} else {
  logger.error(`Nothing specified. Exiting!`);
  process.exit(1);
}
