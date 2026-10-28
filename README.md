# Maisons Essensya — front

Portage du prototype `maisons-essensya-v7.html` (SPA vanilla, hash-routing)
vers **Next.js 16 / App Router / TypeScript**.

Le design est repris **à l'identique** : le CSS du v7 a été extrait tel quel,
pas réécrit. Ce qui change, c'est ce qu'il y avait autour.

---

## Pourquoi cette stack

| Choix | Raison |
| --- | --- |
| **Next.js (App Router)** | Le v7 route en `#/annonce/ES-1001` → invisible pour Google. Ici chaque annonce, modèle et agence est une **vraie URL pré-rendue côté serveur**. Pour un constructeur, le SEO local *est* le canal d'acquisition. |
| **TypeScript** | Le flux Vitahome a des pièges (`house: false` pour un terrain, `latitude` en String, `postCode` en Number). Les types les rendent impossibles à oublier. |
| **CSS natif + tokens** | Le design system existe déjà en variables CSS. Le passer en Tailwind coûterait des jours et perdrait en fidélité. |
| **Clever Cloud** | Hébergement souverain demandé par le client : société française, serveurs à Paris, non soumise au droit américain. `git push` → déploiement, base PostgreSQL et stockage de fichiers (Cellar) chez le même prestataire. Voir [Hébergement](#hébergement--clever-cloud). |

**Ce que Next apporte concrètement ici :**

- Le **token Vitahome ne quitte jamais le serveur**. `src/lib/vitahome/*` est
  marqué `server-only` : un import depuis un composant client **casse le build**.
  C'est la garantie structurelle que le doc réclamait.
- Le flux annonces est mis en cache par ISR (`revalidate: 3600`) — l'équivalent
  natif du couple cron + transient prévu côté WordPress, sans cron à maintenir.
- Les formulaires POSTent vers `/api/leads`, qui relaie vers Vitahome en y
  ajoutant le token. Même rôle que le proxy `/wp-json/essensya/v1/lead`.

---

## Démarrer

```bash
npm install
cp .env.example .env.local   # déjà fait
npm run dev                  # http://localhost:3000
```

Sans `VITAHOME_TOKEN`, le site tourne sur le jeu d'annonces de démo
(`src/data/annonces-demo.ts`, au format passerelle réel) et les formulaires
sont en **dry-run** : le payload est loggé côté serveur, rien n'est envoyé.

```bash
npm run build && npm start   # build de prod
npm run lint
npx tsc --noEmit
```

---

## Les 10 pages du périmètre

| v7 | Maintenant |
| --- | --- |
| `#/` | `/` |
| `#/maisons` | `/maisons` |
| `#/modele/essen-01` | `/maisons/essen-01` |
| `#/annonces` | `/annonces` |
| `#/annonce/ES-1001` | `/annonces/es-1001` |
| `#/agences` | `/agences` |
| `#/agence/sete` | `/agences/sete` |
| `#/concept` | `/concept` |
| `#/contact` | `/contact` |
| `#/lp/essen-lancement` | `/lp/essen-lancement` (noindex) |
| `#styleguide` | `/styleguide` (noindex) |

Plus `/sitemap.xml` et `/robots.txt`, générés — le sitemap inclut chaque
annonce du flux.

---

## Structure

```
src/
├── app/                    une route = un dossier
│   ├── api/leads/route.ts  proxy prospects (le seul endroit qui voit le token)
│   ├── sitemap.ts robots.ts
│   └── …
├── components/             Header, Footer, cartes, formulaire, hero…
│   └── AnnoncesMap.tsx     carte Leaflet + agrégation (client, sans SSR)
├── data/
│   ├── essensya.ts         contenu éditorial (→ CMS plus tard)
│   └── annonces-demo.ts    jeu de démo AU FORMAT VITAHOME
├── lib/
│   ├── format.ts           prix, titres, URLs
│   ├── annonces/           recherche du listing : critères d'URL (partagé)
│   │                       · filtre, tri, pagination (server-only)
│   └── vitahome/           config · types bruts · adaptateurs (server-only)
├── styles/
│   ├── base.css            tokens, base, composants, header, footer
│   ├── sections.css        sections réutilisées (philo, steps, trust, cta…)
│   └── pages/*.css         une feuille par gabarit
└── types/index.ts          contrat de données consommé par l'UI
```

**Règle à tenir :** les composants ne consomment **que** le type `Annonce`
(`src/types`). Le format brut Vitahome s'arrête à `mapAnnonce()`. Si le flux
change, un seul fichier bouge.

---

## Vitahome

`src/lib/vitahome/config.ts` porte les ORIGIN-ID de l'onglet ENVOI PROSPECT :

```
122 Demande de rappel · 53 Annonce terrain · 54 Annonce T+M
52 Modèle maison · 56 Contact général · 71 Contact agence
250 Landing page · 74 Demande de RDV
```

`buildPayload()` construit le payload exact, champs « IMPORTANT » compris
(`construction-location-id`, `construction-location-insee`,
`history-ad-content`, `history-link`, `history-content`).

---

## Recherche et pagination du listing

Le flux Vitahome (`pack-XXX/annonces.json`) **ne pagine pas et ne filtre
pas** : il rend le pack entier, et la documentation de l'API
(`pro.vitahome.fr/doc/api`) ne décrit aucun paramètre pour ce point
d'accès. Il est donc lu en entier, mis en cache (`VITAHOME_REVALIDATE`),
et c'est **notre serveur** qui cherche : `src/lib/annonces/recherche.ts`.

Le navigateur ne filtre plus rien. Il écrit les critères dans l'URL, le
serveur rend la page de résultats :

| Paramètre | Valeurs |
| --- | --- |
| `q` | commune, code postal, département (accents, casse et tirets ignorés) |
| `type` | `terrain` · `terrain-maison` |
| `dept` | code INSEE présent dans le flux |
| `chambres` | `1` à `4`, nombre exact |
| `tri` | `recent` (défaut) · `prix-asc` · `prix-desc` |
| `zone` | `sud,ouest,nord,est` — posée quand on déplace la carte |
| `page` | `2`, `3`… — 24 annonces par page |

Une valeur invalide est ignorée, jamais une erreur. Le navigateur reçoit
la page demandée (des vignettes, pas les annonces complètes) et les
points de la carte — légers, mais tous : c'est la carte qui montre où
chercher ailleurs. Mesuré sur un flux de 240 annonces (119 parcelles) :
840 Ko de HTML et 507 Ko de données avant, à chaque filtre ; 159 Ko et
59 Ko après.

Les pages sont de vrais liens (`?page=N`), suivis par Google. Page N du
catalogue entier : canonique propre et titre numéroté. Vue filtrée ou
triée : canonique `/annonces`.

## La carte du listing

`/annonces` affiche une vraie carte (Leaflet + `leaflet.markercluster`),
pas un fond décoratif : les annonces proches sont **agrégées en bulles
chiffrées**, qui se scindent au zoom jusqu'aux points individuels.

- **Zoom / déplacement → résultats filtrés.** Chaque `moveend` d'un
  geste du visiteur devient le paramètre `zone`, que le serveur applique.
  Un cadrage automatique (chargement, nouveaux résultats, « Réinitialiser »)
  n'en pose pas. Décochable via « Rechercher quand je déplace la carte ».
- **Clic sur une bulle** → la carte zoome sur son emprise. **Clic sur un
  point** → fiche annonce. **Survol** synchronisé dans les deux sens
  entre la carte de résultat et son point.
- **Cadrage automatique** sur l'ensemble des annonces au chargement, au
  clic sur « Réinitialiser », et quand un filtre change les résultats
  sans zone posée. Avec une zone, la carte reste où le visiteur l'a mise.
- **Mobile** : la carte n'est montée qu'en vue Carte ; un `ResizeObserver`
  la mesure et la recadre quand elle devient visible (sinon Leaflet
  calculerait sur un conteneur de 0 px).
- Le composant est chargé en `dynamic(… { ssr: false })` : Leaflet touche
  à `window` dès son import, le reste de la page reste pré-rendu.

Fond de carte : n'importe quel fournisseur XYZ via
`NEXT_PUBLIC_MAP_TILE_URL` / `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION`.
Défaut : Plan IGN (Géoplateforme, `data.geopf.fr`), sans clé, désaturé
en CSS — voir `src/lib/fond-de-carte.ts`. CARTO Positron, l'ancien
défaut, exige désormais une clé et sert un filigrane « API KEY REQUIRED »
sans elle.

La page `/agences` porte une seconde carte, plus petite, avec les
agences dont les coordonnées sont saisies (`AgencesMap`). Même fond,
mêmes points, mêmes styles (`src/styles/carte.css`).

---

## Hébergement — Clever Cloud

Tout est en France, chez un seul prestataire :

| Service | Rôle | Remplace |
| --- | --- | --- |
| Application **Node.js** (zone Paris) | `next start`, pages, API, back-office | Netlify |
| Add-on **PostgreSQL** | contenu, comptes du back-office, journal des versions | Supabase (base + Auth) |
| Add-on **Cellar** (S3) | fichiers de la médiathèque, bucket privé | Supabase Storage |

Le code ne dépend d'aucune API propre à Clever Cloud : du Postgres
standard (`src/lib/db.ts`) et du S3 standard (`src/lib/stockage.ts`).

### Mise en route (une fois)

1. **Créer l'application** Node.js, zone Paris, reliée au dépôt Git.
   Taille XS ou S (le build de Next a besoin de mémoire).
2. **Créer et lier les add-ons** PostgreSQL et Cellar. Lier suffit :
   Clever Cloud injecte `POSTGRESQL_ADDON_URI` et `CELLAR_ADDON_*`.
   ⚠ Éviter l'offre PostgreSQL gratuite (DEV) : elle limite le nombre
   de connexions, et `next build` ouvre une connexion par processus de
   prérendu (deux au plus par processus, voir `PG_POOL_MAX`).
3. **Créer un bucket privé** dans la console Cellar.
4. **Variables d'environnement** de l'application, toutes définies
   AVANT le premier build (les `NEXT_PUBLIC_*` et l'origine du stockage
   sont figées à la compilation) :

   | Variable | Valeur |
   | --- | --- |
   | `CC_POST_BUILD_HOOK` | `npm run build` |
   | `CC_NODE_DEV_DEPENDENCIES` | `install` (TypeScript est requis par le build) |
   | `NEXT_PUBLIC_SITE_URL` | l'adresse https définitive — obligatoire, rien ne la remplace ici |
   | `S3_BUCKET` | le nom du bucket créé à l'étape 3 |
   | `ADMIN_SESSION_SECRET` | une longue chaîne aléatoire (signature des sessions) |
   | `VITAHOME_TOKEN`, `VITAHOME_ENTITY_ID`, `NEXT_PUBLIC_GTM_ID`, `GA4_*`… | reprises telles quelles de Netlify |

   Le port (`PORT=8080`) et la version de Node (`engines` du
   `package.json`) sont pris en charge par Clever Cloud.
5. **Schéma** : `psql "$POSTGRESQL_ADDON_URI" -f db/schema.sql`, ou
   coller le contenu de `db/schema.sql` dans l'interface web de l'add-on.
   La base doit être en UTF-8 (c'est le défaut chez Clever Cloud).
6. **Données** : `node scripts/migrer-depuis-supabase.mjs --essai`, puis
   sans `--essai`. Le script copie les tables, les fichiers et les
   comptes, et affiche un **lien d'accès** par compte : les mots de passe
   restent chez Supabase, chacun en choisit un nouveau.
   Sans migration (installation neuve) : `node scripts/premier-admin.mjs vous@exemple.fr`.
7. **Domaine** : l'ajouter dans l'onglet « Noms de domaine » de
   l'application et suivre l'enregistrement DNS indiqué par la console.
8. Une fois le site vérifié en ligne : supprimer le projet Supabase et
   le site Netlify.

### Comptes du back-office

Les comptes vivent dans la table `admins` (mot de passe en empreinte
scrypt). Aucun e-mail n'est envoyé par le site : « Inviter » et
« Nouveau lien » produisent un lien à usage unique, valable 72 h, que
l'administrateur transmet lui-même. Porte de secours si plus personne ne
peut se connecter : `node scripts/premier-admin.mjs adresse@exemple.fr`.

### En-têtes de sécurité

CSP, HSTS, `Permissions-Policy`… sont posés par `next.config.ts`
(`headers()`), donc envoyés par le serveur Next quel que soit
l'hébergeur. Ils vivaient auparavant dans `netlify.toml`.

---

## Reste à faire

1. **Photos réelles** → passer les `<img>` en `next/image` (les domaines sont
   déjà autorisés dans `next.config.ts`). Gain AVIF/WebP + lazy natif.
2. **Fond de carte** — les cartes de `/annonces` et `/agences` tournent sur
   le Plan IGN, sans clé. Pour un autre rendu, basculer sur un fournisseur
   XYZ (MapTiler, Stadia, CARTO avec clé…) : une seule variable,
   `NEXT_PUBLIC_MAP_TILE_URL`, plus l'attribution correspondante — et son
   domaine dans `img-src` (`next.config.ts`).
3. **CMS** pour le contenu éditorial et les landings (`src/data/essensya.ts`).
   Le contrat de types ne bouge pas, seule la source change.
4. **GTM** — les `dataLayer.push` sont câblés dans `LeadForm`
   (`gtmEvent`). Reste à poser le conteneur et les `*_view`.
5. **Pages légales** — mentions, confidentialité, cookies (liens présents en
   pied de page, cibles à créer) + bandeau consentement.
6. **Tests** du mapping `mapAnnonce()` sur un échantillon réel du flux.
