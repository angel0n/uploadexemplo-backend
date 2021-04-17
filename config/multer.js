const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');

const storageType = {
    local: multer.diskStorage({
        destination: (req,file,cb)=>{
            cb(null, path.resolve(__dirname,'..','..','temp','uploads'));
        },
        filename:(req,file,cb)=>{
            crypto.randomBytes(16,(err,hash)=>{
                if(err) cb(err);

                file.key= `${hash.toString('hex')}-${file.originalname}`;

                cb(null,file.key);
            });
        },
    }),
    s3: multerS3({
        s3: new aws.S3(),
        bucket: 'uploadexemplo2',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        key: (req,file,cb)=>{
            crypto.randomBytes(16,(err,hash)=>{
                if(err) cb(err);

                filename= `${hash.toString('hex')}-${file.originalname}`;

                cb(null,filename);
            });
        }
    })
}

module.exports ={
    dest: path.resolve(__dirname,'..','..','temp','uploads'),
    storage: storageType[process.env.STORAGE_TYPE],
    limits:{
        fileSize: 2 * 1024 *1024
    },
    fileFilter: (req,file,cb)=>{
        const allowedMimes = [
            "image/jpeg",
            "image/pjpeg",
            "image/png",
            "image/gif"
        ];

        if(allowedMimes.includes(file.mimetype)){
            cb(null,true);
        }else{
            cb(new Error("invalid file type."));
        }
    }
};