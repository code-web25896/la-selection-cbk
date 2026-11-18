# Routes du site CBK

## Pages

| Route | Destination |
| --- | --- |
| `/` et `/index.html` | Accueil et sections du site |
| `/univers.html` | Section Produits de l’accueil |
| `/collections.html` | Section Collections de l’accueil |
| `/inspirations.html` | Section Inspirations de l’accueil |
| `/projets.html` | Section Projets de l’accueil |
| `/showrooms.html` | Section Showrooms de l’accueil |
| `/contact.html` | Section Contact de l’accueil |
| `/catalogue-carrelage.html` | Catalogue carrelage, filtres et recherche |
| `/catalogue-sanitaire.html` | Catalogue sanitaire, filtres et recherche |
| `/catalogue-robinetterie.html` | Références de douche présentes et contact pour la gamme complète |
| `/bonnes-affaires.html` | Offres et filtres |
| `/marques.html` | Marques présentes dans les catalogues |
| `/collection-aura.html` | Présentation Aura et lien vers son unique fiche produit |
| `/collection.html?slug=<identifiant>` | Collection créée dans l’administration et produits qui lui sont associés |
| `/produit.html?slug=<identifiant>` | Fiche produit générée à partir des données du catalogue |
| `/fiche-produit-aura.html` | Fiche Aura existante |
| `/espace-pro.html` | Connexion pro, catalogues protégés et demandes de catalogues; création de compte par l’administration uniquement |
| `/admin-cbk.html` | Administration privée CBK : catalogue, images, PDF, comptes Pro et messages contact |

## API Espace Pro

| Méthode | Route | Accès |
| --- | --- | --- |
| `POST` | `/api/pro/login` | Public, ouvre une session pour un compte approuvé |
| `POST` | `/api/pro/logout` | Session professionnelle |
| `GET` | `/api/pro/me` | Session professionnelle |
| `GET` | `/api/pro/documents` | Compte approuvé |
| `GET` | `/api/pro/documents/<nom-du-pdf>` | Compte approuvé |
| `GET`, `POST` | `/api/pro/catalogue-requests` | Session professionnelle |
| `POST` | `/api/admin/pro/account` | Session admin CBK requise; `action: create` crée et active un compte |
| `GET` | `/api/admin/pro/users` | Session admin CBK requise, gestion des comptes professionnels |
| `GET` | `/api/admin/pro/catalogue-requests` | Session admin CBK requise, demandes des professionnels |
| `GET`, `POST` | `/api/admin/catalogue/entries` | Session admin CBK requise, produits et collections |
| `GET`, `POST` | `/api/admin/assets` | Session admin CBK requise, PDF et téléversements |
| `GET`, `POST` | `/api/admin/contact/messages` | Session admin CBK requise, messages reçus |
| `GET` | `/api/catalogue/entries` | Catalogue public actif, filtres par type et univers |
| `GET` | `/api/catalogue/entries?kind=product&collectionSlug=<slug>` | Produits actifs associés à une collection |
| `GET` | `/api/catalogue/brands` | Marques actives, logos, présentations et univers associés |
| `GET`, `POST` | `/api/admin/catalogue/brands` | Session admin CBK requise, création et gestion des marques |
| `POST` | `/api/shop/orders` | Public, enregistre une demande de commande |
| `GET` | `/api/admin/shop/orders` | Session admin CBK requise, liste des commandes |
| `POST` | `/api/admin/shop/orders/<référence>` | Session admin CBK requise, mise à jour du statut |

Dans le tableau privé, l’onglet Commandes permet de confirmer (statut `processing`) ou refuser (statut `cancelled`) une commande en attente. Le formulaire de contenu permet d’ajouter des marques, des collections et des produits associés à une collection.

Les comptes ne peuvent pas être créés par le public. Le formulaire de connexion unique sur `/espace-pro.html` reconnaît l’identifiant `ADMIN_EMAIL` et le mot de passe `ADMIN_PASSWORD`; il redirige alors vers le tableau privé `/admin-cbk.html`. Les professionnels utilisent ce même formulaire avec leurs propres identifiants. La configuration des variables admin est décrite dans [DEPLOIEMENT-HOSTINGER.md](DEPLOIEMENT-HOSTINGER.md).
