import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import GuideEcran from "@/components/admin/GuideEcran";
import { estEnLigne, pagesDuCode, slugLibre } from "@/lib/campagnes";
import { landingUrl } from "@/lib/format";
import { getContentFrais, isWritable, patchContent } from "@/lib/store";
import type { PageCampagne } from "@/lib/store/types";
import { assertAdmin, requireAdmin } from "../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — PAGES DE CAMPAGNE (landing pages)

   Une page d'atterrissage par message publicitaire : l'annonce « votre
   maison à Tartas » mène à une page qui parle de Tartas, pas à l'accueil.

   ── DUPLIQUER EST LE GESTE PRINCIPAL ──
   Une nouvelle campagne ressemble presque toujours à la précédente : même
   structure, autre commune, autre accroche. « Dupliquer » crée une copie
   HORS LIGNE à une adresse libre, qu'on retouche avant de la publier.

   ── HORS LIGNE PLUTÔT QUE SUPPRIMÉE ──
   Une campagne terminée se met hors ligne : son adresse rend une page
   introuvable, mais la page reste ici, prête à resservir. Supprimer est
   définitif et passe par une page de confirmation (même raisonnement
   que le blog : sans JavaScript, et avec ce qu'on s'apprête à perdre
   sous les yeux).
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pages de campagne",
  robots: { index: false, follow: false },
};

const txt = (v: FormDataEntryValue | null): string => (typeof v === "string" ? v.trim() : "");

const fmtDate = (iso?: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
};

/* Tri de travail : les pages en ligne d'abord, puis les plus récentes. */
const ordre = (a: PageCampagne, b: PageCampagne): number => {
  const ea = estEnLigne(a);
  if (ea !== estEnLigne(b)) return ea ? -1 : 1;
  return (b.majLe ?? "").localeCompare(a.majLe ?? "");
};

export default async function AdminCampagnesPage({
  searchParams,
}: {
  searchParams: Promise<{ supprimer?: string; ok?: string }>;
}) {
  await requireAdmin();

  const { supprimer, ok } = await searchParams;
  const [content, ecriture] = await Promise.all([getContentFrais(), isWritable()]);
  const pages = [...content.campagnes].sort(ordre);
  const aSupprimer = supprimer ? (pages.find((p) => p.id === supprimer) ?? null) : null;

  /* Les pages livrées dans le code et pas encore reprises : elles sont en
     ligne, et le client doit le savoir. */
  const pris = new Set(content.campagnes.map((p) => p.slug));
  const duCode = pagesDuCode().filter((p) => !pris.has(p.slug));

  /* ════ ACTIONS ════ */

  async function dupliquer(formData: FormData) {
    "use server";
    await assertAdmin();
    const actuelles = (await getContentFrais()).campagnes;
    const source = actuelles.find((p) => p.id === txt(formData.get("id")));
    if (!source) redirect("/admin/campagnes");

    const copie: PageCampagne = {
      ...structuredClone(source),
      id: randomUUID(),
      nom: `${source.nom} (copie)`,
      slug: slugLibre(
        `${source.slug}-copie`,
        actuelles.map((p) => p.slug),
      ),
      /* Hors ligne : la copie porte encore le texte de l'original, elle ne
         doit pas être servie avant d'avoir été relue. */
      publiee: false,
      blocs: source.blocs.map((b) => ({ ...b, id: randomUUID() })),
      majLe: new Date().toISOString(),
    };
    await patchContent("campagnes", [...actuelles, copie]);
    redirect(`/admin/campagnes/${copie.id}?ok=1`);
  }

  async function reprendre(formData: FormData) {
    "use server";
    await assertAdmin();
    const slug = txt(formData.get("slug"));
    const actuelles = (await getContentFrais()).campagnes;
    const origine = pagesDuCode().find((p) => p.slug === slug);
    /* Déjà reprise (double clic, retour arrière) : on ouvre l'existante. */
    const existante = actuelles.find((p) => p.slug === slug);
    if (existante) redirect(`/admin/campagnes/${existante.id}`);
    if (!origine) redirect("/admin/campagnes");

    /* Même adresse, même état (en ligne) : pour le visiteur, rien ne
       change au moment de la reprise. C'est la copie éditable qui est
       servie désormais. */
    const copie: PageCampagne = {
      ...origine,
      id: randomUUID(),
      blocs: origine.blocs.map((b) => ({ ...b, id: randomUUID() })),
      majLe: new Date().toISOString(),
    };
    await patchContent("campagnes", [...actuelles, copie]);
    revalidatePath(landingUrl(slug));
    redirect(`/admin/campagnes/${copie.id}?ok=1`);
  }

  async function supprimerPage(formData: FormData) {
    "use server";
    await assertAdmin();
    const id = txt(formData.get("id"));
    const actuelles = (await getContentFrais()).campagnes;
    const cible = actuelles.find((p) => p.id === id);
    if (cible) {
      await patchContent(
        "campagnes",
        actuelles.filter((p) => p.id !== id),
      );
      /* L'adresse rend désormais une page introuvable — ou la page du
         code qu'elle avait remplacée. */
      revalidatePath(landingUrl(cible.slug));
    }
    redirect("/admin/campagnes?ok=supprimee");
  }

  /* ════ RENDU ════ */
  return (
    <>
      <div className="adm-head">
        <div>
          <span className="c-label c-label--accent">Contenu</span>
          <h1>Pages de campagne</h1>
        </div>
        <Link href="/admin/campagnes/nouvelle" className="c-btn c-btn--solid">
          Nouvelle page
        </Link>
        <p>
          Une page d&apos;atterrissage par message publicitaire : la personne qui clique
          sur « votre maison à Tartas » arrive sur une page qui parle de Tartas, avec un
          formulaire et rien d&apos;autre — pas de menu pour s&apos;égarer. Ces pages
          n&apos;apparaissent ni dans la navigation ni dans Google : on n&apos;y arrive
          que par l&apos;annonce.
        </p>
      </div>

      <GuideEcran cle="campagnes" />

      {!ecriture ? (
        <p className="adm-note adm-note--alerte">
          ⚠ <strong>Le stockage est en lecture seule sur cet hébergement.</strong> Vos
          pages ne seront pas conservées.
        </p>
      ) : null}
      {ok === "supprimee" ? (
        <p className="adm-note" role="status">
          Page supprimée. Son adresse renvoie désormais une page introuvable.
        </p>
      ) : null}

      {/* ════ CONFIRMATION DE SUPPRESSION ════ */}
      {aSupprimer ? (
        <section className="adm-card">
          <h2>Supprimer cette page ?</h2>
          <p>
            <strong>{aSupprimer.nom || "Page sans nom"}</strong> —{" "}
            {estEnLigne(aSupprimer) ? "en ligne" : "hors ligne"}, à l&apos;adresse{" "}
            <code>{landingUrl(aSupprimer.slug)}</code>.
          </p>
          <p>
            La suppression est définitive : il n&apos;y a pas de corbeille. Si une
            annonce pointe encore vers cette adresse, ses visiteurs tomberont sur une
            page introuvable — et la campagne continuera d&apos;être payée. Pour une
            campagne terminée, préférez « Hors ligne » dans la fiche : la page reste
            ici, prête à resservir.
          </p>
          <form action={supprimerPage} className="adm-actions">
            <input type="hidden" name="id" value={aSupprimer.id} />
            <button type="submit" className="c-btn c-btn--danger">
              Supprimer définitivement
            </button>
            <Link href="/admin/campagnes" className="c-btn">
              Annuler
            </Link>
          </form>
        </section>
      ) : null}

      {/* ════ LISTE ════ */}
      {pages.length === 0 ? (
        <div className="adm-empty">
          <strong>Aucune page de campagne</strong>
          Créez la première au moment de préparer une annonce : son titre doit
          reprendre la promesse de l&apos;annonce, mot pour mot.
          <div className="adm-actions">
            <Link href="/admin/campagnes/nouvelle" className="c-btn c-btn--solid">
              Créer une page
            </Link>
          </div>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <caption className="u-sr-only">Pages de campagne</caption>
            <thead>
              <tr>
                <th scope="col">Campagne</th>
                <th scope="col">État</th>
                <th scope="col">Modifiée le</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => {
                const enLigne = estEnLigne(p);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/campagnes/${p.id}`}>{p.nom || "Page sans nom"}</Link>
                      <br />
                      <code className="u-muted">{landingUrl(p.slug)}</code>
                    </td>
                    <td>
                      <span className={`adm-badge ${enLigne ? "adm-badge--on" : "adm-badge--off"}`}>
                        {enLigne ? "En ligne" : "Hors ligne"}
                      </span>
                    </td>
                    <td>{fmtDate(p.majLe)}</td>
                    <td>
                      <div className="adm-actions adm-actions--serre">
                        <Link href={`/admin/campagnes/${p.id}`} className="c-btn">
                          Modifier
                        </Link>
                        <Link href={`/admin/campagnes/${p.id}?apercu=1`} className="c-btn">
                          Aperçu
                        </Link>
                        {enLigne ? (
                          <a
                            href={landingUrl(p.slug)}
                            className="c-btn"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Voir en ligne <span aria-hidden="true">↗</span>
                          </a>
                        ) : null}
                        <form action={dupliquer}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="c-btn">
                            Dupliquer
                          </button>
                        </form>
                        <Link
                          href={`/admin/campagnes?supprimer=${encodeURIComponent(p.id)}`}
                          className="c-btn c-btn--danger"
                        >
                          Supprimer
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ════ PAGES LIVRÉES DANS LE CODE ════ */}
      {duCode.length > 0 ? (
        <section className="adm-card" style={{ marginTop: "var(--s-4)" }}>
          <h2>Pages livrées avec le site</h2>
          <p>
            Ces pages sont en ligne mais ne se modifient pas d&apos;ici : elles sont
            écrites dans le code du site. « Reprendre » en fait une copie modifiable,
            à la même adresse — pour les visiteurs, rien ne change. Vérifiez ensuite
            l&apos;offre qu&apos;elles annoncent : ce sont des textes de maquette.
          </p>
          <ul>
            {duCode.map((p) => (
              <li key={p.slug} className="adm-row">
                <span>
                  {p.nom} — <code>{landingUrl(p.slug)}</code>
                </span>
                <span className="adm-actions adm-actions--serre" style={{ marginTop: 0 }}>
                  <a
                    href={landingUrl(p.slug)}
                    className="c-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Voir <span aria-hidden="true">↗</span>
                  </a>
                  <form action={reprendre}>
                    <input type="hidden" name="slug" value={p.slug} />
                    <button type="submit" className="c-btn">
                      Reprendre dans le back-office
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
