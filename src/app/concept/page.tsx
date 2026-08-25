import type { Metadata } from "next";
import Link from "next/link";
import { ESSENSYA_DATA } from "@/data/essensya";
import "@/styles/pages/concept.css";

export const metadata: Metadata = {
  title: "Notre concept — la maison catalogue bien pensée",
  description:
    "Pourquoi des maisons catalogues, pourquoi si peu de modèles, et pourquoi c'est une bonne nouvelle pour votre budget.",
  alternates: { canonical: "/concept" },
};

const c = ESSENSYA_DATA.concept;

export default function ConceptPage() {
  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>Notre concept</span>
          </nav>
          <h1>Le concept Essensya</h1>
          <p>
            Pourquoi des maisons catalogues, pourquoi si peu de modèles, et pourquoi
            c&apos;est une bonne nouvelle pour votre budget.
          </p>
        </div>
      </section>

      <section className="pc-manifesto">
        <div className="container">
          <span
            className="c-label c-label--accent"
            data-reveal
            style={{ display: "block", marginBottom: "var(--s-3)" }}
          >
            Le manifeste
          </span>
          <p data-reveal>{c.manifesto}</p>
        </div>
      </section>

      <section className="pc-figures">
        <div className="container">
          <span
            className="c-label"
            style={{
              color: "var(--sable)",
              opacity: 0.65,
              display: "block",
              marginBottom: "var(--s-3)",
            }}
            data-reveal
          >
            En chiffres
          </span>
          <div className="pc-figures__grid">
            {c.figures.map(([b, s]) => (
              <div className="pc-figure" data-reveal key={b}>
                <b>{b}</b>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="s-philo"
        style={{ background: "var(--craie)", color: "var(--anthracite)" }}
      >
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">La méthode</span>
            <h2>
              Moins de choix.
              <br />
              Mieux choisis.
            </h2>
          </div>
          <div className="s-philo__grid" style={{ borderColor: "var(--beton)" }}>
            {ESSENSYA_DATA.philosophy.map((i) => (
              <div className="s-philo__item" data-reveal key={i.num}>
                <span className="s-philo__num">{i.num}</span>
                <h3>{i.title}</h3>
                <p>{i.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="s-steps">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">Comment ça marche</span>
            <h2>Du modèle au projet</h2>
          </div>
          <div className="s-steps__list">
            {ESSENSYA_DATA.steps.map((i) => (
              <div className="s-steps__item" data-reveal key={i.num}>
                <span className="s-steps__num">{i.num}</span>
                <h3>{i.title}</h3>
                <p>{i.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pc-commit" id="engagements">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">Nos engagements</span>
            <h2>Écrits noir sur blanc</h2>
          </div>
          <div className="pc-commit__list">
            {c.commitments.map((x, i) => (
              <div className="pc-commit__item" data-reveal key={x.t}>
                <span className="pc-commit__num">0{i + 1}</span>
                <h3>{x.t}</h3>
                <p>{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="s-cta">
        <div className="container" style={{ textAlign: "center" }}>
          <span className="c-label" style={{ color: "var(--bois)" }} data-reveal>
            Et maintenant
          </span>
          <h2 data-reveal style={{ margin: "var(--s-2) auto 0", maxWidth: "16ch" }}>
            Découvrez les maisons
          </h2>
          <div
            style={{
              marginTop: "var(--s-4)",
              display: "flex",
              gap: "var(--s-2)",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
            data-reveal
          >
            <Link href="/maisons" className="c-btn c-btn--light">
              Voir la collection <span className="arrow">→</span>
            </Link>
            <Link
              href="/contact"
              className="c-btn c-btn--light"
              style={{ borderColor: "rgba(243,241,236,.35)" }}
            >
              Parler de mon projet
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
