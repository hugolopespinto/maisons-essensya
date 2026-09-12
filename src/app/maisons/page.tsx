import type { Metadata } from "next";
import Link from "next/link";
import LeadForm, { ContactFields } from "@/components/LeadForm";
import SpecList, { MarkedList } from "@/components/SpecList";
import VersionCard from "@/components/VersionCard";
import VisiteMaison from "@/components/VisiteMaison";
import { HOUSE, PRICE_FROM, VERSIONS } from "@/data/essensya";
import { fmtPrice, fmtSurface, versionUrl } from "@/lib/format";
import { getContent } from "@/lib/store";
import type { PageEditable } from "@/lib/store/types";
import "@/styles/pages/modele.css";
import "@/styles/pages/maison.css";
import "@/styles/visite.css";

/* ════ LA PAGE PRODUIT ════
   /maisons n'est plus un listing : c'est LA fiche de la maison unique.
   L'ordre des sections est un ordre d'argumentation — prix, parti-pris,
   visite, construction, plans, prestations, prix détaillé, déclinaisons,
   formulaire. Le prix ouvre ET referme la démonstration.                */

export const metadata: Metadata = {
  title: `La maison ${HOUSE.name} — à partir de ${fmtPrice(PRICE_FROM)}`,
  description:
    `Une seule maison, deux déclinaisons : 2 ou 3 chambres. Plain-pied de ${fmtSurface(
      VERSIONS[0].surface,
    )}, cuisine, terrasse couverte et garage compris, à partir de ${fmtPrice(
      PRICE_FROM,
    )} hors terrain. Ce qui est compris et ce qui ne l'est pas, écrit noir sur blanc.`,
  alternates: { canonical: "/maisons" },
  openGraph: {
    title: `La maison ${HOUSE.name} — à partir de ${fmtPrice(PRICE_FROM)}`,
    images: [HOUSE.heroImage],
  },
};

/**
 * Lecteur des blocs saisis dans « Pages → La maison ».
 *
 * Le texte du back-office ne remplace celui du gabarit que s'il est
 * renseigné : vider un champ redonne la phrase d'origine — dont celles
 * qui affichent le nom de la maison ou son prix — et jamais du vide.
 */
function lecteurBlocs(pages: PageEditable[], clePage: string) {
  const blocs = pages.find((p) => p.cle === clePage)?.blocs ?? [];
  return (cle: string, defaut: string) =>
    blocs.find((b) => b.cle === cle)?.valeur.trim() || defaut;
}

/* Un texte saisi sur plusieurs lignes doit se lire sur plusieurs lignes. */
const PRE_LINE = { whiteSpace: "pre-line" } as const;

export default async function MaisonPage() {
  const { pages } = await getContent();
  const t = lecteurBlocs(pages, "maison");

  return (
    <main className="page">
      {/* ── 1. Le prix, avant tout le reste ── */}
      <section className="m-hero mp-hero">
        <div className="m-hero__bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HOUSE.heroImage} alt={HOUSE.alt} />
        </div>
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>La maison</span>
          </nav>
          <span className="c-label c-label--accent">
            {t("hero.surtitre", "La maison Essensya")}
          </span>
          <h1>{HOUSE.name}</h1>
          <p className="mp-hero__tagline">{HOUSE.tagline}</p>

          <p className="c-price-xl">
            <span className="from">À partir de</span>
            {fmtPrice(PRICE_FROM)}
            <small>Maison seule, hors terrain — 2 ou 3 chambres</small>
          </p>

          <div className="mp-hero__actions">
            <a href="#prix" className="c-btn c-btn--light">
              Ce que le prix comprend <span className="arrow">→</span>
            </a>
            <a href="#plan" className="c-link">
              Voir les plans →
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. Le parti-pris ── */}
      <section className="m-quote">
        <div className="container">
          <span className="c-label">{t("partiPris.surtitre", "Le parti-pris")}</span>
          <p>{HOUSE.philosophy}</p>
        </div>
      </section>

      {/* ── 3. La visite pièce par pièce ── */}
      <VisiteMaison house={HOUSE} />

      {/* ── 4. Ce qu'on ne voit pas : la construction ── */}
      <section className="m-arch">
        <div className="container">
          <div className="m-arch__grid">
            <figure className="c-reveal-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HOUSE.archImage}
                alt={`Volume et mise en œuvre de la maison ${HOUSE.name}`}
                loading="lazy"
              />
            </figure>
            <div>
              <span className="c-label">{t("architecture.surtitre", "L'architecture")}</span>
              <h2>{t("architecture.titre", "Un volume simple, dessiné jusqu'au bout")}</h2>
              <p>{HOUSE.archText}</p>
              {/* Les prestations constructives sont communes aux deux
                  déclinaisons : elles se lisent donc une seule fois. */}
              <SpecList rows={HOUSE.materials} dark className="mp-arch__specs" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Les plans : les deux déclinaisons, ensemble ── */}
      <section className="m-plan mp-anchor" id="plan">
        <div className="container">
          <div className="c-section-head">
            <span className="c-label">{t("plan.surtitre", "Le plan")}</span>
            <h2>{t("plan.titre", "Un plan, deux déclinaisons")}</h2>
            <p className="u-muted u-measure" style={PRE_LINE}>
              {t(
                "plan.texte",
                "Le séjour traversant, la cuisine ouverte, la salle de bain, la terrasse couverte et le garage sont identiques des deux côtés. Seul le nombre de chambres change — et les mètres carrés qui vont avec.",
              )}
            </p>
          </div>

          <div className="mp-plans">
            {VERSIONS.map((v) => (
              <article className="mp-plan" key={v.slug} data-reveal>
                <header className="mp-plan__head">
                  <h3>{v.label}</h3>
                  <span>
                    {fmtSurface(v.surface)} · {fmtPrice(v.priceFrom)}
                  </span>
                </header>
                <figure className="mp-plan__fig">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.planImage}
                    alt={`Plan du rez-de-chaussée de la maison ${HOUSE.name} en ${v.label}`}
                    loading="lazy"
                  />
                </figure>
                <SpecList rows={v.rooms_detail} />
                <p className="mp-plan__diff u-muted">{v.difference}</p>
                <Link href={versionUrl(v)} className="c-link">
                  Le détail en {v.label} →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Les prestations ── */}
      <section className="m-features">
        <div className="container">
          <div className="c-section-head">
            <span className="c-label">{t("prestations.surtitre", "Les prestations")}</span>
            <h2>{t("prestations.titre", "Là dès le départ, pas en supplément")}</h2>
          </div>
          <div className="m-features__grid">
            {HOUSE.features.map((f) => (
              <div className="m-features__item" key={f.t} data-reveal>
                <b>{f.t}</b>
                {f.d}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. LE BLOC PRIX ──
             Les exclusions sont affichées aussi grand que les inclusions.
             C'est une obligation CCMI autant qu'un argument : un prix bas
             dont on cache le périmètre n'est pas cru. */}
      <section className="m-price mp-anchor" id="prix">
        <div className="container">
          <div className="c-section-head">
            <span className="c-label">{t("prix.surtitre", "Le prix")}</span>
            <h2>{t("prix.titre", "Ce qu'il comprend, ce qu'il ne comprend pas")}</h2>
          </div>

          <div className="mp-prices">
            {VERSIONS.map((v) => (
              <div key={v.slug}>
                <span className="c-label c-label--accent">
                  {v.label} · {fmtSurface(v.surface)}
                </span>
                <span className="c-price-xl">
                  <span className="from">À partir de</span>
                  {fmtPrice(v.priceFrom)}
                  <small>Maison seule, hors terrain</small>
                </span>
              </div>
            ))}
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

          <p className="m-price__note">
            Prix indicatif selon terrain et département, chiffrage définitif dès le
            premier rendez-vous.
          </p>
        </div>
      </section>

      {/* ── 8. Les deux déclinaisons ── */}
      <section className="s-versions">
        <div className="container">
          <div className="c-section-head">
            <span className="c-label">
              {t("declinaisons.surtitre", "Les deux déclinaisons")}
            </span>
            <h2>{t("declinaisons.titre", "Le seul choix qu'on vous demande")}</h2>
            <p className="u-muted u-measure" style={PRE_LINE}>
              {t(
                "declinaisons.texte",
                "Même architecture, même séjour traversant, même cuisine aménagée, mêmes matériaux, mêmes garanties, et le même prix au mètre carré à quelques euros près. Vous ne choisissez que le nombre de chambres — c'est volontairement le seul arbitrage du projet.",
              )}
            </p>
          </div>
          <div className="s-versions__grid">
            {VERSIONS.map((v) => (
              <VersionCard version={v} key={v.slug} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. Le formulaire ──
             originKey="model" → ORIGIN-ID 52 « Modèle maison », déclaré
             depuis l'origine côté Vitahome et jamais branché : c'est ici
             que la page produit devient une page de conversion. */}
      <section className="s-cta" id="dossier">
        <div className="container">
          <div className="s-cta__grid">
            <div>
              <span className="c-label">{t("dossier.surtitre", "Le dossier")}</span>
              <h2>{t("dossier.titre", "Recevoir le dossier complet")}</h2>
              <p style={PRE_LINE}>
                {t(
                  "dossier.texte",
                  "Les plans cotés des deux déclinaisons, le descriptif détaillé des prestations, la liste de ce qui est compris et de ce qui ne l'est pas, et le chiffrage pour votre commune.",
                )}
              </p>
              <SpecList
                className="mp-form__specs"
                dark
                rows={[
                  ["Réponse", "Sous 48 h"],
                  ["Chiffrage", "Annoncé, pas estimé"],
                  ["Engagement", "Aucun"],
                ]}
              />
            </div>

            <LeadForm
              originKey="model"
              gtmEvent="lead_model_request"
              dark
              submitLabel="Recevoir le dossier"
              successMessage="Merci — le dossier complet et le chiffrage arrivent sous 48 h."
              ctx={{ adContent: `Page maison — ${HOUSE.name}` }}
            >
              <ContactFields prefix="mf" />
              <div className="c-field">
                <label htmlFor="mf-zone">Commune ou code postal du projet</label>
                <input type="text" id="mf-zone" name="zone" placeholder="Ex. 17000" />
              </div>
              <div className="c-field">
                <label htmlFor="mf-version">Déclinaison qui vous intéresse</label>
                <select id="mf-version" name="reason" defaultValue={VERSIONS[0].label}>
                  {VERSIONS.map((v) => (
                    <option key={v.slug} value={v.label}>
                      {v.label} — {fmtSurface(v.surface)}
                    </option>
                  ))}
                  <option value="Je ne sais pas encore">Je ne sais pas encore</option>
                </select>
              </div>
            </LeadForm>
          </div>
        </div>
      </section>

      {/* ── 10. L'étape d'après ──
             La maison est choisie dès qu'elle est comprise : la seule
             question qui reste est celle du terrain. */}
      <section className="m-next">
        <div className="container">
          <Link href="/annonces">
            <span className="m-next__label">Étape suivante</span>
            <span className="m-next__name">Trouver mon terrain →</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
