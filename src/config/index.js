'use strict';

const path = require('path');
const createError = require('http-errors');
const errors = require('./errors.json');
const config = require('./config.json');
const info = require('./info.json');

Object.keys(errors).map(function (key) {
    errors[key] = createError(errors[key].status, errors[key].error, { description: errors[key].error_description });
});

const resources_path = `${path.resolve(config.resources_path)}`;

module.exports = {
    settings: {
        ...config,
        resources_path: resources_path,
        softhsm2_driver_path: `${path.resolve(config.softhsm2_driver_path)}`,
        openSSL_path: `${path.resolve(config.openSSL_path)}`,
        https:{
            ...config.https,
            cert_SSL: `${resources_path}\\${config.https.cert_SSL}`,
            key_SSL:`${resources_path}\\${config.https.key_SSL}`
        }
    },
    info: info,
    errors: errors
}