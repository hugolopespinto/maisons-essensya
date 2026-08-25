import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LeadForm, { ContactFields } from "@/components/LeadForm";
import { Picto } from "@/components/icons";
import { AGENCIES, modelById } from "@/data/essensya";
import { agencyUrl, annonceTitle, annonceUrl, dept, fmtPrice, modelUrl } from "@/lib/format";
import { getAnnonceByRef, getAnnonces } from "@/lib/vitahome/annonces";
import "@/styles/pages/annonce.css";

const FILLER = [
  "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1444858291040-58f756a3bdd6?q=80&w=1200&auto=format&fit=crop",
];

/* Le flux bouge : on pré-rend les annonces connues au build et on laisse
   Next générer les nouvelles à la demande (ISR). */
export async function generateStaticParams() {
  const annonces = await getAnnonces();
  return annonces.map((a) => ({ ref: a.id.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ref: string }>;
}): Promise<Metadata> {
  const { ref } = await params;
  const a = await getAnnonceByRef(ref);
  if (!a) return {};
  const title = annonceTitle(a, a.modelId ? modelById(a.modelId)?.name : null);
  return {
    title: `${title} — ${fmtPrice(a.price)}`,
    description: a.description.slice(0, 160),
    alternates: { canonical: annonceUrl(a) },
    openGraph: { title, images: [a.image] },
  };
}

export default async function AnnoncePage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const a = await getAnnonceByRef(ref);
  if (!a) notFound();

  const m = a.modelId ? modelById(a.modelId) : null;
  const agencyPage = AGENCIES.find((x) => x.id === a.agency.slug) ?? null;
  const isTM = a.type === "terrain-maison";
  const title = annonceTitle(a, m?.name);

  const gallery =
    a.gallery.length >= 3
      ? a.gallery.slice(0, 3)
      : isTM && m
        ? [a.image, m.gallery[0].src, m.gallery[1].src]
        : [a.image, ...FILLER];

  return (
    <main className="page">
      <section className="a-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <Link href="/annonces">Terrains &amp; opportunités</Link>
            <span className="sep">/</span>
            <span>{a.city}</span>
          </nav>
          <div className="a-head__top">
            <div>
              <span className={`c-tag${isTM ? "" : " c-tag--terrain"}`}>
                {isTM ? "Terrain + maison" : "Terrain"}
              </span>
              <h1 style={{ marginTop: "var(--s-2)" }}>{title}</h1>
            </div>
            <div className="a-head__price">
              {fmtPrice(a.price)}
              <small>à partir de — réf. {a.ref}</small>
            </div>
          </div>
          <div className="c-pictos">
            {isTM && (
              <>
                <Picto icon="surface" value={`${a.houseSurface} m²`} label="Maison" />
                <Picto icon="bed" value={a.bedrooms ?? 0} label="Chambres" />
              </>
            )}
            <Picto icon="land" value={`${a.landSurface} m²`} label="Terrain" />
            <Picto
              icon="loc"
              value={`${a.city} (${dept(a)})`}
              label="Localisation"
            />
            <Picto icon="price" value={fmtPrice(a.price)} label="À partir de" />
          </div>
        </div>
      </section>

      <section className="a-gallery">
        <div className="container">
          <div className="c-reveal-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gallery[0]} alt={title} loading="lazy" />
          </div>
          <div className="a-gallery__side">
            {gallery.slice(1, 3).map((src) => (
              <div className="c-reveal-img" key={src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Visuel complémentaire" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="a-body">
        <div className="container">
          <div className="a-content">
            <h2>L&apos;opportunité</h2>
            <p>{a.description}</p>

            <ul className="a-land">
              <li>
                <span>Terrain</span>
                <span>
                  {a.landSurface} m²
                  {a.servicing ? ` · ${a.servicing.toLowerCase()}` : ""}
                </span>
              </li>
              {a.landConfiguration && (
                <li>
                  <span>Configuration</span>
                  <span>
                    {a.landConfiguration}
                    {a.landType ? ` · ${a.landType}` : ""}
                  </span>
                </li>
              )}
              <li>
                <span>Secteur</span>
                <span>
                  {a.city} ({a.zip}) — {a.dept}
                </span>
              </li>
              {isTM ? (
                <li>
                  <span>Maison</span>
                  <span>
                    {m ? m.name : a.houseName} — {a.houseSurface} m², {a.bedrooms}{" "}
                    chambres
                  </span>
                </li>
              ) : (
                <li>
                  <span>Compatibilité</span>
                  <span>Tous les modèles de la collection</span>
                </li>
              )}
              {isTM && a.landPrice && (
                <li>
                  <span>Dont terrain</span>
                  <span>{fmtPrice(a.landPrice)}</span>
                </li>
              )}
              <li>
                <span>Prix</span>
                <span>
                  à partir de {fmtPrice(a.price)}{" "}
                  {isTM ? "(terrain + maison, hors frais annexes)" : "(terrain seul)"}
                </span>
              </li>
            </ul>

            {m ? (
              <Link className="a-model" href={modelUrl(m)}>
                <div className="a-model__media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.image} alt={m.alt} loading="lazy" />
                </div>
                <div className="a-model__body">
                  <span className="c-label c-label--accent">Le modèle associé</span>
                  <div className="a-model__name">
                    {m.name} — {m.index}
                  </div>
                  <div className="a-model__meta">
                    {m.surface} m² · {m.bedrooms} chambres · à partir de{" "}
                    {fmtPrice(m.priceFrom)}
                  </div>
                  <span className="c-link">Découvrir {m.name} →</span>
                </div>
              </Link>
            ) : (
              <div style={{ marginTop: "var(--s-5)" }}>
                <span
                  className="c-label c-label--accent"
                  style={{ display: "block", marginBottom: "var(--s-2)" }}
                >
                  Quelle maison sur ce terrain ?
                </span>
                <p className="u-muted u-measure">
                  Ce terrain est compatible avec l&apos;ensemble de la collection. Votre
                  agence réalise gratuitement l&apos;étude d&apos;implantation du modèle
                  de votre choix.
                </p>
                <Link href="/maisons" className="c-link" style={{ marginTop: "var(--s-2)" }}>
                  Voir les modèles →
                </Link>
              </div>
            )}
          </div>

          <aside className="a-aside">
            <div className="a-aside__card">
              <span className="a-aside__ref">Réf. {a.ref}</span>
              <h3>Intéressé par cette opportunité&nbsp;?</h3>
              <p>
                Une réponse de votre agence sous 48 h. Visite du terrain et étude
                d&apos;implantation gratuites.
              </p>
              {/* ORIGIN-ID 53 (terrain) ou 54 (T+M) + champs « IMPORTANT » du doc */}
              <LeadForm
                originKey={isTM ? "annonceTM" : "annonceTerrain"}
                gtmEvent="lead_annonce_request"
                dark
                submitLabel="Être recontacté"
                successMessage={`Merci — ${a.agency.name ?? "votre agence"} vous recontacte sous 48 h au sujet de la réf. ${a.ref}.`}
                ctx={{
                  cityId: a.cityId,
                  insee: a.insee,
                  adContent: `${title} — réf. ${a.ref} — terrain ${a.landSurface} m²${
                    a.houseSurface
                      ? `, maison ${a.houseSurface} m², ${a.bedrooms} ch.`
                      : ""
                  } — ${fmtPrice(a.price)}`,
                }}
              >
                <ContactFields prefix="af" />
              </LeadForm>
              <div className="a-aside__agency">
                {agencyPage ? (
                  <Link href={agencyUrl(agencyPage)}>{a.agency.name}</Link>
                ) : (
                  a.agency.name
                )}
                <br />
                {a.agency.address}
                <br />
                {a.agency.phone}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
