const { Pool } = require('pg');
const debug = require('debug')('app:postgres');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT
});

// the list of all users
async function getUsers() {
  debug(`getUsers()`);
  const result = await pool.query('SELECT username, email FROM users;');
  return result.rows;
}

// the list of all users
async function addUser(username, email, pwd) {
  debug(`addUser("${username}", "${email}", "${pwd}")`);
  const result = await pool.query(
    'INSERT INTO users(username, email, password) VALUES ($1, $2, $3);',
    [username, email, pwd]
  );
  return result;
}

// Boolean query to check a user/password
async function checkUser(login, pwd) {
  debug(`checkUser("${login}", "${pwd}")`);
  const result = await pool.query(
    'SELECT  FROM users WHERE username=$1 AND password=$2;',
    [login, pwd]
  );
  return result.rowCount === 1;
}

async function checkUserNameExistance(login){
  debug(`checkUsername("${login}"`);
  const result = await pool.query(
    'SELECT  FROM users WHERE username=$1; ',
    [login]
  );
  return result.rowCount === 1;
}

async function checkMailExistance(email){
  debug(`checkMail("${email}"`);
  const result = await pool.query(
    'SELECT  FROM users WHERE email=$1; ',
    [email]
  );
  return result.rowCount === 1;
}

async function getId(user,mail){
  debug(`get userid`);
  const result = await pool.query(
    "SELECT userid FROM users WHERE username=$1 and email=$2",
    [user,mail]
  );
  return result;
}

async function createTempUser(code,userid){
  debug(`Create Temp User`);
  const result = await pool.query(
    "INSERT INTO userstemp(userid,cryptedcode) values($1,$2)",
    [userid,code]
  );
  return result;
}

async function getTempUserId(cryptedcode){
  debug("Get Temp user Id")
  const result = await pool.query(
    "SELECT userid FROM userstemp WHERE cryptedcode=$1",
    [cryptedcode]
  );
  return result.rows[0].userid;
}

async function deleteTempUser(userid){
  debug("Delete temp user")
  await pool.query(
    "DELETE FROM userstemp where userid=$1",
    [userid]
  );
}

async function confirmUser(userid){
  debug("Confirm user")
  await pool.query(
    "UPDATE users set verified=true where userid=$1",
    [userid]
  );
}

async function getPasswordByUsername(username) {
  const result = await pool.query(
      'SELECT password FROM users WHERE Username=$1; ',
      [username]
  );
  return result.rows[0];
}

module.exports = { getUsers, checkUser, addUser, checkUserNameExistance, checkMailExistance,createTempUser,getId,getTempUserId,deleteTempUser,confirmUser, getPasswordByUsername};
