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
| **Vercel** | `git push` → déploiement. Une URL de preview par branche, pratique pour faire valider chaque itération au client comme tu l'as fait de v1 à v7. |

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

## La carte du listing

`/annonces` affiche une vraie carte (Leaflet + `leaflet.markercluster`),
pas un fond décoratif : les annonces proches sont **agrégées en bulles
chiffrées**, qui se scindent au zoom jusqu'aux points individuels.

- **Zoom / déplacement → résultats filtrés.** Chaque `moveend` remonte
  les bornes visibles ; la liste ne garde que les annonces dans le cadre.
  Décochable via « Rechercher quand je déplace la carte ».
- **Clic sur une bulle** → la carte zoome sur son emprise. **Clic sur un
  point** → fiche annonce. **Survol** synchronisé dans les deux sens
  entre la carte de résultat et son point.
- **Cadrage automatique** sur l'ensemble des annonces au chargement, et
  au clic sur « Réinitialiser ».
- **Mobile** : la carte n'est montée qu'en vue Carte ; un `ResizeObserver`
  la mesure et la recadre quand elle devient visible (sinon Leaflet
  calculerait sur un conteneur de 0 px).
- Le composant est chargé en `dynamic(… { ssr: false })` : Leaflet touche
  à `window` dès son import, le reste de la page reste pré-rendu.

Fond de carte : n'importe quel fournisseur XYZ via
`NEXT_PUBLIC_MAP_TILE_URL` / `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION`.
Défaut : CARTO Positron, sans clé.

---

## Reste à faire

1. **Photos réelles** → passer les `<img>` en `next/image` (les domaines sont
   déjà autorisés dans `next.config.ts`). Gain AVIF/WebP + lazy natif.
2. **Fond de carte** — la carte de `/annonces` tourne sur CARTO Positron,
   sans clé. Pour un trafic de production, basculer sur un fournisseur
   avec quota garanti (MapTiler, Mapbox, Google) : une seule variable,
   `NEXT_PUBLIC_MAP_TILE_URL`, plus l'attribution correspondante.
3. **CMS** pour le contenu éditorial et les landings (`src/data/essensya.ts`).
   Le contrat de types ne bouge pas, seule la source change.
4. **GTM** — les `dataLayer.push` sont câblés dans `LeadForm`
   (`gtmEvent`). Reste à poser le conteneur et les `*_view`.
5. **Pages légales** — mentions, confidentialité, cookies (liens présents en
   pied de page, cibles à créer) + bandeau consentement.
6. **Tests** du mapping `mapAnnonce()` sur un échantillon réel du flux.
