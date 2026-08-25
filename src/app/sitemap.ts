import type { MetadataRoute } from "next";
import { AGENCIES, MODELS } from "@/data/essensya";
import { getAnnonces } from "@/lib/vitahome/annonces";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/* Le sitemap se régénère avec le flux : chaque annonce Vitahome devient
   une URL indexable — l'inverse exact du hash-routing du prototype. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const annonces = await getAnnonces();

  const statics = ["", "/maisons", "/annonces", "/agences", "/concept", "/contact"];

  return [
    ...statics.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.8,
    })),
    ...MODELS.map((m) => ({
      url: `${BASE}/maisons/${m.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    ...AGENCIES.map((g) => ({
      url: `${BASE}/agences/${g.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...annonces.map((a) => ({
      url: `${BASE}/annonces/${a.id.toLowerCase()}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
