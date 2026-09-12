import Link from "next/link";
import AnnonceCard from "@/components/AnnonceCard";
import ArgumentRow from "@/components/ArgumentRow";
import Compare from "@/components/Compare";
import HomeHero from "@/components/HomeHero";
import LeadForm from "@/components/LeadForm";
import { AnnonceMedia } from "@/components/Substitut";
import VersionCard from "@/components/VersionCard";
import { Icon } from "@/components/icons";
import {
  DEFAULT_VERSION,
  ESSENSYA_DATA,
  HOUSE,
  PLACEHOLDER,
  PRICE_FROM,
  VERSIONS,
} from "@/data/essensya";
import {
  annonceTitle,
  annonceUrl,
  fmtPrice,
  fmtSurface,
} from "@/lib/format";
import { jsonLd, siteSchema } from "@/lib/schema";
import { getContent } from "@/lib/store";
import type { PageEditable } from "@/lib/store/types";
import { getAnnonces, getSpotlight } from "@/lib/vitahome/annonces";

const D = ESSENSYA_DATA;
const delay = (s: string) => ({ "--reveal-delay": s }) as React.CSSProperties;

/**
 * Lecteur des blocs saisis dans « Pages → Accueil ».
 *
 * Le texte du back-office se substitue à celui du gabarit UNIQUEMENT
 * s'il est renseigné : effacer un champ doit rendre au site sa phrase
 * d'origine — souvent celle qui affiche un prix calculé, à jour — et
 * jamais laisser un trou à l'écran.
 */
function lecteurBlocs(pages: PageEditable[], clePage: string) {
  const blocs = pages.find((p) => p.cle === clePage)?.blocs ?? [];
  return (cle: string, defaut: string) =>
    blocs.find((b) => b.cle === cle)?.valeur.trim() || defaut;
}

/* Les titres en deux temps sont saisis avec un vrai retour à la ligne :
   `pre-line` le rend à l'écran au lieu d'afficher le caractère brut. */
const PRE_LINE = { whiteSpace: "pre-line" } as const;

export default async function HomePage() {
  const [content, annonces, spotlight] = await Promise.all([
    getContent(),
    getAnnonces(),
    getSpotlight(),
  ]);
  const t = lecteurBlocs(content.pages, "accueil");
  /* Même source que le layout : le nom saisi en Réglages, sinon celui
     du code. Un JSON-LD qui annoncerait un autre nom que la balise title
     serait une incohérence de plus pour Google à arbitrer. */
  const nomSite = content.reglages.nomSite?.trim() || "Maisons Essensya";

  /* L'opportunité du moment est déjà en vedette : la redonner dans la
     liste des récentes ferait doublon à deux écrans d'intervalle. */
  const recentes = annonces.filter((a) => a.id !== spotlight?.id).slice(0, 3);

  return (
    <main className="page">
      {/* `WebSite` porte le nom du site dans les résultats. Le `Product`,
          lui, reste sur /maisons : le déclarer ici aussi mettrait deux
          pages en concurrence sur la même fiche produit, et Google
          choisirait — souvent mal. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(siteSchema(nomSite)) }}
      />
      <HomeHero house={HOUSE} version={DEFAULT_VERSION} />

      {/* ── Recherche géographique ──
          En mono-produit la question n'est plus « quelle maison » mais
          « où, et combien ». Un GET vers /annonces : pas de JS, indexable,
          et l'URL produite est partageable. */}
      <section className="s-search" id="recherche" aria-labelledby="recherche-t">
        <div className="container">
          <span className="c-label" style={{ color: "var(--sable)" }}>
            {t("recherche.surtitre", "Où construire")}
          </span>
          <h2 id="recherche-t">
            {t("recherche.titre", "Trouvez le terrain, la maison est déjà dessinée.")}
          </h2>
          <form className="s-search__form" action="/annonces" method="get">
            <div className="c-field">
              <label htmlFor="s-q">Ville ou code postal</label>
              <input
                type="search"
                id="s-q"
                name="q"
                placeholder="La Rochelle, 17000, Thouars…"
                autoComplete="postal-code"
              />
            </div>
            <div className="c-field">
              <label htmlFor="s-type">Ce que je cherche</label>
              <select id="s-type" name="type" defaultValue="">
                <option value="">Terrain ou terrain + maison</option>
                <option value="terrain-maison">Terrain + maison</option>
                <option value="terrain">Terrain seul</option>
              </select>
            </div>
            <div className="c-field">
              <label htmlFor="s-max">Budget maximum (€)</label>
              <input
                type="number"
                id="s-max"
                name="max"
                inputMode="numeric"
                min={PRICE_FROM}
                step={5000}
                placeholder={String(PLACEHOLDER.priceFromTotal)}
              />
            </div>
            <button type="submit" className="c-btn c-btn--light">
              Voir les terrains <span className="arrow">→</span>
            </button>
          </form>
        </div>
      </section>

      <section className="s-idea" id="idee">
        <div className="container grid">
          <div data-reveal>
            <span className="c-label c-label--accent">{t("idee.surtitre", "L'idée")}</span>
            {/* Le prix est le premier argument du site : il est affiché avec
                ce qu'il ne comprend pas, sinon il n'est pas crédible. */}
            <p className="c-price-xl" style={{ marginTop: "var(--s-4)" }}>
              <span className="from">La maison, à partir de</span>
              {fmtPrice(PRICE_FROM)}
              <small>
                Maison seule, hors terrain — terrain compris, comptez{" "}
                {fmtPrice(PLACEHOLDER.priceFromTotal)} selon le secteur
              </small>
            </p>
          </div>
          <div>
            <p className="big" data-reveal style={PRE_LINE}>
              {t(
                "idee.phrase",
                "Nous n'avons pas fait une maison moins chère en enlevant des choses. Nous en avons fait une seule, et nous l'avons dessinée jusqu'au bout.",
              )}
            </p>
            {/* L'accroche de la maison reste en tête : le bloc éditable ne
                couvre que la suite du paragraphe, comme l'annonce son aide. */}
            <p
              className="u-muted u-measure"
              style={{ ...PRE_LINE, marginTop: "var(--s-3)" }}
              data-reveal
            >
              {HOUSE.tagline}{" "}
              {t(
                "idee.texte",
                "Une conception amortie sur toutes les maisons plutôt que refacturée à chaque client, zéro option à arbitrer, et un prix annoncé avant le premier rendez-vous.",
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── Les arguments ──
          Ce bloc déroulait les trois modèles du catalogue. Il déroule
          désormais les trois raisons de n'en faire qu'un. */}
      <section className="s-args" id="arguments">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">
              {t("arguments.surtitre", "Le parti-pris")}
            </span>
            <h2 style={PRE_LINE}>{t("arguments.titre", "Une maison.\nTrois raisons.")}</h2>
          </div>
          <div className="s-args__list">
            {D.arguments.map((a) => (
              <ArgumentRow item={a} key={a.cle} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Le comparatif ──
          Le bloc central du site : il justifie le prix bas sans laisser
          croire que la maison est moins bien construite. */}
      <section className="s-compare" id="comparatif">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">
              {t("comparatif.surtitre", "Le prix")}
            </span>
            <h2>{D.compare.title}</h2>
            <p className="s-compare__intro">{D.compare.intro}</p>
          </div>
          <Compare data={D.compare} />
        </div>
      </section>

      <section className="s-versions" id="declinaisons">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">
              {t("declinaisons.surtitre", "Les déclinaisons")}
            </span>
            <h2 style={PRE_LINE}>{t("declinaisons.titre", "Une maison.\nDeux plans.")}</h2>
            <p
              className="u-muted u-measure"
              style={{ ...PRE_LINE, marginTop: "var(--s-2)" }}
            >
              {t(
                "declinaisons.texte",
                "Seul le nombre de chambres change. Le séjour traversant, la cuisine aménagée, la terrasse couverte, le garage, les prestations et les garanties sont strictement identiques d'une déclinaison à l'autre — comme le prix au mètre carré.",
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

      <section className="s-philo">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label">{t("methode.surtitre", "Notre méthode")}</span>
            <h2 style={PRE_LINE}>{t("methode.titre", "Moins de choix.\nMieux choisis.")}</h2>
          </div>
          <div className="s-philo__grid">
            {D.philosophy.map((i) => (
              <div className="s-philo__item" data-reveal key={i.num}>
                <span className="s-philo__num">{i.num}</span>
                <h3>{i.title}</h3>
                <p>{i.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── L'opportunité du moment ──
          Plus un second produit à mettre en avant : une annonce réelle,
          terrain + maison, avec son prix total. Sans annonce éligible,
          la section disparaît plutôt que d'afficher une promesse vide. */}
      {spotlight && (
        <section className="s-featured" id="opportunite">
          <div className="s-featured__media">
            <AnnonceMedia annonce={spotlight} />
          </div>
          <div className="container">
            <span className="c-label" style={{ color: "var(--sable)" }} data-reveal>
              {t("opportunite.surtitre", "L'opportunité du moment")}
            </span>
            <h2 data-reveal style={delay(".1s")}>
              {annonceTitle(spotlight)}
            </h2>
            <div className="c-plate" data-reveal style={delay(".2s")}>
              {fmtSurface(spotlight.landSurface) && (
                <span className="c-plate__spec">
                  Terrain <strong>{fmtSurface(spotlight.landSurface)}</strong>
                </span>
              )}
              {fmtSurface(spotlight.houseSurface) && (
                <span className="c-plate__spec">
                  Maison <strong>{fmtSurface(spotlight.houseSurface)}</strong>
                </span>
              )}
              <span className="c-plate__spec">
                Prix total <strong>{fmtPrice(spotlight.price)}</strong>
              </span>
            </div>
            <div data-reveal style={delay(".3s")}>
              <Link href={annonceUrl(spotlight)} className="c-btn c-btn--light">
                Voir cette opportunité <span className="arrow">→</span>
              </Link>
            </div>
            {/* La mention de l'annonce engage le constructeur : elle suit
                le prix partout où il est affiché. */}
            {spotlight.mention && (
              <p
                className="u-measure"
                style={{
                  marginTop: "var(--s-4)",
                  color: "var(--sable)",
                  opacity: 0.7,
                  fontSize: "var(--fs-small)",
                }}
              >
                {spotlight.mention}
              </p>
            )}
          </div>
        </section>
      )}

      <section className="s-steps">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">
              {t("etapes.surtitre", "Comment ça marche")}
            </span>
            <h2>{t("etapes.titre", "Quatre étapes, pas quarante")}</h2>
          </div>
          <div className="s-steps__list">
            {D.steps.map((i) => (
              <div className="s-steps__item" data-reveal key={i.num}>
                <span className="s-steps__num">{i.num}</span>
                <h3>{i.title}</h3>
                <p>{i.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="s-opps" id="opportunites">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">
              {t("terrains.surtitre", "Terrains & opportunités")}
            </span>
            <h2>{t("terrains.titre", "Rendre la maison concrète")}</h2>
            {/* Le repli contient une espace insécable (U+00A0) devant les
                deux-points, exactement comme le gabarit aujourd'hui :
                invisible ici, elle évite un deux-points en début de ligne. */}
            <p
              className="u-muted u-measure"
              style={{ ...PRE_LINE, marginTop: "var(--s-2)" }}
            >
              {t(
                "terrains.texte",
                "Nos agences repèrent les parcelles compatibles avec la maison, souvent avant leur mise sur le marché. La maison est décidée : il ne reste qu'à choisir où la poser.",
              )}
            </p>
          </div>
          <div className="s-opps__grid">
            {recentes.map((a) => (
              <AnnonceCard annonce={a} key={a.id} />
            ))}
          </div>
          <div className="s-opps__foot" data-reveal>
            <Link href="/annonces" className="c-link">
              Voir tous les terrains disponibles →
            </Link>
          </div>
        </div>
      </section>

      <section className="s-trust" id="agences">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">
              {t("engagements.surtitre", "Nos engagements")}
            </span>
            <h2>{t("engagements.titre", "Construire en confiance")}</h2>
          </div>
          <div className="s-trust__grid">
            {D.trust.map((t) => (
              <div className="s-trust__item" data-reveal key={t.title}>
                <Icon name={t.icon} />
                <h3>{t.title}</h3>
                <p>{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="s-cta" id="projet">
        <div className="container s-cta__grid">
          <div>
            <span className="c-label" style={{ color: "var(--bois)" }} data-reveal>
              {t("cta.surtitre", "Votre projet")}
            </span>
            {/* Ici encore, les espaces insécables (U+00A0) des replis sont
                celles du gabarit d'origine : devant « ? », et entre 48 et h. */}
            <h2 data-reveal style={{ ...PRE_LINE, ...delay(".1s") }}>
              {t("cta.titre", "Et si votre maison était déjà dessinée ?")}
            </h2>
            <p data-reveal style={{ ...PRE_LINE, ...delay(".2s") }}>
              {t(
                "cta.texte",
                "Parlez-nous de votre projet. Une agence Essensya vous rappelle sous 48 h, sans engagement.",
              )}
            </p>
          </div>
          <div data-reveal style={delay(".25s")}>
            <LeadForm
              originKey="rappel"
              gtmEvent="lead_callback_request"
              dark
              submitLabel="Être rappelé"
              successMessage="Merci — une agence Essensya vous rappelle sous 48 h."
            >
              <div className="c-form__row">
                <div className="c-field">
                  <label htmlFor="f-name">Prénom &amp; nom</label>
                  <input type="text" id="f-name" name="name" required />
                </div>
                <div className="c-field">
                  <label htmlFor="f-phone">Téléphone</label>
                  <input type="tel" id="f-phone" name="phone" required />
                </div>
              </div>
              <div className="c-form__row">
                <div className="c-field">
                  <label htmlFor="f-zone">Secteur du projet</label>
                  <input type="text" id="f-zone" name="zone" placeholder="Ville ou code postal" />
                </div>
                <div className="c-field">
                  <label htmlFor="f-stage">Où en êtes-vous&nbsp;?</label>
                  <select id="f-stage" name="stage" defaultValue="Je découvre">
                    <option>Je découvre</option>
                    <option>Je cherche un terrain</option>
                    <option>J&apos;ai déjà un terrain</option>
                    <option>Je compare des constructeurs</option>
                  </select>
                </div>
              </div>
            </LeadForm>
          </div>
        </div>
      </section>
    </main>
  );
}
