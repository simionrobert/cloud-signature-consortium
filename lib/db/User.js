'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    // _id: is the userID
    user: { type: String, unique: true },
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
    },
    credentials: [{
        credentialID: String,
        pin: String,
        sad: String,
        key: String,
        timestamp: { type: Date, default: Date.now() }
    }]
});


userSchema.methods.verifyPassword = function (password) {
    return this.password === crypto.createHash('sha256').update(password).digest('hex');
};

const User = mongoose.model('users', userSchema);

module.exports = User