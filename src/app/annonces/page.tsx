import type { Metadata } from "next";
import FilAriane from "@/components/FilAriane";
import AnnoncesBrowser from "@/components/AnnoncesBrowser";
import { lecteurBlocs } from "@/lib/blocs";
import { annonceTitle } from "@/lib/format";
import { jsonLd, listeSchema } from "@/lib/schema";
import { resolveMetadata } from "@/lib/seo";
import { getContent } from "@/lib/store";
import { getAnnonces } from "@/lib/vitahome/annonces";
import "@/styles/pages/annonces.css";

/* Singulier assumé : il n'y a qu'une maison, c'est le terrain qui change. */
const TITRE = "Terrains & maisons";
const CHAPO =
  "Des terrains repérés par nos agences, seuls ou livrés avec la maison Essensya. Le lieu change, la maison ne change pas — et son prix non plus.";


/* Le chapô est affiché ET servi à Google : sans cela, le client corrige
   l'accroche de la page et la description des résultats de recherche
   continue d'annoncer l'ancienne — c'est ce que promet l'aide du champ. */
export async function generateMetadata(): Promise<Metadata> {
  const { pages } = await getContent();
  const t = lecteurBlocs(pages, "annonces");
  return resolveMetadata("/annonces", {
    title: "Terrains & maisons disponibles",
    description: t("hero.chapo", CHAPO),
    alternates: { canonical: "/annonces" },
  });
}

/** Un seul endroit lit l'URL, et c'est le serveur. */
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AnnoncesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [content, annonces, sp] = await Promise.all([
    getContent(),
    getAnnonces(),
    searchParams,
  ]);
  const t = lecteurBlocs(content.pages, "annonces");

  return (
    <main className="page">
      {/* ItemList : dit à Google que la page est un index et dans quel
          ordre. On ne balise que les 20 premières — ce qui est réellement
          rendu au chargement, pas le catalogue entier. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            listeSchema(
              "Terrains et maisons disponibles",
              annonces.slice(0, 20).map((a) => ({
                nom: annonceTitle(a),
                path: `/annonces/${a.id.toLowerCase()}`,
              })),
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

      {/* ⚠ Les filtres initiaux sont lus ICI, côté serveur, et passés en
          props — surtout PAS avec `useSearchParams` dans le composant
          client. `useSearchParams` fait basculer tout son sous-arbre en
          rendu client : les annonces disparaissent alors du HTML servi,
          et le listing devient invisible pour Google. C'est incompatible
          avec l'engagement « SEO nickel » du devis, sur la page qui porte
          justement toute la longue traîne géographique. */}
      <AnnoncesBrowser
        annonces={annonces}
        initial={{
          q: first(sp.q),
          type: first(sp.type),
          dept: first(sp.dept),
          maxPrice: first(sp.max),
        }}
      />
    </main>
  );
}
