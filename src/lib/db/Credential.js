'use strict';

const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema({
    credentialID: { type: String, unique: true },
    description: String,
    key: {
        status: String,
        algo: [String],
        len: Number,
        curve: String
    },
    cert: {
        status: String,
        certificates: [String],
        issuerDN: String,
        serialNumber: String,
        subjectDN: String,
        validFrom: Date,
        validTo: Date
    },
    authMode: String,
    SCAL: String,
    PIN: {
        presence: Boolean,
        format: String,
        label: String,
        description: String
    },
    OTP: {
        presence: Boolean,
        types: String,
        format: String,
        label: String,
        description: String,
        ID: String,
        provider: String
    },
    multisign: Number,
    lang: String
});

const Credential = mongoose.model('credentials', credentialSchema);

module.exports = Credential;