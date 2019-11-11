# Annexe B
### Le maintien de la session JWT [1]
#### Principe
Pour maintenir la session d'utilisateur, nous avons choisi d'implémenter le mechanisme a base de **refresh token**, nous nous somme basé sur [ref](https://codeforgeek.com/refresh-token-jwt-nodejs-authentication/) [ref](https://www.sohamkamani.com/blog/javascript/2019-03-29-node-jwt-authentication/) [ref](https://github.com/auth0/node-jsonwebtoken/issues/316) [ref](https://medium.com/kaliop/3-ways-to-automatically-renew-an-user-session-per-token-jwt-552616e1f094).
Cette solution consiste a utiliser deux types de tokens :
- `access token` : un token d'une courte durée qui permet au utilisateur d'acceder aux ressources.
- `refresh token` : un token d'une durée plus longue qui permet de generer un nouveau `acces token`
Le principe est illustré dans la figure suivante :
![refresh token principle](https://miro.medium.com/max/912/1*0b6JPGqSiJebTqvMCHAI5A.jpeg)

#### Implémentation 
Pour l'implémentation, nous avons mis en place un fichier client `public/js/refresh.js` qui envoie des requettes de renouvellement au serveur 
au lien `\refresh` pour recuperer un nouveau token chaque periodiquement.
De coté serveur, les token sont créés lors de login `routes/authenticate.js::authenticateUser` :
```js
const token = jwt.sign({ sub: login }, jwtTokenSecret, {
        algorithm: 'HS256',
        expiresIn: jwtExpirySeconds
      });
      
const refreshToken = jwt.sign(
        { sub: login, agent: userAgent },
        refreshTokenSecret,
        { algorithm: 'HS256', expiresIn: refreshTokenLifetime }
      );
```
Ces tokens sont envoyé a l'utilisateur dans des cookies.

Le fichier `routes/renew.js` permet de traiter la requette de renouvellement de token envoyé par le scripit de client `public/js/refresh.js`

### Mécanisme d'invalidation de token [2]
Le mechanisme de refresh token permet de gerer les sessions coté client au lieu de serveur d'une manière fiable, par contre,
si le refresh token est intercepté, le hacker peut l'utiliser pour generer des token d'acces au ressources et connecter a l'application.
Pour eviter ce type de danger, il existe plusieurs methodes, selon [ref](https://medium.com/devgorilla/how-to-log-out-when-using-jwt-a8c7823e8a6) 
la methode la plus sécurisé est d'utiliser une **blacklist** pour stocker les refresh tokens non exipiré mais qui ne sont plus utilisés. 
#### implémentation
nous avons utiliser une base de donnée [Redis](https://redis.io/) pour stocker les refresh token blacklisté. Ensuite, nous 
avons ajouté un mechanisme de déconnection dans le fichier `routes/logout.js` qui permet d'invalider un refresh token 
(c-à-d le stocker dans la base Redis) quand l'utilisateur se deconnecte (fichier `routes/authenticate.js::blacklistToken`): 
```js
function blacklistToken(req, res, next) {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    next(createError(401, 'No JWT provided'));
  }

  const refreshPayload = jwt.verify(refreshToken, refreshTokenSecret);

  if (!refreshPayload) {
    next(createError(401, 'Invalid refresh token'));
  }

  const nowUnixSeconds = Math.round(Number(new Date()) / 1000);
  const expiration = refreshPayload.exp - nowUnixSeconds;

  // add refresh token to blacklist
  client.set(refreshToken, refreshToken, 'EX', expiration);

  // destroy the token and the cookie
  // https://stackoverflow.com/questions/27978868/destroy-cookie-nodejs
  res.cookie('token', jwt.sign({}, 'expired'), { maxAge: Date.now() });

  next();
}
```
Ensuite nous verifions le refresh token dans chaque demande de renouvellement `routes/authenticate.js::renewToken`.

### Sécurisation des cookies [3]
Pour la sécurisation des cookies, nous avons suivi 
[Express Best Practice](https://expressjs.com/fr/advanced/best-practice-security.html) pour activer les options de cookie :
- secure : Garantit que le navigateur n’envoie le cookie que sur HTTPS.
- httpOnly : Garantit que le cookie n’est envoyé que sur HTTP(S), pas au JavaScript du client, ce qui renforce la protection contre les attaques de type cross-site scripting.
- sameSite : limite la portée du cookie de sorte qu'il ne sera attaché à l'équipement que si ces demandes proviennent du même site
Dans le fichier `routes/authenticate.js::authenticateUser`.
```js
res.cookie('token', token, {
        secure: true,
        sameSite: true,
        httpOnly: true,
        maxAge: jwtExpirySeconds * 1000 * 2
      });

res.cookie('refreshToken', refreshToken, {
        secure: true,
        sameSite: true,
        httpOnly: true,
        maxAge: refreshTokenLifetime * 1000 * 2
      });
```

### Controle des entrées utilisateurs [4]
Pour controler les les entrés au utilisateur nous avons mis en place plusieurs mesures :
#### controler les entrés coté client
Nous avons creer un fichier `public/js/signupf.js` qui sert a faire une première verification des inputs.
- verifier les champs vides
- verifier les expressions régulières
- verification de dureté de mot de pass
Ces verification permet d'optimiser et de minimiser les requettes envoyé au serveur et non plus pour la sécurité.
#### controler les entrés coté sereur
De coté serveur `routes/signup.js`, de plus de refaire les verification de client, nous verfions :
- l'existance de meme utilisateur ou email dans la base
- la validité de captcha

#### mettre en place un captcha 
Pour empecher les attaques de bots, nous avons utilisé [API google](https://www.google.com/recaptcha/intro/v3.html) pour 
mettre en place un captcha a l'aide des deux clés client et serveur.
### Processus de confirmation des emails [5]
Pour chaque création du compte nous avons mis un processus d'envoie de mail dans `routes/signup.js::sendMail` :
```js
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
```
De plus, nous avons modifier la base postgres en ajoutant un champs `verified` de valeur `Boolean` qui indique si un utilisateur
a validé sont mail ou non.

Pour finir, nous avons mis en place une page de simulation d'email envoyé `views/email.pug`.
### Processus de récuperation de mot de pass [6]
Dans le cas ou un utilisateur oublie sont mot de pass ou si sont compté était piraté. nous avons implémenté un processus
de récuperation de mot de pass à partir de la page de login `views/login.pug` on peut aller a la page de recuperation de 
mot de pass `views/forget.pug` qui génère un token et l'envoie à l'email de l'utilisateur :
```js
function checkEmail(req, _res, next) {
  // recuperer le mail
  const {email} = req.body;
  debug(`user email ${email}`);

  // verify that email exists
  // generate 24h token for password reset
  req.token = jwt.sign(
      {ident: email},
      jwtTokenSecret,
      {expiresIn: 24*60*60});
  // send page by email
  next();
}
```
L'utilisateur reçoit un mail avec un lien contenat le token (simulation de mail `views/email.pug`), ce lien vers `routes/reset.js`
où on verifie sa validité pour ensuite afficher la page de reinitialisation de mot de pass `views/reset.pug` a l'uitilisateur
pour qu'on appel par la suite la fonction `routes/authenticate.js::resetPassword`.
```js
// reset user password
function resetPassword(req, _res, next) {
  const {pass, email} = req.body;
  debug(`email : ${email} , pass : ${pass}`);

  const salt = 10;
  const hashedPass = sha(pass);
  const encrptedPass = bcrypt.hashSync(hashedPass, salt);

  db.updatePassword(email, encrptedPass);
  next();
}
```


### Restraindre l'accès a la list des utilisateurs [7]
Pour restraindre l'acces a la liste des utilisateurs, nous avons ajouté le code suivant au ficher `routes/users.js`:
```js
router.get('/', checkUser);
```

### Chiffrement des mots de passes [8]
Pour chiffrer les mots de passes nous avons utiliser le package : 
- `sha512` pour compresser les mots de passes ce qui permet d'optimiser l'envoie et le stockage. 
- `bcryptjs` est un algorithme de chiffrement fort pour la confidentialité des mots de pass.
Ensuite, on a modifier la base de données pour qu'elle prend des mots de pass de taille 128 char.
```sql
ALTER TABLE "users" ALTER COLUMN "password" TYPE varchar(128);
```
Par la suite, dans le fichier `routes/signup.js`, nous compressons et chiffrons le mot de pass avant le stockage en BDD.

```js
const salt = 10;
const hashedPass = sha512(password);
const encrptedPass = bcrypt.hashSync(hashedPass, salt);
await db.addUser(loginlower, maillower, encrptedPass);
```

Finalement, pour la connection `login` (dans `routes/authenticate.js`) nous recuperons le chiffré de la base de donnée et on le compare
avec le hash de mot de pass reçu de client

```js
const pwd = sha(req.body.password);
const passwordFromDB = JSON.parse(passwordJsonFromDB).password;
const ok = bcrypt.compareSync(pwd, passwordFromDB);
```
