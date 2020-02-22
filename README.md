# CSC - Cloud Signature Consortium

![Build Status](https://github.com/simionrobert/cloud-signature-consortium/workflows/Node.js%20CI/badge.svg) [![Dependency Status](https://david-dm.org/simionrobert/CSC-Framework/status.svg)](https://david-dm.org/simionrobert/CSC-Framework)

A CSC RSSP -Cloud Signature Consortium Remote Signature Service Provider-, written in Node.js using SoftHSMv2 as HSM.
This application follows the [CSC API V1.0.4.0](https://cloudsignatureconsortium.org/resources/download-api-specifications/) specification. It also includes an OAuth 2.0 server for your particular needs.

This solution is recommended for **simple** and **advanced electronic signature (AdES)**.

Installing globally via `npm`:

```
npm install -g csc-server
```

## Prerequistes

1. Install Mongodb from [mongodb.com](https://www.mongodb.com/download-center/community)
2. Install [OpenSC](https://github.com/OpenSC/OpenSC/releases) that is needed for interacting with the SoftHSMv2 dll module. We will use `pkcs11-tool` exe.

3. Install [SoftHSMv2](https://github.com/opendnssec/SoftHSMv2) or just copy it from the project's [release binaries](https://github.com/simionrobert/cloud-signature-consortium/releases) to the resources folder.

- Set environment variabile `SOFTHSM2_CONF=%path_to_softhsm2\lib\softhsm2.conf%`
- In the file path\to\softhsm2.conf, set `directories.tokendir=%path_to_softhsm2\tokens_folder%`
- Initialize a new softhsm2 token with `%path_to_softhsm2\bin\softhsm2-util.exe%`

```
softhsm2-util --init-token --slot 0 --label "mytoken"
```

4. Install [OpenSSL](https://github.com/openssl/openssl) or just copy it from the project's [release binaries](https://github.com/simionrobert/cloud-signature-consortium/releases) to the resources folder.

- Generate a new certificate and private key for your https/SSL/TLS service and put them in the resources folder of the application (the one provided in config.json. See point 5):

```
openssl req -x509 -newkey rsa:4096 -keyout keySSL.pem -out certSSL.pem -days 365
```

In the [release version](https://github.com/simionrobert/cloud-signature-consortium/releases) you will find the following binaries:

- OpenSSL 1.1.1.d x86 (used by the app)
- SoftHSMv2 (used by the app)
- PKCS11Admin - 0.5.0 (Optional GUI to help you see the token objects)

5. Configure the service settings. See [Configuration](#configuration).

After you successfully installed and configured all the prerequistes, you can proceed to [Usage](#usage).

## Usage

Create your own user:

```
csc-server --createUser --user="username" --pass="password" --pin="pin"

```

If you plan to use OAuth 2.0, create your own client:

```
csc-server --createClient --name=name --id=id --secret=secret --redirectUri=redirectUri
```

Start CSC Server:

```
csc-server -l
```

Now you have a fully functional CSC server.

## Example Usage

```
Usage:
   csc-server [options]

Options:
  --createUser    Create a user using the arguments below.
       --user           Username of the user.
       --pass           Password of the user.
       --pin            PIN associated with the generated private key.

  --createClient  Create an OAuth 2.0 client using the arguments below.
       --name          Name of the client application.
       --id            Client id.',
       --secret        Client_secret.
       --redirectUri   Redirect_uri.

  --listen, -l     Start the server
       --silent, -s     Suppress log messages from output.

  --version, -v    Print the version and exit.
  --help, -h       Print this list and exit.
Examples
   csc-server -l
   csc-server --createUser --user=username --pass=password --pin=pin
   csc-server --createClient --name=name --id=id --secret=secret --redirectUri=redirectUri
```

## Configuration

The configuration file is located at `%userprofile%/AppData/Roaming/npm/node_modules/csc-server/config/config.json`.
Feel free to customize and provide the correct paths of the software you installed in the [Prerequistes](#prerequistes).

```
{
    "csc": {
        "access_token_expiring_time": 3600,
        "refresh_token_expiring_time": 7200,
        "sad_expiring_time": 1800,
        "code_expiring_time": 600,
        "otp_expiring_time": 1800,
        "max_results": 10
    },
    "https": {
        "host": "0.0.0.0",
        "port": "8080",
        "certificate": "D:/Scoala/Dizertatie/CSC Framework/resources/certSSL.pem",
        "private_key": "D:/Scoala/Dizertatie/CSC Framework/resources/keySSL.pem",
        "private_key_password": "0000"
    },
    "database_url": "mongodb://localhost:27017/csc",
    "resources_path": "D:/Scoala/Dizertatie/CSC Framework/resources",
    "softhsm2_driver_path": "D:/Scoala/Dizertatie/CSC Framework/utils/SoftHSMv2/lib/softhsm2.dll",
    "openSSL_path": "D:/Scoala/Dizertatie/CSC Framework/utils/openssl-1.1.1-x86/openssl.exe",
    "openSC_path": "C:/Program Files (x86)/OpenSC Project/OpenSC/tools/pkcs11-tool.exe",
    "token": {
        "slot": "189467408",
        "pin": "0000"
    }
}
```

You can also configure the endpoint `/csc/v1/info` results in the `%userprofile%/AppData/Roaming/npm/node_modules/csc-server/config/info.json` configuration file.

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
            "signatures/signHash",
            "oauth2/authorize",
            "oauth2/token"
    ]
}
```
## Supported PKCS#1 Signing Types

Currently, only CKM_RSA_PKCS is supported with SHA1, SHA256, SHA512.
Only no-padded base64 hashes needs to be provided at the service endpoints.


## Testing

A Postman request collection is provided in [docs](https://github.com/simionrobert/cloud-signature-consortium/tree/master/docs) folder. There is also a json collection containing the environment variabiles used in the requests based on the server responses through Tests. They can be imported in Postman using File > Import.

Keep in mind that you must open a browser an enter the links provided in the collection for the **oauth2/authorize service** and **oauth2/authorize credentials** to actually test them (We simulate an application client throught our browser). After login and user acceptance, the application client's redirect_uri will be called with an **authorization code** provided in the link as a query parameter. You should copy that code and paste it in the Postman request body of **/oauth2/token**.

Also you should set **SSL certificate verification** to **off** from File > Settings > General, because the service's certificate is not trusted by our computer.

Feel free to test the application.

## Authors

- **Simion Robert George** - [simionrobert](https://github.com/simionrobert)

See also the list of [contributors](https://github.com/simionrobert/CSC-Framework/contributors) who participated in this project.

I really appreciate all kinds of feedback and contributions.

**Aditional notes:**
If you have some issues referring parts of code in the master branch add them in the issues section.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
