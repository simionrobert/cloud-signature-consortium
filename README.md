# CSC Framework

[![Dependency Status](https://david-dm.org/simionrobert/CSC-Framework/status.svg?path=src/rssp)](https://david-dm.org/simionrobert/CSC-Framework?path=src/rssp)

A CSC RSSP, cloud signature consortium remote service signature provider, made in Node.js, using SoftHSMv2 as HSM. 

This is a work in progress. Do not use it yet!

## Getting started

### Prerequisites

What things you need to install the software and how to install them
```
- Mongodb from [mongodb.com](https://www.mongodb.com/download-center/community)
- SoftHSMv2 [softHSMv2](https://github.com/opendnssec/SoftHSMv2) Instalation part or you could just download the binaries
- OpenSSL see [openssl](https://github.com/openssl/openssl) INSTALLATION part or you could just download the binaries
```

### Installing

## Running the tests
You can get the commands for Postman for testing the API from the following links:
- https://www.getpostman.com/collections/db7edf68afea5e5dec67


## Deployment

0. npm install
1. Start MongoDB service. Create a database and a collection, then add an user as the schema says in src/rssp/db/User.js
2. Install/Download SoftHSMv2 and OpenSSL and copy them in the directories named as such.
3. Set environment variabile SOFTHSM2_CONF=D:\Scoala\Dizertatie\CSC Framework\bin\SoftHSMv2\lib\softhsm2.conf
4. For logging, load pkcs11-logger-x896.dll and set the environment variabiles to:
- PKCS11_LOGGER_LIBRARY_PATH = D:\Scoala\Dizertatie\CSC Framework\bin\SoftHSMv2\lib\softhsm2.dll
- PKCS11_LOGGER_LOG_FILE_PATH = D:\Scoala\Dizertatie\CSC Framework\bin\SoftHSMv2\lib\log.txt


## Debug
In Postman, set certificate SSL validation to false, under Settings.
In VS Settings, change to auto-debug.
Go see https://github.com/microsoft/vscode-recipes/tree/master/nodemon


## Resources
To generate a new certificate and private key for your service, call this command: 
```
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 
```
and copy the output into resources folder


## Authors

* **Simion Robert George** - [simionrobert](https://github.com/simionrobert)

See also the list of [contributors](https://github.com/simionrobert/CSC-Framework/contributors) who participated in this project.


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details