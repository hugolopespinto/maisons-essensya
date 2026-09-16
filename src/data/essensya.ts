import type { EssensyaData } from "@/types";
/* Le catalogue de la gamme. Import sûr : `gamme.ts` ne dépend que de
   `visuels.ts`, aucun cycle, et aucun composant client n'importe ce
   fichier — le catalogue de visuels ne part donc pas dans le bundle. */
import { MODELES } from "./gamme";

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
  /* ⚠ « ESSEN » N'EXISTE PAS. C'était le nom commercial inventé pour la
     maquette mono-produit, et il s'affichait en titre de /maisons, dans
     le fil d'ariane, dans les textes alternatifs, jusque dans les
     métadonnées servies à Google. Le client vend onze modèles qui
     portent des noms de capitales ; aucun ne s'appelle Essen.

     `house` ne décrit donc plus UNE maison mais ce qui est commun à la
     gamme. Son `name` devient le nom de la marque, seul nom vrai à
     cet endroit — les gabarits qui écrivaient « la maison Essen »
     disent maintenant « nos maisons ».

     ⚠ Les légendes de la galerie portaient des cotes inventées
     — « séjour 38 m² », « plan de travail 3,20 m ». Sur des rendus qui
     ne sont pas cotés, et pour une gamme dont nous n'avons aucun plan,
     une cote au centimètre est une affirmation gratuite. Les légendes
     décrivent maintenant ce qu'on voit, et rien de plus. */
  house: {
    name: "Essensya",
    tagline:
      "Des plans optimisés jusqu'au dernier mètre carré, conçus par notre bureau d'études. C'est ce qui tient le prix.",
    philosophy:
      "Nous n'avons pas fait des maisons moins chères en enlevant des choses. Nous avons dessiné chaque plan jusqu'au bout, poste par poste, pour que rien n'y soit perdu.",
    image: IMG.facade,
    heroImage: IMG.facadeLg,
    alt: "Maison Essensya — vue extérieure côté terrasse",
    gallery: [
      { src: IMG.sejour, alt: "Séjour et cuisine ouverte", caption: "Séjour et cuisine ouverte" },
      { src: IMG.cuisine, alt: "Cuisine aménagée", caption: "Cuisine aménagée" },
      { src: IMG.matiere, alt: "Pièce de vie", caption: "Pièce de vie" },
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

    /* ⚠ CE TEXTE DÉCRIVAIT UNE AUTRE MAISON. Il annonçait « toiture
       monopente, façade enduite, menuiseries aluminium au nu extérieur »
       — l'écriture des photos d'architecte qui illustraient la maquette.
       Les rendus livrés par le client montrent l'inverse : tuile canal,
       débord de toit, une écriture du Sud-Ouest. Décrire une toiture
       qu'on ne construit pas, à côté d'une image qui montre l'autre, est
       le genre de détail qui fait douter de tout le reste. */
    archText:
      "Chaque décision est arbitrée deux fois — une fois pour la qualité de vie, une fois pour le coût. La sobriété n'est pas une économie subie, c'est la méthode : ce que nous ne dépensons pas en complexité, nous le rendons sur le prix.",
    archImage: IMG.volume,
    /* ⚠ SIX LIGNES DE PRESTATIONS CONSTRUCTIVES ONT DISPARU — structure,
       toiture, menuiseries, isolation, assainissement — parce qu'AUCUNE
       n'était sourcée. Elles décrivaient la maison fictive de la
       maquette, et une caractéristique constructive fausse sur un site
       de constructeur n'est pas une approximation : c'est une
       description de bien.

       Ne subsistent que les postes que le client a lui-même écrits. Les
       autres reviendront avec son tableau de caractéristiques, pas
       avant. */
    materials: [
      ["Réglementation", "RE 2020"],
      ["Chauffage", "Système de chauffage performant"],
      ["Salle de bain", "Équipée"],
      ["Personnalisation", "Possible"],
    ],
    /* ⚠ « Plain-pied », « traversant », « terrain dès 350 m² » ont été
       retirés : inventés pour la maquette, et invérifiables sur une
       gamme de onze modèles dont nous n'avons aucun plan. Le flux
       Vitahome contient d'ailleurs des modèles en R+1 — « plain-pied »
       était donc faux pour une partie du catalogue.

       Ce qui reste vient de la parole du client, mot pour mot ou presque. */
    features: [
      { t: "RE 2020", d: "Conception conforme à la réglementation environnementale en vigueur." },
      { t: "Salle de bain équipée", d: "Comprise, pas facturée en supplément." },
      { t: "Chauffage performant", d: "Système dimensionné avec le plan, pas ajouté après coup." },
      { t: "Personnalisation possible", d: "Les grands arbitrages sont faits ; il reste à vous approprier la maison." },
      { t: "Zéro mètre carré perdu", d: "Pas de dégagement inutile, pas de recoin qui ne sert à rien." },
      { t: "CCMI", d: "Contrat de construction, garantie décennale, dommages-ouvrage." },
    ],
    /* ⚠ LA CONTRADICTION LA PLUS COÛTEUSE DU FICHIER ÉTAIT ICI.
       « Étude de sol et adaptation au terrain » figurait parmi les
       prestations COMPRISES. Or la mention de prix transmise par le
       client dit exactement l'inverse : « maison seule, modèle Pékin,
       hors terrain, HORS ADAPTATION, la maison uniquement ».

       L'adaptation au terrain est précisément le poste qui surprend un
       acquéreur en fin de parcours — plusieurs milliers d'euros selon la
       pente et la nature du sol. L'annoncer comme comprise à côté d'un
       prix qui l'exclut, c'est la promesse dont on se souvient à la
       signature. Elle passe donc du bon côté de la liste.

       Les prestations chiffrées sans source sont parties avec le reste :
       « terrasse couverte 12 m² », « pompe à chaleur et plancher
       chauffant », « volets roulants motorisés », « garage intégré »,
       « cuisine aménagée ». Aucune n'était confirmée pour un seul des
       onze modèles. Ne restent que les postes écrits par le client et
       ceux qu'impose le CCMI. */
    included: [
      "Salle de bain équipée",
      "Système de chauffage performant",
      "Conception conforme à la RE 2020",
      "Contrat CCMI et garantie de livraison à prix et délais convenus",
      "Garanties décennale, biennale et de parfait achèvement",
      "Assurance dommages-ouvrage",
    ],
    /* Le pendant obligatoire de la liste précédente. Taire les exclusions
       détruit la crédibilité d'un prix bas plus vite que tout le reste.
       Les libellés reprennent ceux du flux Vitahome (champ `mention`)
       et la mention de prix du client. */
    excluded: [
      "Le terrain",
      "L'adaptation au terrain et l'étude de sol",
      "Les frais de notaire",
      "Les taxes d'aménagement et de raccordement",
      "Les VRD (voirie et réseaux divers)",
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

  /* ════ COMPARATIF ════
     ⚠ CE TABLEAU SE RETOURNAIT CONTRE LE CLIENT. Il opposait
     « 1 maison, 2 déclinaisons » à « 20 à 60 modèles » chez les
     concurrents, et faisait du catalogue restreint l'argument. Le client
     a désormais onze modèles : l'argument devenait une faiblesse, et le
     visiteur qui comptait les modèles sur le site voyait la
     contradiction avant nous.

     La démonstration tient toujours, mais elle change de pivot : ce
     n'est plus le NOMBRE de modèles qui fait le prix, c'est le fait que
     chacun soit optimisé poste par poste et livré avec ses arbitrages
     déjà faits. C'est exactement ce que dit la nouvelle parole du
     client (« optimisés à l'essentiel jusqu'au dernier mètre carré »,
     « les bons choix déjà faits »).

     ⚠ « Aucune option » a disparu aussi : le client annonce maintenant
     « personnalisation possible ». Les deux ne pouvaient pas coexister
     sur le même site. */
  compare: {
    title: "Pourquoi c'est moins cher",
    intro:
      "Pas parce que la maison est moins bien construite — les matériaux et les garanties sont les mêmes. Parce qu'un plan optimisé jusqu'au dernier mètre carré, dont les arbitrages sont déjà faits, ne coûte pas la même chose à concevoir, à chiffrer et à suivre.",
    rows: [
      { poste: "Conception des plans", essensya: "Optimisée poste par poste", classique: "Adaptée au cas par cas", gain: true },
      { poste: "Mètres carrés perdus", essensya: "Aucun dégagement inutile", classique: "Couloirs et recoins", gain: true },
      { poste: "Choix à arbitrer", essensya: "L'essentiel déjà sélectionné", classique: "150 à 400 références", gain: true },
      { poste: "Personnalisation", essensya: "Possible, sur une base tenue", classique: "Illimitée, et facturée", gain: true },
      { poste: "Cuisine aménagée", essensya: "Comprise", classique: "En supplément", gain: true },
      { poste: "Terrasse couverte", essensya: "Comprise", classique: "En supplément", gain: true },
      { poste: "Garanties CCMI", essensya: "Toutes", classique: "Toutes" },
      { poste: "Conformité RE 2020", essensya: "Oui", classique: "Oui" },
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

  /* ⚠ Le parcours supposait qu'il n'y avait rien à choisir : « un seul
     plan à comprendre », « je choisis 2 ou 3 chambres, c'est le seul
     arbitrage ». Avec une gamme et une personnalisation possible, les
     deux étapes étaient fausses. Elles disent maintenant ce qui se passe
     vraiment, sans promettre de délai que personne n'a vérifié. */
  steps: [
    { num: "01", title: "Je choisis mon modèle", text: "Des plans déjà optimisés, à comparer entre eux. Chacun affiche ce qu'il comprend." },
    { num: "02", title: "Je trouve mon terrain", text: "Nos agences ont déjà repéré les parcelles compatibles de votre secteur." },
    { num: "03", title: "Je personnalise l'essentiel", text: "Les grands arbitrages sont déjà faits. Il reste à ajuster ce qui vous ressemble." },
    { num: "04", title: "Je construis", text: "Un chantier maîtrisé, des garanties complètes, une maison livrée au prix convenu." },
  ],

  /* ⚠ Agences provisoires, calées sur la zone réelle du flux Vitahome
     (Charente-Maritime, Deux-Sèvres). Le flux ne contient qu'une agence
     de démonstration : la liste réelle est à obtenir du client. */
  /* ⚠ LES CINQ AGENCES RÉELLES, transmises par le client le 17/09/2026.
     Adresses, téléphones, e-mail et horaires : mot pour mot. Coordonnées :
     Base Adresse Nationale, correspondance au numéro — pas de position
     approchée à l'œil.

     Ce bloc n'est PAS ce que le site affiche : les agences vivent dans le
     back-office, et cette constante n'est qu'un repli, appliqué seulement
     si la liste enregistrée est VIDE. Elle sert aussi de source au bouton
     « reprendre les agences du code », qui n'apparaît que dans ce cas.

     Elle contenait jusqu'ici une agence de démonstration sans adresse.
     C'était cohérent tant qu'on n'avait rien de vrai ; ça ne l'est plus,
     et un repli qui restaure une fiction est un piège pour le jour où
     quelqu'un vide la liste par erreur.

     ⚠ `description` est vide, comme dans les fiches saisies par le
     client : on n'écrit pas sa prose commerciale à sa place. Les cartes
     d'agence s'affichent donc sans texte de présentation — à lui de les
     remplir depuis le back-office. */
  agencies: [
    {
      id: "agence-de-canejan",
      name: "Agence de Canéjan",
      zone: "Gironde",
      address: "11 chemin de la House – 33610 CANÉJAN",
      phone: "06 17 29 78 03",
      email: "accueil@essensya.fr",
      hours: "Lundi au vendredi – 9h à 12h et 14h à 18h – Sur rdv le samedi",
      lat: 44.750411,
      lng: -0.641614,
      image: SANS_PHOTO,
      cities: ["Canéjan"],
      description: "",
    },
    {
      id: "agence-de-parentis",
      name: "Agence de Parentis",
      zone: "Landes",
      address: "242 Rue de Chatry – 40160 PARENTIS EN BORN",
      phone: "06 28 71 22 40",
      email: "accueil@essensya.fr",
      hours: "Lundi au vendredi – 9h à 12h et 14h à 18h – Sur rdv le samedi",
      lat: 44.348739,
      lng: -1.068182,
      image: SANS_PHOTO,
      cities: ["Parentis-en-Born"],
      description: "",
    },
    {
      id: "agence-de-saint-vincent-de-tyrosse",
      name: "Agence de Saint-Vincent-de-Tyrosse",
      zone: "Landes",
      address: "1 impasse du Sablar – 40230 SAINT VINCENT DE TYROSSE",
      phone: "06 74 62 16 73",
      email: "accueil@essensya.fr",
      hours: "Lundi au vendredi – 9h à 12h et 14h à 18h – Sur rdv le samedi",
      lat: 43.663271,
      lng: -1.292217,
      image: SANS_PHOTO,
      cities: ["Saint-Vincent-de-Tyrosse"],
      description: "",
    },
    {
      id: "agence-de-tartas",
      name: "Agence de Tartas",
      zone: "Landes",
      address: "90 place du Luc – 40400 TARTAS",
      phone: "06 77 95 57 76",
      email: "accueil@essensya.fr",
      hours: "Lundi au vendredi – 9h à 12h et 14h à 18h – Sur rdv le samedi",
      lat: 43.834425,
      lng: -0.812175,
      image: SANS_PHOTO,
      cities: ["Tartas"],
      description: "",
    },
    {
      id: "agence-de-hagetmau",
      name: "Agence de Hagetmau",
      zone: "Landes",
      address: "141 bis rue Carnot – 40700 HAGETMAU",
      phone: "06 14 65 11 59",
      email: "accueil@essensya.fr",
      hours: "Lundi au vendredi – 9h à 12h et 14h à 18h – Sur rdv le samedi",
      lat: 43.654943,
      lng: -0.592800,
      image: SANS_PHOTO,
      cities: ["Hagetmau"],
      description: "",
    },
  ],

  /* ⚠ TEXTES DU CLIENT, MOT POUR MOT. Trois d'entre eux apportent des
     faits que le site ne connaissait pas, et qu'il faut répercuter
     ailleurs :
       · « 40 ans d'expérience au sein du groupe CIMI » — première
         mention d'un groupe. À reprendre dans les mentions légales dès
         que la raison sociale sera connue ;
       · « 5 agences dans les Landes ET LA GIRONDE » — le site n'en
         connaît qu'une, et son secteur s'arrêtait aux Landes. Les vraies
         implantations restent à obtenir : voir la note du fichier sur
         les agences provisoires ;
       · « les 10 garanties du CCMI » — chiffre repris tel quel. */
  trust: [
    { icon: "shield", title: "Contrat CCMI", text: "Le cadre légal le plus protecteur pour faire construire." },
    { icon: "ruler", title: "Constructeur-concepteur", text: "La maison est conçue, chiffrée et construite par nos équipes. 40 ans d'expérience au sein du groupe CIMI." },
    { icon: "pin", title: "Agences locales", text: "5 agences dans les Landes et la Gironde pour un interlocuteur proche de votre terrain, du premier jour à la livraison." },
    { icon: "key", title: "Livraison garantie", text: "Les 10 garanties du CCMI dont l'assurance dommages-ouvrage." },
  ],

  concept: {
    manifesto:
      "Le marché de la construction pousse à l'infini les options et les suppléments — et fait payer cette complexité au client. Nous avons pris le chemin inverse : des plans dessinés obsessionnellement, optimisés jusqu'au dernier mètre carré, au prix annoncé dès le premier jour. Parce qu'une maison bien pensée n'a pas besoin d'être repensée par chaque client.",
    /* ⚠ CES CHIFFRES ÉTAIENT FAUX, ET C'EST LE PIRE ENDROIT POUR L'ÊTRE :
       un bandeau de statistiques se lit comme une preuve. Il annonçait
       « 1 maison, pas trente », « 2 déclinaisons », « 0 option » — trois
       affirmations que la gamme dément — et « 48 h pour un chiffrage
       complet », un délai inventé pour la maquette que personne n'a
       jamais engagé.

       Les quatre qui les remplacent sont sourcés : le nombre de modèles
       vient du catalogue, le prix du client, la RE 2020 et le CCMI de sa
       propre copie. Aucun n'est une promesse de délai. */
    figures: [
      [String(MODELES.length), "modèles au catalogue"],
      [`${new Intl.NumberFormat("fr-FR").format(REEL.prixEntree)} €`, "le prix d'entrée de gamme"],
      ["RE 2020", "respectée sur chaque chantier"],
      ["CCMI", "et toutes ses garanties"],
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
      title: `Nos maisons à prix de lancement`,
      subtitle: `Pour l'ouverture de nos agences, une sélection de nos modèles est proposée à un prix de lancement sur une sélection de terrains.`,
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

/**
 * Prix d'appel du site.
 *
 * ⚠ IL VENAIT DES DÉCLINAISONS FICTIVES, ET C'ÉTAIT LE DÉFAUT LE PLUS
 * COÛTEUX DU DÉPÔT. `Math.min(...VERSIONS)` rendait 94 900 € — le prix
 * d'une maison inventée pour la maquette — alors que la page d'accueil
 * et la page agences annoncent le prix réel donné par le client,
 * 78 000 €. Le site affichait donc DEUX prix d'appel différents, à un
 * clic l'un de l'autre, sur une trentaine de pages : fiches d'agence,
 * fiches d'annonce, /maisons, /concept, /contact, les pages de zone, la
 * page 404, et jusque dans les métadonnées servies à Google.
 *
 * Sur un site de constructeur dont l'argument central EST le prix, deux
 * prix contradictoires ne sont pas une coquille : c'est l'argument qui
 * s'effondre, et un engagement commercial qui devient inopposable.
 *
 * La correction tient en une ligne parce que le défaut tenait en une
 * ligne. Corriger les trente appels aurait garanti d'en oublier un.
 */
export const PRICE_FROM = REEL.prixEntree;
