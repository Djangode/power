# Spec — Intégration x402 : API de commande pour agents IA

**Date** : 2026-08-06 · **Statut** : design validé (approche, stablecoins, périmètre catalogue) · **Implémentation** : non commencée

## 1. Contexte

Power Primeur (powerprimeur.com, Alfortville) est une boutique Next.js 16 / Prisma / Neon déployée sur Vercel. Aucun paiement en ligne : le tunnel actif `/api/orders/place` crée les commandes en `validated`, encaissées à la réception (espèces ou CB). Le code Stripe est dormant et le reste.

x402 (protocole HTTP 402 de la x402 Foundation / Linux Foundation) permet à des agents IA dotés d'un wallet de payer une requête HTTP en stablecoin, réglée on-chain par un facilitator en ~200 ms. Objectif : ouvrir un canal de vente machine-payable sans toucher au parcours humain.

## 2. Décisions actées

| Sujet | Décision |
|---|---|
| Approche | **A — API x402 réservée aux agents** ; checkout humain inchangé (encaissement à la réception) |
| Stablecoins | **EURC (premier choix, 1 € = 1 EURC) + USDC (second choix, cours BCE + 1 % de marge)** |
| Périmètre catalogue | **Tout le catalogue**, compositions personnalisables incluses (tailles, options, « N ingrédients au choix ») |
| Réseau | **Base uniquement en V1** (Solana en extension V1.1 — voir §13) |
| Facilitator | **Coinbase CDP** en production (1 000 règlements/mois gratuits puis 0,001 $) ; `x402.org` sur Base Sepolia pour le développement |
| Coupe-circuit | Variable d'environnement `X402_ENABLED` — le canal se désactive sans déploiement de code |

## 3. Hors périmètre (V1)

- Paiement crypto pour les clients humains au checkout web (option B — nécessiterait ouverture CSP, UX wallet, SAV crypto).
- Stripe x402 (option C — private preview ; bascule possible plus tard, l'API agents est indépendante du rail de paiement).
- Réseau Solana, autres ERC-20 que EURC/USDC, scheme `upto`/`batch-settlement`.

## 4. Architecture

### Flux de commande agent

```
Agent                    Power (Vercel)                    Facilitator CDP
  │  GET /api/agent/catalog  │                                   │
  │ ────────────────────────▶│  200 JSON (produits, prix TTC €,  │
  │                          │   compositions, stocks, créneaux)  │
  │  POST /api/agent/orders  │                                   │
  │ ────────────────────────▶│  panier validé, prix recalculés   │
  │  402 + PaymentRequirements (EURC exact OU USDC au cours BCE) │
  │ ◀────────────────────────│                                   │
  │  POST idem + X-PAYMENT   │                                   │
  │ ────────────────────────▶│  verify (hors-chaîne, gratuit)    │
  │                          │ ─────────────────────────────────▶│
  │                          │  contrôles métier (stock, créneau)│
  │                          │  commande créée en `pending`      │
  │                          │  settle (règlement on-chain)      │
  │                          │ ─────────────────────────────────▶│
  │                          │  commande → `validated`, stock −, │
  │  200 + X-PAYMENT-RESPONSE│  notifications (client, Telegram) │
  │ ◀────────────────────────│                                   │
```

### Composants

- **`lib/orders.ts`** (nouveau) : logique de création de commande extraite de `/api/orders/place` (prix serveur via `lib/pricing.ts`, promo, frais de livraison via `getDeliveryConfig()`, facture séquentielle `lib/invoice.ts`, stock, créneaux, notifications). `/api/orders/place` et le flux agent l'appellent tous deux — comportement humain inchangé, tests existants au vert.
- **`lib/x402.ts`** (nouveau) : construction des `PaymentRequirements` (montants dynamiques via `@x402/core` + `@x402/evm`, pas le middleware à prix fixes), appels verify/settle au facilitator, conversion USDC (voir ci-dessous).
- **`app/api/agent/catalog/route.ts`** (nouveau) : catalogue JSON, gratuit, cache court (60 s).
- **`app/api/agent/orders/route.ts`** (nouveau) : flux 402 ci-dessus. Pas de session NextAuth — le paiement est l'authentification. Hors matcher du middleware (comme les routes `/api/orders/*` actuelles).
- **Packages** : `@x402/next`, `@x402/core`, `@x402/evm`.

### Montants et conversion USDC

- EURC : montant exact du total TTC (1:1), en unités atomiques (6 décimales).
- USDC : total TTC × taux EUR/USD de référence BCE + **1 % de marge de change**, arrondi au cent supérieur. Taux quotidien récupéré côté serveur (flux officiel BCE), mis en cache dans `SiteSetting` (`x402_eur_usd_rate`, `x402_rate_fetched_at`). **Garde-fou** : si le taux a plus de 48 h, l'option USDC est retirée des `accepts` (EURC reste).
- Les deux options figurent dans le même tableau `accepts` de la réponse 402 ; l'agent choisit.

### Séquencement sans transactions (contrainte Neon HTTP)

L'adaptateur Neon HTTP ne supporte pas les transactions ; l'ordre des écritures est donc défensif :

1. `verify` (gratuit) + contrôles métier (stock, créneau, prix) — aucun règlement si échec (402/409).
2. Création de la commande en `pending` avec items et numéro de facture réservé.
3. `settle` on-chain. Échec → commande basculée en `cancelled` **directement dans le flux agent** (aucun argent prélevé ; le stock n'ayant pas encore été décrémenté, ce chemin ne doit pas passer par la route admin de changement de statut, dont la logique recrédite le stock).
4. Succès → `paymentTxHash` enregistré, commande → `validated`, stock décrémenté, créneau incrémenté (livraison), notifications.
5. **Si l'étape 4 échoue après un settle réussi** : alerte Telegram immédiate « règlement sans commande finalisée » avec tx hash et référence — remboursement manuel selon runbook (§9). La commande `pending` + tx hash permettent la réconciliation.

Un cron de réconciliation n'est pas nécessaire en V1 : le cleanup quotidien existant supprime les commandes `pending` x402 âgées de plus de 24 h et **sans tx hash** (ajout au cron actuel) — suppression directe, sans transiter par la route admin ni recréditer de stock.

## 5. Catalogue agents (`GET /api/agent/catalog`)

Réponse JSON auto-descriptive, en euros TTC :

- **Produits simples** : id, nom, description, prix TTC (`promoPrice` prioritaire), unité (pièce / poids par tranches de 100 g), stock disponible, catégorie. (Le détail de TVA reste porté par la facture, comme aujourd'hui.)
- **Compositions** (jus, soupes, légumes découpés) : tailles (`CompositionSize` avec prix), options (`CompositionOption` : `includedByDefault`, `extraPrice`), règle « `includedChoices` ingrédients au choix inclus, supplément au-delà ». Le schéma de commande attendu (`customData`) est documenté dans la réponse elle-même (`orderSchema` par composition).
- **Modalités** : créneaux disponibles (retrait / livraison, capacité restante côté livraison), frais et seuil de franco (`getDeliveryConfig()`), zone de livraison, adresse de retrait.
- **Validation à la commande** : mêmes fonctions que le tunnel humain (`cartItemUnitPrice`, `collectIngredientIds`) — un `customData` invalide ou un prix client divergent → 400 avec message exploitable par l'agent, avant tout paiement.

## 6. Commande agent (`POST /api/agent/orders`)

Payload : items (`productId` ou `compositionId` + `customData`), `deliveryMethod` (`retrait`/`livraison`), date + créneau, contact (nom, téléphone ≥ 10 chiffres, email pour la facture), adresse complète si livraison, `promoCode` optionnel.

- Réponses : `400` payload invalide · `402` paiement requis (avec détail du total calculé) · `409` stock ou créneau indisponible · `200` commande confirmée (référence, `pickupCode` si retrait, facture, tx hash).
- **Idempotence** : contrainte d'unicité sur `paymentTxHash` — un même règlement ne peut créer deux commandes ; rejouer la requête payée renvoie la commande existante.
- La commande suit ensuite le circuit standard (préparation, statuts, bot Telegram `/commandes`, `/preparer`, `/remis`, `/livre`). CA comptable inchangé (`delivered`).

## 7. Modèle de données

Ajouts au modèle `Order` (push manuel sur Neon, documenté dans le commit — pas de migrations versionnées dans ce repo) :

- `paymentMethod String @default("on_reception")` — `on_reception` | `x402` (le détournement actuel de `carrier` reste en place pour l'affichage, à résorber hors de ce chantier).
- `paymentTxHash String? @unique`, `paymentAsset String?` (`EURC`/`USDC`), `paymentNetwork String?` (`base`), `amountPaidCrypto Decimal?`, `eurRate Decimal?` (1 pour EURC, taux BCE appliqué pour USDC).

Aucune nouvelle table. `lib/env.ts` : ajout des variables x402 (validées seulement si `X402_ENABLED=true`) — `X402_PAYTO_ADDRESS`, `X402_FACILITATOR_URL`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`.

## 8. Sécurité et anti-abus

- Rate limiting via `lib/rate-limit.ts` existant : `agent-catalog:<ip>` (60/min) et `agent-order:<ip>` (10/min) — les contrôles coûteux n'arrivent qu'après.
- Aucun règlement avant contrôles métier ; `verify` hors-chaîne gratuit avant `settle`.
- Filtrage OFAC/KYT assuré par le facilitator CDP.
- Aucune donnée bancaire ; les champs de contact sont validés comme dans le tunnel humain.
- CSP inchangée (tous les appels au facilitator sont côté serveur).

## 9. Opérations et conformité

- **Encaissement** : adresse dédiée sur Base (`X402_PAYTO_ADDRESS`), réception passive. Runbook mensuel : transfert vers Coinbase (entité UE agréée MiCA) → conversion EURC→EUR **1:1 sans frais** (Coinbase Advanced) / USDC→EUR (~0,5-1 %) → virement SEPA (0,15 €) vers le compte pro.
- **Facturation** : séquence `FAC-` existante réutilisée, facture en euros (art. 289 CGI), TVA collectée en euros — pour USDC, contre-valeur au taux BCE stocké sur la commande (`eurRate`).
- **Comptabilité** : point avec l'expert-comptable (cadre ANC 2026-01) ; export CSV admin des paiements x402 (date, référence, montant crypto, contre-valeur EUR, tx hash).
- **Remboursements** : pas de chargeback ; remboursement = virement stablecoin manuel vers l'adresse payeuse (runbook documenté, alerte Telegram à chaque cas).
- **CGV** : ajout du mode de paiement en ligne x402 (stablecoins acceptés, moment du paiement, politique de remboursement).
- **Découvrabilité** : listing dans le Bazaar CDP (description, schémas d'entrée/sortie) + page `/agents` documentant l'API.
- **Monitoring** : notification Telegram enrichie « 🤖 Commande agent — déjà payée » ; alerte dédiée pour toute incohérence règlement/commande.

## 10. Tests et déploiement

- Vitest : facilitator simulé (verify/settle), montants EURC/USDC, idempotence tx hash, échecs à chaque étape du séquencement §4, compositions avec options, garde-fou taux BCE. Les 252 tests existants restent verts (le refactor `lib/orders.ts` est non-comportemental).
- Bout en bout sur **Base Sepolia** (facilitator `x402.org`, fonds fictifs) avec un client `x402-fetch`.
- Mainnet : bascule facilitator CDP, premières commandes réelles de faible montant ; test réel possible via le connecteur PayBox de Django depuis Claude Code.
- Rollout : `X402_ENABLED=false` par défaut ; activation en production après validation ; désactivation instantanée possible.

## 11. Coûts

- Facilitator CDP : 0 € ≤ 1 000 règlements/mois, puis 0,001 $/règlement. Gas : 0 € (couvert). Wallet : 0 €.
- Conversion : 0 % (EURC) / ~0,5-1 % (USDC, couvert par la marge de 1 % intégrée au prix) ; SEPA 0,15 €/virement.
- Infrastructure : aucun service payant nouveau ; impact Vercel/Neon négligeable.
- Point préexistant, indépendant de x402 : usage commercial sur Vercel Hobby → migration Pro (20 $/mois) recommandée.

## 12. Risques et limites assumés

- **Volume initial probablement quasi nul** — pari early-adopter à coût fixe ~0 €.
- **Écritures non atomiques** (Neon HTTP) — fenêtres d'incohérence couvertes par le séquencement §4, l'alerting et le cleanup ; résiduel accepté.
- **Dépendance au facilitator CDP** — atténuée : le protocole est ouvert, facilitators alternatifs (PayAI, auto-hébergé) compatibles avec la même intégration `@x402/core`.
- **Course au stock** entre canal humain et agents — le contrôle a lieu avant règlement, l'écart résiduel (minutes) est traité comme aujourd'hui entre deux clients simultanés.

## 13. Extensions futures (hors V1)

Solana + EURC/USDC SPL (`@x402/svm`) — pertinent, une grande part du trafic agents y vit ; option B (checkout humain crypto) ; bascule ou ajout Stripe x402 à sa GA France ; scheme `upto` pour paniers ajustables (pesée réelle).

## 14. Phases et estimation

| Phase | Contenu | Charge |
|---|---|---|
| 0 | Comptes CDP + Coinbase, adresse d'encaissement, variables d'env | ~1 h (Django) |
| 1 | Packages, env, refactor `lib/orders.ts`, champs `Order` | 0,5-1 j |
| 2 | Catalogue + commande agent (compositions incluses), flux 402 dynamique, tests, Base Sepolia | 1,5-2,5 j |
| 3 | Mainnet CDP, EURC+USDC, premières commandes réelles, runbook encaissement | 0,5 j |
| 4 | Bazaar, page `/agents`, Telegram enrichi, stat admin, export CSV | 0,5-1 j |
| 5 | CGV, point expert-comptable | 0,5 j + rdv |
| **Total** | | **~4 à 6 jours** |
