# Déploiement du site CBK sur Hostinger avec Node.js

Le site utilise un serveur Node.js pour servir les pages HTML existantes. La page d'accueil actuelle (`CBK_homepage_V4_logo_footer.html`) s'affiche à la racine du domaine (`/`) et avec `/index.html`.

Les pages HTML sont enrichies à l'affichage par `site.js` pour relier les menus, la recherche, les favoris et les demandes de réservation. Espace Pro possède une page et une API Node.js dédiées : création de compte réservée à l'administrateur, connexion, session sécurisée, téléchargement protégé des PDF et demandes de catalogues.

## Vérifier en local

Installez Node.js 18 ou une version plus récente, ouvrez un terminal dans ce dossier et lancez :

```sh
npm start
```

Ouvrez ensuite `http://localhost:3000` dans votre navigateur. Utilisez le formulaire de connexion de `/espace-pro.html` avec l’identifiant local `admin@cbk.local` et le mot de passe stocké dans `.local-data/admin-password`; le rôle admin ouvre le tableau privé `/admin-cbk.html`. Les professionnels utilisent ce formulaire avec leurs identifiants pro. L’API publique d’inscription est désactivée.

## Configurer le backend Espace Pro

Le backend utilise MySQL et crée ses tables automatiquement au premier accès. Créez une base et un utilisateur MySQL dans Hostinger, puis ajoutez ces variables dans les paramètres de l'application Node.js. Les noms sont également fournis dans [`.env.example`](.env.example) ; remplacez les exemples par les vraies valeurs avant de les saisir dans hPanel :

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=nom_de_la_base
DB_USER=utilisateur_mysql
DB_PASSWORD=mot_de_passe_mysql
ADMIN_EMAIL=admin@votre-domaine.tn
ADMIN_PASSWORD=mot_de_passe_long_unique_a_generer
NODE_ENV=production
```

Dans hPanel, créez la base et l’utilisateur sous **Websites → Manage site → Databases → Management**. Copiez le nom de base, l’utilisateur et le mot de passe complets, préfixes compris. Hostinger indique `127.0.0.1` et le port `3306` pour une application Node.js hébergée chez eux. Générez un mot de passe admin long et unique avec un gestionnaire de mots de passe.

Ajoutez les vraies valeurs dans les variables d’environnement hPanel, jamais dans les fichiers du projet ou dans Git. `ADMIN_EMAIL` est l’identifiant unique de l’administrateur et `ADMIN_PASSWORD` son mot de passe. Depuis le formulaire unique de `/espace-pro.html`, saisissez ces deux valeurs : le rôle admin ouvre une session et redirige vers `/admin-cbk.html`. Les professionnels utilisent le même formulaire avec leurs identifiants pro et arrivent dans leur espace habituel. Les API admin acceptent uniquement cette session authentifiée, sans clé admin parallèle. Ne créez pas de variable `PORT` : Hostinger fournit le port d’écoute, et `server.js` le lit déjà.

Déposez les PDF destinés aux professionnels dans `documents/pro/`. L'API ne les liste et ne les transmet qu'aux comptes actifs. Aucun PDF n'est fourni dans le dossier actuel.

La connexion à la base Hostinger utilise `127.0.0.1` et MySQL. Consultez la [documentation Hostinger de connexion MySQL à une application Node.js](https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/).

## Déployer depuis hPanel

1. Vérifiez que le forfait prend en charge les applications Node.js, puis ouvrez **Websites → Create site → Web App** dans Hostinger.
2. Choisissez le domaine (ou temporaire), puis **Import your Git repository**. Connectez GitHub et sélectionnez `code-web25896/la-selection-cbk`, branche `main`.
3. Réglez le déploiement : framework **Other**, Node.js **24.x**, racine `/`, gestionnaire **npm**, commande de build **None**. Le projet a le script `npm start` et l’entrée `server.js`; sélectionnez `server.js` si l’écran demande un fichier d’entrée. Aucun dossier de sortie n’est requis.
4. Dans **Environment variables**, ajoutez chaque variable du bloc ci-dessus avec les valeurs réelles (ne copiez pas les valeurs d’exemple). Le port est fourni automatiquement par Hostinger.
5. Cliquez **Deploy**. Hostinger installe les dépendances à partir de `package-lock.json` et lance le script de démarrage. Les tables MySQL et le catalogue initial sont créés au premier accès API.
6. Quand le tableau de bord indique que l’application est en marche, ouvrez le domaine, vérifiez l’accueil et `/espace-pro.html`, puis connectez-vous avec `ADMIN_EMAIL` et `ADMIN_PASSWORD`. Activez HTTPS/SSL depuis hPanel si nécessaire.

L’hébergement Node.js géré nécessite un forfait compatible Business/Unlimited ou Cloud ; un VPS demande une configuration manuelle différente. Les menus exacts peuvent varier selon le forfait et l'interface du compte. Consultez le [guide Hostinger pour ajouter une application Node.js](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) et leur guide sur les [variables d’environnement](https://www.hostinger.com/support/how-to-add-environment-variables-during-node-js-application-deployment/).

## Pages présentes

- Accueil : `CBK_homepage_V4_logo_footer.html`
- Bonnes affaires : `bonnes-affaires.html`
- Catalogue carrelage : `catalogue-carrelage.html`
- Catalogue robinetterie : `catalogue-robinetterie.html`
- Catalogue sanitaire : `catalogue-sanitaire.html`
- Marques : `marques.html`
- Collection Aura : `collection-aura.html`
- Collections ajoutées depuis l’administration : `/collection.html?slug=<identifiant>`
- Fiches des produits ajoutés depuis l’administration : `/produit.html?slug=<identifiant>`
- Fiche produit Aura : `CBK_fiche_produit_Aura_V2_logo_footer.html` (accessible via `/fiche-produit-aura.html`)
- Espace Pro : `espace-pro.html`
- Administration CBK : `admin-cbk.html` (accès protégé par identifiant et mot de passe)

`index.html` sert la page d'accueil actuelle, `collection-aura.html` présente Aura et renvoie vers son unique fiche produit, et `fiche-produit-aura.html` ouvre cette fiche Aura. Le catalogue Robinetterie liste les deux références de douche déjà présentes dans les données du catalogue sanitaire ; les autres références de robinetterie restent à fournir par CBK. La page Marques reprend les marques et liens présents dans les catalogues actuels.

La table complète des routes pages et API se trouve dans [ROUTES.md](ROUTES.md).

Le backend Espace Pro garde les comptes, sessions et demandes de catalogues en MySQL, hache les mots de passe des professionnels avec `scrypt`, et limite les tentatives de connexion et de demande. La création des accès est réservée à l'administration et chaque compte est activé par celle-ci. Le tableau admin contient aussi les commandes à confirmer/refuser et la gestion des liens produits-collections.

Les demandes de réservation, commande et inscription à la newsletter ouvrent WhatsApp avec un message prérempli afin que CBK puisse traiter la demande. Une inscription automatisée à une liste et les paiements en ligne demandent encore le fournisseur choisi par CBK et ses identifiants de configuration, à ajouter dans les variables sécurisées de l'hébergement.

Le panier est partagé entre les pages et conservé dans le navigateur. L’envoi d’une commande crée une demande en statut `pending` dans MySQL en production ou dans `.local-data/shop-orders.json` en aperçu local. Le panier n’encaisse pas de paiement : CBK confirme le prix, le stock et le retrait avant de communiquer le moyen de paiement. Les commandes peuvent être consultées par `GET /api/admin/shop/orders` et leur statut modifié via `POST /api/admin/shop/orders/<référence>`, avec une session admin CBK.
