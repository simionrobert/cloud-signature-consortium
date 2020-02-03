'use strict';

const mongoose = require('mongoose');

const sadSchema = new mongoose.Schema({
    value: { type: String, unique: true },
    hashes: [String],
    credential_id: String,
    creation_date: { type: Date, default: Date.now() }
});


const Sad = mongoose.model('sads', sadSchema);

module.exports = Sad;