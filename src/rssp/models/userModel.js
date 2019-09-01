var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    user: String,
    passsword: String
});

var Users = mongoose.model('Users', userSchema);

module.exports = {}
