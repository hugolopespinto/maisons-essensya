import type { Annonce, Model } from "@/types";

export const fmtPrice = (n: number) =>
  `${new Intl.NumberFormat("fr-FR").format(n)} €`;

/* ════ URLS ════
   Plus de hash-routing : de vraies URLs, indexables et partageables. */
export const modelUrl = (m: Pick<Model, "id">) => `/maisons/${m.id}`;
export const annonceUrl = (a: Pick<Annonce, "id">) =>
  `/annonces/${a.id.toLowerCase()}`;
export const agencyUrl = (g: { id: string }) => `/agences/${g.id}`;
export const landingUrl = (slug: string) => `/lp/${slug}`;

export const annonceTitle = (a: Annonce, modelName?: string | null) =>
  a.type === "terrain"
    ? `Terrain à ${a.city}`
    : `Terrain + ${modelName ?? a.houseName ?? "maison"} à ${a.city}`;

export const annonceSpecs = (a: Annonce) =>
  a.type === "terrain"
    ? `Terrain ${a.landSurface} m²`
    : `Terrain ${a.landSurface} m² · Maison ${a.houseSurface} m²`;

export const dept = (a: Annonce) => a.zip.slice(0, 2);
