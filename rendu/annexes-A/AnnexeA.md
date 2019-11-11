# Annexe A
### Mise en place de HTTPS [1]

1. Génération de clé RSA :

    `sudo openssl genrsa -aes256 -passout pass:"AllaWalid" -out Privatekey.key 4096`
2. Modification des droits sur la clé créée

    `sudo chmod 400 Privatekey.key`

3. Génération du certificat auto-signé : 

     `openssl req -passin pass: "Allawalid"-key Privatekey.key -new -x509 -days 3650 -sha256 -out server.crt` 

4. Configuration du serveur nginx :	
	
```
server {
   listen       443 ssl;
   server_name  _;
   ssl_password_file /etc/nginx/ssl/pass;
   ssl_certificate_key /etc/nginx/ssl/Privatekey.key;
   location / {
     include /etc/nginx/conf.d/proxy_set_header.inc;
     proxy_pass http://nodejs;
   }
}
```

5. relance le processus nginx :

	`service nginx restart`

6. Génération d'un certificat signé TIW4-SSI-CAW Certificate Authority
- génération d'une demande de signature csr

`openssl req -new -sha256 -key Privatekey.key -out demande.csr`

- Signer la demande de certification avec TIW4-SSI-CAW CA :

`openssl x509 -req –passin pass:”Allawalid” -in demande.csr -days 365 -CA root-ca-tiw4.cert -CAkey root-ca-tiw4.key -CAcreateserial  -out certificatSigne.crt`

8. Paramétrer nginx pour quil utilise le nouveau certificat en ajoutant :

`ssl_certificate /etc/nginx/ssl/certificatSigne.crt;`


10. Rediriger les requêtes en HTTP vers HTTPS
Ajouter le return 301 (permanant) dans le fichier `/etc/nginx/sites-available/default`
```
return 301 https://192.168.76.211/;
```

### Désactivation des version TLS v1.0 et v1.1 [2]
1. Dans le fichier de configuration nginx `/etc/nginx/nginx.conf`, on change la ligne :

`ssl_protocols TLSv1 TLSv1.1 TLSv1.2` par `ssl_protocols TLSv1.2;`

2. Redimarer nginx
`service nginx restart`

### Désactivation de l'entête X-XSS-Protection [3]
On ajoute cette ligne a la configuration nginx :
`Header set X-XSS-Protection "1; mode=block"`
Dont la valeur `1; mode=block` signifie que le filtrage est activé et le navigateur bloque le rendu de la page si une tentative d'attaque de type XSS est détectée. [ref](https://geekflare.com/http-header-implementation/#X-XSS-Protection)

### Désactivation de l'entête [4]
On ajoute la ligne suivante a `nginx.conf` :
`proxy_hide_header X-Powered-By;`

### Limiter le nombre de requetes par IP [5]
Dans le fichier de configuration `/etc/nginx/nginx.conf`, on ajoute donc les lignes suivantes au bloque http [ref](http://nginx.org/en/docs/http/ngx_http_limit_conn_module.html#limit_conn):

```
#Requete /s  maximum par ip 
limit_req_zone $binary_remote_addr zone=flood:10m rate=100r/s; 
limit_req zone=flood burst=100 nodelay; 
limit_conn_zone $binary_remote_addr zone=ddos:10m; 
limit_conn ddos 100;
```
Où :

* `limit_req` : permet de limiter le nombre de requetes maximum par IP et par seconde
* `limit_conn` : permet de limiter le nombre de connexions maximum par IP

