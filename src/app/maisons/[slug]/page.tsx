import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnnonceCard from "@/components/AnnonceCard";
import LeadForm, { ContactFields } from "@/components/LeadForm";
import Plate from "@/components/Plate";
import SpecList, { MarkedList } from "@/components/SpecList";
import { HOUSE, VERSIONS, otherVersion, versionBySlug } from "@/data/essensya";
import { fmtPrice, fmtSurface, versionUrl, houseUrl } from "@/lib/format";
import { filAriane, jsonLd, produitMaison } from "@/lib/schema";
import { resolveMetadata } from "@/lib/seo";
import { getAnnonces } from "@/lib/vitahome/annonces";
import type { Annonce, HouseVersion } from "@/types";
import "@/styles/pages/modele.css";

/* Deux pages seulement, connues au build : 3 chambres et 2 chambres. */
export function generateStaticParams() {
  return VERSIONS.map((v) => ({ slug: v.slug }));
}

/* ⚠ Fiche volontairement courte et strictement factuelle : la visite,
   l'argumentaire, l'architecture et le comparatif restent sur /maisons et
   ne sont pas recopiés ici. Si, après validation du contenu par le client,
   la page reste aussi mince, il faudra sans doute la passer en `robots:
   noindex` avec un canonical vers /maisons — arbitrage éditorial à prendre
   avec le client, pas une décision technique à poser ici. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const v = versionBySlug(slug);
  if (!v) return {};
  /* Chaque déclinaison a sa propre entrée dans l'écran Référencement :
     le client peut donc écrire un titre différent pour la 2 et la
     3 chambres, ce qui est exactement le cas où deux pages proches
     risquent sinon de se cannibaliser dans les résultats. */
  return resolveMetadata(versionUrl(v), {
    title: `${HOUSE.name} — ${v.label}, ${fmtSurface(v.surface)}`,
    description: v.pour,
    alternates: { canonical: versionUrl(v) },
    openGraph: {
      title: `${HOUSE.name} — ${v.label} · Maisons Essensya`,
      images: [v.image],
    },
  });
}

/** L'écart chiffré avec l'autre déclinaison : la seule chose qui les sépare. */
function ecartRows(v: HouseVersion, other: HouseVersion | null): [string, ReactNode][] {
  const rows: [string, ReactNode][] = [
    ["Surface", fmtSurface(v.surface)],
    ["Chambres", String(v.bedrooms)],
    ["Pièces", String(v.rooms)],
    ["Garage", fmtSurface(v.garageArea)],
  ];
  if (other) {
    const ds = v.surface - other.surface;
    const db = v.bedrooms - other.bedrooms;
    rows.push([
      `Écart / ${other.label}`,
      `${ds >= 0 ? "+" : "−"}${fmtSurface(Math.abs(ds))} · ${db >= 0 ? "+" : "−"}${Math.abs(db)} chambre`,
    ]);
  }
  return rows;
}

export default async function VersionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const v = versionBySlug(slug);
  if (!v) notFound();

  const other = otherVersion(v.slug);

  /* Les annonces qui portent cette déclinaison d'abord ; on complète avec
     des terrains seuls, qui acceptent indifféremment l'une ou l'autre. */
  const annonces = await getAnnonces();
  const compatibles = annonces.filter((a) => a.versionSlug === v.slug);
  const vus = new Set(compatibles.map((a) => a.id));
  const opps: Annonce[] = [
    ...compatibles,
    ...annonces.filter((a) => a.type === "terrain" && !vus.has(a.id)),
  ].slice(0, 3);
  const aDesTerrainsSeuls = opps.some((a) => a.type === "terrain");

  return (
    <main className="page">
      {/* Product de CETTE déclinaison : un seul prix, celui affiché plus
          bas. Sur la page /maisons, c'est au contraire une offre groupée
          sur les deux — la granularité suit ce que la page montre. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(produitMaison(v)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            filAriane([
              { nom: "Accueil", path: "/" },
              { nom: `La maison ${HOUSE.name}`, path: houseUrl() },
              { nom: v.label },
            ]),
          ),
        }}
      />
      <section className="m-hero">
        <div className="m-hero__bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v.image} alt={v.alt} />
        </div>
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <Link href="/maisons">La maison</Link>
            <span className="sep">/</span>
            <span>{v.label}</span>
          </nav>
          <span className="c-label" style={{ color: "var(--sable)" }}>
            Déclinaison
          </span>
          <h1>
            {HOUSE.name} — {v.label}
          </h1>
          {/* Le prix est dans la plaque : il se lit sans scroller. */}
          <div className="c-plate">
            <Plate version={v} withName={false} withGarage />
          </div>
        </div>
      </section>

      <section className="m-quote">
        <div className="container">
          <span className="c-label c-label--accent" data-reveal>
            Pour qui
          </span>
          <p data-reveal>{v.pour}</p>

          {/* L'information la plus utile de la page : ce qui change, et
              surtout ce qui ne change pas. Grille 7/5 déjà au design system. */}
          <div className="m-plan__grid" style={{ marginTop: "var(--s-6)" }}>
            <div>
              <span className="c-label" data-reveal>
                La différence
              </span>
              <p className="u-measure" data-reveal style={{ marginTop: "var(--s-2)" }}>
                {v.difference}
              </p>
              <p className="u-measure u-muted" data-reveal>
                Le séjour traversant, la cuisine aménagée, la terrasse couverte,
                les matériaux et les garanties sont les mêmes dans les deux
                déclinaisons. Le nombre de chambres est le seul arbitrage
                qu&apos;on vous demande.
              </p>
            </div>
            <div data-reveal>
              <SpecList rows={ecartRows(v, other)} />
            </div>
          </div>
        </div>
      </section>

      <section className="m-plan">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">Le plan</span>
            <h2>Le détail des surfaces</h2>
          </div>
          <div className="m-plan__grid">
            <div className="c-reveal-img">
              {/* Un plan se lit en entier : `contain`, jamais `cover`. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.planImage}
                alt={`Plan du rez-de-chaussée — ${HOUSE.name} en ${v.label}, ${fmtSurface(v.surface)}`}
                loading="lazy"
                style={{ objectFit: "contain", background: "var(--craie)" }}
              />
            </div>
            <div data-reveal>
              <SpecList rows={v.rooms_detail} />
            </div>
          </div>
        </div>
      </section>

      <section className="m-price" id="prix">
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
            <div className="c-price-xl" data-reveal style={{ marginTop: "var(--s-4)" }}>
              <span className="from">À partir de</span>
              {fmtPrice(v.priceFrom)}
              <small>Maison seule, hors terrain</small>
            </div>
            <p className="m-price__note" data-reveal>
              Prix indicatif selon le terrain et le département. Chiffrage précis
              dès le premier rendez-vous, puis figé par le contrat CCMI.
            </p>
          </div>
          <div>
            <span
              className="c-label"
              data-reveal
              style={{ display: "block", marginBottom: "var(--s-2)" }}
            >
              Compris dans le prix
            </span>
            <div data-reveal>
              <MarkedList items={HOUSE.included} variant="in" />
            </div>
            {/* Le pendant obligatoire de la liste précédente : taire les
                exclusions détruit la crédibilité d'un prix bas. */}
            <span
              className="c-label"
              data-reveal
              style={{
                display: "block",
                marginTop: "var(--s-4)",
                marginBottom: "var(--s-2)",
              }}
            >
              Non compris
            </span>
            <div data-reveal>
              <MarkedList items={HOUSE.excluded} variant="out" />
            </div>
          </div>
        </div>
      </section>

      <section className="m-features" style={{ paddingTop: "var(--s-7)" }}>
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">Les prestations</span>
            <h2>Identiques aux deux déclinaisons</h2>
          </div>
          <p className="u-measure u-muted" data-reveal>
            Elles sont attachées à la maison, pas au plan : choisir 2 ou 3
            chambres ne change ni les matériaux, ni les équipements, ni les
            garanties.
          </p>
          <div data-reveal style={{ marginTop: "var(--s-4)", maxWidth: "46em" }}>
            <SpecList rows={HOUSE.materials} />
          </div>
        </div>
      </section>

      <section className="m-opps">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">Où la construire</span>
            <h2>Terrains compatibles</h2>
          </div>
          {opps.length > 0 ? (
            <>
              <div className="m-opps__grid">
                {opps.map((a) => (
                  <AnnonceCard annonce={a} key={a.id} />
                ))}
              </div>
              {aDesTerrainsSeuls && (
                <p className="m-price__note" data-reveal>
                  Les terrains seuls accueillent indifféremment la {v.label} ou la{" "}
                  {other?.label ?? "seconde déclinaison"} : l&apos;emprise au sol
                  est la même à quelques mètres près.
                </p>
              )}
            </>
          ) : (
            <p className="u-measure u-muted" data-reveal>
              Aucun terrain n&apos;est disponible en ligne pour le moment. Nos
              agences en repèrent chaque semaine, souvent avant leur mise sur le
              marché.
            </p>
          )}
          <div data-reveal style={{ marginTop: "var(--s-4)" }}>
            <Link href="/annonces" className="c-link">
              Voir tous les terrains →
            </Link>
          </div>
        </div>
      </section>

      <section className="s-cta">
        <div className="container s-cta__grid">
          <div>
            <span className="c-label" data-reveal>
              Votre projet
            </span>
            <h2 data-reveal>Recevoir le plan {v.label}</h2>
            <p data-reveal>
              Le plan coté, le détail des surfaces, ce qui est compris et ce qui
              ne l&apos;est pas, et les terrains compatibles de votre secteur.
              Réponse sous 48 h.
            </p>
          </div>
          <div data-reveal>
            {/* `originKey` pilote l'ORIGIN-ID Vitahome : c'est une clé de flux,
                pas un mot de la page — le site ne parle jamais de « modèle ». */}
            <LeadForm
              originKey="model"
              gtmEvent="lead_model_request"
              dark
              submitLabel="Recevoir le plan"
              successMessage={`Merci — une agence Essensya vous envoie le plan ${v.label} sous 48 h.`}
              ctx={{
                adContent: `${HOUSE.name} — déclinaison ${v.label} — ${fmtSurface(
                  v.surface,
                )}, ${v.bedrooms} chambres — à partir de ${fmtPrice(v.priceFrom)}`,
              }}
            >
              <ContactFields prefix="mv" />
            </LeadForm>
          </div>
        </div>
      </section>

      {other && (
        <section className="m-next">
          <div className="container">
            <Link href={versionUrl(other)}>
              <span>
                <span className="m-next__label">
                  L&apos;autre déclinaison — {fmtSurface(other.surface)}
                </span>
                <div className="m-next__name">{other.label}</div>
              </span>
              <span className="m-next__name" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
