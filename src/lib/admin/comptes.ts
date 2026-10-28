import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { isBaseConfiguree, sql } from "@/lib/db";

/* ════════════════════════════════════════════════════════════════
   COMPTES NOMMÉS — la table `admins`

   Ce module répond à la seule question qui compte au moment de la
   connexion : « cet e-mail et ce mot de passe désignent-ils un
   administrateur du site, et avec quel rôle ? » Il gère aussi le cycle
   de vie d'un compte : invitation, choix du mot de passe, rôle,
   révocation.

   Il remplace Supabase Auth. Les identifiants vivent désormais dans
   notre propre base, en France, à côté du contenu qu'ils protègent :
     · l'e-mail, toujours en minuscules ;
     · une EMPREINTE scrypt du mot de passe, jamais le mot de passe ;
     · le rôle — `editeur` ou `admin`.

   PAS D'E-MAIL ENVOYÉ, ET C'EST UN CHOIX. Supabase envoyait les
   invitations par son propre service d'envoi, limité à quelques messages
   par heure, et vers un lien qui ne menait à aucun écran du site. Ici,
   l'administrateur crée le compte et reçoit un LIEN D'ACCÈS à usage
   unique, valable 72 heures, qu'il transmet lui-même. La personne
   invitée y choisit son mot de passe. Même mécanisme pour un mot de
   passe oublié : un administrateur génère un nouveau lien. Aucun
   prestataire d'envoi de plus dans le registre des traitements.

   ⚠ Le lien n'est JAMAIS stocké : la base garde son empreinte SHA-256.
   Une fuite de la table ne donne ni mot de passe, ni lien utilisable.
   ════════════════════════════════════════════════════════════════ */

/** `editeur` : contenu, blog, SEO, annonces. `admin` : + tracking et comptes. */
export type RoleAdmin = "editeur" | "admin";

export type Administrateur = {
  /** `admins.id` — l'identifiant durable, l'e-mail peut changer. */
  id: string;
  email: string;
  role: RoleAdmin;
};

/**
 * Comptes nommés actifs ? Il suffit que la base soit configurée : le
 * schéma (`db/schema.sql`) crée la table `admins` avec le reste.
 */
export const isComptesConfigures = (): boolean => isBaseConfiguree();

/** Tout rôle inattendu redescend à `editeur` : moindre privilège. */
const roleDe = (v: unknown): RoleAdmin => (v === "admin" ? "admin" : "editeur");

export const normaliserEmail = (v: string): string => v.trim().toLowerCase();

/* ──────────────────────────────────────────────────────────────────
   EMPREINTES DE MOT DE PASSE — scrypt, sans dépendance

   scrypt est dans `node:crypto` et figure parmi les fonctions
   recommandées pour stocker des mots de passe : il est volontairement
   lent ET gourmand en mémoire, ce qui rend une attaque par force brute
   sur une base volée coûteuse même avec des cartes graphiques.

   Format stocké : `scrypt$N$r$p$<sel>$<empreinte>` (base64url). Les
   paramètres voyagent avec l'empreinte : on pourra les durcir plus tard
   sans invalider les comptes existants.
   ────────────────────────────────────────────────────────────────── */

const SCRYPT = { N: 2 ** 15, r: 8, p: 1, longueur: 64 } as const;
/* scrypt consomme 128 × N × r octets : 32 Mo ici. Le plafond par défaut
   de Node est pile à 32 Mo, et le moindre dépassement lève. */
const MEMOIRE_MAX = 64 * 1024 * 1024;

function deriver(
  motDePasse: string,
  sel: Buffer,
  N: number,
  r: number,
  p: number,
  longueur: number,
): Promise<Buffer> {
  return new Promise((ok, ko) =>
    scrypt(motDePasse, sel, longueur, { N, r, p, maxmem: MEMOIRE_MAX }, (e, cle) =>
      e ? ko(e) : ok(cle),
    ),
  );
}

export async function empreinte(motDePasse: string): Promise<string> {
  const sel = randomBytes(16);
  const { N, r, p, longueur } = SCRYPT;
  const cle = await deriver(motDePasse, sel, N, r, p, longueur);
  return ["scrypt", N, r, p, sel.toString("base64url"), cle.toString("base64url")].join("$");
}

/** Vrai si le mot de passe correspond à l'empreinte. Toute empreinte illisible vaut refus. */
async function verifier(motDePasse: string, stockee: string): Promise<boolean> {
  const [algo, n, r, p, sel, cle] = stockee.split("$");
  if (algo !== "scrypt" || !sel || !cle) return false;
  const attendue = Buffer.from(cle, "base64url");
  try {
    const calculee = await deriver(
      motDePasse,
      Buffer.from(sel, "base64url"),
      Number(n),
      Number(r),
      Number(p),
      attendue.length,
    );
    return calculee.length === attendue.length && timingSafeEqual(calculee, attendue);
  } catch {
    return false;
  }
}

/* Empreinte factice, calculée une fois. Elle sert quand l'e-mail est
   inconnu : on dérive quand même, pour que la réponse prenne le même
   temps qu'un mot de passe faux sur un compte existant. Sans elle, la
   durée de la réponse dirait à un attaquant quelles adresses ont un
   compte. */
let factice: Promise<string> | null = null;

/**
 * Règle de mot de passe, celle de la CNIL pour un accès par mot de passe
 * seul (délibération 2022-100) : 12 caractères mêlant majuscules,
 * minuscules, chiffres et caractères spéciaux — ou 14 caractères sans
 * contrainte de composition, ce qui laisse la place à une phrase de
 * passe, plus facile à retenir et plus difficile à deviner.
 *
 * Rend le motif du refus, affichable tel quel, ou `null` si c'est bon.
 */
export function motifMotDePasseFaible(motDePasse: string): string | null {
  if (motDePasse.length > 200) return "Le mot de passe dépasse 200 caractères.";
  if (motDePasse.length >= 14) return null;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) =>
    re.test(motDePasse),
  ).length;
  if (motDePasse.length >= 12 && classes === 4) return null;
  return "Choisissez au moins 14 caractères (une phrase fait très bien l'affaire), ou au moins 12 caractères mêlant majuscules, minuscules, chiffres et caractères spéciaux.";
}

/* ──────────────────────────────────────────────────────────────────
   CONNEXION
   ────────────────────────────────────────────────────────────────── */

type LigneAdmin = {
  id: string;
  email: string;
  role: string | null;
  mot_de_passe: string | null;
};

/**
 * Connexion par e-mail + mot de passe.
 *
 * Revient `null` pour TOUS les échecs sans distinction — identifiants
 * faux, compte inexistant, compte révoqué, lien d'accès jamais utilisé,
 * base injoignable. L'appelant n'a donc rien de plus précis à afficher,
 * ce qui est exactement le but : un message différencié transformerait
 * l'écran de login en outil d'énumération de comptes.
 */
export async function signInAdmin(
  email: string,
  motDePasse: string,
): Promise<Administrateur | null> {
  if (!isComptesConfigures()) return null;

  const mail = normaliserEmail(email);
  if (!mail || !motDePasse) return null;

  let ligne: LigneAdmin | undefined;
  try {
    [ligne] = await sql<LigneAdmin>(
      "select id, email, role, mot_de_passe from admins where email = $1 and revoque_le is null",
      [mail],
    );
  } catch (e) {
    /* ⚠ Une panne de base se lit à l'écran comme « connexion refusée ».
       Sans cette trace, on chercherait un mot de passe pendant que c'est
       la base qui ne répond pas. Jamais l'e-mail dans le journal : celui
       de l'hébergeur n'est pas le bon endroit pour une identité. */
    console.warn(
      "[admin/comptes] base injoignable à la connexion :",
      e instanceof Error ? e.message : String(e),
    );
    return null;
  }

  if (!ligne?.mot_de_passe) {
    factice ??= empreinte(randomBytes(16).toString("hex"));
    await verifier(motDePasse, await factice);
    return null;
  }

  if (!(await verifier(motDePasse, ligne.mot_de_passe))) return null;

  return { id: ligne.id, email: ligne.email, role: roleDe(ligne.role) };
}

/* ──────────────────────────────────────────────────────────────────
   LIENS D'ACCÈS — invitation et réinitialisation
   ────────────────────────────────────────────────────────────────── */

/** 72 heures : le temps qu'un message soit lu un vendredi soir et utilisé lundi. */
const DUREE_LIEN_MS = 72 * 60 * 60 * 1000;

const empreinteJeton = (jeton: string): string =>
  createHash("sha256").update(jeton).digest("hex");

/** Un jeton de 256 bits : impossible à deviner, inutile de limiter les essais. */
const nouveauJeton = (): string => randomBytes(32).toString("base64url");

/** Le chemin du lien d'accès, à préfixer par l'adresse du site. */
export const cheminAcces = (jeton: string): string =>
  `/admin/acces?jeton=${encodeURIComponent(jeton)}`;

export type Compte = {
  id: string;
  email: string;
  role: RoleAdmin;
  creeLe: string;
  /** Faux tant que la personne n'a pas choisi son mot de passe. */
  actif: boolean;
  /** Échéance du lien d'accès en cours, s'il y en a un. */
  lienExpire: string | null;
};

type LigneCompte = {
  id: string;
  email: string;
  role: string | null;
  mot_de_passe: string | null;
  jeton_expire: string | null;
  created_at: string;
};

/** Les comptes qui ont accès au back-office, du plus ancien au plus récent. */
export async function listerComptes(): Promise<Compte[]> {
  const lignes = await sql<LigneCompte>(
    `select id, email, role, mot_de_passe, jeton_expire, created_at
       from admins where revoque_le is null order by created_at asc`,
  );
  const maintenant = Date.now();
  return lignes.map((l) => ({
    id: l.id,
    email: l.email,
    role: roleDe(l.role),
    creeLe: l.created_at,
    actif: Boolean(l.mot_de_passe),
    lienExpire:
      l.jeton_expire && new Date(l.jeton_expire).getTime() > maintenant ? l.jeton_expire : null,
  }));
}

/** L'identité de chaque compte, révoqués compris : le journal les nomme encore. */
export async function emailsDesComptes(): Promise<Map<string, string>> {
  const lignes = await sql<{ id: string; email: string }>("select id, email from admins");
  return new Map(lignes.map((l) => [l.id, l.email]));
}

export type Invitation =
  | { ok: true; jeton: string; reactive: boolean }
  | { ok: false; raison: "existe" };

/**
 * Crée le compte (ou réactive un compte révoqué) et rend le jeton du
 * lien d'accès. Le mot de passe d'un compte réactivé a été effacé à la
 * révocation : la personne en choisit un nouveau.
 */
export async function inviter(email: string, role: RoleAdmin): Promise<Invitation> {
  const mail = normaliserEmail(email);
  const jeton = nouveauJeton();
  const expire = new Date(Date.now() + DUREE_LIEN_MS).toISOString();

  const [existant] = await sql<{ id: string; revoque_le: string | null }>(
    "select id, revoque_le from admins where email = $1",
    [mail],
  );
  if (existant && !existant.revoque_le) return { ok: false, raison: "existe" };

  if (existant) {
    await sql(
      `update admins set role = $2, revoque_le = null, mot_de_passe = null,
              jeton = $3, jeton_expire = $4 where id = $1`,
      [existant.id, role, empreinteJeton(jeton), expire],
    );
    return { ok: true, jeton, reactive: true };
  }

  await sql(
    "insert into admins (email, role, jeton, jeton_expire) values ($1, $2, $3, $4)",
    [mail, role, empreinteJeton(jeton), expire],
  );
  return { ok: true, jeton, reactive: false };
}

/**
 * Nouveau lien d'accès pour un compte existant — mot de passe oublié,
 * ou invitation expirée. Le lien précédent cesse aussitôt de fonctionner.
 *
 * ⚠ Le mot de passe actuel reste valable tant que le nouveau n'est pas
 * choisi : générer un lien ne doit pas suffire à fermer la porte à
 * quelqu'un. Pour couper un accès, c'est `revoquer()`.
 */
export async function nouveauLien(id: string): Promise<string | null> {
  const jeton = nouveauJeton();
  const lignes = await sql(
    `update admins set jeton = $2, jeton_expire = $3
      where id = $1 and revoque_le is null returning id`,
    [id, empreinteJeton(jeton), new Date(Date.now() + DUREE_LIEN_MS).toISOString()],
  );
  return lignes.length ? jeton : null;
}

/** L'adresse e-mail que désigne un lien encore valable, ou `null`. */
export async function emailDuLien(jeton: string): Promise<string | null> {
  if (!jeton || !isComptesConfigures()) return null;
  try {
    const [ligne] = await sql<{ email: string }>(
      `select email from admins
        where jeton = $1 and jeton_expire > now() and revoque_le is null`,
      [empreinteJeton(jeton)],
    );
    return ligne?.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Consomme le lien : enregistre le mot de passe et efface le jeton, dans
 * la même requête — un lien ne sert qu'une fois, même cliqué deux fois.
 *
 * Rend le compte, pour ouvrir la session dans la foulée, ou `null` si le
 * lien n'est plus valable.
 */
export async function definirMotDePasse(
  jeton: string,
  motDePasse: string,
): Promise<Administrateur | null> {
  const [ligne] = await sql<{ id: string; email: string; role: string | null }>(
    `update admins set mot_de_passe = $2, jeton = null, jeton_expire = null
      where jeton = $1 and jeton_expire > now() and revoque_le is null
      returning id, email, role`,
    [empreinteJeton(jeton), await empreinte(motDePasse)],
  );
  return ligne ? { id: ligne.id, email: ligne.email, role: roleDe(ligne.role) } : null;
}

/* ──────────────────────────────────────────────────────────────────
   DROITS
   ────────────────────────────────────────────────────────────────── */

export async function changerRole(id: string, role: RoleAdmin): Promise<void> {
  await sql("update admins set role = $2 where id = $1 and revoque_le is null", [id, role]);
}

/**
 * Retire l'accès. L'IDENTITÉ reste : la ligne est conservée, marquée
 * révoquée, son mot de passe et son lien effacés. La supprimer viderait
 * les `updated_by` du journal des versions — l'historique perdrait son
 * auteur pour une simple fin de mission.
 */
export async function revoquer(id: string): Promise<void> {
  await sql(
    `update admins set revoque_le = now(), mot_de_passe = null, jeton = null, jeton_expire = null
      where id = $1`,
    [id],
  );
}
