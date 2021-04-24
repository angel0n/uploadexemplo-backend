const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    nome: String,
    email: String,
    senha: String,
    createdAt:{
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("user", UserSchema)