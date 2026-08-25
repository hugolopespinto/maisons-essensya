import Link from "next/link";
import HomeHero from "@/components/HomeHero";
import LeadForm from "@/components/LeadForm";
import ModelRow from "@/components/ModelRow";
import Plate from "@/components/Plate";
import { Icon } from "@/components/icons";
import { ESSENSYA_DATA, modelById } from "@/data/essensya";
import {
  annonceSpecs,
  annonceTitle,
  annonceUrl,
  dept,
  fmtPrice,
  modelUrl,
} from "@/lib/format";
import { getAnnonces } from "@/lib/vitahome/annonces";

const D = ESSENSYA_DATA;
const delay = (s: string) => ({ "--reveal-delay": s }) as React.CSSProperties;

export default async function HomePage() {
  const annonces = await getAnnonces();
  const heroModel = modelById(D.hero.refId) ?? D.models[0];
  const featuredModel = modelById(D.featured.refId);

  return (
    <main className="page">
      <HomeHero model={heroModel} />

      <section className="s-idea" id="idee">
        <div className="container grid">
          <div data-reveal>
            <span className="c-label c-label--accent">L&apos;idée</span>
          </div>
          <div>
            <p className="big" data-reveal>
              Construire mieux en choisissant l&apos;essentiel. Des modèles peu
              nombreux, pensés dans le détail, optimisés jusqu&apos;au dernier mètre
              carré — pour un prix maîtrisé, sans compromis sur la qualité.
            </p>
            <p className="u-muted u-measure" style={{ marginTop: "var(--s-3)" }} data-reveal>
              Chez Essensya, chaque maison est un produit conçu, pas une addition
              d&apos;options. Moins de choix inutiles, plus d&apos;intelligence dans
              chaque choix.
            </p>
          </div>
        </div>
      </section>

      <section className="s-product">
        <div className="container">
          <figure className="s-product__main">
            <div className="c-reveal-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1920&auto=format&fit=crop"
                alt="Séjour lumineux du modèle Essen"
                loading="lazy"
              />
            </div>
            <figcaption className="c-plate" data-reveal>
              <Plate model={D.models[0]} />
            </figcaption>
          </figure>

          <div className="s-product__duo">
            <figure>
              <div className="c-reveal-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=1200&auto=format&fit=crop"
                  alt="Détail de façade"
                  loading="lazy"
                />
              </div>
              <figcaption className="caption" data-reveal>
                Détail — enduit minéral, menuiserie aluminium
              </figcaption>
            </figure>
            <figure>
              <div className="c-reveal-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1400&auto=format&fit=crop"
                  alt="Volume de vie ouvert"
                  loading="lazy"
                />
              </div>
              <figcaption className="caption" data-reveal>
                Volume de vie — cuisine ouverte, 5,40 m de baie
              </figcaption>
            </figure>
          </div>

          <div className="s-product__text">
            <h3 data-reveal>Chaque mètre carré a une raison d&apos;être</h3>
            <p data-reveal>
              Un modèle Essensya n&apos;est pas un plan générique : c&apos;est une
              conception aboutie, où chaque volume, chaque ouverture et chaque matériau
              a été arbitré pour maximiser la qualité de vie au juste prix. Ce que nous
              ne dépensons pas en options superflues, nous l&apos;investissons là où ça
              compte.
            </p>
          </div>
        </div>
      </section>

      <section className="s-philo">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label">Pourquoi le catalogue</span>
            <h2>
              Moins de choix.
              <br />
              Mieux choisis.
            </h2>
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

      <section className="s-collection" id="collection">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">La collection</span>
            <h2>
              Trois maisons.
              <br />
              Zéro superflu.
            </h2>
          </div>
          <div className="s-collection__list">
            {D.models.map((m) => (
              <ModelRow model={m} key={m.id} />
            ))}
          </div>
        </div>
      </section>

      <section className="s-featured" id="featured">
        <div className="s-featured__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={D.featured.image} alt={D.featured.alt} loading="lazy" />
        </div>
        <div className="container">
          <span className="c-label" style={{ color: "var(--sable)" }} data-reveal>
            En ce moment
          </span>
          <h2 data-reveal style={delay(".1s")}>
            {D.featured.title}
          </h2>
          <div className="c-plate" data-reveal style={delay(".2s")}>
            {featuredModel && <Plate model={featuredModel} withName={false} />}
          </div>
          <div data-reveal style={delay(".3s")}>
            <Link
              href={featuredModel ? modelUrl(featuredModel) : "/maisons"}
              className="c-btn c-btn--light"
            >
              {D.featured.ctaLabel} <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="s-steps">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">Comment ça marche</span>
            <h2>Du modèle au projet</h2>
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
            <span className="c-label c-label--accent">Terrains &amp; opportunités</span>
            <h2>Rendre votre maison concrète</h2>
            <p className="u-muted u-measure" style={{ marginTop: "var(--s-2)" }}>
              Nos agences sélectionnent des terrains compatibles avec chaque modèle.
              Choisissez la maison, nous trouvons le lieu.
            </p>
          </div>
          <div className="s-opps__grid">
            {annonces.slice(0, 3).map((a) => (
              <Link className="c-opp" href={annonceUrl(a)} data-reveal key={a.id}>
                <span className="c-opp__loc">
                  {a.city} ({dept(a)})
                </span>
                <span className="c-opp__title">
                  {annonceTitle(a, a.modelId ? modelById(a.modelId)?.name : null)}
                </span>
                <span className="c-opp__meta">
                  {annonceSpecs(a)} · à partir de {fmtPrice(a.price)}
                </span>
              </Link>
            ))}
          </div>
          <div className="s-opps__foot" data-reveal>
            <Link href="/annonces" className="c-link">
              Voir toutes les opportunités →
            </Link>
          </div>
        </div>
      </section>

      <section className="s-trust" id="agences">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">Nos engagements</span>
            <h2>Construire en confiance</h2>
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
              Votre projet
            </span>
            <h2 data-reveal style={delay(".1s")}>
              Et si votre maison était déjà dessinée&nbsp;?
            </h2>
            <p data-reveal style={delay(".2s")}>
              Parlez-nous de votre projet. Une agence Essensya vous rappelle sous
              48&nbsp;h, sans engagement.
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
