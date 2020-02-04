'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');

const clientSchema = new mongoose.Schema({
    name: String,
    client_id: { type: String, unique: true },
    client_secret: String,
    redirect_uri: String
});


clientSchema.methods.verify = function (value) {
    return this.client_secret === crypto.createHash('sha256').update(value).digest('hex');
};

const Client = mongoose.model('clients', clientSchema);

module.exports = Client