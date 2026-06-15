# Rapport d'audit — Power (e-commerce)

Audit multi-agents read-only · 230 problèmes confirmés (154 par audit + 76 par vérification adverse · 2 faux positifs écartés)

## Synthèse

| Gravité | Nombre |
|---|---|
| 🔴 critical | 12 |
| 🟠 high | 47 |
| 🟡 medium | 78 |
| ⚪ low | 93 |

| Catégorie | Nombre |
|---|---|
| bug | 92 |
| db-inconsistency | 30 |
| ux | 28 |
| missing-display | 27 |
| admin-client-mismatch | 23 |
| translation | 14 |
| security | 10 |
| config | 6 |

## Routes / fonctions cassées (broken)

- **app/actions/delivery.ts reserveDeliverySlot** `app/actions/delivery.ts` — Incremente DeliverySlot.currentOrders. JAMAIS appele nulle part -> code mort, les creneaux ne se remplissent jamais.
- **PUT /api/admin/products/[id]** `app/api/admin/products/[id]/route.ts` — Met a jour un produit. Aucune validation Zod; parseFloat('') => NaN pour purchasePrice vide => crash Prisma; categoryId ecrase avec '' depuis l'UI d'edition.
- **ProductsPage (admin UI)** `app/admin/products/page.tsx` — CRUD produits/compositions. L'edition perd la categorie; champ margin absent; toggle status incoherent; pas de margin dans le form.
- **StockPage (admin UI)** `app/admin/stock/page.tsx` — Gestion stock parallele (purchasePrice/margin/sellingPrice). 'Ajouter Produit' n'ecrit qu'en state local (jamais persiste); 'Modifier' non cable; calcule sellingPrice = achat*(1+marge) divergent du modele.
- **ProductsPage (client)** `app/produits/page.tsx` — Catalogue client: findMany SANS where inStock=true => affiche/vend les produits mis 'hors ligne' ou en rupture par l'admin.
- **AccountingPage (admin)** `app/admin/accounting/page.tsx` — Affiche des marges produits codees en dur (33.3/46.4/41.8%) au lieu du champ Product.margin reel.
- **ProductModal (desktop)** `components/product/product-modal.tsx` — Modal detail produit avec selecteur Quantite + Conditionnement (Premium +0.50€). Le total affiche inclut le surcout mais addToCart n'envoie que productId+quantity: conditionnement et surcout perdus.
- **ProductBottomSheet (mobile)** `components/product/product-bottom-sheet.tsx` — Equivalent mobile du modal. Meme bug: conditionnement Premium affiche dans le total mais jamais transmis a addToCart.
- **getCompositionsByTypes** `app/actions/compositions.ts` — Server action pour recuperer compositions par types. DEAD CODE: jamais importee nulle part (les pages requetent Prisma directement).
- **Stripe checkout (composition price)** `app/api/stripe/checkout/route.ts` — Facture les compositions au seul basePrice, ignore customData.totalPrice (taille/ingredients). Sous-facturation.
- **Orders place (composition price)** `app/api/orders/place/route.ts` — Total commande calcule au basePrice uniquement, ignore customData. Incoherent avec le total affiche au panier.
- **CommandePage** `app/commande/page.tsx` — Page de finalisation (livraison/retrait, adresse, promo, paiement cash/CB). Redirige vers success avec order_id que la page success ignore.
- **POST /api/stripe/checkout** `app/api/stripe/checkout/route.ts` — Cree Order pending + session Stripe. Code mort (aucun appelant UI). Prix composition = basePrice seulement (ignore ingredients/taille/quantite customData).
- **CheckoutSuccessPage** `app/checkout/success/page.tsx` — Lit uniquement session_id. Pour le flux cash (order_id) -> toujours etat fallback generique.
- **POST /api/admin/orders/[id]/validate** `app/api/admin/orders/[id]/validate/route.ts` — Doit valider une commande pending. JAMAIS appelee par l'UI; ne genere NI invoiceNumber NI pickupCode; n'envoie aucun email.
- **GET /api/invoices/[orderId]** `app/api/invoices/[orderId]/route.ts` — Genere la facture HTML. Math fausse si remise (sous-total+livraison != total), ligne remise absente, adresse vendeur erronee, TVA absente du detail.
- **NewsletterPage** `app/newsletter/page.tsx` — Page d'inscription newsletter. Champ email + bouton purement decoratifs: aucun onClick/onSubmit/action, aucune ecriture en base. L'inscription ne fait rien.
- **sendContactNotification** `lib/email.ts` — Fonction d'email de notification de contact JAMAIS appelee nulle part (code mort).
- **sendWelcomeEmail** `lib/email.ts` — Email de bienvenue defini mais JAMAIS appele: le register ne l'invoque pas. Aucun email a l'inscription.
- **sendInvoiceEmail** `lib/email.ts` — Email de facture defini mais JAMAIS appele nulle part (code mort).
- **POST /api/auth/forgot-password** `app/api/auth/forgot-password/route.ts` — Genere le token et envoie l'email reset MAIS depuis 'noreply@power-primeur.com' (avec tiret) au lieu du domaine reel powerprimeur.com: l'envoi Resend echoue (domaine non verifie).
- **getAvailableDeliverySlots** `app/actions/delivery.ts` — Server action lue par le calendrier client. Filtre par date/isActive et currentOrders<maxOrders. Fenetre de requete date a largeur nulle -> ne matche pas les creneaux stockes.
- **reserveDeliverySlot** `app/actions/delivery.ts` — Incremente currentOrders d'un creneau. JAMAIS appelee nulle part -> currentOrders reste toujours 0.
- **DeliveryCalendar** `components/delivery/delivery-calendar.tsx` — Calendrier client de choix date+creneau. Tombe sur des creneaux par defaut codes en dur quand la DB ne renvoie rien; ne respecte pas les jours de livraison; ne renvoie pas l'id du creneau choisi.
- **CommandePage (checkout)** `app/commande/page.tsx` — Page de finalisation: choix mode, adresse, DeliveryCalendar, promo, paiement. Envoie deliveryDate au format FR non parsable et deliveryTime au lieu d'un slotId.
- **POST /api/orders/place** `app/api/orders/place/route.ts` — Cree une commande auto-validee (especes/CB livraison). Stocke deliveryDate via new Date(string FR) -> Invalid Date; n'incremente jamais currentOrders du creneau.
- **POST /api/stripe/checkout** `app/api/stripe/checkout/route.ts` — Cree commande pending + session Stripe. Meme bug de parsing deliveryDate; ne reserve jamais le creneau.
- **Team page** `app/admin/team/page.tsx` — Liste equipe, ajout employe, invitation, toggles permissions/statut. Lit accountCreated/hasAccount jamais renvoyes par l'API; toggles non persistes.
- **Customers page** `app/admin/customers/page.tsx` — Liste clients, filtres, modals. Edition type client / toggles notifications / generation code pro : tout local, aucune persistance API. Stats utilisent abandonedCarts=0 (toujours 0).
- **Stock page** `app/admin/stock/page.tsx` — Inventaire, alerte minimumStock, reapprovisionnement (persiste via POST). Mais 'Ajouter produit' n'ajoute qu'en local (pas d'API), upload facture ignore, edition non implementee.
- **Accounting page** `app/admin/accounting/page.tsx` — Comptabilite ENTIEREMENT mockee (expenses/productProfits en dur). Aucune requete DB. Export Excel = alert. Ajout charge mute un tableau module-level.
- **Analytics page** `app/admin/Analytics/page.tsx` — Dashboard analytics ENTIEREMENT mocke (CA, commandes, conversion, trafic, churn tous en dur). Aucune requete DB. Route a casse de dossier (majuscule A).
- **Settings page** `app/admin/settings/page.tsx` — Stub: 'Les parametres seront disponibles prochainement'. Aucune lecture/ecriture SiteSetting bien que le modele et getSiteSetting existent.
- **RecettesPage** `app/recettes/page.tsx` — Liste recettes mais lit recipe.preparationTime (champ inexistant) -> affiche 'undefined min'. Page orpheline.
- **NewsletterPage** `app/newsletter/page.tsx` — Bouton 'S'abonner' purement decoratif: pas de use client, pas d'onClick, pas de form/action. Inscription impossible. Page orpheline.
- **PaymentTab** `components/account/payment-tab.tsx` — Bouton 'Gérer mes moyens de paiement' qui POST vers /api/stripe/portal — route INEXISTANTE
- **Stripe portal route** `app/api/stripe/portal/route.ts` — MANQUANTE: seuls webhook et checkout existent sous app/api/stripe
- **Admin CustomersPage** `app/admin/customers/page.tsx` — Affiche/édite clientType, billingType, notifications mais les modifications ne sont JAMAIS persistées (mutation d'état local uniquement)
- **NavUser (admin)** `components/admin/nav-user.tsx` — Menu utilisateur admin LIVE en anglais: Account/Billing/Notifications/Log out
- **NavDocuments (admin)** `components/admin/nav-documents.tsx` — Dropdown LIVE en anglais: More/Open/Share/Delete

## Détail des problèmes par sous-système

### Base de données & schéma Prisma (24)

#### 🟠 DeliverySlot.currentOrders n'est jamais incremente : reserveDeliverySlot() est du code mort
- **Gravité/Catégorie**: high / db-inconsistency
- **Fichier**: `app/actions/delivery.ts:36-58`
- **Problème**: La fonction reserveDeliverySlot() qui fait `currentOrders: { increment: 1 }` n'est appelee NULLE PART dans le repo (verifie par grep : seul l'import/definition existe). Resultat : currentOrders reste a 0 pour toujours, les creneaux n'affichent jamais 'complet', getAvailableDeliverySlots() retourne toujours tous les creneaux comme disponibles, et la limite maxOrders n'est jamais respectee (sur-reservation possible). De plus le panier/commande (place/route.ts, stripe/checkout/route.ts) stocke le creneau comme une chaine libre dans Order.deliverySlot sans appeler reserveDeliverySlot.
- **Correctif proposé**: Appeler reserveDeliverySlot(slotId) (ou un increment atomique) lors de la creation de la commande dans app/api/orders/place/route.ts et app/api/stripe/checkout/route.ts (apres paiement reussi), et passer un vrai slotId. Idealement, retirer DeliverySlot.currentOrders au profit d'un comptage des Order, ou ajouter une relation deliverySlotId.

#### 🟠 Order.deliverySlot stocke une chaine libre deconnectee du modele DeliverySlot (aucune relation/FK)
- **Gravité/Catégorie**: high / db-inconsistency
- **Fichier**: `prisma/schema.prisma:109-113`
- **Problème**: Le modele Order n'a aucun champ deliverySlotId ni relation vers DeliverySlot. Le composant calendrier envoie deliveryTime = `${startTime} - ${endTime}` (ex '09:00 - 12:00') qui est ecrit tel quel dans Order.deliverySlot (String). Impossible de relier une commande au creneau reel, de compter les commandes par creneau, ou de garantir l'unicite/capacite. Les deux concepts 'creneau' sont donc completement separes en base.
- **Correctif proposé**: Ajouter `deliverySlotId String?` + relation `deliverySlot DeliverySlot? @relation(...)` sur Order, et `orders Order[]` sur DeliverySlot. Envoyer slot.id depuis le calendrier au lieu d'une chaine, et deriver currentOrders du nombre de commandes liees.

#### 🟠 Webhook Stripe : logique d'idempotence inversee — une commande non encore validee peut etre ignoree
- **Gravité/Catégorie**: high / bug
- **Fichier**: `app/api/stripe/webhook/route.ts:43-45`
- **Problème**: La condition `if (!existingOrder || existingOrder.status === "validated") return received` est censee assurer l'idempotence, mais le commentaire 'ne pas retraiter une commande deja validee' est correct uniquement pour le 2e cas. Le 1er cas (!existingOrder) est OK. Le vrai probleme : la commande est creee en statut 'pending' par checkout/route.ts ; si pour une raison le statut est deja autre que 'pending' (ex 'processing' pose manuellement), la commande ne sera jamais validee ni le stock decremente. La garde devrait verifier explicitement le statut attendu ('pending') et non se contenter d'exclure 'validated'. Surtout, aucun re-essai n'est possible : un seul webhook traite la commande.
- **Correctif proposé**: Remplacer par une garde explicite : ne traiter que si existingOrder existe ET status === 'pending', sinon return received. Utiliser une mise a jour conditionnelle (updateMany where status:'pending') pour eviter les races, et idealement decremente stock/vidage panier dans une transaction.

#### 🟠 Aucun utilisateur admin cree par le seed : impossible d'acceder a l'admin apres deploiement
- **Gravité/Catégorie**: high / bug
- **Fichier**: `prisma/seed.ts:10-149`
- **Problème**: Le seed cree categories, produits, compositions, FAQ — mais aucun User. Or middleware.ts et toutes les routes /api/admin exigent role === 'admin'. Apres un deploiement frais + seed, il n'existe aucun compte admin, et l'inscription publique (register/route.ts) force role:'user'. Personne ne peut donc administrer le site sans intervention manuelle en base.
- **Correctif proposé**: Ajouter dans seed.ts la creation d'un admin (email + bcrypt.hash d'un mot de passe, role:'admin'), idealement parametre par variable d'env (ADMIN_EMAIL/ADMIN_PASSWORD).

#### 🟠 Roles cashier/preparation/delivery cree-s par l'admin mais bloque-s partout (tout exige role 'admin')
- **Gravité/Catégorie**: high / admin-client-mismatch
- **Fichier**: `app/api/admin/team/route.ts:56`
- **Problème**: L'admin peut creer des employes avec role 'cashier','preparation','delivery' et l'UI team calcule un objet permissions granulaire (caisse, preparation, orders...). Mais middleware.ts et 37 controles d'API verifient uniquement role === 'admin' (grep : 37 occurrences `role !== "admin"`, 0 controle pour les autres roles). Ces employes ne peuvent acceder a AUCUNE page ni API admin : le systeme de roles/permissions est non fonctionnel.
- **Correctif proposé**: Centraliser un helper d'autorisation par role/permission (ex can(session,'orders')) et l'appliquer dans middleware + routes, au lieu de l'egalite stricte 'admin'. Ou documenter que seul 'admin' est supporte et masquer la creation d'autres roles.

#### 🟠 Domaine expediteur email incoherent : powerprimeur.com vs power-primeur.com
- **Gravité/Catégorie**: high / bug · _(repéré en vérification)_
- **Fichier**: `app/api/auth/forgot-password/route.ts:44`
- **Problème**: lib/email.ts:3 envoie tous les emails (confirmation commande, invitation equipe, marketing...) depuis 'noreply@powerprimeur.com' (sans tiret), tandis que forgot-password/route.ts:44 envoie depuis 'noreply@power-primeur.com' (AVEC tiret). Resend n'accepte l'envoi que depuis un domaine verifie : un seul des deux peut etre valide, donc l'autre flux d'emails echouera (erreur 403 'domain not verified' avalee par le try/catch). Concretement, soit la reinitialisation de mot de passe, soit toutes les autres notifications, ne partira jamais.
- **Correctif proposé**: Unifier sur un unique domaine verifie dans Resend (ex powerprimeur.com), centraliser FROM_EMAIL dans lib/email.ts et l'importer dans forgot-password/route.ts au lieu de redefinir le from.

#### 🟠 place/route.ts (paiement a la livraison) decremente le stock sans verification de disponibilite
- **Gravité/Catégorie**: high / bug · _(repéré en vérification)_
- **Fichier**: `app/api/orders/place/route.ts:118-157`
- **Problème**: La commande est creee directement en status 'validated' (ligne 122) puis le stock est decremente via Math.max(0, currentStock-quantity) (ligne 148) SANS aucun controle prealable de inStock ni de currentStock >= quantity. Un client peut commander un produit en rupture (currentStock=0) : la commande est validee, honoree, et le stock reste a 0. Combine a db-07 (getProducts ne filtre que inStock), c'est un sur-engagement reel de stock pour les commandes 'especes / CB a la livraison'. Aucune transaction n'entoure creation+decrement (Neon HTTP), donc echec partiel possible (commande creee, stock non decremente).
- **Correctif proposé**: Avant de creer la commande, recharger chaque produit et rejeter (400) si !inStock ou currentStock < quantity. Idealement decrement atomique conditionnel (update where currentStock>=quantity) et signaler la rupture.

#### 🟡 Champs admin supplier/origin/purchasePrice/margin jamais affiches cote client
- **Gravité/Catégorie**: medium / missing-display
- **Fichier**: `app/produits/[id]/page.tsx:54-95`
- **Problème**: Product possede supplier, origin (saisis cote admin/stock) mais la fiche produit client n'affiche que name, category, price, unit, organic, description. origin (Guadeloupe/Provence...) et supplier sont pourtant des arguments de vente pertinents pour une epicerie bio/locale et ne sont montres qu'a l'admin. purchasePrice/margin sont des champs internes (normal qu'ils restent admin), mais origin/supplier devraient apparaitre.
- **Correctif proposé**: Afficher product.origin et eventuellement product.supplier sur la fiche produit et la grille, ex 'Origine : Guadeloupe'.

#### 🟡 Produits filtres sur inStock uniquement : un produit a currentStock=0 reste vendable
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `app/actions/products.ts:7-12`
- **Problème**: getProducts() filtre `where: { inStock: true }`. Or inStock et currentStock peuvent diverger : un admin peut laisser inStock=true tout en ayant currentStock=0 (le formulaire produit admin gere inStock independamment), et la fiche produit detail (produits/[id]) ne verifie ni inStock ni currentStock du tout. Un client peut donc commander un produit en rupture, ce qui mene a un stock negatif borne a 0 (Math.max(0,...)) et a une commande honoree sans stock.
- **Correctif proposé**: Filtrer aussi sur currentStock>0 (ou maintenir inStock=currentStock>0 systematiquement), et bloquer l'ajout au panier / le checkout si stock insuffisant.

#### 🟡 BlogPost, Recipe, Partner : pages de lecture existantes mais aucun chemin d'ecriture ni seed -> toujours vides
- **Gravité/Catégorie**: medium / db-inconsistency
- **Fichier**: `app/actions/content.ts:18-60`
- **Problème**: getBlogPosts/getRecipes/getPartners lisent ces tables et des pages publiques existent (app/blog, app/recettes, app/partenaires). Mais aucune route/action ne cree/modifie BlogPost, Recipe ou Partner (grep create/update/delete => aucun resultat), et le seed n'en cree aucun. Ces sections seront donc systematiquement vides en production. Champs du schema definis mais jamais alimentes.
- **Correctif proposé**: Soit ajouter un CRUD admin (+seed initial) pour BlogPost/Recipe/Partner, soit retirer ces modeles/pages s'ils ne sont pas prevus pour le lancement.

#### 🟡 ContactMessage ecrit mais jamais lu : aucune boite de reception admin, flag 'read' inutilise
- **Gravité/Catégorie**: medium / missing-display
- **Fichier**: `app/actions/contact.ts:19-25`
- **Problème**: Le formulaire de contact persiste des ContactMessage en base, mais aucune page/route admin ne les liste, et le champ read (Boolean) n'est jamais mis a jour ni lu. Les messages clients sont donc inaccessibles a l'equipe.
- **Correctif proposé**: Ajouter une page admin listant les ContactMessage avec marquage read, ou envoyer le message par email a l'equipe via Resend en plus de la persistance.

#### 🟡 clientType / billingType exposes cote admin mais jamais renseignes (toujours 'particulier')
- **Gravité/Catégorie**: medium / admin-client-mismatch
- **Fichier**: `app/api/admin/customers/route.ts:42-43`
- **Problème**: User.clientType et billingType (default 'particulier') sont renvoyes au tableau de bord clients admin, mais aucun chemin d'ecriture ne les modifie : register/route.ts ne les set pas, updateUserProfile (account.ts) ne les gere pas, et il n'y a pas d'UI pour les editer. Ces colonnes affichent donc toujours 'particulier' pour tout le monde — donnee admin sans source.
- **Correctif proposé**: Ajouter la saisie de clientType/billingType (particulier/professionnel) a l'inscription ou au profil, ou retirer ces colonnes/affichages si non utilises.

#### 🟡 Page admin 'Stock' : l'ajout d'un produit n'est pas persiste (state local uniquement)
- **Gravité/Catégorie**: medium / db-inconsistency
- **Fichier**: `app/admin/stock/page.tsx:143-172`
- **Problème**: handleAddProduct() construit un StockItem avec id `STK-${Date.now()}` et fait seulement setStock([...stock, newItem]) sans aucun appel API. L'API /api/admin/stock n'expose d'ailleurs pas de creation de produit (POST = restock/ajustement). Le produit 'ajoute' disparait au rechargement et n'existe jamais en base — incoherence UI/DB.
- **Correctif proposé**: Faire pointer handleAddProduct vers POST /api/admin/products (qui cree reellement un Product) avec categoryId, ou retirer le bouton d'ajout de la page Stock.

#### 🟡 Champ 'margin' : semantique ambigue et incoherente entre saisie admin et donnees comptables
- **Gravité/Catégorie**: medium / db-inconsistency
- **Fichier**: `prisma/schema.prisma:74`
- **Problème**: Product.margin (Float?) est saisi par l'admin comme un POURCENTAGE de marge (stock/page.tsx calcule sellingPrice = purchasePrice * (1 + margin/100)) et affiche '{margin}%'. Mais il n'est jamais recalcule si price/purchasePrice changent via le formulaire produit (products/route.ts stocke price et margin independamment) : margin peut donc devenir incoherent avec (price - purchasePrice)/purchasePrice. La page comptabilite utilise par ailleurs des margins en dur (33.3, 46.4...). Aucune source de verite pour la marge.
- **Correctif proposé**: Definir margin comme valeur derivee (la calculer cote serveur a partir de price et purchasePrice) plutot que stockee, ou documenter l'unite (%) dans le schema et la recalculer a chaque update de price/purchasePrice.

#### 🟡 datasource db sans url = env("DATABASE_URL") : migrations / db push / Studio impossibles via CLI
- **Gravité/Catégorie**: medium / config · _(repéré en vérification)_
- **Fichier**: `prisma/schema.prisma:9-11`
- **Problème**: Le bloc datasource ne declare que 'provider = "postgresql"' sans 'url'. Au runtime l'URL vient de l'adaptateur Neon (lib/db.ts:40 / seed.ts:7), donc l'app fonctionne. MAIS les commandes Prisma CLI qui n'utilisent pas l'adaptateur (prisma migrate dev/deploy, prisma db push, prisma studio) exigent une url de datasource et echoueront avec 'Either url or directUrl must be provided'. Aucun fichier de migration n'est versionne, ce qui suggere que le schema est pousse a la main et que ce probleme bloquera tout deploiement reproductible du schema.
- **Correctif proposé**: Ajouter `url = env("DATABASE_URL")` (et idealement `directUrl = env("DIRECT_URL")` pour Neon pooler) dans le bloc datasource. Versionner les migrations (prisma migrate).

#### 🟡 Formats de numero de facture incoherents et non garantis uniques entre les deux flux de commande
- **Gravité/Catégorie**: medium / db-inconsistency · _(repéré en vérification)_
- **Fichier**: `app/api/orders/place/route.ts:115`
- **Problème**: invoiceNumber est @unique (schema.prisma:117) mais genere differemment selon le flux : webhook/route.ts:48 `FAC-${Date.now().toString(36)}-${orderId.slice(-4)}` vs place/route.ts:115 `FAC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2,6)}`. Math.random().toString(36).substring(2,6) peut produire moins de 4 caracteres (quand la fraction se termine par des zeros tronques) reduisant l'entropie, et deux commandes creees dans la meme milliseconde avec le meme suffixe declencheront une violation de contrainte unique => la commande echoue (500) apres coup. La numerotation de facture n'est ni sequentielle ni homogene (probleme comptable/legal en France).
- **Correctif proposé**: Centraliser la generation des numeros de facture (compteur sequentiel ou format date+sequence en base), unifier le format entre webhook et place, et garantir l'unicite (retry/upsert).

#### ⚪ @prisma/extension-accelerate en dependances mais jamais utilise (et adaptateur Neon HTTP a la place)
- **Gravité/Catégorie**: low / config
- **Fichier**: `lib/db.ts:1-42`
- **Problème**: package.json declare @prisma/extension-accelerate (^3.0.1) mais lib/db.ts et seed.ts utilisent PrismaNeonHttp sans .$extends(withAccelerate()). Dependance morte qui suggere une config Accelerate prevue puis abandonnee. L'adaptateur Neon HTTP ne supporte ni transactions interactives ni deleteMany efficace, d'ou les boucles item-par-item ailleurs — mais seed.ts utilise quand meme deleteMany (incoherent avec le commentaire 'Neon HTTP pas de deleteMany' du webhook).
- **Correctif proposé**: Retirer @prisma/extension-accelerate si non utilise, ou l'activer via $extends(withAccelerate()). Verifier que deleteMany fonctionne reellement avec l'adaptateur Neon HTTP utilise par le seed.

#### ⚪ RESEND_API_KEY requis a l'execution mais absent de la validation d'env (lib/env.ts)
- **Gravité/Catégorie**: low / config
- **Fichier**: `lib/env.ts:1-6`
- **Problème**: forgot-password, team/invite, marketing/send et lib/email utilisent new Resend(process.env.RESEND_API_KEY). Si la cle manque, les envois echouent silencieusement (try/catch) ou avec une cle undefined. Pourtant RESEND_API_KEY n'est pas dans requiredEnvVars de lib/env.ts, donc aucun avertissement au demarrage.
- **Correctif proposé**: Ajouter RESEND_API_KEY (et eventuellement NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY / NEXT_PUBLIC_APP_URL) a requiredEnvVars dans lib/env.ts.

#### ⚪ Mode mock silencieux de Prisma masque l'absence de DB en production
- **Gravité/Catégorie**: low / security
- **Fichier**: `lib/db.ts:17-38`
- **Problème**: Si DATABASE_URL est vide/contient 'xxx'/'placeholder', makePrisma() renvoie un Proxy mock qui retourne [] / null sans erreur. Combine a lib/env.ts qui ne fait que warner en production, l'app peut demarrer 'verte' en prod sans base : inscriptions, commandes et paiements sembleront fonctionner cote UI mais ne persisteront rien. Risque eleve de perte de donnees silencieuse.
- **Correctif proposé**: En NODE_ENV=production, lever une erreur fatale si DATABASE_URL manquant (dans lib/env.ts et/ou lib/db.ts) au lieu d'activer le mock silencieux.

#### ⚪ Schema Zato des preferences autorise language 'en' alors que l'app est exclusivement francophone
- **Gravité/Catégorie**: low / translation
- **Fichier**: `app/actions/preferences.ts:13-14`
- **Problème**: UserPreference.language default 'fr', mais le schema Zod accepte z.enum(['fr','en']) et theme ['light','dark','system']. L'app etant 100% francophone et sans i18n, 'en' est une option morte qui peut etre stockee sans effet (incoherence donnee/feature).
- **Correctif proposé**: Restreindre l'enum a ['fr'] (ou retirer le champ language) tant que le multi-langue n'est pas implemente.

#### ⚪ Tokens de reset password stockes en clair dans SiteSetting (table de config publique en lecture)
- **Gravité/Catégorie**: low / security
- **Fichier**: `app/api/auth/forgot-password/route.ts:27-37`
- **Problème**: Le token de reinitialisation et son expiration sont stockes en clair dans SiteSetting sous la cle `reset_<userId>` (workaround 'sans changement de schema'). SiteSetting est aussi lu publiquement via getSiteSetting(key) (content.ts) : meme si la cle est devinable seulement avec l'userId, melanger des secrets a une table de configuration generale est risque et pollue cette table. Le token n'est pas hashe.
- **Correctif proposé**: Creer un modele dedie PasswordResetToken (userId, tokenHash, expiresAt) avec token hashe (sha256), ou au minimum s'assurer que getSiteSetting ne peut pas exposer les cles 'reset_*'.

#### ⚪ Order n'a pas de onDelete sur la relation user et OrderItem.priceAtPurchase peut diverger du total
- **Gravité/Catégorie**: low / db-inconsistency
- **Fichier**: `prisma/schema.prisma:103-104`
- **Problème**: Order.user @relation(fields:[userId],references:[id]) n'a pas d'onDelete : par defaut Prisma/Postgres bloque la suppression d'un User ayant des commandes (Restrict), ce qui peut etre voulu mais n'est pas explicite, alors que d'autres relations (OrderItem->Order Cascade, Product/Composition->SetNull) sont explicites. Incoherence de strategie onDelete a documenter. Par ailleurs OrderItem.priceAtPurchase capture le prix mais Order.total est calcule a part (subtotal-discount+fee) sans verification de coherence stockee.
- **Correctif proposé**: Definir explicitement onDelete sur Order.user (Restrict ou Cascade selon le besoin metier) pour homogeneiser, et documenter que total = somme(priceAtPurchase*qty) - discount + deliveryFee.

#### ⚪ Nettoyage du seed incomplet : promoCode, deliverySlot, blogPost, recipe, partner, contactMessage, siteSetting, userPreference jamais purges
- **Gravité/Catégorie**: low / db-inconsistency · _(repéré en vérification)_
- **Fichier**: `prisma/seed.ts:14-21`
- **Problème**: Le seed deleteMany() ne nettoie que cartItem, cart, orderItem, order, product, composition, category, faq. Les tables PromoCode, DeliverySlot, BlogPost, Recipe, Partner, ContactMessage, SiteSetting, UserPreference (et User) ne sont jamais purgees. Re-executer le seed laissera des donnees residuelles incoherentes (ex anciens DeliverySlot avec currentOrders obsoletes, anciens PromoCode). Le seed se veut idempotent ('Nettoyer les anciennes donnees') mais ne l'est que partiellement.
- **Correctif proposé**: Soit completer la liste de deleteMany pour toutes les tables seedees/derivees, soit utiliser des upsert idempotents et ne pas se fier au deleteMany partiel.

#### ⚪ GET /api/admin/products expose origin/supplier/purchasePrice/margin mais champs jamais consommes par la fiche client (donnee retournee, jamais rendue cote vente)
- **Gravité/Catégorie**: low / missing-display · _(repéré en vérification)_
- **Fichier**: `app/api/admin/products/route.ts:56-72`
- **Problème**: L'API admin formate et renvoie supplier, origin, purchasePrice, margin (lignes 68-71) et renomme price->selling_price, currentStock->current_stock (snake_case cote API, camelCase ailleurs : autre incoherence de nommage entre cette route et /api/admin/stock qui renvoie productName/sellingPrice). origin/supplier sont donc disponibles cote admin mais, comme confirme en db-06, jamais affiches cote client. Ce mapping snake_case isole (selling_price, current_stock, minimum_stock, is_organic, image_url) ne correspond a aucun autre endpoint (stock route et schema en camelCase), source de bugs de binding cote front.
- **Correctif proposé**: Harmoniser la convention de nommage des champs entre /api/admin/products et /api/admin/stock (choisir camelCase), et exposer origin/supplier dans la fiche produit client.


### Auth & création de compte (17)

#### 🟠 Le flux reset password n'utilise PAS de champ token en base (aucun resetToken dans le schema User) — contournement fragile via SiteSetting
- **Gravité/Catégorie**: high / db-inconsistency
- **Fichier**: `app/api/auth/forgot-password/route.ts:27-37`
- **Problème**: Le modele User du schema (prisma/schema.prisma lignes 13-35) ne possede AUCUN champ resetToken/resetTokenExpiry/verificationToken. Pour contourner cette absence, forgot-password stocke le token dans le modele SiteSetting (cle key=reset_<userId>, value=JSON). SiteSetting est une table de configuration globale (cle/valeur unique), detournee ici pour des secrets utilisateurs. Le flux 'fonctionne' techniquement mais: (1) pollue la table de config avec des entrees reset_* (les tokens expires non utilises ne sont jamais nettoyes — seul reset-password supprime, jamais forgot-password en cas de re-demande remplace mais laisse les orphelins si l'utilisateur ne finalise pas), (2) pas d'index/relation, pas de cascade onDelete: supprimer un User laisse son token orphelin, (3) couplage avec un modele non prevu pour ca. Le proprietaire demandait explicitement si 'le flux reset peut reellement marcher' alors qu'il n'y a pas de champ token au schema: la reponse est qu'il marche uniquement via ce hack.
- **Correctif proposé**: Ajouter au modele User les champs `resetToken String? @unique` et `resetTokenExpiry DateTime?` (ou creer un modele dedie PasswordResetToken avec relation onDelete: Cascade vers User), migrer, et remplacer le stockage SiteSetting par ces champs. Ajouter un nettoyage des tokens expires.

#### 🟠 ProfileTab declare et soumet country/companyName/siret qui n'existent ni dans le schema ni dans updateUserProfile — donnees pro silencieusement perdues
- **Gravité/Catégorie**: high / db-inconsistency
- **Fichier**: `components/account/profile-tab.tsx:26-29, 69`
- **Problème**: profile-tab.tsx initialise formData avec country, companyName, siret (lignes 26-28) et envoie l'objet complet formData a updateUserProfile (ligne 69). Or le schema User (schema.prisma 13-35) ne contient aucun de ces 3 champs, et updateProfileSchema (app/actions/account.ts:7-14) ne les liste pas — Zod les ignore donc silencieusement. Pour une epicerie qui distingue clientType particulier/restaurant et billingType pro (schema lignes 23-24), l'absence de companyName/siret signifie qu'un client professionnel ne peut jamais enregistrer sa raison sociale ni son SIRET malgre des champs prevus dans le code: incoherence admin/client (l'admin classe en 'restaurant'/'pro' mais le client n'a aucun moyen de saisir ses infos pro). Ici les champs ne sont meme pas rendus dans le JSX (seulement dans le state), donc c'est aussi du code mort/incomplet.
- **Correctif proposé**: Soit retirer country/companyName/siret du state s'ils ne sont pas voulus, soit (recommande pour les clients pro) ajouter companyName/siret au schema User, a updateProfileSchema, et rendre les champs dans le formulaire, conditionnes a billingType=pro.

#### 🟠 clientType / billingType: saisis/modifies cote admin et seedes par defaut, mais JAMAIS exposes ni modifiables cote client
- **Gravité/Catégorie**: high / admin-client-mismatch
- **Fichier**: `app/actions/account.ts:7-14`
- **Problème**: Le schema User a clientType (default 'particulier') et billingType (default 'particulier') lignes 23-24. Cote admin, app/admin/customers/page.tsx (lignes 316-322, 408-409, 466) affiche et permet de changer ces types, et l'API admin customers les renvoie (route.ts:42-43). Mais cote client: register (register/route.ts) ne les saisit jamais, updateProfileSchema (account.ts:7-14) ne les inclut pas, et ProfileTab ne les affiche pas. Resultat: un restaurant qui s'inscrit reste 'particulier' jusqu'a intervention manuelle d'un admin; le client ne sait jamais quel type/facturation lui est applique. Concept identique gere differemment entre admin (modifiable) et client (invisible).
- **Correctif proposé**: Ajouter un choix Particulier/Restaurant a l'inscription et/ou dans ProfileTab, l'inclure dans registerSchema et updateProfileSchema, et le persister. Aligner la terminologie (clientType vs billingType) entre admin et client.

#### 🟠 Aucun endpoint ne persiste les changements clientType/billingType de l'admin — la modale 'Modifier' ne fait que du setState local
- **Gravité/Catégorie**: high / bug · _(repéré en vérification)_
- **Fichier**: `app/admin/customers/page.tsx:143-153, 464-491`
- **Problème**: La page admin clients laisse croire qu'on peut changer le type de client (modale 'Modifier', Select clientType ligne 465-478). Mais handleChangeClientType (143-153) ne fait que `setCustomers(customers.map(... clientType: newType, billingType: ...))` en memoire React. Il n'existe AUCUN appel fetch vers une route de mutation, et le dossier app/api/admin/customers/ ne contient QUE route.ts avec une seule methode GET (verifie: ls + grep — aucune PATCH/PUT/POST sur clientType). Au rechargement de la page, loadCustomers() re-fetch les valeurs DB inchangees: le changement est perdu. De meme toggleNotification (155-167) et la generation de code pro (169-177) ne persistent rien. C'est de l'UI admin non cablee.
- **Correctif proposé**: Creer une route PATCH /api/admin/customers/[id] (protegee role==='admin') faisant prisma.user.update({ where:{id}, data:{ clientType, billingType } }), et appeler ce fetch dans handleChangeClientType/toggleNotification avant/au lieu du setState (ou re-fetch apres succes).

#### 🟡 Incoherence de longueur minimale de mot de passe: UI exige >=6, API register/reset exige >=8 — message d'erreur trompeur
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `app/connexion/page.tsx:69-72`
- **Problème**: connexion/page.tsx valide `formData.password.length < 6` -> 'au moins 6 caracteres' (lignes 69-72) et le champ Input a minLength={6} (ligne 221). De meme mot-de-passe-oublie/page.tsx ligne 58-61 exige >=6. Mais registerSchema (register/route.ts:8) exige min(8) et reset-password/route.ts:13 exige >=8. Un utilisateur saisissant un mot de passe de 6 ou 7 caracteres passe la validation client, puis l'API rejette avec 'Le mot de passe doit faire au moins 8 caracteres' (incoherence). Pire, le CredentialsProvider (auth.ts:34) exige aussi password.min(8): un compte ne pourrait de toute facon pas avoir <8, donc le seuil 6 cote UI est un piege a 100%.
- **Correctif proposé**: Uniformiser a 8 partout: passer le seuil client a 6->8 dans connexion/page.tsx (69, 221) et mot-de-passe-oublie/page.tsx (58, 183), et le message associe.

#### 🟡 AuthModal ne valide ni la longueur du mot de passe ni le password>=8 attendu par l'API — inscription via modale peut echouer sans message clair
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `components/auth/auth-modal.tsx:82-105`
- **Problème**: handleRegister dans auth-modal.tsx verifie seulement que password===confirmPassword (ligne 82-85) mais n'impose aucune longueur minimale (contrairement a connexion/page.tsx). L'Input a minLength={6} (ligne 238) mais register exige 8. De plus, apres signIn, l'erreur eventuelle de signIn n'est pas verifiee (ligne 108-112: `await signIn(...)` sans tester le resultat), donc onLoginSuccess est appele meme si la connexion auto echoue. La modale et la page connexion divergent en comportement pour le meme acte.
- **Correctif proposé**: Ajouter la validation password.length>=8 dans handleRegister, et tester le retour de signIn (`const r = await signIn(...)`) avant d'appeler onLoginSuccess; afficher une erreur si r?.error.

#### 🟡 GoogleProvider configure avec clientId/clientSecret = process.env.* (string|undefined) — login Google casse silencieusement si vars absentes, et GOOGLE_* ne sont pas validees
- **Gravité/Catégorie**: medium / config
- **Fichier**: `auth.config.ts:7-10`
- **Problème**: GoogleProvider recoit `clientId: process.env.GOOGLE_CLIENT_ID` (type string|undefined). Si les variables Google ne sont pas definies (elles ne figurent pas dans lib/env.ts requiredEnvVars), le bouton 'Continuer avec Google' (present dans connexion/page.tsx:294 et auth-modal.tsx:296) initie un flux OAuth avec clientId undefined -> erreur cote provider/redirection cassee, sans message utilisateur. lib/env.ts (1-6) ne valide que DATABASE_URL/AUTH_SECRET/STRIPE_*, donc l'absence des GOOGLE_* passe inapercue. RESEND_API_KEY (necessaire au reset password) n'est pas validee non plus.
- **Correctif proposé**: Soit masquer le bouton Google si les vars sont absentes, soit ajouter GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET et RESEND_API_KEY a lib/env.ts (au moins en warning) et utiliser `process.env.GOOGLE_CLIENT_ID!` avec un garde explicite.

#### 🟡 Utilisateurs OAuth Google crees avec password="" — peuvent etre 'connectes' via credentials? Non, mais bcrypt.compare sur hash vide echoue silencieusement, et aucun flux pour definir un mot de passe
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `auth.ts:71-79`
- **Problème**: Le signIn callback cree un User Google avec `password: ""` (ligne 76). Ce compte ne peut jamais se connecter via le formulaire credentials (bcrypt.compare('xxx','') renvoie false -> auth.ts:46-58 retourne null), ce qui est correct cote securite. MAIS il n'existe aucun flux pour qu'un utilisateur Google definisse un mot de passe local: s'il tente 'mot de passe oublie', reset-password fera bcrypt.hash et ecrira un vrai password — ce qui marche par chance. Le probleme principal: le password vide est stocke tel quel; si un jour la validation Zod du CredentialsProvider etait assouplie, un attaquant pourrait potentiellement matcher. C'est une dette de conception (pas de champ provider/emailVerified pour distinguer comptes OAuth vs locaux).
- **Correctif proposé**: Ajouter un champ `provider String?` ou `emailVerified DateTime?` au User pour distinguer les comptes OAuth, et bloquer explicitement la connexion credentials sur un compte sans password (verifier `if (!user.password) return null` dans authorize).

#### 🟡 lib/db bascule en 'mode mock' silencieux si DATABASE_URL absent: register renvoie null, login echoue, mais aucune erreur exploitable — comportement dangereux en prod
- **Gravité/Catégorie**: medium / security
- **Fichier**: `lib/db.ts:18-38`
- **Problème**: Si DATABASE_URL est vide/placeholder, makePrisma() renvoie un Proxy mock ou findUnique->null, create->null. Consequence sur l'auth: register/route.ts:40 `prisma.user.create(...)` renvoie null -> ligne 50 accede a `user.id` sur null => TypeError 500 (l'inscription plante). authorize() -> findUnique null -> 'return null' -> login echoue toujours. Le proprietaire pourrait croire l'app fonctionnelle (pas de crash au boot, juste warn console). En production avec une mauvaise config, tous les comptes seraient cassables sans signal clair.
- **Correctif proposé**: En production (NODE_ENV=production), faire echouer le build/boot si DATABASE_URL manquant plutot que de retourner un mock. A minima, dans register, verifier `if (!user) return 500` apres create.

#### 🟡 Tokens de reinitialisation orphelins jamais nettoyes en cas de demandes multiples ou suppression d'utilisateur
- **Gravité/Catégorie**: medium / db-inconsistency · _(repéré en vérification)_
- **Fichier**: `app/api/auth/forgot-password/route.ts:28-37`
- **Problème**: Le token reset est stocke dans SiteSetting key=`reset_<userId>`. SiteSetting n'a aucune relation/onDelete vers User (schema.prisma:207-213). Si un User est supprime, son entree reset_<id> reste orpheline indefiniment dans la table de configuration globale. Les tokens expires ne sont supprimes QUE lorsqu'un utilisateur ouvre reset-password apres expiration (reset-password/route.ts:32-34) — un token jamais utilise apres expiration reste pour toujours. forgot-password fait un upsert (donc remplace la demande precedente du meme user), mais ne purge jamais. Pollution progressive de la table de config (qui sert aussi a stocker de vrais reglages du site).
- **Correctif proposé**: Idealement ajouter resetToken/resetTokenExpiry au model User (avec onDelete naturel). A defaut, ajouter un job/cron de nettoyage des cles `reset_*` expirees, et idealement parser/valider le JSON dans un try/catch (reset-password:26 `JSON.parse(setting.value)` peut throw).

#### 🟡 ProfileTab n'expose pas clientType/billingType pourtant retournes par getUserProfile — donnee recuperee puis ignoree
- **Gravité/Catégorie**: medium / missing-display · _(repéré en vérification)_
- **Fichier**: `components/account/profile-tab.tsx:39-51`
- **Problème**: getUserProfile (account.ts:21-37) fait prisma.user.findUnique sans select restrictif, donc retourne TOUT l'objet User y compris clientType et billingType (schema 23-24). Mais loadProfile (profile-tab.tsx:39-51) ne lit que firstName/lastName/email/phone/address/city/postalCode et hardcode country/companyName/siret a "". clientType/billingType sont donc disponibles cote client mais jamais affiches — un client professionnel ne voit nulle part son statut. Combine a auth-03, le concept 'type de client' est totalement invisible cote client malgre la donnee disponible.
- **Correctif proposé**: Afficher (au moins en lecture seule) le clientType/billingType dans ProfileTab, ex. un badge 'Compte professionnel'/'Particulier', en consommant res.data.clientType/billingType.

#### ⚪ AuthModal utilise des classes de theme clair (bg-red-50, text-red-600, bg-background) incoherentes avec le theme noir de la page connexion et du reste de l'app
- **Gravité/Catégorie**: low / ux
- **Fichier**: `components/auth/auth-modal.tsx:168-169`
- **Problème**: L'app est en theme sombre (bg-black, zinc-900). La page connexion utilise bg-red-500/10 / text-red-400 pour les erreurs. Mais auth-modal.tsx utilise bg-red-50 / border-red-200 / text-red-600 (ligne 168-169) et bg-background (ligne 283), styles de mode clair, produisant un rendu visuellement incoherent. Le bouton utilise `btn-primary` (ligne 270) et `text-brand` (ligne 314), classes potentiellement non definies par le theme actuel (orange-500 ailleurs).
- **Correctif proposé**: Harmoniser les classes de la modale avec le theme sombre (bg-red-500/10, text-red-400, bg-zinc-900, orange-500) comme dans connexion/page.tsx.

#### ⚪ Le jwt callback de auth.config.ts (Edge) ne peut pas resoudre le role depuis la DB — au premier passage middleware le role peut etre absent
- **Gravité/Catégorie**: low / bug
- **Fichier**: `auth.config.ts:36-43`
- **Problème**: Il y a deux callbacks jwt: celui de auth.config.ts (Edge, lignes 36-43) qui ne fait que recopier user.role->token.role si present, et celui de auth.ts (Node, lignes 88-109) qui interroge la DB. Le middleware utilise UNIQUEMENT auth.config (NextAuth(authConfig)). Comme le token JWT est genere/signe par auth.ts au login (Node), le role y est bien present, donc le middleware le lit correctement APRES login. Mais l'authorize() factice de auth.config (ligne 17-19 retourne null) signifie que si jamais un flux passait par la config Edge pour authorize, il echouerait. C'est par conception (commentaire ligne 18) mais fragile: toute divergence entre les deux configs de callbacks peut desynchroniser le role.
- **Correctif proposé**: Documenter clairement l'invariant (le token est toujours emis par auth.ts) et ajouter un test verifiant que token.role est present apres login; eviter toute logique authorize divergente dans auth.config.

#### ⚪ seed.ts ne cree aucun utilisateur/admin — impossible de se connecter a l'admin sur une base fraichement seedee
- **Gravité/Catégorie**: low / db-inconsistency
- **Fichier**: `prisma/seed.ts:1-151`
- **Problème**: Le seed cree categories, produits, compositions, faq (lignes 25-143) mais aucun User. Or l'acces a /admin exige role='admin' (middleware.ts:25, admin/layout.tsx:27). Sur une base fraiche seedee, il n'existe aucun compte admin: le proprietaire ne peut pas acceder au back-office sans creer manuellement un user et passer son role a 'admin' en base. C'est une incoherence d'amorcage (seed) pour une app 'en production'.
- **Correctif proposé**: Ajouter dans seed.ts un prisma.user.create d'un compte admin (email connu, password bcrypt-hashe, role:'admin') idempotent (upsert sur email).

#### ⚪ reset-password: JSON.parse non protege et absence de validation de format peuvent renvoyer une 500 generique au lieu de 'Lien invalide'
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `app/api/auth/reset-password/route.ts:26`
- **Problème**: reset-password/route.ts:26 fait `const data = JSON.parse(setting.value)` sans try/catch local. Si la valeur de SiteSetting reset_<uid> n'est pas un JSON valide (corruption, ou collision de cle si un reglage legitime portait ce nom), JSON.parse throw et tombe dans le catch global ligne 49 -> 500 'Erreur serveur' au lieu d'un message 400 clair. Mineur car la valeur est ecrite par forgot-password, mais aucune defense.
- **Correctif proposé**: Entourer le JSON.parse d'un try/catch retournant un 400 'Lien invalide ou expiré', et valider la presence de data.token et data.expiry avant utilisation.

#### ⚪ Connexion auto apres inscription: la session client peut ne pas etre rafraichie (signIn redirect:false sans router.refresh dans certains flux) et message d'echec generique sur mot de passe court
- **Gravité/Catégorie**: low / ux · _(repéré en vérification)_
- **Fichier**: `app/connexion/page.tsx:93-105`
- **Problème**: Apres inscription reussie, connexion/page.tsx:93 fait signIn credentials redirect:false. Si l'inscription a accepte un mdp de 6-7 chars (impossible ici car register exige 8, mais coherent avec le piege auth-04), le login auto echouerait. Plus generalement, la branche d'echec (102-105) bascule en mode login avec un message 'Compte cree mais erreur de connexion' — l'utilisateur qui vient de creer le compte avec succes voit un message d'erreur, UX confuse. Mineur mais reel.
- **Correctif proposé**: Aligner les seuils (auth-04) et, en cas d'echec du login auto post-inscription, afficher un message neutre/positif ('Compte cree, veuillez vous connecter') plutot qu'une erreur rouge.

#### ⚪ Le bouton Google reste en etat loading=true sans reset si l'utilisateur annule/echoue le flux OAuth
- **Gravité/Catégorie**: low / ux · _(repéré en vérification)_
- **Fichier**: `app/connexion/page.tsx:292-295`
- **Problème**: Le onClick Google fait setLoading(true) puis signIn('google', { callbackUrl: '/' }) (connexion/page.tsx:292-295, idem auth-modal.tsx:294-297). signIn google effectue une redirection (pas redirect:false), donc en cas de succes la page part. Mais si la config Google est cassee (cf auth-06) ou si l'utilisateur revient en arriere, loading reste a true sans jamais etre remis a false (pas de finally ici, contrairement aux handlers credentials), gelant tous les champs/boutons (disabled={loading}). UX degradee combinee au probleme de config Google.
- **Correctif proposé**: Ne pas mettre loading=true de maniere irreversible pour un flux a redirection, ou gerer un timeout/catch; au minimum reinitialiser loading dans un effet au remontage de la page.


### Produits admin (CRUD) & catégories (17)

#### 🔴 Le toggle 'Hors ligne' n'a aucun effet cote client: le catalogue n'applique pas le filtre inStock
- **Gravité/Catégorie**: critical / admin-client-mismatch
- **Fichier**: `app/produits/page.tsx:13-16`
- **Problème**: L'admin desactive un produit via PUT /status qui ne fait que `inStock = (status==='active')`. Mais la page catalogue client liste TOUS les produits sans filtrer inStock, et la fiche produit /produits/[id] ne garde pas non plus inStock. Resultat: un produit mis 'Hors ligne' ou en rupture reste visible ET achetable cote client. L'action de retrait de vente cote admin est silencieusement sans effet — incoherence admin/client majeure.
- **Correctif proposé**: Ajouter `where: { inStock: true }` dans app/produits/page.tsx, et dans app/produits/[id]/page.tsx verifier `if (!product || !product.inStock) notFound()`. Idealement filtrer aussi sur currentStock > 0 selon la regle metier voulue.

#### 🔴 StockPage: 'Ajouter Produit' n'ecrit qu'en state local, rien n'est persiste en base
- **Gravité/Catégorie**: critical / bug
- **Fichier**: `app/admin/stock/page.tsx:143-172`
- **Problème**: La page Gestion des Stocks laisse croire qu'on cree un produit avec prix d'achat, marge, stock initial et facture, mais tout disparait au prochain loadStock()/refresh: rien n'est envoye au serveur (le POST /api/admin/stock ne gere que productId+quantity pour le restock, pas la creation). L'admin pense creer des produits/fournisseurs qui n'existent jamais. Le bouton Modifier est mort (aucun JSX de modal d'edition).
- **Correctif proposé**: Cabler handleAddProduct sur un endpoint reel (reutiliser POST /api/admin/products avec purchasePrice/margin/currentStock/minimumStock/supplier/origin) puis recharger via loadStock(). Implementer le modal d'edition + un PUT, ou supprimer le bouton Modifier. Uploader/stocker reellement le fichier facture (actuellement ignore).

#### 🟠 Edition produit: la categorie est perdue (categoryId force a ""), modification bloquee
- **Gravité/Catégorie**: high / bug
- **Fichier**: `app/admin/products/page.tsx:253, 301`
- **Problème**: Le GET /api/admin/products ne renvoie jamais categoryId (uniquement `categories: { name }`). A l'ouverture du modal d'edition, categoryId est donc remis a vide et le select catégorie affiche 'Sélectionner une catégorie'. La validation handleSubmit (qui s'applique aussi au PUT) bloque alors l'enregistrement tant que l'utilisateur ne re-choisit pas une categorie. Pire: s'il oublie, soit le submit est bloque, soit (cote API PUT) categoryId='' serait envoye et casserait la relation. L'edition d'un produit est donc cassee dans le cas nominal.
- **Correctif proposé**: Exposer categoryId dans le formatage du GET (`categoryId: product.categoryId` en plus de `categories`) et le pre-remplir dans openEditProduct: `categoryId: product.categoryId ?? ""`. Ajouter categoryId au type Product de la page.

#### 🟠 PUT produit: aucune validation Zod et parseFloat('') => NaN crashe Prisma (purchasePrice vide)
- **Gravité/Catégorie**: high / bug
- **Fichier**: `app/api/admin/products/[id]/route.ts:44`
- **Problème**: Contrairement au POST, le PUT n'a PAS de validation Zod. Quand purchasePrice est vide (cas frequent, champ optionnel), body.purchasePrice = '' qui est !== undefined, donc parseFloat('') = NaN est ecrit dans un Float Prisma => l'update echoue avec une 500 et la modification n'est jamais persistee. Meme schema de risque latent pour price si jamais vide. Le PUT n'a aussi aucune borne (prix negatif accepte).
- **Correctif proposé**: Reutiliser le meme productSchema que le POST (rendre partiel) dans le PUT: parser/valider via Zod et convertir '' -> null pour purchasePrice/margin, ignorer les champs absents. A minima: `purchasePrice: body.purchasePrice === '' || body.purchasePrice == null ? null : parseFloat(body.purchasePrice)` avec garde isNaN.

#### 🟠 Champ 'margin' jamais saisissable ni calcule dans le CRUD produit (toujours null en base)
- **Gravité/Catégorie**: high / missing-display
- **Fichier**: `app/admin/products/page.tsx:85-89, 236`
- **Problème**: La marge est un concept central (prix d'achat vs vente) present au schema, expose par l'API stock, affiche dans la page Stock (item.margin%) et attendu par la page Comptabilite. Mais le seul formulaire qui cree/edite des produits ne permet jamais de la renseigner et ne la calcule pas a partir de purchasePrice/price. En base margin reste null -> la page Stock affiche systematiquement 0% de marge pour tout produit cree via ce formulaire. Donnee du schema jamais alimentee.
- **Correctif proposé**: Soit ajouter un champ marge au formulaire produit, soit calculer la marge automatiquement a la creation/maj: `margin = purchasePrice > 0 ? ((price - purchasePrice) / purchasePrice) * 100 : null` dans POST et PUT, et l'envoyer. Definir et documenter l'unite (% de cout) pour rester coherent avec /admin/stock.

#### 🟡 Status incoherent: le toggle ne gere pas 'low_stock', un produit en stock faible ne peut jamais s'afficher 'En ligne'
- **Gravité/Catégorie**: medium / admin-client-mismatch
- **Fichier**: `app/api/admin/products/route.ts:64`
- **Problème**: Quand currentStock <= minimumStock (stock faible mais en vente), le GET renvoie 'low_stock'. Le badge admin n'a pas de cas 'low_stock' -> il tombe en 'Hors ligne' alors que le produit est bien inStock=true et vendu cote client. De plus le toggle 'En ligne/Hors ligne' envoie 'active'/'inactive' et ne remonte que inStock; apres re-fetch un produit actif a faible stock repassera 'low_stock' -> 'Hors ligne', donnant l'impression que le toggle ne marche pas. Concept de status divergent entre derive (3 etats) et toggle (2 etats binaires sur inStock).
- **Correctif proposé**: Aligner les etats: dans getStatusBadge, ajouter un cas 'low_stock' (ex: badge orange 'Stock faible' tout en restant en ligne) et baser l'affichage 'En ligne/Hors ligne' sur inStock, pas sur le status derive. Ou separer clairement 'en ligne' (inStock) de 'niveau de stock'.

#### 🟡 Page Comptabilite: marges produits codees en dur au lieu de Product.margin reel
- **Gravité/Catégorie**: medium / missing-display
- **Fichier**: `app/admin/accounting/page.tsx:126, 140, 154, 484`
- **Problème**: La comptabilite affiche des marges produits factices sans rapport avec les vrais champs Product.margin/purchasePrice/price de la base. Le proprietaire voit des chiffres de rentabilite inventes. La donnee reelle existe (schema + API) mais n'est jamais branchee.
- **Correctif proposé**: Remplacer les tableaux mock par un fetch reel (ex: /api/admin/stock ou une nouvelle route) et calculer la marge a partir des champs persistes. A defaut, marquer clairement la page comme demo.

#### 🟡 Champs supplier/origin/purchasePrice saisis cote admin mais jamais montres au client
- **Gravité/Catégorie**: medium / missing-display
- **Fichier**: `app/produits/[id]/page.tsx:15-18`
- **Problème**: L'origine (France/Espagne...) est un argument de vente fort pour une epicerie bio/locale et est soigneusement saisie cote admin (avec autocompletion), mais elle n'apparait nulle part sur la fiche produit client. purchasePrice/supplier sont internes (normal de ne pas les montrer), mais origin devrait l'etre. Donnee admin orpheline cote client.
- **Correctif proposé**: Afficher product.origin sur la fiche /produits/[id] (et eventuellement dans la liste), avec un libelle type 'Origine : France'. Verifier qu'origin n'est pas null avant affichage.

#### 🟡 Unite 'pièce' (form/seed avec accent) vs 'piece' (option du select) -> incoherence d'unite
- **Gravité/Catégorie**: medium / admin-client-mismatch
- **Fichier**: `app/admin/products/page.tsx:62`
- **Problème**: A l'edition d'un produit seede (unit='pièce'), le select de la page produits ne contient que la valeur 'piece' (sans accent): aucune option ne correspond, le select affichera la 1ere option (kg) et un enregistrement reecrira l'unite en 'kg' ou 'piece'. Deux orthographes coexistent en base pour la meme unite -> tri/affichage incoherents et risque de modification involontaire de l'unite a chaque edition.
- **Correctif proposé**: Uniformiser une seule valeur canonique (ex: 'piece' partout) et corriger le seed.ts pour utiliser 'piece' (label 'Pièce' uniquement a l'affichage). Migrer les donnees existantes 'pièce' -> 'piece'.

#### 🟡 Divergence inStock/currentStock: un produit cree avec stock=0 reste inStock=true (statut et achetabilite incoherents)
- **Gravité/Catégorie**: medium / db-inconsistency · _(repéré en vérification)_
- **Fichier**: `app/api/admin/products/route.ts:107`
- **Problème**: Le POST ecrit inStock: data.inStock (defaut true, route.ts:107) independamment de currentStock. On peut donc creer un produit avec currentStock=0 et inStock=true. Le status derive (route.ts:64) sera alors 'low_stock' (0 <= minimumStock) et non 'out_of_stock' (qui exige !inStock). Cote client (cf AP-02) le produit est meme achetable car aucun filtre stock. C'est la racine commune de plusieurs incoherences de statut (AP-06). Les deux champs devraient etre maintenus coherents.
- **Correctif proposé**: Deriver inStock de currentStock dans POST/PUT (inStock: (data.currentStock ?? 0) > 0) OU baser le status uniquement sur currentStock pour eliminer la divergence.

#### 🟡 POST/PUT produit acceptent une categoryId inexistante -> 500 P2003 (violation FK) opaque
- **Gravité/Catégorie**: medium / bug · _(repéré en vérification)_
- **Fichier**: `app/api/admin/products/route.ts:115`
- **Problème**: productSchema valide seulement que categoryId est une string non vide (route.ts:39), jamais son existence. Une categoryId obsolete (cache client desynchronise apres suppression d'une categorie) provoque une violation de cle etrangere Prisma (P2003) attrapee par le catch generique -> 500 'Internal Server Error'. Cote UI handleSubmit (page.tsx:312) res.ok=false => echec silencieux sans message. Le PUT a le meme defaut (route.ts:48).
- **Correctif proposé**: Verifier l'existence de la categorie avant create/update (findUnique) ou attraper P2003 et renvoyer un 400 avec message clair ('Categorie introuvable').

#### ⚪ Stock update PUT/POST sans validation: parseInt('') ou valeurs non bornees possibles
- **Gravité/Catégorie**: low / ux
- **Fichier**: `app/api/admin/products/[id]/stock/route.ts:12-19`
- **Problème**: Si le body envoie un stock vide/invalide, parseInt renvoie NaN -> ecriture NaN dans un Int Prisma (500). Aucune borne min 0 (contrairement au POST collection qui clamp via Math.max). L'endpoint status n'a aucune validation non plus (accepte n'importe quel champ status). L'UI actuelle envoie des nombres valides, mais l'endpoint n'est pas robuste.
- **Correctif proposé**: Valider via Zod: `z.object({ stock: z.coerce.number().int().min(0) })`. Pour status, restreindre a une enum connue. Renvoyer 400 si invalide au lieu de laisser Prisma planter.

#### ⚪ POST categories renvoie l'objet brut ajoute au state; doublon de nom -> 500 non gere cote UI
- **Gravité/Catégorie**: low / bug
- **Fichier**: `app/admin/products/page.tsx:287-293`
- **Problème**: Creer une categorie avec un nom deja existant (contrainte @unique name + slug) leve une P2002 attrapee par le catch generique qui renvoie 500 'Internal Server Error'. Cote UI, res.ok est false donc rien ne se passe silencieusement (aucun message d'erreur a l'utilisateur). UX confuse: l'admin clique OK et rien n'apparait.
- **Correctif proposé**: Dans la route categories, attraper l'erreur P2002 et renvoyer 409 avec un message 'Catégorie déjà existante'. Cote UI, afficher l'erreur (alert/toast) quand !res.ok.

#### ⚪ Compteur 'En Rupture' / stats Valeur Stock fragiles a cause du statut 'inactive' jamais reconnu
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `app/admin/products/page.tsx:142`
- **Problème**: outOfStockProducts compte p.status === 'out_of_stock' || p.current_stock === 0 (page.tsx:142). Le toggle 'Hors ligne' stocke optimistiquement status='inactive' (page.tsx:462,170), valeur que ni le GET ni les stats ne reconnaissent: un produit mis hors ligne mais avec stock>0 n'est compte nulle part comme indisponible et reste dans la Valeur Stock. Apres refresh il deviendra 'out_of_stock'. Incoherence d'affichage et de comptage selon qu'on a rafraichi ou non.
- **Correctif proposé**: Apres toggle, re-fetch via loadAll() ou recalculer le statut comme le serveur; supprimer la chaine 'inactive' (utiliser 'out_of_stock'/'active' coherents avec le GET).

#### ⚪ updateStock optimiste affiche 'active' meme si le nouveau stock reste sous le minimum (devrait etre low_stock)
- **Gravité/Catégorie**: low / admin-client-mismatch · _(repéré en vérification)_
- **Fichier**: `app/admin/products/page.tsx:182`
- **Problème**: Apres +10 stock (page.tsx:465 -> updateStock), le state optimiste force newStatus = newStock > 0 ? 'active' : 'out_of_stock' (page.tsx:182), ignorant minimum_stock. Si le stock reste sous le minimum, l'UI montre 'En ligne' alors que le GET recalculera 'low_stock' -> badge 'Hors ligne' au refresh. Affichage incoherent entre action optimiste et etat re-fetch.
- **Correctif proposé**: Aligner: newStock <= 0 ? 'out_of_stock' : newStock <= p.minimum_stock ? 'low_stock' : 'active', ou re-fetch via loadAll() apres updateStock.

#### ⚪ Autocomplete Origine: originSearch jamais reinitialise a l'ouverture de l'edition -> valeur d'origine fantome
- **Gravité/Catégorie**: low / ux · _(repéré en vérification)_
- **Fichier**: `app/admin/products/page.tsx:669`
- **Problème**: Le champ Origine affiche originSearch || productForm.origin (page.tsx:669). openCreateModal reset originSearch (page.tsx:234) mais openEditProduct (244-263) ne le fait pas: il met a jour productForm.origin sans toucher originSearch. Si l'admin a tape une recherche d'origine puis ouvre directement l'edition d'un autre produit, le champ peut afficher l'ancienne recherche au lieu de l'origine reelle du produit edite.
- **Correctif proposé**: Dans openEditProduct, ajouter setOriginSearch(product.origin || "") pour synchroniser l'affichage avec l'origine du produit edite.

#### ⚪ PUT produit ecrase silencieusement les champs absents en undefined; pas de revalidatePath -> catalogue client stale
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `app/api/admin/products/[id]/route.ts:32`
- **Problème**: Le PUT passe systematiquement name/description/unit/image/inStock/organic/supplier/origin/categoryId = body.<champ> (route.ts:35-48). Si le client envoie un body partiel (ex: futur appel programmatique sans tous les champs), Prisma recevra undefined (ignore) pour la plupart mais des chaines vides ou null ecraseront les valeurs. De plus, ni le POST ni le PUT ni le DELETE n'appellent revalidatePath('/produits'): les pages client sont en force-dynamic donc OK ici, mais aucun cache invalidation explicite n'est fait, ce qui devient un piege si on retire force-dynamic. Robustesse insuffisante pour un endpoint d'edition en production.
- **Correctif proposé**: Reutiliser productSchema (en .partial()) dans le PUT pour valider/transformer comme le POST, et ajouter revalidatePath('/produits') apres create/update/delete pour garantir la fraicheur si le rendu cache change.


### Affichage produits client (16)

#### 🟠 Pages /produits et /categories/[slug] ne filtrent pas inStock et n'affichent jamais la disponibilite
- **Gravité/Catégorie**: high / admin-client-mismatch
- **Fichier**: `app/produits/page.tsx:13-16, 32-79`
- **Problème**: L'admin pilote la disponibilite via inStock (statut 'En ligne/Hors ligne/Rupture' dans app/admin/products/page.tsx et /api/admin/products/route.ts ligne 64). La homepage (product-section.tsx ligne 7 'where: { inStock: true }') respecte cette logique ET ProductCard affiche un badge 'Rupture' si !inStock. Mais la page /produits fait un findMany SANS filtre inStock et n'affiche jamais l'etat de stock ni ne desactive le bouton: un produit mis 'Hors ligne'/'Rupture' en admin reste affiche comme achetable. app/categories/[slug]/page.tsx (lignes 16-20, 45-78) a exactement le meme defaut. Incoherence directe entre les deux surfaces client et la logique admin.
- **Correctif proposé**: Ajouter where:{ inStock: true } aux findMany de app/produits/page.tsx et app/categories/[slug]/page.tsx (comme product-section.tsx), OU afficher un badge 'Rupture de stock' + desactiver AddToCartButton quand !product.inStock pour rester coherent avec ProductCard.

#### 🟠 Conditionnement 'Premium (+0.50€)' affiche dans le total mais jamais transmis a addToCart
- **Gravité/Catégorie**: high / bug
- **Fichier**: `components/product/product-modal.tsx:124-134, 162-167, 40`
- **Problème**: Le modal (et le bottom-sheet mobile) propose un selecteur Conditionnement avec Premium (+0.50€) et calcule un total incluant ce surcout (product.price * qty + 0.5*qty). Mais handleAddToCart n'envoie que { productId, quantity }. Le choix de conditionnement et son surcout de 0.50€/unite sont silencieusement perdus: le client voit un total majore mais paie le prix de base. Incoherence prix client / panier reel.
- **Correctif proposé**: Soit transmettre le conditionnement via customData/un champ d'option a addToCart et le repercuter sur priceAtPurchase cote serveur, soit retirer purement l'option Conditionnement (et 'eco'/'premium') si elle n'existe pas dans le modele de donnees (aucun champ packaging dans Product/CartItem du schema).

#### 🟡 Champs admin origin et supplier jamais affiches au client
- **Gravité/Catégorie**: medium / missing-display
- **Fichier**: `app/produits/[id]/page.tsx:54-67`
- **Problème**: L'admin saisit explicitement Origine et Fournisseur (app/admin/products/page.tsx L651-655, L666-696) et l'API les expose (route.ts L68-69). Pour une epicerie bio, l'origine est une info de vente majeure. Or aucune page/composant client n'affiche origin ni supplier — verifie par grep: 0 occurrence de origin/supplier/origine/fournisseur dans app/produits et components/product. La fiche detail (le seul endroit logique) ne les rend pas; product-section.tsx ne les transmet meme pas au format client.
- **Correctif proposé**: Afficher product.origin sur la fiche /produits/[id] (ex: 'Origine: France') et eventuellement le fournisseur. Ajouter origin (et supplier si voulu) au mapping de product-section.tsx et a l'interface Product des composants pour pouvoir l'afficher dans le modal.

#### 🟡 Desync inStock / currentStock: un produit a currentStock=0 peut rester inStock=true (achetable et affiche disponible)
- **Gravité/Catégorie**: medium / db-inconsistency
- **Fichier**: `app/api/admin/products/[id]/route.ts:40-47`
- **Problème**: Deux notions de stock coexistent. Les endpoints dedies synchronisent (stock/route.ts L18 inStock:stockValue>0; status/route.ts L14). Mais le PUT generique du produit (route.ts [id] L40,46) et le POST (route.ts L107,113) ecrivent inStock et currentStock independamment: un admin peut enregistrer currentStock=0 avec inStock=true (defaut). La homepage filtre sur inStock uniquement, donc ce produit a stock 0 s'affiche et est commandable; place/route.ts decremente alors a Math.max(0, 0-qty)=0 -> vente a stock negatif logique. Le client ne voit jamais currentStock (jamais affiche cote vitrine).
- **Correctif proposé**: Deriver inStock de currentStock de maniere centralisee a chaque ecriture (inStock = currentStock > 0) dans POST et PUT [id], ou filtrer la vitrine sur currentStock>0 en plus de inStock. Idealement, exposer une vraie info de dispo au client basee sur currentStock.

#### 🟡 Image fallback pointant vers un fichier inexistant /placeholder-product.jpg (404) sur fiche produit et categorie
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `app/produits/[id]/page.tsx:37`
- **Problème**: La fiche detail et la page categorie utilisent src={product.image || '/placeholder-product.jpg'}. Ce fichier n'existe pas dans public/ (presents: placeholder.jpg, placeholder.svg, placeholder-logo.*, placeholder-user.jpg). Pour tout produit sans image, next/image tente de charger une ressource 404 -> image cassee. Les autres composants utilisent correctement /placeholder.svg (ImageWithFallback, ProductCard).
- **Correctif proposé**: Remplacer '/placeholder-product.jpg' par '/placeholder.svg' (existant) dans les deux pages, ou ajouter le fichier public/placeholder-product.jpg. Uniformiser le placeholder a travers tout le sous-systeme.

#### 🟡 Note '4.9' codee en dur sur la fiche produit (avis fictif)
- **Gravité/Catégorie**: medium / ux
- **Fichier**: `app/produits/[id]/page.tsx:47-50`
- **Problème**: La fiche produit affiche une etoile avec la note '4.9' en dur pour tous les produits. Il n'existe aucun modele d'avis/note dans le schema Prisma. C'est une fausse donnee affichee au client (probleme de confiance/legal pour une boutique en production).
- **Correctif proposé**: Retirer le bloc note, ou l'alimenter par de vraies donnees d'avis (necessite un modele Review). Ne pas afficher de note tant qu'aucun systeme d'avis n'existe.

#### 🟡 app/produits/page.tsx et categories: AddToCartButton n'a pas de prop inStock donc le bouton reste actif meme en rupture (et ProductCard 'Rupture' jamais utilise ici)
- **Gravité/Catégorie**: medium / bug · _(repéré en vérification)_
- **Fichier**: `components/product/add-to-cart-button.tsx:19-49`
- **Problème**: AddToCartButton (utilise par /produits L64, /categories L69, et la fiche detail L87) n'accepte aucune prop inStock et fait seulement `disabled={loading}` (L49). Il n'existe donc aucun moyen de desactiver l'ajout pour un produit en rupture sur ces trois pages — meme si on corrigeait CP-01 pour afficher l'etat, le bouton resterait cliquable. Combine au fait que addToCart cote serveur (cart.ts L88) ne verifie jamais product.inStock ni currentStock avant d'ajouter, un produit en rupture est ajoutable au panier depuis toutes les surfaces utilisant AddToCartButton.
- **Correctif proposé**: Ajouter une prop `inStock?: boolean` a AddToCartButton (disabled si false) ET valider product.inStock/currentStock dans l'action addToCart cote serveur avant l'ajout.

#### ⚪ ProductCardMobile n'affiche pas le badge 'Rupture' contrairement a ProductCard desktop
- **Gravité/Catégorie**: low / missing-display
- **Fichier**: `components/product/product-card-mobile.tsx:88-92, 103-111`
- **Problème**: Sur desktop ProductCard montre un badge 'Rupture' quand !inStock (product-card.tsx L100-104). La version mobile ne montre aucun indicateur visuel de rupture: elle desactive seulement le bouton +, laissant le client sans explication. Incoherence d'affichage desktop/mobile pour le meme etat de donnee.
- **Correctif proposé**: Ajouter un indicateur 'Rupture' visible (texte/badge) dans ProductCardMobile quand !product.inStock, aligne sur ProductCard desktop.

#### ⚪ ProductCard: la quantite affichee redemarre toujours a 0 meme si le produit est deja dans le panier
- **Gravité/Catégorie**: low / ux
- **Fichier**: `components/product/product-card.tsx:30`
- **Problème**: useState(0) initialise toujours quantity a 0 au montage; le composant ne lit jamais la quantite reelle deja presente dans le panier (cart). Apres rechargement de la page, un produit deja au panier reaffiche 'Ajouter au panier' (qty 0). Cliquer 'Ajouter' incremente alors la quantite serveur au-dela de ce que l'utilisateur croit. Memes remarques pour ProductCardMobile (L21).
- **Correctif proposé**: Initialiser quantity depuis la quantite reelle du panier (prop passee par le parent ou fetch getCartItems), afin que l'UI reflete l'etat du panier serveur.

#### ⚪ Pages /produits et /categories/[slug] non liees depuis la navigation
- **Gravité/Catégorie**: low / ux
- **Fichier**: `components/layout/header.tsx:18, 85-169`
- **Problème**: Le header ne contient aucun lien vers /produits ni vers /categories/[slug]; le seul acces catalogue est '/#marketplace' (homepage ProductSection). Les pages /produits et /categories/[slug] (qui ont par ailleurs les defauts CP-01/CP-03/CP-05) ne sont donc atteignables qu'en tapant l'URL ou via le lien '+ Details' de /produits (boucle interne) et le lien 'Retour au catalogue' du detail. La page categorie est quasi orpheline.
- **Correctif proposé**: Ajouter des liens de navigation vers /produits et/ou les categories, ou clarifier la strategie (si /#marketplace est la vitrine officielle, harmoniser les corrections de stock/affichage la-bas et envisager de retirer/aligner les pages /produits et /categories pour eviter une vitrine secondaire incoherente).

#### ⚪ product-section.tsx ne transmet pas currentStock/origin/supplier au client, limitant tout affichage de dispo reel
- **Gravité/Catégorie**: low / missing-display
- **Fichier**: `components/sections/product-section.tsx:16-27`
- **Problème**: Le mapping formattedProducts ne reprend que id,name,price,unit,image,description,category,categorySlug,inStock,organic. currentStock, origin, supplier ne sont jamais transmis aux composants client. Meme si on voulait afficher 'plus que X en stock' ou l'origine dans le modal, les donnees ne descendent pas. Couple aux findings CP-03/CP-04, cela ferme la porte a tout affichage de disponibilite granulaire ou d'origine cote vitrine principale.
- **Correctif proposé**: Si l'on souhaite afficher dispo/origine, etendre le mapping (currentStock, origin) et les interfaces Product des composants, puis les rendre dans ProductModal/ProductBottomSheet.

#### ⚪ product-modal/bottom-sheet: le select Quantite affiche l'unite a la place du nombre (ex: '1 botte', '10 kg') et plafonne arbitrairement les quantites
- **Gravité/Catégorie**: low / ux · _(repéré en vérification)_
- **Fichier**: `components/product/product-modal.tsx:113-117`
- **Problème**: Le SelectItem de quantite affiche `{num} {product.unit}` (product-modal.tsx L114-116, et product-bottom-sheet.tsx L110-112). Pour unit='kg' cela donne '1 kg', '2 kg'... mais pour unit='piece'/'botte' cela donne '1 piece', et combine au label section 'Quantite' c'est ambigu (est-ce 2 unites de 1kg, ou 2kg ?). De plus la liste est figee a [1,2,3,4,5,10] : impossible de commander 6,7,8,9 ou plus de 10, et aucune borne sur le stock disponible (currentStock non transmis - cf CP-10). Pour un produit vendu au kg, ne pouvoir choisir que des entiers fixes est une limite produit reelle.
- **Correctif proposé**: Separer le nombre de l'unite ('Quantite (en {unit})'), permettre une saisie libre ou une liste complete, et borner par currentStock (qu'il faudra d'abord transmettre - cf CP-10).

#### ⚪ ProductModal/ProductBottomSheet recoivent un Product sans `description` typee depuis ProductBottomSheet de composition mais surtout le type Product du modal exige `description` alors que product-grid ne garantit pas tous les champs au modal de produit
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `components/product/product-modal-context.tsx:7-17`
- **Problème**: Le type Product de product-modal-context.tsx (L7-17) exige `description: string` et `unit: string`, et openProductModal est appele depuis product-grid.tsx L163/L187 avec l'objet product complet — OK ici. Mais ProductCardMobile (product-card-mobile.tsx L9-18) declare un type Product SANS `description`. Or product-grid passe le meme objet aux deux. Le risque reel : les interfaces Product sont dupliquees dans 5 fichiers (product-card, product-card-mobile, product-grid, product-modal, product-bottom-sheet, product-modal-context) avec des champs divergents (mobile n'a pas description). Toute evolution (ajout currentStock/origin) doit etre repercutee 6 fois, source garantie de desync future. C'est la cause structurelle de CP-03/CP-10.
- **Correctif proposé**: Extraire une interface Product partagee (ex: types/product.ts) incluant currentStock/origin/supplier optionnels, et l'importer partout.

#### ⚪ Fiche detail produit (/produits/[id]) n'affiche ni le badge BIO coherent ni l'unite dans le selecteur, et ne propose pas de quantite (toujours 1) contrairement au modal
- **Gravité/Catégorie**: low / admin-client-mismatch · _(repéré en vérification)_
- **Fichier**: `app/produits/[id]/page.tsx:87-92`
- **Problème**: La fiche detail utilise AddToCartButton avec quantity par defaut 1 (AddToCartButton L19 quantity=1, et la page ne passe pas de prop quantity), sans selecteur de quantite ni de conditionnement — alors que le modal/bottom-sheet (ouverts depuis la homepage) offrent quantite (1-10) et conditionnement. Deux parcours d'achat du meme produit offrent des options differentes : un client passant par la fiche detail ne peut ajouter qu'1 unite a la fois. Incoherence d'experience entre les surfaces client pour le meme produit.
- **Correctif proposé**: Uniformiser : soit ajouter un selecteur de quantite sur la fiche detail, soit faire ouvrir le modal partout, pour une experience d'achat coherente.

#### ⚪ product-section.tsx: id d'ancre 'fruits' incoherent avec l'ancre de navigation 'marketplace'
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `components/sections/product-section.tsx:41`
- **Problème**: La <section> porte `id="fruits"` (product-section.tsx L41) mais toute la navigation (header.tsx L14 getElementById('marketplace'), tous les liens '/#marketplace' dans cart-drawer, commande, checkout/success, orders-tab) cible 'marketplace'. Le scroll fonctionne uniquement parce que app/page.tsx L15 enveloppe la section dans `<div id="marketplace">`. L'id 'fruits' est donc une ancre morte/incoherente; si quelqu'un retire le wrapper ou link vers #fruits, ca casse. Vestige d'un ancien nommage.
- **Correctif proposé**: Renommer l'id de la section en 'marketplace' (ou supprimer l'id mort 'fruits') pour aligner sur la navigation.

#### ⚪ product-section.tsx: fallback image avec query-string '/placeholder.svg?height=200&width=300' incoherent et inutile pour un SVG
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `components/sections/product-section.tsx:21`
- **Problème**: Le fallback image L21 est `product.image || '/placeholder.svg?height=200&width=300'` — les query params height/width n'ont aucun effet sur un fichier SVG statique servi depuis /public (ce ne sont pas des dimensions next/image). Tous les autres fallbacks du sous-systeme utilisent simplement '/placeholder.svg' (product-card L85, image-with-fallback L12, product-modal L69). Incoherence mineure et code mort (query ignoree), reliquat d'un ancien systeme de placeholder dynamique.
- **Correctif proposé**: Remplacer par '/placeholder.svg' pour la coherence et eviter la query-string sans effet.


### Compositions (jus/soupes/découpes) (16)

#### 🔴 Le prix personnalise des compositions (taille + ingredients) est ignore au paiement et dans le total commande
- **Gravité/Catégorie**: critical / bug
- **Fichier**: `app/api/stripe/checkout/route.ts:43, 129`
- **Problème**: Quand un client personnalise une composition (taille small/standard/large -> multiplicateur 0.7/1/1.5 et ingredients ajoutes), le modal calcule totalPrice=(basePrice+ingredientsPrice)*sizeMultiplier*qty et le stocke dans CartItem.customData.totalPrice. Le panier (cart-page.tsx l.115 et cart-drawer.tsx l.98) affiche bien ce prix personnalise. MAIS les deux routes de checkout recalculent le prix avec uniquement composition.basePrice et ignorent totalement customData. Resultat: Stripe encaisse moins que le montant affiche au panier, et Order.total + OrderItem.priceAtPurchase sont faux. Sous-facturation systematique de toute composition personnalisee (taille Grand ou ingredients = perte de marge).
- **Correctif proposé**: Dans les deux routes, pour les items de type composition, calculer le prix unitaire a partir de customData: `const unitPrice = item.compositionId ? (item.customData?.totalPrice ? item.customData.totalPrice / item.quantity : item.composition!.basePrice) : item.product!.price`. Mieux: recalculer le prix cote serveur a partir des ingredients/taille de customData (ne pas faire confiance au totalPrice client) pour eviter la manipulation par le client, puis l'utiliser pour subtotal, priceAtPurchase et unit_amount Stripe.

#### 🟠 Type 'fruits-decoupes' attendu par la page /decoupes et le seed mais impossible a creer via l'API POST (enum a 3 valeurs)
- **Gravité/Catégorie**: high / db-inconsistency
- **Fichier**: `app/api/admin/compositions/route.ts:8`
- **Problème**: Le schema Composition.type est un String libre. Le seed cree une composition type='fruits-decoupes' (seed.ts l.123) et la page /decoupes la requete (type in [legumes-decoupes, fruits-decoupes]). Mais le POST admin valide via z.enum(['jus','soupe','legumes-decoupes']) — 'fruits-decoupes' est REJETE (400). L'admin ne peut donc jamais creer une composition fruits-decoupes via le formulaire; seule la donnee seedee existe, et si supprimee elle est irrecreable.
- **Correctif proposé**: Choisir une source de verite unique pour les types. Soit ajouter 'fruits-decoupes' a l'enum Zod du POST (et a l'UI admin), soit retirer 'fruits-decoupes' du seed et de la requete /decoupes. Centraliser la liste des types dans une constante partagee importee par le POST, le PUT, l'UI admin et les pages client.

#### 🟠 Champ 'type' admin en texte libre alors que le POST impose un enum strict; types arbitraires invisibles cote client
- **Gravité/Catégorie**: high / admin-client-mismatch
- **Fichier**: `app/admin/products/page.tsx:714-744`
- **Problème**: Le champ Type du formulaire admin est un Input free-text avec placeholder suggerant 'jus, soupe, bowl, smoothie...'. Si l'admin tape 'bowl' ou 'smoothie', le POST renvoie 400 (rejete par l'enum). Et meme via le PUT (qui n'a aucune validation), une composition type='bowl' serait creee mais n'apparaitrait NI sur /jus-soupes (filtre jus/soupe) NI sur /decoupes (filtre legumes/fruits-decoupes) — elle ne serait visible que dans la marketplace generique. Le placeholder ment sur les valeurs reellement supportees.
- **Correctif proposé**: Remplacer l'Input free-text par un Select limite aux types reellement supportes (jus, soupe, legumes-decoupes, fruits-decoupes), aligner le PUT sur la meme validation Zod que le POST, et corriger le placeholder. Ainsi admin et client utilisent exactement le meme jeu de types.

#### 🟠 La personnalisation (taille + ingredients) d'une composition n'est jamais persistee ni affichee apres commande
- **Gravité/Catégorie**: high / missing-display
- **Fichier**: `prisma/schema.prisma:128-140`
- **Problème**: customData (taille, ingredients, totalPrice) n'existe que sur CartItem. Le modele OrderItem n'a pas de champ customData/Json. Lors de la creation de commande, seuls compositionId/quantity/priceAtPurchase sont copies. Toute la personnalisation est perdue: la facture, l'historique compte client, le detail commande admin et l'email de confirmation n'affichent que le nom de la composition. L'equipe preparation ne sait pas quelle taille ni quels ingredients preparer — bloquant pour une activite de jus/soupes sur-mesure.
- **Correctif proposé**: Ajouter `customData Json?` au modele OrderItem (migration Prisma) et le copier depuis CartItem.customData a la creation de la commande dans stripe/checkout et orders/place. Puis afficher taille+ingredients dans la facture, l'historique client et le detail commande admin (comme deja fait dans le panier).

#### 🟠 Echec de creation/edition de composition silencieux cote admin
- **Gravité/Catégorie**: high / admin-client-mismatch
- **Fichier**: `app/admin/products/page.tsx:328-331`
- **Problème**: handleSubmit ne teste que `if (res.ok)`. Si le POST renvoie 400 (ex: type hors enum, ou type vide car openCreateModal reinitialise type='' alors que le state initial est 'jus'), rien ne se passe: la modale reste ouverte, aucun toast/alerte, aucun message d'erreur. L'admin croit que la composition est creee alors qu'elle ne l'est pas.
- **Correctif proposé**: Ajouter une gestion d'erreur: lire `const data = await res.json()` quand !res.ok et afficher data.error via un toast/alert; ne pas fermer la modale en cas d'echec. Garantir aussi qu'un type valide est obligatoire (Select) pour eviter le type vide.

#### 🟠 Le prix unitaire panier d'une composition personnalisee devient faux quand on change la quantite dans le panier
- **Gravité/Catégorie**: high / bug · _(repéré en vérification)_
- **Fichier**: `components/cart/cart-page.tsx:115-117 (et cart-drawer.tsx:98-100)`
- **Problème**: customData.totalPrice est fige au moment de l'ajout et inclut deja la multiplication par la quantite (composition-modal.tsx:96 `(basePrice+ingredientsPrice)*sizeMultiplier*parseInt(quantity)`). L'affichage panier recalcule un prix unitaire par `customData.totalPrice / item.quantity`. Si le client modifie la quantite via updateCartItemQuantity (cart.ts:132, qui ne touche PAS customData), totalPrice reste celui de l'ancienne quantite. Exemple: ajout de 2 unites a 10€ -> totalPrice=20 stocke; le client passe a 1 dans le panier -> affichage 20/1=20€ l'unite (prix double), ou passe a 4 -> 20/4=5€ l'unite (moitie prix). Le prix unitaire et le total affiches deviennent incorrects.
- **Correctif proposé**: Stocker dans customData un prix UNITAIRE (unitPrice = (basePrice+ingredientsPrice)*sizeMultiplier) et non un total dependant de la quantite, ou recalculer customData.totalPrice dans updateCartItemQuantity. Ideal: ne stocker que size+ingredients et recalculer le prix serveur a partir des prix DB.

#### 🟡 Pages /jus-soupes et /decoupes ajoutent au panier sans la personnalisation, contrairement a la marketplace
- **Gravité/Catégorie**: medium / ux
- **Fichier**: `app/jus-soupes/page.tsx:57-62`
- **Problème**: Sur la marketplace (ProductGrid), cliquer une composition ouvre un modal de personnalisation (taille/ingredients) qui ajoute au panier avec customData. Mais les pages dediees /jus-soupes et /decoupes utilisent AddToCartButton qui ajoute la composition a plat (basePrice, sans size ni ingredients ni customData). La meme composition a donc deux comportements et deux prix possibles selon le point d'entree, ce qui est incoherent pour le client.
- **Correctif proposé**: Soit faire ouvrir le CompositionModal/BottomSheet depuis ces pages (comme la marketplace), soit assumer que ces pages vendent des compositions non personnalisables et le rendre coherent partout (ex: indiquer 'standard'). Eviter deux flux divergents pour le meme produit.

#### 🟡 Le prix total des compositions provient du client (customData.totalPrice) sans recalcul serveur
- **Gravité/Catégorie**: medium / security
- **Fichier**: `components/product/composition-modal.tsx:96, 117-122`
- **Problème**: totalPrice est calcule cote client puis envoye tel quel dans customData et stocke en DB. Le panier l'affiche directement. Si le bug comp-01 etait corrige naivement en utilisant customData.totalPrice au checkout, un client malveillant pourrait forger un totalPrice arbitraire (ex: 0.01) via la server action addToCart. La taille et les ingredients devraient etre revalides/recalcules cote serveur a partir des prix reels en DB.
- **Correctif proposé**: Recalculer le prix cote serveur: au checkout, lire customData.ingredients[].id et customData.size, recharger les prix produits + basePrice depuis la DB, appliquer le multiplicateur de taille, et utiliser ce montant pour priceAtPurchase/Stripe. Ne jamais faire confiance a customData.totalPrice fourni par le client.

#### 🟡 Re-ajouter une composition personnalisee ecrase silencieusement la personnalisation precedente (contrainte unique cartId+compositionId)
- **Gravité/Catégorie**: medium / bug · _(repéré en vérification)_
- **Fichier**: `app/actions/cart.ts:66-85`
- **Problème**: CartItem a @@unique([cartId, productId, compositionId]) (schema.prisma:170). Une composition donnee ne peut donc exister qu'en UNE seule ligne de panier, quelle que soit la personnalisation. Si le client ajoute 'Jus Detox' taille Petit sans ingredient, puis re-compose le meme jus en Grand avec 3 ingredients, addToCart trouve existingItem et fait `quantity: existingItem.quantity + quantity, customData` (l.84): la quantite s'additionne mais l'ancienne personnalisation est remplacee par la nouvelle. Impossible d'avoir deux variantes de la meme composition dans le panier; le client paie une seule config pour les deux. Comportement contre-intuitif pour un produit sur-mesure.
- **Correctif proposé**: Pour les compositions personnalisees, creer systematiquement une nouvelle ligne (cle unique incluant un hash de customData) ou empecher la fusion quand customData differe; sinon retirer la contrainte unique pour les compositions et gerer la deduplication seulement pour les produits simples.

#### 🟡 Ajout flat d'une composition deja personnalisee: la quantite augmente mais le prix personnalise (totalPrice fige) n'est pas recalcule
- **Gravité/Catégorie**: medium / bug · _(repéré en vérification)_
- **Fichier**: `app/actions/cart.ts:74-79`
- **Problème**: Si une composition a d'abord ete ajoutee via le modal (avec customData.totalPrice) puis re-ajoutee via les pages /jus-soupes ou /decoupes (AddToCartButton, sans customData), addToCart entre dans la branche `if (existingItem && !customData)` (l.74) et fait juste `quantity: existingItem.quantity + quantity` (l.78), conservant l'ancien customData.totalPrice. Le panier affichera alors customData.totalPrice / nouvelleQuantite, donc un prix unitaire errone (voir aussi le finding sur le changement de quantite). Deux points d'entree au prix incompatible (comp-06) aggrave par la fusion.
- **Correctif proposé**: Uniformiser le flux d'ajout des compositions (toujours passer par le modal de personnalisation) ou, lors d'un ajout flat sur une composition deja personnalisee, recalculer/effacer customData de maniere coherente.

#### 🟡 Aucune protection de role 'admin' sur l'edition/suppression de composition au-dela de l'enum: PUT n'a aucune validation Zod
- **Gravité/Catégorie**: medium / bug · _(repéré en vérification)_
- **Fichier**: `app/api/admin/compositions/[id]/route.ts:27-36`
- **Problème**: Le PUT verifie bien le role admin (l.22) mais n'applique AUCUNE validation des donnees, contrairement au POST qui passe par compositionSchema. body.type est ecrit tel quel (l.31) - n'importe quel type arbitraire est accepte (incoherent avec l'enum strict du POST, voir comp-03), basePrice est parse sans verifier isNaN/negatif (l.33 `parseFloat(body.basePrice)` peut donner NaN qui sera rejete par Prisma ou stocke incorrectement), name peut etre vide. Incoherence de regles de validation entre creation et edition.
- **Correctif proposé**: Reutiliser compositionSchema (en version partielle/optionnelle) dans le PUT et retourner 400 si invalide, exactement comme le POST.

#### ⚪ Code mort getRelevantCategories / filteredIngredients toujours egal a tous les produits
- **Gravité/Catégorie**: low / bug
- **Fichier**: `components/product/composition-modal.tsx:42-62`
- **Problème**: getRelevantCategories() retourne toujours null, donc filteredIngredients = availableProducts inconditionnellement. Tout le bloc de filtrage par categorie (l.57-62) et la fonction sont du code mort. Sans gravite fonctionnelle mais trompeur et a nettoyer; aucune notion de pertinence d'ingredient par type de composition (un client peut mettre n'importe quel produit dans n'importe quelle composition).
- **Correctif proposé**: Supprimer getRelevantCategories et la branche de filtrage, ou implementer reellement un filtrage des ingredients selon composition.type (ex: fruits pour jus, legumes pour soupe).

#### ⚪ getCompositionsByTypes est du code mort (jamais importe)
- **Gravité/Catégorie**: low / bug
- **Fichier**: `app/actions/compositions.ts:5`
- **Problème**: La server action getCompositionsByTypes n'est referencee nulle part dans le code (les pages /jus-soupes et /decoupes requetent prisma.composition directement). Code mort qui suggere une intention abandonnee de factoriser la recuperation des compositions.
- **Correctif proposé**: Soit l'utiliser dans jus-soupes/page.tsx et decoupes/page.tsx a la place des requetes Prisma inline (centralisation), soit supprimer le fichier.

#### ⚪ Boutons de taille affichent le libelle en double dans le modal desktop
- **Gravité/Catégorie**: low / ux
- **Fichier**: `components/product/composition-modal.tsx:184-185`
- **Problème**: Chaque bouton de taille rend le libelle deux fois: une fois via la ternaire inline ('Petit'/'Standard'/'Grand') et une seconde fois via getSizeLabel(s) qui renvoie exactement la meme valeur. L'utilisateur voit 'Petit' puis 'Petit' empile. Defaut cosmetique du modal desktop uniquement.
- **Correctif proposé**: Supprimer la seconde ligne getSizeLabel(s) redondante, ou afficher une info reellement complementaire (ex: l'impact prix de la taille: x0.7 / x1 / x1.5).

#### ⚪ L'image de composition saisie cote admin (imageUrl) n'est pas affichee dans le modal/bottom-sheet de personnalisation client
- **Gravité/Catégorie**: low / admin-client-mismatch · _(repéré en vérification)_
- **Fichier**: `components/product/composition-modal.tsx:19, 155`
- **Problème**: L'admin renseigne Composition.imageUrl (schema.prisma:93). Le mapping client de ProductGrid passe `image: comp.image` (le composant attend la prop `image`, composition-modal.tsx:19 `image: string`) et l'affiche via `composition.image || '/placeholder.svg'` (l.155). Or les pages dediees /jus-soupes et /decoupes utilisent bien comp.imageUrl. Il faut verifier que la source marketplace mappe bien imageUrl -> image; si la requete marketplace ne selectionne pas imageUrl ou le nomme image, le modal affiche toujours le placeholder. A confirmer cote page marketplace, mais l'interface CompositionType attend `image` alors que le schema expose `imageUrl`, source frequente d'image manquante.
- **Correctif proposé**: S'assurer que la page marketplace mappe explicitement `image: comp.imageUrl` lors de la construction du tableau compositions passe a ProductGrid, et idealement uniformiser le nom de champ (imageUrl partout).

#### ⚪ crypto.randomUUID() utilise dans l'etat initial useState peut diverger entre rendu serveur et client (hydratation)
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `components/product/composition-modal.tsx:47-50 (et composition-bottom-sheet.tsx:42-45)`
- **Problème**: L'etat initial des selections est genere via crypto.randomUUID() au moment du premier rendu (useState initializer). Ces composants sont 'use client' rendus dans des modales montees a la demande, mais si jamais ils sont rendus cote serveur (App Router), le UUID genere au SSR differera de celui genere a l'hydratation, provoquant un avertissement de mismatch React. Les ids ne servent que de cle locale; ils pourraient etre generes en useEffect ou via useId() pour eviter tout risque d'hydratation et garantir le determinisme.
- **Correctif proposé**: Utiliser React.useId() ou un compteur incremental pour les cles de slot, ou initialiser les selections dans un useEffect, afin d'eviter tout mismatch SSR/CSR.


### Panier / checkout / Stripe / promo (21)

#### 🔴 La page de succes ne lit jamais order_id -> page de confirmation cassee pour le SEUL flux de commande reellement branche
- **Gravité/Catégorie**: critical / missing-display
- **Fichier**: `app/checkout/success/page.tsx:37, 51 ; app/commande/page.tsx:169`
- **Problème**: Le flux de commande reel (/commande -> /api/orders/place, paiement cash/CB) redirige vers `/checkout/success?order_id=${data.orderId}`. Mais la page success ne lit QUE `searchParams.get("session_id")` et appelle `/api/orders/by-session?session_id=...`. Comme `session_id` est null, elle part toujours en etat d'erreur (fallback generique "Merci pour votre commande" sans recap, sans code de retrait, sans articles). Le client ne voit jamais son recapitulatif ni son pickupCode. Un endpoint qui fonctionnerait existe pourtant: GET /api/orders/[id].
- **Correctif proposé**: Dans success/page.tsx, lire aussi `order_id` (`const orderId = searchParams.get('order_id')`) et, s'il est present, fetch `/api/orders/${orderId}` (qui existe deja et renvoie items/pickupCode/total). Garder le chemin session_id pour Stripe. Sinon harmoniser commande/page.tsx pour rediriger en `?order_id=` ET adapter success.

#### 🔴 Prix des compositions sous-facture: serveur ignore ingredients, taille et quantite (utilise basePrice seul)
- **Gravité/Catégorie**: critical / bug
- **Fichier**: `app/api/orders/place/route.ts:53, 59 ; app/api/stripe/checkout/route.ts:43,49,129`
- **Problème**: Cote client, le prix d'une composition est `(basePrice + ingredientsPrice) * sizeMultiplier * quantity` stocke dans `customData.totalPrice` (composition-modal.tsx:96/121), et l'UI affiche un prix unitaire = `customData.totalPrice / quantity`. Mais le serveur calcule `const price = item.productId ? item.product.price : item.composition.basePrice` et fait `subtotal += price * quantity` + `priceAtPurchase = price`. Resultat: ingredients payants et multiplicateur de taille (small 0.7 / large 1.5) sont PERDUS. Le client voit un total dans /commande, mais l'Order enregistre un total inferieur et un priceAtPurchase faux. Mismatch direct admin/client et perte de revenu. Identique pour le webhook Stripe (line_items utilisent aussi basePrice).
- **Correctif proposé**: Cote serveur, pour une composition, deriver le prix unitaire depuis `item.customData.totalPrice / item.quantity` (avec garde-fou >= basePrice) ou recalculer a partir de customData.ingredients/size. Utiliser cette valeur pour subtotal, priceAtPurchase et les unit_amount Stripe. Ne jamais se reposer sur basePrice seul des qu'un customData existe.

#### 🟠 discount et promoCode captures sur Order mais jamais affiches au client
- **Gravité/Catégorie**: high / db-inconsistency
- **Fichier**: `app/api/orders/by-session/route.ts:38-57 ; app/api/orders/[id]/route.ts:35-58`
- **Problème**: Le code promo applique est bien enregistre (`discount`, `promoCode` sur Order). Mais aucun endpoint de lecture ni aucune page client ne renvoie/affiche ces champs: by-session et /orders/[id] n'incluent ni `discount` ni `promoCode`, et les pages success/commandes ne les rendent pas. Le client ne voit donc jamais la reduction appliquee dans son recap de commande, ce qui est incoherent (le sous-total des items + livraison ne correspond pas au total affiche). De plus le recap success affiche seulement Livraison, jamais le sous-total ni la remise.
- **Correctif proposé**: Ajouter `discount` et `promoCode` dans les payloads de by-session et /orders/[id], puis afficher une ligne 'Promo (CODE) -X.XX€' + 'Sous-total' dans success/page.tsx et commandes/[id]/page.tsx, sinon le total parait incoherent.

#### 🟠 Webhook Stripe: condition d'idempotence laisse une fenetre, et logique de statut fragile
- **Gravité/Catégorie**: high / bug
- **Fichier**: `app/api/stripe/webhook/route.ts:43`
- **Problème**: `if (!existingOrder || existingOrder.status === "validated") return received` puis update vers validated, decrement stock, vidage panier — sans transaction (Neon HTTP). Deux livraisons rapprochees du meme event (Stripe retry) peuvent toutes deux lire status='pending' avant que la 1ere ait commit, donc decrementer le stock DEUX fois et envoyer deux emails. Le flag d'idempotence n'est pas atomique. De plus, le flux Stripe etant du code mort (cf cart-06), ce webhook ne se declenche jamais en pratique mais reste un risque s'il est rebranche.
- **Correctif proposé**: Rendre la validation atomique: `updateMany({ where: { id: orderId, status: 'pending' }, data: { status: 'validated', ... } })` et ne continuer (stock/email) que si `count === 1`. Sinon enregistrer un flag d'event traite.

#### 🟠 Promo: incoherence de validation entre /promo/validate et le calcul final + double comptage potentiel d'utilisation
- **Gravité/Catégorie**: high / bug
- **Fichier**: `app/api/orders/place/route.ts:67-92 ; app/api/promo/validate/route.ts:38-43`
- **Problème**: Le serveur fait confiance au `subtotal` recalcule cote serveur (bien), mais ce subtotal est faux pour les compositions (cf cart-02), donc minOrder peut etre evalue sur un mauvais montant. Surtout: /promo/validate (UI) calcule la reduction sur un subtotal CLIENT (qui inclut ingredients via totalPrice) tandis que /api/orders/place recalcule la reduction sur un subtotal SERVEUR (basePrice seul). La remise affichee au client peut donc differer de la remise reellement enregistree. Par ailleurs currentUses est incremente dans orders/place ET dans stripe/checkout: si les deux chemins existaient, un code serait compte 2 fois (et l'increment se fait avant succes du paiement Stripe).
- **Correctif proposé**: Recalculer le subtotal serveur correctement (cf cart-02), puis derouler exactement la meme formule de remise que /promo/validate. Centraliser la logique promo dans une fonction partagee. N'incrementer currentUses qu'apres confirmation effective du paiement/commande.

#### 🟠 customData.totalPrice fige a l'ajout: changer la quantite dans le panier ne recalcule pas le prix de la composition
- **Gravité/Catégorie**: high / bug · _(repéré en vérification)_
- **Fichier**: `app/actions/cart.ts:131-147 ; components/cart/cart-page.tsx:115-127 ; app/commande/page.tsx:94-106:115`
- **Problème**: Pour une composition, le prix unitaire affiche est derive de customData.totalPrice/quantity (cart-page.tsx:115-116, drawer 98-99, commande 94-96). Or totalPrice a ete fige a l'ajout en incluant la quantite initiale (modal ligne 96). Quand l'utilisateur modifie la quantite via updateCartItemQuantity (cart.ts:132-141), SEUL CartItem.quantity change; customData.totalPrice n'est PAS recalcule. Resultat: total = (totalPrice_fige/ancienne_qte) * nouvelle_qte fonctionne par coincidence UNIQUEMENT si totalPrice/quantity reste le vrai prix unitaire — ce qui est vrai tant que la division est exacte, mais devient incoherent apres l'incoherence cart-08 (customData ecrase) ou si la quantite stockee dans totalPrice differe (ex re-ajout). Plus generalement le modele 'prix total fige incluant la quantite' est fragile et casse des que quantite et customData divergent. Le serveur, lui, ignore tout (cf cart-02).
- **Correctif proposé**: Stocker dans customData un prix UNITAIRE (unitPrice = (basePrice+ingredientsPrice)*sizeMultiplier) sans la quantite, puis calculer total = unitPrice*quantity partout (UI + serveur). Faire calculer priceAtPurchase serveur a partir de customData.unitPrice pour les compositions.

#### 🟡 Code mort: chemin de paiement Stripe non branche dans l'UI (double chemin de commande)
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `components/cart/cart-page.tsx:78-99 ; 303`
- **Problème**: `CartPage.handleCheckout` POST `/api/stripe/checkout`, mais le bouton 'Passer commande' est un `<Link href="/commande">` — handleCheckout/isCheckingOut ne sont jamais appeles. Tout le flux Stripe (checkout route + webhook + by-session) est donc inatteignable. Le seul flux vivant est cash/CB via /api/orders/place. Cela cree une fausse impression de paiement en ligne et laisse du code divergent (calculs de prix differents, increment promo avant paiement) qui peut etre rebranche par erreur.
- **Correctif proposé**: Decider d'un seul flux. Soit supprimer handleCheckout/Stripe si le paiement a la livraison est le modele, soit cabler reellement le bouton vers Stripe. Eviter deux implementations de calcul de prix/promo qui divergent.

#### 🟡 Seuil de livraison gratuite incoherent: > 30 (panier/drawer) vs >= 30 (commande/serveur)
- **Gravité/Catégorie**: medium / admin-client-mismatch
- **Fichier**: `components/cart/cart-page.tsx:135 ; components/cart/cart-drawer.tsx:117 ; app/commande/page.tsx:113 ; app/api/orders/place/route.ts:97`
- **Problème**: cart-page et cart-drawer utilisent `subtotal > 30 ? 0 : 4.9`. /commande utilise `subtotal >= 30 ? 0 : 4.9` et le serveur (place + stripe) aussi `>= 30`. A exactement 30€ de sous-total, le panier/tiroir affiche 4.90€ de frais alors que la commande sera gratuite -> total annonce different du total final, confusion client.
- **Correctif proposé**: Uniformiser sur `>= 30` partout (cart-page.tsx:135 et cart-drawer.tsx:117). Idealement extraire la regle dans une constante/utilitaire partage (FREE_SHIPPING_THRESHOLD=30, DELIVERY_FEE=4.9).

#### 🟡 Re-ajout d'une composition: customData ecrase et quantite additionnee a tort (collision @@unique)
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `app/actions/cart.ts:66-85`
- **Problème**: `addToCart` cherche un item existant par `(cartId, productId, compositionId)`. Pour deux compositions de MEME id mais ingredients/taille differents, c'est le meme triplet -> meme CartItem (contrainte @@unique[cartId,productId,compositionId]). La branche `existingItem && customData` fait `quantity += quantity` ET remplace customData par les nouvelles selections: l'utilisateur perd sa 1ere personnalisation et se retrouve avec une quantite cumulee au nouveau totalPrice. De plus `customData.totalPrice` (qui inclut l'ancienne quantite) devient incoherent avec la nouvelle quantite cumulee, faussant `totalPrice/quantity` dans l'UI.
- **Correctif proposé**: Pour les compositions personnalisees, ne pas fusionner: creer une ligne distincte (mais @@unique l'empeche). Soit ajouter un discriminant a la cle (hash du customData) ou retirer compositionId de la contrainte unique pour les compositions, soit remplacer (set) la quantite au lieu d'additionner et recalculer totalPrice = unitPrice * nouvelle quantite.

#### 🟡 currentOrders des DeliverySlot jamais incremente lors de la commande -> capacite non respectee
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `app/api/orders/place/route.ts:118-139`
- **Problème**: Le modele DeliverySlot a maxOrders/currentOrders et l'admin (delivery-slots/page.tsx:282) calcule `isFull = currentOrders >= maxOrders`. Mais a la creation d'une commande de livraison, deliverySlot/deliveryDate sont stockes en texte sans jamais incrementer currentOrders du slot correspondant. La limite de capacite par creneau n'est donc jamais appliquee: un creneau 'complet' restera selectionnable et currentOrders restera a 0.
- **Correctif proposé**: Lors de la creation d'une commande livraison, retrouver le DeliverySlot (par date+startTime) et faire `update({ data: { currentOrders: { increment: 1 } } })`, avec verification prealable currentOrders < maxOrders (sinon rejeter).

#### 🟡 Aucune revalidation de stock lors de la commande cash/CB (vente possible en rupture)
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `app/api/orders/place/route.ts:38-157`
- **Problème**: orders/place ne verifie jamais que currentStock >= quantity avant de creer la commande. Il decremente apres coup avec `Math.max(0, currentStock - quantity)`, ce qui ecrase silencieusement un depassement (currentStock devient 0 mais la commande contient plus que le stock). Le composant CartItem affiche un avertissement 'Stock insuffisant' mais n'empeche pas la commande (et n'existe que pour les produits; le stock composition est code en dur a 50/99). Un client peut commander 10 unites d'un produit a 2 en stock.
- **Correctif proposé**: Avant creation de l'Order, recharger les produits et rejeter (400) si une quantite depasse currentStock. Idealement decrementer en condition (`updateMany where currentStock >= quantity`) et annuler si echec.

#### 🟡 parseInt(quantity) sans base et NaN possible -> totalPrice/quantity NaN, prix composition corrompu
- **Gravité/Catégorie**: medium / bug · _(repéré en vérification)_
- **Fichier**: `components/product/composition-modal.tsx:96,114-122:96`
- **Problème**: totalPrice = (basePrice + ingredientsPrice) * sizeMultiplier * parseInt(quantity) (ligne 96). quantity est un state string ('1'..'10', borne par les boutons lignes 244/251). Si jamais quantity devenait '' ou non numerique, parseInt renverrait NaN et totalPrice=NaN serait stocke dans customData.totalPrice (ligne 121) puis persiste tel quel en DB (cart.ts customData Json). Cote panier, customData.totalPrice/quantity (cart-page.tsx:115, commande/page.tsx:95) propagerait NaN dans l'affichage et le subtotal. La quantite envoyee au serveur est aussi parseInt(quantity) (ligne 116). Aujourd'hui borne par l'UI, mais aucune garde de robustesse (Number.isFinite) ni validation cote action addToCart.
- **Correctif proposé**: Utiliser une quantite numerique sure: `const qty = Math.max(1, parseInt(quantity, 10) || 1)` et l'employer pour totalPrice et pour addToCart; idealement stocker aussi unitPrice (hors quantite) dans customData pour que le panier recalcule totalPrice = unitPrice * quantity apres tout changement de quantite.

#### 🟡 Order cree avant decrement de stock/vidage panier sans transaction: echec partiel laisse une commande validee avec stock/panier incoherents
- **Gravité/Catégorie**: medium / bug · _(repéré en vérification)_
- **Fichier**: `app/api/orders/place/route.ts:118-166:118`
- **Problème**: place/route.ts cree l'Order en status 'validated' (ligne 118-139), PUIS decremente le stock dans une boucle (lignes 146-157), PUIS vide le panier item par item (lignes 162-165) — aucune transaction (Neon HTTP). Si une de ces etapes echoue (ex erreur reseau au milieu de la boucle), la commande reste 'validated' (donc le client est facture/confirme) mais le stock n'est que partiellement decremente et/ou le panier pas vide -> le client peut re-commander les memes articles. Le catch global (ligne 187) renvoie une 500 generique apres que la commande a deja ete creee, donnant un faux echec a l'utilisateur alors que l'Order existe.
- **Correctif proposé**: Verifier le stock AVANT creation, puis encapsuler creation Order + decrements stock + vidage panier dans une seule operation atomique (prisma.$transaction ou Order.create avec nested writes + une route qui re-tente proprement). A minima, ne marquer la commande 'validated' qu'apres succes du decrement/vidage.

#### ⚪ /api/promo/validate sans authentification ni anti-bruteforce
- **Gravité/Catégorie**: low / security
- **Fichier**: `app/api/promo/validate/route.ts:4-15`
- **Problème**: L'endpoint de validation de code promo est public et sans limitation de debit. Il permet d'enumerer/bruteforcer des codes promo valides (reponse 200 valid vs 404/400) sans etre connecte. Faible severite (pas d'effet de bord, currentUses non incremente ici) mais facilite la decouverte de codes.
- **Correctif proposé**: Au minimum limiter le debit (rate limit par IP) et envisager d'exiger une session. Uniformiser les messages d'erreur pour ne pas distinguer 'inexistant' de 'expire'.

#### ⚪ selectedDelivery non transmis a la commande dans le flux panier; et CartPage permet de choisir un creneau ignore
- **Gravité/Catégorie**: low / ux
- **Fichier**: `components/cart/cart-page.tsx:23, 254-261, 303`
- **Problème**: CartPage propose un DeliveryCalendar (showCalendar) et stocke selectedDelivery, mais le bouton renvoie vers /commande via un Link sans transmettre ce creneau. Le client choisit un creneau dans le panier puis doit le re-choisir dans /commande. Donnee saisie puis ignoree (mauvaise UX, double saisie).
- **Correctif proposé**: Soit retirer le calendrier de la page panier (le creneau se choisit deja dans /commande), soit propager le creneau (querystring ou state global) vers /commande pour le pre-remplir.

#### ⚪ Telephone saisi a la commande jamais persiste
- **Gravité/Catégorie**: low / bug
- **Fichier**: `app/commande/page.tsx:50, 297-305, 154-163`
- **Problème**: Le champ `phone` est affiche, pre-rempli et editable dans /commande mais n'est jamais inclus dans le body POST vers /api/orders/place, et l'Order n'a pas de champ telephone. Le numero saisi/modifie pour la livraison est perdu. Champ saisi cote client jamais exploite.
- **Correctif proposé**: Soit retirer le champ telephone, soit l'envoyer et le persister (mettre a jour User.phone ou ajouter un champ a Order/livraison) pour qu'il serve reellement a la livraison.

#### ⚪ paymentMethod range dans le champ carrier de Order (detournement de champ)
- **Gravité/Catégorie**: low / db-inconsistency
- **Fichier**: `app/api/orders/place/route.ts:134`
- **Problème**: Le mode de paiement (cash/CB a la livraison) est stocke dans `carrier: paymentMethod === 'cash' ? 'Espèces' : 'CB à la livraison'`. carrier est cense designer le transporteur. Ce detournement rend les donnees ambigues (un transporteur reel ecraserait l'info de paiement) et il n'existe pas de champ dedie au mode de paiement sur Order. L'info de paiement n'est d'ailleurs affichee nulle part cote client.
- **Correctif proposé**: Ajouter un champ `paymentMethod`/`paymentStatus` au modele Order et y stocker la valeur, en laissant `carrier` pour le transporteur. Afficher le mode de paiement dans le recap de commande.

#### ⚪ Validation serveur manquante des champs de code promo cote admin (type/value)
- **Gravité/Catégorie**: low / bug
- **Fichier**: `app/api/admin/promo-codes/route.ts:30-46, 88-96`
- **Problème**: POST/PUT acceptent n'importe quel `type` (pas restreint a 'percentage'|'fixed') et n'importe quelle `value` (negative, >100 pour un pourcentage). Un type errone fait tomber le calcul de remise dans la branche 'fixed' partout (validate/place utilisent `type === 'percentage'` sinon fixed), et une value >100 en percentage donnerait une remise > sous-total (clampee ensuite, mais incoherente). Aucune contrainte cote schema non plus.
- **Correctif proposé**: Valider avec Zod cote API: type ∈ {percentage, fixed}, value >= 0 (et <= 100 si percentage), minOrder/maxUses >= 0. Rejeter en 400 sinon.

#### ⚪ Frais de livraison (4,90 EUR) appliques au panier vide / pre-chargement, et total panier sans code promo divergent du total final
- **Gravité/Catégorie**: low / admin-client-mismatch · _(repéré en vérification)_
- **Fichier**: `components/cart/cart-page.tsx:135-136 ; components/cart/cart-drawer.tsx:117-118:136`
- **Problème**: cart-page et cart-drawer calculent toujours `total = subtotal + deliveryFee` (lignes 136 / 118) en supposant une LIVRAISON, alors que /commande permet le 'retrait' (frais=0) et l'application d'un code promo. Le 'Total TTC' affiche dans le panier/tiroir inclut donc systematiquement 4,90 EUR de livraison (si <30 EUR) et ignore toute remise, alors que le total reellement debite (place/route.ts:98 `total = subtotal - promoDiscount + deliveryFee`, avec deliveryFee=0 en retrait) sera different. Le client voit un total panier superieur/different du total de commande -> confusion. Pas de notion de promo ni de mode de reception cote panier.
- **Correctif proposé**: Dans le panier/tiroir, presenter clairement 'Livraison estimee' et indiquer que les frais et remises seront calcules au choix du mode de reception et du code promo a l'etape commande; ou ne pas afficher de 'Total TTC' definitif tant que le mode de reception n'est pas choisi.

#### ⚪ by-session ne verifie pas que la commande Stripe est bien payee/validee (renvoie meme une commande 'pending')
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `app/api/orders/by-session/route.ts:19-36:19`
- **Problème**: by-session/route.ts cherche l'Order par stripeSessionId + userId (lignes 19-32) et le renvoie quel que soit son status (y compris 'pending', non paye). La page success affiche alors 'Commande confirmee !' / 'Total paye' (success/page.tsx:122,139) meme si le webhook n'a pas encore valide le paiement (ou ne le validera jamais en cas d'echec). Comme stripeSessionId est ecrit des la creation de la session (checkout/route.ts:184-187) avant tout paiement, l'endpoint peut confirmer une commande non payee. Latent car flux Stripe mort, mais incorrect.
- **Correctif proposé**: Filtrer sur status validated (where: { stripeSessionId, userId, status: 'validated' }) ou renvoyer le status et n'afficher 'confirmee/paye' que si status === 'validated'; afficher un etat 'paiement en cours' sinon.

#### ⚪ DELETE /api/admin/promo-codes sans validation de l'id et sans gestion d'absence (500 opaque)
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `app/api/admin/promo-codes/route.ts:58-72:65`
- **Problème**: Le handler DELETE lit `const { id } = await req.json()` (ligne 65) sans verifier que id est present, puis appelle directement `prisma.promoCode.delete({ where: { id } })`. Si id est undefined ou inexistant, Prisma leve (P2025/validation) et le catch renvoie un 500 'Internal Server Error' opaque (ligne 70) au lieu d'un 400/404 explicite. Incoherent avec POST/PUT qui valident la presence des champs. Mineur mais c'est une route admin qui devrait repondre proprement.
- **Correctif proposé**: Valider `if (!id) return 400`; envelopper le delete et mapper P2025 -> 404 'Code introuvable' au lieu d'un 500 generique.


### Commandes (admin & client) & factures (17)

#### 🟠 L'endpoint /validate est orphelin et ne genere ni invoiceNumber ni pickupCode
- **Gravité/Catégorie**: high / bug
- **Fichier**: `app/api/admin/orders/[id]/validate/route.ts:21-24`
- **Problème**: L'endpoint POST validate met juste status='validated' sans generer invoiceNumber ni pickupCode, contrairement au flux Stripe/place qui eux les generent. De plus, AUCUN composant UI n'appelle cet endpoint : la page admin (app/admin/orders/page.tsx) n'affiche aucun bouton d'action pour les commandes 'pending' (les boutons n'existent que pour validated/processing/shipped, lignes 263-279). Une commande Stripe restee 'pending' (webhook non recu, paiement abandonne) ne peut donc JAMAIS etre validee manuellement par l'admin, et meme si elle l'etait via l'API directe, elle n'aurait pas de facture ni de code retrait.
- **Correctif proposé**: Dans validate/route.ts, generer invoiceNumber (et pickupCode si deliveryMethod==='retrait' et absent) dans le update, et envoyer sendOrderStatusUpdate/sendOrderConfirmation. Ajouter dans page.tsx un bouton 'Valider' sur les cartes des commandes pending (la colonne 'En Attente' est rendue avec showActions=false ligne 336, donc aucune action n'est meme possible).

#### 🟠 Facture: total faux et ligne remise manquante quand un code promo est applique
- **Gravité/Catégorie**: high / bug
- **Fichier**: `app/api/invoices/[orderId]/route.ts:30-94`
- **Problème**: La facture calcule subtotal = somme(priceAtPurchase*quantity) puis affiche 'Sous-total HT', 'Livraison', et 'Total TTC' = order.total. Or order.total = subtotal - discount + deliveryFee (cf checkout/route.ts ligne 87 et place/route.ts ligne 98). La remise (order.discount) n'est jamais affichee ni soustraite. Resultat: pour toute commande avec promo, Sous-total + Livraison != Total TTC sur la facture -> document comptable incoherent. Le champ order.discount existe au schema (schema.prisma ligne 119) mais n'est meme pas inclus dans l'include du findUnique.
- **Correctif proposé**: Ajouter une ligne 'Remise (CODE) : -X.XX €' quand order.discount > 0, entre Sous-total et Total. Verifier que subtotal - order.discount + deliveryFee === order.total.

#### 🟠 Webhook Stripe: la condition d'idempotence empeche le stock d'etre decremente et l'email d'etre envoye si la commande n'est plus 'pending'
- **Gravité/Catégorie**: high / bug · _(repéré en vérification)_
- **Fichier**: `app/api/stripe/webhook/route.ts:43-45`
- **Problème**: La garde `if (!existingOrder || existingOrder.status === "validated") return NextResponse.json({ received: true })` est censee assurer l'idempotence, mais elle ne traite QUE deux cas: commande absente OU deja 'validated'. Or l'update qui suit (ligne 51) force status='validated' UNIQUEMENT pour les commandes 'pending'. Probleme inverse plus subtil: la condition compare a 'validated' alors que le webhook ne devrait traiter QUE les commandes 'pending'. Si une commande est dans un autre etat residuel (ex: 'cancelled' apres abandon puis reactivation, ou un etat intermediaire), le webhook la repassera quand meme en 'validated', re-decrementera le stock et re-enverra l'email a chaque retry Stripe (Stripe re-emet le webhook plusieurs fois en cas de timeout). La verification d'idempotence correcte devrait etre `if (!existingOrder || existingOrder.status !== 'pending') return ...`, sinon stock double-decremente possible sur retry si l'update a echoue apres un premier passage partiel.
- **Correctif proposé**: Remplacer la garde par `if (!existingOrder || existingOrder.status !== "pending") return NextResponse.json({ received: true })` afin de ne traiter (validation + decrement stock + email) que les commandes reellement en attente, garantissant l'idempotence sur les retries Stripe quel que soit l'etat final.

#### 🟠 Double decrementation du stock pour les commandes 'retrait' payees par Stripe (et incoherence stock vs commandes sans paiement)
- **Gravité/Catégorie**: high / bug · _(repéré en vérification)_
- **Fichier**: `app/api/stripe/checkout/route.ts:104-123`
- **Problème**: Flux Stripe: la commande est creee en 'pending' SANS decrementer le stock (checkout/route.ts:104-123), puis le webhook decremente au paiement (webhook:65-76). Flux sans paiement en ligne (orders/place/route.ts): le stock est decremente immediatement a la creation (place:142-157). Coherent en apparence. MAIS: le webhook Stripe ne traite que productId (item.product) et ignore totalement les compositions (orderItem.compositionId) — ce qui est attendu car Composition n'a pas de stock. Le vrai bug est ailleurs: si un client lance un checkout Stripe puis abandonne, la commande reste 'pending' AVEC les promoCode.currentUses deja incrementes (checkout:77-80) et le stock JAMAIS rendu cote pending (normal) — mais le code promo a deja consomme un usage pour une commande jamais payee. Un client peut epuiser maxUses d'un code promo en lancant des checkouts sans payer.
- **Correctif proposé**: Ne pas incrementer currentUses au moment du checkout. L'incrementer dans le webhook Stripe (checkout.session.completed) une fois le paiement confirme, ou prevoir un job de nettoyage qui decremente currentUses pour les commandes 'pending' expirees.

#### 🟡 discount et promoCode stockes mais jamais affiches (ni admin, ni client, ni facture)
- **Gravité/Catégorie**: medium / missing-display
- **Fichier**: `app/api/orders/[id]/route.ts:35-58`
- **Problème**: Les champs Order.discount et Order.promoCode sont ecrits en base lors de la commande (checkout/route.ts ligne 117-118, place/route.ts ligne 131-132) mais ne sont renvoyes par AUCUNE API d'affichage : GET /api/orders/[id] ne les expose pas, GET /api/admin/orders non plus, l'invoice ne les lit pas. Le client a paye avec une remise mais ne la voit nulle part dans son suivi de commande (la page /commandes/[id] calcule meme un 'Sous-total' = total - deliveryFee, ligne 194, ce qui est FAUX en presence de remise puisque le vrai sous-total brut est superieur).
- **Correctif proposé**: Exposer discount et promoCode dans GET /api/orders/[id] et GET /api/admin/orders, puis ajouter une ligne 'Remise' dans commandes/[id]/page.tsx et l'admin. Corriger le libelle 'Sous-total' pour qu'il reflete subtotal reel = total + discount - deliveryFee.

#### 🟡 Aucune validation des transitions de statut (regression de workflow possible)
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `app/api/admin/orders/[id]/status/route.ts:35-39`
- **Problème**: PUT status accepte n'importe quelle valeur de l'enum sans verifier la coherence de la transition. Un admin peut faire passer une commande 'delivered' a 'pending', ou 'cancelled' a 'shipped'. Pire: il peut repasser une commande a 'processing' depuis 'shipped' et re-declencher l'email pickup. Aucun garde-fou metier (seul validate/route.ts verifie status==='pending', mais il est orphelin cf ORD-01).
- **Correctif proposé**: Definir une machine d'etats (ex: pending->validated->processing->shipped->delivered, + cancelled depuis pending/validated/processing) et rejeter (400) toute transition non autorisee en lisant d'abord l'order existant.

#### 🟡 Les commandes retrait magasin passent en statut 'shipped' (Expediee) au lieu d'etre 'pretes a retirer'
- **Gravité/Catégorie**: medium / admin-client-mismatch
- **Fichier**: `app/api/admin/orders/[id]/delivery/route.ts:20-30`
- **Problème**: Le bouton 'Expedier' de l'admin (page.tsx lignes 269-273) est affiche pour TOUTE commande 'processing', y compris les retraits magasin (deliveryMethod='retrait'). L'appel PUT /delivery force status='shipped'. Cote client, /commandes/[id] affiche alors 'Expediee' avec une timeline 'En livraison' pour une commande qui doit etre retiree en magasin. Incoherent avec le concept click & collect. L'email sendPickupReadyEmail (envoye uniquement au passage en 'processing' dans status/route.ts ligne 43-45) n'est de toute facon jamais declenche via ce flux delivery.
- **Correctif proposé**: Pour deliveryMethod==='retrait', ne pas exposer 'Expedier' mais un bouton 'Prete a retirer' qui envoie sendPickupReadyEmail et laisse le statut adapte (ex: 'processing'/'ready'), et n'imposer 'shipped' que pour la livraison.

#### 🟡 Adresse du magasin incoherente: 'Guadeloupe 97100' cote retrait client vs 'Alfortville 94140' (adresse legale reelle)
- **Gravité/Catégorie**: medium / translation
- **Fichier**: `app/api/invoices/[orderId]/route.ts:44`
- **Problème**: Les pages/flux orientes client affichent 'Power — Primeur, 97100 Guadeloupe' comme adresse de retrait/vendeur, alors que l'entreprise est legalement et reellement a '114 Rue Paul Vaillant Couturier, 94140 Alfortville' (mentions-legales, CGV, layout SEO, emails). La FACTURE elle-meme (document legal) indique 'Guadeloupe' (lignes 44 et 100), ce qui est faux et juridiquement problematique. Idem page retrait client commandes/[id] ligne 250 et checkout/success ligne 185.
- **Correctif proposé**: Remplacer toutes les occurrences 'Guadeloupe / 97100' par '114 Rue Paul Vaillant Couturier, 94140 Alfortville' dans invoices/[orderId]/route.ts, commandes/[id]/page.tsx (ligne 249-250), checkout/success/page.tsx (ligne 185). Centraliser l'adresse dans une constante partagee.

#### 🟡 GET /api/admin/orders expose firstName/lastName/email/phone des clients sans pagination, et place/route.ts genere un invoiceNumber non garanti unique
- **Gravité/Catégorie**: medium / bug · _(repéré en vérification)_
- **Fichier**: `app/api/orders/place/route.ts:115`
- **Problème**: place/route.ts:115 genere `invoiceNumber = FAC-${Date.now().toString(36)...}-${Math.random()...}` et l'ecrit directement (ligne 133) sur un champ @unique (schema:117). Le webhook (webhook:48) utilise `FAC-${Date.now()...}-${orderId.slice(-4)}` et l'invoice route (invoices:141) un troisieme format encore different `FAC-${Date.now()...}-${order.id.slice(-4)}`. Trois schemas de numerotation de facture differents coexistent pour la meme entreprise (incoherence comptable: les numeros de facture ne se suivent pas et ne sont pas sequentiels comme l'exige la reglementation francaise). De plus le format base sur Date.now()+Math.random() n'est pas un numero de facture sequentiel legal.
- **Correctif proposé**: Centraliser la generation du numero de facture dans une seule fonction utilitaire produisant un compteur sequentiel persistant (ex: via SiteSetting ou une table dediee, type FAC-2026-000123), conforme a l'obligation francaise de numerotation chronologique et continue, et reutiliser cette fonction dans les 3 emplacements.

#### 🟡 L'invoice route genere et persiste un invoiceNumber pour N'IMPORTE quelle commande consultee, y compris 'pending' et 'cancelled'
- **Gravité/Catégorie**: medium / bug · _(repéré en vérification)_
- **Fichier**: `app/api/invoices/[orderId]/route.ts:139-147`
- **Problème**: GET /api/invoices/[orderId] genere et ECRIT un invoiceNumber en base (lignes 140-145) des qu'on consulte une commande qui n'en a pas, sans aucune verification du statut. Une commande 'pending' (paiement Stripe non abouti) ou 'cancelled' se voit donc attribuer un numero de facture officiel et unique simplement parce qu'un admin ou le client a ouvert l'URL de la facture. Cela cree des numeros de facture pour des ventes qui n'ont jamais eu lieu, polluant la sequence comptable et brulant des numeros @unique. Un client peut emettre une 'facture' pour une commande non payee.
- **Correctif proposé**: N'autoriser la generation/affichage de la facture que pour les commandes payees (status in validated/processing/shipped/delivered). Retourner une 403/400 pour 'pending' et 'cancelled' au lieu de generer un numero de facture.

#### ⚪ Le champ carrier est detourne pour stocker le mode de paiement dans les commandes sans paiement en ligne
- **Gravité/Catégorie**: low / db-inconsistency
- **Fichier**: `app/api/orders/place/route.ts:134`
- **Problème**: Pour les commandes 'cash'/'card_on_delivery', le code ecrit carrier='Especes' ou 'CB a la livraison'. Or carrier est destine au transporteur (Colissimo/Chronopost). Cote client (commandes/[id] ligne 286-296) et admin (page.tsx ligne 409), ce contenu s'affiche dans un bloc 'Transporteur', ce qui montre 'Transporteur: Especes' au client — incoherent. Il n'existe aucun champ paymentMethod au schema, d'ou ce detournement.
- **Correctif proposé**: Ajouter un champ paymentMethod String? au modele Order et l'utiliser, en reservant carrier au transporteur reel. A defaut, ne pas afficher carrier sous le libelle 'Transporteur' quand il vaut un mode de paiement.

#### ⚪ deliveryDate enregistree mais jamais affichee (ni admin ni client)
- **Gravité/Catégorie**: low / missing-display
- **Fichier**: `app/commandes/[id]/page.tsx:23-280`
- **Problème**: Order.deliveryDate est saisie au checkout (checkout/route.ts ligne 111, place/route.ts ligne 125) et renvoyee par les APIs (orders/[id] ligne 41, admin/orders ligne 40), mais aucune UI ne l'affiche : la page client n'affiche que deliverySlot (ligne 275-280) et l'admin idem (page.tsx ligne 408). La date de livraison choisie par le client est donc invisible partout.
- **Correctif proposé**: Afficher la date de livraison (ex: 'Livraison prevue le {deliveryDate} — creneau {deliverySlot}') dans commandes/[id]/page.tsx et dans la modal admin.

#### ⚪ Onglet commandes client: prix unitaire et total par ligne jamais affiches alors que disponibles
- **Gravité/Catégorie**: low / missing-display
- **Fichier**: `components/account/orders-tab.tsx:163-172`
- **Problème**: getUserOrders renvoie priceAtPurchase pour chaque item (account.ts), et l'interface OrderItem le declare (ligne 15), mais l'affichage ne montre que le nom et 'x{quantity} {unit}'. Le prix et le total ligne ne sont jamais rendus dans la liste des commandes du compte, contrairement a la page de detail. Donnee recuperee puis ignoree.
- **Correctif proposé**: Afficher le prix unitaire et/ou le sous-total par ligne (item.priceAtPurchase * item.quantity) dans la carte commande de l'onglet compte.

#### ⚪ Bouton 'Facture' cache au client pour les commandes 'pending' alors que la facture est generee a la volee
- **Gravité/Catégorie**: low / ux
- **Fichier**: `components/account/orders-tab.tsx:183-189`
- **Problème**: Le bouton Facture n'apparait que pour validated/delivered/shipped/processing. Or GET /api/invoices/[orderId] genere un invoiceNumber a la demande s'il n'existe pas (lignes 140-147) — donc une facture est techniquement disponible pour toute commande. Inversement, pour 'cancelled' c'est correctement masque. Mais l'incoherence reelle est cote admin: la liste admin n'offre AUCUN lien de telechargement de facture (page.tsx affiche invoiceNumber en texte ligne 437-439 mais sans lien vers /api/invoices/[id]).
- **Correctif proposé**: Ajouter un lien 'Telecharger la facture' (href=/api/invoices/[id]) dans la modal admin. Cote client, l'affichage conditionnel est acceptable mais incoherent avec la generation a la volee — clarifier le critere.

#### ⚪ Facture: mention TVA absente du recapitulatif alors que le regime est 'TVA non applicable art.293B'
- **Gravité/Catégorie**: low / config
- **Fichier**: `app/api/invoices/[orderId]/route.ts:82-95`
- **Problème**: La facture libelle les colonnes 'Sous-total HT' et 'Total TTC' sans aucune ligne ni mention de TVA. L'email de facture (lib/email.ts ligne 379) precise 'TVA non applicable, art. 293 B du CGI', mention legale obligatoire pour un auto/micro non assujetti — absente de la facture PDF/HTML reellement telechargeable. Melanger HT et TTC sans ligne de TVA est trompeur.
- **Correctif proposé**: Ajouter la mention 'TVA non applicable, art. 293 B du CGI' dans le footer de la facture HTML et harmoniser les libelles (si non assujetti, ne pas afficher 'HT'/'TTC' mais 'Total').

#### ⚪ delivery/route.ts ne valide pas l'existence/etat de la commande et peut planter sur un id inexistant
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `app/api/admin/orders/[id]/delivery/route.ts:20-30`
- **Problème**: Contrairement a validate/route.ts qui fait un findUnique + check 404 (validate:12-15), delivery/route.ts appelle directement prisma.order.update sur un id non verifie. Si l'id n'existe pas, Prisma leve une exception P2025 attrapee par le catch generique et renvoie un 500 'Failed to update delivery info' au lieu d'un 404 explicite. De plus, aucune verification que la commande est bien en 'processing' avant de la passer en 'shipped': on peut expedier une commande deja 'delivered' ou 'cancelled' directement via l'API (meme faille de transition que ORD-04, mais ici en plus le champ est force a 'shipped' sans garde).
- **Correctif proposé**: Ajouter un findUnique + retour 404 si introuvable, et verifier que order.status === 'processing' (et deliveryMethod === 'livraison') avant de passer en 'shipped'; renvoyer 400 sinon.

#### ⚪ Frais de livraison gratuits a partir de 30€ calcules sur le sous-total AVANT remise, incoherence possible vs le seuil affiche au client
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `app/api/stripe/checkout/route.ts:86-87`
- **Problème**: deliveryFee = subtotal >= 30 ? 0 : 4.90 utilise subtotal AVANT application de la remise promo (promoDiscount calcule lignes 53-82 mais non soustrait du subtotal pour le test du seuil). Un client avec subtotal 32€ et une remise de 5€ (panier net 27€) beneficie quand meme de la livraison gratuite, alors qu'un client a 27€ net sans promo paie 4.90€. Selon la regle commerciale voulue (seuil sur montant net ou brut), c'est potentiellement incoherent et non documente. Identique dans orders/place/route.ts:97. A clarifier avec le proprietaire car cela impacte la marge.
- **Correctif proposé**: Decider et documenter si le seuil de livraison gratuite s'applique au montant brut ou net de remise; si net, calculer `const netSubtotal = subtotal - promoDiscount; const deliveryFee = isDelivery ? (netSubtotal >= 30 ? 0 : 4.90) : 0`. Appliquer la meme regle dans place/route.ts.


### Marketing & emails (18)

#### 🔴 Page newsletter non fonctionnelle: l'inscription ne fait rien
- **Gravité/Catégorie**: critical / bug
- **Fichier**: `app/newsletter/page.tsx:24-36`
- **Problème**: La page /newsletter presente un champ email et un bouton 'S'abonner maintenant', mais c'est un Server Component statique sans logique: l'input n'a aucun state, le Button aucun onClick, et il n'existe aucune action serveur ni route API d'inscription newsletter. Cliquer ne cree/maj aucune UserPreference (newsletter=true) et n'enregistre rien en base. La fonction 'inscription newsletter cote client' demandee par le proprietaire est entierement non operante.
- **Correctif proposé**: Convertir la page (ou un sous-composant) en client component avec state email + handler qui appelle une nouvelle server action (ex: app/actions/newsletter.ts -> subscribeNewsletter(email)). Cette action doit, si l'email correspond a un User, upsert UserPreference {newsletter:true}; sinon stocker l'inscrit (creer un modele NewsletterSubscriber ou un User leger). Afficher un toast succes/erreur.

#### 🟠 Email de reinitialisation envoye depuis un domaine errone (power-primeur.com) -> envoi Resend echoue
- **Gravité/Catégorie**: high / bug
- **Fichier**: `app/api/auth/forgot-password/route.ts:44`
- **Problème**: Le from utilise 'noreply@power-primeur.com' (avec un tiret), alors que tout le reste de l'application (lib/email.ts, robots, sitemap, layout, CGV) utilise le domaine 'powerprimeur.com' (sans tiret). Un seul domaine peut etre verifie dans Resend; ce 'from' ne correspond pas au domaine reel et Resend rejettera l'envoi (erreur 'domain is not verified'). Resultat: aucun email de reinitialisation de mot de passe n'arrive jamais, alors que l'UI affiche 'Email envoye !'. Le flux 'mot de passe oublie' est casse en production.
- **Correctif proposé**: Remplacer par le domaine verifie unique. Idealement reutiliser FROM_EMAIL de lib/email.ts (ou une constante partagee) : from: 'Power Primeur <noreply@powerprimeur.com>'. Verifier que ce domaine est bien verifie dans Resend.

#### 🟠 Campagne marketing envoyee a TOUS les clients sans respecter les preferences (RGPD/consentement)
- **Gravité/Catégorie**: high / bug
- **Fichier**: `app/api/admin/marketing/send/route.ts:61-68`
- **Problème**: La selection des destinataires filtre uniquement role='user' et isActive=true. Elle ignore totalement UserPreference.newsletter et UserPreference.promotions. Un client qui a desactive newsletter/promotions (ou ne les a jamais actives, valeurs par defaut newsletter=false, promotions=false dans le schema) recevra quand meme tous les emails marketing et les codes promo. C'est un envoi non sollicite (probleme legal/RGPD) et cela contredit directement la fonctionnalite de preferences exposee dans SettingsTab. Le bloc de desinscription affiche dans l'email devient mensonger.
- **Correctif proposé**: Filtrer via la relation preferences. Ex: where: { role:'user', isActive:true, preferences: { OR: [{ newsletter: true }, { promotions: true }] } }. Idealement distinguer: si includePromo -> cibler promotions=true; sinon -> newsletter=true. Et exclure ceux avec emailNotifications=false.

#### 🟠 Formulaire de contact: aucun email de notification n'est envoye a l'equipe
- **Gravité/Catégorie**: high / bug
- **Fichier**: `app/actions/contact.ts:20-25`
- **Problème**: submitContactForm cree bien un ContactMessage en base mais n'appelle jamais sendContactNotification (qui existe pourtant dans lib/email.ts). L'equipe ne recoit donc aucune alerte par email quand un client envoie un message; il faut consulter manuellement l'admin. La fonction sendContactNotification est du code mort.
- **Correctif proposé**: Importer sendContactNotification depuis @/lib/email et l'appeler apres la creation: await sendContactNotification(parsed.data.name, parsed.data.email, parsed.data.subject ?? '', parsed.data.message). Ne pas faire echouer la soumission si l'email echoue (try/catch interne).

#### 🟡 Email de bienvenue jamais envoye a l'inscription
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `app/api/auth/register/route.ts:40-58`
- **Problème**: Le register cree le User mais n'appelle jamais sendWelcomeEmail (defini dans lib/email.ts, 0 appelant). De plus aucune UserPreference n'est creee a l'inscription (elle sera creee paresseusement au premier getUserPreferences). L'email transactionnel de bienvenue, pourtant developpe, n'est jamais declenche.
- **Correctif proposé**: Apres la creation du user, appeler await sendWelcomeEmail(user.email, user.firstName ?? '') dans un try/catch. Optionnel: creer aussi la UserPreference avec un consentement explicite (newsletter selon une case a cocher d'inscription).

#### 🟡 Emails de suivi de commande ignorent la preference orderUpdates
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `app/api/admin/orders/[id]/status/route.ts:42-49`
- **Problème**: sendOrderStatusUpdate/sendPickupReadyEmail sont envoyes des qu'un email user existe, sans verifier UserPreference.orderUpdates (ni emailNotifications). Le toggle 'Suivi de commandes' de SettingsTab est donc cosmetique: le desactiver n'a aucun effet. Meme remarque pour /api/admin/orders/[id]/delivery (sendOrderStatusUpdate 'shipped').
- **Correctif proposé**: Inclure les preferences (include:{ user:{ include:{ preferences:true }}}) et n'envoyer que si user.preferences?.orderUpdates !== false && user.preferences?.emailNotifications !== false. Note: l'email de confirmation de paiement reste justifie meme si orderUpdates est off.

#### 🟡 sendInvoiceEmail (facture) developpe mais jamais declenche
- **Gravité/Catégorie**: medium / missing-display
- **Fichier**: `lib/email.ts:312-394`
- **Problème**: La fonction sendInvoiceEmail genere un email de facture detaille (lignes, sous-total, livraison, remise, total TTC, SIRET) mais n'est appelee nulle part (0 appelant). Le client ne recoit jamais de facture par email malgre l'existence d'invoiceNumber sur Order. Code mort / fonctionnalite promise non branchee.
- **Correctif proposé**: Appeler sendInvoiceEmail apres une commande payee (dans /api/orders/place et/ou le webhook Stripe une fois l'invoiceNumber genere), en passant items, subtotal, deliveryFee, discount, total et le moyen de paiement.

#### 🟡 Generation de code promo: valeurs admin non validees -> code promo a 0 / NaN possible
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `app/api/admin/marketing/send/route.ts:38-59`
- **Problème**: La route utilise promoValue || 10, promoMinOrder || 0, promoMaxUses || 0 sans validation Zod ni verification de type. Le client envoie parseFloat(promoValue) qui peut etre NaN si le champ est vide; NaN || 10 -> 10 (ok par chance), mais une valeur 0 saisie volontairement (ex: 0% ou 0€) passe a value:0 sans erreur, creant un code promo inutile. Aucune borne max sur le pourcentage (ex: 999%). promoType n'est pas valide contre l'enum ('percentage'/'fixed').
- **Correctif proposé**: Valider le body avec un schema Zod: promoType z.enum(['percentage','fixed']); promoValue z.number().positive() (et <=100 si percentage); promoMinOrder/promoMaxUses z.number().nonnegative(); promoExpiresInDays z.number().int().positive(). Rejeter en 400 sinon.

#### 🟡 Echec d'envoi marketing rapporte comme succes au front (sent = emails.length en fallback)
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `app/api/admin/marketing/send/route.ts:94-101`
- **Problème**: sendMarketingEmail attrape ses erreurs et retourne {success:false, error} sans champ 'sent'. La route ignore result.success et fait sent: result.sent || emails.length. Donc si Resend echoue (cle invalide, domaine non verifie, rate limit), result.sent est undefined -> on renvoie sent = nombre total de clients et success:true. L'admin voit 'Email envoye a N client(s) !' alors qu'aucun email n'est parti. Aucune remontee d'erreur.
- **Correctif proposé**: Verifier result.success: if (!result.success) return NextResponse.json({ error: 'Echec de l'envoi des emails' }, { status: 500 }). Et renvoyer sent: result.sent (sans fallback sur emails.length).

#### 🟡 Le compteur 'sent' du marketing est incremente avant la confirmation d'envoi du batch
- **Gravité/Catégorie**: medium / bug · _(repéré en vérification)_
- **Fichier**: `lib/email.ts:419-432`
- **Problème**: Dans sendMarketingEmail, sent += batch.length (ligne 431) est execute apres await Promise.all mais si Promise.all rejette (un seul envoi en echec), l'exception est attrapee par le catch global (ligne 435) qui retourne {success:false, error} en perdant TOUT compteur, alors que les batches precedents ont peut-etre reussi. Inversement, comme la route ignore success (cf MKT-10), un succes partiel n'est jamais remonte correctement. Le nombre 'sent' n'a aucune fiabilite: soit il vaut emails.length total (fallback route), soit il est perdu. Aucun decompte reel des envois reussis vs echoues.
- **Correctif proposé**: Utiliser Promise.allSettled, compter uniquement les status==='fulfilled', et retourner {success, sent, failed} puis dans la route renvoyer success=result.success et sent=result.sent reel (et 207/erreur si failed>0).

#### 🟡 Echappement HTML incomplet du message marketing (pas d'echappement de < et >)
- **Gravité/Catégorie**: medium / security · _(repéré en vérification)_
- **Fichier**: `app/api/admin/marketing/send/route.ts:75-77`
- **Problème**: Le message admin est transforme par .replace(/\n/g,'<br/>').replace(/&/g,'&amp;') puis injecte tel quel dans le HTML de l'email. Les caracteres < et > ne sont jamais echappes, donc tout HTML/balise saisi dans le textarea admin est rendu brut dans l'email envoye a tous les clients. Contrairement a sendContactNotification (email.ts:103) qui echappe correctement &,<,>,". Risque d'injection HTML et de rendu casse. De plus l'ordre est fragile: remplacer & en dernier est correct ici car <br/> ne contient pas de &, mais l'absence d'echappement de < / > reste le vrai trou.
- **Correctif proposé**: Echapper d'abord &, puis < et >, AVANT de convertir \n en <br/>: message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>').

#### ⚪ Adresse email de contact incoherente entre l'affichage client et le destinataire reel
- **Gravité/Catégorie**: low / admin-client-mismatch
- **Fichier**: `app/contact/page.tsx:62`
- **Problème**: La page contact affiche 'contact@power.com' aux visiteurs, mais sendContactNotification (si elle etait branchee) envoie vers 'contact@powerprimeur.com'. Deux adresses differentes pour le meme concept; 'power.com' n'est pas le domaine de la marque. Risque de confusion et de courrier perdu pour les clients qui ecrivent directement.
- **Correctif proposé**: Uniformiser sur l'adresse reelle (contact@powerprimeur.com) dans la page contact, ou utiliser une constante partagee.

#### ⚪ Preferences theme et language stockees mais jamais exposees au client
- **Gravité/Catégorie**: low / missing-display
- **Fichier**: `app/actions/preferences.ts:7-15`
- **Problème**: Le schema UserPreference et le schema Zod incluent theme (light/dark/system) et language (fr/en), et updateUserPreferences sait les ecrire. Mais SettingsTab n'expose ni theme ni language (seulement les 5 toggles de notifications). Ces champs sont donc figes a leur valeur par defaut et inutilises cote client. (language=en serait de toute facon hors-scope puisque l'app est uniquement en francais.)
- **Correctif proposé**: Soit exposer un selecteur de theme dans SettingsTab et l'appliquer, soit retirer theme/language du schema de preferences s'ils ne seront pas utilises (eviter les champs morts). Supprimer 'en' de language vu que l'app est mono-langue FR.

#### ⚪ forgot-password sans rate limiting -> risque d'abus d'envoi d'emails
- **Gravité/Catégorie**: low / security
- **Fichier**: `app/api/auth/forgot-password/route.ts:8-37`
- **Problème**: La route reset password ne possede aucune limitation de debit ni captcha. Un attaquant peut declencher des envois en masse (cout Resend, spam de la boite des utilisateurs, enumeration via timing). La protection anti-enumeration (return success si user absent) est presente mais le timing differe nettement (recherche + upsert + envoi pour un user existant).
- **Correctif proposé**: Ajouter un rate limiting (par IP et par email) sur cette route, et idealement un cooldown entre deux demandes pour un meme compte.

#### ⚪ promoValue/promoMinOrder peuvent etre envoyes comme chaines et casser .toFixed()
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `app/api/admin/marketing/send/route.ts:48-58`
- **Problème**: value: promoValue||10 et minOrder: promoMinOrder||0 sont passes a prisma.promoCode.create sur des champs Float. Le client envoie bien des nombres (parseFloat), mais comme il n'y a aucune coercition/validation cote serveur, un appel direct avec promoMinOrder:'5' (string) ecrirait une valeur que Prisma rejettera, ou pire promoValue interpole en chaine dans promoLabel (`${promoValue}% de reduction`, ligne 57-58) puis l'email affiche minOrder.toFixed(2) (ligne 86) qui leverait une exception si la valeur n'est pas un Number apres relecture. Couple a l'absence de Zod (MKT-09), le typage n'est garanti que par chance via le client.
- **Correctif proposé**: Valider et coercer cote serveur avec Zod: z.coerce.number().min(0), z.enum(['percentage','fixed']) pour promoType, et borner promoValue (ex max 100 si percentage).

#### ⚪ sendOrderStatusUpdate('shipped') envoye sans numero de suivi depuis status/route, alors que delivery/route le fournit
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `app/api/admin/orders/[id]/status/route.ts:47`
- **Problème**: Si un admin passe une commande au statut 'shipped' via status/route.ts, sendOrderStatusUpdate est appele SANS trackingNumber (4e arg omis), donc l'email 'expediee' n'affiche jamais le numero de suivi meme si l'Order en a un en base (updatedOrder.trackingNumber est charge mais ignore). Seul le passage par delivery/route transmet trackingNumber. Deux chemins divergents pour le meme email 'shipped'.
- **Correctif proposé**: Passer updatedOrder.trackingNumber comme 4e argument: sendOrderStatusUpdate(updatedOrder.user.email, id, status, updatedOrder.trackingNumber ?? undefined).

#### ⚪ Adresse/region du pied de page du mail de reinitialisation incoherente avec le reste du site
- **Gravité/Catégorie**: low / translation · _(repéré en vérification)_
- **Fichier**: `app/api/auth/forgot-password/route.ts:71`
- **Problème**: Le footer de l'email forgot-password indique 'Power — Primeur | 97100 Guadeloupe', alors que toute l'application (lib/email.ts:28 et 237, contact/page.tsx:84, cgv) donne l'adresse '114 Rue Paul Vaillant Couturier, 94140 Alfortville'. Adresse/region incoherente pour la meme marque dans un email transactionnel.
- **Correctif proposé**: Remplacer par l'adresse canonique '114 Rue Paul Vaillant Couturier, 94140 Alfortville' (ou mieux, reutiliser emailWrapper de lib/email.ts pour un footer unique).

#### ⚪ Le mail de reinitialisation duplique le template au lieu de reutiliser emailWrapper, divergence de marque
- **Gravité/Catégorie**: low / db-inconsistency · _(repéré en vérification)_
- **Fichier**: `app/api/auth/forgot-password/route.ts:44-73`
- **Problème**: forgot-password reconstruit son propre HTML et son propre from au lieu d'importer FROM_EMAIL/emailWrapper de lib/email.ts. C'est la cause racine de MKT-02 (domaine power-primeur.com) et de l'adresse Guadeloupe erronee: toute la logique email centralisee dans lib/email.ts est contournee. Toute future correction de marque devra etre faite a deux endroits.
- **Correctif proposé**: Creer une fonction sendPasswordResetEmail dans lib/email.ts utilisant FROM_EMAIL et emailWrapper, et l'appeler depuis la route.


### Créneaux de livraison (17)

#### 🔴 currentOrders n'est JAMAIS incremente a la commande (reserveDeliverySlot jamais appelee)
- **Gravité/Catégorie**: critical / bug
- **Fichier**: `app/actions/delivery.ts:36-58 (reserveDeliverySlot) ; app/api/orders/place/route.ts:118 ; app/api/stripe/checkout/route.ts:104 ; app/api/stripe/webhook/route.ts:51`
- **Problème**: Le seul code qui incremente DeliverySlot.currentOrders est reserveDeliverySlot(slotId). Un grep sur tout le repo montre qu'elle n'est appelee NULLE PART. Aucun des chemins de creation de commande (orders/place, stripe/checkout, stripe/webhook) ne reserve le creneau. Consequence: currentOrders reste 0 a vie, maxOrders n'est jamais atteint, un creneau n'est jamais marque Complet, et on peut sur-reserver indefiniment (capacite de livraison ignoree). Le compteur 'X/maxOrders' de l'admin et le filtre de disponibilite cote client sont donc toujours faux.
- **Correctif proposé**: Faire transiter l'id du creneau (slotId) depuis le DeliveryCalendar jusqu'a l'order, puis appeler reserveDeliverySlot(slotId) (ou un increment atomique avec garde currentOrders<maxOrders) dans le meme flux que la creation de commande: orders/place ET stripe/webhook (au moment ou status passe a validated). Idealement dans une transaction Prisma avec la creation de l'Order.

#### 🔴 deliveryDate stocke comme Invalid Date (date FR 'JJ/MM/AAAA' passee a new Date())
- **Gravité/Catégorie**: critical / bug
- **Fichier**: `app/commande/page.tsx:70 (date) -> 156 (deliveryDate) ; app/api/orders/place/route.ts:125 ; app/api/stripe/checkout/route.ts:111`
- **Problème**: Le calendrier renvoie date = selectedDate.toLocaleDateString('fr-FR') soit par ex '15/06/2026'. Cette valeur est envoyee comme deliveryDate, puis cote serveur convertie via `deliveryDate ? new Date(deliveryDate) : null`. Or new Date('15/06/2026') retourne Invalid Date (verifie en node: 'Invalid Date'). Prisma rejettera l'ecriture du champ DateTime (erreur) OU stockera une date invalide selon le driver -- dans tous les cas la date de livraison choisie par le client est corrompue/perdue. La table Order possede pourtant deliveryDate ET deliverySlot prevus a cet effet.
- **Correctif proposé**: Dans DeliveryCalendar, renvoyer la date au format ISO YYYY-MM-DD (ex: selectedDate.toISOString().split('T')[0]) plutot que toLocaleDateString('fr-FR'). Cote serveur, valider la date (rejeter si Number.isNaN(new Date(deliveryDate).getTime())). Conserver l'affichage FR uniquement a la presentation.

#### 🔴 Fenetre de requete des creneaux a largeur nulle + decalage de fuseau: getAvailableDeliverySlots ne renvoie jamais les vrais creneaux
- **Gravité/Catégorie**: critical / bug
- **Fichier**: `app/actions/delivery.ts:7-16 ; components/delivery/delivery-calendar.tsx:47-48`
- **Problème**: Le calendrier appelle getAvailableDeliverySlots(dateStr, dateStr) avec dateStr = YYYY-MM-DD. Cote serveur la requete est `date: { gte: new Date(startDate), lte: new Date(endDate) }` soit gte=lte=YYYY-MM-DDT00:00:00Z: une fenetre d'instant unique. Or l'auto-generation stocke date = minuit LOCAL du serveur. Si le serveur n'est pas en UTC (l'adresse boutique est '97100 Guadeloupe' = UTC-4), le creneau est stocke a ...T04:00:00Z et n'entre donc PAS dans [T00:00:00Z, T00:00:00Z] (verifie: match=false en TZ America/Guadeloupe). Resultat: la DB renvoie systematiquement 0 creneau, le calendrier bascule sur les creneaux par defaut codes en dur (qui n'existent pas en base), donc le client ne reserve jamais un vrai DeliverySlot.
- **Correctif proposé**: Requeter une vraie plage de journee: gte = debut de jour, lt = debut du jour suivant. Le plus robuste: normaliser TOUTES les dates de DeliverySlot en UTC minuit (stocker new Date(`${y}-${m}-${d}T00:00:00Z`) dans auto-generate et POST manuel), et cote lecture utiliser { gte: new Date(`${date}T00:00:00Z`), lt: jour+1 }.

#### 🟠 Creneaux par defaut codes en dur cote client ne correspondent pas aux creneaux admin (08:00-10:00 vs 09:00-10:00...)
- **Gravité/Catégorie**: high / admin-client-mismatch
- **Fichier**: `components/delivery/delivery-calendar.tsx:25-30, 84-90`
- **Problème**: Quand aucun creneau DB n'est renvoye (ce qui est TOUJOURS le cas a cause de delivery-03), le calendrier affiche defaultSlots = 08:00-10:00, 10:00-12:00, 14:00-16:00, 16:00-18:00. Or l'admin/auto-generate ne genere que des creneaux d'1h de 09:00 a 17:00 (09:00-10:00, ... 16:00-17:00). Le client choisit donc des creneaux fictifs (ex '08:00 - 10:00') qui n'existent pas en base, ne sont pas comptabilises, et ne correspondent a aucune capacite reelle. Le creneau enregistre dans Order.deliverySlot est une chaine arbitraire sans lien avec DeliverySlot.
- **Correctif proposé**: Supprimer les creneaux par defaut codes en dur (ou les aligner exactement sur la politique admin). Si la DB ne renvoie rien, afficher 'Aucun creneau disponible ce jour' au lieu d'un fallback fictif, et empecher la validation tant qu'un vrai DeliverySlot.id n'est pas selectionne.

#### 🟠 deliveryDate (date de livraison choisie) n'est jamais affichee au client ni a l'admin
- **Gravité/Catégorie**: high / missing-display
- **Fichier**: `app/commandes/[id]/page.tsx:275-280 ; app/checkout/success/page.tsx:215-220 ; app/admin/orders/page.tsx:40,243-248,408`
- **Problème**: Order.deliveryDate est bien recupere par les APIs (orders/[id]:41, by-session:43) et present dans les interfaces des pages, mais AUCUNE page ne le rend. Le detail commande client, la page succes et l'admin n'affichent que deliverySlot (l'heure, ex '09:00 - 10:00'). Le client voit 'Creneau : 09:00 - 10:00' sans savoir QUEL JOUR il sera livre. Donnee saisie + renvoyee par l'API mais ignoree a l'affichage.
- **Correctif proposé**: Afficher la date de livraison a cote du creneau partout: ex `Livraison le {new Date(order.deliveryDate).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })} - {order.deliverySlot}`. Idem dans l'email de confirmation (lib/email.ts) qui ne mentionne ni date ni creneau.

#### 🟠 Le champ Telephone du checkout est collecte mais jamais envoye ni persiste (donnee perdue)
- **Gravité/Catégorie**: high / missing-display · _(repéré en vérification)_
- **Fichier**: `app/commande/page.tsx:52, 70, 298-304, 154-163`
- **Problème**: L'input 'Telephone' est pre-rempli depuis le profil (setPhone, ligne 70) et editable (ligne 300), mais le body de /api/orders/place (lignes 154-163) n'inclut PAS `phone`. De plus le modele Order n'a aucun champ telephone (schema.prisma:101-126). Le numero de telephone de livraison saisi/modifie par le client est donc silencieusement jete: le livreur n'aura pas le bon numero pour cette commande. Champ saisi cote client mais ni transmis ni stocke.
- **Correctif proposé**: Ajouter `deliveryPhone String?` au modele Order, l'inclure dans le body du POST et dans order.create des deux routes (place + stripe/checkout), puis l'afficher cote admin/commande. A minima, persister le phone modifie sur le User.

#### 🟡 Le calendrier client ne restreint pas aux jours de livraison (Mardi->Samedi)
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `components/delivery/delivery-calendar.tsx:76-81`
- **Problème**: isDateDisabled ne desactive que les dates < demain. La politique de livraison est Mardi->Samedi (DELIVERY_DAYS=[2..6] dans auto-generate). Le client peut donc selectionner un Dimanche ou un Lundi; comme aucun creneau DB n'existe ces jours-la, il verra quand meme les creneaux par defaut fictifs (a cause de delivery-04) et pourra 'commander' une livraison un jour non livre.
- **Correctif proposé**: Ajouter dans isDateDisabled: `const d = date.getDay(); if (d===0 || d===1) return true;` pour bloquer dimanche/lundi, en coherence avec la politique d'auto-generation.

#### 🟡 Seuil de livraison gratuite incoherent: panier utilise > 30, checkout/commande utilise >= 30
- **Gravité/Catégorie**: medium / admin-client-mismatch
- **Fichier**: `components/cart/cart-drawer.tsx:117 ; components/cart/cart-page.tsx:135 ; app/commande/page.tsx:113 ; app/api/orders/place/route.ts:97 ; app/api/stripe/checkout/route.ts:86`
- **Problème**: Les apercus panier calculent deliveryFee = subtotal > 30 ? 0 : 4.9 (strictement superieur). La page commande et les deux routes de commande utilisent subtotal >= 30 ? 0 : 4.9 (superieur ou egal). Pour un panier d'exactement 30,00e: le drawer/panier annonce 4,90e de frais alors que le checkout facture 0e. Incoherence d'affichage du prix entre les ecrans pour le meme concept.
- **Correctif proposé**: Harmoniser sur un seul operateur (recommande >= 30 partout) et idealement extraire la regle de frais de livraison dans une fonction partagee lib/ pour eviter la divergence (4 endroits codent la meme regle a la main).

#### 🟡 Page marketing 'Livraison': seuils de gratuite (50e/80e) et delais incoherents avec la logique reelle (30e, 24-48h)
- **Gravité/Catégorie**: medium / translation
- **Fichier**: `app/livraison/page.tsx:39, 43, 19-22`
- **Problème**: La page publique annonce 'Gratuit des 50e' (Zone Alpha) et 'Gratuit des 80e' (Zone Beta), 'Livraison sous 2h', '12h entre recolte et porte', suivi GPS, etc. La logique reelle du checkout offre la livraison des 30e avec un delai annonce '24-48h' (commande/page.tsx:239). Le client lit des conditions commerciales fausses par rapport a ce qui est applique a la caisse. C'est une incoherence de terminologie/conditions cote vitrine vs application.
- **Correctif proposé**: Aligner les seuils/delais de la page marketing sur la regle reelle (gratuit des 30e, frais 4,90e, delai 24-48h) ou implementer reellement les zones differenciees. Eviter d'annoncer des engagements (2h, GPS) non tenus par le code.

#### 🟡 Order.deliverySlot stocke une chaine d'heure libre, sans lien (FK) avec DeliverySlot
- **Gravité/Catégorie**: medium / db-inconsistency
- **Fichier**: `prisma/schema.prisma:111 (deliverySlot String?) ; 249-261 (DeliverySlot) ; app/api/orders/place/route.ts:127`
- **Problème**: Order.deliverySlot est un String? qui recoit deliveryTime (ex '09:00 - 10:00'), pas l'id du DeliverySlot reserve. Il n'y a aucune relation entre Order et DeliverySlot dans le schema. Resultat: impossible de savoir de maniere fiable quel creneau (date+plage+capacite) une commande occupe, impossible de decrementer/recompter currentOrders proprement (cf delivery-01), et la valeur stockee est ambigue (juste une heure, sans la date qui elle est dans deliveryDate corrompue cf delivery-02).
- **Correctif proposé**: Ajouter une relation optionnelle Order.deliverySlotId -> DeliverySlot pour tracer le creneau reserve (en plus ou a la place du String libre). Cela permet la reservation/liberation atomique de currentOrders et une jointure fiable cote admin.

#### 🟡 auto-generate utilise findFirst au lieu de upsert: race condition possible et incoherence avec la contrainte unique
- **Gravité/Catégorie**: medium / bug · _(repéré en vérification)_
- **Fichier**: `app/api/admin/delivery-slots/auto-generate/route.ts:55-77`
- **Problème**: La boucle fait `findFirst({where:{date,startTime}})` puis `create` si absent. Le schema a `@@unique([date,startTime])` (schema.prisma:260). Si deux executions concurrentes (double clic admin, double requete) tournent, les deux peuvent passer le findFirst puis le second create leve P2002 — non capture specifiquement ici (seul le POST manuel du fichier route.ts:54 gere P2002), ce qui fait echouer toute la generation avec un 500 'Erreur serveur'. Un upsert atomique sur la cle unique [date,startTime] eliminerait la verification N+1 et la race.
- **Correctif proposé**: Remplacer findFirst+create par `prisma.deliverySlot.upsert({ where: { date_startTime: { date, startTime } }, create: {...}, update: {} })` et compter created/skipped via le resultat, ou entourer le create d'un catch P2002 qui incremente skipped.

#### 🟡 Aucune validation cote serveur du couple deliveryDate/deliveryTime ni du mode livraison: une commande 'livraison' peut etre creee sans creneau
- **Gravité/Catégorie**: medium / bug · _(repéré en vérification)_
- **Fichier**: `app/api/orders/place/route.ts:96-126`
- **Problème**: La seule garde 'choisir un creneau' est cote client (commande/page.tsx:141). Le POST /api/orders/place ne verifie pas que, pour deliveryMethod==='livraison', deliveryDate et deliveryTime sont presents/valides. Un appel direct (ou un client buggue) peut creer une commande livraison sans date ni creneau (deliveryDate:null, deliverySlot:null), ce qui rend la commande non planifiable. Idem stripe/checkout/route.ts. La validation metier doit etre cote serveur, pas seulement UI.
- **Correctif proposé**: Ajouter en debut de handler: si deliveryMethod==='livraison', exiger deliveryDate et deliveryTime valides (et idealement valider qu'ils correspondent a un DeliverySlot existant et non complet via reserveDeliverySlot), sinon 400.

#### ⚪ Toggle de statut admin ne verifie pas res.ok avant de rafraichir (echec serveur masque)
- **Gravité/Catégorie**: low / bug
- **Fichier**: `app/admin/delivery-slots/page.tsx:111-122`
- **Problème**: handleToggleActive fait await fetch(...) mais ne verifie pas res.ok avant fetchSlots(): une erreur 500 cote serveur ne montrera aucune erreur a l'admin (le catch ne se declenche que sur exception reseau). Mineur mais peut masquer un echec de mise a jour de disponibilite d'un creneau (isActive).
- **Correctif proposé**: Verifier res.ok et afficher toast.error sinon, comme dans handleSubmit, avant de rafraichir la liste.

#### ⚪ seed.ts ne cree aucun DeliverySlot: base initiale sans creneaux
- **Gravité/Catégorie**: low / db-inconsistency
- **Fichier**: `prisma/seed.ts:(absence de toute reference DeliverySlot)`
- **Problème**: Le seed ne genere aucun DeliverySlot. Sur une base fraiche, la fonctionnalite de creneaux est inerte tant qu'un admin ne lance pas l'auto-generation. Combine a delivery-03/04, l'experience par defaut est: checkout livraison montre des creneaux fictifs et non reservables. Ce n'est pas un bug en soi mais cela masque les autres bugs en environnement de dev/demo.
- **Correctif proposé**: Ajouter au seed une generation de quelques DeliverySlot (Mar->Sam, 9h-17h) sur 2-4 semaines pour rendre le flux testable et exposer plus tot les incoherences.

#### ⚪ PUT admin: maxOrders non valide (peut etre mis < currentOrders ou negatif), ne reprend pas la validation du POST
- **Gravité/Catégorie**: low / ux · _(repéré en vérification)_
- **Fichier**: `app/api/admin/delivery-slots/route.ts:98-107`
- **Problème**: Le PUT accepte `maxOrders` tel quel (`...(maxOrders !== undefined && { maxOrders })`) sans verifier qu'il est >= currentOrders ni > 0. Un admin peut reduire maxOrders en dessous des commandes deja prises (rendant le slot 'complet' artificiellement, isFull=true cote admin) ou a 0/negatif. Le POST a au moins un fallback `maxOrders || 10`, le PUT n'a aucun garde-fou. Incoherence de validation entre create et update du meme concept.
- **Correctif proposé**: Valider dans PUT: rejeter si maxOrders < 1, et idealement charger le slot pour interdire maxOrders < currentOrders (retourner 400 avec message explicite).

#### ⚪ La date par defaut du calendrier (aujourd'hui) est desactivee mais declenche quand meme un chargement de creneaux inutile/incoherent
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `components/delivery/delivery-calendar.tsx:33, 38-42, 76-81`
- **Problème**: selectedDate est initialise a `new Date()` (aujourd'hui, ligne 33). isDateDisabled desactive toute date < demain (ligne 80), donc aujourd'hui est grise dans le calendrier — mais le useEffect (38-42) charge tout de meme les creneaux pour aujourd'hui au montage et affiche immediatement les defaultSlots/slots pour une date non selectionnable. L'UX est incoherente: des creneaux apparaissent pour une date que l'utilisateur ne peut pas reellement choisir dans la grille, et selectedDelivery peut etre rempli pour aujourd'hui via un clic creneau avant tout choix de date valide.
- **Correctif proposé**: Initialiser selectedDate a `undefined` (ou a demain) pour que la grille de creneaux n'apparaisse qu'apres selection d'une date livrable, coherent avec isDateDisabled.

#### ⚪ Adresse de point de retrait incoherente entre les ecrans (Alfortville vs Guadeloupe)
- **Gravité/Catégorie**: low / db-inconsistency · _(repéré en vérification)_
- **Fichier**: `app/commande/page.tsx:328-330`
- **Problème**: La page commande affiche le point de retrait '114 Rue Paul Vaillant Couturier, 94140 Alfortville' (lignes 328-330), alors que les pages de detail/succes affichent 'Power — Primeur, 97100 Guadeloupe' (commandes/[id]:250, checkout/success:185). Le client voit donc une adresse de retrait differente avant et apres commande pour le meme magasin. Donnee de magasin codee en dur et divergente entre ecrans.
- **Correctif proposé**: Centraliser l'adresse du magasin (SiteSetting ou constante partagee) et l'utiliser partout pour eviter la divergence Alfortville/Guadeloupe.


### Admin: équipe/clients/stock/stats/settings (21)

#### 🔴 Page Comptabilite entierement mockee : CA, charges, benefice net, rentabilite produit sont des donnees fictives en dur
- **Gravité/Catégorie**: critical / bug
- **Fichier**: `app/admin/accounting/page.tsx:61-158`
- **Problème**: Les tableaux expenses et productProfits sont des constantes en dur (Salaire Sophie, Gasoil, etc.) avec des dates de juillet 2025. Toutes les cartes (Chiffre d'Affaires, Charges Totales, Benefice Net, Couts Achats, Salaires, Charges Fixes, Pertes) et les deux tableaux derivent de ces constantes — AUCUNE requete Prisma. Sur une app en production, le proprietaire voit des chiffres financiers totalement faux. 'Ajouter une charge' fait expenses.push() sur une constante module-level (mutation hors React, ne re-rend pas et perdue au reload). 'Export Excel' est un alert('en cours de developpement').
- **Correctif proposé**: Brancher la page sur de vraies donnees: revenus depuis prisma.order (total, periode), couts via Product.purchasePrice * quantites vendues (OrderItem), salaires via somme des User.salary du staff, et persister les charges dans un nouveau modele Expense. Remplacer le push() par un vrai POST et l'export par une vraie generation de fichier.

#### 🔴 Page Analytics entierement mockee : CA, commandes, conversion, trafic, churn sont en dur (aucune DB)
- **Gravité/Catégorie**: critical / bug
- **Fichier**: `app/admin/Analytics/page.tsx:38-126`
- **Problème**: salesData, categoryData, trafficData, statsData et tous les StatCard (CA Restaurants 28750€, CA Particuliers 18500€, Frequence Pros, Churn, Clients inactifs...) sont des litteraux codes en dur. Aucune requete Prisma. Le selecteur de periode et le bouton RefreshCw n'ont aucun effet (le bouton refresh n'a pas de onClick). C'est la page liee dans la sidebar principale (Navigation > Analytics) donc le premier reflexe analytique du proprietaire affiche des chiffres inventes.
- **Correctif proposé**: Remplacer par des server actions Prisma (CA par mois via Order.total, repartition par categorie via OrderItem->Product->Category, CA pro vs particulier via User.clientType). Le trafic/visiteurs/conversion necessite un vrai tracking; a defaut masquer ces cartes plutot qu'afficher des valeurs fictives.

#### 🟠 La colonne 'Compte' de l'equipe est toujours en mode 'Inviter' : l'API ne renvoie jamais accountCreated/hasAccount
- **Gravité/Catégorie**: high / admin-client-mismatch
- **Fichier**: `app/api/admin/team/route.ts:22-41`
- **Problème**: Le tableau equipe affiche soit un badge 'Cree' soit un bouton 'Inviter' selon employee.accountCreated, et utilise aussi employee.hasAccount. Or l'objet formatte renvoye par GET ne contient NI accountCreated NI hasAccount. Cote client ces champs sont donc undefined => l'expression accountCreated ? <Cree> : <Inviter> evalue toujours faux et affiche TOUJOURS 'Inviter', y compris pour des employes dont le compte est deja actif. Le type Employee declare pourtant ces champs comme requis.
- **Correctif proposé**: Ajouter dans l'objet renvoye par GET un indicateur derive, p.ex. accountCreated: emp.password !== '' && emp.password != null, hasAccount: true (ou un vrai champ de schema dedie type 'invitedAt'/'hasAccount' a ajouter au modele User). A minima renvoyer accountCreated: true pour les staff existants puisque la creation POST cree deja le mot de passe.

#### 🟠 Activer/Desactiver un employe et basculer ses permissions ne sont jamais sauvegardes (state local uniquement)
- **Gravité/Catégorie**: high / bug
- **Fichier**: `app/admin/team/page.tsx:234-254`
- **Problème**: toggleEmployeeStatus et togglePermission modifient seulement le state React local via setEmployees, sans aucun appel reseau. Au rechargement de la page (loadEmployees), tout revient a l'etat DB. De plus les permissions sont entierement DERIVEES du role cote GET (caisse = role cashier|admin, etc.) et il n'existe aucun champ permissions dans le schema User : un admin croit modifier des droits qui ne seront jamais persistes ni respectes ailleurs. Il n'existe d'ailleurs aucune route PUT/PATCH /api/admin/team.
- **Correctif proposé**: Creer une route PATCH /api/admin/team/[id] (ou route.ts PUT) protegee admin qui met a jour isActive (et un vrai modele de permissions si necessaire), et appeler cette route depuis toggleEmployeeStatus/togglePermission puis recharger. Sinon retirer les controles interactifs pour ne pas tromper l'admin.

#### 🟠 Modification du type client et des notifications cote admin non persistee (aucune API d'ecriture clients)
- **Gravité/Catégorie**: high / bug
- **Fichier**: `app/admin/customers/page.tsx:143-167`
- **Problème**: handleChangeClientType et toggleNotification ne font que muter le state local; il n'existe aucune route POST/PUT/PATCH dans app/api/admin/customers (seul GET existe). Un admin qui passe un client en 'restaurant'/facturation 'pro' ou (de)active une notif voit le changement a l'ecran mais rien n'est ecrit en base : clientType/billingType (User) et preferences (UserPreference) restent inchanges. Au reload, tout est perdu.
- **Correctif proposé**: Ajouter une route PATCH /api/admin/customers/[id] protegee admin qui update User.clientType/billingType et upsert UserPreference (newsletter/promotions/smsNotifications/orderUpdates), puis appeler depuis la page et recharger.

#### 🟠 Page Parametres est un stub : aucune lecture/ecriture de SiteSetting bien que le modele et getSiteSetting existent
- **Gravité/Catégorie**: high / missing-display
- **Fichier**: `app/admin/settings/page.tsx:34-38`
- **Problème**: La page Parametres affiche uniquement 'Les parametres de la boutique seront disponibles prochainement.'. Le modele SiteSetting (key/value) existe, getSiteSetting() existe dans content.ts, et des SiteSetting sont reellement utilises ailleurs (reset password). Mais l'admin n'a aucune interface pour lire/modifier ces parametres. Il n'existe d'ailleurs aucune route admin d'ecriture SiteSetting (app/api/settings/[key] est cote consommation, pas une UI d'edition admin protegee).
- **Correctif proposé**: Implementer un formulaire admin listant/modifiant les SiteSetting (key/value) via une server action setSiteSetting (prisma.siteSetting.upsert) protegee role admin, et afficher les valeurs courantes via getSiteSetting.

#### 🟠 Ajout d'un produit dans le stock n'est jamais enregistre (state local), upload de facture ignore, edition non implementee
- **Gravité/Catégorie**: high / bug
- **Fichier**: `app/admin/stock/page.tsx:143-172`
- **Problème**: handleAddProduct construit un StockItem avec un id 'STK-'+Date.now() et fait setStock([...stock,newItem]) sans appel API : le produit disparait au reload et n'a aucun categoryId (le POST /api/admin/stock ne gere d'ailleurs que le restock, pas la creation). Le champ facture (invoiceFile) saisi n'est jamais envoye nulle part (pas d'upload). Le bouton 'Edit' ouvre isEditModalOpen mais aucun contenu/handler d'edition n'existe. Les fournisseurs/origines proposes sont une liste en dur sans rapport avec la DB.
- **Correctif proposé**: Soit rediriger la creation produit vers le module Produits (qui gere categoryId), soit ajouter au POST stock un mode 'create' construisant un Product complet (name, price, unit, categoryId, purchasePrice, margin, currentStock, minimumStock). Implementer un vrai upload de facture et la modale d'edition, ou desactiver ces controles.

#### 🟡 Paniers abandonnes toujours a 0 : valeur codee en dur dans l'API alors que des Cart existent en base
- **Gravité/Catégorie**: medium / db-inconsistency
- **Fichier**: `app/api/admin/customers/route.ts:55`
- **Problème**: L'API renvoie abandonedCarts: 0 pour chaque client en dur. La carte stat 'Paniers Abandonnes' et le taux d'abandon de la page customers se basent sur ce champ, donc affichent systematiquement 0% / 0 paniers, ce qui est faux et trompeur. Le modele Cart (avec items) existe pourtant et pourrait etre interroge (panier non vide sans commande recente).
- **Correctif proposé**: Calculer abandonedCarts via prisma.cart pour chaque user (cart avec items et sans commande recente), ou inclure user.cart dans le select et compter les paniers non vides. A defaut, retirer la stat pour ne pas afficher une donnee fausse.

#### 🟡 Incoherence de calcul: les cartes du dashboard comptent TOUTES les commandes, le graphe seulement les 'validated'
- **Gravité/Catégorie**: medium / db-inconsistency
- **Fichier**: `app/admin/page.tsx:44-54`
- **Problème**: Les cartes 'Revenus du Mois'/'Commandes du Mois' agregent prisma.order.findMany SANS filtre de statut (inclut pending/cancelled), donc le CA inclut potentiellement des commandes annulees ou non payees. Le graphe (getDashboardChartData) lui ne compte QUE status:'validated'. Resultat: le total des cartes et la somme du graphe ne concordent jamais, ce qui est deroutant pour le proprietaire et surestime le CA.
- **Correctif proposé**: Aligner les deux sur le meme critere de statut (ex. status in ['validated','processing','shipped','delivered'] et exclure 'cancelled'/'pending') pour que cartes et graphe soient coherents.

#### 🟡 Mot de passe temporaire identique en dur ('Power2024!') pour tous les employes crees depuis la page Equipe
- **Gravité/Catégorie**: medium / security
- **Fichier**: `app/admin/team/page.tsx:170`
- **Problème**: handleAddEmployee envoie password:'Power2024!' pour CHAQUE nouvel employe. Tous les comptes staff sont donc crees avec le meme mot de passe connu/devinable, et cet email d'invitation transmet ce mot de passe partage. Un attaquant connaissant ce defaut peut tenter de se connecter a tout compte staff recemment cree non encore modifie. La route /api/admin/team/invite genere bien un mot de passe aleatoire, mais la creation initiale ne l'utilise pas.
- **Correctif proposé**: Generer un mot de passe aleatoire fort cote serveur a la creation (comme le fait invite/route.ts avec crypto.randomBytes) et ne jamais coder un mot de passe partage cote client; forcer le changement a la premiere connexion.

#### 🟡 Clients de type 'restaurant'/billing 'pro' impossibles a creer : aucun ecran ne pose role employe vs role user, et le seul filtre est par role
- **Gravité/Catégorie**: medium / admin-client-mismatch · _(repéré en vérification)_
- **Fichier**: `app/api/admin/customers/route.ts:12-15`
- **Problème**: La page customers distingue clientType 'particulier'/'restaurant' et billingType 'particulier'/'pro' (schema User.clientType/billingType existent), et propose 'Generer Code Pro' (page.tsx:169-177) qui ne fait que produire une chaine aleatoire cote client (jamais persistee ni reliee a un compte/PromoCode). Combine au finding customers-edit-not-persisted, il n'existe AUCUN chemin (ni inscription pro, ni edition admin persistee, ni code pro fonctionnel) pour qu'un client devienne reellement 'restaurant'/'pro' en base : clientType/billingType resteront toujours a la valeur par defaut 'particulier' (schema l.23-24). Tout l'UI restaurant/pro (filtre, badge facturation, stats restaurants) est donc decoratif.
- **Correctif proposé**: Ajouter une route PATCH /api/admin/customers/[id] (protegee admin) ecrivant clientType/billingType + preferences ; brancher 'Generer Code Pro' sur la creation d'un PromoCode reel ou d'un lien d'inscription pro persistant.

#### 🟡 Aucun controle d'autorisation pour le mot de passe employe : POST team accepte n'importe quel mot de passe >= 6 et l'email l'expose en clair
- **Gravité/Catégorie**: medium / security · _(repéré en vérification)_
- **Fichier**: `app/api/admin/team/route.ts:92-99`
- **Problème**: En complement du finding team-temp-password-shared : la route POST envoie systematiquement le mot de passe en CLAIR par email (sendTeamInvitation(..., password) ligne 98, qui l'affiche en clair dans le HTML de lib/email.ts:282). Aucune obligation de changement au premier login n'est imposee cote code (juste un avertissement textuel dans l'email). Combine au mot de passe statique 'Power2024!' cote page, tout compte staff (y compris role 'admin') est creable avec un secret connu transmis en clair, sans rotation forcee. Le schema User n'a aucun champ 'mustChangePassword'/'passwordChangedAt' pour forcer la rotation.
- **Correctif proposé**: Generer le mot de passe cote serveur (jamais 'Power2024!'), ajouter un flag mustChangePassword au schema User force a true a la creation, et exiger le changement avant tout acces admin.

#### ⚪ Le volume de commandes calcule par admin-stats n'est jamais affiche dans le graphe (donnee recuperee puis ignoree)
- **Gravité/Catégorie**: low / missing-display
- **Fichier**: `components/admin/chart-area-interactive.tsx:66-124`
- **Problème**: getDashboardChartData renvoie pour chaque jour { date, revenue, orders }. Le chartConfig declare une serie 'orders' (label 'Commandes'), mais le composant ne rend qu'une seule <Area dataKey='revenue'>. La sous-titre et la description annoncent 'Revenus et volume de commandes' alors que le volume de commandes n'est jamais trace.
- **Correctif proposé**: Ajouter une seconde <Area dataKey='orders'> (eventuellement sur un axe secondaire) ou retirer 'orders' du config et corriger la description si le volume n'est pas voulu.

#### ⚪ Tendances codees en dur dans les cartes (equipe '+1'/'+5.2%', clients '+15%'/'+8%', stock '+3'/'+2'/'+1')
- **Gravité/Catégorie**: low / ux
- **Fichier**: `app/admin/team/page.tsx:116-159`
- **Problème**: Les cartes statistiques de Team, Customers et Stock affichent des variations (trend.value) totalement statiques sans aucun calcul: Masse Salariale '+5.2%', Employes Actifs '+1', Total Clients '+15%', Clients Actifs '+8%', Stock Faible '+2', etc. Ces fleches/pourcentages laissent croire a une evolution mesuree alors qu'ils sont inventes et ne changent jamais.
- **Correctif proposé**: Calculer les tendances reelles vs periode precedente cote serveur, ou retirer le bloc trend pour ces cartes tant que la donnee n'est pas disponible.

#### ⚪ Le lien 'Recherche' de la sidebar pointe vers /admin/products (placeholder, pas une page de recherche)
- **Gravité/Catégorie**: low / ux
- **Fichier**: `components/admin/app-sidebar.tsx:71-76`
- **Problème**: L'entree navSecondary 'Recherche' (icone loupe) a url:'/admin/products', identique a l'entree 'Produits'. Il n'existe pas de page de recherche dediee; cliquer 'Recherche' renvoie vers la liste produits, ce qui est trompeur.
- **Correctif proposé**: Implementer une vraie page/composant de recherche globale, ou retirer l'entree 'Recherche' tant qu'elle n'existe pas.

#### ⚪ Boutons 'Quick Create' et 'Inbox' inertes (texte anglais en plus) dans nav-main
- **Gravité/Catégorie**: low / ux
- **Fichier**: `components/admin/nav-main.tsx:27-43`
- **Problème**: Le composant NavMain rend un bouton 'Quick Create' et un bouton 'Inbox' sans aucun onClick/href : ils ne font rien. De plus 'Quick Create' et 'Inbox' sont en anglais alors que l'UI est integralement en francais. (Note: app-sidebar n'utilise pas NavMain, mais le composant est present dans le sous-systeme et peut etre branche ailleurs.)
- **Correctif proposé**: Soit cabler ces boutons a une action reelle (ex. creation rapide produit, boite de reception messages), soit les retirer; traduire 'Quick Create'->'Creation rapide' et 'Inbox'->'Messagerie'.

#### ⚪ Import mort de DataTable dans le dashboard (jamais rendu)
- **Gravité/Catégorie**: low / bug
- **Fichier**: `app/admin/page.tsx:3`
- **Problème**: DataTable est importe en haut de app/admin/page.tsx mais n'apparait jamais dans le JSX rendu (le tableau des commandes est construit a la main avec <Table>). Import inutilise = bruit et eventuel warning de lint/build.
- **Correctif proposé**: Retirer l'import inutilise, ou utiliser DataTable pour le tableau des dernieres commandes.

#### ⚪ Division par zero : 'Clients Actifs' affiche NaN% quand il n'y a aucun client
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `app/admin/customers/page.tsx:122`
- **Problème**: Dans statsData, la carte 'Clients Actifs' calcule son footer.label avec `${((activeCustomers / totalCustomers) * 100).toFixed(1)}% du total`. Quand totalCustomers === 0 (base vide, ou pendant le chargement initial avant loadCustomers — l'etat initial est customers:[]), la division 0/0 produit NaN et affiche 'NaN% du total'. Contrairement a abandonmentRate (l.95) qui protege avec `totalCustomers > 0 ? ... : '0'`, ce calcul n'a pas de garde. Au premier rendu (avant fetch) la carte montre donc 'NaN%'.
- **Correctif proposé**: Garder le calcul : `${totalCustomers > 0 ? ((activeCustomers / totalCustomers) * 100).toFixed(1) : '0'}% du total`.

#### ⚪ data-table.tsx : composant de demo (texte 100% anglais + donnees factices) embarque dans le bundle admin
- **Gravité/Catégorie**: low / translation · _(repéré en vérification)_
- **Fichier**: `components/admin/data-table.tsx:172-307`
- **Problème**: Le composant DataTable est le boilerplate shadcn dashboard non adapte : colonnes 'Header'/'Section Type'/'Status'/'Target'/'Limit'/'Reviewer', noms en dur 'Eddie Lake'/'Jamik Tashpulatov'/'Emily Whalen', libelles 'Customize Columns', 'Add Section', 'Rows per page', 'No results.', menus 'Edit/Make a copy/Favorite/Delete', toasts `Saving ${header}` / 'Done' / 'Error', et un chartData January..June. Tout est en anglais alors que l'UI doit etre 100% francaise, et toutes les actions (Submit, formulaires, toasts) sont factices. Bien qu'actuellement importe mais non rendu (cf dashboard-dead-datatable-import), le composant fait partie du sous-systeme et serait totalement hors-sujet/anglais s'il etait monte.
- **Correctif proposé**: Supprimer data-table.tsx s'il n'est pas utilise (et retirer l'import du dashboard), ou le reecrire avec colonnes/libelles/toasts francais et des donnees reelles avant toute mise en service.

#### ⚪ Stock : status calcule comme string libre cote API et compare a une union de types incompatible cote page
- **Gravité/Catégorie**: low / db-inconsistency · _(repéré en vérification)_
- **Fichier**: `app/api/admin/stock/route.ts:16-19`
- **Problème**: L'API construit status via `let status = 'in_stock'` (type infere string) puis le renvoie. Cote page, StockItem.status est type `'in_stock' | 'low_stock' | 'out_of_stock'` (page.tsx:33) et la page calcule les stats par comparaison stricte (item.status === 'low_stock', etc.). Les valeurs concordent par chance, mais l'API ne garantit pas l'enum et un futur ajout de statut cote API casserait silencieusement les compteurs 'Stock Faible'/'Rupture'. Plus important : sellingPrice expose au client est item.price (prix de vente reel du Product), tandis que la page d'ajout local calcule sellingPrice = purchasePrice*(1+margin/100) — deux definitions divergentes du meme champ (le prix de vente affiche ne reflete pas forcement la marge stockee Product.margin).
- **Correctif proposé**: Typer le status (`'in_stock'|'low_stock'|'out_of_stock'`) cote API et factoriser le calcul du prix de vente (price = purchasePrice*(1+margin/100)) en une seule source de verite partagee admin/API.

#### ⚪ Restock stock : l'API ne met jamais a jour Product.margin/purchasePrice ni la date, et un restock peut donner un prix de vente incoherent
- **Gravité/Catégorie**: low / missing-display · _(repéré en vérification)_
- **Fichier**: `app/api/admin/stock/route.ts:62-72`
- **Problème**: Le POST restock met a jour uniquement currentStock et inStock. Le modal de reapprovisionnement (stock/page.tsx:476-479) propose un champ 'Facture de reapprovisionnement' (input file) qui n'est jamais lu ni envoye (handleRestock n'envoie que productId/quantity/type). La facture saisie est donc systematiquement ignoree, et lastRestockDate cote page provient de Product.updatedAt (route.ts:31), ce qui melange 'derniere modif quelconque' et 'date de reappro' (toute edition de produit ailleurs decalera la 'date de reappro' affichee).
- **Correctif proposé**: Soit retirer le champ facture du modal restock, soit l'uploader et le stocker ; ne pas reutiliser updatedAt comme 'date de dernier reappro' (ajouter un champ dedie ou ignorer).


### Contenu/CMS: blog/recettes/faq/partenaires/contact (14)

#### 🟠 Page recettes: lecture du champ inexistant recipe.preparationTime -> affiche 'undefined min'
- **Gravité/Catégorie**: high / bug
- **Fichier**: `app/recettes/page.tsx:36`
- **Problème**: La carte recette affiche le temps de preparation via recipe.preparationTime, mais le modele Recipe ne possede PAS ce champ. Le champ reel est 'duration' (String, ex '30 min'). Resultat: chaque carte affiche 'undefined min'. La page detail [id] utilise correctement recipe.duration (ligne 54), ce qui confirme l'incoherence.
- **Correctif proposé**: Remplacer `{recipe.preparationTime} min` par `{recipe.duration ?? 'N/A'}` (duration contient deja l'unite, ex '30 min', donc ne pas ajouter ' min'). Aligner sur le rendu de la page detail recettes/[id]/page.tsx ligne 54.

#### 🟠 Formulaire de contact: aucun email envoye (sendContactNotification jamais appelee)
- **Gravité/Catégorie**: high / bug
- **Fichier**: `app/actions/contact.ts:21-25`
- **Problème**: submitContactForm persiste le ContactMessage en DB puis retourne success, mais n'envoie aucune notification. Or lib/email.ts:91 definit sendContactNotification(name,email,subject,message) qui envoie precisement un mail a contact@powerprimeur.com. Cette fonction n'est appelee nulle part (verifie par grep global). Comme il n'existe aussi AUCUNE UI admin pour lire les ContactMessage (cf cms-03), les messages clients sont totalement perdus operationnellement.
- **Correctif proposé**: Dans submitContactForm, apres le create, appeler `await sendContactNotification(parsed.data.name, parsed.data.email, parsed.data.subject ?? '', parsed.data.message)` (import depuis @/lib/email), idealement sans bloquer la reponse si l'email echoue (try/catch separe).

#### 🟠 Aucune UI/API admin pour blog, recettes, FAQ, partenaires et messages de contact
- **Gravité/Catégorie**: high / missing-display
- **Fichier**: `app/admin:-`
- **Problème**: Le dossier app/admin couvre products, orders, customers, stock, marketing, settings, team, promo-codes, delivery-slots, accounting, analytics — mais AUCUN ecran pour BlogPost, Recipe, Faq, Partner ou ContactMessage. Aucune route API admin non plus (grep blogPost|recipe|faq|partner|contactMessage dans app/admin et app/api = vide). Consequence: tout ce contenu n'est pas editable par le proprietaire, et les messages de contact recus ne sont jamais consultables.
- **Correctif proposé**: Creer des ecrans+routes admin CRUD pour BlogPost (avec toggle published), Recipe, Faq (champ order), Partner (toggle isActive), et une boite de reception ContactMessage (liste + marquer read). A minima exposer ContactMessage en admin pour ne pas perdre les demandes clients.

#### 🟠 Seed n'insere aucun BlogPost / Recipe / Partner -> pages toujours vides en prod
- **Gravité/Catégorie**: high / db-inconsistency
- **Fichier**: `prisma/seed.ts:10-149`
- **Problème**: seed.ts cree categories, produits, compositions et FAQ mais n'insere jamais de BlogPost, Recipe ni Partner. Couple a l'absence d'UI admin (cms-03), les pages /blog, /recettes et /partenaires afficheront en permanence leur etat vide ('Le journal est en cours de redaction', 'Nos chefs peaufinent...', 'Nos producteurs arrivent bientot'). Le contenu est donc structurellement absent et non creable.
- **Correctif proposé**: Ajouter dans le seed quelques BlogPost (published:true), Recipe (avec duration/difficulty/content) et Partner (isActive:true) coherents avec le branding, OU livrer d'abord l'UI admin (cms-03) pour permettre la creation manuelle.

#### 🟡 Newsletter: bouton 'S'abonner' non fonctionnel (aucun handler/form/action)
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `app/newsletter/page.tsx:24-32`
- **Problème**: La page newsletter est un composant serveur statique: l'input email et le bouton 'S'abonner maintenant' n'ont aucun onClick, ne sont pas dans un <form>, et aucune server action n'existe pour l'inscription. Cliquer ne fait rien; aucune donnee n'est enregistree. Il n'existe d'ailleurs aucun modele Newsletter/Subscriber (seul UserPreference.newsletter existe pour les comptes). L'inscription newsletter est donc totalement inoperante.
- **Correctif proposé**: Convertir en composant client avec etat email + une server action d'inscription (creer un modele Subscriber ou reutiliser UserPreference/Resend audiences). A minima desactiver visuellement ou retirer la page tant que le backend n'existe pas.

#### 🟡 Detail article: getBlogPost ne respecte pas le flag published (fuite d'articles non publies)
- **Gravité/Catégorie**: medium / bug
- **Fichier**: `app/actions/content.ts:67-77`
- **Problème**: getBlogPosts (liste) filtre where:{published:true}, mais getBlogPost (detail par id) fait un findUnique sans condition published. Un article non publie reste donc accessible via /blog/<id> par URL directe (ou via cache/lien partage), contournant le statut de publication. La page detail ne reverifie pas non plus post.published.
- **Correctif proposé**: Dans getBlogPost, utiliser `findFirst({ where: { id, published: true } })` (ou verifier post?.published cote page et appeler notFound() sinon).

#### 🟡 Pages CMS orphelines: blog, recettes, partenaires, about, newsletter, confidentialite non liees dans la navigation
- **Gravité/Catégorie**: medium / ux
- **Fichier**: `components/layout/header.tsx:99-116`
- **Problème**: La nav du header ne propose que Boutique, Panier, Contact (+Connexion). Le footer ne lie que Contact, FAQ, Mentions legales, CGV. Aucun lien (header, footer, home, sections) ne pointe vers /blog, /recettes, /partenaires, /about, /newsletter ni /confidentialite. Ces pages existent mais sont inaccessibles depuis l'UI: contenu invisible pour l'utilisateur. L'absence de lien vers /confidentialite est aussi un risque conformite (RGPD/CNIL exige un acces facile a la politique de confidentialite).
- **Correctif proposé**: Ajouter les liens manquants dans le header (Recettes, Journal/Blog, Producteurs) et dans le footer (Confidentialite, A propos, Newsletter). Lier /confidentialite est requis pour la conformite RGPD.

#### 🟡 Email de contact incoherent entre l'UI et le code: contact@power.com (page) vs contact@powerprimeur.com (email.ts)
- **Gravité/Catégorie**: medium / admin-client-mismatch · _(repéré en vérification)_
- **Fichier**: `app/contact/page.tsx:62`
- **Problème**: La page contact affiche `contact@power.com` au client (app/contact/page.tsx:62) alors que toute l'infrastructure email utilise le domaine powerprimeur.com: FROM_EMAIL = 'Power Primeur <noreply@powerprimeur.com>' (lib/email.ts:3) et sendContactNotification envoie a 'contact@powerprimeur.com' (lib/email.ts:95). L'adresse montree au client (contact@power.com) ne correspond a aucune boite gerable et probablement n'existe pas (domaine different). Un client qui ecrit a cette adresse n'aura jamais de reponse. Le footer email.ts utilise aussi 'powerprimeur.com' (l30). Incoherence de marque/contact entre client et back-office.
- **Correctif proposé**: Uniformiser sur le domaine reel (powerprimeur.com): afficher `contact@powerprimeur.com` dans app/contact/page.tsx:62, ou centraliser l'adresse dans une variable d'env partagee.

#### ⚪ getSiteSetting exportee mais jamais consommee par l'UI
- **Gravité/Catégorie**: low / missing-display
- **Fichier**: `app/actions/content.ts:55-65`
- **Problème**: L'action getSiteSetting lit le modele SiteSetting (cle/valeur) mais aucune page ni composant ne l'appelle (seule autre utilisation de SiteSetting: le stockage temporaire de token dans forgot-password). Le contenu parametrable du site (via SiteSetting) n'est donc jamais affiche cote client. Donnee modelisee mais non exposee.
- **Correctif proposé**: Soit cabler getSiteSetting dans des zones de contenu editables (ex: bandeau, coordonnees, horaires), soit supprimer l'action si non utilisee pour eviter du code mort.

#### ⚪ Page confidentialite tres incomplete au regard du RGPD
- **Gravité/Catégorie**: low / ux
- **Fichier**: `app/confidentialite/page.tsx:13-17`
- **Problème**: La politique de confidentialite se limite a deux phrases (collecte de nom/adresse/email/telephone). Manquent: responsable de traitement, base legale, finalites detaillees, duree de conservation, droits RGPD (acces/rectification/effacement/opposition), cookies, sous-traitants (Stripe, Resend, Neon, Vercel), contact DPO. Insuffisant pour un site e-commerce en production collectant des donnees personnelles.
- **Correctif proposé**: Completer la politique de confidentialite avec les mentions RGPD obligatoires (finalites, base legale, conservation, droits, cookies, sous-traitants) et la rendre accessible via le footer.

#### ⚪ Recipe.difficulty rendu sans fallback null -> affiche 'undefined' si non renseigne (liste et detail)
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `app/recettes/page.tsx:46`
- **Problème**: difficulty est optionnel dans le schema (Recipe.difficulty String?, schema.prisma:201). Sur la carte liste, app/recettes/page.tsx:46 rend `{recipe.difficulty}` sans fallback, et sur le detail app/recettes/[id]/page.tsx:59 idem `{recipe.difficulty}`. Si une recette est creee sans difficulty, l'UI affiche le texte vide ou 'undefined' selon le rendu. Contraste avec `duration` qui, lui, a un fallback `?? "N/A"` au detail (l54). Incoherence de traitement des champs optionnels.
- **Correctif proposé**: Ajouter un fallback: `{recipe.difficulty ?? "N/A"}` aux deux endroits (ou masquer le bloc si null).

#### ⚪ Classes Tailwind en conflit sur le separateur de la page recettes (w-16 et w-12 sur le meme element)
- **Gravité/Catégorie**: low / ux · _(repéré en vérification)_
- **Fichier**: `app/recettes/page.tsx:18`
- **Problème**: Le div separateur declare deux classes de largeur contradictoires: `className="w-16 h-1 w-12 bg-orange-500 mb-8 rounded-full"`. Tailwind/CSS appliquera la derniere regle (w-12) et la w-16 est morte: code copie-colle incoherent, signe d'un bug visuel non intentionnel.
- **Correctif proposé**: Ne garder qu'une seule largeur, ex `className="w-12 h-1 bg-orange-500 mb-8 rounded-full"`.

#### ⚪ submitContactForm: aucun contole anti-spam / rate limiting sur une action publique ecrivant en DB
- **Gravité/Catégorie**: low / security · _(repéré en vérification)_
- **Fichier**: `app/actions/contact.ts:13-30`
- **Problème**: submitContactForm est une server action publique (aucun controle d'auth, ce qui est normal pour un formulaire de contact) qui ecrit directement un ContactMessage en DB a chaque appel, sans rate limiting, captcha ni honeypot. Couplee a l'absence d'UI admin pour purger ces messages (cms-03), elle expose la table ContactMessage a du flooding/spam automatise sans moyen de moderation. Validation Zod presente (bonne) mais insuffisante contre l'abus volumetrique.
- **Correctif proposé**: Ajouter un rate limiting (par IP/session) et/ou un honeypot ou captcha avant le create, et une UI admin pour moderer/supprimer les messages.

#### ⚪ Page about/page.tsx sans export dynamic alors que les autres pages CMS le forcent (incoherence de rendu, contenu 100% statique non lie)
- **Gravité/Catégorie**: low / ux · _(repéré en vérification)_
- **Fichier**: `app/about/page.tsx:5`
- **Problème**: about/page.tsx est un composant statique sans donnees dynamiques (texte en dur), ce qui est correct en soi, mais son contenu (manifeste de la marque) n'est ni editable par l'admin (pas dans cms-03) ni lie dans la navigation (cf cms-07), donc invisible. De plus, le contenu (nom marque 'POWER', baseline) est code en dur et ne peut pas etre pilote via SiteSetting alors qu'un modele SiteSetting existe (et son action getSiteSetting est inutilisee, cms-08). Donnee de marque non centralisee et page orpheline.
- **Correctif proposé**: Lier /about dans header/footer et/ou rendre certains textes pilotables via SiteSetting (en consommant getSiteSetting).


### Espace client mon-compte (15)

#### 🔴 Onglet Paiement cassé : appel à /api/stripe/portal qui n'existe pas
- **Gravité/Catégorie**: critical / bug
- **Fichier**: `components/account/payment-tab.tsx:15`
- **Problème**: Le bouton 'Gérer mes moyens de paiement' POST vers /api/stripe/portal. Cette route n'existe pas : seules app/api/stripe/webhook et app/api/stripe/checkout existent. Le fetch renvoie le HTML 404 de Next, res.json() lèvera une exception (catch silencieux), data.url sera undefined, donc rien ne se passe. Le client clique et l'onglet paiement est mort. De plus le modèle User n'a aucun champ stripeCustomerId, donc même un portail Stripe ne pourrait pas retrouver le customer.
- **Correctif proposé**: Créer app/api/stripe/portal/route.ts (POST) qui appelle stripe.billingPortal.sessions.create({ customer, return_url }). Cela nécessite d'abord d'ajouter un champ stripeCustomerId String? au modèle User et de le renseigner au checkout. Tant que ce n'est pas fait, désactiver/masquer le bouton ou afficher un message 'bientôt disponible'.

#### 🟠 clientType / billingType : lus en admin, jamais éditables ni côté client ni côté admin
- **Gravité/Catégorie**: high / admin-client-mismatch
- **Fichier**: `app/admin/customers/page.tsx:143-153, 466-469`
- **Problème**: Le schéma User a clientType et billingType. L'admin les AFFICHE (GET /api/admin/customers) et propose un Select 'Type de client' qui appelle handleChangeClientType, mais cette fonction ne fait que muter l'état React local — aucun fetch PATCH/POST n'existe (la route customers n'expose que GET). Le changement est perdu au rechargement. Côté client, ProfileTab ne contient aucun champ clientType/billingType et updateUserProfile ne les traite pas. Résultat : ces deux champs sont figés à leur valeur par défaut 'particulier' pour tout le monde, alors que toute la logique métier pro/restaurant en dépend.
- **Correctif proposé**: Ajouter une route PATCH/PUT app/api/admin/customers/[id] qui met à jour clientType + billingType en base et faire que handleChangeClientType l'appelle (await + reload). Optionnellement exposer clientType/billingType en lecture/édition dans ProfileTab et les ajouter au schéma Zod de updateUserProfile.

#### 🟠 Préférences theme et language jamais exposées ni sauvegardées par l'UI
- **Gravité/Catégorie**: high / missing-display
- **Fichier**: `components/account/settings-tab.tsx:14-20, 45-61`
- **Problème**: Le modèle UserPreference et l'action updateUserPreferences supportent theme ('light'|'dark'|'system') et language ('fr'|'en'). SettingsTab ne charge et ne sauvegarde QUE les 5 booléens de notifications. Aucun sélecteur de thème ni de langue n'est rendu, et handleSettingChange n'envoie jamais theme/language. Ces colonnes restent donc à leur valeur par défaut et sont inutiles. Le focus mentionne explicitement theme/language comme devant se sauvegarder via preferences.ts : ce n'est pas branché.
- **Correctif proposé**: Ajouter dans SettingsTab un Select de thème et un Select de langue, les inclure dans le state initial chargé depuis getUserPreferences() et les transmettre à updateUserPreferences. Sinon, retirer theme/language du schéma pour éviter du code mort.

#### 🟡 Champs profil morts : Pays, Raison sociale, SIRET dans le state mais ni affichés ni persistés
- **Gravité/Catégorie**: medium / ux
- **Fichier**: `components/account/profile-tab.tsx:26-28, 47-49`
- **Problème**: formData initialise country, companyName et siret, mais aucun de ces trois champs n'est rendu dans le formulaire, jamais peuplé depuis getUserProfile (mis à ''), et updateUserProfile/le schéma User ne les connaissent pas. Pour un compte 'pro/restaurant' (billingType=pro), l'absence de raison sociale et SIRET est un manque fonctionnel : la facture pro ne peut pas être correcte. C'est du code mort qui suggère une fonctionnalité prévue mais non implémentée.
- **Correctif proposé**: Soit retirer country/companyName/siret du state s'ils ne sont pas utilisés, soit ajouter companyName/siret au modèle User + au schéma Zod + au formulaire et les afficher conditionnellement quand billingType='pro'.

#### 🟡 Suppression de compte factice : ne fait rien d'autre qu'un toast
- **Gravité/Catégorie**: medium / ux
- **Fichier**: `components/account/settings-tab.tsx:63-67`
- **Problème**: Le bouton 'Supprimer mon compte' dans la 'Zone de danger' n'appelle aucune action serveur : après confirmation il affiche seulement toast.info('Demande de suppression envoyée à l'administrateur.'). Aucun email, aucun enregistrement, aucune suppression réelle. L'utilisateur croit avoir demandé la suppression de ses données (enjeu RGPD) alors que rien n'est déclenché.
- **Correctif proposé**: Implémenter une server action (ex: requestAccountDeletion) qui enregistre la demande (ou envoie un email via Resend à l'admin / supprime réellement le User en cascade). À défaut, retirer le bouton pour ne pas tromper l'utilisateur sur ses droits RGPD.

#### 🟡 Facture : libellé 'Sous-total HT' incorrect (montants TTC) et remise/promo jamais affichées
- **Gravité/Catégorie**: medium / translation
- **Fichier**: `app/api/invoices/[orderId]/route.ts:84-94, 30-31`
- **Problème**: La facture affiche 'Sous-total HT' puis 'Total TTC', mais aucune TVA n'est calculée : subtotal = somme(priceAtPurchase*qty) et le Total = order.total, sans ligne de TVA. Étiqueter le sous-total 'HT' alors qu'aucune TVA n'est appliquée est trompeur/incohérent (les prix produits sont TTC). De plus le modèle Order a promoCode et discount, mais la facture ne les affiche pas : si une commande a une remise, subtotal + livraison ne tombera pas sur le Total affiché, rendant la facture incohérente.
- **Correctif proposé**: Renommer 'Sous-total HT' en 'Sous-total' (ou ajouter une vraie ligne TVA si applicable), et ajouter une ligne 'Remise (promoCode)' avec -order.discount quand order.discount > 0 pour que Sous-total - Remise + Livraison = Total.

#### 🟡 updateUserProfile rend impossible la suppression d'un champ (phone/address/city/postalCode/firstName/lastName)
- **Gravité/Catégorie**: medium / bug · _(repéré en vérification)_
- **Fichier**: `app/actions/account.ts:57-62`
- **Problème**: Dans le `prisma.user.update`, chaque champ est passé `parsed.data.X || undefined`. Une chaîne vide est falsy donc convertie en `undefined`, et Prisma ignore les clés undefined. Conséquence : un utilisateur ne peut JAMAIS effacer une valeur existante (vider son téléphone, son adresse, etc.) — l'ancienne valeur reste en base. Le formulaire (profile-tab) laisse pourtant croire que vider le champ puis sauvegarder le supprimera. Combiné à ACC-07, vider firstName/lastName bloque carrément toute la sauvegarde.
- **Correctif proposé**: Distinguer 'champ absent' (ne pas toucher) de 'champ vidé' (mettre null). Utiliser `parsed.data.phone ?? undefined` uniquement pour les champs réellement optionnels, et autoriser explicitement la mise à null : `phone: parsed.data.phone === '' ? null : parsed.data.phone`. Idéalement transformer les '' en null dans le schéma Zod avec `.transform(v => v === '' ? null : v)`.

#### 🟡 Onglet 'Paiement & Facturation' ne montre aucune facture malgré son libellé
- **Gravité/Catégorie**: medium / missing-display · _(repéré en vérification)_
- **Fichier**: `components/account/payment-tab.tsx:27-66`
- **Problème**: Le menu (account-sidebar.tsx:16) nomme l'onglet 'Paiement & Facturation' et le texte (payment-tab.tsx:45) promet 'consulter vos factures via le portail client'. Or PaymentTab n'affiche aucune facture : la seule action est le bouton portail Stripe cassé (ACC-01). Les factures réelles existent pourtant (route /api/invoices/[orderId]) et ne sont accessibles que depuis l'onglet Commandes. Le client cherchant ses factures dans l'onglet Facturation ne trouve rien d'exploitable.
- **Correctif proposé**: Soit lister les factures des commandes facturables (réutiliser getUserOrders + liens /api/invoices/[id]) directement dans PaymentTab, soit renommer l'onglet 'Paiement' pour ne pas promettre une facturation absente.

#### 🟡 Le détail de commande masque la remise en calculant le sous-total à partir du total
- **Gravité/Catégorie**: medium / bug · _(repéré en vérification)_
- **Fichier**: `app/commandes/[id]/page.tsx:192-206`
- **Problème**: La page de suivi de commande affiche 'Sous-total' = `(order.total - order.deliveryFee)`. Comme `total = subtotal_items - discount + deliveryFee` (checkout/route.ts:87), ce 'Sous-total' affiché vaut en réalité `subtotal_items - discount`, c'est-à-dire le sous-total APRÈS remise, mais sans jamais nommer la remise. Pour une commande avec promoCode, le client voit un sous-total artificiellement diminué, aucune ligne 'Remise (CODE) : -X€', et ne peut pas réconcilier avec les prix unitaires des articles listés juste au-dessus. Incohérence d'affichage et perte d'information promo. Même cause racine que ACC-06 mais sur une autre page non listée comme buguée par l'auditeur.
- **Correctif proposé**: Exposer order.discount et order.promoCode dans /api/orders/[id], calculer le sous-total comme la somme des items, puis ajouter une ligne 'Remise (promoCode) : -discount€' entre sous-total et livraison, comme sur le checkout.

#### ⚪ Validation Zod : firstName/lastName .min(1).optional() rejette la chaîne vide envoyée par le formulaire
- **Gravité/Catégorie**: low / bug
- **Fichier**: `app/actions/account.ts:8-9, 48-51`
- **Problème**: updateProfileSchema définit firstName: z.string().min(1).optional(). Le formulaire envoie TOUJOURS toutes les clés (firstName: "" si vidé). Une chaîne vide n'est pas undefined, donc .optional() ne s'applique pas et .min(1) échoue → safeParse renvoie 'Données invalides' et bloque TOUTE la sauvegarde dès que le prénom ou le nom est laissé vide, même si l'utilisateur ne voulait modifier que son téléphone. Le toast d'erreur générique masque la cause.
- **Correctif proposé**: Soit utiliser z.string().min(1).optional().or(z.literal('')) / .transform, soit retirer .min(1) et garder .optional(), soit ne transmettre que les champs réellement renseignés. updateUserProfile fait déjà `|| undefined` côté write, donc le min(1) est surtout contre-productif.

#### ⚪ Avatar 'Camera' et badge 'Membre Premium' sans fonctionnalité ni champ correspondant
- **Gravité/Catégorie**: low / ux
- **Fichier**: `components/account/profile-tab.tsx:112-118`
- **Problème**: L'icône Camera sur l'avatar a un curseur 'cursor-pointer' et une animation de survol suggérant un upload de photo, mais aucun handler onClick ni input file : cliquer ne fait rien. Le User n'a d'ailleurs aucun champ avatar/image. Le libellé 'Membre Premium Power' est statique et codé en dur alors qu'aucune notion d'abonnement premium n'existe dans le schéma — incohérent avec le modèle de données.
- **Correctif proposé**: Retirer le curseur/animation de l'avatar tant que l'upload n'est pas implémenté (ou ajouter un champ avatar + handler), et remplacer 'Membre Premium Power' par un libellé reflétant clientType réel (ex: 'Client particulier' / 'Client professionnel').

#### ⚪ OrdersTab type 'orderNumber' attendu mais inexistant en base; reconstruit côté client
- **Gravité/Catégorie**: low / db-inconsistency
- **Fichier**: `components/account/orders-tab.tsx:22, 73`
- **Problème**: L'interface Order déclare orderNumber: string comme s'il venait de l'API, mais le modèle Order n'a pas ce champ. Il est reconstruit côté client via `CMD-${o.id.slice(-6).toUpperCase()}`. La même logique est dupliquée dans la facture (invoices/route.ts) et le détail commande. Si l'id change de format, ces numéros divergeront. Le champ invoiceNumber (présent en base) n'est lui jamais affiché dans la liste, seulement utilisé conditionnellement pour le bouton facture.
- **Correctif proposé**: Centraliser la génération du numéro de commande dans un helper partagé (ou ajouter un vrai champ orderNumber/invoiceNumber persistant) pour garantir la cohérence entre liste, détail et facture; afficher invoiceNumber quand il existe.

#### ⚪ getUserProfile charge toutes les commandes + items + produits juste pour afficher le profil
- **Gravité/Catégorie**: low / ux · _(repéré en vérification)_
- **Fichier**: `app/actions/account.ts:21-33`
- **Problème**: getUserProfile (utilisé uniquement par ProfileTab qui n'affiche que firstName/lastName/email/phone/address/city/postalCode) fait un `include` profond : orders -> items -> product. ProfileTab n'utilise jamais `res.data.orders`. C'est une requête lourde et inutile à chaque ouverture de l'onglet Profil ; les commandes sont déjà chargées séparément par getUserOrders dans OrdersTab. Surcoût DB + bande passante sur chaque visite de la page compte.
- **Correctif proposé**: Retirer le bloc `include` de getUserProfile (sélectionner seulement les champs scalaires nécessaires via `select`), puisque ProfileTab n'exploite pas orders. Garder le chargement des commandes uniquement dans getUserOrders.

#### ⚪ Le sélecteur de thème/langue absent rend les colonnes theme/language inutilisables, mais aucun ThemeProvider ne les consomme non plus
- **Gravité/Catégorie**: low / db-inconsistency · _(repéré en vérification)_
- **Fichier**: `components/account/settings-tab.tsx:45-61`
- **Problème**: Au-delà de ACC-03 (pas d'UI pour éditer theme/language), même si l'utilisateur pouvait les changer, rien dans l'app ne lit UserPreference.theme/language pour appliquer un thème ou basculer la langue (grep ne trouve aucune consommation de preferences.theme/language hors de l'API admin/customers qui ne les renvoie même pas). Ces colonnes du schéma sont donc doublement mortes : ni écrites ni lues. Confirme que la fonctionnalité 'thème/langue' est purement déclarative.
- **Correctif proposé**: Soit implémenter un sélecteur thème/langue branché sur updateUserPreferences + un provider qui applique la préférence au montage, soit retirer theme/language du schéma UserPreference pour éviter la fausse promesse de fonctionnalité.

#### ⚪ Le bouton 'Facture' s'appuie sur le status, pas sur invoiceNumber, et peut générer une facture pour une commande non payée
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `components/account/orders-tab.tsx:183-189`
- **Problème**: Dans OrdersTab, le bouton Facture s'affiche pour status validated/delivered/shipped/processing. La route /api/invoices/[orderId] GÉNÈRE et persiste un invoiceNumber (route.ts:140-147) dès qu'on l'ouvre, sans vérifier le paiement (stripeSessionId/status). Une commande 'validated'/'processing' peut donc obtenir un numéro de facture officiel alors qu'elle n'est pas forcément encaissée. De plus, l'interface Order déclare/charge invoiceNumber (ligne 27,78) mais ne s'en sert jamais pour conditionner le bouton — incohérent avec la page détail (commandes/[id]:213) qui, elle, conditionne sur `order.invoiceNumber`. Comportement divergent entre les deux écrans pour la même action.
- **Correctif proposé**: Uniformiser la condition d'affichage du bouton facture (idéalement basée sur le paiement réel ou un invoiceNumber pré-existant) entre OrdersTab et la page détail, et faire en sorte que la génération d'invoiceNumber ne se fasse que pour les commandes effectivement payées.


### Cohérence textuelle FR & UI (17)

#### 🟠 Localisation de la boutique incoherente: 'Guadeloupe 97100' affichee au client alors que la societe est a Alfortville (94140, Ile-de-France)
- **Gravité/Catégorie**: high / db-inconsistency
- **Fichier**: `app/checkout/success/page.tsx:185`
- **Problème**: Le client qui choisit le retrait voit 'Power — Primeur, 97100 Guadeloupe' sur la page de succes, mais l'adresse reelle du point de retrait (page commande, CGV, mentions legales, JSON-LD) est Alfortville en Ile-de-France. Le meme texte 'Guadeloupe 97100' est aussi code en dur dans la facture (app/api/invoices/[orderId]/route.ts:44 et 100) et dans l'email de reinitialisation de mot de passe (app/api/auth/forgot-password/route.ts:69). Incoherence factuelle grave: le client ne sait pas ou recuperer sa commande et les documents officiels (facture) mentionnent une adresse fausse.
- **Correctif proposé**: Remplacer toutes les occurrences '97100 Guadeloupe' par l'adresse reelle (114 Rue Paul Vaillant Couturier, 94140 Alfortville) — idealement via une source unique (SiteSetting ou constante partagee) consommee par checkout/success, invoices route, et emails. Corriger checkout/success/page.tsx:185, invoices route 44/100, forgot-password route 69.

#### 🟡 Menu utilisateur de l'admin (LIVE) entierement en anglais: Account / Billing / Notifications / Log out
- **Gravité/Catégorie**: medium / translation
- **Fichier**: `components/admin/nav-user.tsx:89,93,97,103`
- **Problème**: Le dropdown du compte dans la sidebar admin affiche des libelles anglais alors que tout le reste de l'admin est en francais. Texte residuel boilerplate shadcn non traduit, visible en production sur chaque ecran admin.
- **Correctif proposé**: Traduire: 'Account'->'Compte', 'Billing'->'Facturation', 'Notifications'->'Notifications' (deja FR), 'Log out'->'Deconnexion'. (Optionnel: cabler ces items qui sont actuellement inertes, ou les retirer.)

#### 🟡 Dropdown 'Documents' de la sidebar admin (LIVE) en anglais: More / Open / Share / Delete
- **Gravité/Catégorie**: medium / translation
- **Fichier**: `components/admin/nav-documents.tsx:58,68,72,77,86`
- **Problème**: Chaque entree du groupe Documents (Stock, Codes Promo, Creneaux Livraison, Comptabilite, Equipe, Marketing) possede un menu contextuel dont tous les libelles sont en anglais. De plus, ces actions (Open/Share/Delete) sont inertes (aucun onClick) — boilerplate shadcn laisse tel quel.
- **Correctif proposé**: Traduire 'More'->'Plus', 'Open'->'Ouvrir', 'Share'->'Partager', 'Delete'->'Supprimer'. Mieux: supprimer ce DropdownMenu d'actions factices puisqu'il n'a aucune logique cablee.

#### 🟡 Incoherence terminologique/logique entre les CGV (paiement par carte a la commande via Stripe) et les options de paiement du checkout (Especes / CB a la reception)
- **Gravité/Catégorie**: medium / ux
- **Fichier**: `app/cgv/page.tsx:53`
- **Problème**: Les CGV affirment un prepaiement obligatoire par carte (Stripe) a la commande, mais le tunnel de commande propose uniquement le paiement a la reception (especes ou CB) — contradiction sur les conditions de vente affichees au client. C'est aussi un signe d'inachevement (Stripe present dans le code mais non branche sur ce checkout).
- **Correctif proposé**: Aligner CGV et checkout: soit activer le paiement Stripe a la commande conformement aux CGV, soit reecrire l'article 'Paiement' des CGV pour refleter le paiement a la reception reellement propose.

#### 🟡 Seuil de livraison gratuite incoherent entre 3 ecrans (et bug de borne == 30€)
- **Gravité/Catégorie**: medium / admin-client-mismatch · _(repéré en vérification)_
- **Fichier**: `components/cart/cart-drawer.tsx:117`
- **Problème**: Le meme concept (livraison gratuite) a 3 valeurs/logiques differentes montrees au client. Le panier (cart-drawer.tsx:117) calcule 'const deliveryFee = subtotal > 30 ? 0 : 4.9' avec une borne STRICTE > 30, et affiche ligne 247 'Plus que {(30 - subtotal)}€ pour la livraison gratuite'. Le checkout (app/commande/page.tsx:113) calcule 'subtotal >= 30 ? 0 : 4.9' avec borne >= 30 et affiche ligne 241 '(gratuit dès 30€)'. Pour un sous-total EXACTEMENT egal a 30€, le panier facture 4,90€ alors que le checkout l'affiche gratuit: incoherence de prix directement visible. Pire, la page Livraison (app/livraison/page.tsx:39) annonce 'Gratuit dès 50€' pour la Zone Alpha (Paris & IDF) — un 3e seuil contradictoire.
- **Correctif proposé**: Centraliser le seuil et la regle (ex. const FREE_SHIPPING_THRESHOLD = 30 et const DELIVERY_FEE = 4.9 dans lib/) et l'importer partout. Uniformiser la comparaison sur subtotal >= 30 dans cart-drawer.tsx:117 et le texte 'Plus que' a 247. Corriger app/livraison/page.tsx:39 de '50€' a '30€' (ou inversement, selon la regle metier reelle).

#### 🟡 Page /livraison orpheline: aucun lien depuis le header, le footer ou ailleurs
- **Gravité/Catégorie**: medium / missing-display · _(repéré en vérification)_
- **Fichier**: `components/layout/footer.tsx:13`
- **Problème**: La page app/livraison/page.tsx (zones de livraison, delais, arguments) existe mais aucun lien ne pointe vers '/livraison' dans toute l'app (grep href="/livraison" = 0 resultat). Le footer (footer.tsx:13-18) ne liste que Contact, FAQ, Mentions légales, CGV; le header (header.tsx) n'a que Boutique/Panier/Contact/Connexion. La page de livraison est donc inaccessible a la navigation: contenu produit mais jamais affiche/atteignable par le client.
- **Correctif proposé**: Ajouter un <Link href="/livraison">Livraison</Link> dans le <nav> du footer (footer.tsx:13) et/ou dans la nav du header, pour rendre la page accessible.

#### ⚪ Indicateur de scroll du hero affiche 'Scroll' en anglais
- **Gravité/Catégorie**: low / translation
- **Fichier**: `components/sections/hero-section.tsx:99`
- **Problème**: Sur la page d'accueil (premier ecran visible par tout visiteur), le micro-libelle de l'indicateur de defilement est en anglais alors que tout le site est en francais et que l'aria-label correspondant est deja en francais.
- **Correctif proposé**: Remplacer 'Scroll' par 'Défiler' (ou 'Découvrir').

#### ⚪ Anglicisme 'Marketplace' comme titre principal de la boutique + texte panier
- **Gravité/Catégorie**: low / translation
- **Fichier**: `components/sections/product-section.tsx:45`
- **Problème**: 'Marketplace' est un terme anglais utilise comme titre h2 de la section produits de la home et dans le drawer panier, sur un site de primeur 100% francais ('boutique' est utilise ailleurs: header 'Boutique', hero 'Découvrir la Boutique'). Terminologie incoherente pour un meme concept (boutique vs marketplace).
- **Correctif proposé**: Uniformiser sur 'Boutique' (ou 'Notre Boutique'). Corriger product-section.tsx:45 et cart-drawer.tsx:147.

#### ⚪ Anglicisme 'Local First' dans la page Livraison
- **Gravité/Catégorie**: low / translation
- **Fichier**: `app/livraison/page.tsx:22`
- **Problème**: Une des 4 cartes d'arguments de la page livraison a un titre en anglais alors que les trois autres sont en francais. Incoherence visible.
- **Correctif proposé**: Remplacer 'Local First' par 'Priorité au Local' (ou 'Circuit Court').

#### ⚪ Titre 'Analytics Dashboard' en anglais dans l'admin
- **Gravité/Catégorie**: low / translation
- **Fichier**: `app/admin/Analytics/page.tsx:218`
- **Problème**: Le titre principal de la page Analytics est entierement en anglais alors que le sous-titre et le reste de l'admin sont en francais. 'Analytics' seul (loanword) passe dans la sidebar, mais 'Analytics Dashboard' en h1 est clairement de l'anglais residuel.
- **Correctif proposé**: Remplacer par 'Statistiques' ou 'Tableau de bord — Analyse'.

#### ⚪ Casse incoherente du libelle 'Total payé' / 'Total Payé' pour le meme concept
- **Gravité/Catégorie**: low / ux
- **Fichier**: `components/account/orders-tab.tsx:153`
- **Problème**: Le montant paye est libelle 'Total Payé' dans l'onglet Commandes du compte et 'Total payé' sur la page de succes. Incoherence typographique mineure entre deux ecrans montrant la meme donnee.
- **Correctif proposé**: Choisir une casse unique (recommande 'Total payé') et l'appliquer aux deux fichiers.

#### ⚪ Placeholders d'adresse Guadeloupe sur le formulaire de commande d'une boutique Ile-de-France
- **Gravité/Catégorie**: low / db-inconsistency
- **Fichier**: `app/commande/page.tsx:283,292,302`
- **Problème**: Les exemples (placeholders) du formulaire d'adresse de livraison suggerent la Guadeloupe (97100 / Basse-Terre / 0690) alors que la zone de chalandise declaree (layout.tsx, CGV) est 94/75/92/91 autour d'Alfortville. Cela induit le client en erreur sur la zone livree et trahit un copier-coller d'un ancien projet.
- **Correctif proposé**: Mettre des exemples Ile-de-France: code postal '94140', ville 'Alfortville', telephone '06 12 34 56 78'.

#### ⚪ Composants admin morts contenant de l'anglais (NavMain 'Quick Create'/'Inbox', DataTable 'Edit'/'Delete'/'Add Section'/'Submit')
- **Gravité/Catégorie**: low / translation
- **Fichier**: `components/admin/nav-main.tsx:29,33,41`
- **Problème**: Deux composants boilerplate shadcn contiennent de l'anglais non traduit. NavMain n'est jamais utilise et DataTable est importe mais non rendu (l'admin/page.tsx utilise un <Table> manuel a la place). Pas visible actuellement, mais dette technique et risque de fuite d'anglais si ces composants sont reactives, plus import inutile.
- **Correctif proposé**: Supprimer les composants/imports inutilises (NavMain et l'import DataTable dans admin/page.tsx) ou les traduire entierement si reutilises plus tard.

#### ⚪ Route admin en CamelCase '/admin/Analytics' (sensibilite a la casse fragile)
- **Gravité/Catégorie**: low / config
- **Fichier**: `components/admin/app-sidebar.tsx:61`
- **Problème**: Le seul segment de route avec une majuscule est 'Analytics'. Cela fonctionne tant que le nom de dossier et le lien sont identiques, mais c'est incoherent avec la convention du projet et fragile sur les systemes de fichiers sensibles a la casse (deploiement Linux/Vercel) si jamais le lien ou le dossier divergent.
- **Correctif proposé**: Renommer le dossier en app/admin/analytics et le lien en '/admin/analytics' pour respecter la convention (kebab/lowercase) du reste du routing.

#### ⚪ Anchor de section incoherent: id="fruits" sur la section produits alors que tous les liens pointent vers #marketplace
- **Gravité/Catégorie**: low / bug · _(repéré en vérification)_
- **Fichier**: `components/sections/product-section.tsx:41`
- **Problème**: La section produits porte 'id="fruits"' (product-section.tsx:41), mais aucun lien ne cible '#fruits'. Tous les liens et le scroll programmatique ciblent '#marketplace' (header.tsx:14 getElementById("marketplace"), hero-section.tsx:27, et de nombreux href="/#marketplace"). Le scroll fonctionne uniquement grace au wrapper <div id="marketplace"> de app/page.tsx:15 qui entoure <ProductSection/>. L'id="fruits" est donc un ancre morte/incoherente (residu), et le double conteneur (div#marketplace > section#fruits) trahit une renomme partielle de 'fruits' vers 'marketplace'.
- **Correctif proposé**: Aligner l'id de la section: remplacer id="fruits" par id="marketplace" dans product-section.tsx:41 et supprimer le wrapper redondant <div id="marketplace"> de app/page.tsx (ou inversement), pour n'avoir qu'une seule ancre coherente.

#### ⚪ Avatar fallback 'CN' code en dur (initiales generiques shadcn) dans le menu admin
- **Gravité/Catégorie**: low / translation · _(repéré en vérification)_
- **Fichier**: `components/admin/nav-user.tsx:54`
- **Problème**: Le fallback de l'avatar admin affiche 'CN' (initiales du template shadcn 'shadcn'/'CN') au lieu des initiales reelles de l'utilisateur connecte. C'est du boilerplate non personnalise, visible dans le pied de sidebar admin (rendu via app-sidebar.tsx:161) quand l'image avatar est absente. nav-user.tsx recoit pourtant user.name (app-sidebar.tsx:115-119) qui pourrait servir a generer les initiales.
- **Correctif proposé**: Remplacer 'CN' par les initiales derivees de user.name (ex. name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()), avec repli 'PW' (Power).

#### ⚪ OUPS / ERREUR / 404 + manque de lien legal: pages d'erreur et 404 sans Header/Footer ni acces aux mentions legales
- **Gravité/Catégorie**: low / ux · _(repéré en vérification)_
- **Fichier**: `app/error.tsx:19`
- **Problème**: Les pages app/error.tsx, app/not-found.tsx et app/admin/error.tsx n'incluent ni Header ni Footer (contrairement a toutes les autres pages publiques qui les rendent). L'utilisateur tombe sur un ecran nu sans navigation ni acces aux liens legaux (Mentions légales / CGV) ni au panier. Sur une boutique en production, une 404 ou une erreur devrait conserver l'en-tete pour permettre de continuer la navigation. Mineur mais c'est une regression UX coherente avec l'etat inacheve.
- **Correctif proposé**: Envelopper le contenu de not-found.tsx et error.tsx avec <Header/> et <Footer/> (comme les autres pages), ou au minimum ajouter des liens vers la boutique et les mentions legales pour ne pas pieger l'utilisateur.
