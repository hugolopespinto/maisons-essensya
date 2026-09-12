"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearSessionCookie,
  createSession,
  currentAdmin,
  isAdminEnabled,
  isAuthenticated,
  setSessionCookie,
  type RoleAdmin,
} from "@/lib/admin/auth";

/* ════════════════════════════════════════════════════════════════
   SERVER ACTIONS PARTAGÉES DU BACK-OFFICE

   ⚠ LE PIÈGE CLASSIQUE DE L'APP ROUTER, à lire avant d'écrire la
   moindre action d'écriture :

   Une Server Action n'est PAS une fonction privée appelée par un écran.
   À la compilation, `"use server"` remplace son corps, côté client, par
   une référence (un identifiant d'action) qui POSTe sur la route. Elle
   devient donc un point d'entrée HTTP public : n'importe qui sachant
   forger la requête l'atteint SANS jamais charger l'écran qui l'affiche.

   Conséquence : le fait que la page appelante soit protégée ne protège
   RIEN. Le garde doit être dans l'action elle-même. D'où `assertAdmin()`,
   que TOUTE action d'écriture du back-office — SEO, tracking, contenu,
   blog, enrichissement d'annonces — doit appeler en première ligne :

     export async function enregistrerSeo(fd: FormData) {
       "use server";
       await assertAdmin();              // ← non négociable
       …
       revalidatePath("/");              // ← sinon l'ISR sert l'ancienne page
     }

   Next.js ajoute par-dessus une vérification d'origine (CSRF) et une
   limite de taille de corps. Ce sont des protections de cadre, pas des
   autorisations applicatives : elles ne disent rien de QUI appelle.

   ⚠ CES QUATRE GARDES SONT LE SEUL POINT DE PASSAGE. Recopier
   `if (!(await isAuthenticated())) redirect(…)` dans un écran « marche »
   aussi, et c'est précisément le problème : le jour où la règle change
   — un rôle à vérifier, un journal à écrire — les copies ne suivent pas.
   C'est exactement ce qui est arrivé à /admin/seo et /admin/tracking,
   oubliés au moment de poser les gardes de rôle. Aucun écran ne redéfinit
   sa propre garde.
   ════════════════════════════════════════════════════════════════ */

/**
 * Garde des ACTIONS D'ÉCRITURE. Lève si la requête n'est pas
 * authentifiée — une action interrompue n'a rien écrit.
 *
 * Volontairement une exception et non une redirection : une action
 * appelée hors formulaire (bouton, transition) doit échouer bruyamment,
 * pas rediriger silencieusement une requête qui n'a jamais eu le droit
 * d'arriver là.
 */
export async function assertAdmin(): Promise<void> {
  if (!(await isAuthenticated())) {
    /* Message volontairement pauvre : il peut remonter jusqu'au client. */
    throw new Error("Accès refusé.");
  }
}

/**
 * Garde des ÉCRANS. À appeler en première ligne de chaque page
 * `/admin/**` (hors login) — ne jamais se reposer sur le fait que le
 * lien de navigation n'est pas affiché.
 *
 * Le layout du back-office ne protège pas : il se contente de choisir
 * entre la coquille complète et la coquille nue. C'est ce qui évite la
 * boucle de redirection que produirait un layout gardant sa propre
 * route de login (le layout s'applique AUSSI à /admin/login).
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAuthenticated())) redirect("/admin/login");
}

/* ════ RÔLES ════
   Deux rôles seulement (voir supabase/schema.sql) :
     · `editeur` — contenu, blog, SEO, annonces ;
     · `admin`   — tout cela, plus les écrans sensibles.

   Est sensible ce qui engage le site au-delà de son contenu : le
   TRACKING en premier lieu. Un identifiant GTM se substitue à tout le
   plan de marquage, charge des scripts tiers sur chaque page publique et
   touche au consentement — ce n'est pas de l'édition, c'est de
   l'exploitation.

   OÙ CES GARDES SONT RÉELLEMENT POSÉES, aujourd'hui :
     · /admin/tracking          — écran ET action (identifiants de mesure) ;
     · /admin/utilisateurs      — gestion des comptes : c'est le seul écran
       qui distribue les droits, il ne peut évidemment pas être ouvert à
       ceux qui les reçoivent.
   Le reste du back-office est de l'édition, donc ouvert aux deux rôles.

   En mode mot de passe partagé, tout le monde est `admin` : il n'y a
   qu'un identifiant, donc rien à distinguer. Ces gardes n'ont donc
   d'effet réel qu'avec Supabase — ce qui est exactement l'intérêt de
   passer aux comptes nommés. */

/**
 * Garde de RÔLE pour les actions d'écriture sensibles. À appeler à la
 * place de `assertAdmin()` — elle vérifie l'authentification ET le rôle :
 *
 *     export async function enregistrerTracking(fd: FormData) {
 *       "use server";
 *       await assertRole("admin");
 *       …
 *     }
 */
export async function assertRole(role: RoleAdmin): Promise<void> {
  const admin = await currentAdmin();
  /* Même message que `assertAdmin()` : ne pas apprendre à un éditeur
     qu'il est bien connecté mais insuffisamment gradé. */
  if (!admin) throw new Error("Accès refusé.");
  if (role === "admin" && admin.role !== "admin") {
    throw new Error("Accès refusé.");
  }
}

/**
 * Garde de RÔLE pour les ÉCRANS sensibles (page Tracking). Non
 * authentifié → login ; authentifié mais rôle insuffisant → tableau de
 * bord, pas une page d'erreur : la personne est légitimement dans le
 * back-office, elle n'a simplement rien à faire sur cet écran.
 */
export async function requireRole(role: RoleAdmin): Promise<void> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  if (role === "admin" && admin.role !== "admin") redirect("/admin");
}

/* ════════ LIMITATION DES TENTATIVES DE CONNEXION ════════

   Deux freins qui se complètent :
     1. un DÉLAI de ~400 ms après chaque échec — il ramène le débit à
        2,5 essais par seconde et par connexion, sans jamais gêner
        quelqu'un qui se trompe une fois ;
     2. un COMPTEUR par IP — au-delà de 8 échecs en 10 minutes, plus
        aucune tentative n'est évaluée, même juste. C'est ce qui manquait :
        un délai ne compte rien, donc n'arrête rien sur la durée.

   ⚠ MÉMOIRE DE PROCESSUS, exactement comme le quota de
   `src/app/api/leads/route.ts` : sur Netlify ou Vercel, chaque instance
   de function a la sienne et une instance froide repart de zéro. Ce
   compteur freine un script naïf, il n'arrête pas une attaque
   distribuée. C'est un garde-fou, pas une protection. Une vraie limite
   suppose un magasin partagé — Upstash Redis, Netlify Blobs, ou le
   rate-limiting du WAF devant le site.

   Seuls les ÉCHECS sont comptés, et une connexion réussie remet le
   compteur de l'IP à zéro : un bureau entier derrière une même IP
   publique ne doit pas se verrouiller parce que deux personnes ont mal
   tapé leur mot de passe. */
const FENETRE_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ECHECS = 8; // échecs tolérés par fenêtre et par IP
const MAX_CLES = 2_000; // plafond mémoire, purge au-delà

const echecs = new Map<string, number[]>();

/** IP du client, telle que la voit l'hébergeur. Mêmes en-têtes que l'API
 *  prospects — Netlify pose `x-nf-client-connection-ip`, les autres
 *  proxys `x-forwarded-for` (premier élément : le client d'origine). */
async function ipClient(): Promise<string> {
  const h = await headers();
  const transmise = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return transmise || h.get("x-nf-client-connection-ip") || "inconnue";
}

/** Vrai si cette IP a épuisé son quota d'échecs sur la fenêtre courante. */
function tropDeTentatives(ip: string): boolean {
  const maintenant = Date.now();
  const recents = (echecs.get(ip) ?? []).filter((t) => maintenant - t < FENETRE_MS);
  if (recents.length === 0) {
    echecs.delete(ip);
    return false;
  }
  echecs.set(ip, recents);
  return recents.length >= MAX_ECHECS;
}

function noterEchec(ip: string): void {
  const maintenant = Date.now();
  const recents = (echecs.get(ip) ?? []).filter((t) => maintenant - t < FENETRE_MS);
  recents.push(maintenant);
  echecs.set(ip, recents);

  /* Purge opportuniste : la Map ne doit pas grossir indéfiniment sur une
     instance longue durée. On ne garde que les IP encore dans la fenêtre. */
  if (echecs.size > MAX_CLES) {
    for (const [cle, dates] of echecs) {
      if (!dates.some((t) => maintenant - t < FENETRE_MS)) echecs.delete(cle);
    }
  }
}

const DELAI_ECHEC_MS = 400;
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Connexion. Revient TOUJOURS par une redirection, jamais par une valeur :
 * l'écran de login reste ainsi un composant serveur, et le formulaire
 * fonctionne même sans JavaScript.
 *
 * Le champ `email` n'est présent que si Supabase pilote
 * l'authentification ; en mode mot de passe partagé il est absent, et
 * `createSession()` l'ignore.
 */
export async function login(formData: FormData): Promise<void> {
  const motDePasse = String(formData.get("motdepasse") ?? "");
  const email = String(formData.get("email") ?? "");
  const ip = await ipClient();

  /* Quota épuisé : on ne vérifie même pas les identifiants. Un mot de
     passe juste envoyé pendant le blocage ne sert donc à rien — c'est le
     point du compteur. Même réponse que pour un mot de passe faux :
     annoncer le blocage renseignerait un attaquant sur l'efficacité de sa
     campagne, et sur l'existence du compte visé. */
  if (tropDeTentatives(ip)) {
    await attendre(DELAI_ECHEC_MS);
    redirect("/admin/login?e=1");
  }

  const token = isAdminEnabled()
    ? await createSession(motDePasse, email)
    : null;

  if (!token) {
    noterEchec(ip);
    await attendre(DELAI_ECHEC_MS);
    /* Un seul code d'erreur, jamais de détail : ne dire ni « mot de passe
       incorrect », ni « compte inconnu », ni « back-office non
       configuré », ni « trop de tentatives ». Toute distinction
       renseigne l'attaquant — sur l'état du serveur, et surtout sur
       l'existence d'un compte. */
    redirect("/admin/login?e=1");
  }

  /* Connexion réussie : l'IP repart d'une ardoise vierge. */
  echecs.delete(ip);

  await setSessionCookie(token);
  redirect("/admin");
}

/** Déconnexion. Efface le cookie de session et renvoie à l'écran de login. */
export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/admin/login");
}
