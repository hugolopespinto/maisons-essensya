import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getContentFrais, isWritable, patchContent } from "@/lib/store";
import type { Avis } from "@/lib/store/types";
import GuideEcran from "@/components/admin/GuideEcran";
import { assertAdmin, requireAdmin } from "../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — LES AVIS CLIENTS

   La version « maison », sans API Google : l'API Place Details ne rend
   que 5 avis par fiche, facturés, un `place_id` par agence à gérer. Ici,
   le client (ou l'agence) copie lui-même le texte d'un avis réel — Google,
   Trustpilot, ou recueilli directement — mot pour mot, et renseigne le
   lien vers l'avis d'origine : c'est ce lien qui atteste qu'il n'a pas été
   inventé, pas un badge ou une note calculée.

   ── PAS DE TABLE DÉDIÉE ──
   Comme les réalisations : les avis vivent dans le JSONB `content`, pas
   dans une table à eux. Aucune migration SQL à lancer pour commencer.

   ── UN SEUL FICHIER, DEUX ÉTATS ──
   Liste et formulaire partagent la route, distingués par `?edit=` —
   même choix que les réalisations, les agences et le blog.

   ── MASQUER N'EST PAS SUPPRIMER ──
   Un avis désactivé sort du site et reste ici.
   ════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Avis clients",
  robots: { index: false, follow: false },
};

const txt = (v: FormDataEntryValue | null): string => (typeof v === "string" ? v.trim() : "");

/** 1 à 5, et jamais autre chose. */
const noteValide = (v: FormDataEntryValue | null): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 5;
};

/** Le prochain rang libre : un nouvel avis se pose en fin de liste. */
const rangSuivant = (liste: Avis[]) =>
  liste.reduce((max, a) => Math.max(max, a.ordre), -1) + 1;

/** Renumérote de 0 à n : sans cela, les suppressions creusent des trous. */
const renumeroter = (liste: Avis[]): Avis[] =>
  [...liste].sort((a, b) => a.ordre - b.ordre).map((a, i) => ({ ...a, ordre: i }));

export default async function AdminAvis({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; nouveau?: string }>;
}) {
  await requireAdmin();
  const { edit, nouveau } = await searchParams;
  const [content, ecriture] = await Promise.all([getContentFrais(), isWritable()]);
  const liste = renumeroter(content.avis);

  const enEdition = edit ? (liste.find((a) => a.id === edit) ?? null) : null;
  const formulaire = Boolean(nouveau) || enEdition !== null;

  /* ════════ ACTIONS ════════ */

  async function enregistrer(formData: FormData) {
    "use server";
    /* Une Server Action est un point d'entrée HTTP public : le garde est
       ICI, pas sur l'écran qui affiche le formulaire. */
    await assertAdmin();

    const id = txt(formData.get("id"));
    const auteur = txt(formData.get("auteur"));
    const texte = txt(formData.get("texte"));
    /* Sans auteur ni texte, il n'y a rien à afficher : ce sont les deux
       seuls champs qu'on refuse de laisser vides. */
    if (!auteur || !texte) redirect("/admin/avis?nouveau=1&erreur=requis");

    /* On relit le contenu au moment d'écrire : entre l'affichage du
       formulaire et son envoi, une autre session a pu modifier la liste. */
    const actuels = renumeroter((await getContentFrais()).avis);
    const existant = actuels.find((a) => a.id === id);

    const fiche: Avis = {
      id: existant?.id ?? randomUUID(),
      auteur,
      note: noteValide(formData.get("note")),
      texte,
      date: txt(formData.get("date")) || undefined,
      agence: txt(formData.get("agence")) || undefined,
      source: txt(formData.get("source")) || undefined,
      lien: txt(formData.get("lien")) || undefined,
      actif: formData.get("actif") === "on",
      ordre: existant?.ordre ?? rangSuivant(actuels),
    };

    const suivants = existant
      ? actuels.map((a) => (a.id === existant.id ? fiche : a))
      : [...actuels, fiche];

    await patchContent("avis", renumeroter(suivants));
    revalidatePath("/avis-clients");
    redirect("/admin/avis");
  }

  async function basculer(formData: FormData) {
    "use server";
    await assertAdmin();
    const id = txt(formData.get("id"));
    const actuels = (await getContentFrais()).avis;
    await patchContent(
      "avis",
      actuels.map((a) => (a.id === id ? { ...a, actif: !a.actif } : a)),
    );
    revalidatePath("/avis-clients");
    redirect("/admin/avis");
  }

  async function deplacer(formData: FormData) {
    "use server";
    await assertAdmin();
    const id = txt(formData.get("id"));
    const sens = txt(formData.get("sens")) === "haut" ? -1 : 1;
    const actuels = renumeroter((await getContentFrais()).avis);
    const i = actuels.findIndex((a) => a.id === id);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= actuels.length) redirect("/admin/avis");
    const copie = [...actuels];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    await patchContent("avis", renumeroter(copie));
    revalidatePath("/avis-clients");
    redirect("/admin/avis");
  }

  async function supprimer(formData: FormData) {
    "use server";
    await assertAdmin();
    const id = txt(formData.get("id"));
    const actuels = (await getContentFrais()).avis;
    await patchContent("avis", renumeroter(actuels.filter((a) => a.id !== id)));
    revalidatePath("/avis-clients");
    redirect("/admin/avis");
  }

  /* ════════ RENDU ════════ */

  return (
    <div className="adm-page">
      <div className="adm-head">
        <div>
          <h1>Avis clients</h1>
          <p className="adm-head__sous">
            Les avis que vous recopiez — Google, Trustpilot, ou recueillis
            directement. Ils s&apos;affichent sur{" "}
            <Link href="/avis-clients">la page Avis clients</Link>.
          </p>
        </div>
        {!formulaire && (
          <Link href="/admin/avis?nouveau=1" className="adm-btn adm-btn--primaire">
            Ajouter un avis
          </Link>
        )}
      </div>

      <GuideEcran cle="avis" />

      {!ecriture && (
        <p className="adm-alerte">
          Le stockage est en lecture seule : vos modifications ne seront pas
          enregistrées. Branchez la base de données pour activer l&apos;écriture.
        </p>
      )}

      <p className="adm-alerte adm-alerte--info">
        <strong>Recopiez le texte mot pour mot</strong>, sans le reformuler : seule
        l&apos;orthographe peut être corrigée. Le lien vers l&apos;avis d&apos;origine
        (la fiche Google de l&apos;agence, par exemple) est ce qui prouve qu&apos;il
        n&apos;a pas été inventé — pensez à le renseigner.
      </p>

      {formulaire ? (
        <form action={enregistrer} className="adm-form">
          <input type="hidden" name="id" value={enEdition?.id ?? ""} />

          <div className="adm-grid">
            <div className="adm-field">
              <label htmlFor="auteur">Nom du client *</label>
              <input
                id="auteur"
                name="auteur"
                type="text"
                required
                defaultValue={enEdition?.auteur ?? ""}
                placeholder="Nicolas L."
              />
            </div>
            <div className="adm-field">
              <label htmlFor="note">Note</label>
              <select id="note" name="note" defaultValue={String(enEdition?.note ?? 5)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
            </div>
            <div className="adm-field">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                name="date"
                type="text"
                defaultValue={enEdition?.date ?? ""}
                placeholder="Avril 2025"
              />
            </div>
          </div>

          <div className="adm-field">
            <label htmlFor="texte">Texte de l&apos;avis *</label>
            <textarea
              id="texte"
              name="texte"
              rows={5}
              required
              defaultValue={enEdition?.texte ?? ""}
              placeholder="Copiez ici le texte exact de l'avis."
            />
          </div>

          <div className="adm-grid">
            <div className="adm-field">
              <label htmlFor="agence">Agence ou commune concernée</label>
              <input
                id="agence"
                name="agence"
                type="text"
                defaultValue={enEdition?.agence ?? ""}
                placeholder="Saint-Vincent-de-Tyrosse"
              />
            </div>
            <div className="adm-field">
              <label htmlFor="source">Provenance</label>
              <input
                id="source"
                name="source"
                type="text"
                defaultValue={enEdition?.source ?? "Avis Google"}
                placeholder="Avis Google"
              />
            </div>
          </div>

          <div className="adm-field">
            <label htmlFor="lien">Lien vers l&apos;avis d&apos;origine</label>
            <input
              id="lien"
              name="lien"
              type="url"
              defaultValue={enEdition?.lien ?? ""}
              placeholder="https://www.google.com/maps/..."
            />
            <span className="adm-field__aide">
              La fiche Google de l&apos;agence, ou la page qui porte l&apos;avis
              d&apos;origine. Laissé vide, le site n&apos;affiche aucun lien.
            </span>
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
            <Link href="/admin/avis" className="adm-btn">
              Annuler
            </Link>
          </div>
        </form>
      ) : liste.length === 0 ? (
        <p className="adm-vide">
          Aucun avis pour l&apos;instant. Ajoutez-en un dès que vous en avez un sous
          la main : il apparaîtra immédiatement sur le site.
        </p>
      ) : (
        <ul className="adm-liste">
          {liste.map((a, i) => (
            <li className="adm-liste__item" key={a.id}>
              <div>
                <strong>{a.auteur}</strong> — {a.note} / 5
                {!a.actif && <span className="adm-pastille">Masqué</span>}
                <p className="adm-liste__meta">
                  {[a.agence, a.date, a.source].filter(Boolean).join(" · ") || "—"}
                </p>
                <p className="adm-liste__meta">{a.texte.slice(0, 140)}{a.texte.length > 140 ? "…" : ""}</p>
              </div>
              <div className="adm-liste__actions">
                <form action={deplacer}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="sens" value="haut" />
                  <button type="submit" className="adm-btn" disabled={i === 0}>
                    ↑
                  </button>
                </form>
                <form action={deplacer}>
                  <input type="hidden" name="id" value={a.id} />
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
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className="adm-btn">
                    {a.actif ? "Masquer" : "Afficher"}
                  </button>
                </form>
                <Link href={`/admin/avis?edit=${a.id}`} className="adm-btn">
                  Modifier
                </Link>
                <form action={supprimer}>
                  <input type="hidden" name="id" value={a.id} />
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
