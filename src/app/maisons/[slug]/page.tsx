import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnnonceCard from "@/components/AnnonceCard";
import Plate from "@/components/Plate";
import { AGENCIES, MODELS, modelById } from "@/data/essensya";
import { fmtPrice, modelUrl } from "@/lib/format";
import { getAnnonces } from "@/lib/vitahome/annonces";
import "@/styles/pages/modele.css";

/* Les 3 modèles sont connus au build → pages statiques, instantanées. */
export function generateStaticParams() {
  return MODELS.map((m) => ({ slug: m.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const m = modelById(slug);
  if (!m) return {};
  return {
    title: `${m.name} — ${m.surface} m², ${m.bedrooms} chambres`,
    description: m.tagline,
    alternates: { canonical: modelUrl(m) },
    openGraph: { title: `${m.name} — Maisons Essensya`, images: [m.heroImage] },
  };
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const m = modelById(slug);
  if (!m) notFound();

  const next = MODELS[(MODELS.indexOf(m) + 1) % MODELS.length];
  const annonces = await getAnnonces();
  const opps = annonces
    .filter((a) => a.modelId === m.id || a.type === "terrain")
    .slice(0, 3);
  const agency = AGENCIES[0];
  const [g1, g2, g3] = m.gallery;

  return (
    <main className="page">
      <section className="m-hero">
        <div className="m-hero__bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.heroImage} alt={m.alt} />
        </div>
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <Link href="/maisons">Maisons</Link>
            <span className="sep">/</span>
            <span>{m.name}</span>
          </nav>
          <span className="c-label" style={{ color: "var(--sable)" }}>
            Modèle {m.index}
          </span>
          <h1>{m.name}</h1>
          <div className="c-plate">
            <Plate model={m} withName={false} />
          </div>
        </div>
      </section>

      <section className="m-quote">
        <div className="container">
          <span className="c-label c-label--accent" data-reveal>
            La philosophie du modèle
          </span>
          <p data-reveal>{m.philosophy}</p>
        </div>
      </section>

      <section className="m-gallery">
        <div className="container">
          <figure className="m-gallery__main">
            <div className="c-reveal-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g1.src} alt={g1.alt} loading="lazy" />
            </div>
            <figcaption className="caption" data-reveal>
              {g1.caption}
            </figcaption>
          </figure>
          <div className="m-gallery__duo">
            {[g2, g3].map((g) => (
              <figure key={g.src}>
                <div className="c-reveal-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.src} alt={g.alt} loading="lazy" />
                </div>
                <figcaption className="caption" data-reveal>
                  {g.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="m-arch">
        <div className="container m-arch__grid">
          <div className="c-reveal-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.archImage}
              alt={`Détail architectural du modèle ${m.name}`}
              loading="lazy"
            />
          </div>
          <div>
            <span className="c-label" data-reveal>
              Architecture
            </span>
            <h2 data-reveal style={{ marginTop: "var(--s-2)" }}>
              Un volume précis
            </h2>
            <p data-reveal>{m.archText}</p>
            <ul className="m-arch__materials" data-reveal>
              {m.materials.map(([k, v]) => (
                <li key={k}>
                  <span>{k}</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="m-plan">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">Le plan</span>
            <h2>{m.surface} m² qui travaillent</h2>
          </div>
          <div className="m-plan__grid">
            <div className="c-reveal-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.planImage}
                alt={`Plan architectural du modèle ${m.name}`}
                loading="lazy"
              />
            </div>
            <ul className="m-plan__rooms" data-reveal>
              {m.rooms.map(([k, v]) => (
                <li key={k}>
                  <span>{k}</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="m-features">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">Caractéristiques</span>
            <h2>Ce qui fait {m.name}</h2>
          </div>
          <div className="m-features__grid">
            {m.features.map((x) => (
              <div className="m-features__item" data-reveal key={x.t}>
                <b>{x.t}</b>
                {x.d}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="m-price">
        <div className="container m-price__grid">
          <div>
            <span className="c-label c-label--accent" data-reveal>
              Le prix
            </span>
            <h2 data-reveal style={{ marginTop: "var(--s-2)" }}>
              Un prix annoncé,
              <br />
              un prix tenu
            </h2>
            <div className="m-price__amount" data-reveal>
              {fmtPrice(m.priceFrom)}
              <small>Maison seule, hors terrain — à partir de</small>
            </div>
            <p className="m-price__note" data-reveal>
              Prix indicatif selon terrain et département. Chiffrage précis et définitif
              dès le premier rendez-vous.
            </p>
          </div>
          <div>
            <span
              className="c-label"
              data-reveal
              style={{ display: "block", marginBottom: "var(--s-2)" }}
            >
              Inclus dans le prix
            </span>
            <ul className="m-price__included">
              {m.included.map((i) => (
                <li data-reveal key={i}>
                  {i}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="m-opps">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">Construire {m.name}</span>
            <h2>Opportunités compatibles</h2>
          </div>
          <div className="m-opps__grid">
            {opps.map((a) => (
              <AnnonceCard annonce={a} key={a.id} />
            ))}
          </div>
          <div className="m-agency" data-reveal>
            <div>
              <span className="c-label c-label--accent">Votre agence</span>
              <div className="m-agency__name">{agency.name}</div>
              <div className="m-agency__meta">
                {agency.address} · {agency.phone}
              </div>
            </div>
            <Link href="/contact" className="c-btn c-btn--solid">
              Parler de mon projet <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="m-next">
        <div className="container">
          <Link href={modelUrl(next)}>
            <span>
              <span className="m-next__label">Modèle suivant — {next.index}</span>
              <div className="m-next__name">{next.name}</div>
            </span>
            <span className="m-next__name" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
