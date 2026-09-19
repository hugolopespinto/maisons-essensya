/* ════════════════════════════════════════════════════════════════
   CONTENU ÉDITABLE PAR LE CLIENT — contrat de données

   Tout ce que le back-office peut modifier est décrit ici, et NULLE PART
   ailleurs. Les pages publiques lisent ces types via `getContent()` et ne
   savent pas d'où vient la donnée : fichier JSON aujourd'hui, base ou CMS
   demain. C'est ce qui permet de trancher l'infrastructure plus tard sans
   retoucher l'interface d'administration ni les gabarits.

   ⚠ Ce qui N'EST PAS ici est volontairement non éditable :
   les annonces, qui appartiennent au flux Vitahome. On ne les réécrit
   pas — on les ENRICHIT (voir AnnonceOverride). Sans quoi le site et le
   CRM divergeraient dès le premier import, et c'est le CRM qui a raison.
   ════════════════════════════════════════════════════════════════ */

/* ════ SEO ════ */
export interface SeoEntry {
  /** Chemin exact de la route : "/", "/maisons", "/annonces"… */
  path: string;
  /** Libellé lisible affiché dans le back-office. */
  label: string;
  title?: string;
  description?: string;
  /** Image Open Graph (URL absolue ou chemin public). */
  ogImage?: string;
  /** Retire la page de l'index Google. */
  noindex?: boolean;
  /** URL canonique forcée — à n'utiliser qu'en connaissance de cause. */
  canonical?: string;
}

/* ════ TRACKING ════ */
export interface TrackingConfig {
  gtmId?: string;
  ga4Id?: string;
  metaPixelId?: string;
  /** Balise de vérification Google Search Console. */
  googleSiteVerification?: string;
  /** Identifiant de propriété GA4 pour le tableau de bord (format "properties/123456"). */
  ga4PropertyId?: string;
  /** Événements de conversion suivis, pour mémoire côté client. */
  conversions: { event: string; label: string; actif: boolean }[];
}

/* ════ BLOG ════
   Nouveau type de contenu. Ce n'est pas un gadget : sur ce métier,
   « prix construction maison <département> », « combien coûte un terrain
   viabilisé », « CCMI : ce qui est couvert » sont des requêtes à fort
   volume que les pages produit ne peuvent pas capter. */
export interface Article {
  slug: string;
  titre: string;
  chapo: string;
  /** Corps en Markdown léger — titres, paragraphes, listes, gras, liens. */
  corps: string;
  image?: string;
  imageAlt?: string;
  /** ISO. Un article non daté n'est pas publié. */
  publieLe?: string;
  auteur?: string;
  /** Brouillon : visible en back-office, absent du site et du sitemap. */
  brouillon: boolean;
  seo?: { title?: string; description?: string };
}

/* ════ ENRICHISSEMENT D'ANNONCE ════
   La donnée Vitahome reste la source. On ne stocke que les écarts
   voulus par le client, indexés sur la référence de l'annonce. */
export interface AnnonceOverride {
  /** Référence Vitahome — la clé de rapprochement. */
  ref: string;
  /** Remplace le titre calculé. Vide = on garde celui du site. */
  titre?: string;
  /** Texte d'accroche ajouté AVANT la description du flux. */
  accroche?: string;
  /** Mise en avant en home (bloc « opportunité du moment »). */
  coupDeCoeur?: boolean;
  /** Retire l'annonce du site sans toucher au CRM. */
  masquee?: boolean;
  seo?: { title?: string; description?: string };
  /** Horodatage de la dernière modification, pour la traçabilité. */
  majLe?: string;
}

/* ════ TEXTES ÉDITORIAUX ════
   Un sous-ensemble volontairement restreint : les blocs que le client
   voudra réellement ajuster. Le reste (visite, matériaux, plan) relève
   de la fiche produit et bouge rarement — il reste dans le code, où il
   est versionné et relu. */
export interface Textes {
  /** Nom commercial de la maison. */
  houseName?: string;
  /** Accroche de la maison. */
  tagline?: string;
  /** Le h1 du hero de la home. */
  heroTitre?: string;
  /** Prix affichés — en attente des vrais chiffres du client. */
  prix?: {
    maison3ch?: number;
    maison2ch?: number;
    total?: number;
    mensualite?: number;
  };
  /** Téléphone commercial affiché partout. */
  telephone?: string;
  /** Lignes du comparatif de prix. */
  compare?: { poste: string; essensya: string; classique: string; gain?: boolean }[];
}

/* ════ MÉDIATHÈQUE ════
   L'entrée que le client reconnaîtra de WordPress. Le FICHIER vit dans
   le bucket privé `medias` de Supabase Storage ; cette structure n'en
   décrit que la fiche. Les deux se suppriment ensemble — voir
   `src/lib/medias.ts`, seul endroit autorisé à toucher au bucket. */
export interface Media {
  /** uuid — c'est lui qu'un écran stocke quand il « choisit une image ». */
  id: string;
  /** Chemin de l'objet DANS le bucket. Jamais une URL : le bucket est
   *  privé, l'URL est signée à la demande et expire. */
  chemin: string;
  /** Nom du fichier d'origine, pour que le client retrouve le sien. */
  nom: string;
  /** Texte alternatif. Techniquement optionnel en base, obligatoire à
   *  l'usage : une image sans alt est une image invisible pour Google
   *  et pour un lecteur d'écran. Les écrans doivent l'exiger. */
  alt: string;
  /** Media type (« image/png », « application/pdf »…). */
  type: string;
  /** Taille en octets. */
  taille: number;
  /** Dimensions en pixels quand elles ont pu être lues dans l'en-tête du
   *  fichier. Absentes pour un PDF, un SVG, ou un format non reconnu. */
  largeur?: number;
  hauteur?: number;
  /** ISO — date de téléversement. */
  creeLe: string;
}

/* ════ AGENCES ════
   Aujourd'hui figées dans `src/data/essensya.ts`. Les faire passer par
   le contenu éditable, c'est permettre au client d'ouvrir une agence un
   lundi sans attendre un déploiement. */
export interface Agence {
  /** uuid. */
  id: string;
  nom: string;
  /** Secteur couvert, en clair : « Charente-Maritime & Deux-Sèvres ». */
  zone: string;
  adresse: string;
  telephone: string;
  email: string;
  horaires: string;
  /** Coordonnées pour la carte. Absentes = l'agence n'y apparaît pas. */
  lat?: number;
  lng?: number;
  /** Identifiant de `Media`, ou URL. Voir `resoudreMedia()`. */
  image?: string;
  /** Communes desservies — la longue traîne géographique du SEO. */
  villes: string[];
  description: string;
  /** Une agence fermée disparaît du site SANS être supprimée : son
   *  historique, ses villes et sa fiche restent récupérables. */
  actif: boolean;
  /** Ordre d'affichage, croissant. */
  ordre: number;
}

/* ════ MENUS ════
   Le client vient de WordPress : « Apparence → Menus » est un réflexe.
   Le `href` est libre (chemin interne ou URL externe) — le back-office
   avertit, il n'interdit pas : une URL de prise de rendez-vous externe
   est un cas légitime. */
export interface LienMenu {
  id: string;
  label: string;
  href: string;
  ordre: number;
}

export interface ColonneFooter {
  id: string;
  titre: string;
  liens: LienMenu[];
  ordre: number;
}

export interface Menus {
  header: LienMenu[];
  footer: ColonneFooter[];
}

/* ════ RÉGLAGES GÉNÉRAUX ════
   L'équivalent de « Réglages → Général » : l'identité du site et les
   coordonnées qui se répètent dans l'en-tête, le pied de page, les
   données structurées et les métadonnées. Tout est optionnel — un champ
   vide signifie « garder ce que le code affiche aujourd'hui », jamais
   « afficher du vide ». */
export interface Reglages {
  nomSite?: string;
  baseline?: string;
  /** Identifiants de `Media` ou URL. Voir `resoudreMedia()`. */
  logo?: string;
  favicon?: string;
  ogImage?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  horaires?: string;
  reseaux?: {
    instagram?: string;
    linkedin?: string;
    facebook?: string;
    pinterest?: string;
  };
}

/* ════ BLOCS DE TEXTE DES PAGES PUBLIQUES ════
   La STRUCTURE (quelles pages, quels blocs, quels libellés) vit dans le
   code : c'est elle qui dit ce que les gabarits savent réellement
   afficher. Seule la `valeur` est stockée. Conséquence voulue : ajouter
   un bloc au site le fait apparaître dans le back-office sans migration,
   et retirer une section du code en fait disparaître le champ plutôt que
   de laisser le client éditer un texte qui n'est plus affiché nulle
   part. Le catalogue de référence est `PAGES_DEFAUT`, dans `./index`. */
export interface BlocEditable {
  /** Stable — c'est la clé de stockage de la valeur. */
  cle: string;
  /** Libellé lisible par un non-technicien. */
  label: string;
  /** Précision affichée sous le champ : où le texte apparaît, ce qu'il
   *  se passe si on le vide. */
  aide?: string;
  /** Le texte du client. Vide = le gabarit garde son texte d'origine. */
  valeur: string;
  /** Rendu en zone de texte plutôt qu'en ligne unique. */
  multiligne?: boolean;
  /**
   * Le bloc contient du Markdown — corps d'une section légale.
   *
   * Change trois choses dans le back-office : un champ nettement plus
   * haut (quelques centaines de mots, pas une ligne d'adresse), l'aide
   * de syntaxe sous le champ, et la liste des éléments entre doubles
   * accolades que ce corps doit conserver.
   */
  format?: "markdown";
}

export interface PageEditable {
  /** "accueil" | "concept" | "maison" | "annonces" | "agences" | "contact" */
  cle: string;
  label: string;
  blocs: BlocEditable[];
}

/* ════ L'ENSEMBLE ════ */
/* ════════════════════════════════════════════════════════════════
   UNE RÉALISATION — une maison réellement construite et livrée

   ⚠ CE N'EST PAS UN RENDU 3D, et la distinction n'est pas cosmétique.
   Les visuels dont dispose le site aujourd'hui sont des images de
   synthèse. Les présenter comme des réalisations serait une pratique
   commerciale trompeuse (art. L.121-2 du Code de la consommation) : un
   acquéreur choisit un constructeur sur ce qu'il croit être des
   chantiers terminés. Cette page attend donc de vraies photographies,
   et elle affiche un état vide honnête tant qu'elle n'en a pas.

   Rangé dans le JSONB `content` plutôt que dans une table dédiée : le
   client n'a aucune migration SQL à lancer pour commencer à publier. Si
   le volume grandit — plusieurs dizaines de chantiers, avec tri et
   filtres — ce sera le moment de lui donner sa table, comme `articles`.
   ════════════════════════════════════════════════════════════════ */
export interface Realisation {
  id: string;
  /** Commune du chantier : c'est le mot-clé local qui fait remonter la page. */
  commune: string;
  /** Modèle construit, tel que le client le nomme (« Lisbonne »). */
  modele?: string;
  /** Année de livraison. Chaîne, pas nombre : « 2025 », « en cours ». */
  annee?: string;
  /** Référence de média, ou URL. Résolue par `resoudreMedia()`. */
  image?: string;
  imageAlt?: string;
  texte?: string;
  /** Masquée du site sans être supprimée — même logique que les agences. */
  actif: boolean;
  ordre: number;
}

export interface Content {
  /** Version du schéma — permet une migration propre plus tard. */
  v: number;
  seo: SeoEntry[];
  /** Chantiers livrés, affichés sur /realisations. */
  realisations: Realisation[];
  tracking: TrackingConfig;
  articles: Article[];
  annonces: AnnonceOverride[];
  textes: Textes;
  /** Fiches de la médiathèque. Le fichier, lui, est dans le bucket. */
  medias: Media[];
  agences: Agence[];
  menus: Menus;
  reglages: Reglages;
  /** Blocs de texte des pages publiques — structure en code, valeurs ici. */
  pages: PageEditable[];
  /** Dernière écriture, tous domaines confondus. */
  majLe?: string;
}

export type ContentKey = keyof Omit<Content, "v" | "majLe">;
