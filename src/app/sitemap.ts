import type { MetadataRoute } from "next";
import { AGENCIES, VERSIONS } from "@/data/essensya";
import { getAnnonces } from "@/lib/vitahome/annonces";
import { SITE_URL } from "@/lib/site-url";

const BASE = SITE_URL;

/* Priorités : /maisons vaut l'accueil. C'est la page qui porte le prix,
   et sur un mono-produit c'est elle que les requêtes de marque doivent
   atteindre — pas une page d'accueil de marque.
   Les deux déclinaisons restent en 0.6 : ce ne sont pas deux produits,
   les remonter cannibaliserait /maisons avec du contenu quasi identique. */
const STATICS: [string, number][] = [
  ["", 1],
  ["/maisons", 1],
  ["/annonces", 0.8],
  ["/agences", 0.8],
  ["/concept", 0.7],
  ["/contact", 0.7],
  /* Pages légales : indexables — un visiteur qui cherche « mentions
     légales Essensya » doit les trouver — mais en priorité plancher.
     Elles ne portent aucune requête commerciale. */
  ["/mentions-legales", 0.2],
  ["/confidentialite", 0.2],
];

/** Date exploitable, ou rien — le flux sert parfois des chaînes vides. */
const when = (iso: string | null) => {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/* Le sitemap se régénère avec le flux : chaque annonce Vitahome devient
   une URL indexable — l'inverse exact du hash-routing du prototype. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const annonces = await getAnnonces();

  return [
    ...STATICS.map(([path, priority]) => ({
      url: `${BASE}${path}`,
      changeFrequency: "weekly" as const,
      priority,
    })),
    ...VERSIONS.map((v) => ({
      url: `${BASE}/maisons/${v.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...AGENCIES.map((g) => ({
      url: `${BASE}/agences/${g.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...annonces.map((a) => ({
      url: `${BASE}/annonces/${a.id.toLowerCase()}`,
      // Le flux date ses annonces : autant l'annoncer aux crawlers.
      lastModified: when(a.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
