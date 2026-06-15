# Lot 10 — Zéro mock + commande sans paiement en ligne

Date : 2026-06-15 · Projet : Power (e-commerce primeur, Next.js + Prisma/Neon)

## Contexte

Appli en production. Le client (commerçant) refuse pour l'instant de créer un compte
Stripe → **pas de paiement en ligne**. On veut : prise de commande uniquement,
encaissement à la caisse au retrait/à la livraison, + suppression de **tous** les mocks
(compta, analytics, données en dur résiduelles).

Ce lot s'ajoute au travail Lot 9 non encore commité (schéma `Expense`, `OrderItem.customData`,
champs User pro, `lib/pricing.ts`, CRUD CMS admin, newsletter).

## Décisions validées

- **Paiement** : aucun paiement en ligne. Parcours client = paiement à la réception
  (espèces / CB sur place). Code Stripe laissé **en dormance** (non exposé), réactivable.
- **Email société** : adresse configurable dans l'admin Réglages (`SiteSetting`
  `order_notification_email`, défaut `contact@powerprimeur.com`).
- **Analytics** : brancher le réel calculable ; trafic/visiteurs/conversion/churn → bloc
  honnête « Suivi d'audience à venir » (pas de chiffres inventés).
- **CA compta** : commandes `status = 'delivered'` uniquement (= réellement encaissées).
- Appliquer réellement `delivery_fee` / `free_delivery_threshold` (Réglages) au calcul des frais.
- Export compta = vrai CSV. Coût d'achat des compositions exclu (pas de prix d'achat en base), signalé.

## Chantiers

### 1. Parcours commande — paiement à la caisse uniquement
- `commande/page.tsx` : déjà OK (Espèces/CB à la réception → `/api/orders/place`).
- `cart-page.tsx` : le bouton qui POST vers `/api/stripe/checkout` → rediriger vers `/commande`.
- `payment-tab.tsx` : masquer « Gérer mes moyens de paiement » (POST `/api/stripe/portal`).
- `lib/email.ts` `sendOrderConfirmation` : wording « paiement validé » → « à régler à la réception ».

### 2. Notifications email
- `lib/email.ts` : nouvelle fonction `sendNewOrderToCompany(...)` (récap commande).
- `place/route.ts` : appeler la notif après création (destinataire = `getOrderNotificationEmail()`).

### 3. Réglages & application
- `content.ts` : ajouter clé `order_notification_email` ; exposer
  `getDeliveryConfig(): Promise<{fee:number; threshold:number}>` et
  `getOrderNotificationEmail(): Promise<string>`.
- `settings/page.tsx` : champ « Email de notification des commandes ».
- Frais de livraison réels appliqués (serveur `place/route.ts` + affichage `commande`/`cart`).

### 4. Compta réelle
- `app/api/admin/expenses/route.ts` (NEW) : GET / POST / DELETE sur `Expense`.
- `app/actions/accounting.ts` (NEW) : `getAccountingData(period)` →
  CA (delivered), coûts d'achat (`purchasePrice×qty`, compositions exclues),
  charges (Σ Expense par catégorie), bénéfice net, rentabilité par produit.
- `accounting/page.tsx` : retirer mocks, brancher, `handleAddExpense` → POST réel, export CSV réel.

### 5. Analytics réel
- `app/actions/analytics.ts` (NEW) : `getAnalyticsData(period)` → CA, commandes, panier moyen,
  top produits, répartition catégories, évolution mensuelle.
- `Analytics/page.tsx` : brancher ; non-mesurable → « Suivi d'audience à venir ».

### 6. Mocks résiduels
- `admin/page.tsx` : retirer import mort `DataTable` ; brancher graphique sur évolution CA réelle.
- `stock/page.tsx` : `suppliers`/`origins` dérivés des valeurs distinctes en DB + saisie libre.
- `components/admin/data-table.tsx` : supprimé (boilerplate anglais non utilisé).
- `components/admin/chart-area-interactive.tsx` : alimenté par des données réelles ou retiré.

## Règles transverses
- 100 % français, thème sombre (bg-black/zinc-900), accent `orange-500`.
- `prisma` depuis `@/lib/db` ; client régénéré (Expense/customData typés).
- Auth admin : `session?.user?.role !== "admin"`.
- CA/revenue = `status='delivered'` ; volumes d'activité = commandes non annulées.

## Clôture
Régénérer Prisma (fait) → typecheck/build → appliquer `MIGRATION-LOT9.sql` sur Neon → commit.
