import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  isSupabaseConfigured,
  signInAdmin,
  type RoleAdmin,
} from "./supabase-auth";

/* ════════════════════════════════════════════════════════════════
   AUTHENTIFICATION DU BACK-OFFICE — SÉLECTEUR

   Ce fichier ne décide plus QUI est administrateur : il choisit QUI en
   décide, et fabrique la session dans les deux cas.

     · Supabase configuré  → comptes nommés (e-mail + mot de passe),
       rôle lu dans la table `admins`. Voir ./supabase-auth.ts.
     · Sinon               → mot de passe partagé, le mode de recette.

   POURQUOI UN SÉLECTEUR PLUTÔT QU'UN REMPLACEMENT : le mot de passe
   partagé reste le seul mode qui fonctionne sans base — en local, en
   preview, et le jour où Supabase est en panne pendant une démo. Le
   supprimer rendrait le back-office indémontrable hors production.

   L'API PUBLIQUE NE BOUGE PAS : `isAdminEnabled()`, `isAuthenticated()`,
   `createSession()`, `setSessionCookie()`, `clearSessionCookie()`. Aucun
   écran n'a à savoir quel pilote tourne. S'y ajoutent `currentAdmin()`
   (qui agit) et `authDriver()` (pour l'afficher).

   CE QUI RESTE À FAIRE, même avec Supabase :
     · limitation des tentatives par IP (ici : un simple délai, voir
       `src/app/admin/actions.ts`) ;
     · révocation immédiate d'une session en cours — voir `sessionCourante()`.
   ════════════════════════════════════════════════════════════════ */

const COOKIE = "essensya_admin";
/** 8 h : une journée de travail, pas plus. */
const MAX_AGE = 60 * 60 * 8;

const PASSWORD = process.env.ADMIN_PASSWORD ?? "";
/* Sans secret dédié, on dérive du mot de passe (mode partagé) ou de la
   clé de service (mode Supabase) : la session reste signée, et faire
   tourner l'un ou l'autre invalide TOUTES les sessions en cours — c'est
   le levier d'urgence à connaître pour éjecter quelqu'un immédiatement. */
const SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  PASSWORD ||
  "dev-only";

export type { RoleAdmin };

/** Ce que porte le cookie de session, et rien de plus. */
type Session = {
  /** Échéance en millisecondes epoch. */
  exp: number;
  /** Vide en mode mot de passe partagé : c'est précisément l'information
   *  qui manque et que les comptes nommés apportent. */
  email: string;
  role: RoleAdmin;
};

/** Quel pilote d'authentification est actif, pour l'affichage. */
export const authDriver = (): "supabase" | "mot-de-passe" =>
  isSupabaseConfigured() ? "supabase" : "mot-de-passe";

/**
 * Le back-office n'existe que s'il a de quoi authentifier quelqu'un :
 * une base Supabase, ou un mot de passe partagé d'au moins 8 caractères.
 * Sans rien, `/admin/login` affiche un écran de configuration.
 */
export const isAdminEnabled = (): boolean =>
  isSupabaseConfigured() || PASSWORD.length >= 8;

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  /* timingSafeEqual exige des longueurs égales : on compare d'abord les
     longueurs, ce qui ne révèle rien d'exploitable. */
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/* ════ FORMAT DU JETON ════
   `<charge utile base64url>.<signature>`. La charge utile est un JSON
   lisible (échéance, e-mail, rôle) : elle n'est pas chiffrée, seulement
   signée — elle ne contient donc rien de secret, et toute retouche
   invalide la signature.

   ⚠ Le format d'avant (`<échéance>.<signature>`) n'est plus accepté :
   les sessions ouvertes à la mise à jour demandent une reconnexion. Une
   fois. Accepter les deux formats pour éviter cela reviendrait à garder
   un chemin de vérification sans rôle — donc un trou. */

function encoder(s: Session): string {
  const charge = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${charge}.${sign(charge)}`;
}

function decoder(token: string | undefined): Session | null {
  if (!token) return null;
  const sep = token.lastIndexOf(".");
  if (sep <= 0) return null;

  const charge = token.slice(0, sep);
  const signature = token.slice(sep + 1);
  /* Signature d'abord : on ne désérialise jamais une charge non vérifiée. */
  if (!safeEqual(signature, sign(charge))) return null;

  try {
    const brut = JSON.parse(
      Buffer.from(charge, "base64url").toString("utf8"),
    ) as Record<string, unknown>;

    if (typeof brut.exp !== "number" || brut.exp <= Date.now()) return null;

    return {
      exp: brut.exp,
      email: typeof brut.email === "string" ? brut.email : "",
      role: brut.role === "admin" ? "admin" : "editeur",
    };
  } catch {
    return null;
  }
}

/**
 * Ouvre une session si les identifiants sont valides, `null` sinon —
 * sans jamais dire pourquoi.
 *
 * Le mot de passe reste le PREMIER paramètre : la signature d'origine
 * continue de fonctionner telle quelle en mode partagé, et l'e-mail
 * n'est lu que par le pilote Supabase. La fonction devient asynchrone,
 * parce qu'authentifier contre une base l'est forcément.
 */
export async function createSession(
  motDePasse: string,
  email?: string,
): Promise<string | null> {
  const exp = Date.now() + MAX_AGE * 1000;

  if (authDriver() === "supabase") {
    const admin = await signInAdmin(email ?? "", motDePasse);
    if (!admin) return null;
    return encoder({ exp, email: admin.email, role: admin.role });
  }

  if (!isAdminEnabled() || !safeEqual(motDePasse, PASSWORD)) return null;
  /* Un mot de passe partagé ne distingue personne : il donne tout, y
     compris les écrans sensibles. Rétrograder ce mode à `editeur`
     fermerait le tracking à une installation qui fonctionne aujourd'hui. */
  return encoder({ exp, email: "", role: "admin" });
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/**
 * Session courante, vérifiée hors ligne (signature + échéance).
 *
 * ⚠ AUCUN APPEL À SUPABASE ICI, et c'est un arbitrage assumé : une
 * requête réseau à chaque rendu de page d'admin ajouterait une latence
 * et un point de panne (base indisponible = back-office inaccessible)
 * pour un gain de fraîcheur de quelques heures. Conséquence à connaître :
 * un compte retiré de `admins` ou rétrogradé garde ses droits jusqu'à
 * l'expiration de son cookie (8 h au plus). Pour couper immédiatement :
 * faire tourner ADMIN_SESSION_SECRET — toutes les sessions tombent.
 */
async function sessionCourante(): Promise<Session | null> {
  const jar = await cookies();
  return decoder(jar.get(COOKIE)?.value);
}

/** `true` si la requête courante est authentifiée. */
export async function isAuthenticated(): Promise<boolean> {
  return (await sessionCourante()) !== null;
}

/**
 * Qui agit, et avec quel rôle. `null` si la requête n'est pas
 * authentifiée. En mode mot de passe partagé, `email` est vide : c'est
 * la traçabilité qui manque, pas la fonction.
 */
export async function currentAdmin(): Promise<{
  email: string;
  role: RoleAdmin;
} | null> {
  const s = await sessionCourante();
  return s ? { email: s.email, role: s.role } : null;
}
