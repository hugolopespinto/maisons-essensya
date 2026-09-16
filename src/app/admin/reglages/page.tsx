import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import MediaPicker from "@/components/admin/MediaPicker";
import { AGENCIES, PLACEHOLDER } from "@/data/essensya";
import { getContentFrais, isWritable, patchContent } from "@/lib/store";
import type { Reglages } from "@/lib/store/types";
import { assertAdmin, requireAdmin } from "../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — RÉGLAGES GÉNÉRAUX

   L'écran « Réglages → Général » que le client cherche en premier, parce
   qu'il le cherchait déjà dans WordPress. Aujourd'hui, ce qu'il contient
   est DISPERSÉ : le téléphone est dans `PLACEHOLDER` (src/data/essensya.ts),
   l'e-mail et l'adresse sont empruntés à la première agence, le nom du
   site est écrit dans les métadonnées de src/app/layout.tsx, et les
   réseaux sociaux sont trois libellés morts en pied de page. Cet écran
   est le point unique où tout cela se saisit.

   TROIS PRINCIPES, hérités des écrans SEO et Contenu :

   1. UN CHAMP VIDE NE VIDE RIEN. Il signifie « garder ce que le site
      affiche aujourd'hui ». Chaque champ montre donc en gris, en
      filigrane, la valeur réellement publiée : le client distingue d'un
      coup d'œil ce qu'il a saisi de ce qui reste hérité du code.
      Exception assumée, et dite à l'écran : les réseaux sociaux, où
      « vide » veut dire « pas de lien ». Il n'y a là aucune valeur de
      repli à hériter — un compte qui n'existe pas ne s'affiche pas.

   2. ON REFUSE PLUTÔT QUE DE PUBLIER UNE VALEUR CASSÉE. Un téléphone
      illisible, un e-mail sans arobase ou une adresse de réseau en
      `http://` ne sont pas enregistrés : ils partiraient dans un lien
      `tel:`, un `mailto:` ou une balise JSON-LD où personne ne les
      relirait. Le refus est CHAMP PAR CHAMP — le reste du formulaire est
      enregistré normalement et l'écran nomme précisément ce qui a été
      écarté. Rejeter tout le formulaire pour une virgule serait pire :
      le client perdrait dix saisies justes.

   3. `revalidatePath("/", "layout")`. Le nom du site, le téléphone,
      l'e-mail et le logo apparaissent dans l'en-tête, le pied de page et
      les données structurées, c'est-à-dire sur TOUTES les pages.
      Revalider la seule racine laisserait l'ISR servir l'ancien numéro
      partout ailleurs.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Réglages du site",
  robots: { index: false, follow: false },
};

/* ────────────────────────────────────────────────────────────────
   CE QUE LE SITE AFFICHE AUJOURD'HUI

   Recopié des sources réelles — `src/app/layout.tsx` pour le nom,
   `PLACEHOLDER` pour le téléphone, la première agence pour l'e-mail,
   l'adresse et les horaires (c'est exactement ce que fait le pied de
   page, faute de contact générique). Affiché en `placeholder`, donc en
   gris, et JAMAIS injecté dans le stockage : si le code change, le
   filigrane change avec lui.
   ──────────────────────────────────────────────────────────────── */
const PRINCIPALE = AGENCIES[0];

const ACTUEL = {
  nomSite: "Maisons Essensya",
  telephone: PLACEHOLDER.phone,
  email: PRINCIPALE?.email ?? "",
  adresse: PRINCIPALE?.address ?? "",
  horaires: PRINCIPALE?.hours ?? "",
} as const;

/* ════ LECTURE ET VALIDATION DU FORMULAIRE ════ */

/** Chaîne nettoyée, ou `undefined` — jamais de chaîne vide en stockage :
 *  c'est ce qui permet au site de retomber franchement sur le code. */
const txt = (v: FormDataEntryValue | null): string | undefined => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : undefined;
};

/**
 * Téléphone français, saisi comme le client en a l'habitude :
 * « 05 46 00 00 00 », « 05.46.00.00.00 », « +33 5 46 00 00 00 » et
 * « 0033546000000 » sont tous acceptés, et ramenés à UNE SEULE forme,
 * groupée par deux chiffres — celle que le site affiche déjà.
 *
 * Normaliser plutôt que stocker la saisie brute n'est pas cosmétique :
 * le lien `tel:` et la propriété `telephone` des données structurées
 * sont fabriqués à partir de cette valeur.
 *
 * Renvoie `null` si le numéro n'est pas plausible — ni dix chiffres
 * commençant par 0, ni un indicatif international français.
 */
function normaliserTelephone(brut: string): string | null {
  const compact = brut.replace(/[\s.\-/()]/g, "");
  let national: string | null = null;
  if (/^0\d{9}$/.test(compact)) national = compact;
  else if (/^\+33\d{9}$/.test(compact)) national = `0${compact.slice(3)}`;
  else if (/^0033\d{9}$/.test(compact)) national = `0${compact.slice(4)}`;
  if (!national) return null;
  return (national.match(/.{2}/g) ?? []).join(" ");
}

/**
 * E-mail. Volontairement permissif sur la partie locale, strict sur le
 * domaine : on ne cherche pas à valider la RFC 5322 (personne n'y arrive
 * en une expression régulière), seulement à écarter ce qui ne peut pas
 * être une adresse — pas d'arobase, pas de point, une espace au milieu.
 */
function normaliserEmail(brut: string): string | null {
  const s = brut.trim();
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(s) ? s.toLowerCase() : null;
}

/**
 * Adresse d'un compte de réseau social. `https://` EXIGÉ : un lien en
 * `http://` déclenche un avertissement de navigateur, et un lien sans
 * schéma (« instagram.com/… ») serait interprété comme un chemin interne
 * du site — il mènerait à une 404 depuis le pied de page. On vérifie
 * aussi que l'hôte ressemble à un domaine, pour attraper le
 * copier-coller de travers.
 */
function normaliserUrl(brut: string): string | null {
  const s = brut.trim();
  if (!/^https:\/\//i.test(s)) return null;
  try {
    const u = new URL(s);
    if (!u.hostname.includes(".")) return null;
  } catch {
    return null;
  }
  return s;
}

/* Libellés des champs écartés, pour le message de retour. Les clés
   voyagent dans l'URL (`?refus=tel.email`) : courtes et stables. */
const LIBELLES: Record<string, string> = {
  tel: "Téléphone",
  email: "Adresse e-mail",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  pinterest: "Pinterest",
};

const RESEAUX = [
  { cle: "instagram", label: "Instagram", exemple: "https://www.instagram.com/…" },
  { cle: "linkedin", label: "LinkedIn", exemple: "https://www.linkedin.com/company/…" },
  { cle: "facebook", label: "Facebook", exemple: "https://www.facebook.com/…" },
  { cle: "pinterest", label: "Pinterest", exemple: "https://www.pinterest.fr/…" },
] as const;

export default async function ReglagesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; refus?: string }>;
}) {
  /* Garde d'écran. Le layout du back-office ne protège pas : il choisit
     seulement la coquille. Une URL se tape. */
  await requireAdmin();

  const { ok, refus } = await searchParams;
  const content = await getContentFrais();
  const r = content.reglages;
  const reseaux = r.reseaux ?? {};
  const inscriptible = await isWritable();

  /* Filtré sur `LIBELLES` : le paramètre vient de l'URL, donc de
     l'extérieur. On n'affiche que des clés connues. */
  const refuses = (refus ?? "").split(".").filter((c) => c in LIBELLES);

  async function enregistrer(formData: FormData) {
    "use server";
    /* Une Server Action est un point d'entrée HTTP public : le garde est
       DANS l'action, jamais seulement sur l'écran qui l'affiche. */
    await assertAdmin();

    /* On repart de l'état stocké : un champ écarté conserve sa valeur
       précédente plutôt que d'être effacé au passage. */
    const actuel = (await getContentFrais()).reglages;
    const ecartes: string[] = [];

    /* `undefined` (champ vidé) est toujours accepté — c'est le retour
       explicite à la valeur du code. Seule une saisie non vide et non
       valide est écartée. */
    const brutTel = txt(formData.get("telephone"));
    const tel = brutTel === undefined ? undefined : normaliserTelephone(brutTel);
    if (tel === null) ecartes.push("tel");

    const brutMail = txt(formData.get("email"));
    const mail = brutMail === undefined ? undefined : normaliserEmail(brutMail);
    if (mail === null) ecartes.push("email");

    const liens: NonNullable<Reglages["reseaux"]> = {};
    for (const { cle } of RESEAUX) {
      const saisi = txt(formData.get(cle));
      if (saisi === undefined) continue; // vidé : le lien disparaît du site
      const url = normaliserUrl(saisi);
      if (url === null) {
        ecartes.push(cle);
        /* On garde l'ancienne adresse valide plutôt que de casser un
           lien qui fonctionnait. */
        const precedent = actuel.reseaux?.[cle];
        if (precedent) liens[cle] = precedent;
        continue;
      }
      liens[cle] = url;
    }

    const suivant: Reglages = {
      nomSite: txt(formData.get("nomSite")),
      baseline: txt(formData.get("baseline")),
      logo: txt(formData.get("logo")),
      favicon: txt(formData.get("favicon")),
      ogImage: txt(formData.get("ogImage")),
      telephone: tel === null ? actuel.telephone : tel,
      email: mail === null ? actuel.email : mail,
      adresse: txt(formData.get("adresse")),
      horaires: txt(formData.get("horaires")),
      reseaux: liens,
    };

    await patchContent("reglages", suivant);

    /* En-tête, pied de page, données structurées : tout l'arbre. */
    revalidatePath("/", "layout");

    const q = ecartes.length > 0 ? `&refus=${ecartes.join(".")}` : "";
    redirect(`/admin/reglages?ok=1${q}`);
  }

  return (
    <form action={enregistrer}>
      <div className="adm-head">
        <div>
          <span className="c-label c-label--accent">Réglages</span>
          <h1>Réglages du site</h1>
        </div>
        <button type="submit" className="c-btn c-btn--solid">
          Enregistrer
        </button>
        <p>
          L&apos;identité du site et les coordonnées de l&apos;entreprise. Ce qui
          est saisi ici se répète sur toutes les pages : en-tête, pied de page,
          aperçus de partage et données structurées lues par Google.
        </p>
      </div>

      {ok && refuses.length === 0 ? (
        <p className="adm-note" role="status">
          Réglages enregistrés. Les pages publiques ont été rafraîchies.
        </p>
      ) : null}

      {refuses.length > 0 ? (
        <p className="adm-note adm-note--alerte" role="alert">
          ⚠{" "}
          <strong>
            Enregistré, sauf {refuses.length > 1 ? "ces champs" : "ce champ"} :{" "}
            {refuses.map((c) => LIBELLES[c]).join(", ")}.
          </strong>{" "}
          Le format saisi n&apos;était pas exploitable : un numéro doit comporter
          dix chiffres, une adresse e-mail une arobase et un nom de domaine, une
          adresse de réseau social commencer par <code>https://</code>.{" "}
          {refuses.length > 1
            ? "Ces champs ont gardé leur valeur précédente"
            : "Ce champ a gardé sa valeur précédente"}{" "}
          — corrigez la saisie et enregistrez à nouveau.
        </p>
      ) : null}

      {!inscriptible ? (
        <p className="adm-note adm-note--alerte">
          ⚠ <strong>Le stockage est en lecture seule sur cet hébergement.</strong>{" "}
          Vos modifications ne seront pas conservées. Voir la note
          d&apos;architecture en tête de <code>src/lib/store/index.ts</code>.
        </p>
      ) : null}

      <p className="adm-note">
        Chaque champ affiche en gris la valeur actuellement publiée par le site.
        Tant que vous ne saisissez rien, c&apos;est elle qui reste affichée, et
        vider un champ y revient. Les réseaux sociaux font exception : un champ
        vide signifie qu&apos;aucun lien n&apos;est affiché.
      </p>

      {/* ════ IDENTITÉ ════ */}
      <section className="adm-card">
        <h2>Identité</h2>
        <p className="adm-field__aide">
          Le nom sous lequel le site se présente, et les trois images qui le
          représentent ailleurs que sur ses pages : dans l&apos;onglet du
          navigateur, et dans les aperçus de partage des messageries et des
          réseaux sociaux.
        </p>

        <div className="adm-grid">
          <div className="adm-field">
            <label htmlFor="nomSite">Nom du site</label>
            <input
              id="nomSite"
              name="nomSite"
              type="text"
              defaultValue={r.nomSite ?? ""}
              placeholder={ACTUEL.nomSite}
              autoComplete="off"
            />
            <span className="adm-field__aide">
              Repris dans le titre des pages, les aperçus de partage et les
              données structurées. C&apos;est le nom de l&apos;entreprise, pas
              celui de la maison — ce dernier se modifie dans l&apos;écran
              Contenu.
            </span>
          </div>
          <div className="adm-field">
            <label htmlFor="baseline">Baseline</label>
            <input
              id="baseline"
              name="baseline"
              type="text"
              defaultValue={r.baseline ?? ""}
              autoComplete="off"
            />
            <span className="adm-field__aide">
              La courte phrase qui accompagne le nom. Quelques mots : elle est
              composée en petit, à côté du logo.
            </span>
          </div>
        </div>

        <div className="adm-grid">
          <MediaPicker
            name="logo"
            value={r.logo}
            label="Logo du site"
            aide="PNG ou SVG, fond transparent. Affiché dans l'en-tête et le pied de page. Sans logo, le site continue d'écrire le nom en lettres."
          />
          <MediaPicker
            name="favicon"
            value={r.favicon}
            label="Favicon"
            aide="La petite icône de l'onglet du navigateur. Carrée, et lisible à 32 pixels de côté : un logo complet y devient une tache."
          />
          <MediaPicker
            name="ogImage"
            value={r.ogImage}
            label="Image de partage par défaut"
            aide="L'image affichée quand un lien du site est collé dans un message ou sur un réseau social. Format paysage, 1200 × 630 pixels. Une page qui a sa propre image de partage (écran Référencement) garde la sienne."
          />
        </div>
      </section>

      {/* ════ COORDONNÉES ════ */}
      <section className="adm-card">
        <h2>Coordonnées</h2>
        <p className="adm-field__aide">
          Ce sont les coordonnées <strong>générales</strong> de
          l&apos;entreprise : celles de l&apos;en-tête, du pied de page et des
          données structurées envoyées à Google — donc celles qui peuvent
          apparaître dans une fiche de résultat de recherche. Les coordonnées
          propres à chaque agence, elles, se modifient dans l&apos;écran Agences.
        </p>

        <div className="adm-grid">
          <div className="adm-field">
            <label htmlFor="telephone">Téléphone</label>
            <input
              id="telephone"
              name="telephone"
              type="tel"
              inputMode="tel"
              defaultValue={r.telephone ?? ""}
              placeholder={ACTUEL.telephone}
              autoComplete="off"
            />
            <span className="adm-field__aide">
              Dix chiffres. Les espaces, les points et l&apos;indicatif
              international (+33) sont acceptés, et le numéro est reformaté à
              l&apos;enregistrement. Il devient un lien cliquable sur mobile : un
              numéro incomplet ne compose rien.
            </span>
          </div>
          <div className="adm-field">
            <label htmlFor="email">Adresse e-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={r.email ?? ""}
              placeholder={ACTUEL.email}
              autoComplete="off"
            />
            <span className="adm-field__aide">
              L&apos;adresse de contact général. Le site affiche aujourd&apos;hui
              celle de la première agence, faute d&apos;adresse générique.
            </span>
          </div>
        </div>

        <div className="adm-grid">
          <div className="adm-field">
            <label htmlFor="adresse">Adresse postale</label>
            <input
              id="adresse"
              name="adresse"
              type="text"
              defaultValue={r.adresse ?? ""}
              placeholder={ACTUEL.adresse}
              autoComplete="off"
            />
            <span className="adm-field__aide">
              Le siège, sur une seule ligne : numéro, rue, code postal, ville.
            </span>
          </div>
          <div className="adm-field">
            <label htmlFor="horaires">Horaires d&apos;ouverture</label>
            <input
              id="horaires"
              name="horaires"
              type="text"
              defaultValue={r.horaires ?? ""}
              placeholder={ACTUEL.horaires}
              autoComplete="off"
            />
            <span className="adm-field__aide">
              En clair, tels qu&apos;un visiteur les lit.
            </span>
          </div>
        </div>
      </section>

      {/* ════ RÉSEAUX SOCIAUX ════ */}
      <section className="adm-card">
        <h2>Réseaux sociaux</h2>
        <p className="adm-field__aide">
          L&apos;adresse complète de chaque compte, en <code>https://</code>.{" "}
          <strong>Un champ laissé vide ne produit aucun lien</strong> : c&apos;est
          ce qui évite d&apos;afficher un réseau que l&apos;entreprise n&apos;a
          pas. Le pied de page affiche pour l&apos;instant trois noms de réseaux
          qui ne mènent nulle part ; renseigner ces champs est ce qui les rend
          cliquables.
        </p>

        <div className="adm-grid">
          {RESEAUX.map(({ cle, label, exemple }) => (
            <div className="adm-field" key={cle}>
              <label htmlFor={cle}>{label}</label>
              <input
                id={cle}
                name={cle}
                type="url"
                defaultValue={reseaux[cle] ?? ""}
                placeholder={exemple}
                autoComplete="off"
                spellCheck={false}
              />
              <span className="adm-field__aide">
                {refuses.includes(cle)
                  ? "Adresse refusée : elle doit commencer par https:// et pointer vers un domaine."
                  : "Vide : aucun lien " + label + " n'est affiché sur le site."}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="adm-actions">
        <button type="submit" className="c-btn c-btn--solid">
          Enregistrer
        </button>
      </div>
    </form>
  );
}
