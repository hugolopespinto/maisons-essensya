import Link from "next/link";
import AnnonceCard from "@/components/AnnonceCard";
import ArgumentRow from "@/components/ArgumentRow";
import HeroAccueil from "@/components/HeroAccueil";
import LeadForm from "@/components/LeadForm";
import { AnnonceMedia } from "@/components/Substitut";
import { Icon } from "@/components/icons";
import { ESSENSYA_DATA, PLACEHOLDER, PRICE_FROM, REEL } from "@/data/essensya";
import { vue } from "@/data/visuels";
import "@/styles/accueil.css";
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

/* Les trois photos sous le bloc « La maison juste, le prix juste ».
   Trois MODÈLES différents, pas trois vues du même : la section parle
   d'une gamme, les images doivent en montrer une. Extérieur, intérieur,
   extérieur — pour que la rangée respire au lieu d'aligner trois
   façades. `vue()` lève si une clé n'existe pas : une image manquante
   casse le build plutôt que la page. */
const PHOTOS_JUSTE = [
  { visuel: vue("athenes", "vue-1-avant"), alt: "Maison Essensya modèle Athènes, façade" },
  { visuel: vue("berlin", "vue-3-interieur"), alt: "Séjour d'une maison Essensya modèle Berlin" },
  { visuel: vue("dublin", "vue-2-exterieur"), alt: "Maison Essensya modèle Dublin, côté jardin" },
];

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
      <HeroAccueil
        visuel={vue("lisbonne", "vue-2-exterieur")}
        baseline={t("hero.baseline", "Votre maison au prix juste")}
        titre={t(
          "hero.titre",
          "Maisons Essensya, constructeur de maisons au prix juste dans les Landes",
        )}
        alt="Maison Essensya modèle Lisbonne, vue de la terrasse"
      />

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

      <section className="s-juste" id="prix-juste">
        <div className="container">
          <div className="s-juste__grid">
            <div data-reveal>
              <span className="c-label c-label--accent">
                {t("juste.surtitre", "La maison juste, le prix juste")}
              </span>
              {/* Le prix est le premier argument du site : il est affiché
                  avec ce qu'il ne comprend PAS, sinon il n'est pas
                  crédible — et « hors adaptation » est justement le poste
                  qui surprend en fin de parcours. */}
              <p className="c-price-xl" style={{ marginTop: "var(--s-4)" }}>
                <span className="from">La maison, à partir de</span>
                {fmtPrice(REEL.prixEntree)}
                <small>{t("juste.mention", REEL.mentionPrix)}</small>
              </p>
            </div>
            <div>
              <p className="big" data-reveal style={PRE_LINE}>
                {t(
                  "juste.phrase",
                  "Construire mieux en choisissant l'essentiel. Des modèles de maisons pensés dans les moindres détails, optimisés à l'essentiel jusqu'au dernier mètre carré, pour obtenir un prix maîtrisé sans compromis sur la qualité.",
                )}
              </p>
              <p className="s-juste__note" data-reveal>
                {t(
                  "juste.texte",
                  "Avec Maisons ESSENSYA, chaque plan est conçu par notre bureau d'études avec un mot d'ordre : uniquement l'essentiel pour maximiser le prix.",
                )}
              </p>
            </div>
          </div>

          {/* La rangée de photos demandée sous le bloc. Trois modèles
              différents plutôt que trois vues du même : c'est une gamme
              qu'on montre, pas un produit. */}
          <div className="s-juste__photos">
            {PHOTOS_JUSTE.map((ph) => (
              <div
                className="s-juste__photo"
                key={ph.visuel.src}
                style={{ backgroundImage: `url(${ph.visuel.empreinte})` }}
                data-reveal
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ph.visuel.srcPetit}
                  srcSet={`${ph.visuel.srcPetit} 720w, ${ph.visuel.src} ${ph.visuel.largeur}w`}
                  sizes="(max-width:900px) 100vw, 33vw"
                  width={ph.visuel.largeur}
                  height={ph.visuel.hauteur}
                  alt={ph.alt}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Les arguments ──
          Ce bloc déroulait les trois modèles du catalogue. Il déroule
          désormais les trois raisons de n'en faire qu'un. */}
      <section className="s-args s-raison" id="raison">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">
              {t("raison.surtitre", "Notre raison d'être")}
            </span>
            <h2 style={PRE_LINE}>
              {t("raison.titre", "Votre construction de maison en 3 points")}
            </h2>
          </div>
          <div className="s-args__list">
            {D.arguments.map((a) => (
              <ArgumentRow item={a} key={a.cle} />
            ))}
          </div>
        </div>
      </section>

      {/* ⚠ DEUX SECTIONS ONT ÉTÉ RETIRÉES ICI, SUR DEMANDE DU CLIENT.

          · le comparatif « Pourquoi c'est moins cher » ;
          · le sélecteur de déclinaisons.

          Le motif est le même pour les deux : « la home est trop longue,
          trop fournie et peu lisible ». Le comparatif reste vivant sur
          /maisons, où il a sa place — le visiteur y est déjà convaincu
          qu'il veut comprendre. Le sélecteur, lui, n'a plus d'objet sur
          l'accueil d'une gamme de dix modèles : c'est le rôle de
          /maisons.

          Les composants `Compare` et `VersionCard` ne sont pas
          supprimés : /maisons les utilise toujours. */}

      <section className="s-philo s-forts" id="points-forts">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label">{t("forts.surtitre", "Nos points forts")}</span>
            <h2 style={PRE_LINE}>
              {t("forts.titre", "Six raisons de construire avec nous")}
            </h2>
          </div>
          <div className="s-forts__grid">
            {D.philosophy.map((i) => (
              <div className="s-forts__item" data-reveal key={i.num}>
                <span className="s-forts__num">{i.num}</span>
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
