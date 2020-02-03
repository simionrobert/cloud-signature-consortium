# CSC - Cloud Signature Consortium

[![Build Status](https://travis-ci.org/simionrobert/cloud-signature-consortium.svg?branch=master)](https://travis-ci.org/simionrobert/cloud-signature-consortium.svg?branch=master) [![Dependency Status](https://david-dm.org/simionrobert/CSC-Framework/status.svg)](https://david-dm.org/simionrobert/CSC-Framework)

A CSC RSSP, cloud signature consortium remote signature service provider, made in Node.js, using SoftHSMv2 as HSM.

This is a work in progress. Do not use it yet!

## Prerequistes

What things are needed to install the software and how to install them.

1. Install Mongodb from [mongodb.com](https://www.mongodb.com/download-center/community)
2. Install OpenSC for interacting with the SoftHSMv2 module.

- Download and install [OpenSC](https://github.com/OpenSC/OpenSC/releases), which is used for `pkcs11-tool` exe.

3. Install SoftHSMv2 pkcs11 token module.

- Use this projects's binaries or install it from [SoftHSMv2](https://github.com/opendnssec/SoftHSMv2)
- Set environment variabile `SOFTHSM2_CONF=path\to\softhsm2.conf`
- In the file path\to\softhsm2.conf, set key `directories.tokendir=path\to\tokens`
- Use `softhsm2-util.exe` to initialize a new softhsm2 token. You you don't want this, just use the provided one in the binaries.

```
softhsm2-util --init-token --slot 0 --label "mytoken"
```

4. Download OpenSSL binaries or install it from [OpenSSL](https://github.com/openssl/openssl).
   To generate a new certificate and private key for your https/SSL/TLS service, call this command, and put them in the resources folder:

```
openssl req -x509 -newkey rsa:4096 -keyout keySSL.pem -out certSSL.pem -days 365
```

In the [release version](https://github.com/simionrobert/cloud-signature-consortium/releases) you will find the following binaries:

- OpenSSL 1.1.1.d x86 (used by the app)
- SoftHSMv2 (used by the app)
- PKCS11Admin - 0.5.0 (GUI used to see the token objects)

Don't forget to configure the location of these in the config/config.json ("softhsm2_driver_path, "openSSL_path", "openSC_path")
If you don't want to do this, by default, the config file is set to search in /utils (/ = root) folder.

## Install

Installing globally via `npm`:

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
"https": {
        "host": "0.0.0.0",
        "port": "8080",
        "cert_SSL": "certSSL.pem",
        "key_SSL": "keySSL.pem",
        "SSL_key_passphrase": "0000"
    },
    "resources_path": "./resources",
    "softhsm2_driver_path": "utils/SoftHSMv2/lib/softhsm2.dll",
    "openSSL_path": "utils/openssl-1.1.1-x86/openssl.exe",
    "openSC_path":"C:/Program Files (x86)/OpenSC Project/OpenSC/tools/pkcs11-tool.exe",
    "token": {
        "slot": "189467408",
        "pin": "0000"
    },
    "database_url": "mongodb://localhost:27017/csc",
    "csc": {
        "access_token_expiring_time": 3600,
        "refresh_token_expiring_time": 7200,
        "sad_expiring_time": 1800,
        "otp_expiring_time":1800,
        "max_results": 10
    }
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

You can run the commands for testing using Postman.

In Postman, set `certificate SSL validation` to false, under Settings.

You will need to define the following Postman environment variabiles. The last two will be automatically updated after you post `auth/login`

Useful website for base64 and base64 url safe encoding: http://www.base64url.com/

```
url = https://localhost:3000/csc/v1
access_token = ""
refresh_token = ""
```

## Authors

- **Simion Robert George** - [simionrobert](https://github.com/simionrobert)

See also the list of [contributors](https://github.com/simionrobert/CSC-Framework/contributors) who participated in this project.

I really appreciate all kinds of feedback and contributions.

**Aditional notes:**
If you have some issues referring parts of code in the master branch add them in the issues section.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
