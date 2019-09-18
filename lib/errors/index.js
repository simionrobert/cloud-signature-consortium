'use strict';

var createError = require('http-errors');
var errors = require('./errors');


Object.keys(errors).map(function (key) {
    errors[key] = createError(errors[key].status, errors[key].error, { description: errors[key].error_description });
});

module.exports = errors;