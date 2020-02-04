'use strict';

const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    value: { type: String, unique: true },
    type: String, // access_token or refresh_token
    user_id: String,
    client_id: String,
    creation_date: { type: Date, default: Date.now() } // the date of creation of the token
});

const Token = mongoose.model('tokens', tokenSchema);

module.exports = Token;