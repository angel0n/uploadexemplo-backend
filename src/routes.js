const routes = require('express').Router();
const multer = require('multer');
const multerConfig = require('./config/multer');
const md5 = require('md5');
const jwt = require('jsonwebtoken');

const Animes = require('./models/animes');
const Adm = require('./models/adm');
const User = require('./models/user');
const Assistir = require('./models/assistir');
const Assistidos = require('./models/assistidos');

function validardados(data){
    if(data.nome && data.genero && data.num_ep && data.status && data.trailer){
        const nome =   data.nome.toString();
        const genero = data.genero.toString();
        const num_ep = parseInt(data.num_ep);
        const status = data.status.toString();
        const trailer = data.trailer.toString();
        if(nome.length >= 1 && nome.length <= 98){
            if(genero.length >= 1 && genero.length <= 98){
                if(num_ep >= 1){
                    if(status == "completo" || status == "lançando" || status == "pausado"){
                        if(trailer.length >= 3 && trailer.length <=15){
                            return {status: "sucesso"}
                        }else{
                            return {status:"erro", erro:"trailer precisa ter entre 3 e 15 caracteres"}
                        }
                    }else{
                        return {status:"erro", erro:"status invalido! Aceito completo, lançando ou pausado"}
                    }
                }else{
                    return {status:"erro", erro:"quantidade de epsodios precisa ser maior que 1"}
                }
            }else{
                return {status:"erro", erro:"genero precisar ter de 1 a 98 caracteres"}
            }
        }else{
            return {status:"erro", erro:"nome precisar ter de 1 a 98 caracteres"}
        }
    }else{
        return {status:"erro", erro:"1 ou mais parametros não informados"}
    }
}

function validartoken(data){
    if(data.type === "adm"){
        const valido = jwt.verify(data.token, process.env.JWT_SECRET_ADM,function(err,decoded){
            if(decoded){
                return {status: "sucesso"}
            }else{
                return {status: "erro", erro: "token invalido"}
            }
        });
        return valido;
    }else{
        const valido = jwt.verify(data.token, process.env.JWT_SECRET_USER,function(err,decoded){
            if(decoded){
                return {status: "sucesso"}
            }else{
                return {status: "erro", erro: "token invalido"}
            }
        });
        return valido;
    }
    
}

//rotas para animes

//pesquisar animes
routes.get("/animes/pesquisar/:search/:pagina/:limite", async (req,res)=>{ 
    const limite = req.params.limite;
    const pagina = req.params.pagina;
    if(req.params.pagina == 1){
        const limit = parseInt(limite);
        const skip = 0;
        const search = req.params.search;
        const animesCount = await Animes.find({nome: {'$regex': search, '$options': 'i'} }).countDocuments();
        const pageTotal = Math.ceil(animesCount/limit);
        if(animesCount >=1){
            const animes = await Animes.find({nome: {'$regex': search, '$options': 'i'} }).limit(limit).skip(skip).sort({nome:1});
            return res.json({
                pageTotal,
                animes
            });
        }else{
            return res.json({status: "erro", erro: "nenhum anime encontrado"});
        }
        
    }else{
        const limit = parseInt(limite);
        const search = req.params.search;
        const animesCount = await Animes.find({nome: {'$regex': search, '$options': 'i'} }).countDocuments();
        const pageTotal = Math.ceil(animesCount/limit);
        if(pagina > pageTotal){
            return res.json({status:"erro",erro:"pagina não existe"});
        }else{
            const page = parseInt(pagina);
            const limit = parseInt(limite);
            const skip = limit * (page - 1);
            if(animesCount >=1){
                const animes = await Animes.find({nome: {'$regex': search, '$options': 'i'} }).limit(limit).skip(skip).sort({nome:1})
                return res.json({
                    pageTotal,
                    animes
                });
            }else{
                return res.json({status: "erro", erro: "nenhum anime encontrado"});
            }
        }
    }  
});

//listar todos os animes com paginação
routes.get("/animes/listar/:pagina/:limite", async (req,res)=>{
    const limite = req.params.limite;
    const pagina = req.params.pagina;
    if(req.params.pagina <= 1){
        const limit = parseInt(limite);
        if(limit >=1){
            const skip = 0;
            const animesCount = await Animes.find().countDocuments();
            const pageTotal = Math.ceil(animesCount/limit);
            if(animesCount >=1){
                const animes = await Animes.find().limit(limit).skip(skip).sort({nome:1});
                return res.json({
                    pageTotal,
                    animes
                });
            }else{
                return res.json({status: "erro", erro: "nenhum anime encontrado"});
            }
        }else{
            return res.json({status: "erro", erro: "limite invalido "});
        }
        
    }else{
        const page = parseInt(pagina);
        const limit = parseInt(limite);
        const animesCount = await Animes.find().countDocuments();
        const pageTotal = Math.ceil(animesCount/limit);
        if(page > pageTotal){
            return res.json({status:"erro",erro:"pagina não existe"});
        }else{
            if(limit >= 1 && page >= 2){
                const skip = limit * (page - 1);
                
                if(animesCount >=1){
                    const animes = await Animes.find().limit(limit).skip(skip).sort({nome:1});
                    return res.json({
                        pageTotal,
                        animes
                    });
                }else{
                    return res.json({status: "erro", erro: "nenhum anime encontrado"});
                }
            }else{
                return res.json({status: "erro", erro: "limite ou pagina invalida "});
            }
        }  
    }    
});

//lista todos os animes
routes.get("/animes/listar/", async (req,res)=>{
    const animesCount = await Animes.find().countDocuments();
    if(animesCount <=0){
        return res.json({status: "erro", erro: "nenhum anime encontrado"});
    }else{
        const animes = await Animes.find().sort({nome:1});
        return res.json(animes);
    }
    
});

//pesquisa anime pelo id
routes.get("/animes/listar/:id", async(req,res)=>{
    const animeCount = await Animes.findById(req.params.id).countDocuments();
    if(animeCount <= 0){
        return res.json({status: "erro", erro: "nenhum anime encontrado"});
    }else{
        const anime = await Animes.findById(req.params.id);
        return res.json(anime);
    }
    
})

//cadastrar animes
routes.post("/animes/cadastrar",multer(multerConfig).single('file'),async (req,res)=>{
    /**
     * req.file é a imagem
     * req.body parametros passados
     */    
    if(req.file){
        if(req.body.token){
            const validacao = validardados(req.body);
            if(validacao.status == "sucesso"){
                const { location: imagem = "", key } = req.file;
                const { nome: nome_original, genero, num_ep, status, trailer, token } = req.body;
                const validado = validartoken({token, type:"adm"});
                if(validado.status === "sucesso"){
                    const nome = nome_original.toUpperCase();
                    const animeCount = await Animes.find({nome: `${nome}` }).countDocuments();
                    if(animeCount >= 1 ){
                        return res.json({status: "erro", erro: "Anime já cadastrado"})
                    }else{
                        const post = await Animes.create({
                            nome,
                            genero,
                            num_ep,
                            imagem,
                            key,
                            status,
                            trailer
                        });
                        return res.json({status: "sucesso"});
                    }            
                }else{
                    return res.json(validado);
                }
            }else{
                return res.json(validacao);
            }
        }else{
            return res.json({status:"erro", erro: "token não enviado"})
        }
    }else{
        return res.json({status:"erro", erro: "imagem não enviada"});
    }
});

//deleta um anime
routes.delete("/animes/deletar/:id", async(req,res)=>{
    if(req.body.token){
        const token = req.body.token;
        const validado = validartoken({token,type:"adm"});
        if(validado.status === "sucesso"){
            const animeCount = await Animes.findById(req.params.id).countDocuments();
            if(animeCount <= 0){
                return res.json({status: "erro", erro: "nenhum anime encontrado"})
            }else{
                const anime = await Animes.findById(req.params.id);
                anime.remove();
                return res.json({status: "sucesso"});
            }
        }else{
            return res.json(validado);
        }
    }else{
        return res.json({status:"erro", erro:"token não informado"});
    }
});

//editar animes
routes.put("/animes/editar/:id", async (req,res)=>{
    const validacao = validardados(req.body);
    if(validacao.status === "sucesso"){
        if(req.body.token){
            const token = req.body.token;
            const validado = validartoken({token,type:"adm"});
            if(validado.status === "sucesso"){
                const animeCount = await Animes.findById(req.params.id).countDocuments();
                if(animeCount >= 0){
                    const anime = await Animes.findById(req.params.id);
                    const imagem = anime.imagem;
                    const key = anime.key;
                    const update = await Animes.updateOne({"_id": `${req.params.id}`},{$set:{
                        "nome": `${req.body.nome}`,
                        "genero":`${req.body.genero}`,
                        "num_ep": `${req.body.num_ep}`,
                        "status": `${req.body.status}`,
                        "trailer":`${req.body.trailer}`,
                        "imagem": `${imagem}`,
                        "key": `${key}`
                    }});
                    if(update.nModified >=1){
                        return res.json({status: "sucesso"});
                    }else{
                        return res.json({status: "erro", erro: "não foi alterado os daoos"});
                    }
                }else{
                    return res.json({status: "erro", erro: "Anime não encontrado"});
                }
            }else{
                return res.json(validado)
            }
        }else{
            return res.json({status: "erro",erro: "token não informado"});
        }
    }else{
        return res.json(validacao);
    }

})

//rotas para adm

//cadastrar adm
routes.post("/adm/cadastrar", async (req,res)=>{
    if(req.body.nome && req.body.email && req.body.senha && req.body.token && req.body.confirmesenha){
        const { email: emailOriginal, nome, senha: senhaOriginal, confirmesenha, token } = req.body;
        const validar = validartoken({token,type: "adm"});
        if(validar.status === "sucesso"){
            if(nome.length > 3 ){
                var re = /\S+@\S+\.\S+/;
                if(re.test(emailOriginal)){
                    const tamanho_senha = senhaOriginal.length
                    if(tamanho_senha >=6 && tamanho_senha <= 20){
                        if(senhaOriginal === confirmesenha){
                            const email = emailOriginal.toUpperCase();
                            const admCount = await Adm.find({email:`${email}`}).countDocuments();
                            if(admCount >=1){
                                return res.json({status: "erro",erro:"e-mail já cadastrado"});
                            }else{
                                const senha = md5(senhaOriginal);
                                await Adm.create({
                                    nome,
                                    email,
                                    senha
                                });
                                return res.json({status: "sucesso"});
                            }
                        }else{
                            return res.json({status: "erro",erro:"As senhas não são iguais"})
                        }
                        
                    }else{
                        return res.json({status: "erro",erro:"senha precisa ter entre 6 e 20 caracteres"});
                    }
                }else{
                    return res.json({status: "erro",erro:"E-mail invalido"});
                }
            }else{
                return res.json({status: "erro",erro:"Nome precisa ter mais de 3 letras"});
            }
        }else{
            return res.json(validar);
        }
            

    }else{
        return res.json({status: "erro",erro:"parametros não enviados"});
    }  
});

//login de adm
routes.post("/adm/login", async(req,res)=>{
    if(req.body.email && req.body.senha){
        const { email: emailOriginal, senha: senhaOriginal } = req.body;
        var re = /\S+@\S+\.\S+/;
        if(re.test(emailOriginal)){
            const tamanho_senha = senhaOriginal.length
                if(tamanho_senha >=6 && tamanho_senha <= 20){
                    const senha = md5(senhaOriginal);
                    const email  = emailOriginal.toUpperCase();
                    const admCount = await Adm.find({email: `${email}`,senha: `${senha}`}).countDocuments();
                    if(admCount >= 1){
                        const email  = emailOriginal.toUpperCase();
                        const adm = await Adm.find({email: `${email}`,senha: `${senha}`});
                        const id = adm[0]._id; 
                        const nome = adm[0].nome; 
                        const tokenJWT = jwt.sign(
                            { id, nome, email }, 
                            process.env.JWt_SECRET_ADM,
                            {  expiresIn: 10800 });
                        return res.json({
                            status: "sucesso",
                            id:`${id}`,
                            nome:`${nome}`,
                            email: `${email}`,
                            token: tokenJWT
                        });
                    }else{
                        return res.json({status: "erro", erro: "Adm não envontrado"})
                    }

                }else{
                    return res.json({status: "erro", erro: "A senha precisa ter entre 6 e 20 caracteres"});
                }
        }else{
            return res.json({status: "erro", erro: "e-mail invalido"});
        }
    }else{
        return res.json({status: "erro", erro: "Paramentros não passados"});
    }
});

//editar adm
routes.put("/adm/editar/:id",async(req,res)=>{
    if(req.body.nome && req.body.email && req.body.token && req.body.senha && req.body.confirmesenha){
        const { nome, email: emailOriginal, token, senha: senhaOriginal, confirmesenha } = req.body;
        const validado = validartoken({token,type:"adm"});
        if(validado.status === "sucesso"){
            if(nome.length >3){
                var re = /\S+@\S+\.\S+/;
                if(re.test(emailOriginal)){
                    const tamanhoSenha = senhaOriginal.length;
                    if(tamanhoSenha >=6 && tamanhoSenha <= 20){
                        if(senhaOriginal === confirmesenha){
                            const senha = md5(senhaOriginal);
                            const email = emailOriginal.toUpperCase();
                            const admCount = await Adm.find({email:`${email}`,_id:{$ne: `${req.params.id}`}}).countDocuments();
                                if(admCount >=1){
                                    return res.json({status: "erro",erro:"e-mail já cadastrado"});
                                }else{
                                    const update = await Adm.updateOne({"_id": `${req.params.id}`},{$set:{
                                        "nome": `${nome}`,
                                        "email": `${email}`,
                                        "senha": `${senha}`
                                    }});
                                    if(update.nModified >=1){
                                        return res.json({status: "sucesso"});
                                    }else{
                                        return res.json({status: "erro", erro: "não foi alterado os dados"});
                                    }
                                }
                        }else{
                            return res.json({status: "erro",erro:"As senhas não são iguais"});
                        }
                    }else{
                        return res.json({status: "erro",erro:"senha precisa ter entre 6 e 20 caracteres"});
                    }
                }else{
                    return res.json({status: "erro",erro:"E-mail invalido"});
                }
            }else{
                return res.json({status:"erro",erro: "O nome precisa ter mais de 3 caracteres"});
            }
        }else{
            return res.json(validado);
        }
        
    }else{
        return res.json({status:"erro",erro: "parametros não passados"});
    }
});

//validar adm
routes.post("/adm/validar", async(req,res)=>{
    if(req.body.token && req.body.type){
        const token = req.body.token;
        const type = req.body.type;
        const valido = validartoken({token,type});
        return res.json(valido);
    }else{
        return res.json({status: "erro", erro: "token ou tipo não informado"});
    }
});

//rotas para user

//cadastrar user
routes.post("/user/cadastrar", async(req,res)=>{
    if(req.body.nome && req.body.email && req.body.senha && req.body.confirmesenha ){
        const { nome, email: emailOriginal, senha: senhaOriginal, confirmesenha } = req.body;
        if(nome.length >= 5 && nome.length <= 98){
            var re = /\S+@\S+\.\S+/;
            if(re.test(emailOriginal)){
                if(senhaOriginal === confirmesenha){
                    if(senhaOriginal.length >= 6 && senhaOriginal.length <= 20){
                        const email = emailOriginal.toUpperCase();
                        const usercount = await User.find({email: `${email}`}).countDocuments();
                        if(usercount <= 0){
                            const senha = md5(senhaOriginal);
                            await User.create({
                                nome,
                                email,
                                senha
                            });
                            return res.json({status: "sucesso"});
                        }else{
                            return res.json({status: "erro", erro: "email já cadastrado"});
                        }
                    }else{
                        return res.json({status:"erro", erro:"a senha precisa ter entre 6 a 20 caracteres"});
                    }
                }else{
                    return res.json({status:"erro", erro:"E-mail invalido"});
                }
            }else{
                return res.json({status:"erro", erro:"E-mail invalido"});
            }
        }else{
            return res.json({status:"erro", erro:"nome precisa ter entre 5 e 98 caracteres"});
        }
    }else{
        return res.json({status:"erro", erro:"parametros não passados"});
    }
});

//login user
routes.post("/user/login", async(req,res)=>{
    if(req.body.email && req.body.senha){
        const {email: emailOriginal, senha: senhaOriginal} = req.body;
        var re = /\S+@\S+\.\S+/;
        if(re.test(emailOriginal)){
            const email = emailOriginal.toUpperCase();
            const senha = md5(senhaOriginal);
            const usercount = await User.find({email: `${email}`, senha: `${senha}`}).countDocuments();
            if(usercount >= 1){
                const user= await User.find({email: `${email}`, senha: `${senha}`});
                const id = user[0]._id;
                const nome = user[0].nome;
                const tokenJWT = jwt.sign(
                    { id, nome, email }, 
                    process.env.JWT_SECRET_USER,
                    {  expiresIn: 10800 });
                return res.json({
                    status: "sucesso",
                    id:`${id}`,
                    nome:`${nome}`,
                    email: `${email}`,
                    token: tokenJWT
                });
            }else{
                return res.json({status: "erro", erro: "Ususario não encontrado"});
            }
        }else{
            return res.json({status: "erro", erro: "email invalido"});
        }
    }else{
        return res.json({status: "erro", erro: "parametros não enviados"});
    }
});

//editar user
routes.put("/user/editar/:id", async(req,res)=>{
    if(req.body.nome && req.body.email && req.body.senha && req.body.confirmesenha && req.body.token){
        const {nome, email: emailOriginal, token, confirmesenha, senha: senhaOriginal} = req.body;
        const validado = validartoken({token, type: "user"});
        if(validado.status === "sucesso"){
            var re = /\S+@\S+\.\S+/;
            if(re.test(emailOriginal)){
                if(senhaOriginal.length >= 6 && senhaOriginal.length <= 20){
                    if(senhaOriginal === confirmesenha){
                        const email = emailOriginal.toUpperCase();
                        const senha = md5(senhaOriginal);
                        const user = await User.find({email: `${email}`,_id:{$ne: `${req.params.id}`} }).countDocuments();
                        if(user >=1){
                            return res.json({status:"erro",erro:"Email já cadastrado"});
                        }else{
                            const update = await User.updateOne({"_id": `${req.params.id}`}, {$set:{
                                nome: `${nome}`,
                                email:`${email}`,
                                senha:`${senha}`
                            }});
                            if(update.nModified >=1){
                                return res.json({status: "sucesso"});
                            }else{
                                return res.json({status: "erro", erro: "não foi alterado os dados"});
                            }
                        }
                    }else{
                        return res.json({status: "erro", erro: "as senhas não são iguais"});
                    }
                }else{  
                    return res.json({status: "erro", erro: "Senha precisa ter entre 6 a 20 caracteres"});
                }
            }else{
                return res.json({status: "erro", erro: "email invalido"});
            }
        }else{
            return res.json(validado);
        }
    }else{
        return res.json({status: "erro", erro: "parametros não enviados"});
    }
});

//validar user
routes.post("/user/validar", async(req,res)=>{
    if(req.body.token){
        const {token} = req.body;
        const validado = validartoken({token,type:"user"});
        return res.json(validado);
    }else{
        return res.json({status:"erro",erro: "token não informado"});
    }
});

//rotas para lista assistir

//lista todas as lista deum user
routes.post("/assistir/listar/:id/:pagina/:limite", async(req,res)=>{
    if(req.body.token){
        const {token} = req.body
        const validacao = validartoken({token, type: "user"});
        if(validacao.status === "sucesso"){
            const assistirCountend = await Assistir.find({id_user: `${req.params.id}`}).countDocuments();
            if(assistirCountend >= 1){
                const limit = parseInt(req.params.limite);
                if(limit <= 0 ){
                    return res.json({status:"erro", erro:"limite invalido"});
                }else{
                    const pageTotal = Math.ceil(assistirCountend/limit);
                    if(req.params.pagina <= 1){
                        const pagina = 1
                        const skip = 0;
                        const assistirCount = await Assistir.find({id_user: `${req.params.id}`}).limit(limit).skip(skip).countDocuments();
                        const assistir = await Assistir.find({id_user: `${req.params.id}`}).limit(limit).skip(skip);
                        var anime = [];
                        for (let index = 0; index < assistirCount; index++) {
                            const element = await Animes.findById(assistir[index].id_anime);
                            const { _id:id_anime, nome, genero, num_ep, imagem, status, trailer,  } = element;
                            anime.push({
                                id_lista: `${assistir[index]._id}`,
                                id_anime,
                                nome,
                                genero,
                                num_ep,
                                imagem,
                                status,
                                trailer   
                            });
                        }  
                        return res.json({
                            pageTotal,
                            anime
                        });
                    }else{
                        const page = req.params.pagina;
                        if(page > pageTotal){
                            return res.json({status:"erro",erro:"pagina não existe"});
                        }else{
                            const skip = limit * (page - 1);
                            const assistirCount = await Assistir.find({id_user: `${req.params.id}`}).limit(limit).skip(skip).countDocuments();
                            
                            const assistir = await Assistir.find({id_user: `${req.params.id}`}).limit(limit).skip(skip);
                            var anime = [];
                            for (let index = 0; index < assistirCount; index++) {
                                const element = await Animes.findById(assistir[index].id_anime);
                                const { _id:id_anime, nome, genero, num_ep, imagem, status, trailer,  } = element;
                                anime.push({
                                    id_lista: `${assistir[index]._id}`,
                                    id_anime,
                                    nome,
                                    genero,
                                    num_ep,
                                    imagem,
                                    status,
                                    trailer   
                                }); 
                            }  
                            return res.json({
                                pageTotal,
                                anime
                            });
                        }
                    }
                }
            }else{
                return res.json({status: "erro", erro: "nenhum anime na lista"});
            }
        }else{
            return res.json(validacao);
        }
    }else{
        return res.json({status: "erro", erro: "token não informado"});
    }
    
});

//add anime em assisitir
routes.post("/assisitir/adicionar/:id", async(req, res)=>{
    if(req.body.animeid && req.body.token){
        const { animeid, token} = req.body;
        const validacao = validartoken({token, type: "user"});
        if(validacao.status === "sucesso"){
            const animeCount = await Animes.findById(animeid).countDocuments();
            if(animeCount >= 1){
                const userCount = await User.findById(req.params.id).countDocuments();
                if(userCount >= 1){
                    Assistir.create({
                        id_user: `${req.params.id}`,
                        id_anime: `${animeid}`
                    });
                    return res.json({status: "sucesso"});
                }else{
                    return res.json({status:"erro",erro: "usuario não encontrado"});
                }
            }else{
                return res.json({status:"erro",erro: "anime não encontrado"});
            }
        }else{
            return res.json(validacao);
        }
        
    }else{
        return res.json({status:"erro",erro: "id do anime ou token não informado"});
    }
});

//pesquisa na lista assistir
routes.post("/assistir/pesquisar/:id/:pesquisa/:pagina/:limite", async(req, res)=>{
    if(req.body.token){
        const {token} = req.body;
        const validacao = validartoken({token,type:"user"});
        if(validacao.status === "sucesso"){
            const limit = parseInt(req.params.limite);
            if(limit >= 1){
                const search = req.params.pesquisa;
                const assistirCount = await Assistir.find({id_user: `${req.params.id}`}).countDocuments();
                const pageTotal = Math.ceil(assistirCount/limit);
                if(assistirCount >= 1){
                    if(req.params.pagina <= 1){
                        const skip = 0;
                        const assistir = await Assistir.find({id_user: `${req.params.id}`}).limit(limit).skip(skip);
                        var animes = [];
                        for (let index = 0; index < assistir.length; index++) {
                            const element = assistir[index].id_anime;
                            const anime = await Animes.find({_id:`${element}`,nome: {'$regex': search, '$options': 'i'}});
                            const { _id:id_anime, nome, genero, num_ep, imagem, status, trailer  } = anime[0];
                            animes.push({
                                id_lista: `${assistir[index]._id}`,
                                id_anime,
                                nome,
                                genero,
                                num_ep,
                                imagem,
                                status,
                                trailer   
                            });
                        }
                        return res.json({
                            pageTotal,
                            animes
                        });
                    }else{
                        const page = req.params.pagina;
                        if(page > pageTotal){
                            return res.json({status:"erro",erro:"pagina não existe"});
                        }else{
                            const skip = limit * (page - 1);
                            const assistir = await Assistir.find({id_user: `${req.params.id}`}).limit(limit).skip(skip);
                            var animes = [];
                            for (let index = 0; index < assistir.length; index++) {
                                const element = assistir[index].id_anime;
                                const anime = await Animes.find({_id:`${element}`,nome: {'$regex': search, '$options': 'i'}});
                                const { _id:id_anime, nome, genero, num_ep, imagem, status, trailer,  } = anime[0];
                                animes.push({
                                    id_lista: `${assistir[index]._id}`,
                                    id_anime,
                                    nome,
                                    genero,
                                    num_ep,
                                    imagem,
                                    status,
                                    trailer   
                                });
                            }
                            return res.json({
                                pageTotal,
                                animes
                            });
                        }
                    }
                }else{
                    return res.json({status:"erro", erro:"nenhum anime na lista"})
                }
            }else{
                return res.json({status:"erro",erro: "limiteinvalido"});
            }
        }else{
            return res.json(validacao);
        }
    }else{
        return res.json({status:"erro",erro:"token não enviado"});
    }
});

//deleta da lista assistir
routes.post("/assistir/deletar/:id", async(req,res)=>{
    if(req.body.token ){
        const {token}= req.body;
        const validacao = validartoken({token,type:"user"});
        if(validacao.status === "sucesso"){
            const listacount  = await Assistir.findById(req.params.id).countDocuments();
            if(listacount >= 1){
                const lista  = await Assistir.findById(req.params.id);
                lista.remove();
                return res.json({status:"sucesso"});
            }else{
                return res.json({status:"erro", erro:"registro não encontrado"});
            }
        }else{
            return res.json(validacao);
        }
    }else{
        return res.json({status:"erro", erro:"token não informado"});
    }
});

// lista para assisitidos

//lista todas as lista deum user
routes.post("/assistidos/listar/:id/:pagina/:limite", async(req,res)=>{
    if(req.body.token){
        const {token} = req.body
        const validacao = validartoken({token, type: "user"});
        if(validacao.status === "sucesso"){
            const assistidosCountend = await Assistidos.find({id_user: `${req.params.id}`}).countDocuments();
            if(assistidosCountend >= 1){
                const limit = parseInt(req.params.limite);
                if(limit <= 0 ){
                    return res.json({status:"erro", erro:"limite invalido"});
                }else{
                    const pageTotal = Math.ceil(assistidosCountend/limit);
                    if(req.params.pagina <= 1){
                        const pagina = 1
                        const skip = 0;
                        const assistidosCount = await Assistidos.find({id_user: `${req.params.id}`}).limit(limit).skip(skip).countDocuments();
                        const assistidos = await Assistidos.find({id_user: `${req.params.id}`}).limit(limit).skip(skip);
                        var anime = [];
                        for (let index = 0; index < assistidosCount; index++) {
                            const element = await Animes.findById(assistidos[index].id_anime);
                            const { _id:id_anime, nome, genero, num_ep, imagem, status, trailer,  } = element;
                            anime.push({
                                id_lista: `${assistidos[index]._id}`,
                                id_anime,
                                nome,
                                genero,
                                num_ep,
                                imagem,
                                status,
                                trailer   
                            });
                        }  
                        return res.json({
                            pageTotal,
                            anime
                        });
                    }else{
                        const page = req.params.pagina;
                        if(page > pageTotal){
                            return res.json({status:"erro",erro:"pagina não existe"});
                        }else{
                            const skip = limit * (page - 1);
                            const assistidosCount = await Assistidos.find({id_user: `${req.params.id}`}).limit(limit).skip(skip).countDocuments();
                            
                            const assistidos = await Assistidos.find({id_user: `${req.params.id}`}).limit(limit).skip(skip);
                            var anime = [];
                            for (let index = 0; index < assistidosCount; index++) {
                                const element = await Animes.findById(assistidos[index].id_anime);
                                const { _id:id_anime, nome, genero, num_ep, imagem, status, trailer,  } = element;
                                anime.push({
                                    id_lista: `${assistidos[index]._id}`,
                                    id_anime,
                                    nome,
                                    genero,
                                    num_ep,
                                    imagem,
                                    status,
                                    trailer   
                                }); 
                            }  
                            return res.json({
                                pageTotal,
                                anime
                            });
                        }
                    }
                }
            }else{
                return res.json({status: "erro", erro: "nenhum anime na lista"});
            }
        }else{
            return res.json(validacao);
        }
    }else{
        return res.json({status: "erro", erro: "token não informado"});
    }
    
});

//add anime em assistidos
routes.post("/assistidos/adicionar/:id", async(req, res)=>{
    if(req.body.animeid && req.body.token){
        const { animeid, token} = req.body;
        const validacao = validartoken({token, type: "user"});
        if(validacao.status === "sucesso"){
            const animeCount = await Animes.findById(animeid).countDocuments();
            if(animeCount >= 1){
                const userCount = await User.findById(req.params.id).countDocuments();
                if(userCount >= 1){
                    Assistidos.create({
                        id_user: `${req.params.id}`,
                        id_anime: `${animeid}`
                    });
                    return res.json({status: "sucesso"});
                }else{
                    return res.json({status:"erro",erro: "usuario não encontrado"});
                }
            }else{
                return res.json({status:"erro",erro: "anime não encontrado"});
            }
        }else{
            return res.json(validacao);
        }
        
    }else{
        return res.json({status:"erro",erro: "id do anime ou token não informado"});
    }
});

//pesquisa na lista assistidos
routes.post("/assistidos/pesquisar/:id/:pesquisa/:pagina/:limite", async(req, res)=>{
    if(req.body.token){
        const {token} = req.body;
        const validacao = validartoken({token,type:"user"});
        if(validacao.status === "sucesso"){
            const limit = parseInt(req.params.limite);
            if(limit >= 1){
                const search = req.params.pesquisa;
                const assistidosCount = await Assistidos.find({id_user: `${req.params.id}`}).countDocuments();
                const pageTotal = Math.ceil(assistidosCount/limit);
                if(assistidosCount >= 1){
                    if(req.params.pagina <= 1){
                        const skip = 0;
                        const assistidos = await Assistidos.find({id_user: `${req.params.id}`}).limit(limit).skip(skip);
                        var animes = [];
                        for (let index = 0; index < assistidos.length; index++) {
                            const element = assistidos[index].id_anime;
                            const anime = await Animes.find({_id:`${element}`,nome: {'$regex': search, '$options': 'i'}});
                            const { _id:id_anime, nome, genero, num_ep, imagem, status, trailer  } = anime[0];
                            animes.push({
                                id_lista: `${assistidos[index]._id}`,
                                id_anime,
                                nome,
                                genero,
                                num_ep,
                                imagem,
                                status,
                                trailer   
                            });
                        }
                        return res.json({
                            pageTotal,
                            animes
                        });
                    }else{
                        const page = req.params.pagina;
                        if(page > pageTotal){
                            return res.json({status:"erro",erro:"pagina não existe"});
                        }else{
                            const skip = limit * (page - 1);
                            const assistidos = await Assistidos.find({id_user: `${req.params.id}`}).limit(limit).skip(skip);
                            var animes = [];
                            for (let index = 0; index < assistidos.length; index++) {
                                const element = assistidos[index].id_anime;
                                const anime = await Animes.find({_id:`${element}`,nome: {'$regex': search, '$options': 'i'}});
                                const { _id:id_anime, nome, genero, num_ep, imagem, status, trailer,  } = anime[0];
                                animes.push({
                                    id_lista: `${assistidos[index]._id}`,
                                    id_anime,
                                    nome,
                                    genero,
                                    num_ep,
                                    imagem,
                                    status,
                                    trailer   
                                });
                            }
                            return res.json({
                                pageTotal,
                                animes
                            });
                        }
                    }
                }else{
                    return res.json({status:"erro", erro:"nenhum anime na lista"})
                }
            }else{
                return res.json({status:"erro",erro: "limiteinvalido"});
            }
        }else{
            return res.json(validacao);
        }
    }else{
        return res.json({status:"erro",erro:"token não enviado"});
    }
});

//deleta da lista assistidos
routes.post("/assistidos/deletar/:id", async(req,res)=>{
    if(req.body.token ){
        const {token}= req.body;
        const validacao = validartoken({token,type:"user"});
        if(validacao.status === "sucesso"){
            const listacount  = await Assistidos.findById(req.params.id).countDocuments();
            if(listacount >= 1){
                const lista  = await Assistidos.findById(req.params.id);
                lista.remove();
                return res.json({status:"sucesso"});
            }else{
                return res.json({status:"erro", erro:"registro não encontrado"});
            }
        }else{
            return res.json(validacao);
        }
    }else{
        return res.json({status:"erro", erro:"token não informado"});
    }
});
module.exports = routes;