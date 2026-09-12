import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authDriver, currentAdmin, type RoleAdmin } from "@/lib/admin/auth";
import { cleAnonManquante } from "@/lib/admin/supabase-auth";
import { clientSupabase } from "@/lib/store/supabase";
import { assertRole, requireRole } from "../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — UTILISATEURS

   L'écran qui DISTRIBUE les droits. Il est donc, par construction, le
   seul que ceux qui les reçoivent ne doivent pas pouvoir ouvrir :
   `requireRole("admin")` sur la page, `assertRole("admin")` en première
   ligne de CHACUNE des trois actions — une Server Action est une route
   POST publique, l'écran qui l'affiche ne la protège pas.

   CE QUE CET ÉCRAN GÈRE, ET CE QU'IL NE GÈRE PAS
   Supabase Auth détient les identifiants (mot de passe, réinitialisation,
   second facteur). La table `admins` détient le DROIT : être authentifié
   n'est pas être administrateur du site (voir supabase/schema.sql). Cet
   écran travaille donc sur `admins` — il accorde et retire l'accès au
   back-office — et n'invite dans Supabase Auth que pour créer le compte
   qui manque. Retirer l'accès ne supprime pas le compte Supabase : on ne
   détruit pas une identité pour fermer une porte.

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
   vérifié hors ligne (voir `src/lib/admin/auth.ts`) : un compte retiré
   d'`admins` garde ses droits jusqu'à l'expiration de son cookie, 8 h au
   plus. Pour couper à la seconde, faire tourner ADMIN_SESSION_SECRET —
   toutes les sessions tombent, la vôtre comprise. L'écran le dit.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Utilisateurs",
  robots: { index: false, follow: false },
};

const ROUTE = "/admin/utilisateurs";

/** Comptes nommés actifs ? Sinon, il n'y a qu'un mot de passe partagé. */
const comptesNommes = (): boolean => authDriver() === "supabase";

/* Volontairement permissif : la validation qui fait foi est celle de
   Supabase Auth. On n'écarte ici que les saisies qui ne sont
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
   LECTURE DES COMPTES
   ────────────────────────────────────────────────────────────────── */

type Compte = {
  /** `auth.users.id` — la clé durable, l'e-mail peut changer. */
  userId: string;
  email: string;
  role: RoleAdmin;
  creeLe: string;
};

type Lecture = { comptes: Compte[]; panne: string | null };

/**
 * La table `admins`, lue avec la clé de service : son RLS n'accorde rien
 * aux rôles `anon` et `authenticated`, sans cette clé la requête
 * reviendrait vide — ce qui se lirait à l'écran comme « aucun compte »,
 * c'est-à-dire le pire message possible.
 *
 * Une panne n'est jamais silencieuse : elle remonte, et l'écran affiche
 * « impossible de lire » plutôt qu'une liste vide.
 */
async function lireComptes(): Promise<Lecture> {
  if (!comptesNommes()) return { comptes: [], panne: null };

  try {
    const { data, error } = await clientSupabase()
      .from("admins")
      .select("user_id,email,role,created_at")
      .order("created_at", { ascending: true });

    if (error) return { comptes: [], panne: error.message };

    const lignes = (data ?? []) as {
      user_id?: unknown;
      email?: unknown;
      role?: unknown;
      created_at?: unknown;
    }[];

    const comptes = lignes
      .filter((l) => typeof l.user_id === "string" && typeof l.email === "string")
      .map((l) => ({
        userId: String(l.user_id),
        email: String(l.email).trim().toLowerCase(),
        /* Tout rôle inattendu redescend à `editeur` : même règle de
           moindre privilège que `lireAdmin()` — un `role` mal saisi en
           base ne doit pas se lire ici comme un administrateur. */
        role: (l.role === "admin" ? "admin" : "editeur") as RoleAdmin,
        creeLe: typeof l.created_at === "string" ? l.created_at : "",
      }));

    return { comptes, panne: null };
  } catch (e) {
    return { comptes: [], panne: messageErreur(e) };
  }
}

const nbAdmins = (comptes: Compte[]): number =>
  comptes.filter((c) => c.role === "admin").length;

/* ──────────────────────────────────────────────────────────────────
   INVITATION
   ────────────────────────────────────────────────────────────────── */

/**
 * Retrouve un compte Supabase Auth par son adresse. Nécessaire parce
 * qu'une invitation envoyée à quelqu'un qui a DÉJÀ un compte échoue :
 * l'adresse est prise. Ce n'est pas une erreur de l'utilisateur — c'est
 * le cas « cette personne existe déjà, donnez-lui seulement l'accès ».
 *
 * Pagination bornée : l'API ne sait pas filtrer par e-mail, on parcourt.
 * Dix pages de 200 suffisent très largement pour les comptes
 * d'administration d'un site vitrine ; au-delà, on abandonne plutôt que
 * de faire tourner la requête indéfiniment.
 */
async function idDeLUtilisateur(mail: string): Promise<string | null> {
  const db = clientSupabase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const trouve = data.users.find((u) => (u.email ?? "").toLowerCase() === mail);
    if (trouve) return trouve.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

type Invitation = { id: string; deja: boolean } | { erreur: string };

/** Invite, ou rattache un compte existant. Ne touche pas à `admins`. */
async function inviterOuRetrouver(mail: string): Promise<Invitation> {
  try {
    const { data, error } = await clientSupabase().auth.admin.inviteUserByEmail(mail);

    if (!error && data.user?.id) return { id: data.user.id, deja: false };

    /* GoTrue ne normalise pas ses messages d'une version à l'autre : on
       ne tente pas de reconnaître « adresse déjà prise » au texte. On
       cherche le compte — c'est la recherche qui tranche vraiment. */
    const id = await idDeLUtilisateur(mail);
    if (id) return { id, deja: true };

    return { erreur: error?.message ?? "invitation refusée par Supabase" };
  } catch (e) {
    return { erreur: messageErreur(e) };
  }
}

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

  const { comptes, panne } = await lireComptes();
  if (panne) fin({ err: "base", detail: detail(panne) });
  if (comptes.some((c) => c.email === mail)) fin({ err: "existe" });

  const resultat = await inviterOuRetrouver(mail);
  if ("erreur" in resultat) {
    console.error("[admin/utilisateurs] invitation impossible :", resultat.erreur);
    fin({ err: "invitation", detail: detail(resultat.erreur) });
  }

  const echec = await (async (): Promise<string | null> => {
    try {
      const { error } = await clientSupabase()
        .from("admins")
        .insert({ user_id: resultat.id, email: mail, role });
      return error ? error.message : null;
    } catch (e) {
      return messageErreur(e);
    }
  })();

  if (echec) {
    console.error("[admin/utilisateurs] écriture de `admins` impossible :", echec);
    fin({ err: "base", detail: detail(echec) });
  }

  fin({ ok: resultat.deja ? "rattache" : "invite" });
}

async function changerRole(formData: FormData) {
  "use server";
  await assertRole("admin");
  if (!comptesNommes()) fin({ err: "indisponible" });

  const userId = String(formData.get("user_id") ?? "").trim();
  const role = lireRole(formData.get("role"));

  const [moi, { comptes, panne }] = await Promise.all([currentAdmin(), lireComptes()]);
  if (panne) fin({ err: "base", detail: detail(panne) });

  const cible = comptes.find((c) => c.userId === userId);
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

  const echec = await (async (): Promise<string | null> => {
    try {
      const { error } = await clientSupabase()
        .from("admins")
        .update({ role })
        .eq("user_id", userId);
      return error ? error.message : null;
    } catch (e) {
      return messageErreur(e);
    }
  })();

  if (echec) {
    console.error("[admin/utilisateurs] changement de rôle impossible :", echec);
    fin({ err: "base", detail: detail(echec) });
  }

  fin({ ok: "role" });
}

async function revoquer(formData: FormData) {
  "use server";
  await assertRole("admin");
  if (!comptesNommes()) fin({ err: "indisponible" });

  const userId = String(formData.get("user_id") ?? "").trim();

  const [moi, { comptes, panne }] = await Promise.all([currentAdmin(), lireComptes()]);
  if (panne) fin({ err: "base", detail: detail(panne) });

  const cible = comptes.find((c) => c.userId === userId);
  if (!cible) fin({ err: "introuvable" });

  /* Verrou 1 : on ne se révoque pas soi-même. */
  const mailCourant = (moi?.email ?? "").trim().toLowerCase();
  if (mailCourant && cible.email === mailCourant) fin({ err: "soi" });

  /* Verrou 3, versant révocation. */
  if (cible.role === "admin" && nbAdmins(comptes) <= 1) fin({ err: "dernier" });

  const echec = await (async (): Promise<string | null> => {
    try {
      /* On retire le DROIT, pas l'identité : la ligne d'`admins`
         disparaît, le compte Supabase Auth reste. Le supprimer viderait
         aussi les `updated_by` du journal des versions — l'historique
         perdrait son auteur pour une simple fin de mission. */
      const { error } = await clientSupabase()
        .from("admins")
        .delete()
        .eq("user_id", userId);
      return error ? error.message : null;
    } catch (e) {
      return messageErreur(e);
    }
  })();

  if (echec) {
    console.error("[admin/utilisateurs] révocation impossible :", echec);
    fin({ err: "base", detail: detail(echec) });
  }

  fin({ ok: "revoque" });
}

/* ──────────────────────────────────────────────────────────────────
   ÉCRAN
   ────────────────────────────────────────────────────────────────── */

const OK: Record<string, string> = {
  invite:
    "Invitation envoyée. La personne apparaît dans la liste : elle entrera dès qu'elle aura défini son mot de passe.",
  rattache:
    "Ce compte existait déjà dans Supabase Auth : aucune invitation n'a été renvoyée, l'accès au back-office lui a simplement été accordé.",
  role: "Rôle modifié. Il s'appliquera à la prochaine connexion de la personne, ou dans 8 h au plus tard.",
  revoque:
    "Accès retiré. Le compte Supabase Auth existe toujours : l'identité est conservée, seul le droit est repris.",
  rien: "Ce rôle était déjà celui du compte : rien n'a été modifié.",
};

const ERR: Record<string, string> = {
  email: "Cette adresse e-mail n'est pas valide. Rien n'a été envoyé.",
  existe:
    "Cette adresse a déjà accès au back-office. Changez son rôle plutôt que de l'inviter à nouveau.",
  introuvable:
    "Ce compte n'est plus dans la liste. L'écran a sans doute été rouvert après une révocation.",
  soi: "Vous ne pouvez ni vous révoquer, ni vous rétrograder vous-même — c'est la façon la plus courante de se verrouiller dehors. Demandez-le à un autre administrateur.",
  dernier:
    "C'est le dernier compte administrateur. Le retirer laisserait un back-office que plus personne ne peut administrer : nommez d'abord un autre administrateur.",
  indisponible:
    "Les comptes nommés ne sont pas actifs sur cette installation : il n'y a rien à gérer.",
  invitation:
    "L'invitation n'a pas pu être envoyée par Supabase. Vérifiez le service d'envoi d'e-mails du projet (Authentication → Emails) : sans SMTP propre, les envois sont très fortement limités.",
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

  const [sp, moi, { comptes, panne }] = await Promise.all([
    searchParams,
    currentAdmin(),
    lireComptes(),
  ]);

  const actif = comptesNommes();
  const ok = OK[premier(sp.ok)];
  const err = ERR[premier(sp.err)];
  const precision = premier(sp.detail).slice(0, 200);
  const mailCourant = (moi?.email ?? "").trim().toLowerCase();
  const total = comptes.length;
  const admins = nbAdmins(comptes);

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
          Qui peut entrer dans le back-office, et jusqu&apos;où. Les identifiants sont gérés par
          Supabase&nbsp;; ce qui se règle ici, c&apos;est le droit.
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

            {cleAnonManquante() ? (
              <p className="adm-note adm-note--alerte">
                <strong>Vous y êtes presque.</strong> La base Supabase est configurée, mais la
                connexion par e-mail réclame la clé anonyme du projet —{" "}
                <code>SUPABASE_ANON_KEY</code> (Supabase&nbsp;: Settings → API Keys → clé{" "}
                <strong>publishable</strong>, <code>sb_publishable_…</code> — sur les projets
                antérieurs à 2025 elle s&apos;appelait <code>anon</code>, d&apos;où le nom de
                notre variable). Tant qu&apos;elle manque, l&apos;authentification retombe
                silencieusement sur le mot de passe partagé. Cette clé est publique par
                nature&nbsp;; c&apos;est la clé de service, elle, qui ne doit jamais sortir du
                serveur.
              </p>
            ) : (
              <p>
                Trois variables d&apos;environnement à renseigner sur l&apos;hébergement, puis un
                redéploiement&nbsp;:
              </p>
            )}

            <ol
              style={{
                paddingLeft: "1.2rem",
                fontSize: "var(--fs-small)",
                lineHeight: 1.7,
              }}
            >
              <li>
                <code>SUPABASE_URL</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code> et{" "}
                <code>SUPABASE_ANON_KEY</code> — les trois&nbsp;: une configuration à moitié faite
                est traitée comme absente, et le mot de passe partagé reprend la main.
              </li>
              <li>
                Exécuter <code>supabase/schema.sql</code> dans l&apos;éditeur SQL du
                projet&nbsp;: il crée la table <code>admins</code>, celle qui porte les rôles.
              </li>
              <li>
                Créer la première personne dans Supabase (Authentication → Users → Add user),
                puis lui donner le rôle <code>admin</code>. C&apos;est la seule étape qui ne peut
                pas se faire depuis cet écran, puisqu&apos;il faut déjà être administrateur pour
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
              <code>{`insert into public.admins (user_id, email, role)
select id, email, 'admin' from auth.users
where email = 'vous@exemple.fr';`}</code>
            </pre>

            <p className="adm-field__aide">
              Une fois ces étapes faites, l&apos;écran de connexion demande une adresse e-mail en
              plus du mot de passe, et cette page devient la vôtre&nbsp;: invitations, rôles,
              révocations.
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
              <code>supabase/schema.sql</code> a bien été exécuté (table <code>admins</code>) et
              que la clé de service est toujours valide.{" "}
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
                <strong>Aucun compte dans la table des administrateurs.</strong>
                <p>
                  La connexion par e-mail est active, mais personne n&apos;y a encore droit. Le
                  premier compte se crée dans Supabase (Authentication → Users), puis
                  s&apos;ajoute à la table <code>admins</code> avec le rôle <code>admin</code>.
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
                        <tr key={c.userId}>
                          <td style={{ overflowWrap: "anywhere" }}>
                            {c.email}
                            {estMoi && (
                              <>
                                {" "}
                                <span className="adm-badge adm-badge--on">vous</span>
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
                                <input type="hidden" name="user_id" value={c.userId} />
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
                            {verrouille ? (
                              <span className="u-muted">—</span>
                            ) : (
                              <form action={revoquer}>
                                <input type="hidden" name="user_id" value={c.userId} />
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
                    L&apos;adresse à laquelle Supabase enverra l&apos;invitation. Si cette
                    personne a déjà un compte, aucune invitation n&apos;est renvoyée&nbsp;: on lui
                    accorde simplement l&apos;accès.
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
                  Envoyer l&apos;invitation
                </button>
              </div>
            </form>

            <p className="adm-note">
              <strong>Ce que reçoit la personne invitée.</strong> Un e-mail envoyé par Supabase,
              contenant un lien qui la renvoie vers l&apos;adresse configurée dans le projet
              (Authentication → URL Configuration). Ce site n&apos;embarque pas d&apos;écran
              «&nbsp;je choisis mon mot de passe&nbsp;»&nbsp;: si le lien ne mène nulle part
              d&apos;utile, définissez le mot de passe directement dans Supabase (Authentication →
              Users), transmettez-le de vive voix, et demandez qu&apos;il soit changé.
            </p>
            <p className="adm-note">
              <strong>Les envois d&apos;e-mails sont limités par défaut.</strong> Tant
              qu&apos;aucun SMTP n&apos;est déclaré dans le projet Supabase, le service
              d&apos;envoi intégré n&apos;autorise que quelques messages par heure&nbsp;: une
              invitation peut donc échouer sans que rien ne soit en cause de votre côté.
            </p>
          </section>

          <LesDeuxRoles />

          <section className="adm-card">
            <h2>Deux points à connaître</h2>
            <p>
              <strong>Retirer l&apos;accès ne supprime pas le compte.</strong> La personne sort de
              la liste des administrateurs&nbsp;: elle ne peut plus rien ouvrir dans le
              back-office. Son compte Supabase, lui, subsiste — ce qui préserve l&apos;historique
              des modifications, où son nom reste attaché à ce qu&apos;elle a écrit. Pour
              supprimer l&apos;identité elle-même, il faut passer par Supabase (Authentication →
              Users).
            </p>
            <p>
              <strong>Une révocation n&apos;est pas instantanée.</strong> La session est un jeton
              signé, valable 8&nbsp;heures, que le serveur vérifie sans interroger la base à
              chaque page — c&apos;est ce qui rend le back-office rapide, et utilisable même
              pendant un incident Supabase. Conséquence&nbsp;: une personne déjà connectée
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
