import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContent, patchContent } from "@/lib/store";
import {
  etatMediatheque,
  mediasSansAlt,
  signerChemins,
  supprimerMedia,
  TAILLE_MAX,
} from "@/lib/medias";
import type { Content, Media } from "@/lib/store/types";
import { TeleverseurMedias } from "@/components/admin/MediaPicker";
import { assertAdmin, requireAdmin } from "../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — LA MÉDIATHÈQUE

   L'écran que le client cherchera en premier. Dans WordPress, « Médias »
   est l'endroit où l'on dépose un fichier sans se demander où il va ;
   ici, c'est la seule porte d'entrée du bucket, et le seul endroit où le
   TEXTE ALTERNATIF peut être écrit. Ces deux rôles justifient à eux
   seuls l'écran : le reste du back-office ne fait plus que choisir
   parmi ce qui a été déposé ici.

   LE TEXTE ALTERNATIF N'EST PAS UN DÉTAIL, et c'est pour ça qu'il est
   affiché sous chaque vignette plutôt que caché derrière un bouton
   « modifier ». Une image sans alt n'existe ni pour un lecteur d'écran,
   ni pour Google Images — qui est une source de trafic réelle sur un
   métier où l'on cherche des photos de maisons. Les médias qui en
   manquent sont comptés en haut de l'écran et filtrables d'un clic :
   c'est une dette visible, pas une case à cocher oubliée.

   PARTAGE SERVEUR / CLIENT. La grille est rendue côté serveur — elle a
   besoin d'URL signées, que seul le serveur peut produire, et les
   formulaires de texte alternatif sont de vraies Server Actions qui
   fonctionnent sans JavaScript. Seule la ZONE DE DÉPÔT est cliente :
   glisser-déposer et progression n'existent pas sans JavaScript. Un
   formulaire de secours, dans un `<noscript>`, poste vers la même route.

   ⚠ La suppression est destructrice et IRRATTRAPABLE : le fichier quitte
   le bucket. Elle passe donc par une page de confirmation (même choix
   que l'écran Blog : rechargeable, et on peut y montrer ce qu'on
   détruit), et cette page dit où le média est utilisé. Supabase ne tient
   pas ce graphe — on le recalcule ici, sur le contenu éditable.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Médiathèque",
  robots: { index: false, follow: false },
};

/* ──────────────────────────────────────────────────────────────────
   USAGES — où ce média est-il employé ?

   ⚠ Ce relevé est SINCÈRE MAIS PAS EXHAUSTIF, et l'écran le dit. Les
   champs image acceptent aussi des URL externes et du texte libre : un
   identifiant recopié à la main dans un corps d'article est trouvé par
   la recherche en texte intégral ci-dessous, mais une image référencée
   par son URL signée (qui expire) ne serait rattachable à rien. On
   avertit donc ; on ne prétend pas garantir.
   ────────────────────────────────────────────────────────────────── */

function chercherUsages(contenu: Content, id: string): string[] {
  const usages: string[] = [];
  const cite = (v?: string | null) => (v ?? "").trim() === id;

  const r = contenu.reglages;
  if (cite(r.logo)) usages.push("Réglages du site — logo");
  if (cite(r.favicon)) usages.push("Réglages du site — favicon");
  if (cite(r.ogImage)) usages.push("Réglages du site — image de partage");

  for (const a of contenu.agences) {
    if (cite(a.image)) usages.push(`Agence « ${a.nom || a.zone || a.id} »`);
  }
  for (const a of contenu.articles) {
    if (cite(a.image)) usages.push(`Article « ${a.titre || a.slug} » — image`);
  }
  for (const s of contenu.seo) {
    if (cite(s.ogImage)) usages.push(`Référencement — ${s.label || s.path}`);
  }

  /* Filet en texte intégral : attrape l'identifiant collé dans un corps
     d'article, un bloc de page ou un texte du site — là où aucune
     colonne ne le désigne. Les fiches de la médiathèque sont exclues,
     sinon chaque média se citerait lui-même. */
  const reste: Content = { ...contenu, medias: [] };
  if (usages.length === 0 && JSON.stringify(reste).includes(id)) {
    usages.push("Ailleurs dans le contenu éditable");
  }

  return usages;
}

/* ──────────────────────────────────────────────────────────────────
   FORMATS
   ────────────────────────────────────────────────────────────────── */

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
};

/**
 * Poids lisible par un humain.
 *
 * ⚠ RECOPIÉ de `src/components/admin/MediaPicker.tsx`, à dessein, et
 * c'est la seule duplication de ce lot. Ce fichier-là porte `"use
 * client"` : tout ce qu'il exporte devient, vu d'un composant serveur,
 * une RÉFÉRENCE de client — un objet inerte qui lève à l'appel. Importer
 * la fonction ici compilerait sans broncher et planterait au premier
 * rendu de la grille. La mutualiser supposerait un troisième module,
 * hors du périmètre de ce lot ; quatre lignes de format valent mieux
 * qu'un fichier partagé posé à la va-vite.
 */
function poidsLisible(octets: number): string {
  if (!Number.isFinite(octets) || octets <= 0) return "—";
  if (octets >= 1024 * 1024) {
    return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  }
  return `${Math.max(1, Math.round(octets / 1024))} Ko`;
}

const fmtType = (type: string): string =>
  type === "application/pdf" ? "PDF" : (type.split("/")[1] ?? type).toUpperCase();

const estImage = (type: string): boolean => type.startsWith("image/");

/* Les codes du chemin SANS JavaScript. La route ne renvoie jamais de
   message dans l'URL — un texte repris d'un paramètre et réaffiché
   permettrait de faire dire n'importe quoi à cet écran via un lien. */
const MESSAGES_ENVOI: Record<string, { texte: string; alerte?: true }> = {
  ok: { texte: "Fichiers ajoutés à la médiathèque. Pensez à renseigner leur texte alternatif." },
  partiel: {
    texte:
      "Une partie des fichiers a été ajoutée ; les autres ont été refusés (format non accepté, poids, ou contenu ne correspondant pas à l'extension).",
    alerte: true,
  },
  echec: {
    texte:
      "Aucun fichier n'a été ajouté : format non accepté, poids supérieur à la limite, ou contenu ne correspondant pas à l'extension annoncée.",
    alerte: true,
  },
  vide: { texte: "Aucun fichier n'a été reçu.", alerte: true },
  "trop-gros": { texte: "Envoi trop volumineux. Procédez en plusieurs fois.", alerte: true },
  "trop-nombreux": { texte: "Trop de fichiers d'un coup. Procédez par lots.", alerte: true },
  illisible: { texte: "L'envoi n'a pas pu être lu. Réessayez.", alerte: true },
  indisponible: { texte: "La médiathèque n'est pas configurée.", alerte: true },
};

/* ════════════════════════════════════════════════════════════════ */

export default async function AdminMediasPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    filtre?: string;
    supprimer?: string;
    ok?: string;
    envoi?: string;
  }>;
}) {
  await requireAdmin();

  const { q, filtre, supprimer, ok, envoi } = await searchParams;
  const etat = etatMediatheque();
  const contenu = await getContent();
  const medias = contenu.medias;

  const sansAlt = mediasSansAlt(medias);
  const terme = (q ?? "").trim().toLowerCase();
  const sansAltSeulement = filtre === "sansalt";

  const visibles = medias
    .filter((m) => !sansAltSeulement || sansAlt.some((x) => x.id === m.id))
    .filter(
      (m) => !terme || m.nom.toLowerCase().includes(terme) || m.alt.toLowerCase().includes(terme),
    );

  /* Une seule requête de signature pour toute la grille — signer média
     par média ferait autant d'allers-retours que de vignettes. */
  const urls = await signerChemins(visibles.map((m) => m.chemin));

  const aSupprimer = supprimer ? (medias.find((m) => m.id === supprimer) ?? null) : null;
  const usages = aSupprimer ? chercherUsages(contenu, aSupprimer.id) : [];
  const urlSuppression = aSupprimer
    ? ((await signerChemins([aSupprimer.chemin])).get(aSupprimer.chemin) ?? null)
    : null;

  const poidsTotal = medias.reduce((somme, m) => somme + (m.taille || 0), 0);

  /* ════ ACTIONS ════ */

  async function enregistrerAlt(formData: FormData) {
    "use server";
    /* Point d'entrée HTTP public : le garde est ici, pas à l'affichage. */
    await assertAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const alt = String(formData.get("alt") ?? "")
      .trim()
      .slice(0, 300);
    if (!id) redirect("/admin/medias");

    const actuel = await getContent();
    const cible = actuel.medias.find((m) => m.id === id);
    /* Média disparu (suppression concurrente, retour arrière) : on ne
       réécrit rien et on ne revalide pas le site pour rien. */
    if (!cible || cible.alt === alt) redirect("/admin/medias");

    const liste: Media[] = actuel.medias.map((m) => (m.id === id ? { ...m, alt } : m));
    await patchContent("medias", liste);

    /* Un texte alternatif se lit dans l'attribut `alt` des pages qui
       affichent l'image — et une image peut être partout, jusque dans
       l'en-tête. On revalide donc l'arbre entier plutôt que de deviner. */
    revalidatePath("/", "layout");
    redirect("/admin/medias?ok=alt");
  }

  async function supprimerFichier(formData: FormData) {
    "use server";
    await assertAdmin();

    const id = String(formData.get("id") ?? "").trim();
    if (!id) redirect("/admin/medias");

    const resultat = await supprimerMedia(id);
    if (!resultat.ok) redirect("/admin/medias?ok=echec");

    revalidatePath("/", "layout");
    redirect("/admin/medias?ok=supprime");
  }

  /* ════ RENDU ════ */

  const message = envoi ? MESSAGES_ENVOI[envoi] : undefined;

  return (
    <>
      <div className="adm-head">
        <div>
          <span className="c-label c-label--accent">Contenu</span>
          <h1>Médiathèque</h1>
        </div>
        <p>
          Tous les fichiers du site sont ici : photos, plans, logos, documents.
          C&apos;est aussi le seul endroit où se renseigne le{" "}
          <strong>texte alternatif</strong> — la phrase qui décrit l&apos;image
          à quelqu&apos;un qui ne la voit pas, et à Google. Une fois un fichier
          déposé ici, il se choisit d&apos;un clic depuis les autres écrans.
        </p>
      </div>

      {/* ════ MÉDIATHÈQUE INDISPONIBLE ════
          L'écran s'ouvre quand même et explique quoi configurer : c'est
          le mode normal d'une recette locale, pas une panne. */}
      {!etat.disponible ? (
        <>
          <p className="adm-note adm-note--alerte">
            ⚠ <strong>Médiathèque indisponible.</strong> {etat.raison}
          </p>
          <section className="adm-card">
            <h2>Ce qu&apos;il faut pour l&apos;activer</h2>
            <p>
              Les fichiers ont besoin d&apos;un stockage : le site sait le faire
              avec Supabase, et seulement avec lui. Trois choses à mettre en
              place, dans cet ordre :
            </p>
            <ol
              style={{
                marginTop: "var(--s-2)",
                paddingLeft: "1.2rem",
                fontSize: "var(--fs-small)",
                lineHeight: 1.7,
              }}
            >
              <li>
                Renseigner <code>SUPABASE_URL</code> (avec son <code>https://</code>)
                et <code>SUPABASE_SERVICE_ROLE_KEY</code> dans les variables
                d&apos;environnement de l&apos;hébergement.
              </li>
              <li>
                Appliquer <code>supabase/schema.sql</code> — il crée la table des
                fiches.
              </li>
              <li>
                Créer le bucket <strong>privé</strong> <code>medias</code> dans
                Supabase Storage. Privé : les visuels non diffusés du client
                n&apos;ont pas à être accessibles à qui devine un nom de fichier.
              </li>
            </ol>
            <p style={{ marginTop: "var(--s-2)" }}>
              En attendant, les écrans qui demandent une image acceptent une
              adresse saisie à la main : rien n&apos;est bloqué, mais rien
              n&apos;est téléversable.
            </p>
          </section>
        </>
      ) : (
        <>
          {/* ════ MESSAGES ════ */}
          {ok === "alt" ? (
            <p className="adm-note" role="status">
              Texte alternatif enregistré. Les pages qui affichent cette image ont
              été rafraîchies.
            </p>
          ) : null}
          {ok === "supprime" ? (
            <p className="adm-note" role="status">
              Média supprimé — la fiche et le fichier.
            </p>
          ) : null}
          {ok === "echec" ? (
            <p className="adm-note adm-note--alerte" role="alert">
              La suppression a échoué : le fichier n&apos;a pas pu être retiré du
              stockage. Rien n&apos;a été perdu, réessayez.
            </p>
          ) : null}
          {message ? (
            <p
              className={message.alerte ? "adm-note adm-note--alerte" : "adm-note"}
              role={message.alerte ? "alert" : "status"}
            >
              {message.texte}
            </p>
          ) : null}

          {/* ════ CONFIRMATION DE SUPPRESSION ════ */}
          {aSupprimer ? (
            <section className="adm-card">
              <h2>Supprimer ce média ?</h2>
              <div style={{ display: "flex", gap: "var(--s-2)", flexWrap: "wrap" }}>
                {urlSuppression && estImage(aSupprimer.type) ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={urlSuppression}
                      alt=""
                      style={{
                        width: "7rem",
                        height: "7rem",
                        objectFit: "contain",
                        border: "1px solid var(--beton)",
                        background: "var(--craie)",
                      }}
                    />
                  </>
                ) : null}
                <p style={{ flex: "1 1 16rem" }}>
                  <strong>{aSupprimer.nom}</strong> — {fmtType(aSupprimer.type)},{" "}
                  {poidsLisible(aSupprimer.taille)}
                  {aSupprimer.largeur && aSupprimer.hauteur
                    ? `, ${aSupprimer.largeur}×${aSupprimer.hauteur} px`
                    : ""}
                  , ajouté le {fmtDate(aSupprimer.creeLe)}.
                </p>
              </div>

              {usages.length > 0 ? (
                <div className="adm-note adm-note--alerte" style={{ marginTop: "var(--s-2)" }}>
                  <strong>Ce média est utilisé.</strong> Le supprimer le fera
                  disparaître de&nbsp;:
                  <ul style={{ marginTop: ".4rem", paddingLeft: "1.1rem", listStyle: "disc" }}>
                    {usages.map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                  Ces écrans afficheront alors leur visuel par défaut, ou rien.
                </div>
              ) : (
                <p className="adm-note" style={{ marginTop: "var(--s-2)" }}>
                  Aucun usage repéré dans le contenu éditable. Ce relevé couvre les
                  images choisies depuis les écrans du back-office ; il ne peut pas
                  voir un visuel intégré autrement.
                </p>
              )}

              <p className="adm-note adm-note--alerte" style={{ marginTop: "var(--s-2)" }}>
                <strong>C&apos;est définitif.</strong> Le fichier quitte le stockage
                et ne peut pas être récupéré — il faudra le téléverser à nouveau.
              </p>

              <form action={supprimerFichier} className="adm-actions">
                <input type="hidden" name="id" value={aSupprimer.id} />
                <Link href="/admin/medias" className="c-btn">
                  Annuler
                </Link>
                <button type="submit" className="c-btn c-btn--danger">
                  Supprimer définitivement
                </button>
              </form>
            </section>
          ) : null}

          {/* ════ TÉLÉVERSEMENT ════ */}
          <section className="adm-card">
            <h2>Ajouter des fichiers</h2>
            <TeleverseurMedias rafraichir />
            <noscript>
              {/* Sans JavaScript, ni glisser-déposer ni progression : un
                  formulaire classique vers la même route, qui redirige
                  ici plutôt que de répondre du JSON. */}
              <form
                action="/api/admin/medias"
                method="post"
                encType="multipart/form-data"
                style={{ marginTop: "var(--s-2)" }}
              >
                <div className="adm-field">
                  <label htmlFor="nojs-fichier">Fichiers</label>
                  <input id="nojs-fichier" type="file" name="fichier" multiple required />
                </div>
                <div className="adm-field" style={{ marginTop: "var(--s-2)" }}>
                  <label htmlFor="nojs-alt">Texte alternatif</label>
                  <input
                    id="nojs-alt"
                    type="text"
                    name="alt"
                    maxLength={300}
                    placeholder="Ce que montre l'image"
                  />
                  <p className="adm-field__aide">
                    Appliqué uniquement si vous envoyez un seul fichier. JPEG,
                    PNG, WebP, AVIF, GIF, SVG et PDF —{" "}
                    {Math.round(TAILLE_MAX / (1024 * 1024))} Mo maximum par
                    fichier.
                  </p>
                </div>
                <div className="adm-actions">
                  <button type="submit" className="c-btn c-btn--solid">
                    Envoyer
                  </button>
                </div>
              </form>
            </noscript>
          </section>

          {/* ════ CHIFFRES ════ */}
          <div className="adm-grid">
            <div className="adm-stat">
              <span className="adm-stat__n">{medias.length}</span>
              <span className="adm-stat__l">
                {medias.length > 1 ? "fichiers" : "fichier"}
              </span>
            </div>
            <div className="adm-stat">
              <span className="adm-stat__n">{poidsLisible(poidsTotal)}</span>
              <span className="adm-stat__l">poids total</span>
            </div>
            <div className="adm-stat">
              <span className="adm-stat__n">{sansAlt.length}</span>
              <span className="adm-stat__l">sans texte alternatif</span>
            </div>
          </div>

          {sansAlt.length > 0 && !sansAltSeulement ? (
            <p className="adm-note adm-note--alerte">
              <strong>
                {sansAlt.length === 1
                  ? "Une image n'a pas de texte alternatif."
                  : `${sansAlt.length} images n'ont pas de texte alternatif.`}
              </strong>{" "}
              Elles sont invisibles pour Google Images et pour un lecteur
              d&apos;écran.{" "}
              <Link href="/admin/medias?filtre=sansalt">Les afficher</Link>.
            </p>
          ) : null}

          {/* ════ RECHERCHE ════ */}
          <section className="adm-card">
            <div className="adm-toolbar">
              <form method="get" style={{ display: "flex", gap: ".5rem", flex: "1 1 18rem" }}>
                {sansAltSeulement ? <input type="hidden" name="filtre" value="sansalt" /> : null}
                <label className="u-sr-only" htmlFor="q">
                  Rechercher un média
                </label>
                <input
                  id="q"
                  type="search"
                  name="q"
                  defaultValue={q ?? ""}
                  placeholder="Rechercher par nom de fichier…"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    font: "inherit",
                    padding: ".65rem .8rem",
                    border: "1px solid var(--beton)",
                    borderRadius: "var(--radius)",
                    background: "var(--blanc)",
                  }}
                />
                <button type="submit" className="c-btn">
                  Rechercher
                </button>
              </form>
              {terme || sansAltSeulement ? (
                <Link href="/admin/medias" className="c-btn">
                  Tout afficher
                </Link>
              ) : null}
            </div>

            <p className="u-muted" style={{ marginTop: "var(--s-2)", fontSize: "var(--fs-small)" }}>
              {visibles.length === medias.length
                ? `${medias.length} ${medias.length > 1 ? "médias" : "média"}.`
                : `${visibles.length} sur ${medias.length} ${medias.length > 1 ? "médias" : "média"}.`}
            </p>
          </section>

          {/* ════ LA GRILLE ════ */}
          {visibles.length === 0 ? (
            <p className="adm-empty">
              <strong>{medias.length === 0 ? "Médiathèque vide" : "Aucun résultat"}</strong>
              {medias.length === 0
                ? "Déposez un premier fichier avec la zone ci-dessus."
                : "Aucun fichier ne correspond à cette recherche."}
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "var(--s-2)",
                gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))",
              }}
            >
              {visibles.map((m) => {
                const url = urls.get(m.chemin) ?? null;
                const manqueAlt = !m.alt.trim() && m.type !== "application/pdf";
                return (
                  <article
                    key={m.id}
                    className="adm-card"
                    style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}
                  >
                    <div
                      style={{
                        display: "grid",
                        placeItems: "center",
                        height: "9rem",
                        overflow: "hidden",
                        border: "1px solid var(--beton)",
                        borderRadius: "var(--radius)",
                        background: "var(--craie)",
                        fontFamily: "var(--f-mono)",
                        fontSize: "var(--fs-label)",
                        color: "var(--pierre)",
                      }}
                    >
                      {url && estImage(m.type) ? (
                        /* URL signées, temporaires, hors des domaines
                           déclarés : next/image ne peut pas les traiter. */
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={url}
                          alt={m.alt}
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            display: "block",
                          }}
                        />
                      ) : (
                        fmtType(m.type)
                      )}
                    </div>

                    <div
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: "var(--fs-label)",
                        color: "var(--pierre)",
                        lineHeight: 1.6,
                        overflowWrap: "anywhere",
                      }}
                    >
                      <strong style={{ color: "var(--anthracite)" }}>{m.nom}</strong>
                      <br />
                      {fmtType(m.type)} · {poidsLisible(m.taille)}
                      {m.largeur && m.hauteur ? ` · ${m.largeur}×${m.hauteur} px` : ""}
                      <br />
                      Ajouté le {fmtDate(m.creeLe)}
                    </div>

                    {/* ════ TEXTE ALTERNATIF ════ */}
                    <form action={enregistrerAlt} className="adm-field">
                      <input type="hidden" name="id" value={m.id} />
                      <label htmlFor={`alt-${m.id}`}>
                        Texte alternatif{" "}
                        {manqueAlt ? <span className="adm-badge adm-badge--off">manquant</span> : null}
                      </label>
                      <input
                        id={`alt-${m.id}`}
                        type="text"
                        name="alt"
                        defaultValue={m.alt}
                        maxLength={300}
                        placeholder={
                          m.type === "application/pdf"
                            ? "Titre du document"
                            : "Ce que montre l'image, en une phrase"
                        }
                      />
                      <p className="adm-field__aide">
                        {m.type === "application/pdf"
                          ? "Sert de libellé au lien vers ce document."
                          : "Décrivez ce qu'on voit, pas le fichier : « Maison Essensya de plain-pied, façade enduit clair » plutôt que « photo1 »."}
                      </p>
                      <div className="adm-actions adm-actions--serre" style={{ gap: ".5rem" }}>
                        <button type="submit" className="c-btn">
                          Enregistrer
                        </button>
                        <Link
                          href={`/admin/medias?supprimer=${encodeURIComponent(m.id)}`}
                          className="c-btn c-btn--danger"
                        >
                          Supprimer
                        </Link>
                      </div>
                    </form>

                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "var(--fs-label)", fontFamily: "var(--f-mono)" }}
                      >
                        Ouvrir le fichier <span aria-hidden="true">↗</span>
                      </a>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
