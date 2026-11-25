import BodyClass from "@/components/BodyClass";
import ChampCommune from "@/components/ChampCommune";
import LeadForm, { ContactFields } from "@/components/LeadForm";
import PrixCompris from "@/components/PrixCompris";
import { Icon } from "@/components/icons";
import { ESSENSYA_DATA } from "@/data/essensya";
import { FORMULAIRE_DEFAUT } from "@/lib/campagnes";
import { markdownToHtml } from "@/lib/markdown";
import { resoudreMedia } from "@/lib/medias";
import type { BlocCampagne, PageCampagne } from "@/lib/store/types";

/* ════════════════════════════════════════════════════════════════
   UNE PAGE DE CAMPAGNE, RENDUE

   Un seul rendu pour deux usages : la page publique /lp/<slug> et
   l'aperçu du back-office. Deux copies du balisage finiraient par
   diverger, et l'aperçu montrerait une page qui n'existe pas.

   ── L'APERÇU N'ENVOIE RIEN ──
   En aperçu, les formulaires sont rendus dans un `<fieldset disabled>` :
   champs et bouton sont inertes. Sans cela, tester la page depuis le
   back-office créerait un vrai prospect dans le CRM de l'agence, au nom
   de la personne qui relit.
   ════════════════════════════════════════════════════════════════ */

interface Props {
  page: PageCampagne;
  /** Aperçu du back-office : formulaires inertes, navigation du site intacte. */
  apercu?: boolean;
}

/** Le formulaire de la page — le même partout où il apparaît. */
function Formulaire({
  page,
  prefixe,
  apercu,
}: {
  page: PageCampagne;
  prefixe: string;
  apercu: boolean;
}) {
  const f = page.formulaire;
  const formulaire = (
    <LeadForm
      originKey="landing"
      gtmEvent="lead_landing_request"
      submitLabel={f.bouton?.trim() || FORMULAIRE_DEFAUT.bouton}
      successMessage={f.confirmation?.trim() || FORMULAIRE_DEFAUT.confirmation}
      /* Le nom interne de la campagne part au CRM avec la demande : c'est
         ce que l'agence lit pour savoir quelle annonce a fait venir le
         prospect. L'adresse complète, paramètres utm compris, part aussi
         (LeadForm ajoute `window.location.href`). */
      ctx={{ adContent: `Campagne — ${page.nom.trim() || page.titre}` }}
    >
      <ContactFields prefix={prefixe} />
      {f.champs.includes("zone") && (
        <div className="c-field">
          <label htmlFor={`${prefixe}-zone`}>Commune de votre projet</label>
          <ChampCommune id={`${prefixe}-zone`} placeholder="Ville ou code postal" />
        </div>
      )}
      {f.champs.includes("message") && (
        <div className="c-field">
          <label htmlFor={`${prefixe}-msg`}>Votre message (facultatif)</label>
          <textarea id={`${prefixe}-msg`} name="message" rows={3} />
        </div>
      )}
    </LeadForm>
  );
  return apercu ? (
    <fieldset disabled className="lp-apercu" aria-label="Formulaire inactif en aperçu">
      {formulaire}
    </fieldset>
  ) : (
    formulaire
  );
}

/** Le petit titre et le titre d'un bloc, quand il en a. */
function Tete({ bloc, defaut }: { bloc: BlocCampagne; defaut?: string }) {
  const titre = bloc.titre?.trim() || defaut;
  if (!bloc.surtitre?.trim() && !titre) return null;
  return (
    <div className="c-section-head">
      {bloc.surtitre?.trim() ? (
        <span className="c-label c-label--accent">{bloc.surtitre}</span>
      ) : null}
      {titre ? <h2>{titre}</h2> : null}
    </div>
  );
}

const Prose = ({ texte }: { texte?: string }) =>
  texte?.trim() ? (
    /* markdownToHtml échappe TOUT avant d'interpréter : c'est la
       frontière de confiance du site (voir src/lib/markdown.ts). */
    <div className="c-prose" dangerouslySetInnerHTML={{ __html: markdownToHtml(texte) }} />
  ) : null;

function Bloc({
  bloc,
  src,
  page,
  index,
  apercu,
}: {
  bloc: BlocCampagne;
  src: string | null;
  page: PageCampagne;
  index: number;
  apercu: boolean;
}) {
  /* Le fond sombre emporte `.u-sombre` : accents et focus contrastés,
     définis une fois pour tout le site (base.css). */
  const fond = `${bloc.fond ?? "clair"}${bloc.fond === "sombre" ? " u-sombre" : ""}`;

  switch (bloc.type) {
    case "texte":
      if (!bloc.titre?.trim() && !bloc.texte?.trim()) return null;
      return (
        <section className={`lp-bloc lp-bloc--${fond}`}>
          {/* Pas de largeur réduite sur le conteneur : le texte garde le
              bord gauche des autres blocs, `.c-prose` borne seul sa ligne. */}
          <div className="container">
            <Tete bloc={bloc} />
            <Prose texte={bloc.texte} />
          </div>
        </section>
      );

    case "texteImage":
      if (!bloc.titre?.trim() && !bloc.texte?.trim() && !src) return null;
      return (
        <section className={`lp-bloc lp-bloc--${fond}`}>
          <div className={`container lp-ti${bloc.imageAGauche ? " lp-ti--gauche" : ""}`}>
            <div>
              <Tete bloc={bloc} />
              <Prose texte={bloc.texte} />
            </div>
            {src ? (
              <figure className="lp-ti__media">
                {/* URL signée de la médiathèque, temporaire : next/image
                    ne peut pas l'optimiser. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={bloc.imageAlt ?? ""} loading="lazy" />
              </figure>
            ) : null}
          </div>
        </section>
      );

    case "image":
      if (!src) return null;
      return (
        <section className="lp-bloc lp-bloc--clair">
          <figure className="container lp-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={bloc.imageAlt ?? ""} loading="lazy" />
            {bloc.legende?.trim() ? <figcaption>{bloc.legende}</figcaption> : null}
          </figure>
        </section>
      );

    case "formulaire": {
      const titre = bloc.titre?.trim() || page.formulaire.titre?.trim() || FORMULAIRE_DEFAUT.titre;
      const texte = bloc.texte?.trim() || page.formulaire.texte?.trim();
      return (
        <section className={`lp-bloc lp-bloc--${fond}`}>
          <div className="container lp-form-bloc">
            <div>
              <h2>{titre}</h2>
              {texte ? <p className="lp-form-bloc__texte">{texte}</p> : null}
            </div>
            <div className="lp-form-card">
              <Formulaire page={page} prefixe={`lp-${index}`} apercu={apercu} />
            </div>
          </div>
        </section>
      );
    }

    case "compris":
      return (
        <section className="lp-bloc lp-bloc--clair">
          <div className="container">
            <Tete bloc={bloc} defaut="Ce que le prix comprend" />
            <PrixCompris />
          </div>
        </section>
      );

    case "garanties":
      return (
        <section className="lp-bloc lp-bloc--sable">
          <div className="container">
            <Tete bloc={bloc} />
            <div className="s-trust__grid">
              {ESSENSYA_DATA.trust.map((t) => (
                <div className="s-trust__item" key={t.title}>
                  <Icon name={t.icon} />
                  <h3>{t.title}</h3>
                  <p>{t.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    default:
      /* Un type inconnu vient d'une version future ou d'un instantané
         restauré : on ne l'affiche pas plutôt que de casser la page. */
      return null;
  }
}

export default async function PageCampagneVue({ page, apercu = false }: Props) {
  /* Les images sont résolues en une fois, en parallèle : une URL signée
     par image plutôt qu'une cascade d'appels pendant le rendu. */
  const [fondEntete, ...sources] = await Promise.all([
    resoudreMedia(page.image),
    ...page.blocs.map((b) =>
      b.type === "texteImage" || b.type === "image" ? resoudreMedia(b.image) : null,
    ),
  ]);

  const f = page.formulaire;
  const points = page.points.filter((p) => p.trim());

  return (
    <main className="page">
      {/* lp-mode masque la navigation : une page de campagne n'offre qu'une
          sortie, le formulaire. Pas en aperçu — on y est dans le back-office. */}
      {apercu ? null : <BodyClass name="lp-mode" />}

      <section className={`lp-hero${page.formulaireEnTete ? "" : " lp-hero--seul"}`}>
        {fondEntete ? (
          <div className="lp-hero__bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fondEntete} alt={page.imageAlt ?? ""} fetchPriority="high" />
          </div>
        ) : null}
        <div className="container">
          <div>
            {page.surtitre?.trim() ? (
              /* Le seul aplat framboise du site : il signale une offre. */
              <span className="c-offer">{page.surtitre}</span>
            ) : null}
            <h1 style={page.surtitre?.trim() ? { marginTop: "var(--s-2)" } : undefined}>
              {page.titre}
            </h1>
            {page.sousTitre?.trim() ? <p className="lp-hero__sub">{page.sousTitre}</p> : null}
            {page.chiffre?.trim() ? (
              <div className="lp-hero__price">
                {page.chiffre}
                {page.chiffreNote?.trim() ? <small>{page.chiffreNote}</small> : null}
              </div>
            ) : null}
            {points.length > 0 ? (
              <ul className="lp-hero__bullets">
                {points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : null}
          </div>

          {page.formulaireEnTete ? (
            <div className="lp-form-card">
              <h2>{f.titre?.trim() || FORMULAIRE_DEFAUT.titre}</h2>
              {f.texte?.trim() ? <p>{f.texte}</p> : null}
              <Formulaire page={page} prefixe="lp-h" apercu={apercu} />
            </div>
          ) : null}
        </div>
      </section>

      {page.blocs.map((b, i) => (
        <Bloc key={b.id} bloc={b} src={sources[i] ?? null} page={page} index={i} apercu={apercu} />
      ))}
    </main>
  );
}
