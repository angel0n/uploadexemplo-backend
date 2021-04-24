const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');


module.exports ={
    dest: path.resolve(__dirname,'..','..','temp','uploads'),
    storage: multerS3({
        s3: new aws.S3(),
        bucket: 'mylist',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        key: (req,file,cb)=>{
            crypto.randomBytes(16,(err,hash)=>{
                if(err) cb(err);

                filename= `${hash.toString('hex')}-${file.originalname}`;

                cb(null,filename);
            });
        }
    }),
    limits:{
        fileSize: 2 * 1024 *1024
    },
    fileFilter: (req,file,cb)=>{
        const allowedMimes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
        ];

        if(allowedMimes.includes(file.mimetype)){
            cb(null,true);
        }else{
            cb(new Error("invalid file type."));
        }
    }
};