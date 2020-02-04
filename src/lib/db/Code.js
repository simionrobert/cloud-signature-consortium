'use strict';

const mongoose = require('mongoose');

const codeSchema = new mongoose.Schema({
    value: { type: String, unique: true },

    // oauth2/authorize
    scope: String,
    user_id: String,
    client_id: String,
    redirect_uri: String,

    // for credentials/authorize 
    credential_id: String,
    hashes: [String],
    num_signatures: Number,

    creation_date: { type: Date, default: Date.now() }
});

const Code = mongoose.model('codes', codeSchema);

module.exports = Code;