import type { MetadataRoute } from "next";
import { AGENCIES, VERSIONS } from "@/data/essensya";
import { articlesPublies } from "@/lib/blog";
import { communeUrl, deptUrl } from "@/lib/format";
import { communesPubliables, departementsPubliables } from "@/lib/geo";
import { getContent } from "@/lib/store";
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
  ["/terrains", 0.8],
  ["/agences", 0.8],
  ["/concept", 0.7],
  ["/contact", 0.7],
  /* Le blog manquait purement et simplement : ses articles étaient en
     ligne, indexables, et absents du seul fichier qui dit à Google
     qu'ils existent. */
  ["/blog", 0.6],
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
  const [annonces, depts, { articles }] = await Promise.all([
    getAnnonces(),
    /* ⚠ `departementsPubliables()`, PAS `geographie()`. Le sitemap est une
       promesse faite à Google : chaque URL qu'il annonce doit répondre.
       Les zones sous le seuil rendent 404 — les lister ferait remonter
       des erreurs dans la Search Console au lieu de pages. */
    departementsPubliables(),
    getContent(),
  ]);

  const communes = depts.flatMap((d) =>
    communesPubliables(d).map((c) => ({ dept: d, commune: c })),
  );

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

    /* ════ PAGES DE ZONE ════
       Le gisement de requêtes locales — « terrain à bâtir la rochelle ».
       La commune passe DEVANT le département : l'intention d'achat y est
       plus nette, et c'est la page la plus susceptible de convertir.
       Elles suivent le stock, donc `weekly` : un terrain vendu change
       leurs chiffres sans changer leur URL. */
    ...depts.map((d) => ({
      url: `${BASE}${deptUrl(d.slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...communes.map(({ dept, commune }) => ({
      url: `${BASE}${communeUrl(dept.slug, commune.slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),

    /* ════ ARTICLES ════
       `articlesPublies` et rien d'autre : un brouillon annoncé au
       sitemap est un brouillon indexé, et le retirer prend des semaines
       (voir src/lib/blog.ts). */
    ...articlesPublies(articles).map((a) => ({
      url: `${BASE}/blog/${a.slug}`,
      lastModified: when(a.publieLe ?? null),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
