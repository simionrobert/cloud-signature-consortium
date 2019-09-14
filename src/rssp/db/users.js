'use strict';

var mongoose = require('mongoose');
var crypto = require('crypto');

var userSchema = new mongoose.Schema({
    user: String,
    password: String
});

userSchema.methods.verifyPassword = function (password) {
    return this.password === crypto.createHash('sha256').update(password).digest('hex');
};

var Users = mongoose.model('users', userSchema);

module.exports = Users
