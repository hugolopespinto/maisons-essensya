import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { verifierCorps } from "@/lib/legal/verifier";
import { CHEMIN_PUBLIC, PAGES_DEFAUT, getContentFrais, isWritable, patchContent } from "@/lib/store";
import type { PageEditable } from "@/lib/store/types";
import { assertAdmin, requireAdmin } from "../../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — LES TEXTES D'UNE PAGE

   Un formulaire par bloc, dans l'ordre où les blocs apparaissent sur la
   page publique. Trois partis pris qui expliquent le reste du fichier.

   ── 1. LE TEXTE D'ORIGINE EST TOUJOURS VISIBLE ──
   `PAGES_DEFAUT` porte le texte réellement livré. Il est posé en
   `placeholder` (donc en gris, dès que le champ est vide) et rappelé
   sous le champ quand le client a écrit autre chose. Sans cela, personne
   ne sait ce qu'il est en train de remplacer, ni comment y revenir — et
   « revenir en arrière » devient un ticket de support.

   ── 2. VIDER N'EST PAS RÉTABLIR ──
   Deux gestes distincts, et la confusion entre les deux coûte cher :
     · VIDER un champ enregistre une valeur vide. Le gabarit retombe
       alors sur ce qu'il sait faire tout seul — souvent une phrase qui
       recompose le prix à jour, ce qu'un texte figé ne ferait pas ;
     · RÉTABLIR recopie le texte livré dans le champ. La page réaffiche
       mot pour mot ce qu'elle affichait au premier jour.
   L'aide de chaque bloc le dit quand la nuance s'applique.

   ── 3. LE COMPTE DE CARACTÈRES SUR LES TITRES ──
   Les blocs d'une seule ligne sont composés en très grand sur le site.
   Un titre de deux cents caractères ne « rend pas mal » : il casse la
   mise en page. Le compteur est rendu côté serveur (il est donc juste
   sans JavaScript) puis mis à jour à la frappe par le script en fin de
   fichier. C'est la seule ligne de JavaScript de cet écran.

   Toutes les opérations passent par une seule Server Action et un seul
   formulaire : « rétablir » relit d'abord TOUTES les saisies en cours
   avant de remettre un bloc à zéro, donc rétablir un titre ne fait
   jamais perdre le paragraphe qu'on venait d'écrire à côté.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Textes de la page",
  robots: { index: false, follow: false },
};



/** Longueur au-delà de laquelle un titre d'une ligne devient risqué. */
const SEUIL_TITRE = 70;

const txt = (v: FormDataEntryValue | null): string =>
  typeof v === "string" ? v.trim() : "";

/* Mise à jour du compteur à la frappe. Amélioration progressive : sans
   JavaScript, le nombre rendu par le serveur reste affiché et reste
   juste — il est simplement figé jusqu'au prochain enregistrement.
   `next/script` plutôt qu'une balise `<script>` en clair : une balise
   posée dans l'arbre ne se rejoue pas après une navigation côté client,
   et le compteur serait mort dès le deuxième bloc ouvert. */
const SCRIPT_COMPTEUR = `
document.querySelectorAll("[data-compteur]").forEach(function (champ) {
  var cible = document.getElementById(champ.getAttribute("data-compteur"));
  if (!cible) return;
  var seuil = Number(champ.getAttribute("data-seuil")) || 0;
  var maj = function () {
    var n = champ.value.length;
    cible.textContent = n + (n > 1 ? " caractères" : " caractère")
      + (seuil && n > seuil ? " — c'est long pour un titre" : "");
  };
  champ.addEventListener("input", maj);
  maj();
});
`;

export default async function EditionPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ cle: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  await requireAdmin();

  const { cle } = await params;
  const { ok, err } = await searchParams;

  /* La structure fait foi : une clé qui n'est pas au catalogue ne
     désigne aucun gabarit, donc aucune page à éditer. 404 franc plutôt
     qu'un formulaire vide qui laisserait croire le contraire. */
  const definition = PAGES_DEFAUT.find((p) => p.cle === cle);
  if (!definition) notFound();

  const content = await getContentFrais();
  const page = content.pages.find((p) => p.cle === cle) ?? definition;
  const inscriptible = await isWritable();
  const route = CHEMIN_PUBLIC[cle];

  const defauts = new Map(definition.blocs.map((b) => [b.cle, b.valeur]));
  /* On itère sur la définition, pas sur le stockage : l'ordre des blocs
     à l'écran doit être celui de la page publique. */
  const blocs = definition.blocs.map((b) => {
    const stocke = page.blocs.find((x) => x.cle === b.cle);
    return {
      ...b,
      valeur: typeof stocke?.valeur === "string" ? stocke.valeur : b.valeur,
    };
  });
  const modifies = blocs.filter((b) => defauts.get(b.cle) !== b.valeur).length;

  /* ════ SERVER ACTION ════ */
  async function enregistrer(formData: FormData) {
    "use server";
    /* Une Server Action est un point d'entrée HTTP public : elle est
       joignable en POST direct, sans jamais charger cet écran. Le garde
       est donc ici, et pas seulement à l'affichage. */
    await assertAdmin();

    const origine = PAGES_DEFAUT.find((p) => p.cle === cle);
    if (!origine) redirect("/admin/pages");

    /* Toutes les saisies sont relues AVANT d'appliquer l'opération :
       c'est ce qui permet à « rétablir » de ne pas emporter avec lui les
       autres champs en cours de modification. */
    const total = Number(formData.get("blocCount") ?? 0) || 0;
    const saisies = new Map<string, string>();
    for (let i = 0; i < total; i += 1) {
      const k = txt(formData.get(`cle_${i}`));
      if (k) saisies.set(k, txt(formData.get(`val_${i}`)));
    }

    /* L'opération voyage dans le `value` du bouton cliqué : un seul
       formulaire, autant de boutons que de blocs, aucun JavaScript. */
    const brut = formData.get("op");
    const [op, arg] = (typeof brut === "string" ? brut : "enregistrer").split(":");

    if (op === "restaurer") {
      const k = txt(formData.get(`cle_${Number(arg)}`));
      const bloc = origine.blocs.find((b) => b.cle === k);
      if (bloc) saisies.set(bloc.cle, bloc.valeur);
    }

    /* ⚠ LES CORPS LÉGAUX SONT VÉRIFIÉS AVANT D'ÊTRE ÉCRITS. Un
       paragraphe réécrit peut faire disparaître une mention obligatoire
       ou le bouton de retrait du consentement sans que rien ne casse : la
       page s'affiche, simplement sans l'assurance décennale. On refuse
       l'enregistrement et on dit lequel manque. Tout le reste du texte
       reste libre — c'est le but de l'opération. */
    const refus: string[] = [];
    for (const b of origine.blocs) {
      if (b.format !== "markdown") continue;
      const saisi = saisies.get(b.cle);
      if (saisi === undefined) continue;
      for (const e of verifierCorps(saisi, b.valeur)) refus.push(`${b.label} — ${e}`);
    }
    if (refus.length) {
      redirect(
        `/admin/pages/${encodeURIComponent(cle)}?err=${encodeURIComponent(refus.join(" · "))}`,
      );
    }

    /* On réenregistre la page ENTIÈRE à partir de la définition : la
       structure vient du code, la valeur du formulaire, et un bloc
       absent du formulaire retombe sur son texte livré. Aucune donnée
       orpheline ne peut ainsi entrer dans le stockage. */
    const majPage: PageEditable = {
      ...origine,
      blocs: origine.blocs.map((b) => ({
        ...b,
        valeur: saisies.get(b.cle) ?? b.valeur,
      })),
    };

    const actuel = await getContentFrais();
    const suivantes = actuel.pages.some((p) => p.cle === cle)
      ? actuel.pages.map((p) => (p.cle === cle ? majPage : p))
      : [...actuel.pages, majPage];

    await patchContent("pages", suivantes);

    /* Sans revalidation, l'ISR sert l'ancienne page : la modification est
       bien enregistrée mais invisible, et c'est indéfendable à l'écran. */
    const cible = CHEMIN_PUBLIC[cle];
    if (cible) revalidatePath(cible);

    redirect(
      `/admin/pages/${encodeURIComponent(cle)}?ok=${op === "restaurer" ? "restaure" : "1"}`,
    );
  }

  return (
    <form action={enregistrer}>
      <input type="hidden" name="blocCount" value={blocs.length} />
      {/* Soumission implicite (touche Entrée dans un champ) : sans ce
          bouton placé en tête du document, le navigateur déclencherait le
          premier bouton rencontré — ici « rétablir » du premier bloc. */}
      <button
        type="submit"
        name="op"
        value="enregistrer"
        className="u-sr-only"
        tabIndex={-1}
        aria-hidden="true"
      >
        Enregistrer
      </button>

      <div className="adm-head">
        <div>
          <span className="c-label c-label--accent">
            <Link href="/admin/pages">Pages</Link>
          </span>
          <h1>{definition.label}</h1>
        </div>
        <button
          type="submit"
          name="op"
          value="enregistrer"
          className="c-btn c-btn--solid"
        >
          Enregistrer
        </button>
        <p>
          {blocs.length} bloc{blocs.length > 1 ? "s" : ""} de texte
          {modifies > 0
            ? `, dont ${modifies} que vous avez modifié${modifies > 1 ? "s" : ""}.`
            : ", tous au texte d'origine."}{" "}
          Les champs sont dans l&apos;ordre où ils apparaissent sur la page. Le
          texte gris est celui livré à l&apos;origine : c&apos;est ce que le site
          affiche tant que vous n&apos;écrivez rien.
        </p>
      </div>

      <div className="adm-actions adm-actions--serre">
        <Link href="/admin/pages" className="c-btn">
          <span aria-hidden="true">←</span> Toutes les pages
        </Link>
        {/* L'aperçu, en nouvel onglet : on écrit d'un côté, on vérifie de
            l'autre, sans perdre la saisie en cours. */}
        {route ? (
          <a href={route} className="c-btn" target="_blank" rel="noopener noreferrer">
            Aperçu de la page <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>

      {/* Un refus doit être lisible par un juriste, pas par un
          développeur : il nomme la mention perdue et rappelle comment la
          réécrire. */}
      {err ? (
        <p className="adm-note" role="alert" style={{ borderColor: "var(--bois)" }}>
          <strong>Enregistrement refusé.</strong> {err}
        </p>
      ) : null}
      {ok === "1" ? (
        <p className="adm-note" role="status">
          Textes enregistrés.{" "}
          {route
            ? "La page publique a été rafraîchie."
            : "Aucune page publique n'était à rafraîchir."}
        </p>
      ) : null}
      {ok === "restaure" ? (
        <p className="adm-note" role="status">
          Le texte d&apos;origine a été rétabli, et la page enregistrée.
        </p>
      ) : null}

      {!inscriptible ? (
        <p className="adm-note adm-note--alerte">
          ⚠ <strong>Le stockage est en lecture seule sur cet hébergement.</strong>{" "}
          Vos modifications ne seront pas conservées. Voir la note
          d&apos;architecture en tête de <code>src/lib/store/index.ts</code>.
        </p>
      ) : null}

      {blocs.length === 0 ? (
        <p className="adm-empty">
          <strong>Aucun bloc éditable sur cette page</strong>
          Ses textes sont entièrement dans le gabarit.
        </p>
      ) : null}

      {blocs.map((bloc, i) => {
        const defaut = defauts.get(bloc.cle) ?? "";
        const modifie = bloc.valeur !== defaut;
        const idChamp = `val_${i}`;
        const idCompteur = `compteur_${i}`;
        const long = bloc.valeur.length > SEUIL_TITRE;

        return (
          <section className="adm-card" key={bloc.cle}>
            <h2>{bloc.label}</h2>
            <input type="hidden" name={`cle_${i}`} value={bloc.cle} />

            <div className="adm-field">
              <label htmlFor={idChamp} className="u-sr-only">
                {bloc.label}
              </label>
              {bloc.multiligne ? (
                /* ⚠ `data-format` CHANGE LA HAUTEUR DU CHAMP, et ce n'est
                   pas cosmétique. La règle d'origine donne 9 rem, soit six
                   lignes : le hublot a été dimensionné pour une adresse
                   d'hébergeur. Une section de politique de données en fait
                   quatre cents mots — l'éditer dans six lignes revient à
                   relire un contrat par le trou d'une serrure, et c'est
                   ainsi qu'on oublie un paragraphe. */
                <textarea
                  id={idChamp}
                  name={idChamp}
                  rows={bloc.format === "markdown" ? 20 : 4}
                  data-format={bloc.format}
                  defaultValue={bloc.valeur}
                  placeholder={defaut}
                />
              ) : (
                <input
                  id={idChamp}
                  name={idChamp}
                  type="text"
                  defaultValue={bloc.valeur}
                  placeholder={defaut}
                  autoComplete="off"
                  data-compteur={idCompteur}
                  data-seuil={SEUIL_TITRE}
                />
              )}

              {bloc.aide ? (
                <span className="adm-field__aide">{bloc.aide}</span>
              ) : null}

              {/* Compteur des blocs d'une ligne seulement : sur un
                  paragraphe, un nombre de caractères ne veut rien dire. */}
              {!bloc.multiligne ? (
                <span className="adm-field__aide" id={idCompteur}>
                  {bloc.valeur.length}{" "}
                  {bloc.valeur.length > 1 ? "caractères" : "caractère"}
                  {long ? " — c'est long pour un titre" : ""}
                </span>
              ) : null}

              {/* Le texte livré, rappelé en clair dès qu'il n'est plus à
                  l'écran : le `placeholder` disparaît quand le champ est
                  rempli, et c'est précisément là qu'on en a besoin. */}
              {modifie ? (
                <span className="adm-field__aide">
                  Texte d&apos;origine :{" "}
                  {defaut ? (
                    <>« {defaut} »</>
                  ) : (
                    <em>vide — le site composait sa propre phrase</em>
                  )}
                </span>
              ) : null}
            </div>

            <div className="adm-actions adm-actions--serre">
              {modifie ? (
                <span className="adm-badge adm-badge--on">Modifié</span>
              ) : (
                <span className="adm-badge adm-badge--off">Texte d&apos;origine</span>
              )}
              <button
                type="submit"
                name="op"
                value={`restaurer:${i}`}
                className="c-btn"
                disabled={!modifie}
              >
                Rétablir le texte d&apos;origine
                <span className="u-sr-only"> du bloc {bloc.label}</span>
              </button>
            </div>
          </section>
        );
      })}

      <div className="adm-actions">
        <button
          type="submit"
          name="op"
          value="enregistrer"
          className="c-btn c-btn--solid"
        >
          Enregistrer
        </button>
        <Link href="/admin/pages" className="c-btn">
          Annuler
        </Link>
      </div>

      <Script id="compteur-caracteres" strategy="afterInteractive">
        {SCRIPT_COMPTEUR}
      </Script>
    </form>
  );
}
