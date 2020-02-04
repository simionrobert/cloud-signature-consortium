'use strict';

const createError = require('http-errors');
const errors = require('./errors.json');
const config = require('./config.json');
const info = require('./info.json');

Object.keys(errors).map(function (key) {
    errors[key] = createError(errors[key].status, errors[key].error, { description: errors[key].error_description });
});

module.exports = {
    settings: config,
    info: info,
    errors: errors
}