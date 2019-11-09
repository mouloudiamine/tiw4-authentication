const express = require('express');
const { sha512 } = require('js-sha512');
const bcrypt = require('bcryptjs');
const createError = require('http-errors');
const db = require('../models/queries');

const router = express.Router();

router.get('/', function signupHandler(_req, res, _next) {
  res.render('signup', { title: 'TIW4 -- LOGON' });
});

router.post('/', async function signupHandler(req, res, next) {
  try {
    // const salt = bcrypt.genSaltSync(10);
    const salt = 10;
    const hashedPass = sha512(req.body.password);
    const encrptedPass = bcrypt.hashSync(hashedPass, salt);

    await db.addUser(req.body.username, req.body.email, encrptedPass);
    res.redirect('/');
  } catch (e) {
    next(createError(500, e));
  }
});

module.exports = router;
