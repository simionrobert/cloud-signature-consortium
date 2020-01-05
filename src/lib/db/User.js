'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    // _id: is the userID
    user: { type: String, unique: true }, // the username
    password: String, // the password of the user
    access_token: {
        value: { type: String, default: "" }, // the value of the on-demand generated token
        timestamp: { type: Date, default: Date.now() }, // the date of creation of the token
        valid: { type: Boolean, default: false } // if the token is valid or not
    },
    refresh_token: {
        value: { type: String, default: "" },// the value of the on-demand generated token
        timestamp: { type: Date, default: Date.now() },// the date of creation of the token
        valid: { type: Boolean, default: false }// if the token is valid or not
    },
    credentials: [{ // the list of credentials that belong to the user
        credentialID: String, // the id of the credential stored on the token (cert+key) and in the db
        pin: String, // the pin of the private key (kept secret)
        sad:{
            value: String, // the on-demand generated sad for signing
            key: String, // the random key used to calculate sad
            timestamp: { type: Date, default: Date.now() } // the date of creation of the sad
        },
        otp:{
            value: String, // the on-demand generated otp for signing
            timestamp: { type: Date, default: Date.now() } // the date of creation of the otp
        }
    }]
});


userSchema.methods.verifyPassword = function (password) {
    return this.password === crypto.createHash('sha256').update(password).digest('hex');
};

const User = mongoose.model('users', userSchema);

module.exports = User