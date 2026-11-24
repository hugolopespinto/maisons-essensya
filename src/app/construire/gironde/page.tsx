import type { Metadata } from "next";
import Link from "next/link";
import FilAriane from "@/components/FilAriane";
import AgencyCard from "@/components/AgencyCard";
import { agencesPubliees } from "@/lib/agences";
import { jsonLd } from "@/lib/schema";
import { markdownToHtml } from "@/lib/markdown";
import { resolveMetadata } from "@/lib/seo";
import { srcSet, vue } from "@/data/visuels";
import {
  AIDES,
  BASSE_CONSO,
  BUDGET_INTRO,
  CHAPO,
  CHOISIR,
  CHOISIR_INTRO,
  CTA,
  ETAPES_ACCOMPAGNEMENT,
  ETAPES_INTRO,
  ETAPES_RUBAN,
  FAQ,
  FINANCEMENT_INTRO,
  FRAIS_ANNEXES,
  GARANTIE_DECENNALE,
  GARANTIE_LIVRAISON,
  GARANTIES_INTRO,
  OFFRE,
  PRIX_TERRAIN,
  RE2020_INTRO,
  SECTEURS,
  SIMULATION,
  SOLS_ARGILEUX,
  STYLES,
  STYLES_INTRO,
  TERRITOIRE,
  TITRE,
} from "@/data/redactionnel/gironde";
import "@/styles/pages/construire.css";

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/construire/gironde", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Constructeur de maisons en Gironde",
  description: "Faire construire en Gironde avec Maisons Essensya : plans optimisés, prix annoncé, contrat CCMI.",
  alternates: { canonical: "/construire/gironde" },
};

const md = (s: string) => ({ __html: markdownToHtml(s) });

export default async function Page() {
  const agences = (await agencesPubliees()).filter((g) => g.zone === "Gironde");
  const heroImg = vue("jakarta", "vue-1-exterieur");

  return (
    <main className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a + (f.liste ? " " + f.liste.join(" ") : "") },
            })),
          }),
        }}
      />

      <div className="container">
        <section className="pl-hero">
          <div className="pl-hero__texte">
            <FilAriane items={[{ nom: "Accueil", path: "/" }, { nom: "Construire en Gironde" }]} />
            <h1>{TITRE}</h1>
            <p className="pl-hero__chapo">{CHAPO}</p>
            <div className="pl-boutons">
              <Link className="c-btn c-btn--solid" href="/contact">Demander une étude <span aria-hidden="true">→</span></Link>
              <a className="c-btn" href="#gi-budget">Estimer mon budget</a>
            </div>
          </div>
          <figure>
            <picture>
              <source type="image/avif" srcSet={srcSet(heroImg, "avif")} sizes="(max-width:860px) 100vw, 45vw" />
              <source type="image/webp" srcSet={srcSet(heroImg, "webp")} sizes="(max-width:860px) 100vw, 45vw" />
              <img src={heroImg.src} width={heroImg.largeur} height={heroImg.hauteur} alt="Maison de plain-pied à toit de tuiles, façade claire et menuiseries sombres" />
            </picture>
          </figure>
        </section>
      </div>

      <nav className="pl-sous" aria-label="Sommaire de la page">
        <div className="container"><ul>
          <li><a href="#gi-territoire">Le territoire</a></li>
          <li><a href="#gi-budget">Le budget</a></li>
          <li><a href="#gi-offre">Terrain + maison</a></li>
          <li><a href="#gi-styles">Les styles</a></li>
          <li><a href="#gi-etapes">Les étapes</a></li>
          <li><a href="#gi-garanties">Les garanties</a></li>
          <li><a href="#gi-financement">Le financement</a></li>
          <li><a href="#gi-re2020">RE2020 et sols</a></li>
          <li><a href="#gi-local">Le constructeur</a></li>
          <li><a href="#gi-faq">Questions fréquentes</a></li>
        </ul></div>
      </nav>

      <section className="section pl-sec" id="gi-territoire">
        <div className="container pl-terr">
          <figure className="pl-carte">
            <svg viewBox="-20 0 560 480" role="img" aria-label="Schéma de la Gironde : la métropole bordelaise, le bassin d'Arcachon, le vignoble et le sud du département, avec l'agence de Canéjan et sept autres villes">
              <path d="M-20 60Q30 20 90 70T150 170Q110 230 90 300T40 420Q0 460-20 460Z" fill="#E5E7E8" />
              <text className="zone" x="-15" y="150">BASSIN D&apos;ARCACHON</text>
              <text className="zone" x="225" y="40">LE MÉDOC</text>
              <text className="zone" x="300" y="150">LIBOURNAIS ET ENTRE-DEUX-MERS</text>
              <text className="zone" x="250" y="430">LE SUD GIRONDE</text>
              <g fill="#2C2E35">
                <circle cx="300" cy="190" r="3.5" /><circle cx="235" cy="160" r="3.5" />
                <circle cx="150" cy="300" r="3.5" /><circle cx="330" cy="330" r="3.5" /><circle cx="380" cy="390" r="3.5" />
                <circle cx="95" cy="250" r="3.5" /><circle cx="130" cy="205" r="3.5" />
              </g>
              <circle cx="265" cy="225" r="7" fill="#B12D5B" />
              <text x="308" y="193">Mérignac</text>
              <text x="243" y="157">Saint-Médard-en-Jalles</text>
              <text x="158" y="297">Biganos</text>
              <text x="338" y="327">Langon</text>
              <text x="388" y="387">Bazas</text>
              <text x="103" y="247">Marcheprime</text>
              <text x="138" y="202">Belin-Béliet</text>
              <text className="ag" x="253" y="222" textAnchor="end">Canéjan</text>
            </svg>
            <figcaption><span><i style={{ background: "var(--framboise)" }} />Notre agence de Canéjan</span><span><i style={{ background: "var(--anthracite)" }} />Autres villes</span></figcaption>
          </figure>
          <div className="pl-terr__txt">
            <span className="c-label">Le territoire</span>
            <h2>Pourquoi faire construire sa maison en Gironde&nbsp;?</h2>
            <p>{TERRITOIRE.intro}</p>
            {TERRITOIRE.blocs.map((b) => (
              <div className="pl-bloc" key={b.titre}><h3>{b.titre}</h3><p>{b.texte}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section pl-sec" id="gi-budget">
        <div className="container">
          <div className="pl-tete">
            <span className="c-label">Le budget</span>
            <h2>{BUDGET_INTRO.titre}</h2>
            <p>{BUDGET_INTRO.texte}</p>
          </div>
          <div className="pl-bloc" style={{ marginBottom: "var(--s-3)" }}>
            <h3>Estimation du budget selon le secteur géographique</h3>
            <p>{BUDGET_INTRO.estimation}</p>
          </div>
          <div className="pl-cmp">
            {SECTEURS.map((s) => (
              <div key={s.titre}><h4>{s.titre}</h4><p>{s.texte}</p></div>
            ))}
          </div>
          <div className="pl-deux" style={{ marginTop: "var(--s-4)" }}>
            <div className="pl-bloc"><h3>Le prix du terrain à bâtir</h3><p>{PRIX_TERRAIN}</p></div>
            <div className="pl-bloc">
              <h3>Les frais annexes&nbsp;: notaire, taxes et viabilisation</h3>
              <p>Au-delà du foncier et de la maison, prévoyez&nbsp;:</p>
              <ul className="pl-coche">
                {FRAIS_ANNEXES.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section pl-sec" id="gi-offre">
        <div className="container pl-fonc">
          <div className="pl-fonc__tete">
            <span className="c-label">Terrain + maison</span>
            <h2>Offres maison + terrain&nbsp;: comment les trouver en Gironde&nbsp;?</h2>
            <p>{OFFRE.intro}</p>
          </div>
          <div className="pl-offre">
            <p dangerouslySetInnerHTML={md(OFFRE.texte)} />
            <div className="pl-boutons">
              <Link className="c-btn" href="/annonces?type=terrain-maison">Voir les annonces terrain + maison</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section pl-sec" id="gi-styles" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="pl-tete">
            <span className="c-label">L&apos;architecture</span>
            <h2>Quel type de maison choisir&nbsp;?</h2>
            <p dangerouslySetInnerHTML={md(STYLES_INTRO)} />
          </div>
          <div className="pl-styles">
            {STYLES.map((s) => (
              <article className="pl-style" key={s.titre}><h3>{s.titre}</h3><p>{s.texte}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="section pl-etapes pl-sec" id="gi-etapes">
        <div className="container">
          <div className="pl-tete">
            <span className="c-label">Le déroulé</span>
            <h2>Les étapes clés de votre projet de construction</h2>
            <p>{ETAPES_INTRO}</p>
          </div>
          <ol className="ruban">
            {ETAPES_RUBAN.map((r) => (
              <li key={r.titre}><h3>{r.titre}</h3><p>{r.texte}</p></li>
            ))}
          </ol>
          <div className="pl-qui">
            <div><h3>Un accompagnement de A à Z</h3><p>{ETAPES_ACCOMPAGNEMENT}</p></div>
            <Link className="c-btn c-btn--light" href="/etapes-de-construction">Voir le détail des étapes <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

      <section className="section pl-loc pl-sec" id="gi-garanties">
        <div className="container">
          <div className="pl-tete">
            <span className="c-label">Les garanties</span>
            <h2>Les garanties indispensables du contrat de construction (CCMI)</h2>
            <p>{GARANTIES_INTRO}</p>
          </div>
          <div className="pl-deux">
            <div className="pl-bloc">
              <h3>{GARANTIE_LIVRAISON.titre}</h3>
              <p>{GARANTIE_LIVRAISON.texte}</p>
              <span className="pl-signer"><strong>Avant de signer</strong>, {GARANTIE_LIVRAISON.signer}</span>
            </div>
            <div className="pl-bloc">
              <h3>{GARANTIE_DECENNALE.titre}</h3>
              <p>{GARANTIE_DECENNALE.texte}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section pl-sec" id="gi-financement">
        <div className="container">
          <div className="pl-tete">
            <span className="c-label">Le financement</span>
            <h2>Comment financer une maison neuve en Gironde en 2026&nbsp;?</h2>
            <p>{FINANCEMENT_INTRO}</p>
          </div>
          <div className="pl-aides">
            <div>
              <h3>Simuler sa capacité d&apos;emprunt et son apport personnel</h3>
              <p dangerouslySetInnerHTML={md(SIMULATION)} />
              <h3 style={{ marginTop: "var(--s-3)" }}>Les aides et dispositifs en vigueur</h3>
              <ul className="pl-liste">
                {AIDES.map((a) => <li key={a.texte} dangerouslySetInnerHTML={md(a.texte)} />)}
              </ul>
            </div>
            <aside className="pl-simu">
              <p>Un conseiller vous aide à établir un plan de financement clair, qui intègre toutes les dépenses liées au projet avant la signature.</p>
              <Link className="c-btn" href="/simulateur-de-financement">Simuler mon financement <span aria-hidden="true">→</span></Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="section pl-sec" id="gi-re2020">
        <div className="container">
          <div className="pl-tete">
            <span className="c-label">La réglementation</span>
            <h2>La réglementation environnementale RE2020 en Gironde</h2>
            <p>{RE2020_INTRO}</p>
          </div>
          <div className="pl-deux">
            <div className="pl-bloc">
              <h3>Pourquoi opter pour une maison basse consommation&nbsp;?</h3>
              <p>{BASSE_CONSO}</p>
            </div>
            <div className="pl-bloc">
              <h3>Anticiper les spécificités des sols argileux girondins</h3>
              <p dangerouslySetInnerHTML={md(SOLS_ARGILEUX.texte)} />
              <span className="pl-signer">{SOLS_ARGILEUX.signer}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section pl-loc pl-sec" id="gi-local">
        <div className="container">
          <div className="pl-tete">
            <span className="c-label">Le constructeur</span>
            <h2>Comment choisir un constructeur de maisons en Gironde&nbsp;?</h2>
            <p>{CHOISIR_INTRO}</p>
          </div>
          <div className="pl-loc__g">
            {CHOISIR.map((c) => (
              <div key={c.titre}><h3>{c.titre}</h3><p>{c.texte}</p></div>
            ))}
          </div>
          <div className="pl-agences" style={{ gridTemplateColumns: "minmax(0,260px)" }}>
            {agences.map((g) => <AgencyCard agency={g} key={g.id} />)}
          </div>
        </div>
      </section>

      <section className="section pl-sec" id="gi-faq">
        <div className="container pl-faq">
          <div className="pl-tete" style={{ margin: 0 }}><span className="c-label">Questions fréquentes</span><h2>Questions fréquentes sur la construction</h2></div>
          <div className="pl-faq__l">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
                {f.liste ? <ul className="pl-coche">{f.liste.map((l) => <li key={l}>{l}</li>)}</ul> : null}
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section pl-cta">
        <div className="container">
          <span className="c-label">Et maintenant</span>
          <h2 style={{ marginTop: "var(--s-2)" }}>Lancez votre projet de construction</h2>
          <p className="pl-lire">{CTA.texte}</p>
          <div className="pl-cta__g">
            <div className="pl-cta__c">
              <p>{CTA.etude}</p>
              <div className="pl-boutons"><Link className="c-btn c-btn--solid" href="/contact">Demander une étude et un devis <span aria-hidden="true">→</span></Link></div>
            </div>
            <div className="pl-cta__c">
              <p>{CTA.catalogues}</p>
              <div className="pl-boutons"><Link className="c-btn c-btn--light" href="/maisons">Voir les catalogues de modèles</Link></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
