'use strict';

var errors = require('./errors');
var createError = require('http-errors');

Object.keys(errors).map(function (key, index) {
    errors[key] = createError(errors[key].status, errors[key].error, { description: errors[key].error_description });
});

module.exports = errors;