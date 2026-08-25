import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnnonceCard from "@/components/AnnonceCard";
import LeadForm, { ContactFields } from "@/components/LeadForm";
import { AGENCIES, agencyById } from "@/data/essensya";
import { agencyUrl } from "@/lib/format";
import { getAnnonces } from "@/lib/vitahome/annonces";
import "@/styles/pages/agences.css";
import "@/styles/pages/annonce.css"; // .a-aside — carte formulaire partagée

export function generateStaticParams() {
  return AGENCIES.map((g) => ({ slug: g.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = agencyById(slug);
  if (!g) return {};
  return {
    title: g.name,
    description: g.description.slice(0, 160),
    alternates: { canonical: agencyUrl(g) },
    openGraph: { title: `${g.name} — Maisons Essensya`, images: [g.image] },
  };
}

export default async function AgencyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = agencyById(slug);
  if (!g) notFound();

  const annonces = (await getAnnonces())
    .filter((a) => a.agency.slug === g.id)
    .slice(0, 3);

  return (
    <main className="page">
      <section className="g-hero">
        <div className="g-hero__bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={g.image} alt={g.name} />
        </div>
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <Link href="/agences">Nos agences</Link>
            <span className="sep">/</span>
            <span>{g.zone}</span>
          </nav>
          <span className="c-label" style={{ color: "var(--sable)" }}>
            {g.zone}
          </span>
          <h1>{g.name}</h1>
        </div>
      </section>

      <section className="g-body">
        <div className="container">
          <div>
            <h2 style={{ fontSize: "clamp(1.4rem,2.6vw,2rem)" }} data-reveal>
              Votre interlocuteur local
            </h2>
            <p
              className="u-muted"
              style={{ marginTop: "var(--s-2)", maxWidth: "38em" }}
              data-reveal
            >
              {g.description}
            </p>
            <ul className="g-info" data-reveal>
              <li>
                <span>Adresse</span>
                <span>{g.address}</span>
              </li>
              <li>
                <span>Téléphone</span>
                <span>{g.phone}</span>
              </li>
              <li>
                <span>E-mail</span>
                <span>{g.email}</span>
              </li>
              <li>
                <span>Horaires</span>
                <span>{g.hours}</span>
              </li>
            </ul>
            <div data-reveal>
              <span
                className="c-label c-label--accent"
                style={{ display: "block", margin: "var(--s-4) 0 0" }}
              >
                Communes couvertes
              </span>
              <div className="g-cities">
                {g.cities.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
            </div>
          </div>

          <aside className="a-aside">
            <div className="a-aside__card">
              <h3>Contacter l&apos;agence</h3>
              <p>Un projet dans le secteur {g.zone} ? Réponse sous 48 h.</p>
              <LeadForm
                originKey="agence"
                gtmEvent="lead_agency_request"
                dark
                submitLabel="Être recontacté"
                successMessage={`Merci — ${g.name} vous recontacte sous 48 h.`}
                ctx={{ adContent: `Contact agence — ${g.name}` }}
              >
                <ContactFields prefix="gf" />
              </LeadForm>
            </div>
          </aside>
        </div>
      </section>

      <section className="g-annonces">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">
              En ce moment dans le secteur
            </span>
            <h2>Les opportunités de l&apos;agence</h2>
          </div>
          <div className="m-opps__grid">
            {annonces.map((a) => (
              <AnnonceCard annonce={a} key={a.id} />
            ))}
          </div>
          <div style={{ marginTop: "var(--s-4)" }} data-reveal>
            <Link href="/annonces" className="c-link">
              Voir toutes les opportunités →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
