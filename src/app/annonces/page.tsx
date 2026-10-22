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
import "@/styles/carte.css";
import "@/styles/pages/annonces.css";

/* Singulier assumé : il n'y a qu'une maison, c'est le terrain qui change. */
const TITRE = "Terrains & maisons";
const CHAPO =
  "Des terrains repérés par nos agences, seuls ou livrés avec la maison Essensya. Le lieu change, la maison ne change pas — et son prix non plus.";


/* Le chapô est affiché ET servi à Google : sans cela, le client corrige
   l'accroche de la page et la description des résultats de recherche
   continue d'annoncer l'ancienne — c'est ce que promet l'aide du champ. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Params>;
}): Promise<Metadata> {
  const [{ pages }, sp] = await Promise.all([getContent(), searchParams]);
  const t = lecteurBlocs(pages, "annonces");
  const meta = await resolveMetadata("/annonces", {
    title: "Terrains & maisons disponibles",
    description: t("hero.chapo", CHAPO),
    alternates: { canonical: "/annonces" },
  });

  /* ⚠ LA PAGE 2 N'EST PAS LA PAGE 1. Même titre et même canonique sur
     toutes les pages, ce serait dire à Google qu'elles sont une seule et
     même page — et les annonces des suivantes sortiraient de son index.
     Chacune porte donc son numéro et, hors filtre, sa propre canonique
     (`urlCanonique`). La page 1 garde intacte la surcharge éventuelle du
     back-office. */
  const { criteres } = await rechercherAnnonces(sp);
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
          <p style={{ whiteSpace: "pre-line" }}>{t("hero.chapo", CHAPO)}</p>
        </div>
      </section>

      <AnnoncesBrowser resultat={resultat} />
    </main>
  );
}
