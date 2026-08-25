/* Formes BRUTES du flux Vitahome (onglet DONNEES FLUX du doc
   FLUX_ANNONCES_PROSPECTS). Ne jamais consommer ces types dans l'UI :
   ils passent d'abord par mapAnnonce() → type `Annonce`.            */

export interface VitahomeMedia {
  id: number;
  name: string;
  path: string;
  type: string;
  slug: string;
}

export interface VitahomeLand {
  id: number;
  price: number;
  surface: number;
  isServicing?: string;
  landConfiguration?: string;
  landType?: string;
  landState?: string;
  city: string;
  cityId?: number;
  citySlug?: string;
  /** Number côté Vitahome — à stringifier pour l'affichage. */
  postCode?: number;
  /** String côté Vitahome — à parseFloat. */
  longitude?: string;
  latitude?: string;
  inseeCode?: string;
  departmentName?: string;
  inseeDepartmentCode?: string;
  agencyId?: number;
  agencySlug?: string;
  agencyName?: string;
  agencyPhone?: string;
  agencyEmail?: string;
  agencyAdresse?: string;
  agencyPostcode?: string;
  agencyCity?: string;
  media?: VitahomeMedia[];
}

export interface VitahomeHouse {
  id: number;
  name: string;
  slug: string;
  model: string;
  modelSlug: string;
  area: number;
  bedroomNumber: number;
  roomNumber: number;
  description?: string;
  adImage?: { path: string };
  groundFloorImage?: { path: string };
  media?: VitahomeMedia[];
}

export interface VitahomeAnnonce {
  reference: string;
  price: number;
  title?: string;
  description?: string;
  media?: VitahomeMedia[];
  land: VitahomeLand;
  /** `false` (et non `null`) pour un terrain seul — spec Vitahome. */
  house: VitahomeHouse | false;
}

/** Clés de formulaire → ORIGIN-ID Vitahome. */
export type OriginKey =
  | "model" | "annonceTerrain" | "annonceTM" | "contact"
  | "agence" | "rdv" | "rappel" | "landing";

/** Contexte annonce transporté jusqu'au prospect (champs « IMPORTANT » du doc). */
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
