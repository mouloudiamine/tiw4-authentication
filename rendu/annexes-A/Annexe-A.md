# Mettre en place le HTTPS [1]
## Mise en place :
1. Lien 1 : http://www.linux-france.org/prj/edu/archinet/systeme/ch24s03.html
1. Lien 2 : https://admin-serv.net/blog/670/creer-et-installer-un-certificat-ssl-sous-nginx/
1. Lien 3 : https://bjornjohansen.no/redirect-to-https-with-nginx
1. Lien 4 : https://testssl.sh/


#### Génération de la clé RSA :
    `openssl genrsa -aes256 -passout pass:"boumou" -out ./serverBoumou.key 4096`

#### Modification des droit sur la clé crée :
    `chmod 400 ./serverBoumou.key`


#### Génération du certificat auto-signé : 

     `openssl req -passin pass:"boumou" -key ./serverBoumou.key -new -x509 -days 3650 -sha256 -out serverBoumou.crt` 

#### Configuration du serveur nginx :	
	
```
server {
  listen       443 ssl;
  server_name  _;
  ssl_password_file /etc/nginx/ssl/global.pass;
  ssl_certificate_key /etc/nginx/ssl/server.key;
  location / {
     include /etc/nginx/conf.d/proxy_set_header.inc;
     proxy_pass http://nodejs;
  }
}
```

#### véfication de la configuration effectuée est correcte :
	`nginx -t`
#### relance le processus nginx :
	`nginx -s reload`


#### Génération d'un certificat signé TIW4-SSI-CAW Certificate Authority
  génération d'une demande de signature csr

` openssl req -new -sha256 -key serverBoumou.key -out serverBoumou.csr `

#### Signé la demande de certification avec TIW4-SSI-CAW CA pour une durée d'un 1 ans :

` openssl x509 -req -in serverBoumou.csr -days 365 -CA root-ca-tiw4.cert -CAkey root-ca-tiw4.key -CAcreateserial  -out serverBoumouSigne.crt `

#### Paramétrer nginx pour quil utilise le nouveau certificat signé "ServerBoumou.crt" 
Ajouter `ssl_certificate /etc/nginx/ssl/serverBoumouSigne.crt;` dans le fichier  `/etc/nginx/sites-available/default`
```
server {
  listen       443 ssl;
  server_name  _;
  ssl_password_file /etc/nginx/ssl/global.pass;
 ssl_certificate /etc/nginx/ssl/serverBoumouSigne.crt; <==========
  ssl_certificate_key /etc/nginx/ssl/serverBoumou.key;
  location / {
     include /etc/nginx/conf.d/proxy_set_header.inc;
     proxy_pass http://nodejs;
  }
}
```

#### Rediriger les requêtes en HTTP vers HTTPS

Ajouter le return 301 (permanant) dans le bloc suivant dans le fichier `/etc/nginx/sites-available/default`
```
server {
  listen   80;
  server_name  _;
  return 301 https://192.168.76.222/;
  location / {
     include /etc/nginx/conf.d/proxy_set_header.inc;
     proxy_pass http://nodejs;
  }
```

# Downgrade attacks [2] :
  Désactivation de TLS 1.0, TLS 1.1 sur les serveurs Web nginx : 
1. lien 1 : https://www.cloudibee.com/disabling-tls-1-0-on-nginx/ 

#### Modifier le fichier de configuration nginx.conf :

Remplacer ssl_protocols TLSv1 TLSv1.1 TLSv1.2 par  ssl_protocols TLSv1.2;
Cela autorisera uniquement  TLS 1.2.

```
* ssl_protocols TLSv1.2; #Dropping SSLv3, ref: POODLE
* ssl_prefer_server_ciphers on;
```

#### Redémarrez nginx après le changement de configuration :

`service nginx restart `


# Fail2ban [3] :


1. Lien 1 : https://doc.ubuntu-fr.org/fail2ban
1. Lien 2 : https://www.fail2ban.org/wiki/index.php/MANUAL_0_8

installation :

```
root@login:~# apt-get install fail2ban
```

configuration :

```
root@login:~# nano /etc/fail2ban/jail.conf
```

```
bantime : temps de bannissement des IP suspectes ;
maxretry : nombre de tentatives de connexion permise avant bannissement.
```

Redémarrer pour avoir la nouvelle configuration :

```
root@login:~# /etc/init.d/fail2ban restart
```

# HSTS [4]:

#### AJOUTER STS (hsts) :

1. LIEN 1 : https://www.nginx.com/blog/http-strict-transport-security-hsts-and-nginx/ 

`add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`

HSTS cherche à traiter la vulnérabilité potentielle en indiquant au navigateur qu'un domaine ne peut être accédé qu'à l'aide du protocole HTTPS. Même si l'utilisateur entre ou suit un lien HTTP simple, le navigateur met strictement à niveau la connexion à HTTPS: 

Explication : Lorsqu'un navigateur voit cet en-tête sur un site Web HTTPS, il «apprend» que l'accès à ce 
domaine ne doit être effectué qu'à l'aide du protocole HTTPS (SSL ou TLS). Il met cette information en cache pour la max-agepériode (généralement 31 536 000 secondes, ce qui équivaut à environ un an).

Le "includeSubDomainsparamètre" facultatif indique au navigateur que la stratégie HSTS s'applique également à tous les sous-domaines du domaine actuel.

Le "always" paramètre garantit que l'en-tête est défini pour toutes les réponses, y compris les réponses d'erreur générées en interne. Les anciennes versions de NGINX.


# XSS (Cross-Site Scripting)  [5]:

1. Lien 1 : https://geekflare.com/http-header-implementation/#X-XSS-Protection 

L'en-tête X-XSS-Protection permet d'activer la protection contre les attaques XSS incluse dans les navigateurs Internet compatibles (IE, Chrome, Safari...).  Cette en-tête peut prendre 4 valeurs différentes :

```
0 : le filtrage XSS est désactivé
1 : le filtrage XSS est activé et le navigateur essaie de nettoyer le code, si besoin
1; mode=block : le filtrage est activé et le navigateur bloque le rendu de la page si une tentative d'attaque de type XSS est détectée
1; report=<reporting-URI> :  le filtrage XSS est activé et le navigateur nettoie le code, si besoin, et envoie un rapport à l'adresse définie
La troisième possibilité est bien évidemment la plus sécurisée car plus radicale. C'est l'option qu'on a choisi d'implémenter.
```

`Header set X-XSS-Protection "1; mode=block"`


# Les attaques DOS [6] : 

1. Lien 1 : http://nginx.org/en/docs/http/ngx_http_limit_conn_module.html#limit_conn
1. Lien 2 : https://www.abyssproject.net/2014/06/bloquer-les-attaques-ddos-nginx/

cmd :
`sudo nano /etc/nginx/nginx.conf`

Nous allons utiliser deux variables :

* `limit_req` : permet de limiter le nombre de requetes maximum par IP et par seconde
* `limit_conn` : permet de limiter le nombre de connexions maximum par IP

Au début du bloc http, on ajoute donc les lignes suivantes :

```
#Requete /s  maximum par ip 
limit_req_zone $binary_remote_addr zone=flood:10m rate=100r/s; 
limit_req zone=flood burst=100 nodelay; 
```
#Connexions maximum par ip 
```
limit_conn_zone $binary_remote_addr zone=ddos:10m; 
limit_conn ddos 100;
```

L’exemple ci-dessus permet de limiter une IP à 100 connexions simultanées ou 100 requêtes par seconde. Si une personne devait dépasser l’une de ces limites le serveur lui servirait alors d'une erreur 503.


# Rkhunter [8] :
1. Lien 1: https://doc.ubuntu-fr.org/rkhunter
1. Lien 2: https://doc.ubuntu-fr.org/rootkit


```
#1.Installation
apt-get install rkhunter

#2.Configuration
nano /etc/default/rkhunter

REPORT_EMAIL="mohamed-amine.mouloudi@etu.univ-lyon1.com" 
CRON_DAILY_RUN="yes" 
```
Spécifiez l’option « REPORT_EMAIL » pour l'envoie ses résumés de logs par mail.


# MIME Confusion Attack [9]

1. https://stackoverflow.com/questions/18337630/what-is-x-content-type-options-nosniff
2.     https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
3.     https://github.blog/2013-04-24-heads-up-nosniff-header-support-coming-to-chrome-and-firefox/
4.     https://en.wikipedia.org/wiki/Drive-by_download
5.     https://www.veracode.com/blog/2014/03/guidelines-for-setting-security-headers
