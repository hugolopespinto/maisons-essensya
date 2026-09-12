import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment } from "react";
import { annonceTitle, annonceUrl, dept, fmtPrice, fmtSurface } from "@/lib/format";
import { getContent, isWritable, patchContent } from "@/lib/store";
import type { AnnonceOverride } from "@/lib/store/types";
import { findOverride, getAnnoncesFlux, overrideIndex } from "@/lib/vitahome/annonces";
import type { Annonce } from "@/types";
import { assertAdmin, requireAdmin } from "../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — ENRICHISSEMENT DES ANNONCES

   Le flux Vitahome a raison. Cet écran ne modifie AUCUNE annonce : il
   pose des écarts (`AnnonceOverride`) par-dessus, indexés sur la
   référence, et sait les retirer. Prix, surfaces, photos, viabilisation
   et mentions légales restent la propriété du CRM — les réécrire ici
   ferait diverger le site et Vitahome dès le premier import.

   L'écran le dit en toutes lettres, deux fois : c'est la seule façon
   d'éviter qu'on cherche un jour à « corriger un prix sur le site ».
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Annonces",
  robots: { index: false, follow: false },
};

const ROUTE = "/admin/annonces";

/** Longueurs utiles, pas des limites arbitraires : au-delà, Google coupe. */
const MAX = { titre: 160, accroche: 400, seoTitle: 90, seoDescription: 300 } as const;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Un champ vide n'est pas une surcharge : il rend la main au flux. */
function champ(fd: FormData, nom: keyof typeof MAX): string | undefined {
  const v = String(fd.get(nom) ?? "")
    .trim()
    .slice(0, MAX[nom]);
  return v ? v : undefined;
}

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";

/* ════ ACTIONS ════ */

/**
 * Retour au listing : on RECONSTRUIT l'URL à partir des seuls filtres
 * connus. Jamais une destination fournie par le formulaire — ce serait
 * offrir une redirection ouverte à qui sait poster.
 */
function retour(fd: FormData): string {
  const p = new URLSearchParams();
  const q = String(fd.get("q") ?? "")
    .trim()
    .slice(0, 60);
  if (q) p.set("q", q);
  if (String(fd.get("enrichies") ?? "") === "1") p.set("enrichies", "1");
  const s = p.toString();
  return s ? `${ROUTE}?${s}` : ROUTE;
}

/**
 * La référence vient du client : on ne la croit pas sur parole, on la
 * retrouve dans le flux. Aucune surcharge ne peut ainsi viser une
 * parcelle qui n'existe pas, ni une référence inventée.
 */
async function parcelle(ref: string): Promise<Annonce | null> {
  const cle = ref.trim().toLowerCase();
  if (!cle) return null;
  const flux = await getAnnoncesFlux();
  return flux.find((a) => a.id.toLowerCase() === cle) ?? null;
}

/** Écrit — ou retire — l'écart d'une seule parcelle, sans toucher aux autres. */
async function ecrire(ref: string, next: AnnonceOverride | null) {
  const content = await getContent();
  const cle = ref.trim().toLowerCase();
  /* `String(...)` plutôt que `o.ref` : un contenu écrit à la main peut
     porter une entrée sans référence, et un écran d'administration ne
     tombe pas pour si peu. */
  const autres = content.annonces.filter(
    (o) => String(o?.ref ?? "").trim().toLowerCase() !== cle,
  );
  await patchContent("annonces", next ? [...autres, next] : autres);
}

/**
 * Sans cela, l'ISR continuerait de servir l'ancienne version.
 * On rend la main sur tout ce qu'une surcharge touche : le listing, la
 * fiche — et celles des références secondaires de la parcelle, qui
 * résolvent aussi —, la home qui porte le coup de cœur, le sitemap, et
 * les pages qui listent des annonces par agence ou par déclinaison.
 */
function rendreLaMain(a: Annonce) {
  revalidatePath("/annonces");
  for (const r of new Set([a.id, ...a.offres.map((o) => o.ref)])) {
    revalidatePath(`/annonces/${r.toLowerCase()}`);
  }
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  /* Un masquage doit aussi disparaître des listes secondaires. */
  revalidatePath("/agences/[slug]", "page");
  revalidatePath("/maisons/[slug]", "page");
}

async function enregistrer(formData: FormData) {
  "use server";
  /* Le rendu de l'écran ne protège rien : une Server Action est une route
     POST publique. Le garde est ici, en première ligne. */
  await assertAdmin();

  const a = await parcelle(String(formData.get("ref") ?? ""));
  if (!a) redirect(retour(formData));

  const titre = champ(formData, "titre");
  const accroche = champ(formData, "accroche");
  const title = champ(formData, "seoTitle");
  const description = champ(formData, "seoDescription");
  const coupDeCoeur = formData.get("coupDeCoeur") === "on";
  const masquee = formData.get("masquee") === "on";

  /* Une surcharge entièrement vide, c'est exactement le flux : on ne
     laisse pas de ligne morte dans le contenu. */
  const vide = !titre && !accroche && !title && !description && !coupDeCoeur && !masquee;

  await ecrire(
    a.id,
    vide
      ? null
      : {
          ref: a.id,
          ...(titre ? { titre } : {}),
          ...(accroche ? { accroche } : {}),
          ...(coupDeCoeur ? { coupDeCoeur } : {}),
          ...(masquee ? { masquee } : {}),
          ...(title || description
            ? { seo: { ...(title ? { title } : {}), ...(description ? { description } : {}) } }
            : {}),
          majLe: new Date().toISOString(),
        },
  );

  rendreLaMain(a);
  redirect(retour(formData));
}

/** Supprime l'écart : l'annonce redevient strictement celle du flux. */
async function reinitialiser(formData: FormData) {
  "use server";
  await assertAdmin();

  const a = await parcelle(String(formData.get("ref") ?? ""));
  if (a) {
    await ecrire(a.id, null);
    rendreLaMain(a);
  }
  redirect(retour(formData));
}

/* ════ ÉCRAN ════ */

/** Ce qui a été surchargé, en trois mots, pour la colonne d'état. */
function etats(o: AnnonceOverride | null): string[] {
  if (!o) return [];
  return [
    o.masquee ? "Masquée" : null,
    o.coupDeCoeur ? "Coup de cœur" : null,
    o.titre ? "Titre" : null,
    o.accroche ? "Accroche" : null,
    o.seo?.title || o.seo?.description ? "SEO" : null,
  ].filter((x): x is string => !!x);
}

export default async function AdminAnnoncesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const [flux, content, writable, sp] = await Promise.all([
    getAnnoncesFlux(),
    getContent(),
    isWritable(),
    searchParams,
  ]);

  const q = first(sp.q).trim();
  const enrichies = first(sp.enrichies) === "1";
  const edit = first(sp.edit).trim().toLowerCase();

  /* Un seul index pour les ~100 lignes, et le MÊME rapprochement que
     celui des pages publiques : le back-office ne doit pas afficher un
     état que le site n'applique pas. */
  const index = overrideIndex(content.annonces);
  const lignes = flux.map((a) => ({ a, o: findOverride(a, index) }));

  const terme = q.toLowerCase();
  const visibles = lignes.filter(
    ({ a, o }) =>
      (!enrichies || o !== null) &&
      (!terme ||
        a.city.toLowerCase().includes(terme) ||
        a.ref.toLowerCase().includes(terme) ||
        a.zip.startsWith(terme) ||
        a.offres.some((of) => of.ref.toLowerCase().includes(terme))),
  );

  const nbEnrichies = lignes.filter(({ o }) => o).length;
  const nbMasquees = lignes.filter(({ o }) => o?.masquee).length;

  /* Une surcharge dont la parcelle a quitté le flux ne s'applique plus.
     Mieux vaut le dire que laisser croire qu'elle agit encore. */
  const rapprochees = new Set(lignes.map(({ o }) => o).filter(Boolean));
  const orphelines = content.annonces
    .filter((o) => o?.ref && !rapprochees.has(o))
    .map((o) => o.ref);

  /** Un lien du listing, filtres courants conservés. */
  const lien = (ref?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (enrichies) p.set("enrichies", "1");
    if (ref) p.set("edit", ref);
    const s = p.toString();
    return s ? `${ROUTE}?${s}` : ROUTE;
  };

  return (
    <>
      <div className="adm-head">
        <div>
          <span className="c-label c-label--accent">Flux Vitahome</span>
          <h1>Annonces</h1>
        </div>
        <p>
          {flux.length} parcelle{flux.length > 1 ? "s" : ""} au flux · {nbEnrichies}{" "}
          enrichie{nbEnrichies > 1 ? "s" : ""} · {nbMasquees} masquée
          {nbMasquees > 1 ? "s" : ""}
        </p>
      </div>

      {/* Le message central de cet écran : il doit être lu avant le tableau. */}
      <p className="adm-note">
        Les annonces appartiennent au CRM Vitahome et ne sont pas modifiables ici. Prix,
        surfaces, photos, viabilisation et mentions légales viennent du flux —{" "}
        <strong>pour corriger un prix, corrigez la fiche dans Vitahome</strong>, pas sur le
        site, sinon les deux divergent au prochain import. Cet écran ajoute seulement une
        couche éditoriale (titre, accroche, coup de cœur, masquage, SEO), que l&apos;on
        peut retirer à tout moment.
      </p>

      {!writable && (
        <p className="adm-note adm-note--alerte">
          <strong>Lecture seule.</strong> Le stockage du contenu n&apos;est pas accessible
          en écriture sur cet hébergement : rien ne sera conservé.
        </p>
      )}

      <form className="adm-toolbar" action={ROUTE} method="get">
        <div className="adm-field">
          <label htmlFor="q">Commune, code postal ou référence</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="La Rochelle, 17000, 68040…"
            maxLength={60}
          />
        </div>
        <div className="adm-field adm-field--case">
          <input
            id="enrichies"
            type="checkbox"
            name="enrichies"
            value="1"
            defaultChecked={enrichies}
          />
          <label htmlFor="enrichies">Enrichies seulement</label>
        </div>
        <button type="submit" className="c-btn">
          Filtrer
        </button>
        {(q || enrichies) && (
          <Link className="c-link" href={ROUTE}>
            Tout voir
          </Link>
        )}
      </form>

      {flux.length === 0 ? (
        <p className="adm-empty">
          <strong>Flux indisponible</strong>
          Vitahome n&apos;a rien renvoyé. Le site continue de servir sa dernière version
          connue ; il n&apos;y a rien à enrichir tant que le flux ne répond pas.
        </p>
      ) : visibles.length === 0 ? (
        <p className="adm-empty">
          <strong>Aucune parcelle</strong>
          Rien ne correspond à cette recherche.{" "}
          <Link className="c-link" href={ROUTE}>
            Tout voir
          </Link>
        </p>
      ) : (
        <div className="adm-card">
          <table className="adm-table">
            <caption className="u-sr-only">
              Parcelles du flux Vitahome et leur enrichissement éditorial
            </caption>
            <thead>
              <tr>
                <th scope="col">Référence</th>
                <th scope="col">Commune</th>
                <th scope="col">Dépt</th>
                <th scope="col">Type</th>
                <th scope="col">Prix</th>
                <th scope="col">Offres</th>
                <th scope="col">Enrichissement</th>
                <th scope="col">
                  <span className="u-sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.map(({ a, o }) => {
                const ouvert = edit === a.id.toLowerCase();
                const marques = etats(o);
                const fluxTitre = annonceTitle(a);
                return (
                  <Fragment key={a.id}>
                    <tr>
                      <th scope="row">{a.ref}</th>
                      <td>
                        {a.city}
                        {a.zip ? ` (${a.zip})` : ""}
                      </td>
                      <td>{dept(a)}</td>
                      <td>{a.type === "terrain-maison" ? "Terrain + maison" : "Terrain"}</td>
                      <td className="num">{fmtPrice(a.price)}</td>
                      <td className="num">{a.offres.length}</td>
                      <td>
                        {marques.length === 0 ? (
                          <span className="u-muted">—</span>
                        ) : (
                          marques.map((m) => (
                            <span
                              key={m}
                              className={
                                m === "Masquée"
                                  ? "adm-badge adm-badge--off"
                                  : m === "Coup de cœur"
                                    ? "adm-badge adm-badge--on"
                                    : "adm-badge"
                              }
                            >
                              {m}
                            </span>
                          ))
                        )}
                      </td>
                      <td>
                        <Link className="c-link" href={ouvert ? lien() : lien(a.id)}>
                          {ouvert ? "Fermer" : "Enrichir"}
                        </Link>
                        {/* Une annonce masquée n'a plus de page publique. */}
                        {!o?.masquee && (
                          <>
                            {" · "}
                            <Link
                              className="c-link"
                              href={annonceUrl(a)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Voir
                            </Link>
                          </>
                        )}
                      </td>
                    </tr>

                    {ouvert && (
                      <tr>
                        <td colSpan={8}>
                          <form action={enregistrer} className="adm-card">
                            <input type="hidden" name="ref" value={a.id} />
                            <input type="hidden" name="q" value={q} />
                            {enrichies && <input type="hidden" name="enrichies" value="1" />}

                            <h3>Enrichir la parcelle {a.ref}</h3>

                            <div className="adm-grid">
                              <div className="adm-field">
                                <label htmlFor={`titre-${a.id}`}>Titre affiché</label>
                                <input
                                  id={`titre-${a.id}`}
                                  name="titre"
                                  defaultValue={o?.titre ?? ""}
                                  maxLength={MAX.titre}
                                  placeholder={fluxTitre}
                                />
                                <p className="adm-field__aide">
                                  Flux : {fluxTitre}
                                  {a.title ? ` — titre Vitahome : « ${a.title} »` : ""}
                                </p>
                              </div>

                              <div className="adm-field">
                                <label htmlFor={`accroche-${a.id}`}>Accroche</label>
                                <textarea
                                  id={`accroche-${a.id}`}
                                  name="accroche"
                                  rows={3}
                                  defaultValue={o?.accroche ?? ""}
                                  maxLength={MAX.accroche}
                                />
                                <p className="adm-field__aide">
                                  Placée avant la description du flux, qui reste affichée :
                                  «&nbsp;
                                  {a.description
                                    ? `${a.description.slice(0, 110)}${a.description.length > 110 ? "…" : ""}`
                                    : "aucune description au flux"}
                                  &nbsp;»
                                </p>
                              </div>

                              <div className="adm-field">
                                <label htmlFor={`seoTitle-${a.id}`}>Titre SEO</label>
                                <input
                                  id={`seoTitle-${a.id}`}
                                  name="seoTitle"
                                  defaultValue={o?.seo?.title ?? ""}
                                  maxLength={MAX.seoTitle}
                                />
                                <p className="adm-field__aide">
                                  Flux : {fluxTitre} — {fmtPrice(a.price)}
                                </p>
                              </div>

                              <div className="adm-field">
                                <label htmlFor={`seoDescription-${a.id}`}>
                                  Description SEO
                                </label>
                                <textarea
                                  id={`seoDescription-${a.id}`}
                                  name="seoDescription"
                                  rows={3}
                                  defaultValue={o?.seo?.description ?? ""}
                                  maxLength={MAX.seoDescription}
                                />
                                <p className="adm-field__aide">
                                  Flux : l&apos;accroche si elle existe, sinon les 160
                                  premiers caractères de la description.
                                </p>
                              </div>
                            </div>

                            <div className="adm-grid">
                              <div className="adm-field adm-field--case">
                                <input
                                  id={`coup-${a.id}`}
                                  type="checkbox"
                                  name="coupDeCoeur"
                                  defaultChecked={o?.coupDeCoeur === true}
                                />
                                <label htmlFor={`coup-${a.id}`}>
                                  Coup de cœur — candidate à l&apos;opportunité mise en
                                  avant en page d&apos;accueil
                                </label>
                              </div>
                              <div className="adm-field adm-field--case">
                                <input
                                  id={`masq-${a.id}`}
                                  type="checkbox"
                                  name="masquee"
                                  defaultChecked={o?.masquee === true}
                                />
                                <label htmlFor={`masq-${a.id}`}>
                                  Masquer — retire l&apos;annonce du site et du sitemap. Elle
                                  reste intacte dans Vitahome.
                                </label>
                              </div>
                            </div>

                            {/* La donnée du flux, en clair, à côté de ce qu'on surcharge :
                                on doit voir ce que l'on ne remplace PAS. */}
                            <div className="adm-grid">
                              <div>
                                <div className="adm-row">
                                  <span>Prix</span>
                                  <span>{fmtPrice(a.price)}</span>
                                </div>
                                <div className="adm-row">
                                  <span>Terrain</span>
                                  <span>{fmtSurface(a.landSurface) || "n.c."}</span>
                                </div>
                                <div className="adm-row">
                                  <span>Maison</span>
                                  <span>{fmtSurface(a.houseSurface) || "terrain seul"}</span>
                                </div>
                              </div>
                              <div>
                                <div className="adm-row">
                                  <span>Offres · photos</span>
                                  <span>
                                    {a.offres.length} · {a.gallery.length}
                                  </span>
                                </div>
                                <div className="adm-row">
                                  <span>Flux mis à jour</span>
                                  <span>{fmtDate(a.updatedAt)}</span>
                                </div>
                                <div className="adm-row">
                                  <span>Enrichi le</span>
                                  <span>{fmtDate(o?.majLe)}</span>
                                </div>
                              </div>
                            </div>
                            <p className="adm-field__aide">
                              Ces valeurs viennent du CRM et ne se modifient que là-bas.
                            </p>

                            <div className="adm-actions">
                              <button
                                type="submit"
                                className="c-btn c-btn--solid"
                                disabled={!writable}
                              >
                                Enregistrer
                              </button>
                              <button
                                type="submit"
                                className="c-btn c-btn--danger"
                                formAction={reinitialiser}
                                disabled={!writable || !o}
                              >
                                Réinitialiser
                              </button>
                              <Link className="c-link" href={lien()}>
                                Annuler
                              </Link>
                            </div>
                            <p className="adm-field__aide">
                              « Réinitialiser » supprime l&apos;enrichissement : l&apos;annonce
                              redevient exactement celle du flux.
                            </p>
                          </form>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {orphelines.length > 0 && (
        <p className="adm-note adm-note--alerte">
          {orphelines.length} enrichissement{orphelines.length > 1 ? "s" : ""} ne
          correspond{orphelines.length > 1 ? "ent" : ""} plus à aucune parcelle du flux
          (référence{orphelines.length > 1 ? "s" : ""} {orphelines.join(", ")}). Ces écarts
          sont sans effet : la parcelle a quitté Vitahome, ou changé de référence.
        </p>
      )}
    </>
  );
}
