"use server";

import {
  DELAI_ECHEC_MS,
  attendre,
  ipClient,
  noterEchec,
  reinitialiserEchecs,
  tropDeTentatives,
} from "@/lib/admin/tentatives";
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


/**
/* La connexion NE PASSE PLUS par une Server Action : elle vit dans
   src/app/api/admin/login/route.ts, en POST classique répondant 303.
   Motif — les gestionnaires de mots de passe ne proposent d'enregistrer
   qu'après une navigation de DOCUMENT, qu'une Server Action ne produit
   pas. Le compteur de tentatives, lui, est partagé par les deux chemins
   via @/lib/admin/tentatives. */

/** Déconnexion. Efface le cookie de session et renvoie à l'écran de login.
 *
 *  Reste une Server Action, contrairement à la connexion : aucun
 *  gestionnaire de mots de passe n'a besoin d'observer une déconnexion,
 *  et le bouton vit dans la navigation de toutes les pages d'admin. */
export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/admin/login");
}
