'use strict';

const mongoose = require('mongoose');

const codeSchema = new mongoose.Schema({
    value: { type: String, unique: true },
    user_id: String,
    scope: String,
    client_id: String,
    redirect_uri: String,
    creation_date: { type: Date, default: Date.now() }
});


const Code = mongoose.model('codes', codeSchema);

module.exports = Code;