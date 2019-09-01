## CSC Framework

Work in progress

## Prerequisites
- Mongodb
- Postman
- Openssl
- SoftHSMv2

## Initial Setup
0. Start MongoDB service
1. Set environment variabile SOFTHSM2_CONF=D:\Scoala\Dizertatie\CSC Framework\bin\SoftHSMv2\lib\softhsm2.conf
2. For logging, load pkcs11-logger-x896.dll and set the environment variabiles to:
- PKCS11_LOGGER_LIBRARY_PATH = D:\Scoala\Dizertatie\CSC Framework\bin\SoftHSMv2\lib\softhsm2.dll
- PKCS11_LOGGER_LOG_FILE_PATH = D:\Scoala\Dizertatie\CSC Framework\bin\SoftHSMv2\lib\log.txt
3. To enable HTTPS, call this command: openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365
and copy the output into resources folder
4. In Postman, set certificate SSL validation to false, under Settings.
5. Install MongoDB
## Debug
Go see https://github.com/microsoft/vscode-recipes/tree/master/nodemon