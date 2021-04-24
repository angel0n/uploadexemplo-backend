const mongoose = require("mongoose");
const aws = require("aws-sdk");

const s3 = new aws.S3();

const AnimesSchema = new mongoose.Schema({
    nome: String,
    genero: String,
    num_ep: Number,
    imagem: String,
    key: String,
    status:String,
    trailer:String,
    createdAt:{
        type: Date,
        default: Date.now
    }
});

AnimesSchema.pre('remove', function(){
    return s3.deleteObject({
        Bucket: 'mylist',
        Key: this.key
    }).promise();
    
});

module.exports = mongoose.model("Animes",AnimesSchema);