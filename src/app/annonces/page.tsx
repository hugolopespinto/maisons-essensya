import type { Metadata } from "next";
import FilAriane from "@/components/FilAriane";
import AnnoncesBrowser from "@/components/AnnoncesBrowser";
import { urlCanonique, type Params } from "@/lib/annonces/criteres";
import { rechercherAnnonces } from "@/lib/annonces/recherche";
import { lecteurBlocs } from "@/lib/blocs";
import { annonceTitle, annonceUrl } from "@/lib/format";
import { jsonLd, listeSchema } from "@/lib/schema";
import { resolveMetadata } from "@/lib/seo";
import { getContent } from "@/lib/store";
import { markdownToHtml } from "@/lib/markdown";
import { TEXTE_ANNONCES_TERRAINS, TEXTE_ANNONCES_TERRAIN_MAISON } from "@/data/redactionnel/annonces";
import "@/styles/carte.css";
import "@/styles/prose.css";
import "@/styles/pages/annonces.css";

/* Singulier assumé : il n'y a qu'une maison, c'est le terrain qui change. */
const TITRE = "Terrains & maisons";
const CHAPO =
  "Des terrains à bâtir sélectionnés avec nos partenaires fonciers. Des projets de construction de maison élaborés par nos conseillers habitat dans les Landes, en Gironde et au Pays basque.";


/* Le titre et la description pour Google sont ceux du texte livré par le
   client le 09/11 (Texte_Annonces_terrains.docx et
   Texte_Annonces_terrain-maison.docx), un couple par filtre ?type= : pas de
   texte dédié pour la vue sans filtre, qui reprend celui de "terrain".

   ⚠ `hero.intro`, PAS `hero.chapo` : la base garde en stock l'ancien chapô,
   qui serait servi par-dessus le nouveau (voir `fusionnerPages`). */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Params>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const { criteres } = await rechercherAnnonces(sp);

  const metaParType =
    criteres.type === "terrain-maison"
      ? {
          title: "Annonce terrain + maison : trouvez l'offre adaptée à vos critères",
          description:
            "Annonce terrain + maison dans les Landes, le sud Gironde et le Pays basque côtier : définissez vos critères et trouvez l'offre clé en main qui vous correspond.",
        }
      : {
          title: "Choisir son terrain constructible : critères et conseils",
          description:
            "Choisir son terrain constructible dans les Landes, le sud Gironde ou le Pays basque : urbanisme, viabilisation, sol, risques. Nos conseils d'experts.",
        };

  const meta = await resolveMetadata("/annonces", {
    ...metaParType,
    alternates: { canonical: "/annonces" },
  });

  /* ⚠ LA PAGE 2 N'EST PAS LA PAGE 1. Même titre et même canonique sur
     toutes les pages, ce serait dire à Google qu'elles sont une seule et
     même page — et les annonces des suivantes sortiraient de son index.
     Chacune porte donc son numéro et, hors filtre, sa propre canonique
     (`urlCanonique`). La page 1 garde intacte la surcharge éventuelle du
     back-office. */
  if (criteres.page === 1) return meta;
  return {
    ...meta,
    title: typeof meta.title === "string" ? `${meta.title}, page ${criteres.page}` : meta.title,
    alternates: { ...meta.alternates, canonical: urlCanonique(criteres) },
  };
}

export default async function AnnoncesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  /* ⚠ L'URL est lue ICI, côté serveur, et la recherche s'y fait aussi —
     surtout PAS avec `useSearchParams` dans le composant client.
     `useSearchParams` fait basculer tout son sous-arbre en rendu client :
     les annonces disparaîtraient du HTML servi, et le listing deviendrait
     invisible pour Google. C'est incompatible avec l'engagement « SEO
     nickel » du devis, sur la page qui porte justement toute la longue
     traîne géographique. */
  const sp = await searchParams;
  const [content, resultat] = await Promise.all([getContent(), rechercherAnnonces(sp)]);
  const t = lecteurBlocs(content.pages, "annonces");

  return (
    <main className="page">
      {/* ItemList : dit à Google que la page est un index et dans quel
          ordre. On ne balise que ce que la page rend — sa page de
          résultats, à son rang dans la liste entière. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            listeSchema(
              "Terrains et maisons disponibles",
              resultat.annonces.map(({ annonce }) => ({
                nom: annonceTitle(annonce),
                path: annonceUrl(annonce),
              })),
              { premier: resultat.debut + 1, total: resultat.total },
            ),
          ),
        }}
      />
      <section className="p-head">
        <div className="container">
          <FilAriane
            items={[
              { nom: "Accueil", path: "/" },
              { nom: "Terrains & opportunités" },
            ]}
          />
          <h1>{t("hero.titre", TITRE)}</h1>
          <p style={{ whiteSpace: "pre-line" }}>{t("hero.intro", CHAPO)}</p>
        </div>
      </section>

      <AnnoncesBrowser resultat={resultat} />

      {/* Le texte de référencement, sur la seule première page : répété sur
          les suivantes, il les ferait passer pour des doublons. */}
      {resultat.criteres.page === 1 ? (
        <section className="l-texte">
          <div className="container">
            <div
              className="c-prose"
              dangerouslySetInnerHTML={{
                __html: markdownToHtml(
                  resultat.criteres.type === "terrain-maison"
                    ? TEXTE_ANNONCES_TERRAIN_MAISON
                    : TEXTE_ANNONCES_TERRAINS,
                ),
              }}
            />
          </div>
        </section>
      ) : null}
    </main>
  );
}
