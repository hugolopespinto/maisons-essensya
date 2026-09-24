/* ════════ CONTRAT DE DONNÉES ÉDITORIALES ════════
   Tout ce que les composants consomment passe par ces types.
   Changer de source (fichier local → CMS → API) ne doit impacter
   que src/data/*, jamais src/components/* ni src/app/*.

   ⚠ MONO-PRODUIT : Essensya ne vend QU'UNE maison. Il n'existe donc
   pas de type `Model[]` — il y a `House` (la maison, au singulier) et
   `HouseVersion[]` (ses déclinaisons, qui ne changent QUE le nombre de
   chambres et la surface, jamais l'architecture ni les prestations). */

export type IconName =
  | "shield" | "ruler" | "pin" | "key"
  | "surface" | "bed" | "land" | "loc" | "price" | "garage"
  /* Ajoutées pour le bandeau « Nos points forts », qui demande un picto
     par bloc. Le jeu d'origine décrit un bien immobilier — surface, lit,
     terrain ; il ne savait dire ni « conception » ni « qualité ». */
  | "compass" | "checklist" | "flow" | "wall" | "team";

export interface GalleryItem {
  src: string;
  alt: string;
  caption: string;
}

export interface Feature {
  t: string;
  d: string;
}

/** Une étape de la visite pilotée au scroll (voir VisiteMaison). */
export interface VisiteStep {
  /** Ancre et clé de rendu — kebab-case, unique. */
  cle: string;
  /** Libellé court du menu de pièces. */
  nav: string;
  titre: string;
  texte: string;
  /** 2 à 3 chiffres affichés sous le texte. */
  specs: string[];
  image: string;
  alt: string;
  /**
   * Boucle vidéo optionnelle (MP4/WebM, muette, 4-8 s).
   * Renseignée → le calque passe de <img> à <video>, rien d'autre ne bouge.
   * `image` reste obligatoire : elle sert de poster et c'est elle que
   * Google indexe. À héberger hors Netlify (Cloudflare Stream, Mux, Bunny).
   */
  video?: string;
}

/* ════════ LA MAISON ════════ */

/**
 * Une déclinaison de la maison — PAS un autre produit.
 * Seuls varient la surface, le nombre de chambres et le garage.
 * L'architecture, les matériaux et les prestations sont identiques :
 * c'est tout l'intérêt du modèle unique.
 */
export interface HouseVersion {
  /** Slug d'URL : "3-chambres" | "2-chambres". */
  slug: string;
  /** Libellé long — « 3 chambres ». */
  label: string;
  /** Chiffre nu affiché en très grand (le geste graphique de la DA). */
  chiffre: string;
  surface: number;
  bedrooms: number;
  rooms: number;
  garageArea: number;
  /** Prix maison seule, hors terrain. */
  priceFrom: number;
  /** Une phrase : pour qui cette déclinaison est faite. */
  pour: string;
  /** Ce qui change par rapport à l'autre déclinaison. */
  difference: string;
  /** [pièce, surface] */
  rooms_detail: [string, string][];
  /** `null` quand aucun plan ne décrit CETTE déclinaison — voir essensya.ts. */
  planImage: string | null;
  image: string;
  alt: string;
  /** `modelSlug` Vitahome qui retombent sur cette déclinaison. */
  vitahomeSlugs: string[];
}

/** LA maison Essensya. Une seule, jamais un tableau. */
export interface House {
  /** Nom commercial. */
  name: string;
  /** Accroche courte, sous le nom. */
  tagline: string;
  /** Le parti-pris, en une phrase forte. */
  philosophy: string;
  image: string;
  heroImage: string;
  alt: string;
  gallery: GalleryItem[];
  /** Parcours de la maison, pièce par pièce. 4 à 6 étapes. */
  visite: VisiteStep[];
  archText: string;
  archImage: string;
  /** [label, valeur] — prestations constructives, communes aux déclinaisons. */
  materials: [string, string][];
  features: Feature[];
  /** Ce qui est compris dans le prix. */
  included: string[];
  /** Ce qui ne l'est pas — aussi important que la liste précédente. */
  excluded: string[];
}

/* ════════ COMPARATIF DE PRIX ════════
   Le bloc qui porte l'argument central du positionnement. */
export interface CompareRow {
  poste: string;
  essensya: string;
  classique: string;
  /** true → la ligne est un avantage à souligner. */
  gain?: boolean;
}

export interface Compare {
  title: string;
  intro: string;
  rows: CompareRow[];
  note: string;
}

export interface Agency {
  id: string;
  name: string;
  zone: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  lat: number;
  lng: number;
  image: string;
  cities: string[];
  description: string;
}

export interface NumberedItem {
  num: string;
  title: string;
  /**
   * ⚠ LE TEXTE DU CLIENT, MOT POUR MOT. On ne le raccourcit pas ici :
   * c'est lui qui fait foi, et c'est lui qu'affichent les pages qui ont
   * la place de le porter en entier.
   */
  text: string;
  /**
   * Version courte, pour le bandeau de l'accueil où une carte ne fait que
   * 200 px. Absente → `text` est affiché tel quel. Elle s'ajoute au texte
   * long, elle ne le remplace jamais.
   */
  textCourt?: string;
  /** Destination de la carte. Absente → la carte n'est pas un lien. */
  href?: string;
  /** Picto affiché à côté du numéro. */
  icon?: IconName;
}

export interface TrustItem {
  icon: IconName;
  title: string;
  text: string;
}

export interface ConceptContent {
  manifesto: string;
  /** [chiffre, légende] */
  figures: [string, string][];
  commitments: Feature[];
}

export interface Landing {
  title: string;
  subtitle: string;
  image: string;
  price: number;
  priceNote: string;
  bullets: string[];
  formTitle: string;
  formText: string;
}

/** Un argument de la maison — remplace la boucle sur les modèles en home. */
export interface Argument {
  cle: string;
  /** Chiffre géant en contour (ex-numérotation de collection). */
  chiffre: string;
  label: string;
  title: string;
  text: string;
  image: string;
  alt: string;
  /** Lien « en savoir plus », optionnel. */
  href?: string;
  linkLabel?: string;
}

export interface EssensyaData {
  /** LA maison. Singulier assumé. */
  house: House;
  /** Ses déclinaisons — 2, et elles ne changent pas le produit. */
  versions: HouseVersion[];
  /** Les arguments déroulés en home à la place de la collection. */
  arguments: Argument[];
  compare: Compare;
  philosophy: NumberedItem[];
  steps: NumberedItem[];
  agencies: Agency[];
  trust: TrustItem[];
  concept: ConceptContent;
  landings: Record<string, Landing>;
}

/* ════════ CONTRAT INTERNE ANNONCE ════════
   Format normalisé produit par mapAnnonce().
   Les templates ne consomment QUE ce format — jamais le brut Vitahome. */

/**
 * Une offre portée par une parcelle.
 *
 * Le flux publie une annonce PAR COUPLE terrain × maison : la même parcelle
 * revient avec la maison en 2 chambres, puis avec la même maison en
 * 3 chambres, puis en terrain nu. Ce ne sont pas trois biens — c'est une
 * parcelle et trois façons de l'acheter.
 *
 * On regroupe donc par parcelle et on porte les offres ici. Cela évite
 * le contenu dupliqué côté SEO, cela dit la vérité au visiteur, et cela
 * met le seul vrai arbitrage du produit là où il doit être : sur la fiche.
 */
export interface Offre {
  /** Référence Vitahome propre à ce couple terrain × maison. */
  ref: string;
  /** `null` pour l'offre « terrain nu ». */
  versionSlug: string | null;
  houseSurface: number | null;
  bedrooms: number | null;
  rooms: number | null;
  garageArea: number | null;
  planImage: string | null;
  price: number | null;
}

export interface Annonce {
  /** Toutes les façons d'acheter cette parcelle, de la moins chère à la plus chère. */
  offres: Offre[];
  id: string;
  ref: string;
  type: "terrain" | "terrain-maison";
  title: string | null;
  description: string;
  /** `null` quand le flux ne donne pas de prix exploitable. */
  price: number | null;
  landPrice: number | null;
  landSurface: number | null;
  servicing: string | null;
  /** Texte long de viabilisation — à afficher, il engage. */
  servicingLong: string | null;
  landConfiguration: string | null;
  landType: string | null;
  landState: string | null;
  lotNumber: string | null;
  /** Lotissement, quand l'annonce en fait partie. */
  subdivision: string | null;
  city: string;
  /** ID Vitahome de la commune → construction-location-id */
  cityId: number | null;
  /** code INSEE → construction-location-insee */
  insee: string | null;
  zip: string;
  dept: string;
  deptCode: string;
  lat: number | null;
  lng: number | null;
  houseSurface: number | null;
  bedrooms: number | null;
  rooms: number | null;
  garageArea: number | null;
  houseName: string | null;
  /** slug de la déclinaison Essensya portée par l'annonce, si T+M. */
  versionSlug: string | null;
  /** Plan du rez-de-chaussée fourni par le flux. */
  planImage: string | null;
  /** Mentions légales de l'annonce — OBLIGATOIRE à l'affichage. */
  mention: string | null;
  /** Contact commercial recomposé (jamais la chaîne brute du flux). */
  contact: { name: string | null; phone: string | null } | null;
  /** Date de dernière mise à jour, ISO — sert au tri « plus récentes ». */
  updatedAt: string | null;
  /** Mise en avant côté Vitahome (isPriority / isExclusive). */
  highlighted: boolean;
  agency: {
    slug: string | null;
    name: string | null;
    phone: string | null;
    email: string | null;
    address: string;
  };
  /** `null` quand aucun média : le substitut graphique prend le relais. */
  image: string | null;
  gallery: string[];
}
