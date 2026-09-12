/* Formes BRUTES du flux Vitahome. Ne jamais consommer ces types dans
   l'UI : ils passent d'abord par mapAnnonce() → type `Annonce`.

   ⚠ Relevé effectué le 11/09/2026 sur les 3 flux live (253 annonces).
   Les pièges confirmés sur les données réelles sont annotés.        */

export interface VitahomeMedia {
  id: number;
  name: string;
  path: string;
  type: string;
  slug: number | string;
}

export interface VitahomeSubdivision {
  name?: string | null;
  teaserTitle?: string | null;
  content?: string | null;
  address?: string | null;
  city?: string | null;
}

export interface VitahomeLand {
  id: number;
  price?: number | false | null;
  surface?: number | null;
  extraContent?: string;
  isServicing?: string;
  /** Texte long de viabilisation — engage le constructeur, à afficher. */
  isServicingLong?: string;
  landConfiguration?: string;
  landType?: string;
  landState?: string;
  lotNumber?: string | null;
  isPriority?: boolean;
  isExclusive?: boolean;
  tags?: string[];
  homeSubdivision?: VitahomeSubdivision | null;
  city: string;
  /** Casse correcte (« La Rochelle ») — préférer à `city` qui est en capitales. */
  cityName?: string;
  cityId?: number;
  citySlug?: string;
  /** ⚠ String dans le flux réel (« 17000 »), pas un Number. */
  postCode?: string | number;
  /** ⚠ String côté Vitahome — à parseFloat. */
  longitude?: string;
  latitude?: string;
  inseeCode?: string;
  departmentName?: string;
  inseeDepartmentCode?: string;
  /** `dd/MM/yyyy HH:mm:ss` — la seule date exploitable pour le tri. */
  updatedAt?: string;
  commercialName?: string;
  commercialPhone?: string | null;
  commercialEmail?: string | null;
  agencyId?: number;
  agencySlug?: string;
  agencyName?: string;
  agencyPhone?: string;
  agencyEmail?: string;
  agencyAdresse?: string;
  agencyPostcode?: string | number;
  agencyCity?: string;
  media?: VitahomeMedia[];
}

export interface VitahomeHouse {
  id: number;
  name: string;
  slug: string;
  model: string;
  modelSlug: string;
  projectType?: number;
  area?: number | null;
  groundFloorArea?: number | null;
  garageArea?: number | null;
  bedroomNumber?: number | null;
  roomNumber?: number | null;
  description?: string;
  /** ⚠ `null` sur 103/103 en T+M : la part maison se calcule, elle ne se lit pas. */
  price?: number | null;
  planTypePrice?: number | null;
  prixpublic?: string | null;
  video?: string | null;
  adImage?: { path: string } | false | null;
  groundFloorImage?: { path: string } | false | null;
  floorImage?: { path: string } | false | null;
  media?: VitahomeMedia[];
}

export interface VitahomeAnnonce {
  reference: string;
  internalReference?: string;
  /** ⚠ Peut valoir `false` (booléen) ou 0 — voir SANITY.minPrice. */
  price?: number | false | null;
  priceTotalVariousPrice?: number | false | null;
  priceWithAllPrice?: number | false | null;
  title?: string;
  description?: string;
  /** Mentions légales de l'annonce. Obligatoire à l'affichage (253/253). */
  mention?: string;
  /** Contact commercial, chaîne pré-formatée — à NE PAS rendre brute. */
  signature?: string;
  /** "A" = annonce générée · "M" = saisie manuelle (les 3 sont des tests). */
  type?: string;
  manualAdId?: number;
  /** ⚠ Objet {date, timezone_type, timezone}, PAS une string. */
  dateAd?: { date?: string } | string | null;
  media?: VitahomeMedia[];
  land: VitahomeLand;
  /** `false` (et non `null`) pour un terrain seul — spec Vitahome. */
  house: VitahomeHouse | false | null;
}

/** Clés de formulaire → ORIGIN-ID Vitahome. */
export type OriginKey =
  | "model" | "annonceTerrain" | "annonceTM" | "contact"
  | "agence" | "rdv" | "rappel" | "landing";

/** Contexte annonce transporté jusqu'au prospect (champs « IMPORTANT »). */
export interface ProspectContext {
  cityId?: number | null;
  insee?: string | null;
  adContent?: string | null;
  link?: string | null;
}

export interface ProspectFields {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  zone?: string;
  stage?: string;
  [k: string]: string | undefined;
}
