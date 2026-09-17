import type { MetadataRoute } from "next";
import { modelesPubliables } from "@/data/gamme";
import { agencesPubliees } from "@/lib/agences";
import { articlesPublies } from "@/lib/blog";
import { communeUrl, deptUrl } from "@/lib/format";
import { communesPubliables, departementsPubliables } from "@/lib/geo";
import { getContent } from "@/lib/store";
import { getAnnonces } from "@/lib/vitahome/annonces";
import { SITE_URL } from "@/lib/site-url";

const BASE = SITE_URL;

/* Priorités : /maisons vaut l'accueil. C'est la page qui porte le prix
   et la gamme entière, et c'est elle que les requêtes de marque doivent
   atteindre — pas une page d'accueil de marque.
   Les fiches de modèle restent en 0.6. L'argument d'origine — onze pages
   bâties sur le même gabarit cannibaliseraient /maisons — ne vaut plus
   tel quel, puisqu'une seule est indexée. Il redeviendra vrai à mesure
   que les caractéristiques arriveront, et d'ici là /maisons reste la
   page qui doit capter les requêtes de gamme. */
const STATICS: [string, number][] = [
  ["", 1],
  ["/maisons", 1],
  ["/annonces", 0.8],
  ["/terrains", 0.8],
  ["/realisations", 0.8],
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
  const [annonces, depts, { articles }, agences] = await Promise.all([
    getAnnonces(),
    /* ⚠ `departementsPubliables()`, PAS `geographie()`. Le sitemap est une
       promesse faite à Google : chaque URL qu'il annonce doit répondre.
       Les zones sous le seuil rendent 404 — les lister ferait remonter
       des erreurs dans la Search Console au lieu de pages. */
    departementsPubliables(),
    getContent(),
    /* ⚠ LES AGENCES PUBLIÉES, PAS LA CONSTANTE DU CODE. Le sitemap lisait
       `AGENCIES`, c'est-à-dire l'agence de démonstration écrite en dur.
       Le jour où le client saisit ses vraies agences dans le back-office,
       la constante cesse de s'appliquer aux pages — mais le sitemap, lui,
       aurait continué d'annoncer à Google une fiche qui rend 404, en
       passant sous silence les vraies. Une promesse faite à Google se lit
       à la même source que les pages. */
    agencesPubliees(),
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
    /* ⚠ `modelesPubliables()`, PAS tous les modèles. Le sitemap est une
       promesse : une fiche sans surface ni prix n'est qu'une galerie, et
       en annoncer dix d'un coup fait exactement ce que Google sanctionne.
       Elles portent d'ailleurs `noindex` — les lister ici serait se
       contredire. La liste contient Ankara depuis le 17/09, et se
       remplira toute seule à mesure que les caractéristiques arriveront.

       ⚠ L'`ItemList` DE /maisons, LUI, ANNONCE LES ONZE, et c'est
       délibéré : un ItemList décrit ce que la page REND, il ne demande
       pas l'indexation. N'en lister qu'un sur onze sous-décrirait la
       page. Les deux fichiers ont dit le contraire l'un de l'autre assez
       longtemps ; la règle est écrite des deux côtés. */
    ...modelesPubliables().map((m) => ({
      url: `${BASE}/maisons/${m.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...agences.map((g) => ({
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
