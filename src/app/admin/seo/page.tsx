import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import MediaPicker from "@/components/admin/MediaPicker";
import ChampCompte from "@/components/admin/ChampCompte";
import { SEO_LIMITES, SEO_ROUTES } from "@/lib/seo";
import { getContentFrais, isWritable, patchContent } from "@/lib/store";
import type { SeoEntry } from "@/lib/store/types";
import { assertAdmin, requireAdmin } from "../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — RÉFÉRENCEMENT

   Un formulaire par route. Un champ laissé vide n'écrase rien : la page
   continue de servir le défaut écrit dans le code, affiché ici en
   placeholder pour que le client voie exactement ce qu'il remplace.

   Les compteurs de caractères signalent les dépassements sans jamais
   bloquer la saisie : 60 et 155 sont des recommandations d'affichage
   dans Google, pas des règles. Un bon titre de 64 signes vaut mieux
   qu'un mauvais de 58.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SEO",
  robots: { index: false, follow: false },
};

/** Une chaîne vide vaut « pas de surcharge », pas « valeur vide ». */
const champ = (data: FormData, nom: string): string | undefined => {
  const v = data.get(nom);
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t : undefined;
};

async function enregistrer(data: FormData) {
  "use server";
  /* L'action vérifie l'accès pour son propre compte : elle est appelable
     sans passer par l'écran qui l'a rendue. Par la garde partagée, jamais
     par une copie locale — c'est elle qui suivra le jour où la règle
     change (rôle, journal, révocation). */
  await assertAdmin();

  const path = String(data.get("path") ?? "");
  const route = SEO_ROUTES.find((r) => r.path === path);
  /* On n'écrit que sur des routes connues : le chemin vient d'un champ
     caché, donc du navigateur, donc de nulle part de fiable. */
  if (!route) redirect("/admin/seo?err=route");

  const entry: SeoEntry = {
    path: route.path,
    label: route.label,
    title: champ(data, "title"),
    description: champ(data, "description"),
    ogImage: champ(data, "ogImage"),
    canonical: champ(data, "canonical"),
    noindex: data.get("noindex") === "on" ? true : undefined,
  };

  const content = await getContentFrais();
  const autres = content.seo.filter((e) => e.path !== route.path);
  /* Une entrée entièrement vide est supprimée plutôt que stockée : le
     fichier ne se remplit pas de coquilles, et l'écran réaffiche
     « défaut du code », ce qui est la vérité. */
  const vide =
    !entry.title && !entry.description && !entry.ogImage && !entry.canonical && !entry.noindex;
  await patchContent("seo", vide ? autres : [...autres, entry]);

  /* Sans revalidation, l'ISR continuerait de servir l'ancienne balise : le
     client modifierait son title et ne verrait rien changer.
     Pour la racine on revalide le layout entier — ses métadonnées sont
     héritées par toutes les pages qui ne définissent pas les leurs. */
  if (route.path === "/") revalidatePath("/", "layout");
  else revalidatePath(route.path);
  revalidatePath("/admin/seo");

  redirect(`/admin/seo?ok=${encodeURIComponent(route.path)}`);
}


export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /* Vérification côté serveur sur chaque écran : le fait qu'un lien ne
     soit pas affiché n'a jamais protégé une URL. */
  await requireAdmin();

  const [content, inscriptible, sp] = await Promise.all([
    getContentFrais(),
    isWritable(),
    searchParams,
  ]);
  const ok = typeof sp.ok === "string" ? sp.ok : "";
  const err = typeof sp.err === "string" ? sp.err : "";

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="c-label c-label--accent">Référencement</p>
          <h1>SEO</h1>
        </div>
        <span className="adm-badge">{SEO_ROUTES.length} routes</span>
        <p>
          Ce que Google affiche pour chaque page. Les champs laissés vides gardent la valeur
          écrite dans le code du site, rappelée en gris à l&apos;intérieur de chaque champ.
        </p>
      </div>

      <p className="adm-note">
        <strong>La balise title</strong> est le titre cliquable dans les résultats de recherche ;{" "}
        <strong>la meta description</strong> est le paragraphe gris juste en dessous. Écrivez-les
        pour la personne qui hésite entre dix liens — une phrase claire qui dit ce qu&apos;on
        trouve sur la page et pourquoi cliquer ici — plutôt que pour un moteur : Google réécrit
        lui-même les descriptions qui ne ressemblent qu&apos;à une liste de mots-clés.
      </p>
      <p className="adm-note">
        Le suffixe « — Maisons Essensya » est ajouté automatiquement aux titres des pages
        intérieures : inutile de le retaper.
      </p>

      {!inscriptible && (
        <p className="adm-note adm-note--alerte">
          <strong>Lecture seule.</strong> Le stockage n&apos;est pas accessible en écriture sur
          cet hébergement : les modifications ne seront pas enregistrées.
        </p>
      )}
      {ok && (
        <p className="adm-note">
          Enregistré pour <code>{ok}</code>. La page publique a été régénérée.
        </p>
      )}
      {err === "route" && (
        <p className="adm-note adm-note--alerte">
          Route inconnue : rien n&apos;a été enregistré.
        </p>
      )}

      {SEO_ROUTES.map((route) => {
        const e = content.seo.find((s) => s.path === route.path);
        const cle = route.path.replace(/[^a-z0-9]+/gi, "-") || "-";
        return (
          <form key={route.path} action={enregistrer} className="adm-card">
            <input type="hidden" name="path" value={route.path} />
            <h2>{route.label}</h2>

            <div className="adm-row">
              <span>{route.path}</span>
              <span className={`adm-badge adm-badge--${e ? "on" : "off"}`}>
                {e ? "Personnalisé" : "Défaut du code"}
              </span>
            </div>

            {route.aide && <p className="adm-note">{route.aide}</p>}

            <div className="adm-grid">
              <ChampCompte
                nom="title"
                label="Balise title"
                valeur={e?.title ?? ""}
                placeholder={route.defaut.title ?? "Aucun titre par défaut"}
                max={SEO_LIMITES.title}
              />
            </div>

            <div className="adm-grid">
              <ChampCompte
                nom="description"
                label="Meta description"
                valeur={e?.description ?? ""}
                placeholder={route.defaut.description ?? "Aucune description par défaut"}
                max={SEO_LIMITES.description}
                multiligne
              />
            </div>

            <div className="adm-grid">
              {/* Le champ soumis reste `ogImage` : l'action ne change pas, et
                  un chemin du site ou une adresse externe collés à la main
                  restent acceptés par le sélecteur. L'identifiant est unique
                  par route, sinon les formulaires se marcheraient dessus. */}
              <MediaPicker
                id={`og-${cle}`}
                name="ogImage"
                value={e?.ogImage}
                label="Image de partage"
                aide="Ce qui s'affiche quand le lien est partagé sur Facebook, LinkedIn ou WhatsApp. Format conseillé : 1200 × 630 px."
              />
              <div className="adm-field">
                <label htmlFor={`cn-${cle}`}>URL canonique</label>
                <input
                  id={`cn-${cle}`}
                  name="canonical"
                  type="text"
                  autoComplete="off"
                  defaultValue={e?.canonical ?? ""}
                  placeholder={route.path}
                />
                <small className="adm-field__aide">
                  À ne remplir qu&apos;en connaissance de cause : une valeur erronée fait
                  disparaître la page des résultats.
                </small>
              </div>
            </div>

            <div className="adm-grid">
              <div className="adm-field adm-field--case">
                <input
                  id={`ni-${cle}`}
                  type="checkbox"
                  name="noindex"
                  defaultChecked={e?.noindex ?? false}
                />
                <label htmlFor={`ni-${cle}`}>Retirer cette page de Google (noindex)</label>
              </div>
            </div>
            {route.path === "/" && (
              <p className="adm-note adm-note--alerte">
                <strong>Attention sur l&apos;accueil :</strong> cette case s&apos;applique aussi
                aux pages qui n&apos;ont pas leur propre consigne. À ne cocher que pour retirer
                tout le site des résultats de recherche.
              </p>
            )}

            <div className="adm-actions">
              <button type="submit" className="c-btn c-btn--solid">
                Enregistrer
              </button>
              <span className="adm-field__aide">
                Les champs vides reprennent le défaut du code.
              </span>
            </div>
          </form>
        );
      })}

      {/* Contenu statique : aucune donnée saisie n'y est interpolée. */}
    </>
  );
}
