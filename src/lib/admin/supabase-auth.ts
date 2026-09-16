import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ════════════════════════════════════════════════════════════════
   COMPTES NOMMÉS — SUPABASE AUTH

   Ce module répond à la seule question qui compte au moment de la
   connexion : « cet e-mail et ce mot de passe désignent-ils un
   administrateur du site, et avec quel rôle ? »

   DEUX VÉRIFICATIONS, PAS UNE. Le schéma (supabase/schema.sql) est
   explicite : « être authentifié ne suffit pas à être administrateur ».
   Supabase Auth est partagé avec tout ce qui pourrait un jour créer des
   comptes (formulaire, magic link, OAuth) ; un compte valide prouve donc
   une identité, jamais un droit. Le droit vit dans la table `admins`,
   dont le RLS n'ouvre l'accès à personne d'autre qu'au serveur.
     1. `auth.signInWithPassword()` valide le couple e-mail / mot de passe ;
     2. `admins` (lue avec la clé de service) donne le rôle, ou rien —
        et « rien » vaut refus.

   ⚠ UN SEUL CLIENT SUPABASE DANS LE DÉPÔT. Ce module parlait à GoTrue et
   à PostgREST en `fetch` brut, au nom d'une contrainte — « aucune
   dépendance ajoutée » — qui ne tient plus : `@supabase/supabase-js` est
   déjà une dépendance de production, utilisée par le pilote de stockage
   (`src/lib/store/supabase.ts`). Maintenir deux styles d'accès à la même
   base coûtait plus cher que la bibliothèque. Le souci d'origine
   — ne pas faire entrer un client conçu pour le navigateur — est traité
   par la configuration : `persistSession: false`, pas de rafraîchissement
   automatique, pas de lecture d'URL. Aucun stockage, aucune session qui
   traîne entre deux requêtes.

   ⚠ `server-only` : garantie structurelle que SUPABASE_SERVICE_ROLE_KEY
   — qui contourne le RLS — ne peut pas être importée par un composant
   client, donc jamais atteindre le bundle navigateur.
   ════════════════════════════════════════════════════════════════ */

/* Pas de barre finale : la bibliothèque concatène derrière. */
/* Lus à la requête : voir le commentaire de auth.ts — une constante de
   module fige la valeur dans les artefacts de build. */
const base = (): string => (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const serviceKey = (): string => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/* ════ POURQUOI LA CLÉ ANONYME EST EXIGÉE, ET PLUS SEULEMENT SOUHAITÉE ════
   L'appel de connexion doit porter une clé `apikey`. La version
   précédente retombait sur la clé de service quand la clé anonyme était
   absente — ce qui annulait exactement la propriété annoncée : le chemin
   le plus exposé du back-office (un POST alimenté par une saisie
   anonyme) se retrouvait servi par la clé qui contourne tout le RLS.

   On ne replie donc plus : sans clé anonyme, Supabase Auth est traité
   comme NON configuré, et le sélecteur (`./auth.ts`) retombe sur le mot
   de passe partagé. C'est la règle déjà écrite pour une configuration à
   moitié faite : elle ne bloque pas la connexion, elle change de mode.
   Le tableau de bord affiche l'avertissement correspondant — voir
   `cleAnonManquante()`. */
/* Lue à la requête, comme les autres : voir le commentaire de auth.ts. */
const anonKey = (): string =>
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/* ════════════════════════════════════════════════════════════════
   VÉRIFIER QUE LA CLÉ ANONYME EST VRAIMENT VALIDE

   ⚠ LE PIÈGE QUE CETTE FONCTION EXISTE POUR FERMER.
   `isSupabaseConfigured()` ne teste que la LONGUEUR de la clé anonyme.
   Une clé non vide mais fausse — l'ancienne clé JWT du projet, celle
   d'un autre projet, une valeur tronquée au copier-coller — passe donc
   le test. L'écran de connexion annonce alors fièrement « Comptes
   nommés (Supabase) », et TOUTES les connexions échouent, sans que rien
   ne distingue cela d'un mot de passe faux.

   Constaté en production : mot de passe correct, compte confirmé, ligne
   `admins` en place, connexion refusée quand même. Le temps perdu à
   chercher du côté du mot de passe est exactement ce que cette fonction
   évite.

   Le test est le plus léger possible : `GET /auth/v1/settings` avec la
   clé en en-tête. Mesuré sur le projet réel — 200 si la clé est valide,
   401 dans tous les autres cas (clé fausse, ancienne, vide).

   ⚠ FERMÉ EN CAS DE DOUTE, MAIS DANS L'AUTRE SENS QUE L'AUTHENTIFICATION.
   Si le réseau échoue, on rend `"inconnu"` et l'écran n'affiche RIEN.
   Un avertissement de configuration affiché à tort sur une coupure
   passagère enverrait quelqu'un modifier une variable qui allait bien.
   ════════════════════════════════════════════════════════════════ */

export type EtatCleAnon = "ok" | "rejetee" | "inconnu";

/* Le résultat est stable entre deux requêtes : la clé ne change qu'au
   redéploiement. On évite un aller-retour réseau à chaque affichage de
   l'écran de connexion — qui est aussi la page qu'un attaquant
   rechargerait en boucle. */
let memoCleAnon: { etat: EtatCleAnon; at: number } | null = null;
const CLE_ANON_TTL = 60_000;

export async function etatCleAnon(): Promise<EtatCleAnon> {
  if (!urlValide() || anonKey().length === 0) return "inconnu";
  if (memoCleAnon && Date.now() - memoCleAnon.at < CLE_ANON_TTL) return memoCleAnon.etat;

  let etat: EtatCleAnon = "inconnu";
  try {
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), 4_000);
    const r = await fetch(`${base()}/auth/v1/settings`, {
      headers: { apikey: anonKey() },
      cache: "no-store",
      signal: ctrl.signal,
    }).finally(() => clearTimeout(minuteur));
    /* 401 = la clé est refusée. Tout autre statut, y compris une erreur
       serveur passagère, ne prouve rien contre la clé. */
    etat = r.status === 401 ? "rejetee" : r.ok ? "ok" : "inconnu";
  } catch {
    etat = "inconnu";
  }

  memoCleAnon = { etat, at: Date.now() };
  return etat;
}

/** `editeur` : contenu, blog, SEO, annonces. `admin` : + tracking. */
export type RoleAdmin = "editeur" | "admin";

export type Administrateur = {
  /** `auth.users.id` — l'identifiant durable, l'e-mail peut changer. */
  id: string;
  email: string;
  role: RoleAdmin;
};

const urlValide = (): boolean => /^https?:\/\//.test(base());

/**
 * Supabase pilote l'authentification dès que l'URL, la clé de service ET
 * la clé anonyme sont présentes. Une configuration à moitié faite est
 * traitée comme absente : mieux vaut retomber sur le mot de passe
 * partagé que refuser toute connexion au premier déploiement incomplet.
 */
export const isSupabaseConfigured = (): boolean =>
  urlValide() && serviceKey().length > 0 && anonKey().length > 0;

/**
 * Cas à signaler au client : la base est là, les comptes nommés non — il
 * ne manque que SUPABASE_ANON_KEY. Sans ce voyant, la bascule en mot de
 * passe partagé passerait inaperçue, et c'est une perte de traçabilité.
 */
export const cleAnonManquante = (): boolean =>
  urlValide() && serviceKey().length > 0 && anonKey().length === 0;

/* Une connexion ne doit pas pouvoir suspendre une requête : sans borne,
   un Supabase injoignable transforme l'écran de login en page qui tourne
   jusqu'au timeout de l'hébergeur. */
const TIMEOUT_MS = 8_000;

/**
 * `fetch` borné dans le temps, confié à la bibliothèque. Un appel qui
 * dépasse le délai est avorté : la bibliothèque le rend comme une erreur
 * réseau, que l'on traite en échec d'authentification. Fermé par défaut —
 * une base injoignable ne doit jamais ouvrir une session.
 *
 * `cache: "no-store"` : Next met en cache les `fetch` qu'il intercepte.
 * Une réponse d'authentification n'a évidemment rien à faire dans un
 * cache partagé.
 */
const fetchBorne: typeof fetch = (input, init) => {
  /* Si la bibliothèque fournit déjà son propre signal, on ne le remplace
     pas : elle reste maîtresse de son annulation. */
  if (init?.signal) return fetch(input, { ...init, cache: "no-store" });

  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return fetch(input, { ...init, cache: "no-store", signal: ctrl.signal }).finally(
    () => clearTimeout(minuteur),
  );
};

/* Options communes aux deux clients : on est côté serveur, il n'y a ni
   navigateur, ni onglet, ni session à conserver d'une requête à l'autre.
   Mêmes réglages que le pilote de stockage. */
const OPTIONS = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: { fetch: fetchBorne },
} as const;

/* Client de SERVICE : lecture de `admins`, RLS contourné. Créé à la
   première utilisation — pas à l'import — pour qu'un build sans Supabase
   configuré ne plante pas au chargement du module. */
let service: SupabaseClient | null = null;

function clientService(): SupabaseClient {
  service ??= createClient(base(), serviceKey(), OPTIONS);
  return service;
}

/**
 * Client ANONYME, créé pour UNE connexion puis abandonné.
 *
 * Volontairement pas de client partagé : même sans persistance, un client
 * réutilisé garde en mémoire la session de la dernière personne connectée.
 * Sur un serveur qui traite plusieurs requêtes, c'est exactement le genre
 * d'état qu'on ne veut pas voir traverser deux utilisateurs.
 */
const clientAnonyme = (): SupabaseClient => createClient(base(), anonKey(), OPTIONS);

/** Forme de la ligne lue dans `admins` (snake_case côté SQL). */
type LigneAdmin = { user_id: string; email: string; role: string | null };

/**
 * Lit le rôle applicatif dans `admins`. Absent de la table → `null`,
 * c'est-à-dire refus : c'est cette fonction qui fait la différence entre
 * « a un compte » et « administre ce site ».
 *
 * Lue avec la clé de service parce que le RLS n'accorde rien aux rôles
 * `anon` / `authenticated` (voir le verrouillage en fin de schéma) : sans
 * elle, la requête reviendrait vide et tout le monde serait refusé.
 */
export async function lireAdmin(userId: string): Promise<Administrateur | null> {
  if (!isSupabaseConfigured() || !userId) return null;

  try {
    const { data, error } = await clientService()
      .from("admins")
      .select("user_id,email,role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      /* On trace la panne côté serveur — sans elle, un RLS mal repris ou
         une table absente se lit à l'écran comme « mot de passe faux ».
         Jamais l'identifiant de la personne : le journal de l'hébergeur
         n'est pas le bon endroit pour ça. */
      console.error("[admin/auth] lecture de `admins` impossible :", error.message);
      return null;
    }

    const ligne = data as LigneAdmin | null;
    if (!ligne || typeof ligne.email !== "string") {
      /* Le mot de passe était BON — Supabase Auth vient de l'accepter —
         mais la personne n'a pas de ligne dans `admins`. C'est un refus
         légitime, et c'est la différence entre « a un compte » et
         « administre ce site ». Il mérite pourtant sa trace : à l'écran,
         il est indiscernable d'un mot de passe faux, et l'administrateur
         qui vient de créer un compte dans Supabase sans ajouter la ligne
         correspondante chercherait longtemps. */
      console.warn(
        `[admin/auth] authentification réussie, mais aucune ligne dans \`admins\` ` +
          `pour cet utilisateur : accès refusé. Ajoutez-la pour ouvrir le back-office.`,
      );
      return null;
    }

    /* Tout rôle inattendu redescend à `editeur` : un `role` mal saisi en
       base ne doit pas ouvrir les écrans sensibles. Moindre privilège. */
    return {
      id: userId,
      email: ligne.email,
      role: ligne.role === "admin" ? "admin" : "editeur",
    };
  } catch {
    /* Réseau, DNS, délai dépassé : fermé par défaut. */
    return null;
  }
}

/**
 * Connexion par e-mail + mot de passe.
 *
 * Revient `null` pour TOUS les échecs sans distinction — identifiants
 * faux, compte inexistant, compte valide mais absent de `admins`,
 * Supabase injoignable. L'appelant n'a donc rien de plus précis à
 * afficher, ce qui est exactement le but : un message différencié
 * transformerait l'écran de login en outil d'énumération de comptes.
 */
export async function signInAdmin(
  email: string,
  motDePasse: string,
): Promise<Administrateur | null> {
  if (!isSupabaseConfigured()) return null;

  /* GoTrue stocke les e-mails en minuscules ; normaliser évite un échec
     incompréhensible après une saisie au clavier majuscule. */
  const mail = email.trim().toLowerCase();
  if (!mail || !motDePasse) return null;

  const anonyme = clientAnonyme();

  let userId = "";
  try {
    const { data, error } = await anonyme.auth.signInWithPassword({
      email: mail,
      password: motDePasse,
    });
    if (error || !data.user?.id) {
      /* ⚠ CET ÉCHEC ÉTAIT MUET, ET C'EST CE QUI REND UNE PANNE DE
         CONNEXION INDÉBROUILLABLE EN PRODUCTION.

         Le visiteur voit « connexion refusée » — et c'est bien ce qu'il
         doit voir, on ne lui dit jamais lequel des deux champs est
         faux. Mais côté serveur, trois causes très différentes
         produisaient exactement le même silence :

           · « Invalid login credentials » → le mot de passe est faux, ou
             le compte n'existe pas. Rien à corriger dans le code ;
           · « Invalid API key » → SUPABASE_ANON_KEY est absente,
             périmée, ou ce n'est pas la clé de CE projet. Aucune
             saisie ne pourra jamais aboutir ;
           · une erreur réseau ou un abandon au bout de 8 s → Supabase
             est injoignable depuis l'hébergeur.

         Sans cette ligne, les trois se ressemblent : on cherche un mot
         de passe pendant que c'est une variable d'environnement.

         Le message de Supabase est générique par construction et ne
         contient ni l'e-mail ni le mot de passe. On ne journalise donc
         QUE lui et son statut — l'identité de la personne n'a rien à
         faire dans le journal d'un hébergeur. */
      console.warn(
        `[admin/auth] connexion refusée par Supabase Auth : ${
          error?.message ?? "réponse sans utilisateur"
        }${error?.status ? ` (HTTP ${error.status})` : ""}`,
      );
      return null;
    }
    userId = data.user.id;
  } catch (e) {
    /* Abandon du `fetch` borné, DNS, TLS : tout ce qui n'est pas une
       réponse de Supabase passe ici, et passait sans un mot. */
    console.warn(
      "[admin/auth] Supabase Auth injoignable :",
      e instanceof Error ? e.message : String(e),
    );
    return null;
  }

  /* Révoque la session Supabase que la connexion vient de créer.
     On ne s'en sert pas : c'est notre cookie signé (8 h) qui fait foi. Le
     `refresh_token` émis par GoTrue vivrait sinon des semaines sans que
     personne ne le surveille. `scope: "local"` ne révoque que cette
     session — une déconnexion globale éjecterait la personne de ses
     autres onglets. Un échec de révocation ne doit pas faire échouer la
     connexion : le jeton expirera de lui-même. */
  try {
    await anonyme.auth.signOut({ scope: "local" });
  } catch {
    /* sans conséquence sur la session du back-office */
  }

  return lireAdmin(userId);
}
