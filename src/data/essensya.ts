import type { EssensyaData } from "@/types";

/* ════════════════════════════════════════════════════════════════
   CONTENU ÉDITORIAL — MAISONS ESSENSYA
   Destiné à migrer vers un CMS sans toucher aux composants :
   le contrat de types (src/types) reste identique.

   ⚠ MONO-PRODUIT : une seule maison, deux déclinaisons qui ne
   changent que le nombre de chambres. Jamais deux produits.
   ════════════════════════════════════════════════════════════════ */

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

/* Visuels de calage. À purger avant mise en ligne : ces photos montrent
   des maisons d'architecte sans rapport avec le produit réel. Voir le
   système de substituts graphiques (src/components/Substitut.tsx) qui,
   lui, est la vraie réponse aux 90 % d'annonces sans photo. */
const IMG = {
  facade: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1920&auto=format&fit=crop",
  facadeLg: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1920&auto=format&fit=crop",
  sejour: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1920&auto=format&fit=crop",
  cuisine: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?q=80&w=1400&auto=format&fit=crop",
  chambre: "https://images.unsplash.com/photo-1600607687644-c7171b42498f?q=80&w=1200&auto=format&fit=crop",
  terrasse: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=1200&auto=format&fit=crop",
  matiere: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?q=80&w=1200&auto=format&fit=crop",
  volume: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=1200&auto=format&fit=crop",
  plan: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1400&auto=format&fit=crop",
  chantier: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1400&auto=format&fit=crop",
  agenceLr: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop",
  agenceTh: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop",
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
  arguments: [
    {
      cle: "plan",
      chiffre: "93",
      label: "Le plan",
      title: "Zéro mètre carré perdu",
      text:
        "Pas de couloir, pas de dégagement inutile, pas de recoin qui ne sert à rien. 93 m² où chaque surface est habitée plutôt que traversée — c'est pour ça qu'elle paraît plus grande qu'elle n'est.",
      image: IMG.sejour,
      alt: "Séjour traversant sans couloir",
      href: "/maisons#plan",
      linkLabel: "Voir le plan",
    },
    {
      cle: "prestations",
      chiffre: "0",
      label: "Les prestations",
      title: "Zéro option à arbitrer",
      text:
        "Cuisine aménagée, salle de bain équipée, pompe à chaleur, volets motorisés, terrasse couverte, garage. Tout est dedans. Vous ne découvrirez pas en cours de route qu'il manque l'essentiel.",
      image: IMG.cuisine,
      alt: "Cuisine aménagée comprise dans le prix",
      href: "/maisons#prix",
      linkLabel: "Ce qui est compris",
    },
    {
      cle: "prix",
      chiffre: "1",
      label: "Le prix",
      title: "Un seul prix, annoncé d'avance",
      text:
        "Une maison construite à l'identique se chiffre au centime près avant même le premier rendez-vous. Le contrat CCMI fige ensuite le prix et les délais. Il n'y a pas d'avenant surprise parce qu'il n'y a rien à improviser.",
      image: IMG.chantier,
      alt: "Chantier d'une maison Essensya",
      href: "/concept",
      linkLabel: "Notre méthode",
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

  philosophy: [
    { num: "01", title: "Une maison, pas une gamme", text: "Un seul plan, optimisé jusqu'au dernier mètre carré. Ce qu'on ne dépense pas en variantes, on le rend sur le prix." },
    { num: "02", title: "Les bons choix, déjà faits", text: "Matériaux, volumes, équipements : nous avons arbitré pour vous. Il ne reste plus qu'à choisir le nombre de chambres." },
    { num: "03", title: "Prix annoncé, prix tenu", text: "Une maison maîtrisée se chiffre d'avance. Le CCMI fige le prix et les délais, du premier rendez-vous à la remise des clés." },
    { num: "04", title: "Un processus court", text: "Moins d'étapes, moins d'allers-retours, moins de rendez-vous. Votre projet avance vite parce qu'il n'y a rien à réinventer." },
    { num: "05", title: "La qualité ne bouge pas", text: "Brique rectifiée, RE2020, pompe à chaleur, dommages-ouvrage. Construire en série, c'est répéter ce qui marche." },
    { num: "06", title: "Toutes les garanties", text: "CCMI, décennale, biennale, parfait achèvement, livraison à prix et délais convenus." },
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
