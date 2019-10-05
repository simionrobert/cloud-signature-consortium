'use strict';

const createError = require('./http-errors');
const errors = require('./errors.js');
const settings = require('./errors.js');
const info = require('./config.json');

Object.keys(errors).map(function (key) {
    errors[key] = createError(errors[key].status, errors[key].error, { description: errors[key].error_description });
});

module.exports = {
    settings: settings,
    info: info,
    errors: errors
}