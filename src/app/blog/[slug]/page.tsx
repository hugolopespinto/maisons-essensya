import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { markdownToHtml, markdownToText } from "@/lib/markdown";
import { articlesPublies } from "@/lib/blog";
import { getContent } from "@/lib/store";
import type { Article } from "@/lib/store/types";
import { SITE_URL } from "@/lib/site-url";
import "@/styles/pages/blog.css";

/* ════════════════════════════════════════════════════════════════
   PAGE ARTICLE

   Deux exigences non négociables, dans cet ordre :

   1. UN BROUILLON N'EST JAMAIS SERVI. Pas « masqué de la liste » :
      absent. Une URL de brouillon est devinable (le slug dérive du
      titre), et une page devinable finit toujours par être crawlée —
      via un partage, une barre d'adresse synchronisée, un lien
      copié-collé dans un mail. Le filtre est donc appliqué ici, à la
      résolution de l'article, et pas seulement sur la page liste.

      L'aperçu des brouillons vit dans le back-office
      (/admin/blog/<slug>?apercu=1), qui est authentifié et en
      `force-dynamic`. C'est aussi ce qui permet à cette page-ci de
      rester entièrement statique : lire un cookie ou un paramètre
      d'URL ici basculerait TOUTE la route en rendu dynamique, et on
      paierait pour tous les visiteurs le confort d'un seul relecteur.

   2. LA PAGE EST STATIQUE. `generateStaticParams` pré-rend les articles
      publiés ; les nouveaux sont générés à la demande puis mis en
      cache. Les Server Actions du back-office appellent
      `revalidatePath` sur /blog et sur l'article modifié.
   ════════════════════════════════════════════════════════════════ */

const BASE = SITE_URL;

async function getArticle(slug: string): Promise<Article | null> {
  const { articles } = await getContent();
  return articlesPublies(articles).find((a) => a.slug === slug) ?? null;
}

const fmtDate = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

/** Minutes de lecture — 230 mots/min, arrondi au plus proche, plancher à 1. */
const lecture = (corps: string): number =>
  Math.max(1, Math.round(markdownToText(corps).split(/\s+/).filter(Boolean).length / 230));

export async function generateStaticParams() {
  const { articles } = await getContent();
  return articlesPublies(articles).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) return {};

  /* Le bloc SEO du back-office prime ; sinon on retombe sur l'éditorial.
     Une description vide vaut mieux qu'une description dupliquée, mais un
     chapô vaut toujours mieux qu'une description vide. */
  const description =
    a.seo?.description?.trim() || a.chapo.trim() || markdownToText(a.corps, 155);

  return {
    title: a.seo?.title?.trim() || a.titre,
    description,
    alternates: { canonical: `/blog/${a.slug}` },
    openGraph: {
      type: "article",
      title: a.seo?.title?.trim() || a.titre,
      description,
      publishedTime: a.publieLe,
      ...(a.image ? { images: [a.image] } : {}),
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = await getArticle(slug);
  /* Brouillon, article inexistant ou slug vide : 404, sans distinction.
     Répondre différemment renseignerait un curieux sur ce qui se prépare. */
  if (!a) notFound();

  const { articles } = await getContent();
  const autres = articlesPublies(articles)
    .filter((x) => x.slug !== a.slug)
    .slice(0, 3);

  const corps = markdownToHtml(a.corps);
  const date = fmtDate(a.publieLe);

  /* JSON-LD — `BlogPosting` rend l'article éligible aux résultats enrichis
     (date, auteur, vignette), `BreadcrumbList` remplace l'URL nue par le
     fil d'ariane dans la SERP. Les deux sont dans un seul graphe : une
     seule balise à lire, un seul endroit à corriger. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: a.titre,
        description: a.chapo || markdownToText(a.corps, 155),
        datePublished: a.publieLe,
        mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE}/blog/${a.slug}` },
        author: a.auteur
          ? { "@type": "Person", name: a.auteur }
          : { "@type": "Organization", name: "Maisons Essensya" },
        publisher: { "@type": "Organization", name: "Maisons Essensya", url: BASE },
        ...(a.image ? { image: [a.image] } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: BASE },
          { "@type": "ListItem", position: 2, name: "Le journal", item: `${BASE}/blog` },
          {
            "@type": "ListItem",
            position: 3,
            name: a.titre,
            item: `${BASE}/blog/${a.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <main className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <article className="bl-article">
        <div className="container">
          <header className="bl-article__head">
            <nav className="c-breadcrumb" aria-label="Fil d'ariane">
              <Link href="/">Accueil</Link>
              <span className="sep">/</span>
              <Link href="/blog">Le journal</Link>
              <span className="sep">/</span>
              <span>{a.titre}</span>
            </nav>
            <h1>{a.titre}</h1>
            {a.chapo ? <p className="bl-article__chapo">{a.chapo}</p> : null}
            <div className="bl-meta">
              {date ? <time dateTime={a.publieLe}>{date}</time> : null}
              {a.auteur ? <span>{a.auteur}</span> : null}
              <span>{lecture(a.corps)} min de lecture</span>
            </div>
          </header>

          {a.image ? (
            <figure className="bl-article__media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.image} alt={a.imageAlt ?? ""} />
              {a.imageAlt ? <figcaption>{a.imageAlt}</figcaption> : null}
            </figure>
          ) : null}

          {/* Le seul `dangerouslySetInnerHTML` de contenu du site. Le HTML
              vient de `markdownToHtml`, qui échappe l'intégralité de la
              saisie AVANT d'émettre ses propres balises — voir la note de
              stratégie en tête de src/lib/markdown.ts. */}
          <div className="bl-prose" dangerouslySetInnerHTML={{ __html: corps }} />

          <footer className="bl-foot">
            <Link href="/blog" className="c-link">
              ← Tous les articles
            </Link>
            <Link href="/contact" className="c-btn c-btn--solid">
              Parler de mon projet <span className="arrow">→</span>
            </Link>
          </footer>
        </div>
      </article>

      {autres.length > 0 ? (
        <section className="bl-more">
          <div className="container">
            <div className="c-section-head" data-reveal>
              <span className="c-label c-label--accent">À lire aussi</span>
              <h2>Dans le journal</h2>
            </div>
            <div className="bl-grid">
              {autres.map((x) => (
                <Link key={x.slug} href={`/blog/${x.slug}`} className="bl-card" data-reveal>
                  {x.image ? (
                    <div className="bl-card__media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={x.image} alt={x.imageAlt ?? ""} loading="lazy" />
                    </div>
                  ) : (
                    <div className="bl-card__plate" aria-hidden="true">
                      {x.titre.trim().charAt(0) || "E"}
                    </div>
                  )}
                  <div className="bl-card__body">
                    <span className="bl-card__date">{fmtDate(x.publieLe)}</span>
                    <h3 className="bl-card__title">{x.titre}</h3>
                    <p className="bl-card__chapo">
                      {x.chapo || markdownToText(x.corps, 120)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
