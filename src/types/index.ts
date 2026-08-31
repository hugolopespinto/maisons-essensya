/* ════════ CONTRAT DE DONNÉES ÉDITORIALES ════════
   Tout ce que les composants consomment passe par ces types.
   Changer de source (fichier local → CMS → API) ne doit impacter
   que src/data/*, jamais src/components/* ni src/app/*.        */

export type IconName =
  | "shield" | "ruler" | "pin" | "key"
  | "surface" | "bed" | "land" | "loc" | "price";

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
  /** Ancre et clé de rendu — kebab-case, unique dans le modèle. */
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
   * Google indexe. À héberger hors Netlify (Cloudflare Stream, Mux, Bunny) :
   * la bande passante vidéo épuiserait le quota du plan gratuit.
   */
  video?: string;
}

/** Un modèle de la collection (Essen, Alba, Nova…). */
export interface Model {
  id: string;
  index: string;
  name: string;
  tagline: string;
  philosophy: string;
  surface: number;
  bedrooms: number;
  priceFrom: number;
  image: string;
  heroImage: string;
  alt: string;
  gallery: GalleryItem[];
  /** Parcours de la maison, pièce par pièce. 4 à 6 étapes. */
  visite: VisiteStep[];
  archText: string;
  archImage: string;
  /** [label, valeur] — tableau de prestations constructives. */
  materials: [string, string][];
  planImage: string;
  /** [pièce, surface] */
  rooms: [string, string][];
  features: Feature[];
  included: string[];
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
  text: string;
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

export interface EssensyaData {
  models: Model[];
  hero: { refId: string };
  featured: {
    type: string;
    refId: string;
    title: string;
    image: string;
    alt: string;
    ctaLabel: string;
  };
  philosophy: NumberedItem[];
  steps: NumberedItem[];
  agencies: Agency[];
  trust: TrustItem[];
  concept: ConceptContent;
  landings: Record<string, Landing>;
}

/* ════════ CONTRAT INTERNE ANNONCE ════════
   Format normalisé produit par AnnoncesAdapter.map().
   Les templates ne consomment QUE ce format — jamais le brut Vitahome. */
export interface Annonce {
  id: string;
  ref: string;
  type: "terrain" | "terrain-maison";
  title: string | null;
  description: string;
  price: number;
  landPrice: number | null;
  landSurface: number | null;
  servicing: string | null;
  landConfiguration: string | null;
  landType: string | null;
  city: string;
  /** ID Vitahome de la commune → construction-location-id */
  cityId: number | null;
  /** code INSEE → construction-location-insee */
  insee: string | null;
  zip: string;
  dept: string;
  deptCode: string;
  lat: number;
  lng: number;
  houseSurface: number | null;
  bedrooms: number | null;
  rooms: number | null;
  houseName: string | null;
  /** id du modèle Essensya correspondant, si l'annonce porte une maison */
  modelId: string | null;
  planImage: string | null;
  agency: {
    slug: string | null;
    name: string | null;
    phone: string | null;
    email: string | null;
    address: string;
  };
  image: string;
  gallery: string[];
}
