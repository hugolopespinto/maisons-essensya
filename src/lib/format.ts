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

/* Pages de zone. Le slug est calculé par `slug()` dans src/lib/geo.ts,
   qui est `server-only` — ces deux fonctions ne prennent donc que des
   chaînes déjà calculées, pour rester utilisables depuis un composant
   client comme le pied de page. */
export const deptUrl = (slugDept: string) => `/terrains/${slugDept}`;
export const communeUrl = (slugDept: string, slugCommune: string) =>
  `/terrains/${slugDept}/${slugCommune}`;

/**
 * Le numéro de téléphone réellement publiable.
 *
 * ⚠ DEUX PAGES L'IGNORAIENT. `/contact` et les mentions légales
 * affichaient `PLACEHOLDER.phone` — « 05 46 00 00 00 », le numéro de
 * démonstration — en dur, alors que le client peut saisir le sien dans
 * Réglages et que l'en-tête comme le pied de page le reprenaient déjà.
 * Le back-office écrivait donc dans le vide sur les deux pages où ce
 * numéro compte le plus : celle qui sert à appeler, et celle qui
 * l'affiche au titre d'une obligation légale.
 *
 * L'ordre est celui du gabarit racine : Réglages, puis Textes du site,
 * puis le numéro de démonstration en dernier recours — pour que la page
 * ne serve jamais un trou.
 */
export const telephonePublie = (
  reglages: { telephone?: string },
  textes: { telephone?: string },
  defaut: string,
): string => reglages.telephone?.trim() || textes.telephone?.trim() || defaut;

/**
 * L'adresse de contact réellement publiable.
 *
 * ⚠ MÊME DÉFAUT QUE LE TÉLÉPHONE, UN CRAN PLUS GRAVE. Les deux pages
 * légales lisaient `AGENCIES[0].email` — l'adresse de l'agence de
 * démonstration — dans une constante recopiée d'un fichier à l'autre,
 * pendant que le client pouvait saisir la sienne dans Réglages. Le
 * téléphone a été réparé au commit 0c3ee62 ; l'adresse était restée.
 *
 * Or ce n'est pas une coordonnée d'agrément : tant que le champ « contact
 * RGPD » est vide, c'est par elle que s'exercent les droits d'accès et
 * d'effacement. Une demande d'effacement partait donc vers une boîte
 * dont personne ne garantit qu'elle est relevée, pendant que le délai
 * légal d'un mois courait.
 */
export const emailPublie = (reglages: { email?: string }, defaut: string): string =>
  reglages.email?.trim() || defaut;

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
