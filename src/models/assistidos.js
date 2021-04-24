const mongoose = require('mongoose');

const AssistidosSchema = new mongoose.Schema({
    id_user: String,
    id_anime:String,
    createdAt:{
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("assistidos",AssistidosSchema);