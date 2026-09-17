import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LeadForm, { ContactFields } from "@/components/LeadForm";
import ModeleCard from "@/components/ModeleCard";
import { MarkedList } from "@/components/SpecList";
import { HOUSE, PRICE_FROM, REEL } from "@/data/essensya";
import {
  estPubliable,
  facadeDe,
  modeleParSlug,
  modelesAvecVisuels,
  vuesDe,
} from "@/data/gamme";
import { srcSet } from "@/data/visuels";
import { fmtPrice, fmtSurface } from "@/lib/format";
import { filAriane, jsonLd } from "@/lib/schema";
import { resolveMetadata } from "@/lib/seo";
import "@/styles/pages/modele.css";
import "@/styles/pages/maison.css";
import "@/styles/pages/gamme.css";

/* ════════════════════════════════════════════════════════════════
   LA FICHE D'UN MODÈLE

   Cette route servait « /maisons/2-chambres » et « /maisons/3-chambres »
   — deux déclinaisons inventées pour la maquette, avec leurs surfaces,
   leurs plans cotés et leurs prix. Elle sert désormais les modèles
   réels : /maisons/lisbonne, /maisons/athenes…

   ⚠ LES DEUX ANCIENNES ADRESSES SONT REDIRIGÉES EN 301, pas supprimées.
   Elles figuraient au sitemap, dans le pied de page et dans l'écran
   Référencement : les laisser tomber en 404 perdrait ce qu'elles ont pu
   accumuler et remplirait la Search Console d'erreurs. Voir
   `redirects()` dans next.config.ts.

   ⚠ CES PAGES SONT HORS INDEX TANT QU'ELLES N'ONT PAS UN CHIFFRE.
   Une fiche qui ne montre que des images est du contenu mince, et dix
   d'un coup, bâties sur le même gabarit, sont le scénario que Google
   traite le plus sévèrement. Elles EXISTENT — le client doit pouvoir
   les regarder et les envoyer — mais elles ne sont ni indexées ni au
   sitemap. `estPubliable()` (src/data/gamme.ts) tient la frontière, et
   le jour où une surface ou un prix arrive, la page entre dans l'index
   sans qu'on touche à une ligne de ce fichier.
   ════════════════════════════════════════════════════════════════ */

export const revalidate = 1800;

export async function generateStaticParams() {
  return modelesAvecVisuels().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const m = modeleParSlug(slug);
  if (!m || !facadeDe(m)) return {};

  const specs = [
    m.surface !== undefined ? fmtSurface(m.surface) : null,
    m.chambres !== undefined ? `${m.chambres} chambres` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return resolveMetadata(`/maisons/${m.slug}`, {
    title: `Maison ${m.nom}${specs ? ` — ${specs}` : ""}`,
    description: specs
      ? `La maison ${m.nom} : ${specs}. Un plan optimisé jusqu'au dernier mètre carré, à partir de ${fmtPrice(PRICE_FROM)} hors terrain.`
      : `La maison ${m.nom}, en images. Un plan optimisé jusqu'au dernier mètre carré, dans une gamme à partir de ${fmtPrice(PRICE_FROM)} hors terrain.`,
    alternates: { canonical: `/maisons/${m.slug}` },
    /* Hors index tant que la fiche n'a pas de quoi être lue. `follow`
       reste vrai : on retire la page de l'index, on ne coupe pas le
       suivi des liens qu'elle porte vers /maisons et /contact. */
    ...(estPubliable(m) ? {} : { robots: { index: false, follow: true } }),
  });
}

export default async function ModelePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const m = modeleParSlug(slug);
  /* Un modèle sans visuel n'a rien à montrer. Plus aucun n'est dans ce
     cas depuis les visuels de Pékin, mais la garde reste : le catalogue
     accueille des modèles avant leurs rendus, c'est sa raison d'être. */
  if (!m || !facadeDe(m)) notFound();

  const vues = vuesDe(m);
  const autres = modelesAvecVisuels()
    .filter((x) => x.slug !== m.slug)
    .slice(0, 3);

  const specs: [string, string][] = [
    m.surface !== undefined ? ["Surface habitable", fmtSurface(m.surface)] : null,
    m.chambres !== undefined ? ["Chambres", String(m.chambres)] : null,
    m.pieces !== undefined ? ["Pièces", String(m.pieces)] : null,
    /* « Oui » / « Non », et non une surface : le client a dit que la
       superficie du garage n'avait pas d'importance. `false` s'affiche
       donc, `undefined` fait disparaître la ligne. */
    m.garage !== undefined ? ["Garage", m.garage ? "Oui" : "Non"] : null,
  ].filter(Boolean) as [string, string][];

  return (
    <main className="page">
      {/* Pas de `Product` ici : sans surface ni prix propres, la fiche
          n'aurait à déclarer qu'un nom. Le `Product` de la gamme vit sur
          /maisons, et il ne dit que ce qui est vrai. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            filAriane([
              { nom: "Accueil", path: "/" },
              { nom: "Nos modèles", path: "/maisons" },
              { nom: m.nom },
            ]),
          ),
        }}
      />

      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <Link href="/maisons">Nos modèles</Link>
            <span className="sep">/</span>
            <span>{m.nom}</span>
          </nav>
          <span className="c-label c-label--accent">Modèle</span>
          <h1>{m.nom}</h1>

          {specs.length > 0 ? (
            <div className="c-plate" style={{ marginTop: "var(--s-3)" }}>
              {specs.map(([k, v]) => (
                <span className="c-plate__spec" key={k}>
                  {k} <strong>{v}</strong>
                </span>
              ))}
            </div>
          ) : (
            /* Aucune caractéristique : on le dit plutôt que de laisser le
               visiteur chercher une surface qui n'est nulle part. */
            <p className="u-muted u-measure" style={{ marginTop: "var(--s-3)" }}>
              Les caractéristiques détaillées de ce modèle — surface, nombre de
              chambres, plan coté — sont en cours de mise en ligne.
            </p>
          )}

          <p className="c-price-xl" style={{ marginTop: "var(--s-4)" }}>
            <span className="from">Nos maisons, à partir de</span>
            {fmtPrice(m.prixDepart ?? PRICE_FROM)}
            <small>
              {m.prixDepart !== undefined
                ? `Maison seule, hors terrain, hors adaptation.`
                : REEL.mentionPrix}
            </small>
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: "var(--s-5)" }}>
        <div className="container">
          <div className="g-fiche__galerie">
            {vues.map((v, i) => (
              <figure className="g-fiche__vue" key={v.cle}>
                <picture>
                  <source
                    type="image/avif"
                    srcSet={srcSet(v, "avif")}
                    sizes={i === 0 ? "100vw" : "(max-width:700px) 100vw, 50vw"}
                  />
                  <source
                    type="image/webp"
                    srcSet={srcSet(v, "webp")}
                    sizes={i === 0 ? "100vw" : "(max-width:700px) 100vw, 50vw"}
                  />
                  <img
                    src={v.src}
                    width={v.largeur}
                    height={v.hauteur}
                    alt={`Maison Essensya modèle ${m.nom} — ${
                      v.type === "exterieur" ? "vue extérieure" : "vue intérieure"
                    }`}
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : undefined}
                  />
                </picture>
              </figure>
            ))}
          </div>
          {/* Les rendus sont des images de synthèse, et le dire ici évite
              qu'un visiteur les prenne pour des photos de chantier. La
              même exigence tient la page Réalisations vide. */}
          <p
            className="u-muted"
            style={{ marginTop: "var(--s-3)", fontSize: "var(--fs-small)" }}
          >
            Vues d&apos;architecte non contractuelles.
          </p>
        </div>
      </section>

      <section className="m-price" id="prix">
        <div className="container">
          <div className="c-section-head">
            <span className="c-label">Le prix</span>
            <h2>Ce qu&apos;il comprend, ce qu&apos;il ne comprend pas</h2>
          </div>
          <div className="m-price__grid">
            <div className="mp-price__col">
              <h3>Compris dans le prix</h3>
              <MarkedList items={HOUSE.included} variant="in" />
            </div>
            <div className="mp-price__col mp-price__col--out">
              <h3>Non compris</h3>
              <MarkedList items={HOUSE.excluded} variant="out" />
            </div>
          </div>
        </div>
      </section>

      <section className="s-cta" id="dossier">
        <div className="container">
          <div className="s-cta__grid">
            <div>
              <span className="c-label">Le dossier</span>
              <h2>Le détail du modèle {m.nom}</h2>
              <p>
                Plan, prestations, liste de ce qui est compris et de ce qui ne
                l&apos;est pas, et le chiffrage pour votre commune.
              </p>
            </div>
            <LeadForm
              originKey="model"
              gtmEvent="lead_model_request"
              dark
              submitLabel="Recevoir le dossier"
              successMessage="Merci — le dossier et le chiffrage vous arrivent rapidement."
              ctx={{ adContent: `Modèle ${m.nom}` }}
            >
              <ContactFields prefix={`md-${m.slug}`} />
              {/* Le modèle consulté part avec la demande : c'est
                  l'information la plus utile à l'agence, et elle est
                  vraie par construction. */}
              <input type="hidden" name="reason" value={`Modèle ${m.nom}`} />
              <div className="c-field">
                <label htmlFor={`md-${m.slug}-zone`}>Commune ou code postal</label>
                <input
                  type="text"
                  id={`md-${m.slug}-zone`}
                  name="zone"
                  placeholder="Ex. 40000"
                />
              </div>
            </LeadForm>
          </div>
        </div>
      </section>

      {autres.length > 0 && (
        <section className="g-gamme">
          <div className="container">
            <div className="c-section-head">
              <span className="c-label">La gamme</span>
              <h2>Les autres modèles</h2>
            </div>
            <div className="g-gamme__grid">
              {autres.map((x) => (
                <ModeleCard modele={x} key={x.slug} />
              ))}
            </div>
            <p style={{ marginTop: "var(--s-4)" }}>
              <Link href="/maisons" className="c-link">
                Voir toute la gamme →
              </Link>
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
