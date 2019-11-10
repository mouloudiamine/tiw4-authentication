const express = require('express');
const { sha512 } = require('js-sha512');
const bcrypt = require('bcryptjs');
const createError = require('http-errors');
const mailer = require('nodemailer');
const fetch = require('node-fetch');
const db = require('../models/queries');
const request = require('request');

const router = express.Router();

router.get('/', function signupHandler(_req, res, _next) {
  res.render('signup', { title: 'TIW4 -- LOGON' });
});

router.get('/confirm', async function signupHandler(req, res, next) {
  const { code } = req.query;
  try {
    const userid = await db.getTempUserId(code);
    if (userid !== undefined) {
      await db.confirmUser(userid);
      await db.deleteTempUser(userid);
      res.redirect('/');
    }
  } catch (e) {
    next(createError(500, e));
    res.redirect('/');
  }
});

router.post('/confirm', async function signupHandler(req, res, next) {
  try {
    const maillower = req.body.email.toLowerCase();
    const loginlower = req.body.username.toLowerCase();
    const captcha = req.body['g-recaptcha-response'];

    const captchavide = captcha.length == 0;

    errors = {};
    if (await checkEmailExist(maillower))
      errors.mailexist = {
        id: 'emailexist',
        parent: 'email',
        msg: "L'email existe déjà dans la base de données"
      };
    if (await checkLoginExist(loginlower))
      errors.loginexist = {
        id: 'loginexist',
        parent: 'username',
        msg: `L'utilisateur ${loginlower} existe déjà`
      };
    if (captchavide)
      errors.captchaVide = {
        id: 'captchavide',
        msg: 'Veuillez renseigner le captcha',
        parent: 'captcha'
      };

    // Si le captcha n'est pas vide on vérifie avec le serveur
    if (!captchavide) {
      const success = await verifyCaptcha(captcha);
      if (!success)
        errors.errCaptcha = {
          id: 'errcaptcha',
          msg: 'Erreur sur le captcha',
          parent: 'captcha'
        };
    }

    return res.json(errors);
  } catch (e) {
    next(createError(500, e));
  }
});

router.post('/', async function signupHandler(req, res, next) {
  try {
    const maillower = req.body.email.toLowerCase();
    const loginlower = req.body.username.toLowerCase();
    const { password } = req.body;
    const errors = await verifications(req);

    // Si il ya des erreurs on réaffiche la page signup avec les erreurs.
    if (Object.keys(errors).length != 0) {
      res.render('signup', errors);
    } else {
      // ECHAPER LES CARTACTeres speciaux (specialchars)
      // HTML ENTITIES
      const salt = 10;
      const hashedPass = sha512(password);
      const encrptedPass = bcrypt.hashSync(hashedPass, salt);

      const code = await generateRandomeCode();
      sendMail({ mail: maillower, code }).catch(() => {
        console.log("Erreur de lors de l'envoie du mail");
        // res.redirect('/signup');
      });
      await db.addUser(loginlower, maillower, encrptedPass);
      const usr = await db.getId(loginlower, maillower);
      const { userid } = usr.rows[0];
      await db.createTempUser(code, userid);
      // res.redirect('/');

      res.render('verifmail', { token: code});
    }
  } catch (e) {
    next(createError(500, e));
  }
});

function generateRandomeCode() {
  return new Promise((resolve = (code) => {
    return code;
  }, reject) => {
    let result = '';
    const saltround = 10;
    const codelength = 6;
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < codelength; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    result = bcrypt.hashSync(result, saltround);
    resolve(result);
  });
}

function sendMail(params) {
  return new Promise((resolve, reject) => {
    const link = `${process.env.SERVER_IP}:${process.env.PORT}/signup/confirm/${params.code}`;
    const transport = mailer.createTransport({
      host: process.env.MAILER_HOST,
      port: process.env.MAILER_PORT
    });

    // verify connection configuration
    transport.verify(function(error, _success) {
      if (error) {
        console.log(error);
      } else {
        console.log("Server is ready to take our messages");
      }
    });

    let html = `<p>Appuyez <a href="${link}">ici </a>pour confirmer votre adresse mail</p>`;
    html += `</br></br>Sinon copiez le lien suivant dans un navigateur : ${link}`;

    const message = {
      from: process.env.MAIL_NAME,
      to: params.mail,
      subject: 'Confirmation de votre adresse mail',
      html
    };

    transport.sendMail(message, (err, info) => {
      console.log(`err ${err}`);
      console.log(`info ${info}`);
      if (err) reject();
      else resolve();
    });
  });
}

function checkPassword(password) {
  return new Promise((resolve, reject) => {
    const strongRegex = new RegExp(
      '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})'
    );
    strongRegex.test(password) ? resolve() : reject();
  });
}

function checkEmail(email) {
  return new Promise((resolve, reject) => {
    const mailregex = new RegExp(
      '^([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+).([a-zA-Z]{2,6})$'
    );
    mailregex.test(email) ? resolve() : reject();
  });
}

async function checkLoginExist(login) {
  return await db.checkUserNameExistance(login);
}

async function checkEmailExist(mail) {
  return await db.checkMailExistance(mail);
}

async function verifyCaptcha(captcha) {
  const captchaSecret = process.env.CAPTCHA_SECRET;
  const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${captchaSecret}&response=${captcha}`;

  return request.get(verifyURL, (error, res, body) => {
    if (error) {
      console.error(error);
      return false;
    }
    console.log(`captcha response : ${body}`);
    return body.success;
  });
}

async function verifications(req) {
  const errors = {};
  const captcha = req.body['g-recaptcha-response'];
  const maillower = req.body.email.toLowerCase();
  const loginlower = req.body.username.toLowerCase();

  // verifier si le captcha n'est pas vide
  const captchavide = captcha.length == 0;
  if (captchavide) errors.captchaVide = true;

  // Vérfier que le username n'est pas vide
  const logvide = loginlower.length == 0;
  if (logvide) errors.logvide = true;

  // vérifier l'existance du nom d'utilisateur dans la base de données
  const loginpresent = await checkLoginExist(loginlower);
  // Si le username est déjà présent on retourne une erreur
  if (loginpresent) errors.usernameerror = req.body.username;

  let checkp = true;
  // Vérifier si le mot de passe est conforme
  await checkPassword(req.body.password).catch(() => (checkp = false));
  if (!checkp) errors.passnotconform = true;

  // Vérifier si les deux mots se corréspondent
  const passCorspond = req.body.password == req.body.confirmPassword;
  if (!passCorspond) errors.errconfpass = true;

  // Vérifier que l'email n'existe pas déjà dans la bdd
  const mailpresnet = await checkEmailExist(maillower);
  // Si l'email est déjà présent on retourne une erreur
  if (mailpresnet) errors.mailerror = true;

  // Vérifier si l'email est conforme
  let checkm = true;
  await checkEmail(maillower).catch(() => (checkm = false));
  if (!checkm) errors.mailnotconform = true;

  return errors;
}

module.exports = router;
