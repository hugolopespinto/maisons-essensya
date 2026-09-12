import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BodyClass from "@/components/BodyClass";
import LeadForm, { ContactFields } from "@/components/LeadForm";
import { MarkedList } from "@/components/SpecList";
import { Icon } from "@/components/icons";
import { ESSENSYA_DATA, HOUSE } from "@/data/essensya";
import { fmtPrice, landingUrl } from "@/lib/format";
import "@/styles/pages/landing.css";

const LANDINGS = ESSENSYA_DATA.landings;

export function generateStaticParams() {
  return Object.keys(LANDINGS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lp = LANDINGS[slug];
  if (!lp) return {};
  return {
    title: lp.title,
    description: lp.subtitle.slice(0, 160),
    alternates: { canonical: landingUrl(slug) },
    // Une landing d'acquisition n'a pas vocation à être indexée.
    robots: { index: false, follow: false },
    openGraph: { title: lp.title, images: [lp.image] },
  };
}

/* Le consentement RGPD n'est plus posé page par page : il vit dans
   <LeadForm>, qui le rend sur les huit formulaires du site. Une landing
   d'acquisition est justement le genre de page qu'on duplique vite — la
   case ne doit pas dépendre de la vigilance de celui qui duplique. */

export default async function LandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lp = LANDINGS[slug];
  if (!lp) notFound();

  return (
    <main className="page">
      {/* lp-mode masque la nav : une landing ne doit offrir qu'une sortie. */}
      <BodyClass name="lp-mode" />

      <section className="lp-hero">
        <div className="lp-hero__bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lp.image} alt={HOUSE.alt} />
        </div>
        <div className="container">
          <div>
            {/* Le seul aplat bois du site : il signale une offre datée,
                pas une urgence fabriquée. */}
            <span className="c-offer">Prix de lancement</span>
            <h1 style={{ marginTop: "var(--s-2)" }}>{lp.title}</h1>
            <p className="lp-hero__sub">{lp.subtitle}</p>
            <div className="lp-hero__price">
              {fmtPrice(lp.price)}
              <small>{lp.priceNote}</small>
            </div>
            <ul className="lp-hero__bullets">
              {lp.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>

          <div className="lp-form-card">
            <h2>{lp.formTitle}</h2>
            <p>{lp.formText}</p>
            <LeadForm
              originKey="landing"
              gtmEvent="lead_landing_request"
              submitLabel="Recevoir le dossier"
              successMessage="Merci — le dossier arrive sous 48 h."
              ctx={{ adContent: `Landing — ${lp.title}` }}
            >
              <ContactFields prefix="lf" />
            </LeadForm>
          </div>
        </div>
      </section>

      {/* Un prix de lancement n'est crédible que si ses exclusions sont
          affichées aussi grand que ses inclusions. */}
      <section className="lp-strip">
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: "var(--s-5)",
            }}
          >
            <div data-reveal>
              <span
                className="c-label c-label--accent"
                style={{ display: "block", marginBottom: "var(--s-2)" }}
              >
                Compris dans le prix
              </span>
              <MarkedList items={HOUSE.included} variant="in" />
            </div>
            <div data-reveal>
              <span
                className="c-label c-label--accent"
                style={{ display: "block", marginBottom: "var(--s-2)" }}
              >
                Non compris
              </span>
              <MarkedList items={HOUSE.excluded} variant="out" />
            </div>
          </div>
        </div>
      </section>

      <section className="lp-strip" style={{ background: "var(--craie)" }}>
        <div className="container">
          <div className="s-trust__grid">
            {ESSENSYA_DATA.trust.map((t) => (
              <div className="s-trust__item" data-reveal key={t.title}>
                <Icon name={t.icon} />
                <h3>{t.title}</h3>
                <p>{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
