import { annonceUrl } from "@/lib/format";
import type { Annonce, Offre } from "@/types";

/* ════════════════════════════════════════════════════════════════
   LES VERSIONS D'UNE PARCELLE

   ⚠ UNE ANNONCE PORTE PLUSIEURS MAISONS. Le flux publie une annonce par
   couple terrain × maison, et `groupByParcel` (src/lib/vitahome/
   annonces.ts) les réunit sous une seule : le terrain nu, la maison
   2 chambres, la maison 3 chambres. L'annonce regroupée porte les
   chiffres de la MOINS CHÈRE — c'est son « à partir de ».

   Dès qu'on cherche une maison à N chambres, ces chiffres-là sont faux
   pour toute parcelle dont la version à N chambres n'est pas la moins
   chère. Ce module est le SEUL endroit qui sait remplacer les chiffres
   de l'annonce par ceux d'une version : le listing filtré et la fiche de
   version l'appellent tous les deux, et ne peuvent donc pas afficher
   deux maisons différentes pour la même carte.

   Module partagé client / serveur : aucun import `server-only` ici.
   ════════════════════════════════════════════════════════════════ */

/** Le segment d'URL d'une version : « 1-chambre », « 3-chambres ». */
export const slugChambres = (n: number) => `${n}-chambre${n > 1 ? "s" : ""}`;

/** L'inverse de `slugChambres`, et rien d'autre : « 2-chambre » ou
 *  « 02-chambres » rendent `null`, pour qu'une version n'ait qu'une URL. */
export function chambresDuSlug(segment: string): number | null {
  const m = /^([1-9])-chambres?$/.exec(segment);
  if (!m) return null;
  const n = Number(m[1]);
  return slugChambres(n) === segment ? n : null;
}

/** La version la moins chère de la parcelle qui a exactement `n` chambres. */
export function offreAChambres(a: Annonce, n: number): Offre | null {
  return (
    a.offres
      .filter((o) => o.bedrooms === n)
      .sort((x, y) => (x.price ?? Infinity) - (y.price ?? Infinity))[0] ?? null
  );
}

/**
 * L'annonce telle qu'elle se présente dans une version donnée : prix,
 * maison, plan ET référence sont ceux de cette offre. La référence
 * compte : c'est elle que le formulaire envoie au commercial, qui doit
 * retrouver dans son CRM la maison que le visiteur a choisie.
 *
 * Ni le prix ni le plan n'héritent de l'annonce quand l'offre n'en a
 * pas : ce seraient ceux d'une autre maison. « Prix sur demande » et
 * l'absence de plan valent mieux qu'une maison qui change en route.
 */
export function projeterOffre(a: Annonce, offre: Offre): Annonce {
  /* Le visuel de la carte est souvent un plan (9 annonces sur 10 n'ont
     pas de photo) : s'il est celui d'une autre version, il part avec
     elle. Une vraie photo de la parcelle, elle, reste. */
  const plans = new Set(a.offres.map((o) => o.planImage).filter(Boolean));
  const image = a.image && plans.has(a.image) ? offre.planImage : a.image;
  return {
    ...a,
    ref: offre.ref,
    /* Le texte du flux décrit LA maison de l'offre (surface, chambres) :
       celui d'une autre version contredirait les chiffres affichés. Vide,
       la fiche écrit sa phrase de repli plutôt que d'emprunter. */
    title: offre.title,
    description: offre.description,
    type: offre.houseSurface !== null || offre.versionSlug !== null ? "terrain-maison" : "terrain",
    price: offre.price,
    houseSurface: offre.houseSurface,
    bedrooms: offre.bedrooms,
    rooms: offre.rooms,
    garageArea: offre.garageArea,
    versionSlug: offre.versionSlug,
    planImage: offre.planImage,
    image,
  };
}

/** L'annonce dans sa version à `n` chambres, ou `null` si la parcelle
 *  n'en propose pas. */
export function versionAChambres(a: Annonce, n: number): Annonce | null {
  const offre = offreAChambres(a, n);
  if (offre) return projeterOffre(a, offre);
  /* Une annonce sans offres détaillées ne se juge que sur ses chiffres. */
  return a.offres.length === 0 && a.bedrooms === n ? a : null;
}

/**
 * La fiche ordinaire montre-t-elle déjà exactement cette offre ?
 *
 * ⚠ PAS SEULEMENT « LA MOINS CHÈRE A N CHAMBRES ». `groupByParcel` mêle
 * deux offres dans l'annonce regroupée : les chiffres viennent de la
 * moins chère, mais la référence, le visuel et le texte viennent d'une
 * offre « représentante », qui peut être une autre. Renvoyer vers la
 * fiche ordinaire sur la seule foi du nombre de chambres affichait la
 * référence et le plan d'une autre maison — et envoyait cette référence
 * au commercial.
 */
const ficheOrdinaireMontre = (a: Annonce, offre: Offre) =>
  offre.ref === a.ref &&
  offre.price === a.price &&
  offre.bedrooms === a.bedrooms &&
  offre.versionSlug === a.versionSlug;

/**
 * L'adresse de la fiche qui montre cette version : la fiche ordinaire
 * quand elle la montre déjà telle quelle, plutôt que de multiplier les
 * URL d'une même page ; sinon la fiche de version.
 */
export function urlVersion(a: Annonce, n: number): string {
  const offre = offreAChambres(a, n);
  return !offre || ficheOrdinaireMontre(a, offre)
    ? annonceUrl(a)
    : `${annonceUrl(a)}/${slugChambres(n)}`;
}

/** Les nombres de chambres qui ont besoin de leur propre fiche — ceux
 *  que `urlVersion` envoie ailleurs que sur la fiche ordinaire. */
export function versionsAvecFiche(a: Annonce): number[] {
  const nombres = new Set(
    a.offres
      .map((o) => o.bedrooms)
      .filter((n): n is number => n !== null && chambresDuSlug(slugChambres(n)) !== null),
  );
  return [...nombres].filter((n) => urlVersion(a, n) !== annonceUrl(a));
}
