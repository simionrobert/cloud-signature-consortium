'use strict';

var mongoose = require('mongoose');
var crypto = require('crypto');

var userSchema = new mongoose.Schema({
    user: String,
    password: String,
    access_token: {
        value: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now() },
        valid: { type: Boolean, default: false }
    },
    refresh_token: {
        value: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now() },
        valid: { type: Boolean, default: false }
    }
});

userSchema.methods.verifyPassword = function (password) {
    return this.password === crypto.createHash('sha256').update(password).digest('hex');
};

var User = mongoose.model('users', userSchema);

module.exports = User