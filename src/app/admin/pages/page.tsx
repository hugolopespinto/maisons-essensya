import type { Metadata } from "next";
import Link from "next/link";
import { CHEMIN_PUBLIC, PAGES_DEFAUT, getContentFrais, isWritable } from "@/lib/store";
import type { PageEditable } from "@/lib/store/types";
import { requireAdmin } from "../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — LES PAGES DU SITE

   C'est l'entrée « Pages » que le client connaît de WordPress, et sans
   doute l'écran qu'il ouvrira le plus souvent. Il ne fabrique pas de
   pages : le site en a six, elles sont dessinées et codées. Il donne la
   main sur les TEXTES de ces six pages — titres de section, chapôs,
   paragraphes d'introduction.

   ── CE QUE CET ÉCRAN SAIT, ET D'OÙ ──
   La structure (quelles pages, quels blocs, quels libellés) vient de
   `PAGES_DEFAUT`, en code : un bloc n'est éditable que si un gabarit
   sait l'afficher. Seules les VALEURS sont stockées. C'est pour cela que
   la colonne « État » compare bloc à bloc le texte servi et le texte
   livré : elle répond à la seule question que le client se pose en
   arrivant ici — « qu'est-ce que j'ai déjà touché ? ».

   ⚠ Un bloc ajouté au site apparaît donc ici tout seul, avec son texte
   d'origine et sans migration de base. Un bloc retiré du code en
   disparaît, plutôt que de laisser éditer un texte que plus personne
   n'affiche.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pages",
  robots: { index: false, follow: false },
};

/* ════ OÙ VIT CHAQUE PAGE SUR LE SITE PUBLIC ════
   La correspondance entre une clé de contenu et une route. Elle est
   volontairement explicite plutôt que déduite de la clé : « maison »
   s'affiche sur /maisons, et deviner un pluriel est le genre de
   raccourci qui produit un lien d'aperçu en 404 le jour où une route est
   renommée. Une clé absente d'ici n'a simplement pas d'aperçu — on
   n'invente pas une URL pour faire joli.

   ⚠ La même table existe dans `[cle]/page.tsx`, qui s'en sert pour
   revalider la route après écriture. Six lignes recopiées valent mieux
   qu'un import d'un fichier de route vers un autre. */


/** Nombre de blocs dont le texte servi s'écarte de celui livré dans le code. */
function compterModifies(page: PageEditable): number {
  const origine = PAGES_DEFAUT.find((p) => p.cle === page.cle);
  if (!origine) return 0;
  const defauts = new Map(origine.blocs.map((b) => [b.cle, b.valeur]));
  return page.blocs.filter((b) => defauts.get(b.cle) !== b.valeur).length;
}

export default async function AdminPagesPage() {
  /* Garde d'écran. Le layout du back-office ne protège pas : il choisit
     seulement la coquille. Et l'URL, elle, se tape. */
  await requireAdmin();

  const content = await getContentFrais();
  const pages = content.pages;
  const inscriptible = await isWritable();

  const totalBlocs = pages.reduce((n, p) => n + p.blocs.length, 0);
  const totalModifies = pages.reduce((n, p) => n + compterModifies(p), 0);

  return (
    <>
      <div className="adm-head">
        <div>
          <span className="c-label c-label--accent">Contenu</span>
          <h1>Les pages du site</h1>
        </div>
        <p>
          Les pages du site et les textes que vous pouvez y changer : titres de
          section, chapôs, paragraphes d&apos;introduction. Le reste — la mise en
          page, les photos, les plans — relève du gabarit et ne se modifie pas
          d&apos;ici. Le nom de la maison, le téléphone et les prix se règlent
          dans <Link href="/admin/contenu">Textes du site</Link>.
        </p>
      </div>

      {!inscriptible ? (
        <p className="adm-note adm-note--alerte">
          ⚠ <strong>Le stockage est en lecture seule sur cet hébergement.</strong>{" "}
          Vos modifications ne seront pas conservées. Voir la note
          d&apos;architecture en tête de <code>src/lib/store/index.ts</code>.
        </p>
      ) : null}

      <div className="adm-grid">
        <div className="adm-stat">
          <span className="adm-stat__n">{pages.length}</span>
          <span className="adm-stat__l">Pages éditables</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__n">{totalBlocs}</span>
          <span className="adm-stat__l">Blocs de texte</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__n">{totalModifies}</span>
          <span className="adm-stat__l">Blocs que vous avez modifiés</span>
        </div>
      </div>

      <section className="adm-card">
        <h2>Choisir une page</h2>
        <p className="adm-field__aide">
          « Textes d&apos;origine » signifie que la page affiche encore, mot pour
          mot, ce qui a été livré. Rien n&apos;est cassé : c&apos;est simplement
          que personne n&apos;y a touché.
        </p>

        {pages.length === 0 ? (
          <p className="adm-empty">
            <strong>Aucune page éditable</strong>
            Le catalogue des blocs est vide. Il est défini dans{" "}
            <code>src/lib/store/index.ts</code>.
          </p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Page</th>
                  <th scope="col" className="num">
                    Blocs
                  </th>
                  <th scope="col">État</th>
                  <th scope="col">
                    <span className="u-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => {
                  const modifies = compterModifies(page);
                  const route = CHEMIN_PUBLIC[page.cle];
                  const lien = `/admin/pages/${encodeURIComponent(page.cle)}`;
                  return (
                    <tr key={page.cle}>
                      <th scope="row">
                        <Link href={lien}>{page.label}</Link>
                        <br />
                        <small className="u-muted">
                          {route ?? "Aucune adresse publique connue"}
                        </small>
                      </th>
                      <td className="num">{page.blocs.length}</td>
                      <td>
                        {modifies > 0 ? (
                          <span className="adm-badge adm-badge--on">
                            {modifies} bloc{modifies > 1 ? "s" : ""} modifié
                            {modifies > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="adm-badge adm-badge--off">
                            Textes d&apos;origine
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="adm-actions adm-actions--serre">
                          <Link href={lien} className="c-btn">
                            Modifier les textes
                          </Link>
                          {/* Nouvel onglet : comparer la page publique et sa
                              fiche d'édition est le geste normal ici, et un
                              aller-retour ferait perdre le fil. */}
                          {route ? (
                            <a
                              href={route}
                              className="c-btn"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Voir la page <span aria-hidden="true">↗</span>
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
