import type { Metadata } from "next";
import Link from "next/link";
import LeadForm, { ContactFields } from "@/components/LeadForm";
import Compare from "@/components/Compare";
import ModeleCard from "@/components/ModeleCard";
import SpecList, { MarkedList } from "@/components/SpecList";
import { ESSENSYA_DATA, HOUSE, PRICE_FROM, REEL } from "@/data/essensya";
import { gammeIncomplete, modelesAvecVisuels, MODELES } from "@/data/gamme";
import { srcSet, vue } from "@/data/visuels";
import { fmtPrice } from "@/lib/format";
import { filAriane, jsonLd, listeSchema, produitGamme } from "@/lib/schema";
import { resolveMetadata, titreGamme } from "@/lib/seo";
import { getContent } from "@/lib/store";
import type { PageEditable } from "@/lib/store/types";
import "@/styles/pages/modele.css";
import "@/styles/pages/maison.css";
import "@/styles/pages/gamme.css";

/* ════════════════════════════════════════════════════════════════
   NOS MODÈLES — la page de gamme

   ⚠ CETTE PAGE ÉTAIT LA FICHE D'UNE MAISON UNIQUE QUI N'EXISTE PAS.
   Elle s'ouvrait sur « Essen », nom commercial inventé pour la maquette,
   affichait deux déclinaisons fictives avec leurs prix, une visite
   pièce par pièce cotée au mètre carré, une toiture monopente en bac
   acier — et un prix d'appel de 94 900 € que la page d'accueil
   contredisait à 78 000 €.

   Le client vend onze modèles. Ce qui a été retiré l'a été parce que
   c'était FAUX, pas pour alléger :

     · la visite pilotée au scroll — six pièces cotées d'une maison qui
       n'existe pas, et le client a par ailleurs rejeté ce procédé sur
       l'accueil (« on dirait que le site ne fonctionne pas ») ;
     · la section « Un plan, deux déclinaisons » — aucun plan n'a été
       livré, et il n'y a plus de déclinaisons ;
     · les deux cartes de prix — 99 900 € et 94 900 €, inventés ;
     · le sélecteur de déclinaison du formulaire, qui envoyait au CRM du
       client le nom d'un produit imaginaire.

   CE QUE LA PAGE DIT MAINTENANT, et rien de plus : la gamme existe,
   voici ses modèles en images, voici le prix d'entrée avec son
   périmètre exact, voici ce qui est compris et ce qui ne l'est pas.

   ⚠ TANT QUE LES CARACTÉRISTIQUES MANQUENT, ON LE DIT. Le bloc
   « caractéristiques à venir » n'est pas un pis-aller : un visiteur qui
   cherche une surface et n'en trouve aucune, sans explication, conclut
   que le site est inachevé. Lui dire que les fiches arrivent et lui
   offrir de demander le détail transforme le manque en prise de
   contact. Il disparaîtra tout seul — voir `gammeIncomplete()`.
   ════════════════════════════════════════════════════════════════ */

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/maisons", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: titreGamme(),
  description:
    `Une gamme de ${MODELES.length} modèles de maisons individuelles, optimisés jusqu'au dernier mètre carré. ` +
    `À partir de ${fmtPrice(PRICE_FROM)} — ${REEL.mentionPrix.toLowerCase()} ` +
    `Ce qui est compris et ce qui ne l'est pas, écrit noir sur blanc.`,
  alternates: { canonical: "/maisons" },
  openGraph: {
    title: titreGamme(),
    images: [HOUSE.heroImage],
  },
};

/**
 * Lecteur des blocs saisis dans « Pages → Nos modèles ».
 *
 * Le texte du back-office ne remplace celui du gabarit que s'il est
 * renseigné : vider un champ redonne la phrase d'origine — dont celles
 * qui affichent le prix à jour — et jamais du vide.
 */
function lecteurBlocs(pages: PageEditable[], clePage: string) {
  const blocs = pages.find((p) => p.cle === clePage)?.blocs ?? [];
  return (cle: string, defaut: string) =>
    blocs.find((b) => b.cle === cle)?.valeur.trim() || defaut;
}

const D = ESSENSYA_DATA;
const PRE_LINE = { whiteSpace: "pre-line" } as const;

export default async function MaisonsPage() {
  const { pages } = await getContent();
  const t = lecteurBlocs(pages, "maison");
  const modeles = modelesAvecVisuels();
  const enAttente = gammeIncomplete();
  const heroVisuel = vue("lisbonne", "vue-2-exterieur");

  return (
    <main className="page">
      {/* Un seul `Product`, celui de la gamme, et il ne déclare que ce
          que la page affiche : la marque et le prix d'entrée. Aucune
          surface, aucun modèle nommé — voir src/lib/schema.ts. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(produitGamme()) }}
      />
      {/* ⚠ LES ONZE, Y COMPRIS LES DIX EN `noindex`, ET C'EST DÉLIBÉRÉ.
          Un `ItemList` décrit ce que la page REND ; il ne demande pas
          l'indexation de ce qu'il liste. N'annoncer qu'Ankara
          sous-décrirait une grille qui en montre onze. Le sitemap, lui,
          est une promesse d'URL qui répondent : il n'annonce que les
          publiables. Les deux règles sont écrites des deux côtés pour
          qu'elles cessent de se contredire. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            listeSchema(
              "Nos modèles",
              modeles.map((m) => ({ nom: m.nom, path: `/maisons/${m.slug}` })),
            ),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(filAriane([{ nom: "Accueil", path: "/" }, { nom: "Nos modèles" }])),
        }}
      />

      {/* ── 1. Le prix, avant tout le reste ── */}
      <section className="m-hero mp-hero">
        <div className="m-hero__bg">
          <picture>
            <source type="image/avif" srcSet={srcSet(heroVisuel, "avif")} sizes="100vw" />
            <source type="image/webp" srcSet={srcSet(heroVisuel, "webp")} sizes="100vw" />
            <img
              src={heroVisuel.src}
              width={heroVisuel.largeur}
              height={heroVisuel.hauteur}
              alt={HOUSE.alt}
              fetchPriority="high"
            />
          </picture>
        </div>
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>Nos modèles</span>
          </nav>
          <span className="c-label c-label--accent">
            {t("hero.surtitre", "La gamme Essensya")}
          </span>
          <h1>Nos modèles</h1>
          <p className="mp-hero__tagline">{HOUSE.tagline}</p>

          <p className="c-price-xl">
            <span className="from">À partir de</span>
            {fmtPrice(PRICE_FROM)}
            {/* La mention du client, mot pour mot. « Hors adaptation » est
                le poste qui surprend en fin de parcours : il suit le prix
                partout où le prix apparaît. */}
            <small>{REEL.mentionPrix}</small>
          </p>

          <div className="mp-hero__actions">
            <a href="#gamme" className="c-btn c-btn--light">
              Voir les {modeles.length} modèles <span className="arrow">→</span>
            </a>
            <a href="#prix" className="c-link">
              Ce que le prix comprend →
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

      {/* ── 3. La gamme ── */}
      <section className="g-gamme mp-anchor" id="gamme">
        <div className="container">
          <div className="c-section-head">
            <span className="c-label">{t("gamme.surtitre", "La gamme")}</span>
            <h2 style={PRE_LINE}>
              {t("gamme.titre", `${MODELES.length} modèles, un seul parti-pris`)}
            </h2>
            <p className="u-muted u-measure" style={PRE_LINE}>
              {t(
                "gamme.texte",
                "Chaque plan a été optimisé poste par poste, matériau par matériau : pas de dégagement inutile, pas de recoin qui ne sert à rien. Le modèle change, la méthode ne change pas.",
              )}
            </p>
          </div>

          <div className="g-gamme__grid">
            {modeles.map((m) => (
              <ModeleCard modele={m} key={m.slug} />
            ))}
          </div>

          {/* Le manque, dit franchement, avec une sortie. Il s'efface le
              jour où les ONZE modèles porteront leurs chiffres — pas dès
              le premier : c'est exactement à ce moment-là que la phrase
              devient vraie pour les dix autres. */}
          {enAttente && (
            <div className="g-attente">
              <p>
                <strong>Les caractéristiques arrivent modèle par modèle.</strong>{" "}
                Surfaces, nombre de chambres et de pièces, et prix par modèle sont
                en cours de publication.
              </p>
              <p>
                Vous voulez le détail d&apos;un modèle dès maintenant ?{" "}
                <Link href="/contact" className="c-link" style={{ display: "inline" }}>
                  Demandez-le nous
                </Link>{" "}
                — nous vous l&apos;envoyons avec le chiffrage pour votre commune.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Ce qu'on ne voit pas : la méthode ── */}
      <section className="m-arch">
        <div className="container">
          <div className="m-arch__grid">
            <figure className="c-reveal-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HOUSE.archImage} alt="Maison Essensya, vue extérieure" loading="lazy" />
            </figure>
            <div>
              <span className="c-label">{t("architecture.surtitre", "La méthode")}</span>
              <h2>{t("architecture.titre", "Un volume simple, dessiné jusqu'au bout")}</h2>
              <p>{HOUSE.archText}</p>
              {/* Quatre postes seulement, et tous écrits par le client.
                  Les six prestations constructives qui figuraient ici
                  décrivaient une maison qui n'est pas la sienne. */}
              <SpecList rows={HOUSE.materials} dark className="mp-arch__specs" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Les prestations ── */}
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

      {/* ── 6. LE BLOC PRIX ──
             Les exclusions sont affichées aussi grand que les inclusions.
             C'est une obligation CCMI autant qu'un argument : un prix bas
             dont on cache le périmètre n'est pas cru. */}
      <section className="m-price mp-anchor" id="prix">
        <div className="container">
          <div className="c-section-head">
            <span className="c-label">{t("prix.surtitre", "Le prix")}</span>
            <h2>{t("prix.titre", "Ce qu'il comprend, ce qu'il ne comprend pas")}</h2>
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
            {fmtPrice(PRICE_FROM)} — {REEL.mentionPrix} Chiffrage définitif selon le
            terrain et la commune, dès le premier rendez-vous.
          </p>
        </div>
      </section>

      {/* ── 7. Le comparatif ──
             Déplacé de l'accueil, que le client trouvait trop longue. Il
             garde ici toute sa place : le visiteur qui descend jusque-là
             veut comprendre le prix. */}
      <section className="s-compare" id="comparatif">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">{t("comparatif.surtitre", "Le prix")}</span>
            <h2>{D.compare.title}</h2>
            <p className="s-compare__intro">{D.compare.intro}</p>
          </div>
          <Compare data={D.compare} />
        </div>
      </section>

      {/* ── 8. Le dossier ── */}
      <section className="s-cta" id="dossier">
        <div className="container">
          <div className="s-cta__grid">
            <div>
              <span className="c-label">{t("dossier.surtitre", "Le dossier")}</span>
              <h2>{t("dossier.titre", "Recevoir le dossier complet")}</h2>
              <p style={PRE_LINE}>
                {t(
                  "dossier.texte",
                  "Les plans de nos modèles, le descriptif détaillé des prestations, la liste de ce qui est compris et de ce qui ne l'est pas, et le chiffrage pour votre commune.",
                )}
              </p>
              <SpecList
                className="mp-form__specs"
                dark
                rows={[
                  ["Chiffrage", "Annoncé, pas estimé"],
                  ["Cadre", "Contrat CCMI"],
                  ["Engagement", "Aucun"],
                ]}
              />
            </div>

            <LeadForm
              originKey="model"
              gtmEvent="lead_model_request"
              dark
              submitLabel="Recevoir le dossier"
              successMessage="Merci — le dossier complet et le chiffrage vous arrivent rapidement."
              ctx={{ adContent: "Page gamme" }}
            >
              <ContactFields prefix="mf" />
              <div className="c-field">
                <label htmlFor="mf-zone">Commune ou code postal du projet</label>
                <input type="text" id="mf-zone" name="zone" placeholder="Ex. 40000" />
              </div>
              {/* ⚠ Ce champ proposait « 2 chambres » ou « 3 chambres » et
                  envoyait ce choix au CRM du client. Il liste maintenant
                  les modèles réels : une donnée fausse dans un fichier
                  commercial coûte plus cher qu'une page mal tournée. */}
              <div className="c-field">
                <label htmlFor="mf-modele">Modèle qui vous intéresse</label>
                <select id="mf-modele" name="reason" defaultValue="Je ne sais pas encore">
                  {MODELES.map((m) => (
                    <option key={m.slug} value={m.nom}>
                      {m.nom}
                    </option>
                  ))}
                  <option value="Je ne sais pas encore">Je ne sais pas encore</option>
                </select>
              </div>
            </LeadForm>
          </div>
        </div>
      </section>

      {/* ── 9. L'étape d'après ── */}
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
