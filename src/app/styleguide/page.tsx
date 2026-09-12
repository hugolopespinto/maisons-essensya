import type { Metadata } from "next";
import AgencyCard from "@/components/AgencyCard";
import AnnonceCard from "@/components/AnnonceCard";
import Compare from "@/components/Compare";
import Plate from "@/components/Plate";
import { MarkedList, SpecList } from "@/components/SpecList";
import Substitut from "@/components/Substitut";
import VersionCard from "@/components/VersionCard";
import { Picto } from "@/components/icons";
import { AGENCIES, ESSENSYA_DATA, HOUSE, PRICE_FROM, VERSIONS } from "@/data/essensya";
import { fmtPrice, fmtSurface } from "@/lib/format";
import { getAnnonces } from "@/lib/vitahome/annonces";
import type { Annonce } from "@/types";
import "@/styles/pages/styleguide.css";
import "@/styles/pages/agences.css";

export const metadata: Metadata = {
  title: "Design system",
  description: "Documentation des tokens et composants — usage interne.",
  robots: { index: false, follow: false },
};

/* Les cinq derniers tokens ont été ajoutés pour le mono-produit : deux
   gris de service (contraste, filets de tableau) et trois sémantiques
   (offre, compris, non compris). Ils sont documentés ici avec leur rôle,
   sinon ils seront réemployés à tort comme des couleurs libres. */
const SWATCHES: [string, string, string][] = [
  ["Craie", "#F3F1EC", "Fond de page"],
  ["Sable", "#E8E3D9", "Aplats secondaires"],
  ["Béton", "#CFC9BD", "Filets 1px"],
  ["Béton 2", "#B9B2A4", "Lignes de tableau"],
  ["Pierre", "#6E675B", "Texte secondaire (4,95:1)"],
  ["Pierre clair", "#867E70", "Non textuel uniquement"],
  ["Anthracite", "#21201C", "Texte courant"],
  ["Noir", "#131210", "Footer"],
  ["Bois", "#9A6B3C", "Accent, liens"],
  ["Bois clair", "#F0E4D6", "Aplat d'offre"],
  ["Bois foncé", "#7C5530", "Texte sur bois clair"],
  ["Inclus", "#4A6B4F", "Puce « compris »"],
  ["Exclu", "#8A7F72", "Puce « non compris »"],
];

/** Un cadre au ratio des médias d'annonce, pour comparer les tracés. */
const frame: React.CSSProperties = {
  aspectRatio: "16 / 10",
  border: "var(--line)",
  borderRadius: "var(--radius)",
  overflow: "hidden",
};

export default async function StyleguidePage() {
  const annonces = await getAnnonces();

  /* Trois annonces réellement dépourvues de photo : c'est le cas nominal
     du flux et le seul moyen de voir varier le tracé (parcelle seule,
     emprise bâtie, parcelle irrégulière). */
  const sansPhoto = annonces.filter((a) => !a.image);
  const echantillon: Annonce[] = [
    sansPhoto.find((a) => a.type === "terrain-maison"),
    ...sansPhoto.filter((a) => a.type === "terrain").slice(0, 2),
  ].filter((a): a is Annonce => Boolean(a));
  const substituts = (echantillon.length ? echantillon : annonces).slice(0, 3);

  const v = VERSIONS[0];

  return (
    <main className="page">
      <section className="styleguide">
        <div className="container">
          <div className="c-section-head">
            <span className="c-label c-label--accent">Interne</span>
            <h2>Design system</h2>
            <p className="u-muted" style={{ marginTop: "var(--s-2)" }}>
              Documentation des tokens et composants — non destinée à la production.
              Le site vend une maison et deux déclinaisons : aucun composant ne
              doit supposer un catalogue.
            </p>
          </div>

          <div className="sg-block">
            <span className="c-label">Palette</span>
            <div className="sg-swatches">
              {SWATCHES.map(([n, c, role]) => (
                <div className="sg-swatch" key={c}>
                  <div style={{ background: c }} />
                  <span>
                    {n}
                    <br />
                    {c}
                    <br />
                    {role}
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

          {/* ════ LE PRIX ════ */}
          <div className="sg-block">
            <span className="c-label">Prix héroïque — .c-price-xl</span>
            <p className="u-muted u-measure" style={{ marginBottom: "var(--s-3)" }}>
              Le geste central de la refonte : sur un produit dont le prix est
              l&apos;argument, le prix doit être le plus gros chiffre de la page,
              devant le h1. À n&apos;utiliser qu&apos;une fois par page, et
              toujours accompagné de ce qu&apos;il comprend.
            </p>
            <span className="c-price-xl">
              <span className="from">À partir de</span>
              {fmtPrice(PRICE_FROM)}
              <small>Maison seule, hors terrain — déclinaison {VERSIONS[1].label}</small>
            </span>
          </div>

          <div className="sg-block">
            <span className="c-label">Bandeau d&apos;offre — .c-offer</span>
            <p className="u-muted u-measure" style={{ marginBottom: "var(--s-3)" }}>
              Le seul aplat de bois du site. Il signale une offre datée, jamais
              une qualité du produit — le bois porte déjà cinq rôles ailleurs.
            </p>
            <div className="sg-row">
              <span className="c-offer">Prix de lancement</span>
              <span className="c-offer">10 premiers contrats signés</span>
            </div>
          </div>

          {/* ════ LISTES ════ */}
          <div className="sg-block">
            <span className="c-label">Liste clé/valeur — .c-specs via &lt;SpecList&gt;</span>
            <p className="u-muted u-measure" style={{ marginBottom: "var(--s-3)" }}>
              Le motif signature. Il remplace les cinq listes qui le
              réimplémentaient (matériaux, pièces, terrain, agence, prix). Les
              entrées à valeur vide sont ignorées : on ne rend jamais
              « null m² ».
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                gap: "var(--s-4)",
              }}
            >
              <SpecList
                rows={[
                  ["Surface", fmtSurface(v.surface)],
                  ["Chambres", String(v.bedrooms)],
                  ["Garage", fmtSurface(v.garageArea)],
                  ["Prix", fmtPrice(v.priceFrom)],
                  ["Terrain", fmtSurface(null)],
                ]}
              />
              <div style={{ background: "var(--anthracite)", padding: "var(--s-3)" }}>
                <SpecList rows={HOUSE.materials} dark />
              </div>
            </div>
          </div>

          <div className="sg-block">
            <span className="c-label">
              Compris / non compris — .c-specs--marked via &lt;MarkedList&gt;
            </span>
            <p className="u-muted u-measure" style={{ marginBottom: "var(--s-3)" }}>
              Les deux listes vont toujours par paire. Afficher la première sans
              la seconde détruit la crédibilité du prix bas plus vite que tout
              le reste.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                gap: "var(--s-4)",
              }}
            >
              <MarkedList items={HOUSE.included.slice(0, 5)} variant="in" />
              <MarkedList items={HOUSE.excluded} variant="out" />
            </div>
          </div>

          {/* ════ COMPARATIF ════ */}
          <div className="sg-block">
            <span className="c-label">Comparatif — .c-compare via &lt;Compare&gt;</span>
            <p className="u-muted u-measure" style={{ marginBottom: "var(--s-3)" }}>
              L&apos;argument de prix rendu vérifiable. Sobre par nécessité : un
              tableau criard ferait douter du prix au lieu de le justifier. Il
              défile horizontalement sous 520 px plutôt que de se tasser.
            </p>
            <Compare data={ESSENSYA_DATA.compare} />
          </div>

          {/* ════ SUBSTITUT ════ */}
          <div className="sg-block">
            <span className="c-label">Substitut graphique — .c-sub via &lt;Substitut&gt;</span>
            <p className="u-muted u-measure" style={{ marginBottom: "var(--s-3)" }}>
              Ce n&apos;est pas un placeholder d&apos;attente, c&apos;est le cas
              nominal : neuf terrains sur dix n&apos;ont aucune photo. On dessine
              la parcelle à l&apos;échelle, cotée, avec l&apos;emprise bâtie
              quand il y en a une — unique par annonce, 2 Ko, et plus informatif
              qu&apos;une prairie de banque d&apos;images. Passer toujours par
              &lt;AnnonceMedia&gt; côté pages : c&apos;est lui qui arbitre entre
              la photo et le tracé.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                gap: "var(--s-3)",
              }}
            >
              {substituts.map((a) => (
                <figure key={a.id}>
                  <div style={frame}>
                    <Substitut annonce={a} />
                  </div>
                  <figcaption className="c-label" style={{ marginTop: ".6rem" }}>
                    {a.city} · {a.type === "terrain" ? "Terrain" : "Terrain + maison"}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          {/* ════ PRODUIT ════ */}
          <div className="sg-block">
            <span className="c-label">Plaque de specs (signature)</span>
            <div className="c-plate">
              <Plate version={v} withGarage />
            </div>
          </div>

          <div className="sg-block">
            <span className="c-label">Déclinaison — &lt;VersionCard&gt;</span>
            <p className="u-muted u-measure" style={{ marginBottom: "var(--s-3)" }}>
              Deux plans, pas deux produits : la carte dit toujours ce qui ne
              change pas d&apos;une déclinaison à l&apos;autre.
            </p>
            <div style={{ maxWidth: 380 }}>
              <VersionCard version={v} />
            </div>
          </div>

          <div className="sg-block">
            <span className="c-label">Pictos annonce</span>
            <div className="c-pictos">
              <Picto icon="surface" value={fmtSurface(v.surface)} label="Maison" />
              <Picto icon="bed" value={v.bedrooms} label="Chambres" />
              <Picto icon="land" value="420 m²" label="Terrain" />
              <Picto icon="loc" value={AGENCIES[0].name} label="Agence" />
              <Picto icon="price" value={fmtPrice(v.priceFrom)} label="À partir de" />
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
