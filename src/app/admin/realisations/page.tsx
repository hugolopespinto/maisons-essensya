import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import MediaPicker from "@/components/admin/MediaPicker";
import { getContentFrais, isWritable, patchContent } from "@/lib/store";
import type { Realisation } from "@/lib/store/types";
import { assertAdmin, requireAdmin } from "../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — LES RÉALISATIONS

   L'onglet « Réalisations » a été demandé alors qu'aucune photo de
   chantier livré n'existe encore. Il aurait été plus rapide de poser
   une page figée en attendant. Ç'aurait surtout été un écran de plus
   qui ne sert à rien le jour où les photos arrivent : il aurait fallu
   un déploiement pour chaque maison ajoutée.

   Cet écran est donc complet dès maintenant, et la page publique le
   lit vraiment — c'est la seule façon de rendre l'onglet utile.

   ── PAS DE TABLE DÉDIÉE ──
   Les réalisations vivent dans le JSONB `content`, comme le SEO ou les
   menus, et non dans une table à elles comme les articles. Le client
   n'a donc aucune migration SQL à lancer : il ajoute sa première
   réalisation le jour où il reçoit ses photos. Le jour où il en aura
   cinquante, avec tri et filtres, ce sera le moment de leur donner une
   table — pas avant.

   ── UN SEUL FICHIER, DEUX ÉTATS ──
   La liste et le formulaire partagent la route, distingués par `?edit=`.
   L'état est rechargeable et partageable, et l'écran fonctionne sans
   JavaScript — même choix que les agences et le blog.

   ── MASQUER N'EST PAS SUPPRIMER ──
   Une réalisation désactivée sort du site et reste ici. Supprimer, au
   contraire, est définitif : le bouton le dit.
   ════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Réalisations",
  robots: { index: false, follow: false },
};

const txt = (v: FormDataEntryValue | null): string => (typeof v === "string" ? v.trim() : "");

/** Le prochain rang libre : une nouvelle fiche se pose en fin de liste. */
const rangSuivant = (liste: Realisation[]) =>
  liste.reduce((max, r) => Math.max(max, r.ordre), -1) + 1;

/** Renumérote de 0 à n : sans cela, les suppressions creusent des trous. */
const renumeroter = (liste: Realisation[]): Realisation[] =>
  [...liste]
    .sort((a, b) => a.ordre - b.ordre)
    .map((r, i) => ({ ...r, ordre: i }));

export default async function AdminRealisations({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; nouveau?: string }>;
}) {
  await requireAdmin();
  const { edit, nouveau } = await searchParams;
  const [content, ecriture] = await Promise.all([getContentFrais(), isWritable()]);
  const liste = renumeroter(content.realisations);

  const enEdition = edit ? (liste.find((r) => r.id === edit) ?? null) : null;
  const formulaire = Boolean(nouveau) || enEdition !== null;

  /* ════════ ACTIONS ════════ */

  async function enregistrer(formData: FormData) {
    "use server";
    /* Une Server Action est un point d'entrée HTTP public : le garde est
       ICI, pas sur l'écran qui affiche le formulaire. */
    await assertAdmin();

    const id = txt(formData.get("id"));
    const commune = txt(formData.get("commune"));
    /* Sans commune, la fiche n'a ni titre ni mot-clé local : c'est le
       seul champ qu'on refuse de laisser vide. */
    if (!commune) redirect("/admin/realisations?nouveau=1&erreur=commune");

    /* On relit le contenu au moment d'écrire : entre l'affichage du
       formulaire et son envoi, une autre session a pu modifier la liste. */
    const actuelles = renumeroter((await getContentFrais()).realisations);
    const existante = actuelles.find((r) => r.id === id);

    const fiche: Realisation = {
      id: existante?.id ?? randomUUID(),
      commune,
      modele: txt(formData.get("modele")) || undefined,
      annee: txt(formData.get("annee")) || undefined,
      image: txt(formData.get("image")) || undefined,
      imageAlt: txt(formData.get("imageAlt")) || undefined,
      texte: txt(formData.get("texte")) || undefined,
      actif: formData.get("actif") === "on",
      ordre: existante?.ordre ?? rangSuivant(actuelles),
    };

    const suivantes = existante
      ? actuelles.map((r) => (r.id === existante.id ? fiche : r))
      : [...actuelles, fiche];

    await patchContent("realisations", renumeroter(suivantes));
    revalidatePath("/realisations");
    revalidatePath("/sitemap.xml");
    redirect("/admin/realisations");
  }

  async function basculer(formData: FormData) {
    "use server";
    await assertAdmin();
    const id = txt(formData.get("id"));
    const actuelles = (await getContentFrais()).realisations;
    await patchContent(
      "realisations",
      actuelles.map((r) => (r.id === id ? { ...r, actif: !r.actif } : r)),
    );
    revalidatePath("/realisations");
    redirect("/admin/realisations");
  }

  async function deplacer(formData: FormData) {
    "use server";
    await assertAdmin();
    const id = txt(formData.get("id"));
    const sens = txt(formData.get("sens")) === "haut" ? -1 : 1;
    const actuelles = renumeroter((await getContentFrais()).realisations);
    const i = actuelles.findIndex((r) => r.id === id);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= actuelles.length) redirect("/admin/realisations");
    const copie = [...actuelles];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    await patchContent("realisations", renumeroter(copie));
    revalidatePath("/realisations");
    redirect("/admin/realisations");
  }

  async function supprimer(formData: FormData) {
    "use server";
    await assertAdmin();
    const id = txt(formData.get("id"));
    const actuelles = (await getContentFrais()).realisations;
    await patchContent("realisations", renumeroter(actuelles.filter((r) => r.id !== id)));
    revalidatePath("/realisations");
    revalidatePath("/sitemap.xml");
    redirect("/admin/realisations");
  }

  /* ════════ RENDU ════════ */

  return (
    <div className="adm-page">
      <div className="adm-head">
        <div>
          <h1>Réalisations</h1>
          <p className="adm-head__sous">
            Les maisons que vous avez construites et livrées. Elles s&apos;affichent
            sur <Link href="/realisations">la page Réalisations</Link>.
          </p>
        </div>
        {!formulaire && (
          <Link href="/admin/realisations?nouveau=1" className="adm-btn adm-btn--primaire">
            Ajouter une réalisation
          </Link>
        )}
      </div>

      {!ecriture && (
        <p className="adm-alerte">
          Le stockage est en lecture seule : vos modifications ne seront pas
          enregistrées. Configurez Supabase pour activer l&apos;écriture.
        </p>
      )}

      {/* L'avertissement qui compte, et qui reste affiché en permanence :
          c'est un risque juridique, pas une préférence esthétique. */}
      <p className="adm-alerte adm-alerte--info">
        <strong>Uniquement des photos de maisons réellement livrées.</strong> Les
        images de synthèse de nos modèles n&apos;ont pas leur place ici :
        présenter un rendu 3D comme une réalisation est une pratique commerciale
        trompeuse. Les modèles ont déjà leurs pages pour cela.
      </p>

      {formulaire ? (
        <form action={enregistrer} className="adm-form">
          <input type="hidden" name="id" value={enEdition?.id ?? ""} />

          <div className="adm-grid">
            <div className="adm-field">
              <label htmlFor="commune">Commune *</label>
              <input
                id="commune"
                name="commune"
                type="text"
                required
                defaultValue={enEdition?.commune ?? ""}
                placeholder="Mont-de-Marsan"
              />
              <span className="adm-field__aide">
                Le seul champ obligatoire. C&apos;est le titre de la fiche, et le
                mot que cherchent vos futurs clients.
              </span>
            </div>
            <div className="adm-field">
              <label htmlFor="modele">Modèle construit</label>
              <input
                id="modele"
                name="modele"
                type="text"
                defaultValue={enEdition?.modele ?? ""}
                placeholder="Lisbonne"
              />
            </div>
            <div className="adm-field">
              <label htmlFor="annee">Année de livraison</label>
              <input
                id="annee"
                name="annee"
                type="text"
                defaultValue={enEdition?.annee ?? ""}
                placeholder="2025"
              />
            </div>
          </div>

          <div className="adm-field">
            <MediaPicker
              name="image"
              value={enEdition?.image ?? ""}
              label="Photo du chantier livré"
              aide="Une photo de la maison réellement construite. Les rendus 3D des modèles sont à réserver à leurs pages."
            />
          </div>

          <div className="adm-field">
            <label htmlFor="imageAlt">Description de la photo</label>
            <input
              id="imageAlt"
              name="imageAlt"
              type="text"
              defaultValue={enEdition?.imageAlt ?? ""}
              placeholder="Maison plain-pied livrée à Mont-de-Marsan, vue de la façade"
            />
            <span className="adm-field__aide">
              Lue à voix haute par les lecteurs d&apos;écran, et affichée si la
              photo ne charge pas. Décrivez ce qu&apos;on voit.
            </span>
          </div>

          <div className="adm-field">
            <label htmlFor="texte">Quelques mots sur ce chantier</label>
            <textarea
              id="texte"
              name="texte"
              rows={4}
              defaultValue={enEdition?.texte ?? ""}
              placeholder="Une maison de plain-pied livrée en huit mois, sur un terrain en pente douce."
            />
          </div>

          <label className="adm-check">
            <input
              type="checkbox"
              name="actif"
              defaultChecked={enEdition ? enEdition.actif : true}
            />
            <span>Afficher sur le site</span>
          </label>

          <div className="adm-actions">
            <button type="submit" className="adm-btn adm-btn--primaire">
              Enregistrer
            </button>
            <Link href="/admin/realisations" className="adm-btn">
              Annuler
            </Link>
          </div>
        </form>
      ) : liste.length === 0 ? (
        <p className="adm-vide">
          Aucune réalisation pour l&apos;instant. Dès que vous aurez photographié
          une maison livrée, ajoutez-la ici : elle apparaîtra immédiatement sur le
          site.
        </p>
      ) : (
        <ul className="adm-liste">
          {liste.map((r, i) => (
            <li className="adm-liste__item" key={r.id}>
              <div>
                <strong>{r.commune}</strong>
                {!r.actif && <span className="adm-pastille">Masquée</span>}
                <p className="adm-liste__meta">
                  {[r.modele, r.annee].filter(Boolean).join(" · ") || "—"}
                  {!r.image && " · sans photo"}
                </p>
              </div>
              <div className="adm-liste__actions">
                <form action={deplacer}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="sens" value="haut" />
                  <button type="submit" className="adm-btn" disabled={i === 0}>
                    ↑
                  </button>
                </form>
                <form action={deplacer}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="sens" value="bas" />
                  <button
                    type="submit"
                    className="adm-btn"
                    disabled={i === liste.length - 1}
                  >
                    ↓
                  </button>
                </form>
                <form action={basculer}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="adm-btn">
                    {r.actif ? "Masquer" : "Afficher"}
                  </button>
                </form>
                <Link href={`/admin/realisations?edit=${r.id}`} className="adm-btn">
                  Modifier
                </Link>
                <form action={supprimer}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="adm-btn adm-btn--danger">
                    Supprimer
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
