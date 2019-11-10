const express = require('express');
const { sha512 } = require('js-sha512');
const bcrypt = require('bcryptjs');
const createError = require('http-errors');
const db = require('../models/queries');
const mailer = require ('nodemailer');
const fetch = require("node-fetch");
const bcrypt = require('bcryptjs');


const router = express.Router();

router.get('/', function signupHandler(_req, res, _next) {
  res.render('signup', { title: 'TIW4 -- LOGON' });
});

router.get("/confirm/:code",async function signupHandler(req, res, next){
  try{
    let userid= await db.getTempUserId(req.params.code);
    if(userid!=undefined){
      await db.confirmUser(userid);
      await db.deleteTempUser(userid);
      res.redirect("/");
    }
  }
  catch(e){
    next(createError(500, e));
    res.redirect("/");
  }

});

router.post("/confirm",async function signupHandler(req, res, next){
  try{
    let maillower=req.body.email.toLowerCase();
    let loginlower = req.body.username.toLowerCase();
    let captcha= req.body["g-recaptcha-response"];

    let captchavide=captcha.length==0;

    errors={};
    if (await checkEmailExist(maillower))errors.mailexist={id:'emailexist',parent:"email" ,msg:"L'email existe déjà dans la base de données"};
    if (await checkLoginExist(loginlower)) errors.loginexist={id:'loginexist',parent: "username",msg:`L'utilisateur ${loginlower} existe déjà`};
    if (captchavide) errors.captchaVide={id:'captchavide',msg:"Veuillez renseigner le captcha",parent:"captcha"};

    //Si le captcha n'est pas vide on vérifie avec le serveur
    if(!captchavide){
      let success=await verifyCaptcha(captcha);
      if(!success) errors.errCaptcha= {id:'errcaptcha',msg:"Erreur sur le captcha",parent:"captcha"};
    }

    return res.json(errors)
  }
  catch(e){
    next(createError(500, e));
  }
});


router.post('/', async function signupHandler(req, res, next) {
  try {
    let maillower=req.body.email.toLowerCase();
    let loginlower = req.body.username.toLowerCase();
    let password=req.body.password;
    let errors = await verifications(req);

    //Si il ya des erreurs on réaffiche la page signup avec les erreurs.
    if(Object.keys(errors).length!=0){
      res.render("signup",errors);
    }
    else {
      //ECHAPER LES CARTACTeres speciaux (specialchars)
      // HTML ENTITIES
        // const salt = bcrypt.genSaltSync(10);
        const salt = 10;
        const hashedPass = sha512(password);
        const encrptedPass = bcrypt.hashSync(hashedPass, salt);


        let code= await generateRandomeCode();
      sendMail({mail:maillower,code:code}).catch(()=>{
        console.log("Erreur de lors de l'envoie du mail");
        res.redirect("/signup");
      });
      await db.addUser(loginlower,maillower,encrptedPass);
      let usr = await db.getId(loginlower,maillower);
      let userid=(usr.rows[0].userid);
      await db.createTempUser(code,userid);
      res.redirect("/");

    }
  } catch (e) {
    next(createError(500, e));
  }
});

function generateRandomeCode(){
  return new Promise((resolve= (code)=>{return code},reject)=>{
    let result= '';
    let saltround= 10;
    const codelength=6;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( var i = 0; i < codelength; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    result=bcrypt.hashSync(result,saltround);
    resolve(result);
  })
}

function sendMail(params){
  return new Promise((resolve,reject)=>{
    const link = `localhost:${process.env.PORT}/signup/confirm/${params.code}`
    let transport = mailer.createTransport({
      host : process.env.MAILER_HOST,
      port : process.env.MAILER_PORT,
      auth : {
        type: 'OAuth2',
        user : process.env.MAILER_USER,
        clientId : process.env.CLIENT_ID,
        clientSecret : process.env.CLIENT_SECRET,
        refreshToken : process.env.REFRESH_TOKEN
      }
    });

    let html =`<p>Appuyez <a href="${link}">ici </a>pour confirmer votre adresse mail</p>`
    html+=`</br></br>Sinon copiez le lien suivant dans un navigateur : ${link}`;

    let message = {
      from : process.env.MAIL_NAME,
      to : params.mail,
      subject : "Confirmation de votre adresse mail",
      html : html
    }

    transport.sendMail(message,(err,info)=>{
      if (err)
        reject();
      else
        resolve();
    })

  });
}

function checkPassword(password){
  return new Promise((resolve,reject) => {
    let strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})");
    strongRegex.test(password)?resolve():reject();
  });
}

function checkEmail(email){
  return new Promise((resolve,reject)=>{
    let mailregex= new RegExp("^([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+)\.([a-zA-Z]{2,6})$");
    mailregex.test(email)?resolve():reject();
  });
}

async function checkLoginExist(login){
  return await (db.checkUserNameExistance(login));
}

async function checkEmailExist(mail){
  return await(db.checkMailExistance(mail))
}

async function verifyCaptcha(captcha){
  let captchaSecret=process.env.CAPTCHA_SECRET;
  const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${captchaSecret}&response=${captcha}`;
  return await fetch(verifyURL).then(res=>res.json()).then(res=>{return res.success});
}

async function verifications(req){
  let errors={};
  let captcha= req.body["g-recaptcha-response"];
  let maillower=req.body.email.toLowerCase();
  let loginlower = req.body.username.toLowerCase();

  //verifier si le captcha n'est pas vide
  let captchavide=captcha.length==0;
  if (captchavide) errors.captchaVide=true;

  //Vérfier que le username n'est pas vide
  let logvide=loginlower.length==0;
  if(logvide) errors.logvide=true;

  //vérifier l'existance du nom d'utilisateur dans la base de données
  let loginpresent=await (checkLoginExist(loginlower));
  // Si le username est déjà présent on retourne une erreur
  if(loginpresent) errors.usernameerror=req.body.username;

  let checkp=true;
    //Vérifier si le mot de passe est conforme
  await (checkPassword(req.body.password)).catch(()=>checkp=false);
  if(!checkp) errors.passnotconform=true;

  //Vérifier si les deux mots se corréspondent
  let passCorspond =req.body.password==req.body.confirmPassword;
  if(!passCorspond) errors.errconfpass=true;

  //Vérifier que l'email n'existe pas déjà dans la bdd
  let mailpresnet= await(checkEmailExist(maillower));
  //Si l'email est déjà présent on retourne une erreur
  if(mailpresnet) errors.mailerror=true;

  // Vérifier si l'email est conforme
  let checkm=true;
  await (checkEmail(maillower)).catch(()=> checkm=false)
  if(!checkm) errors.mailnotconform=true;

  return errors;
}

module.exports = router;
