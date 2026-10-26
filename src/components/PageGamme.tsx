import Link from "next/link";
import type { ReactNode } from "react";
import FilAriane, { type Etape } from "@/components/FilAriane";
import HeroGamme, { type DiapoHero } from "@/components/HeroGamme";
import type { VueVitrine } from "@/components/ImageVue";
import LeadForm from "@/components/LeadForm";
import PrixCompris from "@/components/PrixCompris";
import SpecList from "@/components/SpecList";
import VitrineGamme, { type ModeleVitrine } from "@/components/VitrineGamme";
import { HOUSE, PRICE_FROM, REEL } from "@/data/essensya";
import {
  facadeDe,
  gammeIncomplete,
  MODELES,
  pictosModele,
  planDe,
  vuesDe,
  type Modele,
} from "@/data/gamme";
import { srcSet, type Visuel } from "@/data/visuels";
import { lecteurBlocs } from "@/lib/blocs";
import { fmtPrice } from "@/lib/format";
import { CHAMBRES_PLANS, libelleChambres, urlPlans } from "@/lib/plans";
import { getContent } from "@/lib/store";
import "@/styles/pages/modele.css";
import "@/styles/pages/maison.css";
import "@/styles/pages/gamme.css";
import "@/styles/pages/vitrine.css";
import "@/styles/pages/plans.css";
import "@/styles/pages/contact.css";

/* ════════════════════════════════════════════════════════════════
   LA PAGE DE GAMME — partagée par /maisons et /plans-de-maison/N

   Le corps de /maisons (héros en diaporama, vitrine des vues, dossier)
   vivait dans sa page. Les pages « Plans maison N chambres » du menu
   gardaient l'ancienne grille de cartes : un visiteur passait d'un
   design à l'autre selon le lien cliqué (relevé du client, 24/10). Les
   deux routes rendent désormais CE composant, avec leurs modèles : une
   seule mise en page, qui ne peut plus diverger.

   Ce qui change d'une route à l'autre, et rien d'autre :
     · les modèles montrés, et donc les façades du héros ;
     · le titre, le fil d'ariane et l'accroche ;
     · le sélecteur du nombre de chambres, qui marque la page courante ;
     · `complete` : /maisons garde ses blocs méthode, prestations et
       prix ; les pages filtrées vont droit au but — héros, vitrine,
       dossier — et renvoient au prix de /maisons. Les répéter cinq fois
       ferait cinq pages au contenu presque identique pour Google.
   ════════════════════════════════════════════════════════════════ */

const PRE_LINE = { whiteSpace: "pre-line" } as const;

/* Garde de type plutôt que conversion : `vuesDe()` écarte déjà les
   plans, mais le dire au compilateur évite d'écrire un ternaire qui
   rangerait un type inconnu dans « extérieur » (voir LIBELLE_VUE dans
   la fiche d'un modèle, qui a corrigé ce défaut-là). */
const estVue = (v: Visuel): v is Visuel & { type: VueVitrine["type"] } => v.type !== "plan";

/** Un visuel du catalogue, réduit à ce qu'un composant client affiche —
 *  les `srcset` calculés ici, côté serveur (voir ImageVue.tsx). */
const versVitrine = (v: Visuel & { type: VueVitrine["type"] }): VueVitrine => ({
  cle: v.cle,
  src: v.src,
  largeur: v.largeur,
  hauteur: v.hauteur,
  empreinte: v.empreinte,
  avif: srcSet(v, "avif"),
  webp: srcSet(v, "webp"),
  type: v.type,
});

/**
 * Les images du héros.
 *
 * ⚠ LE MODÈLE D'ENTRÉE OUVRE LE DIAPORAMA quand il est montré, et ce
 * n'est pas un choix esthétique : le prix posé dans le héros est le sien
 * (« modèle Pékin », dit la mention). Ouvrir sur un autre modèle, c'était
 * afficher 78 000 € sous la façade d'une maison qui n'a pas ce prix. Il
 * est retrouvé par le nom de `REEL` : si le client change de modèle
 * d'entrée, le diaporama suit.
 *
 * UN SEUL MODÈLE (« 1 chambre » : Pékin ; « 4 chambres » : Athènes) :
 * une façade seule ne ferait pas un diaporama. Ce sont alors ses vues
 * extérieures qui défilent.
 */
function diaposDu(modeles: Modele[]): DiapoHero[] {
  if (modeles.length === 1) {
    const [m] = modeles;
    const ext = vuesDe(m).filter(estVue).filter((v) => v.type === "exterieur");
    if (ext.length > 1) return ext.map((v) => ({ slug: m.slug, nom: m.nom, vue: versVitrine(v) }));
  }
  const entree = modeles.find((m) => m.nom === REEL.modeleEntree);
  return (entree ? [entree, ...modeles.filter((m) => m !== entree)] : modeles).flatMap((m) => {
    const f = facadeDe(m);
    return f && estVue(f) ? [{ slug: m.slug, nom: m.nom, vue: versVitrine(f) }] : [];
  });
}

export default async function PageGamme({
  modeles,
  fil,
  titre,
  accroche,
  chambres,
  teteVitrine,
  complete,
  origine,
  apresVitrine,
}: {
  /** Les modèles montrés — au moins un : la page appelante gère le vide. */
  modeles: Modele[];
  fil: Etape[];
  titre: string;
  accroche: ReactNode;
  /** Le nombre de chambres filtré, `null` pour la gamme entière. */
  chambres: number | null;
  /** Le titre et le texte de la vitrine ; par défaut, ceux du back-office. */
  teteVitrine?: { titre: string; texte: string };
  complete: boolean;
  /** Ce que le CRM reçoit comme provenance du formulaire de dossier. */
  origine: string;
  apresVitrine?: ReactNode;
}) {
  const { pages } = await getContent();
  const t = lecteurBlocs(pages, "maison");
  const diapos = diaposDu(modeles);
  const n = modeles.length;
  /* Le prix d'entrée n'est posé dans le héros que si son modèle y figure :
     sous les façades des modèles 3 chambres, « à partir de 78 000 € »
     se lirait comme leur prix. */
  const prixAuHeros = modeles.some((m) => m.nom === REEL.modeleEntree);
  const enAttente = complete && gammeIncomplete();

  const vitrine: ModeleVitrine[] = modeles.map((m) => ({
    slug: m.slug,
    nom: m.nom,
    pictos: pictosModele(m),
    prix: m.prixDepart !== undefined ? fmtPrice(m.prixDepart) : null,
    vues: vuesDe(m).filter(estVue).map(versVitrine),
    aPlan: planDe(m) !== null,
  }));

  return (
    <>
      {/* ── 1. Les façades, et le prix ──
             Le texte est rendu ici, côté serveur, et passé au diaporama :
             il est dans le HTML servi, lisible avant toute hydratation. */}
      <HeroGamme diapos={diapos}>
        <div className="gm-hero__grille">
          <div className="gm-hero__texte">
            <FilAriane items={fil} />
            <span className="c-label c-label--accent">
              {t("hero.surtitre", "La gamme Essensya")}
            </span>
            <h1 id="gm-hero-titre">{titre}</h1>
            <p className="gm-hero__accroche">{accroche}</p>
            <div className="gm-hero__actions">
              <a href="#gamme" className="c-btn c-btn--solid">
                {n > 1 ? `Explorer les ${n} modèles` : `Explorer le modèle ${modeles[0].nom}`}{" "}
                <span className="arrow" aria-hidden="true">→</span>
              </a>
              <a href={complete ? "#prix" : "/maisons#prix"} className="c-link">
                Ce que le prix comprend <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          {prixAuHeros && (
            <p className="c-price-xl gm-hero__prix">
              <span className="from">À partir de</span>
              {fmtPrice(PRICE_FROM)}
              {/* La mention du client, mot pour mot. « Hors adaptation » est
                  le poste qui surprend en fin de parcours : il suit le prix
                  partout où le prix apparaît. */}
              <small>{REEL.mentionPrix}</small>
            </p>
          )}
        </div>
      </HeroGamme>

      {/* ── 2. Le parti-pris ── */}
      {complete && (
        <section className="m-quote">
          <div className="container">
            <span className="c-label">{t("partiPris.surtitre", "Le parti-pris")}</span>
            <p data-reveal>{HOUSE.philosophy}</p>
          </div>
        </section>
      )}

      {/* ── 3. La vitrine ──
             Toutes les vues de chaque modèle. Fond noir : c'est une salle
             de projection, les rendus clairs y gagnent leur relief.
             `u-sombre` bascule l'accent et le focus vers leurs versions
             claires (voir base.css, « LES FONDS SOMBRES »). */}
      <section className="gm-gamme u-sombre mp-anchor" id="gamme">
        <div className="container">
          <div className="gm-gamme__tete">
            <div>
              <span className="c-label">{t("gamme.surtitre", "La gamme")}</span>
              <h2 style={PRE_LINE}>
                {teteVitrine?.titre ??
                  t("gamme.titre", `${MODELES.length} modèles, un seul parti-pris`)}
              </h2>
            </div>
            <p style={PRE_LINE}>
              {teteVitrine?.texte ??
                t(
                  "gamme.texte",
                  "Chaque plan a été optimisé poste par poste, matériau par matériau : pas de dégagement inutile, pas de recoin improductif. Le modèle change, la méthode non.",
                )}
            </p>
          </div>

          {/* Le nombre de chambres : les pages « Plans maison N chambres »
              du menu, et la gamme entière. Chaque lien arrive sur la
              vitrine (`#gamme`), là où le filtre a un effet visible. */}
          <nav className="pm-chambres gm-chambres" aria-label="Nombre de chambres">
            <Link
              href="/maisons#gamme"
              className="pm-chambres__lien"
              aria-current={chambres === null ? "page" : undefined}
            >
              Tous les modèles
            </Link>
            {CHAMBRES_PLANS.map((k) => (
              <Link
                key={k}
                href={`${urlPlans(k)}#gamme`}
                className="pm-chambres__lien"
                aria-current={k === chambres ? "page" : undefined}
              >
                {libelleChambres(k)}
              </Link>
            ))}
          </nav>
        </div>

        <VitrineGamme modeles={vitrine} />

        {/* Le manque, dit franchement, avec une sortie. Il s'efface le
            jour où les ONZE modèles porteront leurs chiffres — pas dès
            le premier : c'est exactement à ce moment-là que la phrase
            devient vraie pour les dix autres. */}
        {enAttente && (
          <div className="container">
            <div className="gm-attente">
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
          </div>
        )}

        {apresVitrine && <div className="container">{apresVitrine}</div>}
      </section>

      {complete && (
        <>
          {/* ⚠ LE BANDEAU « LÀ DÈS LE DÉPART » A ÉTÉ RETIRÉ, sur demande du
              client (retour du 26/10) : ses six lignes reprenaient presque
              mot pour mot ce que le bloc prix énumère plus bas. La méthode
              remonte à sa place. */}

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
                  <h2>{t("architecture.titre", "Une maison simple, dessinée jusque dans les moindres recoins")}</h2>
                  <p>{HOUSE.archText}</p>
                  {/* Quatre postes seulement, et tous écrits par le client.
                      Les six prestations constructives qui figuraient ici
                      décrivaient une maison qui n'est pas la sienne. */}
                  <SpecList rows={HOUSE.materials} dark className="mp-arch__specs" />
                </div>
              </div>
            </div>
          </section>

          {/* ── 5. LE BLOC PRIX ──
                 Le montant d'abord, ce qu'il couvre ensuite, côte à côte : on
                 annonce le prix avant de dire ce qu'il comprend, jamais
                 l'inverse. La colonne « Non compris » est partie à la demande
                 du client ; la mention sous le montant reste — c'est elle qui
                 le rattache à Pékin, hors terrain et hors adaptation.

                 ⚠ `prix.titreCompris`, PAS `prix.titre`. Le titre annonçait
                 « ce qu'il ne comprend pas » ; une page déjà enregistrée dans
                 le back-office garde cette phrase en stock et l'aurait servie
                 par-dessus le nouveau défaut. Une clé neuve, c'est un bloc
                 neuf : l'ancienne valeur n'est plus lue (voir `fusionnerPages`). */}
          <section className="m-price gm-prix mp-anchor" id="prix">
            <div className="container">
              <div className="gm-prix__grille">
                <div className="gm-prix__tete">
                  <span className="c-label">{t("prix.surtitre", "Le prix")}</span>
                  <h2>{t("prix.titreCompris", "Ce que le prix comprend")}</h2>
                  <p className="c-price-xl">
                    <span className="from">À partir de</span>
                    {fmtPrice(PRICE_FROM)}
                    <small>{REEL.mentionPrix}</small>
                  </p>
                  <p className="gm-prix__note">
                    Chiffrage définitif selon le terrain et la commune, dès le premier
                    rendez-vous.
                  </p>
                </div>

                <PrixCompris />
              </div>
            </div>
          </section>
        </>
      )}

      {/* ⚠ LE COMPARATIF « POURQUOI C'EST MOINS CHER » A ÉTÉ RETIRÉ ICI,
          sur demande du client : pas de mise en regard avec un
          « constructeur classique », le prix se dit par ce qu'il
          comprend. Il avait déjà quitté l'accueil, jugée trop longue.
          `Compare` reste documenté au styleguide. */}

      {/* ── 6. Le formulaire ──
             Le formulaire classique de /contact — même présentation, mêmes
             textes — avec le champ « Modèle qui vous intéresse » à la place
             de « Votre demande » (retour du 26/10). Sur TOUTES les
             variantes : « Je veux des infos sur ce modèle », dans la
             vitrine, mène ici (`#dossier`). */}
      <section className="gm-contact" id="dossier">
        <div className="container">
          <div className="ct-form-card" data-reveal>
            <h2>Parler de mon projet</h2>
            <LeadForm
              originKey="model"
              gtmEvent="lead_model_request"
              dark
              submitLabel="Être rappelé"
              successMessage="Merci — nous revenons vers vous sous 48 h."
              ctx={{ adContent: origine }}
            >
              <div className="c-form__row">
                <div className="c-field">
                  <label htmlFor="mf-name">Prénom &amp; nom</label>
                  <input type="text" id="mf-name" name="name" required />
                </div>
                <div className="c-field">
                  <label htmlFor="mf-phone">Téléphone</label>
                  <input type="tel" id="mf-phone" name="phone" required />
                </div>
              </div>
              <div className="c-form__row">
                <div className="c-field">
                  <label htmlFor="mf-email">E-mail</label>
                  <input type="email" id="mf-email" name="email" />
                </div>
                {/* ⚠ Ce champ liste les modèles réels et part au CRM du
                    client : une donnée fausse dans un fichier commercial
                    coûte plus cher qu'une page mal tournée. La vitrine le
                    positionne sur le modèle regardé quand on clique « Je
                    veux des infos sur ce modèle » : l'`id` est donc un
                    contrat avec VitrineGamme, à ne pas renommer. */}
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
              </div>
              <div className="c-field">
                <label htmlFor="mf-msg">Votre message (facultatif)</label>
                <textarea id="mf-msg" name="message" rows={4} />
              </div>
            </LeadForm>
          </div>
        </div>
      </section>

      {/* ── 8. L'étape d'après ── */}
      <section className="m-next">
        <div className="container">
          <Link href="/annonces">
            <span className="m-next__label">Étape suivante</span>
            <span className="m-next__name">Trouver mon terrain <span aria-hidden="true">→</span></span>
          </Link>
        </div>
      </section>
    </>
  );
}
