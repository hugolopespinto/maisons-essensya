/* ════════════════════════════════════════════════════════════════
   LE GUIDE DU BACK-OFFICE — une seule source pour deux usages

   Les personnes qui gèrent le site ne connaissent pas son code, et
   souvent pas ses écrans. Ce fichier dit, écran par écran, ce qu'on y
   modifie et OÙ cela se voit sur le site public. Il nourrit :
     · le bloc « Guide de cet écran » en tête de chaque écran
       (src/components/admin/GuideEcran.tsx) ;
     · la barre de recherche du back-office (src/app/admin/layout.tsx) :
       taper « simulateur » mène au champ du taux, dans Réglages.

   ⚠ Écrire ce que le site FAIT, pas ce qu'il devrait faire. Un champ
   qui n'est relié à rien doit le dire : sinon on corrige un prix, on
   enregistre, et l'on croit le site à jour alors qu'il n'a pas bougé.

   `ancre` est l'`id` du champ sur l'écran : la recherche y fait défiler
   la page. Pas d'ancre quand le champ n'existe qu'une fois une fiche
   ouverte (une agence, un article) — la recherche mène alors à la liste.
   `motsCles` : les mots qu'un non-technicien tapera, pas ceux du code.
   ════════════════════════════════════════════════════════════════ */

export interface ElementGuide {
  /** Le nom du champ, tel qu'il est écrit à l'écran. */
  nom: string;
  /** Ce que ça change, et où on le voit sur le site. */
  effet: string;
  ancre?: string;
  motsCles?: string;
}

export interface GuideEcran {
  href: string;
  /** Le nom de l'onglet dans la barre latérale. */
  titre: string;
  /** Une ou deux phrases : à quoi sert cet écran. Affichées dans les
   *  résultats de recherche (l'écran a déjà son propre texte d'intro). */
  resume: string;
  elements: ElementGuide[];
  /** « Vous cherchez autre chose ? » — ce qui se règle ailleurs. */
  /** Sans `href` : ce n'est modifiable dans aucun écran. */
  ailleurs?: { quoi: string; href?: string; ecran: string }[];
  motsCles?: string;
  /** Mêmes restrictions que la navigation (voir layout.tsx). */
  admin?: true;
  comptes?: true;
}

export const GUIDE = {
  tableau: {
    href: "/admin",
    titre: "Tableau de bord",
    resume:
      "La vue d'ensemble : l'état du site et ce qui reste à configurer. Rien ne se modifie ici — chaque point renvoie vers l'écran où le régler.",
    elements: [
      {
        nom: "Fréquentation",
        effet: "Les visites du site, une fois Google Analytics relié (écran Tracking).",
        motsCles: "visites statistiques audience trafic",
      },
      {
        nom: "État du site et diagnostic",
        effet:
          "Ce qui fonctionne et ce qui manque (base de données, médiathèque, flux d'annonces). Un point en rouge indique un réglage à faire, pas une panne du site.",
        motsCles: "diagnostic configuration erreur probleme",
      },
    ],
    motsCles: "accueil admin resume",
  },

  pages: {
    href: "/admin/pages",
    titre: "Pages",
    resume:
      "Les titres et paragraphes d'introduction des grandes pages du site (accueil, concept, modèles, annonces, agences, contact, pages légales). Choisissez une page, puis modifiez ses blocs de texte.",
    elements: [
      {
        nom: "Les blocs de texte d'une page",
        effet:
          "Chaque bloc est un texte précis de la page, dans l'ordre où il apparaît à l'écran. Le texte gris est celui livré à l'origine : tant que vous n'écrivez rien, c'est lui que le site affiche.",
        motsCles: "titre chapo paragraphe texte phrase h1",
      },
      {
        nom: "Vider un champ",
        effet: "Le site revient au texte d'origine. Rien n'est perdu : l'ancien texte reste dans Révisions.",
        motsCles: "annuler revenir origine",
      },
    ],
    ailleurs: [
      { quoi: "Le texte des fiches de modèles (Pékin, Lisbonne…)", ecran: "pas modifiable depuis le back-office — à demander au développeur" },
      { quoi: "Le titre et la description affichés dans Google", href: "/admin/seo", ecran: "SEO" },
      { quoi: "Les liens du menu et du pied de page", href: "/admin/menus", ecran: "Menus" },
    ],
    motsCles: "textes contenu page accueil concept contact mentions legales confidentialite",
  },

  contenu: {
    href: "/admin/contenu",
    titre: "Textes du site",
    resume:
      "Le nom commercial de la maison, son accroche, le téléphone commercial, les prix « à partir de » et le tableau comparatif. ⚠ Aujourd'hui, seul le téléphone est repris par le site : les autres champs sont enregistrés mais ne s'affichent encore nulle part.",
    elements: [
      {
        nom: "Téléphone commercial",
        effet:
          "Affiché dans l'en-tête, le pied de page, la page Contact et les pages légales — mais seulement si le téléphone de Réglages du site est vide. C'est celui de Réglages qui l'emporte.",
        ancre: "telephone",
        motsCles: "numero telephone appel",
      },
      {
        nom: "Nom commercial, accroche",
        effet: "Pas encore reliés au site. Les noms et accroches des modèles viennent des textes livrés pour chaque modèle.",
        ancre: "houseName",
        motsCles: "nom maison accroche slogan",
      },
      {
        nom: "Les prix « à partir de » et la mensualité",
        effet:
          "Pas encore reliés au site : les prix affichés viennent de la grille des modèles. Modifier ces champs ne change aucun prix en ligne pour l'instant.",
        ancre: "maison3ch",
        motsCles: "prix tarif euros mensualite a partir de cout",
      },
      {
        nom: "Le comparatif",
        effet: "Pas encore relié au site.",
        motsCles: "comparatif tableau constructeur classique",
      },
    ],
    ailleurs: [
      { quoi: "Le téléphone, l'e-mail et l'adresse généraux", href: "/admin/reglages", ecran: "Réglages du site" },
      { quoi: "Le prix d'une annonce de terrain", href: "/admin/annonces", ecran: "Annonces (à corriger dans Vitahome)" },
    ],
    motsCles: "textes et prix",
  },

  blog: {
    href: "/admin/blog",
    titre: "Blog",
    resume:
      "Les articles de la rubrique Actualités (/blog). Un article n'est en ligne que s'il a une date de publication et qu'il n'est pas en brouillon.",
    elements: [
      { nom: "Titre", effet: "Le grand titre de l'article, et le titre de sa carte dans la liste du blog.", motsCles: "titre article" },
      { nom: "Adresse de la page", effet: "La fin de l'URL : /blog/votre-adresse. À ne plus changer une fois l'article publié, sinon les liens existants cassent.", motsCles: "url lien slug adresse" },
      { nom: "Chapô", effet: "Le paragraphe d'introduction, sous le titre et dans la liste du blog.", motsCles: "introduction resume" },
      { nom: "Corps de l'article", effet: "Le texte complet. « ## » en début de ligne fait un intertitre, « - » une liste, **gras** du gras.", motsCles: "texte contenu redaction" },
      { nom: "Date de publication, brouillon", effet: "Sans date ou en brouillon, l'article reste invisible sur le site et dans Google.", motsCles: "publier publication brouillon date" },
      { nom: "Image et sa description", effet: "La photo en tête d'article et sur sa carte. La description est lue aux malvoyants et par Google.", motsCles: "photo image illustration" },
      { nom: "Titre et description dans Google", effet: "Ce que Google affiche dans ses résultats pour cet article. Vides : le titre et le chapô sont repris.", motsCles: "seo referencement google" },
    ],
    motsCles: "articles actualites news blog",
  },

  annonces: {
    href: "/admin/annonces",
    titre: "Annonces",
    resume:
      "Les terrains et projets terrain + maison viennent du logiciel Vitahome : prix, surfaces et photos se corrigent dans Vitahome, pas ici. Cet écran permet seulement d'enrichir une annonce ou de la masquer du site.",
    elements: [
      { nom: "Actualiser les annonces", effet: "Relit Vitahome tout de suite, au lieu d'attendre la relecture automatique (toutes les heures).", motsCles: "actualiser rafraichir mettre a jour vitahome synchroniser" },
      { nom: "Titre affiché", effet: "Remplace le titre de l'annonce sur sa fiche et dans les listes.", motsCles: "titre annonce" },
      { nom: "Accroche", effet: "Une phrase en gras placée avant la description de la fiche.", motsCles: "accroche phrase" },
      { nom: "Description personnalisée", effet: "Remplace la description venue de Vitahome sur la fiche.", motsCles: "description texte" },
      { nom: "Coup de cœur", effet: "Rend l'annonce candidate au bloc « L'opportunité du moment » de la page d'accueil.", motsCles: "coup de coeur mise en avant accueil opportunite" },
      { nom: "Masquer", effet: "Retire l'annonce du site sans la toucher dans Vitahome.", motsCles: "masquer cacher retirer supprimer annonce" },
      { nom: "Titre et description SEO", effet: "Ce que Google affiche pour cette annonce.", motsCles: "seo google referencement" },
    ],
    motsCles: "terrains parcelles projets maison vitahome flux",
  },

  agences: {
    href: "/admin/agences",
    titre: "Agences",
    resume:
      "Les agences affichées sur la page Nos agences, sur la carte et sur la page Contact. Cliquez sur une agence pour la modifier ; l'ordre de la liste est celui du site.",
    elements: [
      { nom: "Nom, secteur couvert, présentation", effet: "Le titre et le texte de la fiche de l'agence (/agences/…).", motsCles: "nom agence presentation secteur zone" },
      { nom: "Adresse de la page", effet: "La fin de l'URL de la fiche. À ne plus changer une fois en ligne.", motsCles: "url lien slug" },
      { nom: "Adresse, téléphone, e-mail, horaires", effet: "Les coordonnées propres à l'agence, sur sa fiche et dans la page Contact.", motsCles: "coordonnees telephone mail horaires adresse" },
      { nom: "Position sur la carte", effet: "Latitude et longitude du point de l'agence sur la carte. Vides : l'agence n'apparaît pas sur la carte.", motsCles: "carte gps latitude longitude localisation" },
      { nom: "Photo de l'agence", effet: "L'image de la fiche, choisie dans la médiathèque.", motsCles: "photo image" },
      { nom: "Communes couvertes", effet: "Une commune par ligne. Les annonces situées dans ces communes s'affichent sur la fiche de l'agence, et Google apprend quel secteur elle couvre.", motsCles: "villes communes secteur" },
      { nom: "Agence ouverte", effet: "Décochée, l'agence disparaît du site sans être supprimée.", motsCles: "fermer masquer ouvrir visible" },
    ],
    motsCles: "agence bureau implantation",
  },

  realisations: {
    href: "/admin/realisations",
    titre: "Réalisations",
    resume:
      "Les maisons réellement construites et livrées, affichées sur la page Nos réalisations. Uniquement de vraies photos de chantier : jamais d'images de synthèse.",
    elements: [
      { nom: "Commune", effet: "Le titre de la carte sur la page Réalisations.", motsCles: "ville commune" },
      { nom: "Modèle construit, année de livraison", effet: "La petite ligne sous la commune (« Lisbonne · 2025 »).", motsCles: "modele annee" },
      { nom: "Photo et sa description", effet: "La photo de la carte, choisie dans la médiathèque.", motsCles: "photo image chantier" },
      { nom: "Quelques mots sur ce chantier", effet: "Le court texte sous la photo.", motsCles: "texte description" },
      { nom: "Afficher sur le site", effet: "Décoché, la réalisation est masquée sans être supprimée.", motsCles: "masquer cacher" },
    ],
    motsCles: "realisations chantiers maisons livrees photos",
  },

  avis: {
    href: "/admin/avis",
    titre: "Avis clients",
    resume:
      "Les avis de vos clients, affichés sur la page Avis clients. Recopiez le texte d'avis réels (Google, Trustpilot…) mot pour mot, avec le lien vers l'avis d'origine.",
    elements: [
      { nom: "Nom du client, note, date", effet: "En bas de la carte d'avis, et les étoiles en haut.", motsCles: "nom client note etoiles date" },
      { nom: "Texte de l'avis", effet: "La citation affichée sur la carte. Seule l'orthographe peut être corrigée.", motsCles: "texte avis temoignage citation" },
      { nom: "Agence ou commune concernée", effet: "Affichée à côté de la date.", motsCles: "agence commune ville" },
      { nom: "Provenance et lien", effet: "Le lien « Avis Google ↗ » de la carte, vers l'avis d'origine : c'est la preuve qu'il n'est pas inventé.", motsCles: "google trustpilot source lien" },
      { nom: "Afficher sur le site", effet: "Décoché, l'avis est masqué sans être supprimé.", motsCles: "masquer cacher" },
    ],
    motsCles: "avis clients temoignages google notes etoiles",
  },

  medias: {
    href: "/admin/medias",
    titre: "Médiathèque",
    resume:
      "Tous les fichiers du site : photos, logos, plans, documents. On les dépose ici une fois, puis on les choisit d'un clic depuis les autres écrans (logo, photo d'agence, réalisation, article…).",
    elements: [
      { nom: "Ajouter des fichiers", effet: "Dépose une image ou un PDF dans la médiathèque. Rien n'apparaît sur le site tant qu'un autre écran ne l'utilise pas.", motsCles: "televerser upload deposer importer photo image fichier pdf" },
      { nom: "Texte alternatif", effet: "La phrase qui décrit l'image à quelqu'un qui ne la voit pas, et à Google. Décrivez ce qu'on voit.", motsCles: "alt description image accessibilite" },
      { nom: "Supprimer", effet: "Efface définitivement le fichier. Vérifiez qu'aucune page ne l'utilise encore.", motsCles: "supprimer effacer" },
    ],
    motsCles: "medias images photos fichiers bibliotheque",
  },

  menus: {
    href: "/admin/menus",
    titre: "Menus",
    resume:
      "Les liens du menu en haut du site et les colonnes du pied de page. ⚠ Un menu enregistré remplace entièrement celui d'origine ; un menu entièrement vide rend au site sa navigation d'origine.",
    elements: [
      { nom: "Menu d'en-tête", effet: "Les rubriques de la barre en haut de chaque page, et leurs sous-menus au survol.", ancre: "entete", motsCles: "menu haut navigation en-tete barre rubrique sous-menu" },
      { nom: "Pied de page", effet: "Les colonnes de liens en bas de chaque page.", ancre: "pied", motsCles: "footer bas de page colonnes liens" },
      { nom: "Libellé et adresse d'un lien", effet: "Le texte cliquable et la page vers laquelle il mène. Commencez à taper une adresse pour voir les pages du site.", motsCles: "lien url libelle" },
      { nom: "Flèches ↑ ↓", effet: "L'ordre affiché ici est l'ordre affiché sur le site.", motsCles: "ordre deplacer" },
    ],
    motsCles: "menu navigation liens footer header",
  },

  reglages: {
    href: "/admin/reglages",
    titre: "Réglages du site",
    resume:
      "L'identité du site et les coordonnées générales de l'entreprise. Ce qui est saisi ici se répète sur toutes les pages : en-tête, pied de page, aperçus de partage.",
    elements: [
      { nom: "Nom du site, baseline", effet: "Le nom de l'entreprise dans le titre des onglets et des aperçus de partage ; la baseline est la courte phrase à côté du logo.", ancre: "nomSite", motsCles: "nom entreprise baseline slogan identite" },
      { nom: "Logo, favicon, image de partage", effet: "Le logo de l'en-tête et du pied de page ; la petite icône de l'onglet du navigateur ; l'image montrée quand un lien du site est partagé.", ancre: "nomSite", motsCles: "logo favicon icone image partage facebook whatsapp" },
      { nom: "Téléphone, e-mail, adresse, horaires", effet: "Les coordonnées générales : en-tête, pied de page, page Contact, mentions légales. Celles de chaque agence se règlent dans Agences.", ancre: "telephone", motsCles: "coordonnees telephone numero mail email adresse siege horaires contact" },
      { nom: "Simulateur de financement — taux par défaut", effet: "Le taux d'intérêt pré-rempli sur la page Simulateur de financement et dans « Simuler mon financement » des fiches annonce. Le visiteur peut toujours le changer.", ancre: "tauxSimulateur", motsCles: "simulateur financement taux interet credit pret emprunt mensualite" },
      { nom: "Réseaux sociaux", effet: "Les liens Instagram, LinkedIn, Facebook, Pinterest du pied de page. Vide : aucun lien affiché pour ce réseau.", ancre: "instagram", motsCles: "reseaux sociaux instagram facebook linkedin pinterest" },
    ],
    motsCles: "reglages parametres configuration general",
  },

  seo: {
    href: "/admin/seo",
    titre: "SEO",
    resume:
      "Ce que Google affiche pour chaque page du site : le titre cliquable et le petit texte gris en dessous. Un champ vide garde le texte prévu par le site, rappelé en gris.",
    elements: [
      { nom: "Balise title", effet: "Le titre bleu cliquable dans les résultats Google, et le nom de l'onglet du navigateur.", motsCles: "titre google title" },
      { nom: "Meta description", effet: "Le paragraphe gris sous le titre dans Google.", motsCles: "description google" },
      { nom: "Image de partage", effet: "L'image affichée quand cette page est partagée (Facebook, LinkedIn, WhatsApp).", motsCles: "image partage og facebook" },
      { nom: "URL canonique, noindex", effet: "Réglages techniques : à ne toucher que sur conseil. « noindex » retire la page de Google.", motsCles: "canonique noindex desindexer retirer google" },
    ],
    motsCles: "seo referencement google recherche",
  },

  tracking: {
    href: "/admin/tracking",
    titre: "Tracking",
    resume:
      "Les identifiants des outils de mesure (Google Tag Manager, Google Analytics, Pixel Meta, Search Console). Réglages techniques : à remplir avec la personne qui gère vos campagnes.",
    elements: [
      { nom: "Google Tag Manager", effet: "Le conteneur qui déclenche les outils de mesure, après accord du visiteur.", ancre: "gtmId", motsCles: "gtm tag manager balise" },
      { nom: "Google Analytics 4", effet: "Mesure de la fréquentation.", ancre: "ga4Id", motsCles: "analytics ga4 statistiques audience" },
      { nom: "Pixel Meta", effet: "Mesure des campagnes Facebook et Instagram.", ancre: "metaPixelId", motsCles: "pixel facebook meta instagram publicite" },
      { nom: "Vérification Google Search Console", effet: "Prouve à Google que le site vous appartient.", ancre: "googleSiteVerification", motsCles: "search console verification google" },
      { nom: "Événements de conversion", effet: "La liste des actions comptées comme objectifs (formulaire envoyé, appel…).", motsCles: "conversion evenement objectif" },
    ],
    motsCles: "tracking mesure statistiques cookies",
    admin: true,
  },

  revisions: {
    href: "/admin/revisions",
    titre: "Révisions",
    resume:
      "L'historique de toutes les modifications. Une erreur ? Retrouvez la version d'avant et restaurez-la : la restauration elle-même est enregistrée, on peut toujours revenir en arrière.",
    elements: [
      { nom: "Portée et période", effet: "Filtrent le journal : un écran précis (Menus, Pages…) ou une période.", ancre: "portee", motsCles: "filtre recherche historique" },
      { nom: "Restaurer", effet: "Remet le contenu tel qu'il était dans cette version.", motsCles: "restaurer annuler revenir erreur historique version" },
    ],
    motsCles: "historique versions annuler restaurer journal",
  },

  utilisateurs: {
    href: "/admin/utilisateurs",
    titre: "Utilisateurs",
    resume:
      "Qui peut entrer dans le back-office. Invitez une personne par son e-mail : elle reçoit un lien d'accès personnel, valable 72 heures.",
    elements: [
      { nom: "Inviter une personne", effet: "Crée un compte et un lien d'accès à lui transmettre.", ancre: "email", motsCles: "inviter ajouter compte acces collegue" },
      { nom: "Rôle", effet: "« Éditeur » modifie le contenu ; « Admin » peut en plus gérer les comptes et le tracking.", motsCles: "role droits admin editeur permission" },
    ],
    motsCles: "utilisateurs comptes acces mot de passe",
    admin: true,
    comptes: true,
  },
} satisfies Record<string, GuideEcran>;

export type CleGuide = keyof typeof GUIDE;
