'use strict';

const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name: String,
    client_id: { type: String, unique: true },
    client_secret: String,
    redirect_uri: String,
    is_trusted: Boolean
});

const Client = mongoose.model('clients', clientSchema);

module.exports = Client