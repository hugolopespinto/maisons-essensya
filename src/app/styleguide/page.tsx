import type { Metadata } from "next";
import AgencyCard from "@/components/AgencyCard";
import AnnonceCard from "@/components/AnnonceCard";
import Plate from "@/components/Plate";
import { Picto } from "@/components/icons";
import { AGENCIES, MODELS } from "@/data/essensya";
import { getAnnonces } from "@/lib/vitahome/annonces";
import "@/styles/pages/styleguide.css";
import "@/styles/pages/agences.css";

export const metadata: Metadata = {
  title: "Design system",
  description: "Documentation des tokens et composants — usage interne.",
  robots: { index: false, follow: false },
};

const SWATCHES: [string, string][] = [
  ["Craie", "#F3F1EC"],
  ["Sable", "#E8E3D9"],
  ["Béton", "#CFC9BD"],
  ["Pierre", "#867E70"],
  ["Anthracite", "#21201C"],
  ["Noir", "#131210"],
  ["Bois (accent)", "#9A6B3C"],
];

export default async function StyleguidePage() {
  const annonces = await getAnnonces();

  return (
    <main className="page">
      <section className="styleguide">
        <div className="container">
          <div className="c-section-head">
            <span className="c-label c-label--accent">Interne</span>
            <h2>Design system</h2>
            <p className="u-muted" style={{ marginTop: "var(--s-2)" }}>
              Documentation des tokens et composants — non destinée à la production.
            </p>
          </div>

          <div className="sg-block">
            <span className="c-label">Palette</span>
            <div className="sg-swatches">
              {SWATCHES.map(([n, c]) => (
                <div className="sg-swatch" key={c}>
                  <div style={{ background: c }} />
                  <span>
                    {n}
                    <br />
                    {c}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="sg-block sg-type">
            <span className="c-label">Typographie</span>
            <h1>Archivo — Display</h1>
            <h3 style={{ marginTop: "var(--s-2)" }}>Archivo — Titres secondaires</h3>
            <p style={{ marginTop: "var(--s-2)" }}>Instrument Sans — corps de texte.</p>
            <p className="c-label">IBM Plex Mono — labels &amp; données produit</p>
          </div>

          <div className="sg-block">
            <span className="c-label">Boutons</span>
            <div className="sg-row">
              <span className="c-btn">Bouton défaut</span>
              <span className="c-btn c-btn--solid">
                Bouton solide <span className="arrow">→</span>
              </span>
              <span className="c-link">Lien texte →</span>
            </div>
          </div>

          <div className="sg-block">
            <span className="c-label">Plaque modèle (signature)</span>
            <div className="c-plate">
              <Plate model={MODELS[0]} />
            </div>
          </div>

          <div className="sg-block">
            <span className="c-label">Pictos annonce</span>
            <div className="c-pictos">
              <Picto icon="surface" value="92 m²" label="Maison" />
              <Picto icon="bed" value="3" label="Chambres" />
              <Picto icon="land" value="420 m²" label="Terrain" />
              <Picto icon="loc" value="Montpellier" label="Localisation" />
              <Picto icon="price" value="289 000 €" label="À partir de" />
            </div>
          </div>

          <div className="sg-block">
            <span className="c-label">Annonce card</span>
            <div style={{ maxWidth: 380 }}>
              {annonces[0] && <AnnonceCard annonce={annonces[0]} reveal={false} />}
            </div>
          </div>

          <div className="sg-block">
            <span className="c-label">Agency card</span>
            <div style={{ maxWidth: 380 }}>
              <AgencyCard agency={AGENCIES[0]} reveal={false} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
