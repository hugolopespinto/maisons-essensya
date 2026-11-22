/* Construire_Landes.docx (livré le 01/11), les retours de Julien du 02/11
   et du 09/11, et sa réponse en appel du 10/11 (voir la maquette validée,
   artefact Mg4eyRfwPAFJL8B56qJwjC). Texte repris mot pour mot ; seules les
   fautes de frappe sont corrigées. */

export const TITRE = "Bâtir sa maison dans les Landes : l'essentiel avant de se lancer";

export const CHAPO =
  "Construire dans les Landes, c'est faire bâtir une maison neuve entre océan Atlantique et forêt de pins, sur un territoire dont les sols, la nappe phréatique et le risque feu de forêt demandent une vraie connaissance locale. Nous vous présentons les étapes, les règles locales, le budget, les styles de maisons et le rôle d'un constructeur implanté dans le département.";

export const MUET =
  "Vous souhaitez faire construire une maison individuelle dans le 40, de Capbreton à Biscarrosse, de Tosse à Mimizan, en passant par Labenne, Dax, Tartas, Mont-de-Marsan ou Hagetmau ? Nous vous guidons pas à pas.";

export const TERRITOIRE = {
  intro:
    "Les Landes offrent un **cadre de vie rare** en France : la côte atlantique, la plus grande forêt de pins maritimes d'Europe occidentale et des villes à taille humaine. On peut y vivre dans une maison avec jardin près de l'océan comme de l'arrière-pays.",
  blocs: [
    {
      titre: "Entre océan et forêt, un cadre de vie recherché",
      texte:
        "Sur la côte sud, de Labenne à Mimizan, les plages et les lacs attirent les familles comme les actifs en télétravail. À l'intérieur, autour de Castets, Pomarez, Saint-Sever ou Peyrehorade, le pays landais garde des parcelles plus vastes et un rythme calme, à quelques km des grands axes.",
    },
    {
      titre: "Un territoire dynamique",
      texte:
        "Le secteur de Dax, Saint-Vincent-de-Paul et Saugnac-et-Cambran accueille une population nouvelle, des services, des commerces et des emplois liés au thermalisme, au tourisme et à la filière bois. Cette dynamique soutient le marché immobilier et la valeur d'un habitat neuf sur le long terme.",
    },
  ],
};

/* Neuf étapes, confirmées par Julien le 02/11 et reformulées le 09/11. */
export const RUBAN: { titre: string; texte: string }[] = [
  { titre: "Le projet et le budget", texte: "Définir et finaliser son projet : l'enveloppe financière globale, le lieu de construction, le style de la maison." },
  { titre: "Le terrain", texte: "Recherche du terrain idéal, vérification des règles d'urbanisme et étude de sol." },
  { titre: "Les plans", texte: "Conception, agencement des pièces, sélection des finitions." },
  { titre: "Le contrat et les assurances", texte: "Signature de votre CCMI et début des garanties et assurances." },
  { titre: "Le permis de construire", texte: "Dépôt en mairie et instruction." },
  { titre: "Le gros œuvre", texte: "Tout ce qui assure la structure de la maison, des fondations à la toiture." },
  { titre: "Le second œuvre et les finitions", texte: "Isolation, réseaux, cloisons et revêtement des sols." },
  { titre: "Le suivi de chantier", texte: "Des visites régulières avec votre conducteur de travaux." },
  { titre: "La réception", texte: "Avec la réception de la maison, vous pouvez en profiter librement. Félicitations !" },
];

export const QUI_FAIT_QUOI =
  "Avec un constructeur de maisons individuelles comme Maisons ESSENSYA, un conseiller unique et son équipe vous accompagnent du premier rendez-vous à la remise des clés : ils coordonnent la conception, les démarches administratives, la gestion des travaux et le respect du planning. Vous bénéficiez d'un accompagnement complet sans piloter seul les corps de métier.";

export const TERRAIN = {
  intro:
    "Avant d'acheter, vérifiez trois points : la constructibilité, la viabilisation et la nature du sol. Ce sont eux qui déterminent si votre maison est réalisable, et à quel coût.",
  points: [
    {
      titre: "La parcelle est-elle constructible ?",
      texte:
        "Consultez le plan local d'urbanisme (PLU ou PLUi) en mairie et demandez un certificat d'urbanisme. Il indique la zone, les règles de hauteur, d'implantation, d'aspect extérieur et les éventuelles servitudes. Une annonce qui affiche « à bâtir » ne dispense pas de cette vérification.",
    },
    {
      titre: "Est-elle viabilisée ?",
      texte:
        "Un lot viabilisé est raccordé ou raccordable à l'eau, à l'électricité, au téléphone et, si possible, au tout-à-l'égout. En lotissement, c'est généralement fait ; en diffus, c'est à votre charge et doit entrer dans l'enveloppe. Maisons ESSENSYA vous accompagne dans votre recherche foncière et a sélectionné [des terrains constructibles dans les Landes](/annonces?type=terrain).",
    },
    {
      titre: "Pourquoi analyser le sol ?",
      texte:
        "Depuis la loi ELAN, une étude géotechnique est exigée lors de la vente d'une parcelle située en zone d'aléa argile moyen ou fort. Même ailleurs, ce diagnostic reste le meilleur moyen de dimensionner les fondations et d'éviter les mauvaises surprises.",
    },
  ],
  offre:
    "Un constructeur local connaît souvent des lots disponibles dans les communes du secteur et peut proposer une [offre couplée terrain + maison](/annonces?type=terrain-maison). N'hésitez pas à demander les opportunités suivies par l'agence, ainsi que des exemples de maisons déjà réalisées à proximité.",
};

export const COUPE_PARTS: { titre: string; texte: string }[] = [
  {
    titre: "Les sols sableux",
    texte:
      "Le sable landais est drainant mais peu cohésif. Le diagnostic géotechnique guide le type de fondations (semelles adaptées, radier si nécessaire), et notre expertise permet d'ajuster les techniques à chaque parcelle, au meilleur coût.",
  },
  {
    titre: "Le risque feu de forêt",
    texte:
      "Près des massifs boisés, le plan de prévention des risques incendie de forêt (PPRIF) et les obligations légales de débroussaillement s'appliquent selon la localisation. Implantation, distances, matériaux de façade et entretien des abords sont intégrés dès les plans.",
  },
  {
    titre: "La nappe phréatique",
    texte:
      "Dans certains secteurs, la nappe est proche de la surface en hiver. Le niveau du plancher, le vide sanitaire et la gestion des eaux pluviales sont alors adaptés pour garder un intérieur sain et un bon confort.",
  },
  {
    titre: "L'assainissement",
    texte:
      "Sans tout-à-l'égout, un assainissement non collectif est obligatoire et contrôlé par le SPANC. Tout dépend alors de la perméabilité du sol et de la nappe. L'étude d'assainissement se prévoit avant le dépôt du dossier en mairie. Chez Maisons ESSENSYA nous nous en occupons pour nos clients.",
  },
];

export const BUDGET = [
  ["Poste", "Ce qu'il comprend", "Ce qui fait varier le coût"],
  ["Foncier", "Achat de la parcelle, frais de notaire, bornage", "Proximité de l'océan, ville, surface"],
  ["Maison", "Tarif fixé dans le CCMI", "Surface en m², matériaux, finitions, gamme, nature du sol"],
  [
    "Frais annexes",
    "Viabilisation, taxe d'aménagement, raccordements, finitions",
    "Assainissement, terrasse, clôtures, niveau de finitions",
  ],
];

export const AIDES: { texte: string }[] = [
  { texte: "**[Prêt à taux zéro (PTZ)](https://www.service-public.gouv.fr/particuliers/vosdroits/F1986)** : réservé aux primo-accédants sous conditions de ressources et de zone." },
  { texte: "**[Prêt Action Logement](https://www.actionlogement.fr/le-pret-accession)**, pour les salariés d'entreprises éligibles." },
  { texte: "Prêt d'accession sociale (PAS), selon vos revenus." },
  { texte: "Aides locales éventuelles, à vérifier auprès de votre commune ou de l'**[ADIL des Landes](https://www.anil.org/adil-40/)**, structure d'information indépendante." },
];

export const STYLES: { titre: string; texte: string }[] = [
  {
    titre: "L'architecture landaise traditionnelle",
    texte:
      "La maison landaise traditionnelle reprend les codes de l'airial : toiture à faible pente en tuiles canal, colombages, avant-toit protecteur. Cet habitat s'intègre naturellement dans les villages.",
  },
  {
    titre: "La maison contemporaine",
    texte:
      "La maison contemporaine joue sur les volumes, les grandes baies vitrées et parfois le toit plat. Suite parentale, double hauteur, terrasse ouverte sur le jardin, pièces de vie lumineuses : la conception s'adapte à votre mode de vie.",
  },
  {
    titre: "Le bois et l'intégration au paysage",
    texte:
      "Le bois, matériau emblématique de la forêt landaise, se décline en bardage ou en ossature. Associé à une orientation soignée, il facilite le respect de la RE2020 et une intégration discrète dans le paysage.",
  },
];

export const LOCAL = {
  intro:
    "Un constructeur local apporte deux atouts : la protection du contrat CCMI et une connaissance fine du sol, des villes, des administrations et des PLU. C'est le critère décisif pour comparer le sérieux des constructeurs de maisons individuelles du département.",
  ccmi:
    "Le contrat de construction de maison individuelle (CCMI), encadré par la loi du 19 décembre 1990, fixe un tarif ferme et un délai. Il comprend la garantie de livraison à prix et délais convenus, en plus des garanties de parfait achèvement, biennale et décennale.",
  ccmiSigner: "Vérifiez que le contrat CCMI mentionne l'attestation de cette garantie.",
  ccmiSuite:
    "L'assurance Dommages-Ouvrage est également incluse dans le contrat et souscrite par Maisons ESSENSYA, à votre nom.",
  connaissance:
    "Des agences implantées dans les Landes, à Dax comme sur la côte, connaissent les PLU, les services instructeurs et les contraintes de chaque zone, et travaillent avec des artisans locaux. Cela fluidifie les démarches et réduit les risques de refus. Les conseillers habitat de nos 4 agences landaises sont à vos côtés pour [vous guider à chaque étape](/etapes-de-construction).",
  comparer: [
    "Vérifier les assurances, dont la dommages-ouvrage.",
    "Demander à voir des réalisations et lire les avis de clients.",
    "Comparer les notices descriptives à prestations équivalentes.",
    "S'assurer de la conformité RE2020 et de la qualité des matériaux.",
  ],
};

export const FAQ: { q: string; a: string }[] = [
  {
    q: "Combien de temps faut-il pour construire ?",
    a: "Après la partie administrative vient la construction de la maison. Au total comptez environ 12 à 18 mois entre la signature du contrat de construction et la remise des clefs. Le délai total dépend notamment de la complexité des plans et de la météo.",
  },
  {
    q: "Peut-on construire près de la forêt ?",
    a: "Oui, le plus souvent, à condition de respecter le PLU, le plan de prévention incendie s'il existe et les obligations de débroussaillement. Implantation et matériaux sont adaptés à la zone.",
  },
  {
    q: "Faut-il un architecte ?",
    a: "Le recours à un architecte est obligatoire au-delà de 150 m² de surface de plancher pour un particulier. En dessous, le professionnel peut réaliser les plans dans le cadre du CCMI.",
  },
  {
    q: "La RE2020 s'applique-t-elle à mon logement ?",
    a: "Oui, tout logement neuf dont le dossier est déposé depuis le 1er janvier 2022 doit respecter la RE2020, qui vise sobriété énergétique, faible empreinte carbone et confort d'été.",
  },
  {
    q: "Quel assainissement sans tout-à-l'égout ?",
    a: "Une filière individuelle est installée après analyse du sol, puis validée par le SPANC.",
  },
  {
    q: "Peut-on bâtir sur un sol sableux ?",
    a: "Oui. Le sable landais impose simplement des fondations dimensionnées d'après le diagnostic géotechnique, une situation courante pour nos clients autour de Dax.",
  },
];
