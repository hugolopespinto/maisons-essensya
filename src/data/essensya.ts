import type { EssensyaData } from "@/types";

/* Contenu éditorial du site. Destiné à migrer vers un CMS (Sanity/Payload)
   sans toucher aux composants : le contrat de types reste identique. */
export const ESSENSYA_DATA: EssensyaData = {
  models: [
    {
      id:"essen-01", index:"01", name:"Essen",
      tagline:"Pensée pour l'essentiel. Un plain-pied compact où chaque mètre carré travaille : volumes traversants, lumière naturelle, rangements intégrés.",
      philosophy:"Essen part d'une conviction : une maison n'a pas besoin d'être grande pour être généreuse. Elle a besoin d'être juste.",
      surface:92, bedrooms:3, priceFrom:168900,
      image:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1400&auto=format&fit=crop",
      heroImage:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1920&auto=format&fit=crop",
      alt:"Modèle Essen — maison contemporaine de plain-pied",
      gallery:[
        {src:"https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1920&auto=format&fit=crop",alt:"Séjour traversant du modèle Essen",caption:"Séjour traversant — 38 m²"},
        {src:"https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1400&auto=format&fit=crop",alt:"Cuisine ouverte du modèle Essen",caption:"Cuisine ouverte — plan de travail 3,20 m"},
        {src:"https://images.unsplash.com/photo-1600121848594-d8644e57abab?q=80&w=1200&auto=format&fit=crop",alt:"Détail matériaux du modèle Essen",caption:"Détail — bois clair, enduit minéral"}
      ],
      visite:[
        {cle:"arrivee",nav:"Arrivée",titre:"L'approche",
         texte:"Toiture monopente, façade enduite, menuiseries aluminium au nu extérieur. On arrive par le sud : la maison se donne d'un seul regard, sans rien cacher.",
         specs:["92 m²","3 chambres","plain-pied"],
         image:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1920&auto=format&fit=crop",
         alt:"Façade sud du modèle Essen à l'arrivée"},
        {cle:"sejour",nav:"Séjour",titre:"Le séjour traversant",
         texte:"38,4 m² ouverts sur deux orientations. La lumière entre à l'est le matin et repart à l'ouest le soir — on ne rallume qu'à la nuit tombée.",
         specs:["38,4 m²","traversant","double orientation"],
         image:"https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1920&auto=format&fit=crop",
         alt:"Séjour traversant du modèle Essen"},
        {cle:"cuisine",nav:"Cuisine",titre:"La cuisine ouverte",
         texte:"Un plan de travail de 3,20 m d'un seul tenant, dans le prolongement direct du séjour. Le cellier prend le relais des rangements, hors de vue.",
         specs:["plan 3,20 m","cellier 4,9 m²","ouverte"],
         image:"https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1400&auto=format&fit=crop",
         alt:"Cuisine ouverte du modèle Essen"},
        {cle:"matieres",nav:"Matières",titre:"Les matières",
         texte:"Bois clair et enduit minéral. Les finitions sont dessinées dans le plan, pas ajoutées après coup — c'est ce qui tient le prix.",
         specs:["bois clair","enduit minéral","alu au nu"],
         image:"https://images.unsplash.com/photo-1600121848594-d8644e57abab?q=80&w=1200&auto=format&fit=crop",
         alt:"Détail des matériaux du modèle Essen — bois clair et enduit minéral"},
        {cle:"volume",nav:"Volume",titre:"Le volume",
         texte:"Brique rectifiée, toiture bac acier isolée, pompe à chaleur air/eau. La sobriété n'est pas une économie, c'est un choix architectural.",
         specs:["RE2020","monopente","PAC air/eau"],
         image:"https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=1200&auto=format&fit=crop",
         alt:"Volume architectural du modèle Essen"}
      ],
      archText:"Un volume simple et précis : toiture monopente, façade enduite, menuiseries aluminium au nu extérieur. La sobriété n'est pas une économie, c'est un choix architectural.",
      archImage:"https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=1200&auto=format&fit=crop",
      materials:[["Structure","Brique rectifiée R+0"],["Toiture","Monopente bac acier isolé"],["Menuiseries","Aluminium double vitrage"],["Chauffage","Pompe à chaleur air/eau"],["Isolation","RE2020 — ITI renforcée"]],
      planImage:"https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1400&auto=format&fit=crop",
      rooms:[["Séjour / cuisine","38,4 m²"],["Chambre 1","12,1 m²"],["Chambre 2","10,8 m²"],["Chambre 3","10,2 m²"],["Salle de bain","6,3 m²"],["Cellier","4,9 m²"],["Entrée / dégagements","9,3 m²"]],
      features:[
        {t:"RE2020",d:"Conception conforme à la réglementation environnementale en vigueur."},
        {t:"Plain-pied",d:"Aucune marche, accessible dès la conception."},
        {t:"Traversant",d:"Double orientation du séjour, lumière du matin au soir."},
        {t:"Rangements intégrés",d:"Placards dessinés dans le plan, pas ajoutés après coup."},
        {t:"Garage en option",d:"Extension prévue dès la conception, sans reprendre le plan."},
        {t:"Terrain dès 350 m²",d:"Une emprise compacte compatible avec les parcelles courantes."}
      ],
      included:["Étude de sol et adaptation au terrain","Cuisine aménagée (hors électroménager)","Salle de bain équipée","Pompe à chaleur et plancher chauffant","Volets roulants motorisés","Garanties CCMI, décennale, parfait achèvement"]
    },
    {
      id:"alba-02", index:"02", name:"Alba",
      tagline:"La lumière avant tout. Une maison familiale à étage, orientée vers le sud, pensée pour les grandes tablées et les matins pressés.",
      philosophy:"Alba organise la vie de famille autour d'une évidence : en bas on se retrouve, en haut on se retire. Et partout, la lumière.",
      surface:104, bedrooms:4, priceFrom:189500,
      image:"https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=1400&auto=format&fit=crop",
      heroImage:"https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=1920&auto=format&fit=crop",
      alt:"Modèle Alba — maison familiale à étage",
      gallery:[
        {src:"https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1920&auto=format&fit=crop",alt:"Pièce de vie du modèle Alba",caption:"Pièce de vie — double hauteur partielle"},
        {src:"https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1400&auto=format&fit=crop",alt:"Salle de bain du modèle Alba",caption:"Salle d'eau parentale"},
        {src:"https://images.unsplash.com/photo-1600607687644-c7171b42498f?q=80&w=1200&auto=format&fit=crop",alt:"Chambre du modèle Alba",caption:"Chambre — orientation sud-est"}
      ],
      visite:[
        {cle:"arrivee",nav:"Arrivée",titre:"L'approche",
         texte:"Une façade claire, de grandes baies, un volume à étage compact. L'emprise au sol reste petite : ce qu'on ne prend pas au terrain, on le rend au jardin.",
         specs:["104 m²","4 chambres","R+1"],
         image:"https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=1920&auto=format&fit=crop",
         alt:"Façade du modèle Alba à l'arrivée"},
        {cle:"vie",nav:"Pièce de vie",titre:"La pièce de vie",
         texte:"42,6 m² avec une double hauteur partielle : le regard monte, la lumière descend. C'est la pièce des grandes tablées et des matins pressés.",
         specs:["42,6 m²","double hauteur","plein sud"],
         image:"https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1920&auto=format&fit=crop",
         alt:"Pièce de vie à double hauteur du modèle Alba"},
        {cle:"parentale",nav:"Parentale",titre:"La suite parentale",
         texte:"Chambre, salle d'eau et dressing au même niveau. 16,8 m² qui se referment sur eux-mêmes, à l'écart des chambres d'enfants.",
         specs:["16,8 m²","salle d'eau","dressing"],
         image:"https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1400&auto=format&fit=crop",
         alt:"Salle d'eau parentale du modèle Alba"},
        {cle:"chambres",nav:"Chambres",titre:"Les chambres",
         texte:"Orientation sud-est : on se réveille avec le jour et les pièces restent fraîches l'après-midi. Trois chambres d'enfants plus la parentale.",
         specs:["3 + 1 chambres","sud-est","à l'étage"],
         image:"https://images.unsplash.com/photo-1600607687644-c7171b42498f?q=80&w=1200&auto=format&fit=crop",
         alt:"Chambre orientée sud-est du modèle Alba"},
        {cle:"volume",nav:"Volume",titre:"Le volume",
         texte:"Brique rectifiée R+1, toiture deux pentes en tuile plate, combles renforcés. Une architecture contemporaine sans surenchère.",
         specs:["RE2020","tuile plate","garage intégré"],
         image:"https://images.unsplash.com/photo-1600585152915-d208bec867a1?q=80&w=1200&auto=format&fit=crop",
         alt:"Volume architectural du modèle Alba"}
      ],
      archText:"Un volume à étage compact et bien orienté : les pièces de vie captent le sud, les chambres respirent à l'étage. La façade claire et les grandes baies signent une architecture contemporaine sans surenchère.",
      archImage:"https://images.unsplash.com/photo-1600585152915-d208bec867a1?q=80&w=1200&auto=format&fit=crop",
      materials:[["Structure","Brique rectifiée R+1"],["Toiture","Deux pentes, tuile plate"],["Menuiseries","Aluminium double vitrage"],["Chauffage","Pompe à chaleur air/eau"],["Isolation","RE2020 — combles perdus renforcés"]],
      planImage:"https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1400&auto=format&fit=crop",
      rooms:[["Séjour / cuisine","42,6 m²"],["Chambre parentale + SDE","16,8 m²"],["Chambre 2","11,2 m²"],["Chambre 3","10,9 m²"],["Chambre 4","10,4 m²"],["Salle de bain","6,8 m²"],["Cellier / entrée","5,3 m²"]],
      features:[
        {t:"RE2020",d:"Conception conforme à la réglementation environnementale en vigueur."},
        {t:"Suite parentale",d:"Chambre, salle d'eau et dressing au même niveau."},
        {t:"4 chambres",d:"La famille qui grandit sans déménager."},
        {t:"Orientation étudiée",d:"Pièces de vie au sud, chambres à l'est."},
        {t:"Emprise compacte",d:"Un étage pour préserver le jardin."},
        {t:"Garage intégré",d:"Inclus dans le volume principal."}
      ],
      included:["Étude de sol et adaptation au terrain","Cuisine aménagée (hors électroménager)","Deux salles d'eau équipées","Pompe à chaleur et plancher chauffant","Volets roulants motorisés","Garanties CCMI, décennale, parfait achèvement"]
    },
    {
      id:"nova-03", index:"03", name:"Nova",
      tagline:"Compacte, jamais à l'étroit. Le premier achat intelligent : une conception dense et généreuse à la fois, au prix le plus juste de la collection.",
      philosophy:"Nova prouve qu'un budget serré n'oblige pas à un compromis sur l'architecture. Juste à une conception plus intelligente.",
      surface:78, bedrooms:2, priceFrom:142000,
      image:"https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1400&auto=format&fit=crop",
      heroImage:"https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1920&auto=format&fit=crop",
      alt:"Modèle Nova — maison compacte contemporaine",
      gallery:[
        {src:"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1920&auto=format&fit=crop",alt:"Séjour du modèle Nova",caption:"Séjour — 32 m² d'un seul tenant"},
        {src:"https://images.unsplash.com/photo-1600566752355-35792bedcfea?q=80&w=1400&auto=format&fit=crop",alt:"Cuisine du modèle Nova",caption:"Cuisine linéaire intégrée"},
        {src:"https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=1200&auto=format&fit=crop",alt:"Extérieur du modèle Nova",caption:"Terrasse couverte — prolongement du séjour"}
      ],
      visite:[
        {cle:"arrivee",nav:"Arrivée",titre:"L'approche",
         texte:"Un plain-pied compact, posé sans emphase. Compatible avec les parcelles dès 300 m² — celles qu'on trouve encore à un prix tenable.",
         specs:["78 m²","2 chambres","terrain dès 300 m²"],
         image:"https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1920&auto=format&fit=crop",
         alt:"Façade du modèle Nova à l'arrivée"},
        {cle:"sejour",nav:"Séjour",titre:"Le séjour",
         texte:"32,2 m² d'un seul tenant, sur toute la largeur de la maison. Aucun couloir ne vient prendre de la surface au passage.",
         specs:["32,2 m²","pleine largeur","zéro couloir"],
         image:"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1920&auto=format&fit=crop",
         alt:"Séjour d'un seul tenant du modèle Nova"},
        {cle:"cuisine",nav:"Cuisine",titre:"La cuisine linéaire",
         texte:"Intégrée au séjour, sans cloison. Une conception dense où 100 % de la surface est habitée, pas traversée.",
         specs:["linéaire","intégrée","cellier 4,2 m²"],
         image:"https://images.unsplash.com/photo-1600566752355-35792bedcfea?q=80&w=1400&auto=format&fit=crop",
         alt:"Cuisine linéaire intégrée du modèle Nova"},
        {cle:"terrasse",nav:"Terrasse",titre:"La terrasse couverte",
         texte:"12 m² de vie extérieure comprise dans la conception, pas vendue en option. Le prolongement direct du séjour, à l'abri.",
         specs:["12 m²","couverte","plain-pied"],
         image:"https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=1200&auto=format&fit=crop",
         alt:"Terrasse couverte du modèle Nova"},
        {cle:"volume",nav:"Volume",titre:"Le volume",
         texte:"Le plan le plus dense de la collection. Évolutif : l'extension de la chambre 3 est prévue au plan d'origine, pas improvisée plus tard.",
         specs:["RE2020","monopente","évolutive"],
         image:"https://images.unsplash.com/photo-1600121848594-d8644e57abab?q=80&w=1200&auto=format&fit=crop",
         alt:"Volume architectural du modèle Nova"}
      ],
      archText:"Le plan le plus dense de la collection : zéro couloir, zéro mètre carré perdu. Le séjour occupe toute la largeur de la maison et s'ouvre sur une terrasse couverte.",
      archImage:"https://images.unsplash.com/photo-1600121848594-d8644e57abab?q=80&w=1200&auto=format&fit=crop",
      materials:[["Structure","Brique rectifiée R+0"],["Toiture","Monopente bac acier isolé"],["Menuiseries","PVC/alu double vitrage"],["Chauffage","Pompe à chaleur air/air"],["Isolation","RE2020 — ITI standard renforcée"]],
      planImage:"https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1400&auto=format&fit=crop",
      rooms:[["Séjour / cuisine","32,2 m²"],["Chambre 1","11,8 m²"],["Chambre 2","10,6 m²"],["Salle de bain","5,4 m²"],["Cellier","4,2 m²"],["Entrée","3,8 m²"],["Terrasse couverte","12,0 m²"]],
      features:[
        {t:"RE2020",d:"Conception conforme à la réglementation environnementale en vigueur."},
        {t:"Zéro couloir",d:"Un plan dense : 100 % de la surface est habitée."},
        {t:"Terrasse couverte",d:"12 m² de vie extérieure incluse dans la conception."},
        {t:"Premier achat",d:"Le ticket d'entrée le plus juste de la collection."},
        {t:"Évolutive",d:"Extension chambre 3 prévue au plan d'origine."},
        {t:"Petites parcelles",d:"Compatible terrains dès 300 m²."}
      ],
      included:["Étude de sol et adaptation au terrain","Cuisine linéaire aménagée (hors électroménager)","Salle de bain équipée","Pompe à chaleur air/air","Terrasse couverte","Garanties CCMI, décennale, parfait achèvement"]
    }
  ],

  hero:{refId:"essen-01"},
  featured:{type:"model",refId:"alba-02",title:"Alba — 02",image:"https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1920&auto=format&fit=crop",alt:"Intérieur du modèle Alba",ctaLabel:"Découvrir ce modèle"},

  philosophy:[
    {num:"01",title:"Conception maîtrisée",text:"Chaque modèle est optimisé plan par plan, poste par poste. Rien n'est laissé au hasard."},
    {num:"02",title:"Moins d'options, plus de justesse",text:"Nous avons déjà fait les bons choix : matériaux, volumes, équipements."},
    {num:"03",title:"Prix annoncé, prix tenu",text:"Un modèle maîtrisé, c'est un budget sans surprise, du premier rendez-vous à la remise des clés."},
    {num:"04",title:"Processus simplifié",text:"Moins d'étapes, moins d'allers-retours : votre projet avance vite et bien."},
    {num:"05",title:"Qualité constructive",text:"Des modèles éprouvés, construits en série maîtrisée, avec les mêmes exigences à chaque chantier."},
    {num:"06",title:"Garanties constructeur",text:"CCMI, garantie décennale, livraison à prix et délais convenus."}
  ],

  steps:[
    {num:"01",title:"Je choisis ma maison",text:"Parmi une collection courte de modèles conçus intelligemment."},
    {num:"02",title:"Je trouve mon terrain",text:"Nos agences sélectionnent des terrains compatibles avec votre modèle."},
    {num:"03",title:"Je rencontre mon agence",text:"Un interlocuteur unique, un chiffrage clair, un planning précis."},
    {num:"04",title:"Je construis",text:"Un chantier maîtrisé, des garanties complètes, une maison livrée au prix convenu."}
  ],

  agencies:[
    {
      id:"montpellier", name:"Agence de Montpellier", zone:"Montpellier & couronne ouest",
      address:"12 av. de la Méditerranée, 34000 Montpellier", phone:"04 67 00 00 00",
      email:"montpellier@essensya.fr", hours:"Lun – Sam · 9h–12h / 14h–18h30",
      lat:43.61, lng:3.88,
      image:"https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop",
      cities:["Montpellier","Fabrègues","Gigean","Cournonterral","Pignan","Saint-Jean-de-Védas"],
      description:"L'agence de Montpellier couvre la métropole et sa couronne ouest. Son équipe connaît chaque commune, chaque PLU et chaque lotissement du secteur — c'est elle qui repère les terrains compatibles avec les modèles de la collection avant même leur mise sur le marché."
    },
    {
      id:"sete", name:"Agence du Bassin de Thau", zone:"Sète, Frontignan & étang de Thau",
      address:"3 quai de la Résistance, 34200 Sète", phone:"04 67 00 00 01",
      email:"thau@essensya.fr", hours:"Lun – Sam · 9h–12h / 14h–18h30",
      lat:43.40, lng:3.70,
      image:"https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop",
      cities:["Sète","Frontignan","Balaruc-le-Vieux","Mèze","Poussan","Bouzigues"],
      description:"Du port de Sète aux villages de l'étang, l'agence du Bassin de Thau accompagne les projets sur un territoire où le foncier est rare et précieux. Sa spécialité : les parcelles compactes parfaitement exploitées par les modèles Nova et Essen."
    }
  ],

  trust:[
    {icon:"shield",title:"Contrat CCMI",text:"Le cadre légal le plus protecteur pour faire construire."},
    {icon:"ruler",title:"Constructeur-concepteur",text:"Nos modèles sont conçus, chiffrés et construits par nos équipes."},
    {icon:"pin",title:"Agences locales",text:"Des interlocuteurs proches de votre terrain, du premier jour à la livraison."},
    {icon:"key",title:"Livraison garantie",text:"Prix et délais convenus contractuellement, garanties décennales incluses."}
  ],

  /* Page concept */
  concept:{
    manifesto:"Le marché de la construction pousse à l'infini des options, des gammes et des suppléments. Nous avons pris le chemin inverse : trois modèles, conçus obsessionnellement, au prix annoncé dès le premier jour. Parce qu'une maison bien pensée n'a pas besoin d'être repensée par chaque client.",
    figures:[["3","modèles, pas trente"],["100 %","des plans optimisés poste par poste"],["48 h","pour une première réponse d'agence"]],
    commitments:[
      {t:"Le prix annoncé est le prix tenu",d:"Chaque modèle est chiffré dans le détail avant sa commercialisation. Le contrat CCMI fige le prix et les délais : pas d'avenant surprise, pas de « supplément indispensable » découvert en cours de route."},
      {t:"La qualité ne se négocie pas",d:"Matériaux éprouvés, conformité RE2020, mêmes exigences sur chaque chantier. Construire en série maîtrisée, c'est répéter ce qui fonctionne — pas rogner sur ce qui compte."},
      {t:"Un interlocuteur, pas un standard",d:"De la première visite à la remise des clés, votre agence locale suit votre projet. Elle connaît votre terrain, votre commune et votre chantier."},
      {t:"Toutes les garanties du CCMI",d:"Garantie de livraison à prix et délais convenus, garantie décennale, biennale, parfait achèvement, dommages-ouvrage. Le cadre le plus protecteur qui existe pour faire construire en France."},
      {t:"La transparence comme méthode",d:"Ce qui est inclus est listé noir sur blanc sur chaque fiche modèle. Ce qui ne l'est pas aussi. Vous comparez en connaissance de cause."}
    ]
  },

  /* Landing pages (data-driven → CPT WordPress "landing") */
  landings:{
    "essen-lancement":{
      title:"Essen à prix de lancement",
      subtitle:"Pour l'ouverture de nos agences de l'Hérault, le modèle Essen — 92 m², 3 chambres — est proposé à un prix de lancement sur une sélection de terrains.",
      image:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1920&auto=format&fit=crop",
      price:159900, priceNote:"au lieu de 168 900 € — maison seule, hors terrain",
      bullets:["Offre valable sur les 10 premiers contrats signés","Terrains compatibles déjà sélectionnés par nos agences","Toutes les garanties CCMI incluses","Livraison à prix et délais convenus"],
      formTitle:"Recevoir le dossier Essen",
      formText:"Plans, prestations détaillées et terrains compatibles. Réponse sous 48 h."
    }
  }
};

export const MODELS = ESSENSYA_DATA.models;
export const AGENCIES = ESSENSYA_DATA.agencies;
export const modelById = (id: string) => MODELS.find((m) => m.id === id) ?? null;
export const agencyById = (id: string) => AGENCIES.find((g) => g.id === id) ?? null;
