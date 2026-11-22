import type { Metadata } from "next";
import Link from "next/link";
import FilAriane from "@/components/FilAriane";
import AgencyCard from "@/components/AgencyCard";
import CoupeTerrain from "@/components/CoupeTerrain";
import { agencesPubliees } from "@/lib/agences";
import { jsonLd } from "@/lib/schema";
import { markdownToHtml } from "@/lib/markdown";
import { resolveMetadata } from "@/lib/seo";
import { srcSet, vue } from "@/data/visuels";
import {
  AIDES,
  BUDGET,
  CHAPO,
  COUPE_PARTS,
  FAQ,
  LOCAL,
  MUET,
  QUI_FAIT_QUOI,
  RUBAN,
  STYLES,
  TERRAIN,
  TERRITOIRE,
  TITRE,
} from "@/data/redactionnel/landes";
import "@/styles/pages/construire.css";

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/construire/landes", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Construction de maisons dans les Landes",
  description:
    "Construire dans les Landes : les étapes, les règles locales, le budget, les styles de maisons et le rôle d'un constructeur implanté dans le département.",
  alternates: { canonical: "/construire/landes" },
};

const md = (s: string) => ({ __html: markdownToHtml(s) });

export default async function Page() {
  const agences = (await agencesPubliees()).filter((g) => g.zone === "Landes");
  const heroImg = vue("pekin", "vue-1-exterieur");
  const stylesImg = vue("lima", "vue-1-exterieur");

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
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />

      <div className="container">
        <section className="pl-hero">
          <div className="pl-hero__texte">
            <FilAriane items={[{ nom: "Accueil", path: "/" }, { nom: "Construire dans les Landes" }]} />
            <h1>{TITRE}</h1>
            <p className="pl-hero__chapo">{CHAPO}</p>
            <p className="pl-muet">{MUET}</p>
            <div className="pl-boutons">
              <Link className="c-btn c-btn--solid" href="/contact">
                Prendre rendez-vous <span aria-hidden="true">→</span>
              </Link>
              <a className="c-btn" href="#pl-terrain">Vérifier mon terrain</a>
            </div>
          </div>
          <figure>
            <picture>
              <source type="image/avif" srcSet={srcSet(heroImg, "avif")} sizes="(max-width:860px) 100vw, 45vw" />
              <source type="image/webp" srcSet={srcSet(heroImg, "webp")} sizes="(max-width:860px) 100vw, 45vw" />
              <img src={heroImg.src} width={heroImg.largeur} height={heroImg.hauteur} alt="Maison de plain-pied à toit de tuiles, entourée d'arbres" />
            </picture>
          </figure>
        </section>
      </div>

      <nav className="pl-sous" aria-label="Sommaire de la page">
        <div className="container"><ul>
          <li><a href="#pl-territoire">Le territoire</a></li>
          <li><a href="#pl-etapes">Les étapes</a></li>
          <li><a href="#pl-terrain">Le terrain</a></li>
          <li><a href="#pl-coupe">Les particularités</a></li>
          <li><a href="#pl-budget">Le budget</a></li>
          <li><a href="#pl-styles">Les styles</a></li>
          <li><a href="#pl-local">Le constructeur</a></li>
          <li><a href="#pl-faq">Questions fréquentes</a></li>
        </ul></div>
      </nav>

      <section className="section pl-sec" id="pl-territoire">
        <div className="container pl-terr">
          <figure className="pl-carte">
            <svg viewBox="-44 0 540 560" role="img" aria-label="Schéma des Landes : la côte à l'ouest, l'arrière-pays à l'est, les quatre agences Essensya et huit autres villes">
              <path d="M-44 0H125L128 51L110 173L103 234L73 387L57 463L37 514L29 560H-44Z" fill="#E5E7E8" />
              <path d="M125 0L128 51L110 173L103 234L73 387L57 463L37 514L29 560" fill="none" stroke="#62686D" strokeWidth="1.2" />
              <text className="zone" transform="translate(30 250) rotate(-82)">OCÉAN ATLANTIQUE</text>
              <text className="zone" x="280" y="50">LA CÔTE ET LES LACS</text>
              <text className="zone" x="236" y="230">LA FORÊT DE PINS</text>
              <text className="zone" x="330" y="540">LE PAYS LANDAIS</text>
              <g fill="#2C2E35">
                <circle cx="161" cy="81" r="3.5" /><circle cx="403" cy="336" r="3.5" /><circle cx="202" cy="428" r="3.5" />
                <circle cx="150" cy="195" r="3.5" /><circle cx="110" cy="320" r="3.5" /><circle cx="82" cy="490" r="3.5" /><circle cx="235" cy="268" r="3.5" /><circle cx="465" cy="400" r="3.5" />
              </g>
              <g fill="#B12D5B">
                <circle cx="194" cy="102" r="7" /><circle cx="114" cy="453" r="7" /><circle cx="290" cy="366" r="7" /><circle cx="370" cy="453" r="7" />
              </g>
              <text x="169" y="78">Biscarrosse</text>
              <text x="396" y="327" textAnchor="middle">Mont-de-Marsan</text>
              <text x="194" y="426" textAnchor="end">Dax</text>
              <text x="158" y="192">Mimizan</text>
              <text x="118" y="317">Moliets</text>
              <text x="90" y="487">Hossegor</text>
              <text x="243" y="265">Morcenx-la-Nouvelle</text>
              <text x="473" y="397">Roquefort</text>
              <text className="ag" x="206" y="107">Parentis-en-Born</text>
              <text className="ag" x="302" y="371">Tartas</text>
              <text className="ag" x="380" y="472" textAnchor="middle">Hagetmau</text>
              <text className="ag" x="126" y="458">Saint-Vincent-de-Tyrosse</text>
            </svg>
            <figcaption><span><i style={{ background: "var(--framboise)" }} />Nos 4 agences landaises</span><span><i style={{ background: "var(--anthracite)" }} />Autres villes</span></figcaption>
          </figure>
          <div className="pl-terr__txt">
            <span className="c-label">Le territoire</span>
            <h2>Pourquoi s&apos;installer dans les Landes&nbsp;?</h2>
            <p dangerouslySetInnerHTML={md(TERRITOIRE.intro)} />
            {TERRITOIRE.blocs.map((b) => (
              <div className="pl-bloc" key={b.titre}><h3>{b.titre}</h3><p>{b.texte}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section pl-etapes pl-sec" id="pl-etapes">
        <div className="container">
          <div className="pl-tete">
            <span className="c-label">Le déroulé</span>
            <h2>Les grandes étapes d&apos;un projet de construction</h2>
            <p>La construction d&apos;une maison suit neuf étapes&nbsp;: projet et budget, terrain, plans, contrat et assurances, permis de construire, gros œuvre, second œuvre et finitions, suivi de chantier, réception. Les connaître permet d&apos;anticiper les délais et de savoir à quel moment prendre chaque décision.</p>
          </div>
          <ol className="ruban">
            {RUBAN.map((r) => (
              <li key={r.titre}><h3>{r.titre}</h3><p>{r.texte}</p></li>
            ))}
          </ol>
          <div className="pl-qui">
            <div><h3>Qui fait quoi à chaque étape&nbsp;?</h3><p>{QUI_FAIT_QUOI}</p></div>
            <Link className="c-btn c-btn--light" href="/etapes-de-construction">
              Voir le détail des étapes <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section pl-sec" id="pl-terrain">
        <div className="container pl-fonc">
          <div className="pl-fonc__tete">
            <span className="c-label">Le terrain</span>
            <h2>Trouver son terrain constructible dans les Landes</h2>
            <p>{TERRAIN.intro}</p>
          </div>
          <div>
            <ul className="pl-q">
              {TERRAIN.points.map((p) => (
                <li key={p.titre}>
                  <svg viewBox="0 0 28 28" aria-hidden="true"><rect x="2" y="2" width="24" height="24" fill="none" stroke="#2C2E35" strokeWidth="1.5" /><path d="M8 14.5l4 4 8-9" fill="none" stroke="#B12D5B" strokeWidth="2.5" /></svg>
                  <div><h3>{p.titre}</h3><p dangerouslySetInnerHTML={md(p.texte)} /></div>
                </li>
              ))}
            </ul>
            <div className="pl-offre">
              <h3>Parcelle seule ou offre terrain + maison&nbsp;?</h3>
              <p dangerouslySetInnerHTML={md(TERRAIN.offre)} />
              <div className="pl-boutons">
                <Link className="c-btn" href="/annonces?type=terrain">Terrains dans les Landes</Link>
                <Link className="c-btn" href="/annonces?type=terrain-maison">Terrain + maison</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section pl-coupe pl-sec" id="pl-coupe">
        <div className="container">
          <div className="pl-tete">
            <span className="c-label">Sous la maison, autour de la maison</span>
            <h2>Les particularités locales que maîtrise un constructeur landais</h2>
            <p>Sols sableux, risque feu de forêt, nappe phréatique et assainissement font partie du quotidien d&apos;un professionnel dans les Landes. Bien traités dès la conception, ils deviennent des paramètres techniques maîtrisés, pas des obstacles.</p>
          </div>
          <CoupeTerrain parts={COUPE_PARTS} />
        </div>
      </section>

      <section className="section pl-sec" id="pl-budget">
        <div className="container">
          <div className="pl-tete">
            <span className="c-label">Le budget</span>
            <h2>Quel budget prévoir&nbsp;?</h2>
            <p>Le budget d&apos;une construction neuve se compose de trois postes&nbsp;: le foncier, la maison elle-même et les frais annexes. Le prix au m² varie fortement selon la localisation (côte ou intérieur), la surface, le niveau de finition et la nature du sol.</p>
          </div>
          <div className="tab-cadre">
            <table className="tab">
              <thead><tr>{BUDGET[0].map((c) => <th scope="col" key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {BUDGET.slice(1).map((l) => (
                  <tr key={l[0]}>{l.map((c, i) => (i === 0 ? <th scope="row" key={c}>{c}</th> : <td key={c}>{c}</td>))}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pl-aides">
            <div>
              <h3>Quelles aides pour alléger le coût de votre maison&nbsp;?</h3>
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

      <section className="section pl-sec" id="pl-styles" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="pl-tete">
            <span className="c-label">L&apos;architecture</span>
            <h2>Quel style de maison pour les Landes&nbsp;?</h2>
            <p>Dans les Landes, on peut faire bâtir une maison traditionnelle d&apos;inspiration landaise, une maison contemporaine ou une maison à ossature bois. Le style dépend de vos goûts, de votre budget et des règles locales.</p>
          </div>
          <figure className="pl-styles__vis">
            <picture>
              <source type="image/avif" srcSet={srcSet(stylesImg, "avif")} sizes="100vw" />
              <source type="image/webp" srcSet={srcSet(stylesImg, "webp")} sizes="100vw" />
              <img src={stylesImg.src} width={stylesImg.largeur} height={stylesImg.hauteur} alt="Maison de plain-pied à toit de tuiles, façade claire et menuiseries rouges, sous les pins" />
            </picture>
          </figure>
          <div className="pl-styles">
            {STYLES.map((s) => (
              <article className="pl-style" key={s.titre}><h3>{s.titre}</h3><p>{s.texte}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="section pl-loc pl-sec" id="pl-local">
        <div className="container">
          <div className="pl-tete">
            <span className="c-label">Le constructeur</span>
            <h2>Pourquoi choisir un constructeur local&nbsp;?</h2>
            <p>{LOCAL.intro}</p>
          </div>
          <div className="pl-loc__g">
            <div>
              <h3>La protection du contrat CCMI</h3>
              <p>{LOCAL.ccmi}</p>
              <span className="pl-signer"><strong>Avant de signer</strong>, {LOCAL.ccmiSigner}</span>
              <p style={{ marginTop: ".8rem" }}>{LOCAL.ccmiSuite}</p>
            </div>
            <div>
              <h3>La connaissance du terrain et des administrations</h3>
              <p dangerouslySetInnerHTML={md(LOCAL.connaissance)} />
            </div>
            <div>
              <h3>Comment comparer les constructeurs&nbsp;?</h3>
              <ul className="pl-coche">
                {LOCAL.comparer.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          </div>
          <div className="pl-agences">
            {agences.map((g) => <AgencyCard agency={g} key={g.id} />)}
          </div>
        </div>
      </section>

      <section className="section pl-sec" id="pl-faq">
        <div className="container pl-faq">
          <div className="pl-tete" style={{ margin: 0 }}><span className="c-label">Questions fréquentes</span><h2>FAQ pour faire construire sa maison dans les Landes</h2></div>
          <div className="pl-faq__l">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section pl-cta">
        <div className="container">
          <span className="c-label">Et maintenant</span>
          <h2 style={{ marginTop: "var(--s-2)" }}>Lancez votre projet de maison dans les Landes</h2>
          <p className="pl-lire">Deux possibilités s&apos;offrent à vous&nbsp;:</p>
          <div className="pl-cta__g">
            <div className="pl-cta__c">
              <p>Prenez rendez-vous en agence et découvrez nos modèles de maisons.</p>
              <div className="pl-boutons">
                <Link className="c-btn c-btn--solid" href="/contact">Prendre rendez-vous <span aria-hidden="true">→</span></Link>
                <Link className="c-btn c-btn--light" href="/maisons">Voir nos modèles</Link>
              </div>
            </div>
            <div className="pl-cta__c">
              <p>Demandez une étude de faisabilité de votre terrain à nos conseillers habitat ou découvrez notre sélection d&apos;annonces terrains et terrain+maison.</p>
              <div className="pl-boutons">
                <Link className="c-btn c-btn--light" href="/contact">Étude de faisabilité</Link>
                <Link className="c-btn c-btn--light" href="/annonces">Voir les annonces</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
