import "server-only";

/* ⚠ Ce module est `server-only` : il ne peut PAS être importé par un
   composant client. C'est la garantie structurelle que le token
   Vitahome n'atteint jamais le navigateur (le point de vigilance n°1
   du doc FLUX_ANNONCES_PROSPECTS).                                  */

export const VITAHOME = {
  base: process.env.VITAHOME_BASE ?? "https://pro.vitahome.fr/api",
  token: process.env.VITAHOME_TOKEN ?? "",
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

/** Correspondance slugs modèles Vitahome → collection Essensya. */
export const MODEL_SLUG_MAP: Record<string, string> = {
  essen: "essen-01",
  alba: "alba-02",
  nova: "nova-03",
};
