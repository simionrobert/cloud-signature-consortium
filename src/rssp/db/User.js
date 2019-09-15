'use strict';

var mongoose = require('mongoose');
var crypto = require('crypto');

var userSchema = new mongoose.Schema({
    user: String,
    password: String,
    access_token: {
        value: String,
        timestamp: Date,
        valid:Boolean
    },
    refresh_token: {
        value: String,
        timestamp: Date,
        valid:Boolean
    }
});

userSchema.methods.verifyPassword = function (password) {
    return this.password === crypto.createHash('sha256').update(password).digest('hex');
};

var User = mongoose.model('users', userSchema);

module.exports = User