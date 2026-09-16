import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContentFrais, isWritable, patchContent } from "@/lib/store";
import type { Article } from "@/lib/store/types";
import { assertAdmin, requireAdmin } from "../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — LISTE DES ARTICLES

   La suppression est la seule action destructrice de cet écran : elle
   passe donc par une confirmation, et cette confirmation est une PAGE,
   pas un `confirm()` de navigateur. Trois raisons :
     · l'écran fonctionne sans JavaScript, comme le reste du back-office ;
     · on peut y rappeler ce que l'on s'apprête à détruire — titre, état,
       date, adresse publique — là où un `confirm()` ne montre rien ;
     · « Annuler » revient à un état connu plutôt qu'à un dialogue fermé.

   L'état de confirmation vit dans l'URL (`?supprimer=<slug>`) : il est
   rechargeable, partageable, et ne laisse aucun état côté serveur.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  robots: { index: false, follow: false },
};

const fmtDate = (iso?: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
};

/** Publié = ni brouillon, ni sans date. Même règle que le site public. */
const estPublie = (a: Article): boolean => !a.brouillon && !!a.publieLe;

/* Tri de travail, pas de tri de lecture : ce qui demande une action
   remonte. Les brouillons d'abord, puis les articles les plus récents. */
const ordre = (a: Article, b: Article): number => {
  if (a.brouillon !== b.brouillon) return a.brouillon ? -1 : 1;
  return (b.publieLe ?? "").localeCompare(a.publieLe ?? "");
};

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ supprimer?: string; ok?: string }>;
}) {
  await requireAdmin();

  const { supprimer, ok } = await searchParams;
  const content = await getContentFrais();
  const articles = [...content.articles].sort(ordre);
  const inscriptible = await isWritable();
  const aSupprimer = supprimer ? (articles.find((a) => a.slug === supprimer) ?? null) : null;

  async function supprimerArticle(formData: FormData) {
    "use server";
    /* Une Server Action est joignable en POST direct, sans passer par cet
       écran : le garde est ici, pas seulement à l'affichage. */
    await assertAdmin();

    const slug = String(formData.get("slug") ?? "").trim();
    if (!slug) redirect("/admin/blog");

    const actuel = await getContentFrais();
    const reste = actuel.articles.filter((a) => a.slug !== slug);
    /* Rien à supprimer (double soumission, retour arrière) : on ne réécrit
       pas le fichier et on ne revalide rien pour rien. */
    if (reste.length !== actuel.articles.length) {
      await patchContent("articles", reste);
      revalidatePath("/blog");
      revalidatePath(`/blog/${slug}`);
    }
    redirect("/admin/blog?ok=supprime");
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <span className="c-label c-label--accent">Blog</span>
          <h1>Les articles</h1>
        </div>
        <Link href="/admin/blog/nouveau" className="c-btn c-btn--solid">
          Nouvel article
        </Link>
        <p>
          Le blog capte les recherches que les pages produit ne captent pas :
          « prix construction maison », « ce que couvre le CCMI », « combien coûte
          un terrain viabilisé ». Ce sont des visiteurs qui arrivent bien plus tôt
          dans leur projet, quand le choix du constructeur est encore ouvert.
        </p>
      </div>

      {ok === "supprime" ? (
        <p className="adm-note" role="status">
          Article supprimé. La liste publique a été rafraîchie.
        </p>
      ) : null}

      {!inscriptible ? (
        <p className="adm-note adm-note--alerte">
          ⚠ <strong>Le stockage est en lecture seule sur cet hébergement.</strong> Vos
          articles ne seront pas conservés. Voir la note d&apos;architecture en tête
          de <code>src/lib/store/index.ts</code>.
        </p>
      ) : null}

      {/* ════ CONFIRMATION DE SUPPRESSION ════ */}
      {aSupprimer ? (
        <section className="adm-card">
          <h2>Supprimer cet article ?</h2>
          <p>
            <strong>{aSupprimer.titre || "Sans titre"}</strong> —{" "}
            {estPublie(aSupprimer) ? "publié" : "brouillon"}, {fmtDate(aSupprimer.publieLe)},
            à l&apos;adresse <code>/blog/{aSupprimer.slug}</code>.
          </p>
          <p>
            La suppression est définitive : il n&apos;y a pas de corbeille. Si
            l&apos;article est en ligne, son adresse renverra une page introuvable —
            y compris pour les liens déjà partagés et pour Google.
          </p>
          <form action={supprimerArticle} className="adm-actions">
            <input type="hidden" name="slug" value={aSupprimer.slug} />
            <button type="submit" className="c-btn c-btn--danger">
              Supprimer définitivement
            </button>
            <Link href="/admin/blog" className="c-btn">
              Annuler
            </Link>
          </form>
        </section>
      ) : null}

      {/* ════ LISTE ════ */}
      {articles.length === 0 ? (
        <div className="adm-empty">
          <strong>Aucun article</strong>
          Le premier peut être court : une question que l&apos;on vous pose au
          téléphone, et sa réponse honnête.
          <div className="adm-actions">
            <Link href="/admin/blog/nouveau" className="c-btn c-btn--solid">
              Écrire le premier article
            </Link>
          </div>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <caption className="u-sr-only">Articles du blog</caption>
            <thead>
              <tr>
                <th scope="col">Titre</th>
                <th scope="col">État</th>
                <th scope="col">Date</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.slug}>
                  <td>
                    <Link href={`/admin/blog/${encodeURIComponent(a.slug)}`}>
                      {a.titre || "Sans titre"}
                    </Link>
                    <br />
                    <code className="u-muted">/blog/{a.slug}</code>
                  </td>
                  <td>
                    <span
                      className={`adm-badge ${estPublie(a) ? "adm-badge--on" : "adm-badge--off"}`}
                    >
                      {estPublie(a) ? "Publié" : "Brouillon"}
                    </span>
                  </td>
                  <td>{fmtDate(a.publieLe)}</td>
                  <td>
                    <div className="adm-actions adm-actions--serre">
                      <Link href={`/admin/blog/${encodeURIComponent(a.slug)}`} className="c-btn">
                        Modifier
                      </Link>
                      {/* Aperçu : rend l'article tel qu'il paraîtra, brouillon
                          compris. Il vit dans le back-office et jamais sur le
                          site — voir la note de src/app/blog/[slug]/page.tsx. */}
                      <Link
                        href={`/admin/blog/${encodeURIComponent(a.slug)}?apercu=1`}
                        className="c-btn"
                      >
                        Aperçu
                      </Link>
                      {estPublie(a) ? (
                        <a
                          href={`/blog/${a.slug}`}
                          className="c-btn"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Voir en ligne <span aria-hidden="true">↗</span>
                        </a>
                      ) : null}
                      <Link
                        href={`/admin/blog?supprimer=${encodeURIComponent(a.slug)}`}
                        className="c-btn c-btn--danger"
                      >
                        Supprimer
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
