import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContent, isWritable, patchContent } from "@/lib/store";
import type { TrackingConfig } from "@/lib/store/types";
import { assertRole, requireRole } from "../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — MESURE ET TRACKING

   L'identifiant saisi ici alimente vraiment le site : le conteneur GTM est
   chargé avec ce `gtmId` dès qu'aucune variable d'environnement
   NEXT_PUBLIC_GTM_ID ne le fournit (voir `src/components/Analytics.tsx`).

   Deux partis pris :
     · on VALIDE le format des identifiants. Un « GTM-XXXXXX » mal recopié
       ne provoque aucune erreur visible — le conteneur ne se charge
       simplement jamais, et on s'en aperçoit des semaines plus tard,
       devant un tableau de bord vide ;
     · on RAPPELLE le consentement. Le site ne déclenche rien avant le
       choix du visiteur (Consent Mode v2, voir `src/lib/consent.ts`) :
       les chiffres seront structurellement inférieurs à la fréquentation
       réelle. Mieux vaut que le client l'apprenne ici que dans six mois.

   ⚠ ÉCRAN RÉSERVÉ AU RÔLE `admin`, écran ET action (voir les gardes de
   `../actions.ts`). Ce n'est pas de l'édition : l'identifiant saisi ici
   se substitue à tout le plan de marquage, charge des scripts tiers sur
   chaque page publique et touche au consentement. Un compte `editeur`
   n'a aucune raison de pouvoir réécrire le conteneur GTM du site.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tracking",
  robots: { index: false, follow: false },
};

/* ════ ÉVÉNEMENTS RÉELLEMENT POUSSÉS PAR LE SITE ════
   Relevés dans le code (`grep -rn "gtmEvent" src/`), pas inventés. Ils
   partent dans le dataLayer à la soumission réussie d'un formulaire, via
   <LeadForm>. Toute nouvelle origine de formulaire est à ajouter ici. */
const EVENEMENTS: { event: string; label: string; ou: string }[] = [
  { event: "lead_callback_request", label: "Demande de rappel", ou: "Accueil" },
  {
    event: "lead_model_request",
    label: "Demande sur la maison",
    ou: "La maison et ses déclinaisons",
  },
  {
    event: "lead_annonce_request",
    label: "Demande sur une annonce",
    ou: "Cartes et fiches annonces",
  },
  { event: "lead_agency_request", label: "Demande à une agence", ou: "Pages agence" },
  { event: "lead_contact_request", label: "Formulaire de contact", ou: "Page contact" },
  { event: "lead_landing_request", label: "Formulaire de campagne", ou: "Pages /lp" },
];

/* ════ VALIDATION ════
   Les mêmes formats servent à l'attribut `pattern` des champs — le
   navigateur bloque donc la saisie fautive avant l'envoi — et au contrôle
   serveur, qui reste le seul à faire foi. */
const FORMATS = {
  gtmId: {
    re: /^GTM-[A-Z0-9]{6,9}$/,
    pattern: "(GTM|gtm)-[A-Za-z0-9]{6,9}",
    exemple: "GTM-ABC1234",
  },
  ga4Id: {
    re: /^G-[A-Z0-9]{8,12}$/,
    pattern: "(G|g)-[A-Za-z0-9]{8,12}",
    exemple: "G-AB12CD34EF",
  },
  metaPixelId: {
    re: /^[0-9]{15,16}$/,
    pattern: "[0-9]{15,16}",
    exemple: "123456789012345",
  },
  ga4PropertyId: {
    re: /^properties\/[0-9]{6,12}$/,
    pattern: "(properties/)?[0-9]{6,12}",
    exemple: "properties/123456789",
  },
} as const;

const brut = (data: FormData, nom: string): string => {
  const v = data.get(nom);
  return typeof v === "string" ? v.trim() : "";
};

/** Le client colle souvent la balise entière fournie par Search Console. */
function extraitVerification(saisie: string): string {
  const meta = saisie.match(/content=["']([^"']+)["']/i);
  return (meta ? meta[1] : saisie).trim();
}

async function enregistrer(data: FormData) {
  "use server";
  /* Garde de RÔLE, pas seulement d'authentification : une Server Action
     est un point d'entrée HTTP public, et celle-ci écrit une
     configuration qui s'applique à toutes les pages du site. */
  await assertRole("admin");

  const gtmId = brut(data, "gtmId").toUpperCase();
  const ga4Id = brut(data, "ga4Id").toUpperCase();
  const metaPixelId = brut(data, "metaPixelId");
  const saisiePropriete = brut(data, "ga4PropertyId");
  const ga4PropertyId =
    saisiePropriete && !saisiePropriete.includes("/")
      ? `properties/${saisiePropriete}`
      : saisiePropriete;
  const googleSiteVerification = extraitVerification(brut(data, "googleSiteVerification"));

  /* Une saisie malformée ne remplace rien du tout : on refuse
     l'enregistrement entier plutôt que d'écrire une configuration à moitié
     valide, qui serait le pire des deux mondes. */
  const refus: string[] = [];
  if (gtmId && !FORMATS.gtmId.re.test(gtmId)) refus.push("gtmId");
  if (ga4Id && !FORMATS.ga4Id.re.test(ga4Id)) refus.push("ga4Id");
  if (metaPixelId && !FORMATS.metaPixelId.re.test(metaPixelId)) refus.push("metaPixelId");
  if (ga4PropertyId && !FORMATS.ga4PropertyId.re.test(ga4PropertyId)) refus.push("ga4PropertyId");
  if (googleSiteVerification && !/^[A-Za-z0-9_-]{20,100}$/.test(googleSiteVerification)) {
    refus.push("googleSiteVerification");
  }
  if (refus.length) redirect(`/admin/tracking?err=${encodeURIComponent(refus.join(","))}`);

  const content = await getContent();
  const coches = new Set(data.getAll("conv").map(String));
  /* Les événements connus du code d'abord ; puis ceux qui traîneraient
     dans le contenu sans exister (plus) dans le site — on ne les supprime
     pas en douce, on les garde visibles. */
  const inconnus = content.tracking.conversions.filter(
    (c) => !EVENEMENTS.some((e) => e.event === c.event),
  );
  const conversions: TrackingConfig["conversions"] = [
    ...EVENEMENTS.map((e) => ({ event: e.event, label: e.label, actif: coches.has(e.event) })),
    ...inconnus.map((c) => ({ ...c, actif: coches.has(c.event) })),
  ];

  await patchContent("tracking", {
    gtmId: gtmId || undefined,
    ga4Id: ga4Id || undefined,
    metaPixelId: metaPixelId || undefined,
    googleSiteVerification: googleSiteVerification || undefined,
    ga4PropertyId: ga4PropertyId || undefined,
    conversions,
  });

  /* Le conteneur GTM est posé par le layout racine : c'est tout le site
     qui doit être régénéré, pas seulement cet écran. */
  revalidatePath("/", "layout");
  redirect("/admin/tracking?ok=1");
}

const LIBELLES: Record<string, string> = {
  gtmId: "identifiant GTM",
  ga4Id: "identifiant GA4",
  metaPixelId: "pixel Meta",
  ga4PropertyId: "propriété GA4",
  googleSiteVerification: "vérification Search Console",
};

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /* Non connecté → login ; connecté en `editeur` → tableau de bord. */
  await requireRole("admin");

  const [content, inscriptible, sp] = await Promise.all([
    getContent(),
    isWritable(),
    searchParams,
  ]);
  const t = content.tracking;
  const ok = sp.ok === "1";
  const refus = (typeof sp.err === "string" ? sp.err : "").split(",").filter(Boolean);

  /* Par défaut un événement est suivi : la liste ci-dessous décrit ce que
     le site envoie déjà, pas une intention. */
  const actif = (event: string) => t.conversions.find((c) => c.event === event)?.actif ?? true;
  const inconnus = t.conversions.filter((c) => !EVENEMENTS.some((e) => e.event === c.event));

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="c-label c-label--accent">Mesure</p>
          <h1>Tracking</h1>
        </div>
        <span className={`adm-badge adm-badge--${t.gtmId ? "on" : "off"}`}>
          {t.gtmId ? "Conteneur configuré" : "Conteneur absent"}
        </span>
        <p>
          Les identifiants des outils de mesure, et la liste des événements de conversion
          envoyés par le site.
        </p>
      </div>

      <p className="adm-note">
        <strong>Écran réservé aux administrateurs.</strong> Avec des comptes nommés, les comptes
        « éditeur » n&apos;y ont pas accès : ce qui se règle ici s&apos;applique à toutes les
        pages du site, pas à un contenu.
      </p>
      <p className="adm-note">
        <strong>Rien ne se déclenche avant le consentement.</strong> Le bandeau cookies pose
        Google Consent Mode v2 en « refusé » par défaut : tant qu&apos;un visiteur n&apos;a pas
        accepté la mesure d&apos;audience, aucune donnée ne part chez Google.
      </p>
      <p className="adm-note">
        Conséquence normale et attendue : les chiffres de Google Analytics seront{" "}
        <strong>inférieurs à la fréquentation réelle</strong>, souvent de 20 à 40 %. Ce
        n&apos;est pas un défaut de réglage, c&apos;est la règle depuis la CNIL. Les tendances,
        elles, restent justes — ce sont elles qu&apos;il faut lire.
      </p>

      {!inscriptible && (
        <p className="adm-note adm-note--alerte">
          <strong>Lecture seule.</strong> Le stockage n&apos;est pas accessible en écriture sur
          cet hébergement : les modifications ne seront pas enregistrées.
        </p>
      )}
      {ok && <p className="adm-note">Configuration enregistrée. Le site a été régénéré.</p>}
      {refus.length > 0 && (
        <p className="adm-note adm-note--alerte">
          <strong>Rien n&apos;a été enregistré.</strong> Format non reconnu pour :{" "}
          {refus.map((f) => LIBELLES[f] ?? f).join(", ")}. Un identifiant erroné casse la mesure
          en silence — on préfère refuser la saisie entière plutôt que conserver une
          configuration à moitié juste.
        </p>
      )}

      <form action={enregistrer}>
        <section className="adm-card">
          <h2>Identifiants</h2>

          <div className="adm-grid">
            <div className="adm-field">
              <label htmlFor="gtmId">Google Tag Manager</label>
              <input
                id="gtmId"
                name="gtmId"
                type="text"
                autoComplete="off"
                defaultValue={t.gtmId ?? ""}
                placeholder={FORMATS.gtmId.exemple}
                pattern={FORMATS.gtmId.pattern}
                title="Format attendu : GTM- suivi de 6 à 9 lettres ou chiffres."
                aria-describedby="gtmId-aide"
              />
              <small id="gtmId-aide" className="adm-field__aide">
                Le conteneur qui pilote tous les autres tags. Si la variable
                d&apos;environnement NEXT_PUBLIC_GTM_ID est définie sur l&apos;hébergement, elle
                reste prioritaire sur cette valeur.
              </small>
            </div>

            <div className="adm-field">
              <label htmlFor="ga4Id">Google Analytics 4</label>
              <input
                id="ga4Id"
                name="ga4Id"
                type="text"
                autoComplete="off"
                defaultValue={t.ga4Id ?? ""}
                placeholder={FORMATS.ga4Id.exemple}
                pattern={FORMATS.ga4Id.pattern}
                title="Format attendu : G- suivi de 8 à 12 lettres ou chiffres."
                aria-describedby="ga4Id-aide"
              />
              <small id="ga4Id-aide" className="adm-field__aide">
                L&apos;identifiant de mesure. Il est noté ici pour mémoire : c&apos;est dans GTM
                que la balise GA4 est réellement déclenchée.
              </small>
            </div>

            <div className="adm-field">
              <label htmlFor="metaPixelId">Pixel Meta</label>
              <input
                id="metaPixelId"
                name="metaPixelId"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                defaultValue={t.metaPixelId ?? ""}
                placeholder={FORMATS.metaPixelId.exemple}
                pattern={FORMATS.metaPixelId.pattern}
                title="Format attendu : 15 ou 16 chiffres."
                aria-describedby="pixel-aide"
              />
              <small id="pixel-aide" className="adm-field__aide">
                Uniquement si des campagnes Facebook ou Instagram sont prévues. Le pixel est un
                traceur publicitaire : il n&apos;est posé qu&apos;après acceptation de la
                finalité « publicité ».
              </small>
            </div>

            <div className="adm-field">
              <label htmlFor="ga4PropertyId">Propriété GA4 (tableau de bord)</label>
              <input
                id="ga4PropertyId"
                name="ga4PropertyId"
                type="text"
                autoComplete="off"
                defaultValue={t.ga4PropertyId ?? ""}
                placeholder={FORMATS.ga4PropertyId.exemple}
                pattern={FORMATS.ga4PropertyId.pattern}
                title="Numéro de propriété, avec ou sans le préfixe properties/."
                aria-describedby="prop-aide"
              />
              <small id="prop-aide" className="adm-field__aide">
                Le numéro de propriété — différent de l&apos;identifiant de mesure — qui permet
                d&apos;afficher la fréquentation dans le tableau de bord de ce back-office. Le
                préfixe <code>properties/</code> est ajouté tout seul.
              </small>
            </div>
          </div>

          <div className="adm-grid">
            <div className="adm-field">
              <label htmlFor="googleSiteVerification">Vérification Google Search Console</label>
              <input
                id="googleSiteVerification"
                name="googleSiteVerification"
                type="text"
                autoComplete="off"
                defaultValue={t.googleSiteVerification ?? ""}
                placeholder="Collez le code, ou la balise meta entière"
                aria-describedby="gsc-aide"
              />
              <small id="gsc-aide" className="adm-field__aide">
                Prouve à Google que le site vous appartient, et ouvre l&apos;accès aux requêtes
                de recherche qui vous amènent des visiteurs. Vous pouvez coller la balise
                complète fournie par Search Console : seul le code est conservé.
              </small>
            </div>
          </div>
        </section>

        <section className="adm-card">
          <h2>Événements de conversion</h2>
          <p className="adm-note">
            Ce sont les événements réellement envoyés au dataLayer par le site, à chaque
            formulaire transmis avec succès. Cette liste est le référentiel commun au site et à
            GTM : décocher un événement le retire du suivi déclaré ici, mais c&apos;est bien
            dans GTM que la conversion correspondante se crée.
          </p>

          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Suivi</th>
                <th scope="col">Événement</th>
                <th scope="col">Intitulé</th>
                <th scope="col">Où</th>
              </tr>
            </thead>
            <tbody>
              {EVENEMENTS.map((e) => (
                <tr key={e.event}>
                  <td>
                    <input
                      type="checkbox"
                      name="conv"
                      value={e.event}
                      defaultChecked={actif(e.event)}
                      aria-label={`Suivre : ${e.label}`}
                    />
                  </td>
                  <td>
                    <code>{e.event}</code>
                  </td>
                  <td>{e.label}</td>
                  <td className="u-muted">{e.ou}</td>
                </tr>
              ))}
              {inconnus.map((c) => (
                <tr key={c.event}>
                  <td>
                    <input
                      type="checkbox"
                      name="conv"
                      value={c.event}
                      defaultChecked={c.actif}
                      aria-label={`Suivre : ${c.label}`}
                    />
                  </td>
                  <td>
                    <code>{c.event}</code>
                  </td>
                  <td>{c.label}</td>
                  <td className="u-muted">Plus envoyé par le site</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="adm-note">
            Deux autres événements circulent sans être des conversions : <code>page_view</code>,
            à chaque changement de page, et <code>consent_update</code>, au choix de cookies.
          </p>
        </section>

        <div className="adm-actions">
          <button type="submit" className="c-btn c-btn--solid">
            Enregistrer
          </button>
          <span className="adm-field__aide">
            Un format d&apos;identifiant non reconnu annule tout l&apos;enregistrement.
          </span>
        </div>
      </form>
    </>
  );
}
