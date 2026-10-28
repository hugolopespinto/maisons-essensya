import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authDriver, currentAdmin, type RoleAdmin } from "@/lib/admin/auth";
import {
  changerRole as changerRoleCompte,
  cheminAcces,
  inviter as inviterCompte,
  listerComptes,
  nouveauLien,
  revoquer as revoquerCompte,
  type Compte,
} from "@/lib/admin/comptes";
import { SITE_URL } from "@/lib/site-url";
import { assertRole, requireRole } from "../actions";
import { CopierLien } from "./CopierLien";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — UTILISATEURS

   L'écran qui DISTRIBUE les droits. Il est donc, par construction, le
   seul que ceux qui les reçoivent ne doivent pas pouvoir ouvrir :
   `requireRole("admin")` sur la page, `assertRole("admin")` en première
   ligne de CHACUNE des actions — une Server Action est une route POST
   publique, l'écran qui l'affiche ne la protège pas.

   CE QUE CET ÉCRAN GÈRE
   Les comptes vivent dans la table `admins` (voir src/lib/admin/comptes.ts) :
   identité, empreinte du mot de passe et rôle. Inviter crée le compte et
   produit un LIEN D'ACCÈS à usage unique, valable 72 h, que
   l'administrateur transmet lui-même — aucun e-mail n'est envoyé par le
   site. Le même bouton sert au mot de passe oublié. Retirer l'accès
   conserve l'identité : le journal des modifications continue de nommer
   ce que la personne a écrit.

   ⚠ TROIS VERROUS ANTI-AUTO-ENFERMEMENT, la manière la plus courante de
   se retrouver dehors de son propre back-office :
     1. on ne se révoque pas soi-même ;
     2. on ne se rétrograde pas soi-même ;
     3. on ne retire jamais le dernier compte `admin`, ni par révocation
        ni par rétrogradation.
   Les trois sont vérifiés côté serveur, dans les actions. L'interface se
   contente de ne pas proposer ce qu'elle sait refusé.

   ⚠ PAS DE `revalidatePath()` ICI, et ce n'est pas un oubli : aucune page
   publique n'affiche la liste des comptes. Rien à régénérer.

   ⚠ UNE RÉVOCATION N'EST PAS IMMÉDIATE. La session est un cookie signé
   vérifié hors ligne (voir `src/lib/admin/auth.ts`) : un compte révoqué
   garde ses droits jusqu'à l'expiration de son cookie, 8 h au plus.
   Pour couper à la seconde, faire tourner ADMIN_SESSION_SECRET — toutes
   les sessions tombent, la vôtre comprise. L'écran le dit.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Utilisateurs",
  robots: { index: false, follow: false },
};

const ROUTE = "/admin/utilisateurs";

/** Comptes nommés actifs ? Sinon, il n'y a qu'un mot de passe partagé. */
const comptesNommes = (): boolean => authDriver() === "comptes";

/* Volontairement permissif : on n'écarte que les saisies qui ne sont
   manifestement pas une adresse. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const lireRole = (v: FormDataEntryValue | null): RoleAdmin =>
  String(v ?? "") === "admin" ? "admin" : "editeur";

const messageErreur = (e: unknown): string =>
  e instanceof Error && e.message ? e.message : "erreur inattendue";

/** Retour à l'écran avec un code de résultat, et rien de plus. */
function fin(params: Record<string, string>): never {
  const p = new URLSearchParams(params);
  redirect(`${ROUTE}?${p.toString()}`);
}

/** Le détail technique d'une panne, borné : il finit dans une URL. */
const detail = (m: string) => m.slice(0, 200);

/* ──────────────────────────────────────────────────────────────────
   LIEN D'ACCÈS À AFFICHER

   ⚠ LE LIEN NE PASSE PAS PAR L'URL DE L'ÉCRAN. Après l'invitation,
   l'action redirige ici ; mettre le lien dans la query string le
   laisserait dans l'historique du navigateur et dans les journaux
   d'accès de l'hébergeur. Il voyage dans un cookie httpOnly limité à
   cet écran et qui expire au bout de deux minutes — le temps de
   l'afficher et de le copier. La base, elle, n'en garde que l'empreinte :
   passé ce délai, plus personne ne peut le relire, il faut en générer un
   nouveau.
   ────────────────────────────────────────────────────────────────── */

const COOKIE_LIEN = "essensya_lien_acces";

async function memoriserLien(email: string, jeton: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_LIEN, JSON.stringify({ email, lien: `${SITE_URL}${cheminAcces(jeton)}` }), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: ROUTE,
    maxAge: 120,
  });
}

async function lienAffiche(): Promise<{ email: string; lien: string } | null> {
  const brut = (await cookies()).get(COOKIE_LIEN)?.value;
  if (!brut) return null;
  try {
    const v = JSON.parse(brut) as { email?: unknown; lien?: unknown };
    return typeof v.email === "string" && typeof v.lien === "string"
      ? { email: v.email, lien: v.lien }
      : null;
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────────────────────────
   LECTURE DES COMPTES
   ────────────────────────────────────────────────────────────────── */

type Lecture = { comptes: Compte[]; panne: string | null };

/**
 * Une panne n'est jamais silencieuse : elle remonte, et l'écran affiche
 * « impossible de lire » plutôt qu'une liste vide — qui se lirait comme
 * « aucun compte », c'est-à-dire le pire message possible.
 */
async function lireComptes(): Promise<Lecture> {
  if (!comptesNommes()) return { comptes: [], panne: null };
  try {
    return { comptes: await listerComptes(), panne: null };
  } catch (e) {
    return { comptes: [], panne: messageErreur(e) };
  }
}

const nbAdmins = (comptes: Compte[]): number =>
  comptes.filter((c) => c.role === "admin").length;

/* ──────────────────────────────────────────────────────────────────
   ACTIONS
   ────────────────────────────────────────────────────────────────── */

async function inviter(formData: FormData) {
  "use server";
  /* Garde de RÔLE en première ligne : cette action crée des accès. */
  await assertRole("admin");
  if (!comptesNommes()) fin({ err: "indisponible" });

  const mail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = lireRole(formData.get("role"));

  if (!mail || mail.length > 254 || !EMAIL_RE.test(mail)) fin({ err: "email" });

  const resultat = await (async () => {
    try {
      return await inviterCompte(mail, role);
    } catch (e) {
      console.error("[admin/utilisateurs] invitation impossible :", messageErreur(e));
      return { ok: false as const, raison: "base" as const, detail: messageErreur(e) };
    }
  })();

  if (!resultat.ok) {
    if (resultat.raison === "existe") fin({ err: "existe" });
    fin({ err: "base", detail: detail("detail" in resultat ? resultat.detail : "") });
  }

  await memoriserLien(mail, resultat.jeton);
  fin({ ok: resultat.reactive ? "reactive" : "invite" });
}

async function genererLien(formData: FormData) {
  "use server";
  await assertRole("admin");
  if (!comptesNommes()) fin({ err: "indisponible" });

  const id = String(formData.get("user_id") ?? "").trim();
  const { comptes, panne } = await lireComptes();
  if (panne) fin({ err: "base", detail: detail(panne) });

  const cible = comptes.find((c) => c.id === id);
  if (!cible) fin({ err: "introuvable" });

  let jeton: string | null = null;
  try {
    jeton = await nouveauLien(id);
  } catch (e) {
    fin({ err: "base", detail: detail(messageErreur(e)) });
  }
  if (!jeton) fin({ err: "introuvable" });

  await memoriserLien(cible.email, jeton);
  fin({ ok: "lien" });
}

async function changerRole(formData: FormData) {
  "use server";
  await assertRole("admin");
  if (!comptesNommes()) fin({ err: "indisponible" });

  const id = String(formData.get("user_id") ?? "").trim();
  const role = lireRole(formData.get("role"));

  const [moi, { comptes, panne }] = await Promise.all([currentAdmin(), lireComptes()]);
  if (panne) fin({ err: "base", detail: detail(panne) });

  const cible = comptes.find((c) => c.id === id);
  if (!cible) fin({ err: "introuvable" });

  /* Verrou 2 : on ne se rétrograde pas soi-même. La comparaison se fait
     sur l'e-mail, seule identité que porte le cookie de session. */
  const mailCourant = (moi?.email ?? "").trim().toLowerCase();
  if (mailCourant && cible.email === mailCourant) fin({ err: "soi" });

  if (cible.role === role) fin({ ok: "rien" });

  /* Verrou 3 : rétrograder le dernier `admin` laisse un back-office que
     plus personne ne peut administrer. */
  if (cible.role === "admin" && role !== "admin" && nbAdmins(comptes) <= 1) {
    fin({ err: "dernier" });
  }

  try {
    await changerRoleCompte(id, role);
  } catch (e) {
    console.error("[admin/utilisateurs] changement de rôle impossible :", messageErreur(e));
    fin({ err: "base", detail: detail(messageErreur(e)) });
  }

  fin({ ok: "role" });
}

async function revoquer(formData: FormData) {
  "use server";
  await assertRole("admin");
  if (!comptesNommes()) fin({ err: "indisponible" });

  const id = String(formData.get("user_id") ?? "").trim();

  const [moi, { comptes, panne }] = await Promise.all([currentAdmin(), lireComptes()]);
  if (panne) fin({ err: "base", detail: detail(panne) });

  const cible = comptes.find((c) => c.id === id);
  if (!cible) fin({ err: "introuvable" });

  /* Verrou 1 : on ne se révoque pas soi-même. */
  const mailCourant = (moi?.email ?? "").trim().toLowerCase();
  if (mailCourant && cible.email === mailCourant) fin({ err: "soi" });

  /* Verrou 3, versant révocation. */
  if (cible.role === "admin" && nbAdmins(comptes) <= 1) fin({ err: "dernier" });

  try {
    await revoquerCompte(id);
  } catch (e) {
    console.error("[admin/utilisateurs] révocation impossible :", messageErreur(e));
    fin({ err: "base", detail: detail(messageErreur(e)) });
  }

  fin({ ok: "revoque" });
}

/* ──────────────────────────────────────────────────────────────────
   ÉCRAN
   ────────────────────────────────────────────────────────────────── */

const OK: Record<string, string> = {
  invite:
    "Compte créé. Transmettez le lien ci-dessous à la personne : elle y choisira son mot de passe, et entrera aussitôt.",
  reactive:
    "Cette adresse avait eu accès par le passé : le compte est rouvert, avec le rôle choisi. Transmettez le lien ci-dessous pour qu'elle choisisse un nouveau mot de passe.",
  lien: "Nouveau lien d'accès généré. Le précédent ne fonctionne plus. Le mot de passe actuel reste valable jusqu'à ce qu'un nouveau soit choisi.",
  role: "Rôle modifié. Il s'appliquera à la prochaine connexion de la personne, ou dans 8 h au plus tard.",
  revoque:
    "Accès retiré. L'identité est conservée pour le journal des modifications ; le mot de passe a été effacé.",
  rien: "Ce rôle était déjà celui du compte : rien n'a été modifié.",
};

const ERR: Record<string, string> = {
  email: "Cette adresse e-mail n'est pas valide. Aucun compte n'a été créé.",
  existe:
    "Cette adresse a déjà accès au back-office. Changez son rôle, ou générez-lui un nouveau lien d'accès, plutôt que de l'inviter à nouveau.",
  introuvable:
    "Ce compte n'est plus dans la liste. L'écran a sans doute été rouvert après une révocation.",
  soi: "Vous ne pouvez ni vous révoquer, ni vous rétrograder vous-même — c'est la façon la plus courante de se verrouiller dehors. Demandez-le à un autre administrateur.",
  dernier:
    "C'est le dernier compte administrateur. Le retirer laisserait un back-office que plus personne ne peut administrer : nommez d'abord un autre administrateur.",
  indisponible:
    "Les comptes nommés ne sont pas actifs sur cette installation : il n'y a rien à gérer.",
  base: "La base n'a pas répondu comme attendu. Rien n'a été modifié.",
};

const LIB_ROLE: Record<RoleAdmin, string> = { admin: "admin", editeur: "éditeur" };

const fmtDate = (iso: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  /* Fuseau explicite : le serveur peut tourner en UTC, la date lue doit
     être celle du client. */
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Europe/Paris",
  }).format(d);
};

const premier = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? "";

/** Les deux rôles, en une phrase chacun. Affiché dans les deux modes. */
function LesDeuxRoles() {
  return (
    <section className="adm-card">
      <h2>Les deux rôles</h2>
      <div className="adm-row">
        <span>
          <span className="adm-badge adm-badge--off">éditeur</span>
        </span>
        <span>
          Écrit le site&nbsp;: pages, textes, blog, annonces, agences, médiathèque et SEO.
        </span>
      </div>
      <div className="adm-row">
        <span>
          <span className="adm-badge adm-badge--on">admin</span>
        </span>
        <span>
          Tout cela, plus le tracking (les outils de mesure) et la gestion des comptes.
        </span>
      </div>
      <p className="adm-field__aide">
        Dans le doute, invitez en «&nbsp;éditeur&nbsp;»&nbsp;: ce rôle suffit à toute personne
        dont le travail est de publier du contenu. Le rôle «&nbsp;admin&nbsp;» donne en plus le
        droit de distribuer les droits.
      </p>
    </section>
  );
}

export default async function UtilisateursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /* Non connecté → login ; connecté en `editeur` → tableau de bord. Cet
     écran distribue les droits : il ne peut pas être ouvert à ceux qui
     les reçoivent. */
  await requireRole("admin");

  const [sp, moi, { comptes, panne }, aTransmettre] = await Promise.all([
    searchParams,
    currentAdmin(),
    lireComptes(),
    lienAffiche(),
  ]);

  const actif = comptesNommes();
  const codeOk = premier(sp.ok);
  const ok = OK[codeOk];
  const err = ERR[premier(sp.err)];
  const precision = premier(sp.detail).slice(0, 200);
  const mailCourant = (moi?.email ?? "").trim().toLowerCase();
  const total = comptes.length;
  const admins = nbAdmins(comptes);
  /* Le lien n'est montré que juste après l'action qui l'a produit : un
     cookie encore vivant ne doit pas le réafficher sous un autre message. */
  const lien = ["invite", "reactive", "lien"].includes(codeOk) ? aTransmettre : null;

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="c-label c-label--accent">Outils</p>
          <h1>Utilisateurs</h1>
        </div>
        <span className={`adm-badge adm-badge--${actif ? "on" : "off"}`}>
          {actif ? "Comptes nommés" : "Mot de passe partagé"}
        </span>
        <p>
          Qui peut entrer dans le back-office, et jusqu&apos;où. Chaque personne a son adresse
          e-mail et son propre mot de passe&nbsp;; ce qui se règle ici, c&apos;est le droit.
        </p>
      </div>

      <p className="adm-note">
        <strong>Écran réservé aux administrateurs.</strong> C&apos;est le seul écran qui
        distribue les droits&nbsp;: il ne peut évidemment pas être ouvert à ceux qui les
        reçoivent.
      </p>

      {ok && <p className="adm-note">{ok}</p>}
      {err && (
        <p className="adm-note adm-note--alerte">
          {err}
          {precision && (
            <>
              {" "}
              <span className="u-muted">Détail&nbsp;: {precision}</span>
            </>
          )}
        </p>
      )}

      {lien && (
        <section className="adm-card" aria-labelledby="adm-lien-t">
          <h2 id="adm-lien-t">Lien d&apos;accès pour {lien.email}</h2>
          <CopierLien lien={lien.lien} />
          <p className="adm-field__aide">
            À transmettre à la personne par le moyen de votre choix (e-mail, messagerie). Il ne
            sert qu&apos;une fois et expire dans 72&nbsp;heures.{" "}
            <strong>Il ne sera plus affiché</strong> une fois cette page quittée&nbsp;: la base
            n&apos;en garde qu&apos;une empreinte illisible. En cas de perte, générez-en
            simplement un nouveau depuis le tableau.
          </p>
        </section>
      )}

      {!actif ? (
        /* ════ MODE MOT DE PASSE PARTAGÉ ════
           Pas de tableau vide, pas de compte factice : il n'y a
           réellement personne à gérer, et la seule chose utile est de
           dire quoi configurer pour qu'il y ait des comptes. */
        <>
          <section className="adm-card">
            <h2>Il n&apos;y a rien à gérer ici, pour l&apos;instant</h2>
            <p>
              Ce back-office fonctionne aujourd&apos;hui avec un{" "}
              <strong>mot de passe partagé</strong> (la variable <code>ADMIN_PASSWORD</code>). Un
              mot de passe partagé ne distingue personne&nbsp;: tout le monde entre avec le même
              identifiant, tout le monde a tous les droits, et le journal des modifications ne
              peut nommer aucun auteur. Il n&apos;y a donc aucun compte à lister, à inviter ni à
              révoquer — et un tableau vide laisserait croire le contraire.
            </p>
            <p>
              Conséquences concrètes tant que ce mode est actif&nbsp;: pas de rôles (la
              distinction éditeur / admin n&apos;a aucune prise), pas de révocation individuelle
              (on change le mot de passe, pour tout le monde à la fois), et aucune traçabilité de
              qui a modifié quoi.
            </p>
          </section>

          <section className="adm-card">
            <h2>Activer les comptes nommés</h2>
            <p>Les comptes nommés s&apos;activent d&apos;eux-mêmes dès que la base est en place&nbsp;:</p>

            <ol
              style={{
                paddingLeft: "1.2rem",
                fontSize: "var(--fs-small)",
                lineHeight: 1.7,
              }}
            >
              <li>
                Lier l&apos;add-on PostgreSQL à l&apos;application (Clever Cloud fournit alors{" "}
                <code>POSTGRESQL_ADDON_URI</code>), ou renseigner <code>DATABASE_URL</code>, puis
                redéployer.
              </li>
              <li>
                Exécuter <code>db/schema.sql</code> sur la base&nbsp;: il crée la table{" "}
                <code>admins</code>, celle qui porte les comptes et les rôles.
              </li>
              <li>
                Créer le premier administrateur. C&apos;est la seule étape qui ne peut pas se
                faire depuis cet écran, puisqu&apos;il faut déjà être administrateur pour
                l&apos;ouvrir&nbsp;:
              </li>
            </ol>

            <pre
              style={{
                overflowX: "auto",
                fontSize: "var(--fs-label)",
                lineHeight: 1.6,
                padding: ".9rem 1rem",
                background: "var(--craie)",
                border: "1px solid var(--pierre)",
              }}
            >
              <code>{`node scripts/premier-admin.mjs vous@exemple.fr`}</code>
            </pre>

            <p className="adm-field__aide">
              Le script affiche un lien d&apos;accès&nbsp;: ouvrez-le pour choisir votre mot de
              passe. L&apos;écran de connexion demande alors une adresse e-mail en plus du mot de
              passe, et cette page devient la vôtre&nbsp;: invitations, rôles, révocations.
            </p>
          </section>

          <LesDeuxRoles />
        </>
      ) : (
        <>
          {panne && (
            <p className="adm-note adm-note--alerte">
              <strong>La liste des comptes n&apos;a pas pu être lue.</strong> Ce n&apos;est pas
              une liste vide&nbsp;: la base n&apos;a pas répondu. Vérifiez que{" "}
              <code>db/schema.sql</code> a bien été exécuté (table <code>admins</code>) et que
              l&apos;adresse de la base est toujours valide.{" "}
              <span className="u-muted">Détail&nbsp;: {detail(panne)}</span>
            </p>
          )}

          <div className="adm-grid">
            <div className="adm-stat">
              <span className="adm-stat__n">{total}</span>
              <span className="adm-stat__l">
                {total > 1 ? "comptes autorisés" : "compte autorisé"}
              </span>
            </div>
            <div className="adm-stat">
              <span className="adm-stat__n">{admins}</span>
              <span className="adm-stat__l">
                {admins > 1 ? "administrateurs" : "administrateur"}
              </span>
            </div>
            <div className="adm-stat">
              <span className="adm-stat__n">{total - admins}</span>
              <span className="adm-stat__l">
                {total - admins > 1 ? "éditeurs" : "éditeur"}
              </span>
            </div>
          </div>

          <section className="adm-card">
            <h2>Comptes</h2>

            {total === 0 && !panne ? (
              <div className="adm-empty">
                <strong>Aucun compte.</strong>
                <p>
                  La connexion par e-mail est active, mais personne n&apos;y a encore droit. Le
                  premier administrateur se crée avec <code>scripts/premier-admin.mjs</code>.
                </p>
              </div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th scope="col">Adresse e-mail</th>
                      <th scope="col">Rôle</th>
                      <th scope="col">Ajouté le</th>
                      <th scope="col">Changer de rôle</th>
                      <th scope="col">Lien d&apos;accès</th>
                      <th scope="col">Accès</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comptes.map((c) => {
                      const estMoi = !!mailCourant && c.email === mailCourant;
                      const dernierAdmin = c.role === "admin" && admins <= 1;
                      /* L'interface ne propose pas ce que le serveur
                         refusera de toute façon — mais c'est bien le
                         serveur qui refuse (voir les trois verrous). */
                      const verrouille = estMoi || dernierAdmin;
                      return (
                        <tr key={c.id}>
                          <td style={{ overflowWrap: "anywhere" }}>
                            {c.email}
                            {estMoi && (
                              <>
                                {" "}
                                <span className="adm-badge adm-badge--on">vous</span>
                              </>
                            )}
                            {!c.actif && (
                              <>
                                {" "}
                                <span className="adm-badge adm-badge--off">
                                  {c.lienExpire ? "invitation en attente" : "invitation expirée"}
                                </span>
                              </>
                            )}
                          </td>
                          <td>
                            <span
                              className={`adm-badge adm-badge--${
                                c.role === "admin" ? "on" : "off"
                              }`}
                            >
                              {LIB_ROLE[c.role]}
                            </span>
                          </td>
                          <td className="u-muted">{fmtDate(c.creeLe)}</td>

                          <td>
                            {verrouille ? (
                              <span className="u-muted">
                                {estMoi ? "Votre compte" : "Dernier administrateur"}
                              </span>
                            ) : (
                              <form
                                action={changerRole}
                                style={{
                                  display: "flex",
                                  gap: ".5rem",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                }}
                              >
                                <input type="hidden" name="user_id" value={c.id} />
                                <div className="adm-field" style={{ flex: "0 1 8.5rem" }}>
                                  <select
                                    name="role"
                                    defaultValue={c.role}
                                    aria-label={`Rôle de ${c.email}`}
                                  >
                                    <option value="editeur">éditeur</option>
                                    <option value="admin">admin</option>
                                  </select>
                                </div>
                                <button className="c-btn" type="submit">
                                  Appliquer
                                </button>
                              </form>
                            )}
                          </td>

                          <td>
                            {/* Pas de verrou ici : se générer un lien à
                                soi-même est le moyen de changer son propre
                                mot de passe, et cela ne retire aucun droit. */}
                            <form action={genererLien}>
                              <input type="hidden" name="user_id" value={c.id} />
                              <button
                                className="c-btn"
                                type="submit"
                                aria-label={`Nouveau lien d'accès pour ${c.email}`}
                              >
                                Nouveau lien
                              </button>
                            </form>
                          </td>

                          <td>
                            {verrouille ? (
                              <span className="u-muted">—</span>
                            ) : (
                              <form action={revoquer}>
                                <input type="hidden" name="user_id" value={c.id} />
                                <button className="c-btn c-btn--danger" type="submit">
                                  Retirer l&apos;accès
                                </button>
                              </form>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="adm-field__aide">
              Votre compte est signalé «&nbsp;vous&nbsp;»&nbsp;: ni révocation ni rétrogradation
              possible sur soi-même, et le dernier administrateur reste intouchable. Ces deux
              verrous n&apos;existent que pour une raison — ne jamais se retrouver enfermé dehors
              de son propre back-office.
            </p>
          </section>

          <section className="adm-card">
            <h2>Inviter une personne</h2>

            <form action={inviter}>
              <div className="adm-grid">
                <div className="adm-field">
                  <label htmlFor="email">Adresse e-mail</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="off"
                    placeholder="prenom.nom@exemple.fr"
                    aria-describedby="email-aide"
                  />
                  <small id="email-aide" className="adm-field__aide">
                    Ce sera son identifiant de connexion. Aucun e-mail n&apos;est envoyé par le
                    site&nbsp;: vous recevez un lien à lui transmettre.
                  </small>
                </div>

                <div className="adm-field">
                  <label htmlFor="role-invite">Rôle</label>
                  <select id="role-invite" name="role" defaultValue="editeur">
                    <option value="editeur">
                      éditeur — contenu, blog, SEO, annonces, médias
                    </option>
                    <option value="admin">admin — tout, plus tracking et comptes</option>
                  </select>
                  <small className="adm-field__aide">
                    Modifiable à tout moment depuis le tableau ci-dessus.
                  </small>
                </div>
              </div>

              <div className="adm-actions">
                <button className="c-btn c-btn--solid" type="submit">
                  Créer le compte
                </button>
              </div>
            </form>

            <p className="adm-note">
              <strong>Ce que reçoit la personne invitée&nbsp;:</strong> rien, tant que vous ne lui
              avez pas transmis le lien. Elle l&apos;ouvre, choisit son mot de passe, et entre
              directement dans le back-office. Le même bouton «&nbsp;Nouveau lien&nbsp;» sert
              quand quelqu&apos;un a oublié son mot de passe.
            </p>
          </section>

          <LesDeuxRoles />

          <section className="adm-card">
            <h2>Deux points à connaître</h2>
            <p>
              <strong>Retirer l&apos;accès ne supprime pas le compte.</strong> La personne sort de
              la liste&nbsp;: elle ne peut plus rien ouvrir dans le back-office, et son mot de
              passe est effacé. Son identité, elle, reste dans la base — ce qui préserve
              l&apos;historique des modifications, où son nom reste attaché à ce qu&apos;elle a
              écrit. La réinviter plus tard rouvre le même compte.
            </p>
            <p>
              <strong>Une révocation n&apos;est pas instantanée.</strong> La session est un jeton
              signé, valable 8&nbsp;heures, que le serveur vérifie sans interroger la base à
              chaque page — c&apos;est ce qui rend le back-office rapide, et utilisable même
              pendant un incident de base. Conséquence&nbsp;: une personne déjà connectée
              conserve ses droits jusqu&apos;à l&apos;expiration de son jeton, 8&nbsp;heures au
              plus. Pour couper immédiatement, changez la variable{" "}
              <code>ADMIN_SESSION_SECRET</code> sur l&apos;hébergement&nbsp;: toutes les sessions
              tombent d&apos;un coup, la vôtre comprise.
            </p>
          </section>
        </>
      )}
    </>
  );
}
