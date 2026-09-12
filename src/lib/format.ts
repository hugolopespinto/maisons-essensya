import type { Annonce, HouseVersion } from "@/types";

const NF = new Intl.NumberFormat("fr-FR");

/** `null` → « Prix sur demande » : le flux contient de vrais trous. */
export const fmtPrice = (n: number | null | undefined) =>
  typeof n === "number" && Number.isFinite(n) ? `${NF.format(Math.round(n))} €` : "Prix sur demande";

/** Surface, arrondie à l'unité. `null` → chaîne vide, jamais « null m² ». */
export const fmtSurface = (n: number | null | undefined) =>
  typeof n === "number" && Number.isFinite(n) ? `${NF.format(Math.round(n))} m²` : "";

/** Mensualité indicative — à n'afficher qu'avec sa mention légale. */
export const fmtMonthly = (n: number | null | undefined) =>
  typeof n === "number" && Number.isFinite(n) ? `${NF.format(Math.round(n))} €/mois` : "";

/* ════ URLS ════ */
export const houseUrl = () => "/maisons";
export const versionUrl = (v: Pick<HouseVersion, "slug">) => `/maisons/${v.slug}`;
export const annonceUrl = (a: Pick<Annonce, "id">) => `/annonces/${a.id.toLowerCase()}`;
export const agencyUrl = (g: { id: string }) => `/agences/${g.id}`;
export const landingUrl = (slug: string) => `/lp/${slug}`;

/* ════ LIBELLÉS ANNONCE ════ */
export const annonceTitle = (a: Annonce) => {
  const s = fmtSurface(a.landSurface);
  return a.type === "terrain"
    ? `Terrain${s ? ` de ${s}` : ""} à ${a.city}`
    : `Maison + terrain à ${a.city}`;
};

/** Specs courtes de carte — n'affiche que ce qui existe réellement. */
export const annonceSpecs = (a: Annonce): string[] => {
  const out: string[] = [];
  if (a.landSurface) out.push(`Terrain ${fmtSurface(a.landSurface)}`);
  if (a.type === "terrain-maison") {
    if (a.houseSurface) out.push(`Maison ${fmtSurface(a.houseSurface)}`);
    if (a.bedrooms) out.push(`${a.bedrooms} ch.`);
  }
  return out;
};

/**
 * Code département. `zip.slice(0,2)` est faux pour la Corse (2A/2B) et
 * les DOM (971…) — on préfère le code INSEE fourni par le flux.
 */
export const dept = (a: Annonce) => {
  if (a.deptCode) return a.deptCode;
  const z = a.zip;
  if (/^9[78]/.test(z)) return z.slice(0, 3);
  if (/^20/.test(z)) return parseInt(z, 10) < 20200 ? "2A" : "2B";
  return z.slice(0, 2);
};

/** Localisation compacte : « La Rochelle (17) ». */
export const locLabel = (a: Annonce) => `${a.city} (${dept(a)})`;

/** Part maison d'une annonce T+M — elle se calcule, `house.price` est toujours null. */
export const housePart = (a: Annonce): number | null =>
  a.price !== null && a.landPrice !== null && a.price > a.landPrice ? a.price - a.landPrice : null;
