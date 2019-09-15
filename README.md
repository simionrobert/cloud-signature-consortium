## CSC Framework

Work in progress

## Prerequisites
- Mongodb
- Postman
- Openssl
- SoftHSMv2

## Initial Setup
0. npm install
1. Start MongoDB service. Create a database and a collection, then add an (user, password_hash) pair
3. Install/Download SoftHSMv2 and OpenSSL and copy them in the directories named as such.
4. Set environment variabile SOFTHSM2_CONF=D:\Scoala\Dizertatie\CSC Framework\bin\SoftHSMv2\lib\softhsm2.conf
5. For logging, load pkcs11-logger-x896.dll and set the environment variabiles to:
- PKCS11_LOGGER_LIBRARY_PATH = D:\Scoala\Dizertatie\CSC Framework\bin\SoftHSMv2\lib\softhsm2.dll
- PKCS11_LOGGER_LOG_FILE_PATH = D:\Scoala\Dizertatie\CSC Framework\bin\SoftHSMv2\lib\log.txt
6. To enable HTTPS, call this command: openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365
and copy the output into resources folder
7. In Postman, set certificate SSL validation to false, under Settings.
8. In VS Settings, change to auto-debug.

## Debug
Go see https://github.com/microsoft/vscode-recipes/tree/master/nodemon

## Postman commands
You can get the commands for Postman for testing the API from the following links:
- https://www.getpostman.com/collections/db7edf68afea5e5dec67