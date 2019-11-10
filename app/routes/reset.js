const express = require('express');
const {checkToken, resetPassword} = require("./authenticate");

const router = express.Router();

router.get('/', checkToken);

router.get('/', function loginHandler(req, res, _next) {
    const { mail } = req.query;
    res.render('reset', {mel: mail});
});

router.post('/', resetPassword);

router.post('/', function loginHandler(req, res, _next) {
    res.redirect('/login');
});

module.exports = router;
