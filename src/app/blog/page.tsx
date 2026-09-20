import type { Metadata } from "next";
import Link from "next/link";
import FilAriane from "@/components/FilAriane";
import { articlesPublies } from "@/lib/blog";
import { getContent } from "@/lib/store";
import { markdownToText } from "@/lib/markdown";
import "@/styles/pages/blog.css";
import { resolveMetadata } from "@/lib/seo";

/* ════════════════════════════════════════════════════════════════
   LE BLOG — POURQUOI IL A SA PLACE ICI

   Le site est un mono-produit : six pages commerciales, une maison, un
   prix. Ces pages captent les requêtes de marque (« maisons essensya »)
   et, au mieux, les requêtes produit (« maison plain-pied 3 chambres
   prix »). Elles ne peuvent pas capter le reste — et le reste est le
   gros du volume.

   Quand quelqu'un fait construire, il cherche pendant des mois avant de
   contacter un constructeur, et il cherche autre chose qu'un catalogue :
     · « prix construction maison Landes »
     · « CCMI : ce qui est couvert »
     · « combien coûte un terrain viabilisé »
     · « faut-il un apport pour faire construire »
   Ce sont des requêtes informationnelles à fort volume, à intention
   commerciale différée, et sur lesquelles une page produit ne se
   positionnera jamais : Google n'y attend pas une fiche, il y attend une
   réponse. Un article les capte, et ramène un visiteur bien plus tôt
   dans son parcours — au moment où le choix du constructeur est encore
   ouvert.

   Second effet, moins visible et tout aussi utile : ces articles
   alimentent le maillage interne vers /maisons, /concept et /annonces.
   Un site de six pages n'a presque aucun maillage ; c'est l'une des
   raisons pour lesquelles il plafonne.

   C'est aussi, très concrètement, la seule partie du site que le client
   peut faire vivre seul entre deux interventions. D'où le back-office.
   ════════════════════════════════════════════════════════════════ */

/* Le back-office peut surcharger le titre, la description, l'image de
   partage, le canonical et le noindex de cette page — écran
   Référencement. `resolveMetadata` repart TOUJOURS du défaut ci-dessous :
   une surcharge vidée rend la valeur d'origine, elle n'efface jamais
   la balise. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/blog", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  /* 41 signes au maximum : le gabarit ajoute « — Maisons Essensya », et
     la version longue sortait à 72, coupée par Google. */
  title: "Le journal — construire sans surprise",
  description:
    "Prix, contrat CCMI, terrain, financement : ce qu'il faut savoir avant de " +
    "faire construire sa maison, expliqué simplement par nos équipes.",
  alternates: { canonical: "/blog" },
};


/** Date lisible, ou rien — un article mal daté ne doit pas afficher « Invalid Date ». */
const fmtDate = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

export default async function BlogPage() {
  const { articles } = await getContent();
  const liste = articlesPublies(articles);

  /* ⚠ LE `BreadcrumbList` ÉCRIT À LA MAIN A ÉTÉ RETIRÉ D'ICI. Cette page
     en déclarait un, à la main, en recopiant des libellés que le fil
     d'ariane juste en dessous écrivait déjà — et sans passer par
     `filAriane()`, qui existait pourtant. Depuis que <FilAriane> émet le
     JSON-LD depuis la même liste que celle qu'il affiche, en garder un
     ici publiait DEUX BreadcrumbList sur la page. */

  return (
    <main className="page">

      <section className="p-head">
        <div className="container">
          <FilAriane items={[{ nom: "Accueil", path: "/" }, { nom: "Le journal" }]} />
          <h1>Le journal</h1>
          <p>
            Faire construire soulève toujours les mêmes questions : ce que couvre
            le contrat, ce que coûte vraiment un terrain, ce qui se cache derrière
            un prix d&apos;appel. On y répond ici, sans détour.
          </p>
        </div>
      </section>

      <section className="bl-list">
        <div className="container">
          {liste.length === 0 ? (
            /* État vide soigné : c'est le premier écran que verra le client,
               avant d'avoir écrit quoi que ce soit. Une grille vide donnerait
               l'impression d'une page cassée. */
            <div className="bl-empty" data-reveal>
              <span className="bl-empty__label">Bientôt</span>
              <h2>Les premiers articles arrivent</h2>
              <p>
                Prix, contrat CCMI, terrain, financement : nous préparons les
                réponses aux questions que l&apos;on nous pose le plus souvent. En
                attendant, tout ce qui concerne la maison et son prix est déjà
                détaillé sur la fiche produit.
              </p>
              <Link href="/maisons" className="c-btn">
                Voir la maison <span className="arrow">→</span>
              </Link>
            </div>
          ) : (
            <div className="bl-grid">
              {liste.map((a) => (
                <Link key={a.slug} href={`/blog/${a.slug}`} className="bl-card" data-reveal>
                  {a.image ? (
                    <div className="bl-card__media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.image} alt={a.imageAlt ?? ""} loading="lazy" />
                    </div>
                  ) : (
                    /* Pas d'illustration : une plaque typographique plutôt qu'une
                       photo d'illustration achetée qui ne dit rien du sujet. */
                    <div className="bl-card__plate" aria-hidden="true">
                      {a.titre.trim().charAt(0) || "E"}
                    </div>
                  )}
                  <div className="bl-card__body">
                    <span className="bl-card__date">{fmtDate(a.publieLe)}</span>
                    <h2 className="bl-card__title">{a.titre}</h2>
                    <p className="bl-card__chapo">
                      {a.chapo || markdownToText(a.corps, 140)}
                    </p>
                    <span className="bl-card__more">
                      Lire <span className="arrow">→</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
