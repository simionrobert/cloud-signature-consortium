# CSC - Cloud Signature Consortium

[![Build Status](https://travis-ci.org/simionrobert/cloud-signature-consortium.svg?branch=master)](https://travis-ci.org/simionrobert/cloud-signature-consortium.svg?branch=master) [![Dependency Status](https://david-dm.org/simionrobert/CSC-Framework/status.svg)](https://david-dm.org/simionrobert/CSC-Framework)

A CSC RSSP, cloud signature consortium remote signature service provider, made in Node.js, using SoftHSMv2 as HSM. 

This is a work in progress. Do not use it yet!

## Prerequistes
What things are needed to install the software and how to install them.

1. Install Mongodb from [mongodb.com](https://www.mongodb.com/download-center/community)
2. Install SoftHSMv2 pkcs11 token module.
- Use this projects's SoftHSMv2 binaries or install it from [SoftHSMv2](https://github.com/opendnssec/SoftHSMv2)
- Set environment variabile `SOFTHSM2_CONF=path\to\softhsm2.conf`
- In the file path\to\softhsm2.conf, set key `directories.tokendir=path\to\tokens` 
- Optionally, if you want, you could use `softhsm2-util.exe` to initialize a new softhsm2 token. Otherwise use the provided one.
```
softhsm2-util --init-token --slot 0 --label "mytoken"
```
3. Install OpenSC for interacting with SoftHSMv2 module.
- Download and install [OpenSC](https://github.com/OpenSC/OpenSC/releases), which is used for `pkcs11 tool` exe.
4. Download OpenSSL binaries or install it from [OpenSSL](https://github.com/openssl/openssl). 
To generate a new certificate and private key for your https/SSL/TLS service, call this command, and put them in the resources folder: 
```
openssl req -x509 -newkey rsa:4096 -keyout keySSL.pem -out certSSL.pem -days 365 
```

## Install
Installing globally via `npm`, with Admin rights (required for [node-gyp](https://github.com/nodejs/node-gyp) util):
```
npm install -g csc-server
```

Create your own user:
```
csc-server --user "user" --pass "pass"
```

Start CSC Server:
```
csc-server
```

Now you have a fully functional CSC server and you should be able to run the tests provided in [Running the tests](#running-the-tests)


## Example Usage
```
csc-server [options]

Options:
  --port, -p       Set port                                         [8080]
  --host, -H       Set host                                         [0.0.0.0]
  --db, -d         Database URL                                     [mongodb://localhost:27017/csc]
  --user           User to add once to the db. Used it with --pass  [string]
  --pass           Password of the user. Used it with --user        [string]
  --cert, -c       Path to ssl cert file                            [default: cert.pem]
  --key, -k        Path to ssl key file                             [default: key.pem]
  --passphrase     Path to ssl key file                             [default: 0000]
  --silent, -s     Suppress log messages from output                [boolean]
  --help, -h       Print this list and exit.                        [boolean]

Examples
    csc-server --user "username" --pass "password"
    csc-server
```


## Configuration 
You can also set default options in the `%userprofile%/AppData/Roaming/npm/node_modules/csc-server/config/config.json` configuration file.
```
{
    "database_url": "mongodb://localhost:27017/csc",
    "host": "0.0.0.0",
    "port": "8080",
    "hsm_library_path": "",
    "hsm_library_type": "",
    "certificate_path": "./resources/cert.pem",
    "private_key_path": "./resources/key.pem",
    "passphrase": "0000",
    "access_token_expiring_time": 60,
    "refresh_token_expiring_time": 3600
}
```

You can also set the `/csc/v1/info` results in the `%userprofile%/AppData/Roaming/npm/node_modules/csc-server/config/info.json` configuration file.
```
{
    "specs": "1.0.3.0",
    "name": "CSC Provider",
    "logo": "https://service.domain.org/images/logo.png",
    "region": "RO",
    "lang": "en-US",
    "description": "An efficient remote signature service",
    "authType": [
            "basic",
            "oauth2code"
    ],
    "oauth2": "https://www.domain.org/",
    "methods": [
            "auth/login",
            "auth/revoke",
            "credentials/list",
            "credentials/info",
            "credentials/authorize",
            "credentials/sendOTP",
            "signatures/signHash"
    ]
}
```


## Running the tests
You can get the commands for Postman for testing yourself the API from this [link](https://www.getpostman.com/collections/db7edf68afea5e5dec67).

In Postman, set `certificate SSL validation` to false, under Settings.

You will need to define the following Postman environment variabiles. The last two will be automatically updated after you post `auth/login`
```
url = https://localhost:3000/csc/v1
access_token = ""
refresh_token = ""
```

## Authors
* **Simion Robert George** - [simionrobert](https://github.com/simionrobert)

See also the list of [contributors](https://github.com/simionrobert/CSC-Framework/contributors) who participated in this project.

I really appreciate all kinds of feedback and contributions.

**Aditional notes:**
If you have some issues referring parts of code in the master branch add them in the issues section.


## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details