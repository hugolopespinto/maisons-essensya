import ArgumentRow from "@/components/ArgumentRow";
import HeroAccueil from "@/components/HeroAccueil";
import LeadForm from "@/components/LeadForm";
import OpportuniteDuMoment, {
  type OpportuniteItem,
} from "@/components/OpportuniteDuMoment";
import { Icon } from "@/components/icons";
import { ESSENSYA_DATA, REEL } from "@/data/essensya";
import { facade } from "@/data/visuels";
import { srcSet, vue } from "@/data/visuels";
import "@/styles/accueil.css";
import { annonceUrl, fmtPrice, fmtSurface } from "@/lib/format";
import { communesConnues } from "@/lib/geo";
import { jsonLd, siteSchema } from "@/lib/schema";
import { getContent } from "@/lib/store";
import type { PageEditable } from "@/lib/store/types";
import { getAnnonces } from "@/lib/vitahome/annonces";

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
  /* Pékin EN PREMIER, et ce n'est pas un choix esthétique : le prix
     affiché juste au-dessus annonce « modèle Pékin ». Tant qu'il n'avait
     pas de visuel, la rangée montrait trois AUTRES modèles sous ce
     prix — un visiteur pouvait croire que 78 000 € les concernait. */
  { visuel: vue("pekin", "vue-1-exterieur"), alt: "Maison Essensya modèle Pékin, le modèle à 78 000 €" },
  { visuel: vue("berlin", "vue-3-interieur"), alt: "Séjour d'une maison Essensya modèle Berlin" },
  { visuel: vue("dublin", "vue-2-exterieur"), alt: "Maison Essensya modèle Dublin, côté jardin" },
];

/* ⚠ VISUEL DE SECOURS DU BLOC « OPPORTUNITÉ ».
   Le client demande d'afficher la première image de l'annonce ; 90 % du
   flux n'en a aucune. Plutôt qu'un cadre vide, on pose un rendu de
   modèle — Dublin, comme il le suggère pour juger du résultat — et LA
   CARTE LE DIT. Sans cette mention, un rendu posé sur une parcelle
   laisse croire que c'est la maison qui y sera construite. */
const VISUEL_SECOURS = facade("dublin");

/** Le lot dans lequel le composant tire au sort, à chaque visite. */
const TAILLE_LOT = 8;

export default async function HomePage() {
  const [content, annonces, communes] = await Promise.all([
    getContent(),
    getAnnonces(),
    communesConnues(),
  ]);
  const t = lecteurBlocs(content.pages, "accueil");

  /* Les annonces terrain + maison les plus récentes. Le tri vient du
     flux ; on ne garde que celles qui ont une ville, seul élément qui
     compose le titre demandé (« Maison à Dax »). */
  const opportunites: OpportuniteItem[] = annonces
    .filter((a) => a.type === "terrain-maison" && a.city.trim())
    .slice(0, TAILLE_LOT)
    .map((a) => {
      const sansPhoto = !a.image;
      return {
        id: a.id,
        ville: a.city,
        titre: `Maison à ${a.city}`,
        href: annonceUrl(a),
        image: a.image || VISUEL_SECOURS?.src || "",
        imageIllustration: sansPhoto,
        imageAlt: sansPhoto
          ? "Vue d'architecte d'une maison Essensya"
          : `Maison et terrain à ${a.city}`,
        specs: [
          fmtSurface(a.landSurface) && { label: "Terrain", valeur: fmtSurface(a.landSurface) },
          fmtSurface(a.houseSurface) && { label: "Maison", valeur: fmtSurface(a.houseSurface) },
          a.price !== null && { label: "Prix total", valeur: fmtPrice(a.price) },
        ].filter(Boolean) as { label: string; valeur: string }[],
        mention: a.mention ?? "",
      };
    });
  /* Même source que le layout : le nom saisi en Réglages, sinon celui
     du code. Un JSON-LD qui annoncerait un autre nom que la balise title
     serait une incohérence de plus pour Google à arbitrer. */
  const nomSite = content.reglages.nomSite?.trim() || "Maisons Essensya";


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
        baseline={t("hero.baseline", "L'essentiel de la qualité au meilleur prix")}
        titre={t(
          "hero.titre",
          "Maisons Essensya, constructeur de maisons au prix juste dans les Landes",
        )}
        alt="Maison Essensya modèle Lisbonne, vue de la terrasse"
      />

      {/* ⚠ LE BLOC DE RECHERCHE A ÉTÉ RETIRÉ, SUR DEMANDE DU CLIENT
          (« on enlève la partie Sélecteur de la home page »).

          Il proposait trois champs — ville, type de bien, budget — et un
          bouton vers /annonces. Ce n'est pas une perte de fonction : la
          même recherche vit sur /annonces, avec sa carte et ses filtres
          complets. Sur l'accueil, elle demandait au visiteur de choisir
          avant de savoir ce qu'on lui propose.

          Le formulaire du bas de page, lui, reste : il ne filtre rien, il
          met en relation. */}

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
                <span className="from">
                  {t("juste.avantPrix", "La maison, à partir de")}
                </span>
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
                <picture>
                  <source
                    type="image/avif"
                    srcSet={srcSet(ph.visuel, "avif")}
                    sizes="(max-width:900px) 100vw, 33vw"
                  />
                  <source
                    type="image/webp"
                    srcSet={srcSet(ph.visuel, "webp")}
                    sizes="(max-width:900px) 100vw, 33vw"
                  />
                  <img
                    src={ph.visuel.src}
                    width={ph.visuel.largeur}
                    height={ph.visuel.hauteur}
                    alt={ph.alt}
                    loading="lazy"
                  />
                </picture>
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
          Une annonce tirée au sort parmi les plus récentes, différente à
          chaque visite. Texte et image côte à côte : voir le composant,
          qui explique pourquoi on ne les superpose plus. */}
      <OpportuniteDuMoment
        items={opportunites}
        surtitre={t("opportunite.surtitre", "L'opportunité du moment")}
      />

      {/* ⚠ DEUX SECTIONS RETIRÉES, SUR DEMANDE DU CLIENT :
          « Comment ça marche » et « Terrains & opportunités ».

          Motif constant depuis le premier retour — « la home est trop
          longue, trop fournie et peu lisible ». Le parcours en quatre
          étapes reste sur /concept, et les terrains ont leur page, leur
          carte et leurs filtres sur /annonces, désormais atteignable
          depuis le bloc « opportunité » qui la précède. */}

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
              /* Fond blanc, écriture noire, inversé au survol — demandé.
                 Le framboise des autres appels à l'action serait ici sur
                 fond sombre : le blanc ressort davantage. */
              submitClassName="c-btn c-btn--blanc"
              successMessage="Merci — un conseiller Maisons Essensya vous rappelle sous 48 h."
            >
              {/* ⚠ PRÉNOM ET NOM SONT DEUX CHAMPS, PLUS UN SEUL.
                  Le formulaire demandait « Prénom & nom » en une ligne, ce
                  qui ramenait « jean dupont », « DUPONT Jean » ou
                  « j.dupont » selon l'humeur du visiteur. Deux champs
                  guident la saisie.

                  ⚠ Le CRM, lui, ne reçoit toujours qu'un `name` : le
                  payload Vitahome porte des noms de champs documentés, et
                  `firstname` / `lastname` n'y sont pas confirmés. La
                  recomposition a lieu côté serveur — voir la note dans
                  src/app/api/leads/route.ts. La séparation profite donc à
                  la saisie, pas encore au fichier commercial.

                  « Où en êtes-vous ? » disparaît : quatre champs, c'est
                  la consigne, et c'est celui qui apportait le moins. */}
              <div className="c-form__row">
                <div className="c-field">
                  <label htmlFor="f-prenom">Prénom</label>
                  <input
                    type="text"
                    id="f-prenom"
                    name="prenom"
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div className="c-field">
                  <label htmlFor="f-nom">Nom</label>
                  <input
                    type="text"
                    id="f-nom"
                    name="nom"
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>
              <div className="c-form__row">
                <div className="c-field">
                  <label htmlFor="f-phone">Téléphone</label>
                  <input
                    type="tel"
                    id="f-phone"
                    name="phone"
                    autoComplete="tel"
                    required
                  />
                </div>
                <div className="c-field">
                  <label htmlFor="f-zone">Secteur du projet</label>
                  {/* ⚠ AUTO-COMPLÉTION PAR `<datalist>`, pas par un
                      composant maison. Le navigateur fait le filtrage,
                      sur le nom comme sur le code postal, sans une ligne
                      de JavaScript — donc sans rien à charger, et le
                      champ reste utilisable si le script échoue. Les
                      communes viennent du flux : elles suivent le stock
                      au lieu d'être une liste à maintenir. */}
                  <input
                    type="text"
                    id="f-zone"
                    name="zone"
                    list="f-communes"
                    autoComplete="address-level2"
                    placeholder="Ville ou code postal"
                  />
                  <datalist id="f-communes">
                    {communes.map((c) => (
                      <option key={c.nom} value={c.nom}>
                        {c.cp}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>
            </LeadForm>
          </div>
        </div>
      </section>
    </main>
  );
}
