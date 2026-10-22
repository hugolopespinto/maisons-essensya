import type { AnnonceVignette, PointCarte } from "@/types";

/* ════════════════════════════════════════════════════════════════
   LES CRITÈRES DU LISTING — ce que porte l'URL de /annonces

   Le serveur lit l'URL et cherche (./recherche.ts) ; le navigateur la
   réécrit à chaque filtre (AnnoncesBrowser). Les deux doivent parler la
   même langue au caractère près : c'est en comparant deux requêtes que
   le listing distingue l'écho de son propre choix d'une vraie
   navigation. D'où ce fichier unique — une lecture, une écriture.

   Module partagé client / serveur : aucun import `server-only` ici, et
   rien qui touche au flux.
   ════════════════════════════════════════════════════════════════ */

export const TYPES = ["terrain", "terrain-maison"] as const;
export type TypeAnnonce = (typeof TYPES)[number];

/* ⚠ LE NOMBRE EXACT DE CHAMBRES, PAS UN PLANCHER. Ce filtre est la
   destination des liens « Plans maison N chambres » de la navigation
   (`?chambres=N`) : « 2 chambres » doit montrer des maisons à deux
   chambres, pas aussi celles à trois. De 1 à 4, comme le menu. Le flux
   ne compte aujourd'hui que des 2 et des 3 chambres : 1 et 4 rendent une
   liste vide, que la page explique (`chambresAbsentes`). */
export const CHAMBRES = [1, 2, 3, 4] as const;

export const TRIS = ["recent", "prix-asc", "prix-desc"] as const;
export type Tri = (typeof TRIS)[number];

/** Annonces par page : douze rangées de deux cartes sur grand écran. */
export const PAR_PAGE = 24;

/** Un nom de commune et son code postal y tiennent largement. */
const MAX_RECHERCHE = 80;

/** Une emprise de carte, en degrés. */
export interface Zone {
  nord: number;
  sud: number;
  est: number;
  ouest: number;
}

export interface Criteres {
  /** Commune, code postal ou département, en saisie libre. "" = aucune. */
  q: string;
  type: TypeAnnonce | null;
  /** Code INSEE du département, validé contre le catalogue. */
  dept: string | null;
  chambres: number | null;
  tri: Tri;
  /** À partir de 1. */
  page: number;
  /** La partie de la carte où le visiteur cherche, quand il l'a déplacée. */
  zone: Zone | null;
}

export const CRITERES_VIDES: Criteres = {
  q: "",
  type: null,
  dept: null,
  chambres: null,
  tri: "recent",
  page: 1,
  zone: null,
};

/** La réponse du serveur à une recherche — tout ce que le listing affiche. */
export interface ResultatRecherche {
  /** Les critères APPLIQUÉS : validés, page ramenée dans les bornes. */
  criteres: Criteres;
  /** La page demandée et elle seule, chaque carte avec la fiche qu'elle ouvre. */
  annonces: { annonce: AnnonceVignette; href: string }[];
  /** Annonces retenues, zone de carte comprise. */
  total: number;
  /** Au moins 1, même sans résultat. */
  pages: number;
  /** Rang dans `total` de la première annonce de la page, à partir de 0. */
  debut: number;
  /** TOUTES les annonces retenues, zone ignorée, dès qu'elles sont plaçables :
   *  la carte doit montrer où chercher ailleurs. */
  points: PointCarte[];
  /** Change quand les points changent, et seulement alors. */
  pointsCle: string;
  /** Retenues mais sans coordonnées : dans la liste, absentes de la carte. */
  sansCoordonnees: number;
  /** [code, nom] de chaque département du catalogue, pour le menu. */
  departements: [string, string][];
  /** Aucune parcelle du catalogue n'a ce nombre de chambres, où que ce soit. */
  chambresAbsentes: boolean;
}

/** Les `searchParams` d'une page, tels que Next les livre. */
export type Params = Record<string, string | string[] | undefined>;

const premier = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Espaces resserrés, longueur bornée : la recherche libre telle qu'on la cherche. */
export const normaliserRecherche = (s: string) =>
  s.replace(/\s+/g, " ").trim().slice(0, MAX_RECHERCHE).trim();

/* ════ LA ZONE DE CARTE ════
   Quatre décimales, une dizaine de mètres : assez pour une carte, et
   l'URL reste lisible. L'arrondi se fait VERS L'EXTÉRIEUR — un point
   visible au bord de la carte ne doit pas sortir de la zone — et il est
   idempotent : la marge de 1e-6 absorbe l'erreur de virgule flottante
   (46.1234 × 1e4 = 461233,99999999994), sans quoi chaque aller-retour
   par l'URL rognerait la zone d'un cran et ferait croire au listing
   qu'on vient d'ailleurs. */
const bas = (n: number) => Math.floor(n * 1e4 + 1e-6) / 1e4;
const haut = (n: number) => Math.ceil(n * 1e4 - 1e-6) / 1e4;

/** Une vue de carte bornée au monde réel — Leaflet sert des longitudes
 *  au-delà de ±180 quand on dézoome — et arrondie. */
export function cadrer(v: Zone): Zone {
  return {
    nord: haut(Math.min(90, v.nord)),
    sud: bas(Math.max(-90, v.sud)),
    est: haut(Math.min(180, v.est)),
    ouest: bas(Math.max(-180, v.ouest)),
  };
}

export const dansZone = (z: Zone, lat: number, lng: number) =>
  lat >= z.sud && lat <= z.nord && lng >= z.ouest && lng <= z.est;

const texteZone = (z: Zone) => `${z.sud},${z.ouest},${z.nord},${z.est}`;

export const memeZone = (a: Zone | null, b: Zone | null) =>
  a === b || (!!a && !!b && texteZone(a) === texteZone(b));

/** `sud,ouest,nord,est` → zone, ou `null` si la valeur ne décrit pas une emprise. */
function lireZone(v: string): Zone | null {
  const n = v.split(",").map((x) => (x.trim() ? Number(x) : NaN));
  if (n.length !== 4 || !n.every(Number.isFinite)) return null;
  const [sud, ouest, nord, est] = n;
  const z = cadrer({ sud, ouest, nord, est });
  return z.sud < z.nord && z.ouest < z.est ? z : null;
}

/**
 * La zone à appliquer pour une vue de carte — ou aucune, quand tous les
 * points y sont déjà : elle ne filtrerait rien, et l'URL reste propre.
 */
export function zoneUtile(vue: Zone, points: readonly { lat: number; lng: number }[]): Zone | null {
  const z = cadrer(vue);
  return points.every((p) => dansZone(z, p.lat, p.lng)) ? null : z;
}

/* ════ LIRE ════ */

/**
 * Les critères que l'URL demande, re-validés : une URL forgée à la main
 * ne doit pas produire un filtre inconnu. Une valeur invalide est
 * IGNORÉE, jamais une erreur — l'ancienne `?max=` du budget retiré, une
 * valeur « all » envoyée par le formulaire sans JavaScript, un `utm_…`
 * de campagne : la page s'affiche, simplement sans ce critère.
 *
 * @param departements les codes connus du catalogue : un département
 *   sans annonce n'est pas un filtre, c'est une liste vide inexpliquée.
 */
export function lireCriteres(sp: Params, departements: readonly string[]): Criteres {
  const type = premier(sp.type);
  const dept = premier(sp.dept);
  const chambres = Number(premier(sp.chambres));
  const tri = premier(sp.tri);
  const page = premier(sp.page);
  return {
    q: normaliserRecherche(premier(sp.q)),
    type: (TYPES as readonly string[]).includes(type) ? (type as TypeAnnonce) : null,
    dept: dept && departements.includes(dept) ? dept : null,
    chambres: (CHAMBRES as readonly number[]).includes(chambres) ? chambres : null,
    tri: (TRIS as readonly string[]).includes(tri) ? (tri as Tri) : "recent",
    /* Des chiffres et rien d'autre : `Number` accepterait « 1e3 » ou « 0x2 ». */
    page: /^\d{1,6}$/.test(page) ? Math.max(1, Number(page)) : 1,
    zone: lireZone(premier(sp.zone)),
  };
}

/* ════ ÉCRIRE ════ */

/**
 * La query qui décrit ces critères. L'ordre des paramètres est fixe :
 * deux requêtes se comparent comme deux chaînes. Les valeurs par défaut
 * n'y figurent pas — la page 1, le tri « plus récentes ».
 */
export function requeteDe(c: Criteres): string {
  const p = new URLSearchParams();
  if (c.q) p.set("q", c.q);
  if (c.type) p.set("type", c.type);
  if (c.dept) p.set("dept", c.dept);
  if (c.chambres !== null) p.set("chambres", String(c.chambres));
  if (c.tri !== "recent") p.set("tri", c.tri);
  if (c.zone) p.set("zone", texteZone(c.zone));
  if (c.page > 1) p.set("page", String(c.page));
  /* Une virgule ne risque rien dans une query : on la laisse lisible. */
  return p.toString().replace(/%2C/gi, ",");
}

export const urlAnnonces = (c: Criteres) => {
  const qs = requeteDe(c);
  return qs ? `/annonces?${qs}` : "/annonces";
};

/** Les critères qui restreignent le catalogue — le tri et la page n'en sont pas. */
export const estFiltre = (c: Criteres) =>
  !!(c.q || c.type || c.dept || c.chambres !== null || c.zone);

/**
 * L'URL canonique d'une vue du listing.
 *
 * Une page 2, 3… du catalogue entier est SA PROPRE canonique : la
 * pointer vers la page 1, c'est dire à Google d'ignorer les annonces
 * qu'elle seule liste. Une vue filtrée ou triée, elle, renvoie au
 * listing, comme avant la pagination — ses combinaisons sont sans fin,
 * et chaque annonce a déjà sa fiche au sitemap.
 */
export const urlCanonique = (c: Criteres) =>
  !estFiltre(c) && c.tri === "recent" && c.page > 1 ? `/annonces?page=${c.page}` : "/annonces";
