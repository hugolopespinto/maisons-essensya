/* Construire_Gironde.docx, livré par le client le 09/11. Texte repris mot
   pour mot ; seules les fautes de frappe sont corrigées. Même gabarit que
   /construire/landes (voir la maquette validée, artefact
   Mg4eyRfwPAFJL8B56qJwjC, onglet #gironde) : simplifications volontaires
   faute de matière (pas de schéma « coupe de terrain », pas de photos de
   paysage) ; carte limitée à l'agence de Canéjan et aux villes du secteur. */

export const TITRE = "Constructeur de maisons en Gironde : guide complet pour réussir votre projet en 2026";

export const CHAPO =
  "Faire construire une maison en Gironde suppose de réunir trois éléments : un terrain constructible adapté, un budget maîtrisé et un professionnel encadré par un contrat protecteur. Ce guide détaille les coûts, les étapes, les contraintes locales et les critères pour choisir un constructeur.";

export const TERRITOIRE = {
  intro:
    "La Gironde attire les porteurs de projet grâce à la diversité de ses territoires et à un marché de l'emploi soutenu autour de Bordeaux. Faire construire sa maison permet d'obtenir un logement neuf conforme aux normes actuelles, adapté à vos besoins et moins coûteux à l'usage qu'un bien ancien à rénover.",
  blocs: [
    {
      titre: "Un cadre de vie privilégié entre océan et vignobles",
      texte:
        "Le département offre un cadre de vie varié : littoral de la Côte d'Argent et bassin d'Arcachon à l'ouest, vignobles du Médoc, de l'Entre-deux-Mers et du Libournais, forêt des Landes de Gascogne au sud. Cette localisation conditionne directement le coût du foncier et les contraintes d'urbanisme.",
    },
    {
      titre: "Le dynamisme économique de la métropole bordelaise",
      texte:
        "L'agglomération concentre une grande partie des emplois de la région, ce qui entretient une forte demande de logements. Les villes de première et deuxième couronne, comme Saint-Médard-en-Jalles, Mérignac ou Pessac, combinent proximité de la ville et coût du foncier plus élevé.",
    },
  ],
};

export const BUDGET_INTRO = {
  titre: "Combien coûte la construction d'une maison en Gironde ?",
  texte:
    "Le coût dépend avant tout de trois postes : le terrain, la maison elle-même (surface, niveau de finition, matériaux) et les frais annexes. Le foncier pèse souvent davantage que la construction dans les zones proches de la métropole et du littoral.",
  estimation:
    "Pour estimer l'enveloppe, il est préférable de rencontrer un conseiller habitat qui vous proposera une estimation en fonction de vos besoins. À titre d'exemples :",
};

export const SECTEURS: { titre: string; texte: string }[] = [
  {
    titre: "Agglomération de Bordeaux et bassin d'Arcachon",
    texte: "Parcelles plus rares, plus chères et surfaces réduites. Coût d'un terrain constructible entre 300 et 600 € du m².",
  },
  {
    titre: "Médoc, Libournais, Bazadais, Entre-deux-Mers et Sud Gironde",
    texte: "Foncier plus abordable, superficies plus grandes. Coût d'un terrain constructible entre 50 et 300 € du m².",
  },
];

export const PRIX_TERRAIN =
  "Un terrain constructible se compare au m², à situation équivalente. Il faut vérifier s'il est viabilisé (eau, électricité, assainissement, télécom), sa constructibilité au plan local d'urbanisme (PLU), et tenir compte de sa forme : une parcelle étroite ou en pente limite la construction possible et peut renchérir les travaux.";

export const FRAIS_ANNEXES: string[] = [
  "les frais de notaire sur l'achat du terrain uniquement ;",
  "la taxe d'aménagement, calculée sur la superficie créée ;",
  "les raccordements et la viabilisation si la parcelle ne l'est pas ;",
  "l'étude de sol, l'assurance dommages-ouvrage et les aménagements extérieurs (clôture, allée, terrasse).",
];

export const OFFRE = {
  intro:
    "Une offre terrain + maison associe une parcelle et un modèle de maison adapté, avec un tarif d'ensemble. C'est une solution pratique pour évaluer plus rapidement une enveloppe financière globale et découvrir des projets. Ces derniers ne sont pas figés et d'autres modèles de maisons peuvent être proposés.",
  texte:
    "Avant de vous engager, vérifiez que le terrain et la maison font l'objet de deux contrats distincts, que le modèle de maison proposé respecte le règlement du lotissement ou du PLU, et que le tarif intègre bien les frais de raccordement. Les deux contrats doivent comporter des conditions suspensives liées à l'obtention du prêt et du permis : si l'une échoue, vous récupérez les sommes versées. Pour voir les opportunités près de chez vous, consultez [les annonces sélectionnées par les conseillers habitat de Maisons ESSENSYA](/annonces?type=terrain-maison), puis comparez-les à superficie équivalente.",
};

export const STYLES_INTRO =
  "Le [type de maison](/maisons) dépend de vos envies, de votre terrain et de votre mode de vie. Trois approches dominent le marché girondin : le modèle standard, le sur-mesure et les maisons à faible consommation d'énergie.";

export const STYLES: { titre: string; texte: string }[] = [
  {
    titre: "Maison individuelle sur-mesure ou sur catalogue ?",
    texte:
      "Un modèle de maison standard part de plans déjà étudiés, déclinés dans une gamme de tailles et de configurations (deux, trois ou quatre chambres). Il offre une meilleure visibilité sur le coût et le délai. Le sur-mesure part d'une feuille blanche : il s'adapte mieux aux terrains atypiques, mais demande plus de temps d'étude et un investissement plus élevé. Entre les deux, Maisons ESSENSYA propose de personnaliser un modèle de maison existant.",
  },
  {
    titre: "Les avantages des maisons contemporaines en Gironde",
    texte:
      "Une maison contemporaine privilégie les volumes simples, les belles ouvertures et une toiture à faible pente. Associée à une conception bien étudiée en amont (orientation sud des pièces principales, protections solaires, isolation renforcée), elle limite la surchauffe l'été et les besoins de chauffage l'hiver. Une maison contemporaine de plain-pied, avec de larges baies, convient bien à de nombreuses parcelles quel que soit le secteur géographique. Le PLU est, quant à lui, toujours vérifié par les conseillers habitat de Maisons ESSENSYA avant de vous faire une proposition.",
  },
  {
    titre: "Focus sur les modèles de maisons traditionnelles régionales",
    texte:
      "Les modèles de maisons traditionnelles du Sud-Ouest reprennent les codes locaux : toiture en tuiles canal, enduits clairs, parfois inspiration landaise ou échoppe bordelaise. Ces modèles s'intègrent facilement dans les villages où le règlement d'urbanisme protège l'habitat existant. Une maison plain-pied de style traditionnel convient aux ménages qui veulent éviter les escaliers.",
  },
];

export const ETAPES_INTRO =
  "Un projet de construction suit un ordre précis : terrain, conception, autorisation, chantier, réception. Savoir à quelle étape vous vous situez permet d'anticiper les décisions et les paiements. Voici un récapitulatif des principales phases d'une construction.";

export const ETAPES_RUBAN: { titre: string; texte: string }[] = [
  { titre: "Recherche du terrain et étude de sol", texte: "Le choix du terrain conditionne tout le projet. Localement, l'étude de sol est indispensable dans les zones exposées au retrait-gonflement des argiles." },
  { titre: "Conception des plans et permis de construire", texte: "Implantation, façades, plans de chaque niveau, puis dépôt du dossier en mairie par Maisons ESSENSYA." },
  { titre: "Suivi du chantier", texte: "Le maître d'œuvre coordonne les corps de métier : fondations, hors d'eau, hors d'air." },
  { titre: "Réception des travaux", texte: "Vous acceptez la maison, avec ou sans réserves, avant la remise des clés. Les garanties constructeur prennent alors effet." },
];

export const ETAPES_ACCOMPAGNEMENT =
  "Pour vous, les professionnels de Maisons ESSENSYA consultent le PLU en mairie, demandent un certificat d'urbanisme et vérifient les servitudes. Le recours à un architecte est obligatoire dès 150 m² de surface de plancher. En cas de nécessité lors de la réception, vous pouvez vous faire accompagner par un professionnel indépendant.";

export const GARANTIES_INTRO =
  "Le contrat de construction de maison individuelle (CCMI) est encadré par le Code de la construction et de l'habitation. Il impose plusieurs garanties qui protègent le maître d'ouvrage, c'est-à-dire le client, tout au long de son projet.";

export const GARANTIE_LIVRAISON = {
  titre: "La garantie de livraison à prix et délais convenus",
  texte: "La garantie de livraison assure que la maison sera achevée au prix et dans les délais prévus au contrat, même en cas de défaillance du constructeur.",
  signer: "Demandez l'attestation du garant : c'est le critère décisif pour distinguer un CCMI fiable.",
};

export const GARANTIE_DECENNALE = {
  titre: "La garantie décennale et la dommages-ouvrage",
  texte:
    "La garantie décennale couvre les dommages qui compromettent la solidité de l'ouvrage ou le rendent impropre à son usage. L'assurance dommages-ouvrage, obligatoire pour le maître d'ouvrage, permet d'être indemnisé rapidement sans attendre la recherche des responsabilités. S'y ajoutent la garantie de parfait achèvement, qui oblige à reprendre les réserves et défauts signalés après la réception, et la garantie biennale de bon fonctionnement des équipements dissociables (volets, robinetterie, portes intérieures).",
};

export const FINANCEMENT_INTRO =
  "Le financement repose généralement sur un prêt immobilier, votre apport et d'éventuelles aides. Les fonds sont débloqués en fonction de l'avancement du chantier, selon un échéancier fixé par le contrat.";

export const SIMULATION =
  "Votre capacité d'emprunt dépend de vos revenus, de vos charges et du taux d'endettement retenu par les banques. [Faites une simulation](/simulateur-de-financement) avant de chercher un terrain : elle fixe l'enveloppe maximale. Vous pouvez également faire appel à un courtier pour obtenir les offres de plusieurs établissements bancaires.";

export const AIDES: { texte: string }[] = [
  { texte: "**[Prêt à taux zéro (PTZ)](https://www.service-public.gouv.fr/particuliers/vosdroits/F10871)**, le **[prêt Action Logement](https://www.actionlogement.fr/le-pret-accession)** ou certains prêts aidés peuvent compléter le financement, sous conditions de ressources et de zone." },
  { texte: "Les règles évoluent régulièrement : vérifiez votre éligibilité sur le site de l'ANIL ou auprès de l'**[ADIL de Gironde](https://www.anil.org/adil-33/)**, structure d'information indépendante." },
];

export const RE2020_INTRO =
  "Toute maison neuve doit respecter la RE2020, qui fixe des exigences de performance énergétique, d'impact carbone et de confort d'été. Cette réglementation, pensée pour un habitat sain et économe, influence les matériaux, le chauffage et l'isolation.";

export const BASSE_CONSO =
  "Une maison basse consommation réduit vos factures et améliore le bien-être au quotidien. Les maisons neuves performantes associent souvent pompe à chaleur, ventilation efficace et menuiseries isolantes. Une bonne qualité d'exécution compte autant que les équipements.";

export const SOLS_ARGILEUX = {
  texte:
    "Une partie du territoire girondin est exposée au retrait-gonflement des argiles, cartographié par le BRGM sur le site [Géorisques](https://www.georisques.gouv.fr/). Dans ces zones, la loi ELAN impose une étude géotechnique préalable (G1) lors de la vente d'un terrain constructible, puis une étude de conception (G2) pour dimensionner les fondations et éviter les fissures.",
  signer:
    "Concrètement, une parcelle en aléa fort peut imposer des fondations plus profondes, un vide sanitaire ou une gestion des eaux pluviales éloignée des murs : ce surcoût doit figurer au contrat dès la signature, et non apparaître en cours de chantier.",
};

export const CHOISIR_INTRO =
  "Un bon constructeur de maisons individuelles signe un CCMI, fournit ses attestations décennale et de garantie de livraison, et connaît les règles d'urbanisme locales. N'hésitez pas à comparer plusieurs offres sur une base identique : surface, prestations incluses et exclues.";

export const CHOISIR: { titre: string; texte: string }[] = [
  {
    titre: "Une expertise des règles d'urbanisme locales",
    texte: "Une entreprise implantée dans le département connaît les PLU locaux, les contraintes des sols et les exigences des lotissements. Cette connaissance facilite l'obtention de l'autorisation et limite les mauvaises surprises en cours de chantier.",
  },
  {
    titre: "Un accompagnement de la conception à la livraison",
    texte: "Comparez les services inclus et interrogez votre conseiller habitat si vous avez la moindre question. Recherche foncière, conception des plans, aide au financement, conducteur de travaux unique : chez Maisons ESSENSYA nous sommes aux côtés de nos clients de A à Z.",
  },
  {
    titre: "Évaluer les réalisations et la satisfaction des clients",
    texte: "Demandez à voir une réalisation récente proche de votre projet. Les portes ouvertes organisées par certains constructeurs permettent de voir une maison achevée : la qualité se juge sur place, aux finitions. Consultez aussi les avis en ligne et les enquêtes de satisfaction des clients.",
  },
];

export const FAQ: { q: string; a?: string; liste?: string[] }[] = [
  {
    q: "Quel est le délai moyen pour construire une maison ?",
    a: "La construction d'une maison demande plusieurs mois de démarches administratives (financement, plans, autorisation d'urbanisme) avant le démarrage, puis la durée du chantier fixée par le contrat. Le délai varie selon la taille de la maison et la météo. Comptez néanmoins entre 12 et 18 mois.",
  },
  {
    q: "Faut-il prévoir une étude de sol spécifique ?",
    a: "Oui en zone d'aléa argile moyen ou fort, où l'étude G1 incombe au vendeur et l'étude G2 au maître d'ouvrage. Hors de ces zones, elle peut être vivement conseillée.",
  },
  {
    q: "Quelles erreurs éviter avant de signer ?",
    a: "Les litiges naissent le plus souvent d'un engagement pris trop vite. Points de vigilance :",
    liste: [
      "acheter une parcelle sans certificat d'urbanisme ni étude de sol ;",
      "signer un contrat qui n'est pas un CCMI, ou sans attestation de garantie de livraison ;",
      "comparer des offres dont la notice descriptive n'inclut pas les mêmes prestations ;",
      "oublier les frais de raccordement, la taxe d'aménagement ou les aménagements extérieurs.",
    ],
  },
  {
    q: "Quelles sont les zones les plus prisées pour construire en Gironde ?",
    a: "Les communes de la première couronne de Bordeaux Métropole, le bassin d'Arcachon et les communes desservies par les grands axes vers Bordeaux sont les plus recherchées. Le Libournais, le Médoc et le Langonnais offrent davantage de foncier disponible à budget équivalent.",
  },
];

export const CTA = {
  texte:
    "Pour avancer, préparez votre budget et définissez la zone recherchée. L'étape suivante consiste à contacter un constructeur de maisons, ou plusieurs pour comparer : une première rencontre permet de valider la faisabilité de votre projet avant tout engagement.",
  etude: "Chez Maisons ESSENSYA nous proposons une étude gratuite : analyse du terrain et de votre projet, choix du modèle, estimation du coût.",
  catalogues: "Consultez les catalogues de modèles de maisons, par gamme, taille et nombre de chambres, du traditionnel à la maison contemporaine.",
};
