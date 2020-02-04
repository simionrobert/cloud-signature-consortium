'use strict';

const createError = require('http-errors');
const errors = require('./errors.json.js.js');
const config = require('./config.json.js.js');
const info = require('./info.json.js.js');

Object.keys(errors).map(function (key) {
    errors[key] = createError(errors[key].status, errors[key].error, { description: errors[key].error_description });
});

module.exports = {
    settings: config,
    info: info,
    errors: errors
}