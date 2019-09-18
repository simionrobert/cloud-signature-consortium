# CSC - Cloud Signature Consortium

[![Build Status](https://travis-ci.org/simionrobert/cloud-signature-consortium.svg?branch=master)](https://travis-ci.org/simionrobert/cloud-signature-consortium.svg?branch=master) [![Dependency Status](https://david-dm.org/simionrobert/CSC-Framework/status.svg)](https://david-dm.org/simionrobert/CSC-Framework)

A CSC RSSP, cloud signature consortium remote signature service provider, made in Node.js, using SoftHSMv2 as HSM. 

This is a work in progress. Do not use it yet!

## Getting started

### Prerequisites

What things you need to install the software and how to install them:
```
1. Install Mongodb from [mongodb.com](https://www.mongodb.com/download-center/community)
2. Download SoftHSMv2 binaries or install it [softHSMv2](https://github.com/opendnssec/SoftHSMv2)
3. Set environment variabile SOFTHSM2_CONF=D:\Scoala\Dizertatie\CSC Framework\bin\SoftHSMv2\lib\softhsm2.conf
4. Download OpenSSL binaries or install it[openssl](https://github.com/openssl/openssl)
5. To generate a new certificate and private key for your service, call this command: 
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 

```

### Installing

#### CLI

```
npm install -g csc-server
```

#### API Module

```
npm install --save csc-server 
```

### Configuration
By default, on startup, the server loads the config.json and info.json from this repository.
You can load an entire config.json/info.json file or you could individually set option configutations when using the cli or the api.

#### CLI Usage
```
csc-server --config "config.json"
csc-server --info "info.json"
csc-server --db "mongodb://localhost:27017/cs"
csc-server --user "user" --pass "pass"
```

#### API Module Usage
```
var csc = require('csc-server');
csc.loadConfig('./config/config.json');
csc.loadInfo('./config/info.json');
csc.setDbUrl('mongodb://localhost:27017/cs');
csc.registerUser("user","password"); //only when you want to add an user
```


## Running the tests
You can get the commands for Postman for testing the API from the following links:
- https://www.getpostman.com/collections/db7edf68afea5e5dec67
In Postman, set certificate SSL validation to false, under Settings.

## Debug
In VS Settings, change to auto-debug.
Go see https://github.com/microsoft/vscode-recipes/tree/master/nodemon


## Future development
- Add script pre-compiler to download SoftHSMv2 binaries
- Besides mongodb, add an in-memory database


## Authors

* **Simion Robert George** - [simionrobert](https://github.com/simionrobert)

See also the list of [contributors](https://github.com/simionrobert/CSC-Framework/contributors) who participated in this project.


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details