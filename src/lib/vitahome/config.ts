import "server-only";
import { VERSIONS } from "@/data/essensya";

/* ⚠ Ce module est `server-only` : il ne peut PAS être importé par un
   composant client. C'est la garantie structurelle que le token
   Vitahome n'atteint jamais le navigateur.                          */

export const VITAHOME = {
  base: process.env.VITAHOME_BASE ?? "https://pro.vitahome.fr/api",
  /* ⚠ ACCESSEUR, PAS UNE VALEUR. Une propriété évaluée à la construction
     de l'objet est figée à la COMPILATION : le token finirait dans les
     artefacts de build. Le scanner de secrets de Netlify a déjà fait
     échouer un déploiement pour ce motif sur une autre variable.
     Les appels `VITAHOME.token` ne changent pas d'écriture. */
  get token(): string {
    return process.env.VITAHOME_TOKEN ?? "";
  },
  entityId: Number(process.env.VITAHOME_ENTITY_ID ?? 11), // 11 = MAISONS DEMO
  feeds: { terrain: "pack-26", tm: "pack-1860", maison: "pack-3402" },
  prospectEndpoint: "/ajout-contact.json",
  citiesEndpoint: "/villes.json", // → construction-location-id
  /* ORIGIN-ID par type de formulaire (onglet ENVOI PROSPECT) */
  origins: {
    model: 52,
    annonceTerrain: 53,
    annonceTM: 54,
    contact: 56,
    agence: 71,
    rdv: 74,
    rappel: 122,
    landing: 250,
  },
} as const;

/** Sans token configuré, on reste sur le jeu de démo (dev / preview). */
export const hasLiveFeed = () => VITAHOME.token.length > 0;

/** Durée de cache du flux annonces, en secondes (ISR). */
export const FEED_REVALIDATE = Number(process.env.VITAHOME_REVALIDATE ?? 3600);

/* ════ MAPPING FLUX → DÉCLINAISON ════
   Construit à partir de src/data/essensya.ts : une seule source de vérité.
   Le flux réel (relevé 11/09/2026, 253 annonces) contient :
     modele-c    → 119 annonces  (93,64 m², 3 ch)
     modele-a-1  →  31 annonces  (88,56 m², 2 ch)
     modele-b    →   1 annonce   (88,34 m², 3 ch)
     modeles-de-bruno-lefort-1 → 2 annonces de TEST, à rejeter          */
export const VERSION_SLUG_MAP: Record<string, string> = Object.fromEntries(
  VERSIONS.flatMap((v) => v.vitahomeSlugs.map((s) => [s, v.slug])),
);

/**
 * Aucun slug inconnu ne devient un produit : il vaut mieux ne pas
 * rattacher une annonce à une déclinaison que d'inventer un 3ᵉ modèle.
 */
export const isKnownModelSlug = (slug: string | undefined | null) =>
  !!slug && slug in VERSION_SLUG_MAP;

/* ════ FILTRE DE SANITÉ ════
   Le flux de démonstration contient des annonces de test (« ZZZZZ »,
   9999 m², 9999 chambres) et des prix aberrants. Elles ne doivent
   jamais atteindre une page publique.                                */
export const SANITY = {
  /** En dessous, le prix n'est pas un prix (0, false, 1 €, 999 €…). */
  minPrice: 20_000,
  maxPrice: 2_000_000,
  minLandSurface: 100,
  maxLandSurface: 20_000,
  minHouseSurface: 40,
  maxHouseSurface: 400,
  maxBedrooms: 8,
  /** `type: "M"` = annonce saisie à la main. Les 3 du flux sont les
      3 annonces douteuses — on ne publie que les annonces générées. */
  rejectManualAds: true,
} as const;
