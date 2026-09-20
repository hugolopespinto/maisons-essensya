import type { Metadata } from "next";
import AgencyCard from "@/components/AgencyCard";
import AnnonceCard from "@/components/AnnonceCard";
import Compare from "@/components/Compare";
import { MarkedList, SpecList } from "@/components/SpecList";
import Substitut from "@/components/Substitut";
import { Picto } from "@/components/icons";
import { AGENCIES, ESSENSYA_DATA, HOUSE, PRICE_FROM, REEL } from "@/data/essensya";
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

/* ⚠ CE TABLEAU NE CONTIENT PLUS AUCUN CODE HEXADÉCIMAL, ET C'EST
   VOLONTAIRE. Il en contenait treize, recopiés de `base.css`, et ils y
   ont survécu au changement de palette : cette page a affiché « Bois
   #9A6B3C » pendant que le site n'avait plus une seule touche de brun.
   Une page qui documente les couleurs ne peut pas avoir sa propre
   version des couleurs.

   La pastille est donc peinte avec le token lui-même : elle ne peut pas
   mentir. La valeur, elle, se lit à son seul endroit — le bloc TOKENS
   de `src/styles/base.css`, où figurent aussi les contrastes mesurés. */
const SWATCHES: [string, string, string][] = [
  ["Craie", "craie", "Fond de page"],
  ["Sable", "sable", "Aplats secondaires — le bandeau gris de la charte"],
  ["Béton", "beton", "Filets 1 px"],
  ["Béton 2", "beton-2", "Lignes de tableau"],
  ["Pierre", "pierre", "Texte secondaire — 5,08:1 sur craie"],
  ["Pierre clair", "pierre-clair", "Non textuel — 3,45:1"],
  ["Anthracite", "anthracite", "Texte courant et fonds sombres"],
  ["Noir", "noir", "Pied de page — le « Noir » de la charte"],
  ["Vert", "vert", "Charte — aplats et pictos, jamais de texte"],
  ["Vert texte", "vert-texte", "Charte — texte, 5,07:1"],
  ["Vert clair", "vert-clair", "Charte — texte sur fond sombre"],
  ["Vert fond", "vert-fond", "Charte — aplat clair"],
  ["Terracotta", "terracotta", "Charte — aplats et filets, jamais de texte"],
  ["Terracotta texte", "terracotta-texte", "Charte — accent et liens, 5,04:1"],
  ["Terracotta clair", "terracotta-clair", "Charte — accent sur fond sombre"],
  ["Framboise", "framboise", "Charte — boutons et focus, 5,56:1"],
  ["Framboise foncé", "framboise-fonce", "Survol du bouton plein"],
  ["Framboise fond", "framboise-fond", "Aplat d'offre"],
  ["Alerte", "alerte", "Attention, brouillon, à compléter"],
  ["Alerte fond", "alerte-fond", "Aplat d'attention"],
  ["Inclus", "inclus", "Puce « compris » — alias du vert texte"],
  ["Exclu", "exclu", "Puce « non compris » — alias de pierre"],
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

  return (
    <main className="page">
      <section className="styleguide">
        <div className="container">
          <div className="c-section-head">
            <span className="c-label c-label--accent">Interne</span>
            <h2>Design system</h2>
            <p className="u-muted" style={{ marginTop: "var(--s-2)" }}>
              Documentation des tokens et composants — non destinée à la production.
              Le site vend une GAMME de modèles : un composant qui suppose un
              produit unique est un composant à corriger.
            </p>
          </div>

          <div className="sg-block">
            <span className="c-label">Palette</span>
            <div className="sg-swatches">
              {SWATCHES.map(([n, token, role]) => (
                <div className="sg-swatch" key={token}>
                  <div style={{ background: `var(--${token})` }} />
                  <span>
                    {n}
                    <br />
                    <code>--{token}</code>
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
              <small>{REEL.mentionPrix}</small>
            </span>
          </div>

          <div className="sg-block">
            <span className="c-label">Bandeau d&apos;offre — .c-offer</span>
            <p className="u-muted u-measure" style={{ marginBottom: "var(--s-3)" }}>
              Le seul aplat de framboise du site. Il signale une offre datée,
              jamais une qualité du produit.
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
              {/* ⚠ Valeurs de DÉMONSTRATION, écrites ici et nulle part
                  ailleurs. Elles venaient d une déclinaison inventée ; les
                  brancher sur un vrai modèle ferait afficher des
                  caractéristiques que nous n avons pas. Cette page est une
                  documentation de composants, pas une fiche produit. */}
              <SpecList
                rows={[
                  ["Surface", "000 m²"],
                  ["Chambres", "0"],
                  ["Garage", "00 m²"],
                  ["Prix", fmtPrice(PRICE_FROM)],
                  ["Terrain", fmtSurface(null)],
                ]}
              />
              <div
                className="u-sombre"
                style={{ background: "var(--anthracite)", color: "var(--craie)", padding: "var(--s-3)" }}
              >
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
          {/* ⚠ Le bloc « Déclinaison — <VersionCard> » a été retiré avec le
              composant lui-même : il documentait une carte de déclinaison
              inventée. Son remplaçant, <ModeleCard>, vit sur /maisons. */}
          <div className="sg-block">
            <span className="c-label">Pictos annonce</span>
            <div className="c-pictos">
              <Picto icon="surface" value="000 m²" label="Maison" />
              <Picto icon="bed" value={0} label="Chambres" />
              <Picto icon="land" value="420 m²" label="Terrain" />
              <Picto icon="loc" value={AGENCIES[0].name} label="Agence" />
              <Picto icon="price" value={fmtPrice(PRICE_FROM)} label="À partir de" />
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
