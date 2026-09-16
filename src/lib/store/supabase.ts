import "server-only";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Agence,
  AnnonceOverride,
  Article,
  Content,
  Media,
  Menus,
  PageEditable,
  Realisation,
  Reglages,
  SeoEntry,
  Textes,
  TrackingConfig,
} from "./types";

/* ════════════════════════════════════════════════════════════════
   PILOTE SUPABASE — le contenu sur Postgres

   Même contrat que le pilote fichier (`./file`), sur une base managée :
   c'est ce qui rend le back-office utilisable en serverless, où le
   disque est en lecture seule.

   LE SCHÉMA FAIT FOI : `supabase/schema.sql`. Trois surfaces de données,
   pour trois raisons différentes :
     · `content` — une ligne par domaine (seo, tracking, textes, menus,
       reglages, pages), en JSONB : ces formes bougent au rythme du
       design, leur donner des colonnes imposerait une migration à chaque
       champ ajouté ;
     · `articles`, `annonce_overrides`, `agences`, `medias` — de vraies
       tables, parce qu'on les trie, les filtre et les journalise ligne
       par ligne ;
     · `content_versions` — l'instantané d'AVANT chaque écriture.
       « Qui a changé quoi » est la question que le client posera au
       premier texte disparu ; sans ce journal, la réponse est « on ne
       sait pas ».

   SÉCURITÉ. Le RLS est actif sur toutes les tables et AUCUNE politique
   n'ouvre l'accès : seule la clé `service_role` passe. Elle n'a donc
   rien à faire dans le navigateur — d'où `server-only` en tête de
   fichier et une variable SANS préfixe NEXT_PUBLIC_. Même principe que
   le token Vitahome : le secret ne quitte pas le serveur.

   ⚠ snake_case côté SQL, camelCase côté TypeScript. Le mapping est
   écrit à la main, champ par champ, plus bas : aucune conversion
   automatique, donc aucune colonne qui se renomme toute seule le jour
   où quelqu'un ajoute un champ.
   ════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────────
   CONNEXION
   ────────────────────────────────────────────────────────────────── */

/* Pas de barre finale : on concatène des chemins absolus derrière, et
   `//rest/v1` n'est pas la même route que `/rest/v1`. */
/* Lus à la requête : une constante de module fige la valeur dans les
   artefacts de build — un déploiement a déjà échoué pour cela. */
const sbUrl = (): string => (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const sbKey = (): string => (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

/** Nom affiché dans le back-office. */
export const nom = "supabase" as const;

/**
 * LA détection de « Supabase est configuré ». Réexportée par `./index`,
 * qui documente pourquoi elle est unique.
 *
 * Deux conditions, pas une : les deux secrets, ET une URL qui porte son
 * schéma. Tester la seule présence — ce que faisait ce module — laissait
 * passer une URL saisie « projet.supabase.co » : le magasin partait sur
 * Postgres, `createClient` échouait à chaque requête, et
 * l'authentification (qui, elle, validait le schéma) retombait sur le
 * mot de passe partagé. Deux comportements contradictoires, aucun
 * message. Une configuration à moitié faite est traitée comme absente :
 * le repli fichier + mot de passe partagé est cohérent, lui.
 */
export function isSupabaseConfigured(): boolean {
  return /^https?:\/\/.+/.test(sbUrl()) && sbKey().length > 0;
}

/** Ancien nom, conservé pour ne casser aucun appelant. */
export const isConfigured = isSupabaseConfigured;

/* Client créé à la première utilisation, pas à l'import : sans cette
   paresse, un build sans Supabase configuré planterait au chargement du
   module, alors que le repli fichier suffit parfaitement. */
let client: SupabaseClient | null = null;

/* ⚠ CE QUI FAIT QUE LE BACK-OFFICE SERT À QUELQUE CHOSE.

   Next met en cache tout `fetch` atteignable avant une API de requête
   (doc : 01-app/02-guides/caching-without-cache-components.md, § fetchCache).
   Nos pages publiques sont statiques : les appels REST de Supabase
   tombaient donc dans le Data Cache, qui survit AUX BUILDS puisqu'il vit
   dans `.next/cache` — restauré d'un déploiement à l'autre sur Netlify.

   Le symptôme était muet, et c'est ce qui le rendait grave : le client
   enregistre un titre, `revalidatePath()` régénère bien la page, mais la
   régénération relit la réponse HTTP figée. Le back-office écrivait juste,
   la base contenait la bonne valeur, et la page servait l'ancienne. Mesuré
   sur un build : 25 lectures sur 28 rendaient un `seo` vide alors que la
   base était pleine.

   ⚠ NE PAS « CORRIGER » EN METTANT `cache: "no-store"`. Essayé, mesuré :
   cela fait basculer presque toutes les pages publiques en rendu à la
   demande (`ƒ`) — /concept, /contact, /cookies, /agences, /annonces… Le
   site perd sa pré-génération pour réparer un cache. On étiquette plutôt
   la requête, et l'écriture invalide l'étiquette : voir `patchContent()`
   dans ./index.ts. Les pages restent statiques, et une modification est
   visible immédiatement.

   `FRAICHEUR` est la ceinture de sécurité, pas le mécanisme principal :
   elle borne ce qui échapperait à l'étiquette — une ligne modifiée
   directement depuis l'interface Supabase, ou un cache restauré d'un
   déploiement précédent.

   ⚠ SA VALEUR N'EST PAS LIBRE. Next retient la plus courte des deux
   fraîcheurs, celle de la page et celle de ses `fetch` : à 60 s, toutes
   les pages du site se régénéraient chaque minute au lieu de la demi-heure
   que leur code demande (`export const revalidate = 1800`, src/app/agences).
   Constaté dans le tableau des routes du build, colonne « Revalidate ».
   On s'aligne donc sur cette demi-heure — le `fetch` ne doit jamais être
   plus pressé que la page qu'il sert. */
export const TAG_MAGASIN = "magasin-contenu";
const FRAICHEUR = 1800;

const fetchMagasin: typeof fetch = (input, init) => {
  /* Seules les lectures sont cachées. Étiqueter un POST ou un PATCH n'a
     pas de sens et Next refuse de les mettre en cache de toute façon. */
  const methode = (init?.method ?? "GET").toUpperCase();
  if (methode !== "GET") return fetch(input, { ...init, cache: "no-store" });
  return fetch(input, {
    ...init,
    next: { tags: [TAG_MAGASIN], revalidate: FRAICHEUR },
  });
};

function sb(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase n'est pas configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  client ??= createClient(sbUrl(), sbKey(), {
    /* Pas de session à persister ni de jeton à rafraîchir : on est côté
       serveur, avec une clé de service et aucun utilisateur connecté. */
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { fetch: fetchMagasin },
  });
  return client;
}

/**
 * Le client de service, pour les modules serveur qui ont besoin d'autre
 * chose que du contenu — aujourd'hui `src/lib/medias.ts` et le bucket de
 * fichiers. Un seul client pour le processus : en créer un par module
 * multiplierait les pools de connexions pour rien.
 *
 * Lève si Supabase n'est pas configuré. Les appelants testent
 * `isSupabaseConfigured()` avant, et dégradent proprement.
 */
export function clientSupabase(): SupabaseClient {
  return sb();
}

/* ──────────────────────────────────────────────────────────────────
   AUTORAT — qui a écrit

   Le schéma prévoit `updated_by` sur les tables de contenu et
   `created_by` sur le journal. Tant qu'ils restaient nuls, le journal
   des versions disait ce qui avait changé et jamais qui l'avait changé —
   ce qui vidait de sa substance la raison même d'abandonner le mot de
   passe partagé pour des comptes nommés.

   ⚠ POURQUOI UN `import()` PARESSEUX, et pas un import en tête :
   `@/lib/admin/auth` importe `next/headers`. Un import statique ferait
   entrer `cookies()` dans le graphe de TOUTES les pages publiques qui
   lisent `getContent()` — y compris celles qui doivent rester rendues à
   la construction. Le chargement à l'appel garde l'identité sur le seul
   chemin d'écriture, qui est toujours une Server Action, donc toujours
   dans le contexte d'une requête. Effet de bord utile : la dépendance
   `store → admin/auth` n'existe plus à la compilation, donc aucun cycle
   possible même si l'authentification venait un jour à lire le contenu.

   Hors contexte de requête (build, script) `cookies()` lève : on attrape
   et l'on écrit sans auteur, plutôt que de refuser l'écriture.
   ────────────────────────────────────────────────────────────────── */

/** `auth.users.id` de qui écrit, ou `null` si l'identité est inconnue. */
type Auteur = string | null;

/* L'e-mail de session ne donne pas l'uuid : il faut le lire dans
   `admins`. Une requête par enregistrement serait du gaspillage pour une
   correspondance qui ne bouge quasiment jamais. */
let memoIdentite: { email: string; id: Auteur; at: number } | null = null;
const IDENTITE_TTL = 5 * 60_000;

async function idDepuisEmail(email: string): Promise<Auteur> {
  if (
    memoIdentite &&
    memoIdentite.email === email &&
    Date.now() - memoIdentite.at < IDENTITE_TTL
  ) {
    return memoIdentite.id;
  }
  try {
    const { data, error } = await sb()
      .from("admins")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    const ligne = data as { user_id?: string } | null;
    const id = !error && typeof ligne?.user_id === "string" ? ligne.user_id : null;
    memoIdentite = { email, id, at: Date.now() };
    return id;
  } catch {
    return null;
  }
}

/**
 * Qui écrit, en `auth.users.id`. Exportée pour `src/lib/medias.ts`, qui
 * écrit dans `medias` sans passer par le magasin (le fichier et sa fiche
 * naissent ensemble) et doit renseigner le même `updated_by`.
 */
export async function auteurCourant(): Promise<Auteur> {
  if (!isSupabaseConfigured()) return null;
  let email = "";
  try {
    const { currentAdmin } = await import("@/lib/admin/auth");
    email = (await currentAdmin())?.email ?? "";
  } catch {
    /* Hors requête, ou cookie illisible : on écrit sans auteur. */
    return null;
  }
  /* Vide = mode mot de passe partagé : il n'y a personne à nommer. C'est
     exactement l'information que les comptes nommés apportent, et son
     absence se lit dans le journal comme « auteur inconnu ». */
  const mail = email.trim().toLowerCase();
  if (!mail) return null;
  return idDepuisEmail(mail);
}

/* ──────────────────────────────────────────────────────────────────
   FORME DES LIGNES SQL
   ────────────────────────────────────────────────────────────────── */

type SeoJson = { title?: string; description?: string };

interface LigneContent {
  key: string;
  value: unknown;
  updated_at: string;
}

interface LigneArticle {
  id: string;
  slug: string;
  titre: string;
  chapo: string;
  corps: string;
  image: string | null;
  image_alt: string | null;
  publie_le: string | null;
  auteur: string | null;
  brouillon: boolean;
  seo: SeoJson;
  updated_at: string;
}

interface LigneAnnonce {
  ref: string;
  titre: string | null;
  accroche: string | null;
  coup_de_coeur: boolean;
  masquee: boolean;
  seo: SeoJson;
  updated_at: string;
}

interface LigneAgence {
  id: string;
  nom: string;
  zone: string;
  adresse: string;
  telephone: string;
  email: string;
  horaires: string;
  lat: number | null;
  lng: number | null;
  image: string | null;
  villes: string[] | null;
  description: string;
  actif: boolean;
  ordre: number;
  updated_at: string;
}

interface LigneMedia {
  id: string;
  chemin: string;
  nom: string;
  alt: string;
  type: string;
  taille: number;
  largeur: number | null;
  hauteur: number | null;
  created_at: string;
  updated_at: string;
}

/** Colonnes écrites pour un article — l'`id` est géré à part. */
type ColonnesArticle = Omit<LigneArticle, "id" | "updated_at">;
/** Colonnes écrites pour une surcharge — la `ref` est la clé. */
type ColonnesAnnonce = Omit<LigneAnnonce, "updated_at">;
/** Colonnes écrites pour une agence — l'`id` est géré à part. */
type ColonnesAgence = Omit<LigneAgence, "id" | "updated_at">;

/* ──────────────────────────────────────────────────────────────────
   MAPPING — explicite dans les deux sens
   ────────────────────────────────────────────────────────────────── */

/** Une chaîne vide côté SQL ne vaut pas mieux qu'un champ absent côté TS. */
const texte = (v: string | null | undefined): string | undefined => {
  const s = (v ?? "").trim();
  return s.length ? s : undefined;
};

/** `undefined` côté TS devient `null` côté SQL : la colonne est nullable. */
const nullable = (v: string | undefined): string | null => {
  const s = (v ?? "").trim();
  return s.length ? s : null;
};

/** Colonne `not null default ''` : on ne lui envoie jamais `null`. */
const obligatoire = (v: string | undefined | null): string => (v ?? "").trim();

/** Un nombre exploitable, ou `undefined` — jamais `NaN` dans un gabarit. */
const nombre = (v: number | null | undefined): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

const nombreNullable = (v: number | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Un bloc SEO vide reste `undefined` côté TS : les gabarits testent sa présence. */
const seoVersTs = (v: SeoJson | null | undefined): SeoJson | undefined => {
  const title = texte(v?.title);
  const description = texte(v?.description);
  if (!title && !description) return undefined;
  return { ...(title ? { title } : {}), ...(description ? { description } : {}) };
};

const seoVersSql = (v: SeoJson | undefined): SeoJson => ({
  ...(v?.title ? { title: v.title } : {}),
  ...(v?.description ? { description: v.description } : {}),
});

/* Postgres rend « 2026-09-12T08:00:00+00:00 » ; le site manipule de l'ISO
   en Z. On normalise ici, une fois, plutôt que dans chaque gabarit. */
const iso = (v: string | null | undefined): string | undefined => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

/* Les clés primaires `uuid` sont fournies par le back-office (qui doit
   pouvoir désigner une ligne avant de l'avoir enregistrée). Un
   identifiant qui n'est pas un uuid ferait échouer l'insertion côté
   Postgres avec un message incompréhensible : on en tire un propre. */
/**
 * L'identifiant d'une agence : un slug d'URL, pas un uuid.
 *
 * On accepte ce que l'appelant propose s'il est déjà propre — c'est ce
 * qui permet de renommer une agence sans déplacer sa page — et on se
 * rabat sur le nom sinon. Le tirage aléatoire reste le dernier recours :
 * mieux vaut une URL laide qu'une clé primaire vide.
 */
const slugAgence = (id: string | undefined, nom: string): string => {
  const propre = (v: string) =>
    v
      .normalize("NFD")
      .replace(/\p{Mn}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return propre(id ?? "") || propre(nom) || randomUUID();
};

function articleVersTs(r: LigneArticle): Article {
  return {
    slug: r.slug,
    titre: r.titre,
    chapo: r.chapo,
    corps: r.corps,
    image: texte(r.image),
    imageAlt: texte(r.image_alt),
    publieLe: iso(r.publie_le),
    auteur: texte(r.auteur),
    brouillon: r.brouillon,
    seo: seoVersTs(r.seo),
  };
}

function articleVersSql(a: Article): ColonnesArticle {
  return {
    slug: a.slug,
    titre: a.titre,
    chapo: a.chapo ?? "",
    corps: a.corps ?? "",
    image: nullable(a.image),
    image_alt: nullable(a.imageAlt),
    publie_le: iso(a.publieLe) ?? null,
    auteur: nullable(a.auteur),
    brouillon: a.brouillon,
    seo: seoVersSql(a.seo),
  };
}

function annonceVersTs(r: LigneAnnonce): AnnonceOverride {
  return {
    ref: r.ref,
    titre: texte(r.titre),
    accroche: texte(r.accroche),
    coupDeCoeur: r.coup_de_coeur,
    masquee: r.masquee,
    seo: seoVersTs(r.seo),
    /* `majLe` est dérivé de la colonne `updated_at`, tenue par un trigger :
       il se lit, il ne s'écrit pas. */
    majLe: iso(r.updated_at),
  };
}

function annonceVersSql(o: AnnonceOverride): ColonnesAnnonce {
  return {
    ref: o.ref,
    titre: nullable(o.titre),
    accroche: nullable(o.accroche),
    coup_de_coeur: Boolean(o.coupDeCoeur),
    masquee: Boolean(o.masquee),
    seo: seoVersSql(o.seo),
  };
}

function agenceVersTs(r: LigneAgence): Agence {
  return {
    id: r.id,
    nom: r.nom,
    zone: r.zone,
    adresse: r.adresse,
    telephone: r.telephone,
    email: r.email,
    horaires: r.horaires,
    lat: nombre(r.lat),
    lng: nombre(r.lng),
    image: texte(r.image),
    /* `text[]` peut revenir `null` sur une ligne créée à la main dans
       l'éditeur SQL : les gabarits itèrent dessus sans se protéger. */
    villes: Array.isArray(r.villes) ? r.villes.filter(Boolean) : [],
    description: r.description,
    actif: r.actif,
    ordre: r.ordre,
  };
}

function agenceVersSql(a: Agence): ColonnesAgence {
  return {
    nom: obligatoire(a.nom),
    zone: obligatoire(a.zone),
    adresse: obligatoire(a.adresse),
    telephone: obligatoire(a.telephone),
    email: obligatoire(a.email),
    horaires: obligatoire(a.horaires),
    lat: nombreNullable(a.lat),
    lng: nombreNullable(a.lng),
    image: nullable(a.image),
    villes: (a.villes ?? []).map((v) => v.trim()).filter(Boolean),
    description: obligatoire(a.description),
    actif: a.actif !== false,
    ordre: Number.isFinite(a.ordre) ? Math.trunc(a.ordre) : 0,
  };
}

function mediaVersTs(r: LigneMedia): Media {
  return {
    id: r.id,
    chemin: r.chemin,
    nom: r.nom,
    alt: r.alt ?? "",
    type: r.type,
    taille: nombre(r.taille) ?? 0,
    largeur: nombre(r.largeur),
    hauteur: nombre(r.hauteur),
    creeLe: iso(r.created_at) ?? new Date().toISOString(),
  };
}

/* ──────────────────────────────────────────────────────────────────
   JOURNAL — content_versions
   ────────────────────────────────────────────────────────────────── */

interface Version {
  /** 'content:seo' · 'article:<uuid>' · 'annonce:<ref>' · 'agence:<uuid>' */
  scope: string;
  /** L'état AVANT l'écriture, complet. */
  snapshot: unknown;
}

/**
 * Écrit le journal avant la modification, avec l'auteur.
 *
 * Un échec ici n'annule pas l'écriture qui suit : perdre une ligne
 * d'historique est regrettable, refuser au client d'enregistrer son texte
 * le serait davantage. L'erreur part dans les logs du serveur.
 *
 * `created_by` reste nul en mode mot de passe partagé : il n'y a alors
 * personne à nommer, et c'est visible comme tel dans l'historique.
 */
async function journaliser(versions: Version[], auteur: Auteur): Promise<void> {
  if (versions.length === 0) return;
  const { error } = await sb()
    .from("content_versions")
    .insert(
      versions.map((v) => ({
        scope: v.scope,
        snapshot: v.snapshot,
        created_by: auteur,
      })),
    );
  if (error) {
    console.error(
      "[store/supabase] journal des versions indisponible :",
      error.message,
    );
  }
}

/**
 * Journalise une modification faite hors du magasin.
 *
 * Aujourd'hui : la suppression d'un média, qui touche le bucket autant
 * que la base et vit donc dans `src/lib/medias.ts`. Sans cette porte, la
 * seule opération réellement destructrice du back-office serait aussi la
 * seule à ne laisser aucune trace.
 */
export async function journaliserExterne(
  scope: string,
  snapshot: unknown,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await journaliser([{ scope, snapshot }], await auteurCourant());
}

/** Compare les colonnes écrites à la ligne en base : pas d'écriture inutile, pas de version inutile. */
function inchange(
  colonnes: Record<string, unknown>,
  ligne: Record<string, unknown>,
): boolean {
  return Object.keys(colonnes).every(
    (k) => JSON.stringify(colonnes[k]) === JSON.stringify(ligne[k]),
  );
}

/** Toute erreur SQL remonte telle quelle : le back-office doit pouvoir dire « non enregistré ». */
function verifier(contexte: string, error: { message: string } | null): void {
  if (error) throw new Error(`[store/supabase] ${contexte} : ${error.message}`);
}

/* ──────────────────────────────────────────────────────────────────
   LECTURE
   ────────────────────────────────────────────────────────────────── */

/* Dernière lecture réussie. Si la base devient injoignable en pleine
   journée, le site continue de servir le contenu du client plutôt que de
   retomber brutalement sur les valeurs par défaut. */
let dernierSucces: Partial<Content> | null = null;

/**
 * Lecture d'une table AJOUTÉE APRÈS la première mise en production.
 *
 * `agences` et `medias` n'existent pas tant que `supabase/schema.sql`
 * n'a pas été rejoué. Les traiter comme les autres ferait échouer TOUTE
 * la lecture — donc tomber le site entier — pour une table que personne
 * n'utilise encore. On journalise et on rend une liste vide : les écrans
 * concernés s'affichent vides, le reste du site continue.
 */
async function lireTableOptionnelle<T>(
  table: string,
  requete: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  try {
    const { data, error } = await requete();
    if (error) {
      console.error(
        `[store/supabase] table « ${table} » illisible (schema.sql à rejouer ?) :`,
        error.message,
      );
      return [];
    }
    return (data ?? []) as T[];
  } catch (e) {
    console.error(
      `[store/supabase] table « ${table} » illisible :`,
      (e as Error).message,
    );
    return [];
  }
}

export async function read(): Promise<Partial<Content>> {
  try {
    const db = sb();
    const [contenu, articles, annonces, agences, medias] = await Promise.all([
      db.from("content").select("key, value, updated_at"),
      db
        .from("articles")
        .select("*")
        /* Les plus récents d'abord, les non datés (brouillons) en tête :
           c'est l'ordre attendu par l'écran d'administration, et les pages
           publiques retrient de toute façon ce qu'elles affichent. */
        .order("publie_le", { ascending: false, nullsFirst: true })
        .order("slug", { ascending: true }),
      db.from("annonce_overrides").select("*").order("ref", { ascending: true }),
      lireTableOptionnelle<LigneAgence>("agences", () =>
        db
          .from("agences")
          .select("*")
          .order("ordre", { ascending: true })
          .order("nom", { ascending: true }),
      ),
      lireTableOptionnelle<LigneMedia>("medias", () =>
        db.from("medias").select("*").order("created_at", { ascending: false }),
      ),
    ]);

    verifier("lecture de content", contenu.error);
    verifier("lecture de articles", articles.error);
    verifier("lecture de annonce_overrides", annonces.error);

    const lignesContenu = (contenu.data ?? []) as LigneContent[];
    const lignesArticles = (articles.data ?? []) as LigneArticle[];
    const lignesAnnonces = (annonces.data ?? []) as LigneAnnonce[];
    const parCle = new Map(lignesContenu.map((l) => [l.key, l.value]));

    const data: Partial<Content> = {
      seo: (parCle.get("seo") as SeoEntry[] | undefined) ?? [],
      realisations: (parCle.get("realisations") as Realisation[] | undefined) ?? [],
      /* Domaine absent = domaine jamais enregistré : on laisse le
         sélecteur poser les valeurs par défaut, comme pour le fichier. */
      tracking: parCle.get("tracking") as TrackingConfig | undefined,
      textes: parCle.get("textes") as Textes | undefined,
      menus: parCle.get("menus") as Menus | undefined,
      reglages: parCle.get("reglages") as Reglages | undefined,
      /* Seules les `valeur` de ce tableau sont relues : la structure des
         pages vient du code (voir `fusionnerPages` dans ./index). */
      pages: parCle.get("pages") as PageEditable[] | undefined,
      articles: lignesArticles.map(articleVersTs),
      annonces: lignesAnnonces.map(annonceVersTs),
      agences: agences.map(agenceVersTs),
      medias: medias.map(mediaVersTs),
      /* La dernière écriture, tous domaines confondus : le maximum des
         `updated_at` rendus par les requêtes. */
      majLe: derniereMaj([
        ...lignesContenu.map((l) => l.updated_at),
        ...lignesArticles.map((l) => l.updated_at),
        ...lignesAnnonces.map((l) => l.updated_at),
        ...agences.map((l) => l.updated_at),
        ...medias.map((l) => l.updated_at),
      ]),
    };

    dernierSucces = data;
    return data;
  } catch (e) {
    console.error("[store/supabase] lecture impossible :", (e as Error).message);
    /* Le site public doit rester debout : le contenu précédent s'il existe,
       les valeurs par défaut sinon (posées par le sélecteur). */
    return dernierSucces ?? {};
  }
}

function derniereMaj(dates: (string | null | undefined)[]): string | undefined {
  let max: number | null = null;
  for (const d of dates) {
    if (!d) continue;
    const t = new Date(d).getTime();
    if (!Number.isNaN(t) && (max === null || t > max)) max = t;
  }
  return max === null ? undefined : new Date(max).toISOString();
}

/* ──────────────────────────────────────────────────────────────────
   ÉCRITURE
   ────────────────────────────────────────────────────────────────── */

/** Les domaines rangés en JSONB dans la table `content`. */
type DomaineJson =
  | "seo"
  | "realisations"
  | "tracking"
  | "textes"
  | "menus"
  | "reglages"
  | "pages";

const DOMAINES_JSON: DomaineJson[] = [
  "seo",
  "realisations",
  "tracking",
  "textes",
  "menus",
  "reglages",
  "pages",
];

/** Un domaine JSONB de la table `content`. */
async function ecrireDomaine(
  key: DomaineJson,
  value: unknown,
  auteur: Auteur,
): Promise<void> {
  const db = sb();
  const actuel = await db
    .from("content")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  verifier(`lecture de content:${key}`, actuel.error);

  const avant = (actuel.data as { value: unknown } | null)?.value ?? null;
  if (JSON.stringify(avant) === JSON.stringify(value)) return;

  await journaliser([{ scope: `content:${key}`, snapshot: avant ?? {} }], auteur);
  const { error } = await db
    .from("content")
    .upsert({ key, value, updated_by: auteur }, { onConflict: "key" });
  verifier(`écriture de content:${key}`, error);
}

/**
 * Aligne la table `articles` sur la liste reçue.
 *
 * Le back-office raisonne en liste complète : il renvoie tous les articles
 * à chaque enregistrement. Le delta se calcule donc ici — sinon la
 * correction d'une virgule réécrirait le blog entier et noierait le
 * journal. La clé fonctionnelle est le `slug` (c'est l'URL) ; l'`id`
 * technique ne sort jamais de ce module, il sert au journal et aux mises
 * à jour.
 */
async function ecrireArticles(liste: Article[], auteur: Auteur): Promise<void> {
  const db = sb();
  const actuel = await db.from("articles").select("*");
  verifier("lecture de articles", actuel.error);

  const existantes = (actuel.data ?? []) as LigneArticle[];
  const parSlug = new Map(existantes.map((l) => [l.slug, l]));

  const versions: Version[] = [];
  const aEcrire: (ColonnesArticle & { id: string; updated_by: Auteur })[] = [];
  const gardes = new Set<string>();

  for (const article of liste) {
    const colonnes = articleVersSql(article);
    const ancienne = parSlug.get(article.slug);
    gardes.add(article.slug);

    if (!ancienne) {
      /* Création : l'uuid est tiré ici pour que le journal puisse désigner
         la ligne dès la modification suivante. Une création n'a pas d'état
         antérieur — sa trace est la colonne `created_at` de la ligne
         elle-même, pas une version vide. */
      aEcrire.push({ id: randomUUID(), ...colonnes, updated_by: auteur });
      continue;
    }
    if (inchange(colonnes, ancienne as unknown as Record<string, unknown>)) continue;
    versions.push({ scope: `article:${ancienne.id}`, snapshot: ancienne });
    aEcrire.push({ id: ancienne.id, ...colonnes, updated_by: auteur });
  }

  const aSupprimer = existantes.filter((l) => !gardes.has(l.slug));
  for (const l of aSupprimer) versions.push({ scope: `article:${l.id}`, snapshot: l });

  await journaliser(versions, auteur);

  if (aEcrire.length) {
    const { error } = await db.from("articles").upsert(aEcrire, { onConflict: "id" });
    verifier("écriture de articles", error);
  }
  if (aSupprimer.length) {
    const { error } = await db
      .from("articles")
      .delete()
      .in(
        "id",
        aSupprimer.map((l) => l.id),
      );
    verifier("suppression d'articles", error);
  }
}

/**
 * Aligne `annonce_overrides` sur la liste reçue.
 *
 * ⚠ Ce ne sont pas les annonces : Vitahome reste la source. On ne stocke
 * que les écarts voulus par le client, indexés sur la référence du flux.
 */
async function ecrireAnnonces(
  liste: AnnonceOverride[],
  auteur: Auteur,
): Promise<void> {
  const db = sb();
  const actuel = await db.from("annonce_overrides").select("*");
  verifier("lecture de annonce_overrides", actuel.error);

  const existantes = (actuel.data ?? []) as LigneAnnonce[];
  const parRef = new Map(existantes.map((l) => [l.ref, l]));

  const versions: Version[] = [];
  const aEcrire: (ColonnesAnnonce & { updated_by: Auteur })[] = [];
  const gardes = new Set<string>();

  for (const override of liste) {
    const colonnes = annonceVersSql(override);
    const ancienne = parRef.get(override.ref);
    gardes.add(override.ref);

    if (ancienne) {
      if (inchange(colonnes, ancienne as unknown as Record<string, unknown>)) continue;
      versions.push({ scope: `annonce:${ancienne.ref}`, snapshot: ancienne });
    }
    aEcrire.push({ ...colonnes, updated_by: auteur });
  }

  const aSupprimer = existantes.filter((l) => !gardes.has(l.ref));
  for (const l of aSupprimer) versions.push({ scope: `annonce:${l.ref}`, snapshot: l });

  await journaliser(versions, auteur);

  if (aEcrire.length) {
    const { error } = await db
      .from("annonce_overrides")
      .upsert(aEcrire, { onConflict: "ref" });
    verifier("écriture de annonce_overrides", error);
  }
  if (aSupprimer.length) {
    const { error } = await db
      .from("annonce_overrides")
      .delete()
      .in(
        "ref",
        aSupprimer.map((l) => l.ref),
      );
    verifier("suppression de surcharges d'annonces", error);
  }
}

/**
 * Aligne `agences` sur la liste reçue — même logique de delta que le blog.
 *
 * La clé est l'`id` : le nom d'une agence peut changer (déménagement,
 * renommage) sans que ce soit une autre agence. Fermer une agence se fait
 * avec `actif: false`, pas en la retirant de la liste : la supprimer
 * ferait perdre ses villes, sa fiche et son historique.
 */
async function ecrireAgences(liste: Agence[], auteur: Auteur): Promise<void> {
  const db = sb();
  const actuel = await db.from("agences").select("*");
  verifier("lecture de agences", actuel.error);

  const existantes = (actuel.data ?? []) as LigneAgence[];
  const parId = new Map(existantes.map((l) => [l.id, l]));

  const versions: Version[] = [];
  const aEcrire: (ColonnesAgence & { id: string; updated_by: Auteur })[] = [];
  const gardes = new Set<string>();

  for (const agence of liste) {
    /* ⚠ PAS DE `uuidValide()` ICI, ET C'EST TOUT L'ENJEU.
       L'identifiant d'une agence EST son adresse publique. Il était
       passé par `uuidValide()`, qui remplace toute valeur non conforme
       par un uuid tiré au hasard : le slug lisible calculé par l'écran
       d'administration — « agence-de-tartas » — était donc jeté à
       l'écriture, et l'agence se retrouvait à /agences/6f3a1b2c-…

       Personne ne le voyait : l'écriture réussissait, la fiche
       s'affichait, seule l'URL était illisible. Et le commentaire de
       l'écran affirmait le contraire, ce qui garantissait qu'on ne
       cherche pas là.

       `slugAgence()` normalise sans dénaturer, et ne tire au sort qu'en
       tout dernier recours — un nom composé uniquement de caractères
       non latins, par exemple. */
    const id = slugAgence(agence.id, agence.nom);
    const colonnes = agenceVersSql(agence);
    const ancienne = parId.get(id);
    gardes.add(id);

    if (ancienne) {
      if (inchange(colonnes, ancienne as unknown as Record<string, unknown>)) continue;
      versions.push({ scope: `agence:${id}`, snapshot: ancienne });
    }
    aEcrire.push({ id, ...colonnes, updated_by: auteur });
  }

  const aSupprimer = existantes.filter((l) => !gardes.has(l.id));
  for (const l of aSupprimer) versions.push({ scope: `agence:${l.id}`, snapshot: l });

  await journaliser(versions, auteur);

  if (aEcrire.length) {
    const { error } = await db.from("agences").upsert(aEcrire, { onConflict: "id" });
    verifier("écriture de agences", error);
  }
  if (aSupprimer.length) {
    const { error } = await db
      .from("agences")
      .delete()
      .in(
        "id",
        aSupprimer.map((l) => l.id),
      );
    verifier("suppression d'agences", error);
  }
}

/**
 * Met à jour les FICHES de la médiathèque — le texte alternatif, pour
 * l'essentiel.
 *
 * ⚠ AUCUNE SUPPRESSION ICI, contrairement aux autres domaines, et c'est
 * délibéré pour deux raisons :
 *   · le fichier vit dans le bucket, pas dans cette table : effacer la
 *     ligne laisserait l'objet orphelin dans le stockage, facturé et
 *     invisible. La suppression passe par `supprimerMedia()`
 *     (`src/lib/medias.ts`), qui fait les deux ;
 *   · un téléversement écrit directement dans cette table. Un delta
 *     destructif effacerait l'image qu'un collègue vient d'ajouter
 *     pendant qu'un autre corrigeait un texte alternatif.
 */
async function ecrireMedias(liste: Media[], auteur: Auteur): Promise<void> {
  const db = sb();
  const actuel = await db.from("medias").select("*");
  verifier("lecture de medias", actuel.error);

  const existantes = (actuel.data ?? []) as LigneMedia[];
  const parId = new Map(existantes.map((l) => [l.id, l]));

  const versions: Version[] = [];
  const aEcrire: Record<string, unknown>[] = [];

  for (const media of liste) {
    const ancienne = parId.get(media.id);
    /* Une fiche dont le fichier n'existe pas en base n'a pas de chemin
       vérifiable : on ne la crée pas depuis cet écran, elle naît du
       téléversement. */
    if (!ancienne) continue;
    const colonnes = {
      alt: obligatoire(media.alt),
      nom: obligatoire(media.nom) || ancienne.nom,
    };
    if (inchange(colonnes, ancienne as unknown as Record<string, unknown>)) continue;
    versions.push({ scope: `media:${media.id}`, snapshot: ancienne });
    aEcrire.push({ id: media.id, ...colonnes, updated_by: auteur });
  }

  await journaliser(versions, auteur);

  if (aEcrire.length) {
    const { error } = await db.from("medias").upsert(aEcrire, { onConflict: "id" });
    verifier("écriture de medias", error);
  }
}

/** Écrit un seul domaine — ce que fait le back-office à chaque enregistrement. */
export async function patch<K extends keyof Content>(
  key: K,
  value: Content[K],
): Promise<void> {
  const auteur = await auteurCourant();

  if (DOMAINES_JSON.includes(key as DomaineJson)) {
    await ecrireDomaine(key as DomaineJson, value, auteur);
    return;
  }
  switch (key) {
    case "articles":
      await ecrireArticles((value ?? []) as Article[], auteur);
      return;
    case "annonces":
      await ecrireAnnonces((value ?? []) as AnnonceOverride[], auteur);
      return;
    case "agences":
      await ecrireAgences((value ?? []) as Agence[], auteur);
      return;
    case "medias":
      await ecrireMedias((value ?? []) as Media[], auteur);
      return;
    default:
      /* `v` et `majLe` sont dérivés : la version du schéma est portée par
         le code, l'horodatage par les triggers SQL. Rien à écrire. */
      return;
  }
}

/** Écrit l'ensemble. Rare : le back-office passe par `patch`, domaine par domaine. */
export async function write(data: Content): Promise<void> {
  const auteur = await auteurCourant();
  await ecrireDomaine("seo", data.seo, auteur);
  await ecrireDomaine("tracking", data.tracking, auteur);
  await ecrireDomaine("textes", data.textes, auteur);
  await ecrireDomaine("menus", data.menus, auteur);
  await ecrireDomaine("reglages", data.reglages, auteur);
  await ecrireDomaine("pages", data.pages, auteur);
  await ecrireArticles(data.articles, auteur);
  await ecrireAnnonces(data.annonces, auteur);
  await ecrireAgences(data.agences ?? [], auteur);
  await ecrireMedias(data.medias ?? [], auteur);
}

/* ──────────────────────────────────────────────────────────────────
   DISPONIBILITÉ
   ────────────────────────────────────────────────────────────────── */

/* La sonde est appelée à chaque rendu d'écran d'administration : sans ce
   mémo, chaque page ajouterait un aller-retour réseau. */
let sonde: { ok: boolean; at: number } | null = null;
const SONDE_TTL = 5_000;

/**
 * Vrai si la base répond.
 *
 * On interroge en lecture plutôt qu'en écriture : avec la clé
 * `service_role` le RLS est contourné, donc qui lit écrit. Une sonde en
 * écriture salirait la base à chaque affichage du tableau de bord.
 */
export async function writable(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  if (sonde && Date.now() - sonde.at < SONDE_TTL) return sonde.ok;
  try {
    const { error } = await sb().from("content").select("key").limit(1);
    sonde = { ok: !error, at: Date.now() };
  } catch {
    sonde = { ok: false, at: Date.now() };
  }
  return sonde.ok;
}
