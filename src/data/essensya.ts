import type { EssensyaData } from "@/types";

/* ════════════════════════════════════════════════════════════════
   CONTENU ÉDITORIAL — MAISONS ESSENSYA
   Destiné à migrer vers un CMS sans toucher aux composants :
   le contrat de types (src/types) reste identique.

   ⚠⚠ LA PRÉMISSE DE CE FICHIER EST PÉRIMÉE, ET IL FAUT LE SAVOIR
   AVANT D'Y TOUCHER.

   Tout ce qui suit a été écrit pour un MONO-PRODUIT : une maison, deux
   déclinaisons qui ne changent que le nombre de chambres. C'était la
   consigne, et elle structure encore /maisons, ses deux pages de
   déclinaison, le comparatif et les données structurées.

   La livraison du client dit autre chose : DIX modèles avec leurs
   rendus (Ankara, Athènes, Berlin, Dakar, Dublin, Hanoi, Jakarta, Lima,
   Lisbonne, Londres), plus un onzième — Pékin — qui porte le prix
   d'appel de 78 000 € sans avoir de visuel. Les textes fournis parlent
   de « gamme », de « modèles », de « chaque plan de chaque modèle ».

   La page d'accueil a été refaite sur cette réalité. Le reste du site
   ne l'est pas encore : /maisons parle toujours d'une maison unique.
   C'est une incohérence CONNUE, pas un oubli, et elle se lève en
   arbitrant une question : la gamme remplace-t-elle le mono-produit,
   ou Pékin est-il l'entrée de gamme d'un discours qui reste centré sur
   une maison ? Tant que la réponse n'est pas là, on n'invente pas de
   surfaces ni de prix pour dix modèles.
   ════════════════════════════════════════════════════════════════ */

/* L'aplat neutre des visuels manquants : 130 octets, couleur « sable ».
   Défini ici plutôt que dans `src/lib/agences.ts` parce que les données
   s'en servent aussi, et qu'un module `server-only` ne peut pas être
   importé par un composant client. */
export const SANS_PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='10'%3E%3Crect width='16' height='10' fill='%23E8E3D9'/%3E%3C/svg%3E";

/* ────────────────────────────────────────────────────────────────
   ⚠⚠ VALEURS PROVISOIRES — EN ATTENTE DU CLIENT ⚠⚠
   Tout ce qui est faux aujourd'hui est ici, et NULLE PART AILLEURS.
   Remplacer ce bloc suffit à mettre la maquette à jour.

   Les prix sont calés sur la médiane réelle du flux Vitahome
   (253 annonces relevées le 11/09/2026) pour rester plausibles :
     · terrain + maison  → médiane 161 580 €  (min 100 001, max 328 000)
     · terrain seul      → médiane  65 000 €
     · maison seule      → médiane  96 580 €  (déduite)
     · planTypePrice Vitahome : Modèle C 71 973 € · Modèle A 48 973 €

   À FAIRE CONFIRMER : quel prix fait foi (planTypePrice ? prixpublic ?),
   ce que couvre le « à partir de », et si une mensualité est publiable.
   ──────────────────────────────────────────────────────────────── */
export const PLACEHOLDER = {
  /** Nom commercial de la maison. */
  houseName: "Essen",
  /** Prix maison seule, hors terrain. */
  priceFrom3ch: 99_900,
  priceFrom2ch: 94_900,
  /** Prix d'appel terrain + maison affiché en home. */
  priceFromTotal: 161_000,
  /** Mensualité indicative — NE PAS PUBLIER sans validation juridique. */
  monthly: 690,
  /** Téléphone commercial affiché sur le site. */
  phone: "05 46 00 00 00",
} as const;

/* ════ LES PREMIÈRES DONNÉES RÉELLES ════
   Tout le bloc ci-dessus est provisoire. Celui-ci ne l'est pas : il
   vient du client, et il prime partout où les deux se contredisent.

   ⚠ 78 000 € N'EST PAS 94 900 €. Le prix d'appel du site vient de
   changer de près de 17 000 €, et il ne porte plus sur la même chose :
   c'est le modèle Pékin, maison seule, hors terrain ET hors adaptation.
   « Hors adaptation » est nouveau et compte — c'est le poste qui
   surprend un acquéreur en fin de parcours. La mention se déplace donc
   avec le prix, partout.

   ⚠ Pékin n'a AUCUN visuel dans la livraison : le modèle qui porte le
   prix d'appel est le seul qu'on ne puisse pas montrer. À réclamer.

   ⚠ « dans les Landes » vient de la consigne de titre. Le flux Vitahome
   branché aujourd'hui sert la Charente-Maritime, la Vendée et
   l'Eure-et-Loir — pas les Landes. Les deux ne peuvent pas être vrais
   en même temps : voir la note remontée au client. */
export const REEL = {
  /** Modèle d'entrée de gamme — celui qui porte le prix d'appel. */
  modeleEntree: "Pékin",
  /** Maison seule, hors terrain, hors adaptation. */
  prixEntree: 78_000,
  mentionPrix: "Maison seule, modèle Pékin, hors terrain, hors adaptation, la maison uniquement.",
  departement: "les Landes",
} as const;

/* ════ LES VISUELS ════
   Les douze photos Unsplash ont disparu. C'étaient des maisons
   d'architecte — toiture monopente, menuiseries aluminium, volumes
   sombres — et le produit réel est à l'opposé : plain-pied, enduit
   clair, tuile canal, une écriture du Sud-Ouest. Elles ne calaient pas
   une mise en page, elles racontaient un autre constructeur.

   Ce sont maintenant les rendus livrés par le client, convertis par
   `scripts/images.mjs` (voir src/data/visuels.ts).

   ⚠ DEUX TROUS ASSUMÉS, et il vaut mieux les voir écrits ici que les
   découvrir en recette :
     · `plan` — la livraison ne contient AUCUN plan de maison, alors que
       la section « Le plan » en demande un. On montre un intérieur, qui
       parle de volumes à défaut de les coter. À réclamer.
     · `agence` — aucune photo d'agence non plus. On ne met pas un rendu
       de maison à la place : une vignette d'agence qui montre une
       maison ment sur ce qu'elle désigne. L'aplat neutre s'applique.  */
const V = (modele: string, vue: string) => `/maisons/${modele}/${vue}.webp`;

const IMG = {
  facade: V("lisbonne", "vue-1-exterieur"),
  facadeLg: V("lisbonne", "vue-2-exterieur"),
  sejour: V("lisbonne", "vue-3-interieur"),
  cuisine: V("athenes", "vue-3-interieur"),
  chambre: V("ankara", "vue-4-chambre-1"),
  terrasse: V("hanoi", "vue-2-exterieur"),
  matiere: V("berlin", "vue-3-interieur"),
  volume: V("dublin", "vue-1-exterieur"),
  /* ⚠ Ce n'est pas un plan : la livraison n'en contient pas. */
  plan: V("jakarta", "vue-3-interieur"),
  chantier: V("londres", "vue-1-exterieur"),
  /* Aplat « sable » de 130 octets. Le navigateur résout `src=""` en
     rechargeant la page courante : le vide doit être explicite. */
  agenceLr: SANS_PHOTO,
  agenceTh: SANS_PHOTO,
} as const;

const P = PLACEHOLDER;

export const ESSENSYA_DATA: EssensyaData = {
  /* ════ LA MAISON ════ */
  house: {
    name: P.houseName,
    tagline:
      "Une maison de plain-pied conçue une fois, dessinée à fond, et construite à l'identique. C'est ce qui tient le prix.",
    philosophy:
      "Nous n'avons pas fait une maison moins chère en enlevant des choses. Nous en avons fait une seule, et nous l'avons dessinée jusqu'au bout.",
    image: IMG.facade,
    heroImage: IMG.facadeLg,
    alt: `Maison ${P.houseName} — plain-pied contemporain`,
    gallery: [
      { src: IMG.sejour, alt: "Séjour traversant", caption: "Séjour traversant — 38 m²" },
      { src: IMG.cuisine, alt: "Cuisine ouverte", caption: "Cuisine ouverte — plan de travail 3,20 m" },
      { src: IMG.matiere, alt: "Détail des matériaux", caption: "Détail — enduit minéral, menuiserie aluminium" },
    ],

    /* ════ LA VISITE ════
       Un seul parcours, celui de LA maison. Six étapes : le composant
       VisiteMaison épingle la scène et fait défiler les pièces au scroll,
       avec fondu croisé et travelling continu sur chaque calque.

       ── PASSER UNE ÉTAPE EN VIDÉO ──
       Ajouter `video:` sur l'étape suffit : le calque passe de <img> à
       <video autoplay muted loop playsinline>, rien d'autre ne bouge.
       `image` reste OBLIGATOIRE — elle sert de poster pendant le
       chargement, et c'est elle que Google indexe.

           { cle:"sejour", …,
             image:"…/sejour.jpg",
             video:"https://cdn.exemple.com/essensya/sejour.mp4" }

       Contraintes pour que ça reste fluide :
         · 4 à 8 s, en boucle sans raccord visible, SANS son
         · H.264 ou WebM, 1920×1080, 2 à 4 Mo par clip
         · plan fixe ou travelling très lent — le scroll fait déjà
           le mouvement, un plan nerveux se bat avec lui
         · à héberger HORS Netlify (Cloudflare Stream, Mux, Bunny) :
           la bande passante vidéo épuise le quota du plan gratuit

       ⚠ Aucune vidéo n'est branchée aujourd'hui : il n'existe pas de
       banque libre de droits exploitable en hotlink pour ce type de
       contenu (Mixkit et Pexels renvoient 403). Ces six clips sont à
       produire au tournage — c'est le poste à défendre en priorité dans
       le budget visuel, la visite étant le meilleur moment du site. */
    visite: [
      {
        cle: "arrivee", nav: "Arrivée", titre: "L'approche",
        texte:
          "Toiture monopente, façade enduite, menuiseries aluminium au nu extérieur. Un volume simple — et un volume simple coûte moins cher à construire qu'un volume compliqué. C'est le premier endroit où le prix se joue.",
        specs: ["Plain-pied", "Garage intégré", "Terrain dès 350 m²"],
        image: IMG.facadeLg, alt: "Façade sud de la maison à l'arrivée",
      },
      {
        cle: "sejour", nav: "Séjour", titre: "Le séjour traversant",
        texte:
          "38,4 m² ouverts sur deux orientations. La lumière entre à l'est le matin et repart à l'ouest le soir — on ne rallume qu'à la nuit tombée. Aucun couloir ne vient prendre de la surface au passage.",
        specs: ["38,4 m²", "Traversant", "Zéro couloir"],
        image: IMG.sejour, alt: "Séjour traversant de la maison Essensya",
      },
      {
        cle: "cuisine", nav: "Cuisine", titre: "La cuisine ouverte",
        texte:
          "Un plan de travail de 3,20 m d'un seul tenant, dans le prolongement direct du séjour. Elle est comprise dans le prix, aménagée — pas vendue en supplément une fois le contrat signé.",
        specs: ["Plan 3,20 m", "Cellier 4,9 m²", "Comprise"],
        image: IMG.cuisine, alt: "Cuisine ouverte aménagée",
      },
      {
        cle: "chambres", nav: "Chambres", titre: "Les chambres",
        texte:
          "Deux ou trois, à l'est, avec des placards dessinés dans le plan plutôt qu'ajoutés après coup. C'est le seul choix que nous vous demandons de faire — et il ne change rien au reste de la maison.",
        specs: ["2 ou 3 chambres", "Orientées est", "Placards intégrés"],
        image: IMG.chambre, alt: "Chambre orientée est",
      },
      {
        cle: "terrasse", nav: "Terrasse", titre: "La terrasse couverte",
        texte:
          "12 m² de vie extérieure comprise dans la conception, pas vendue en option. Le prolongement direct du séjour, à l'abri.",
        specs: ["12 m²", "Couverte", "Comprise"],
        image: IMG.terrasse, alt: "Terrasse couverte en prolongement du séjour",
      },
      {
        cle: "volume", nav: "Construction", titre: "Ce qu'on ne voit pas",
        texte:
          "Brique rectifiée, toiture bac acier isolée, pompe à chaleur air/eau, conformité RE2020. Ce qui est invisible est exactement le même que chez un constructeur trois fois plus cher — c'est le reste qui diffère.",
        specs: ["RE2020", "PAC air/eau", "Brique rectifiée"],
        image: IMG.volume, alt: "Volume architectural et mise en œuvre",
      },
    ],

    archText:
      "Un volume simple et précis : toiture monopente, façade enduite, menuiseries aluminium au nu extérieur. Chaque décision architecturale a été arbitrée deux fois — une fois pour la qualité de vie, une fois pour le coût. La sobriété n'est pas une économie subie, c'est la méthode.",
    archImage: IMG.volume,
    materials: [
      ["Structure", "Brique rectifiée R+0"],
      ["Toiture", "Monopente bac acier isolé"],
      ["Menuiseries", "Aluminium double vitrage"],
      ["Chauffage", "Pompe à chaleur air/eau"],
      ["Isolation", "RE2020 — ITI renforcée"],
      ["Assainissement", "Raccordement tout-à-l'égout"],
    ],
    features: [
      { t: "RE2020", d: "Conception conforme à la réglementation environnementale en vigueur." },
      { t: "Plain-pied", d: "Aucune marche, accessible dès la conception." },
      { t: "Traversant", d: "Double orientation du séjour, lumière du matin au soir." },
      { t: "Rangements intégrés", d: "Placards dessinés dans le plan, pas ajoutés après coup." },
      { t: "Garage intégré", d: "Compris dans le volume principal, pas facturé en extension." },
      { t: "Terrain dès 350 m²", d: "Une emprise compacte compatible avec les parcelles courantes." },
    ],
    included: [
      "Étude de sol et adaptation au terrain",
      "Cuisine aménagée (hors électroménager)",
      "Salle de bain équipée",
      "Pompe à chaleur et plancher chauffant",
      "Volets roulants motorisés",
      "Terrasse couverte 12 m²",
      "Garage intégré",
      "Garanties CCMI, décennale, parfait achèvement",
      "Assurance dommages-ouvrage",
    ],
    /* Le pendant obligatoire de la liste précédente. Taire les exclusions
       détruit la crédibilité d'un prix bas plus vite que tout le reste.
       Les libellés reprennent ceux du flux Vitahome (champ `mention`). */
    excluded: [
      "Le terrain",
      "Les frais de notaire",
      "Les taxes d'aménagement et de raccordement",
      "Les VRD (voirie et réseaux divers)",
      "Le électroménager de la cuisine",
      "Les aménagements extérieurs (clôture, portail, allée)",
    ],
  },

  /* ════ LES DÉCLINAISONS ════
     Deux plans, pas deux produits. Les slugs Vitahome sont rattachés ici :
     c'est la seule source de vérité du mapping flux → déclinaison. */
  versions: [
    {
      slug: "3-chambres",
      label: "3 chambres",
      chiffre: "3",
      surface: 93.64,
      bedrooms: 3,
      rooms: 5,
      garageArea: 16.5,
      priceFrom: P.priceFrom3ch,
      pour: "La déclinaison la plus construite : une famille, un bureau possible, et de la marge si elle s'agrandit.",
      difference:
        "Une chambre de plus que la version 2 chambres, pour 5 m² et un garage un peu plus grand. Le séjour, la cuisine et les prestations sont strictement identiques.",
      rooms_detail: [
        ["Séjour / cuisine", "38,4 m²"],
        ["Chambre 1", "12,1 m²"],
        ["Chambre 2", "10,8 m²"],
        ["Chambre 3", "10,2 m²"],
        ["Salle de bain", "6,3 m²"],
        ["Cellier", "4,9 m²"],
        ["Entrée / dégagements", "9,3 m²"],
        ["Garage", "16,5 m²"],
      ],
      planImage: IMG.plan,
      image: IMG.facadeLg,
      alt: "Maison Essensya en version 3 chambres",
      vitahomeSlugs: ["modele-c", "modele-b"],
    },
    {
      slug: "2-chambres",
      label: "2 chambres",
      chiffre: "2",
      surface: 88.56,
      bedrooms: 2,
      rooms: 4,
      garageArea: 14.48,
      priceFrom: P.priceFrom2ch,
      pour: "Le ticket d'entrée : un premier achat, un couple, ou une parcelle un peu juste.",
      difference:
        "Une chambre en moins et 5 m² de moins, donc un prix plus bas. Tout le reste — séjour traversant, cuisine aménagée, terrasse couverte, garage — ne bouge pas.",
      rooms_detail: [
        ["Séjour / cuisine", "38,4 m²"],
        ["Chambre 1", "12,1 m²"],
        ["Chambre 2", "11,4 m²"],
        ["Salle de bain", "6,3 m²"],
        ["Cellier", "4,2 m²"],
        ["Entrée / dégagements", "7,8 m²"],
        ["Garage", "14,5 m²"],
      ],
      planImage: IMG.plan,
      image: IMG.facade,
      alt: "Maison Essensya en version 2 chambres",
      vitahomeSlugs: ["modele-a-1", "modele-a"],
    },
  ],

  /* ════ LES ARGUMENTS ════
     Remplace la boucle sur la collection en home. Même gabarit
     (.c-model-row, alternance gauche/droite), autre axe de répétition :
     une rangée par argument de LA maison, pas une rangée par produit. */
  /* ⚠ TEXTES FOURNIS PAR LE CLIENT, REPRIS MOT POUR MOT. Ils ne sont ni
     réécrits ni « améliorés » : c'est sa parole commerciale, et les
     reformuler à sa place l'obligerait à relire un texte qu'il croit
     validé. Les remarques de fond lui sont remontées à part.

     Les chiffres redeviennent 01/02/03 : « 93 » et « 0 » désignaient la
     surface et le nombre d'options du produit unique, deux données qui
     n'ont plus de sens sur une gamme. */
  arguments: [
    {
      cle: "plan",
      chiffre: "01",
      label: "Le plan",
      title: "Zéro mètre carré perdu",
      text:
        "Une gamme de maisons individuelles optimisées pour les budgets serrés. Pas de dégagement inutile, pas de recoin qui ne sert à rien, une surface habitable où chaque mètre carré est habité. Des plans pensés et conçus pour optimiser chaque espace.",
      image: IMG.plan,
      alt: "Intérieur d'une maison Essensya — volumes optimisés",
      href: "/maisons",
      linkLabel: "Voir les plans de maisons",
    },
    {
      cle: "prestations",
      chiffre: "02",
      label: "Les prestations",
      title: "L'essentiel pour votre maison",
      text:
        "Règlementation RE 2020, salle de bain équipée, système de chauffage performant, personnalisation possible. Tout est dedans. L'essentiel des prestations d'une construction de maison pour votre plus grand confort.",
      image: IMG.sejour,
      alt: "Séjour et cuisine aménagée d'une maison Essensya",
      href: "/#points-forts",
      linkLabel: "Nos points forts",
    },
    {
      cle: "prix",
      chiffre: "03",
      label: "Le prix",
      title: "Un prix maîtrisé ; la qualité conservée",
      text:
        "Chaque espace et chaque matériau est optimisé pour garantir un prix maîtrisé sans compromis sur la qualité. Le tout encadré par le CCMI et ses garanties, avec l'accompagnement Maisons Essensya à chaque étape de la construction.",
      image: IMG.chantier,
      alt: "Maison Essensya achevée",
      href: "/annonces",
      linkLabel: "Nos projets de construction",
    },
  ],

  /* ════ COMPARATIF ════ L'argument central, rendu vérifiable. */
  compare: {
    title: "Pourquoi c'est moins cher",
    intro:
      "Pas parce que la maison est moins bien construite — les matériaux et les garanties sont les mêmes. Parce qu'une maison unique, construite en série, ne coûte pas la même chose à concevoir, à chiffrer et à suivre.",
    rows: [
      { poste: "Modèles au catalogue", essensya: "1 maison, 2 déclinaisons", classique: "20 à 60 modèles", gain: true },
      { poste: "Étude et conception", essensya: "Faite une fois, amortie", classique: "Refaite à chaque client", gain: true },
      { poste: "Options à arbitrer", essensya: "Aucune", classique: "150 à 400 références", gain: true },
      { poste: "Cuisine aménagée", essensya: "Comprise", classique: "En supplément", gain: true },
      { poste: "Terrasse couverte", essensya: "Comprise", classique: "En supplément", gain: true },
      { poste: "Délai de chiffrage", essensya: "48 h", classique: "2 à 6 semaines", gain: true },
      { poste: "Avenants en cours de chantier", essensya: "Rien à modifier", classique: "Fréquents", gain: true },
      { poste: "Garanties CCMI", essensya: "Toutes", classique: "Toutes" },
      { poste: "Conformité RE2020", essensya: "Oui", classique: "Oui" },
    ],
    note:
      "Comparatif établi sur la base des pratiques courantes du secteur de la maison individuelle. Les postes « classique » sont indicatifs et ne visent aucun constructeur en particulier.",
  },

  /* « Nos points forts » — textes du client, mot pour mot. L'intitulé
     n°01 « Une maison, pas une gamme » a disparu de lui-même : il
     affirmait exactement le contraire de ce que le client vend. */
  philosophy: [
    { num: "01", title: "Conception maîtrisée", text: "Chaque plan de chaque modèle a été optimisé poste par poste, matériau par matériau. Rien n'est laissé au hasard." },
    { num: "02", title: "Les bons choix déjà faits", text: "Nous avons déjà sélectionné les meilleurs choix pour vous : volumes, équipements. Il ne vous reste plus qu'à personnaliser." },
    { num: "03", title: "Processus simplifié", text: "Moins d'étapes, moins d'aller-retour, votre projet avance vite et bien en toute transparence." },
    { num: "04", title: "Qualité", text: "Une RE 2020 respectée, des équipements sélectionnés, des exigences élevées : nous reproduisons ce qui fonctionne." },
    { num: "05", title: "Garanties constructeur et CCMI", text: "CCMI, garanties décennales, assurance dommages-ouvrage, vous bénéficiez du cadre juridique le plus protecteur pour les futurs propriétaires." },
    { num: "06", title: "Une équipe à vos côtés", text: "Un interlocuteur unique à chaque étape, c'est un accompagnement d'expert pour gagner du temps et de la tranquillité." },
  ],

  steps: [
    { num: "01", title: "Je découvre la maison", text: "Un seul plan à comprendre, un seul prix à retenir. Trente minutes suffisent." },
    { num: "02", title: "Je trouve mon terrain", text: "Nos agences ont déjà repéré les parcelles compatibles de votre secteur." },
    { num: "03", title: "Je choisis 2 ou 3 chambres", text: "C'est le seul arbitrage qu'on vous demande. Le reste est déjà décidé." },
    { num: "04", title: "Je construis", text: "Un chantier maîtrisé, des garanties complètes, une maison livrée au prix convenu." },
  ],

  /* ⚠ Agences provisoires, calées sur la zone réelle du flux Vitahome
     (Charente-Maritime, Deux-Sèvres). Le flux ne contient qu'une agence
     de démonstration : la liste réelle est à obtenir du client. */
  agencies: [
    {
      id: "agence-demo-1",
      name: "Agence de La Rochelle",
      zone: "Charente-Maritime & Aunis",
      address: "12 avenue du Général de Gaulle, 17000 La Rochelle",
      phone: P.phone,
      email: "larochelle@essensya.fr",
      hours: "Lun – Sam · 9h–12h / 14h–18h30",
      lat: 46.1667,
      lng: -1.15,
      image: IMG.agenceLr,
      cities: ["La Rochelle", "Aigrefeuille-d'Aunis", "Salles-sur-Mer", "Chaillevette", "Andilly", "Saint-Césaire"],
      description:
        "L'agence de La Rochelle couvre l'Aunis et la côte. Son équipe connaît les PLU et les lotissements du secteur — c'est elle qui repère les parcelles compatibles avec la maison Essensya, souvent avant leur mise sur le marché.",
    },
    {
      id: "agence-thouars",
      name: "Agence de Thouars",
      zone: "Deux-Sèvres & Nord-Vienne",
      address: "6 rue des Lotissements, 79100 Thouars",
      phone: "05 49 00 00 00",
      email: "thouars@essensya.fr",
      hours: "Lun – Sam · 9h–12h / 14h–18h30",
      lat: 46.9667,
      lng: -0.216667,
      image: IMG.agenceTh,
      cities: ["Thouars", "Niort", "Bressuire", "Parthenay", "Airvault", "Saint-Varent"],
      description:
        "En Deux-Sèvres, le foncier reste accessible et les parcelles sont plus grandes. L'agence de Thouars y accompagne surtout des premiers achats, pour qui le prix annoncé d'avance change tout.",
    },
  ],

  trust: [
    { icon: "shield", title: "Contrat CCMI", text: "Le cadre légal le plus protecteur pour faire construire." },
    { icon: "ruler", title: "Constructeur-concepteur", text: "La maison est conçue, chiffrée et construite par nos équipes." },
    { icon: "pin", title: "Agences locales", text: "Un interlocuteur proche de votre terrain, du premier jour à la livraison." },
    { icon: "key", title: "Livraison garantie", text: "Prix et délais convenus contractuellement, garanties décennales incluses." },
  ],

  concept: {
    manifesto:
      "Le marché de la construction pousse à l'infini des options, des gammes et des suppléments — et fait payer cette complexité au client. Nous avons pris le chemin inverse : une maison, dessinée obsessionnellement, au prix annoncé dès le premier jour. Parce qu'une maison bien pensée n'a pas besoin d'être repensée par chaque client.",
    figures: [
      ["1", "maison, pas trente"],
      ["2", "déclinaisons : 2 ou 3 chambres"],
      ["0", "option à arbitrer"],
      ["48 h", "pour un chiffrage complet"],
    ],
    commitments: [
      { t: "Le prix annoncé est le prix tenu", d: "La maison est chiffrée dans le détail avant même d'être commercialisée. Le contrat CCMI fige le prix et les délais : pas d'avenant surprise, pas de « supplément indispensable » découvert en cours de route." },
      { t: "La qualité ne se négocie pas", d: "Matériaux éprouvés, conformité RE2020, mêmes exigences sur chaque chantier. Construire en série maîtrisée, c'est répéter ce qui fonctionne — pas rogner sur ce qui compte." },
      { t: "Ce qui n'est pas compris est écrit aussi", d: "Terrain, frais de notaire, taxes, VRD, aménagements extérieurs : la liste des exclusions est affichée à côté de celle des prestations. Vous comparez en connaissance de cause." },
      { t: "Un interlocuteur, pas un standard", d: "De la première visite à la remise des clés, votre agence locale suit votre projet. Elle connaît votre terrain, votre commune et votre chantier." },
      { t: "Toutes les garanties du CCMI", d: "Garantie de livraison à prix et délais convenus, garantie décennale, biennale, parfait achèvement, dommages-ouvrage. Le cadre le plus protecteur qui existe pour faire construire en France." },
    ],
  },

  landings: {
    "maison-prix-lancement": {
      title: `${P.houseName} à prix de lancement`,
      subtitle: `Pour l'ouverture de nos agences, la maison ${P.houseName} — 93 m², 3 chambres, garage compris — est proposée à un prix de lancement sur une sélection de terrains.`,
      image: IMG.facadeLg,
      price: P.priceFrom3ch - 5_000,
      priceNote: `au lieu de ${new Intl.NumberFormat("fr-FR").format(P.priceFrom3ch)} € — maison seule, hors terrain`,
      bullets: [
        "Offre valable sur les 10 premiers contrats signés",
        "Terrains compatibles déjà sélectionnés par nos agences",
        "Cuisine, terrasse couverte et garage compris",
        "Toutes les garanties CCMI incluses",
      ],
      formTitle: "Recevoir le dossier complet",
      formText: "Plan, prestations détaillées, ce qui est compris et ce qui ne l'est pas, et les terrains compatibles. Réponse sous 48 h.",
    },
  },
};

/* ════ ACCESSEURS ════ */
export const HOUSE = ESSENSYA_DATA.house;
export const VERSIONS = ESSENSYA_DATA.versions;
export const AGENCIES = ESSENSYA_DATA.agencies;

/** La déclinaison par défaut — celle qui représente 76 % du flux réel. */
export const DEFAULT_VERSION = VERSIONS[0];

export const versionBySlug = (slug: string) =>
  VERSIONS.find((v) => v.slug === slug) ?? null;

export const agencyById = (id: string) =>
  AGENCIES.find((g) => g.id === id) ?? null;

/** La déclinaison « autre » — pour le bloc de fin de fiche. */
export const otherVersion = (slug: string) =>
  VERSIONS.find((v) => v.slug !== slug) ?? null;

/** Prix d'appel du site : le plus bas des déclinaisons. */
export const PRICE_FROM = Math.min(...VERSIONS.map((v) => v.priceFrom));
