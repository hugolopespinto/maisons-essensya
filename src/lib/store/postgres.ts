import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_cache } from "next/cache";
import { codeErreur, isBaseConfiguree, sql, TABLE_ABSENTE } from "@/lib/db";
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
   PILOTE POSTGRES — le contenu en base

   Même contrat que le pilote fichier (`./file`), sur une base managée :
   c'est ce qui rend le back-office utilisable en production. Il
   remplace le pilote Supabase à l'identique — mêmes tables, mêmes
   règles de delta et de journal — mais parle SQL directement à la base
   au lieu de passer par l'API REST de Supabase. Voir `src/lib/db.ts`.

   LE SCHÉMA FAIT FOI : `db/schema.sql`. Trois surfaces de données,
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

   ⚠ snake_case côté SQL, camelCase côté TypeScript. Le mapping est
   écrit à la main, champ par champ, plus bas : aucune conversion
   automatique, donc aucune colonne qui se renomme toute seule le jour
   où quelqu'un ajoute un champ.
   ════════════════════════════════════════════════════════════════ */

/** Nom affiché dans le back-office. */
export const nom = "postgres" as const;

export { isBaseConfiguree };

/* ⚠ CE QUI FAIT QUE LES PAGES PUBLIQUES RESTENT PRÉ-GÉNÉRÉES.

   Le pilote Supabase lisait la base par `fetch` : Next mettait ces
   lectures en cache, étiquetées `TAG_MAGASIN`, et l'écriture invalidait
   l'étiquette. Une requête SQL n'est pas un `fetch` — Next ne la voit
   pas. Sans rien faire, chaque régénération relirait bien la base, mais
   l'étiquette n'invaliderait plus rien : une modification du menu
   resterait invisible sur les pages qui ne sont pas régénérées
   explicitement, jusqu'à leur échéance d'une demi-heure.

   On enveloppe donc la lecture dans `unstable_cache`, avec la même
   étiquette et la même fraîcheur. `invaliderDataCache()` (./index) n'a
   pas à changer : il invalide une étiquette, peu importe ce qu'elle
   couvre.

   ⚠ La doc de Next 16 annonce `unstable_cache` remplacé par la
   directive `use cache` (doc : 04-functions/unstable_cache.md). Elle
   exige d'activer `cacheComponents`, qui change le modèle de rendu de
   TOUT le site : c'est un chantier en soi, pas un détail de migration.
   `unstable_cache` fonctionne sans, et c'est ce qu'on garde ici.

   ⚠ SA VALEUR N'EST PAS LIBRE. Next retient la plus courte des
   fraîcheurs d'une page et de ses données : à 60 s, toutes les pages du
   site se régénéraient chaque minute au lieu de la demi-heure que leur
   code demande (`export const revalidate = 1800`, src/app/agences). On
   s'aligne donc sur cette demi-heure — la donnée ne doit jamais être
   plus pressée que la page qu'elle sert. */
export const TAG_MAGASIN = "magasin-contenu";
const FRAICHEUR = 1800;

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

/** `admins.id` de qui écrit, ou `null` si l'identité est inconnue. */
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
    const [ligne] = await sql<{ id: string }>("select id from admins where email = $1", [
      email,
    ]);
    const id = typeof ligne?.id === "string" ? ligne.id : null;
    memoIdentite = { email, id, at: Date.now() };
    return id;
  } catch {
    return null;
  }
}

/**
 * Qui écrit, en `admins.id`. Exportée pour `src/lib/medias.ts`, qui
 * écrit dans `medias` sans passer par le magasin (le fichier et sa fiche
 * naissent ensemble) et doit renseigner le même `updated_by`.
 */
export async function auteurCourant(): Promise<Auteur> {
  if (!isBaseConfiguree()) return null;
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

/* `src/lib/db.ts` rend déjà les `timestamptz` en ISO « …Z ». On
   normalise quand même ici : une date saisie dans le back-office, ou
   relue d'un instantané écrit par l'ancien pilote, n'a pas forcément
   cette forme. */
const iso = (v: string | null | undefined): string | undefined => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

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
       un client SQL : les gabarits itèrent dessus sans se protéger. */
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
   COMPARAISON
   ────────────────────────────────────────────────────────────────── */

/**
 * `JSON.stringify` à clés triées.
 *
 * Postgres réordonne les clés d'un objet JSONB à l'écriture. Comparer la
 * valeur relue en base à celle que l'écran envoie avec un
 * `JSON.stringify` simple voyait donc un changement à chaque
 * enregistrement d'un objet — et le journal se remplissait de versions
 * identiques à la suivante.
 */
function stable(v: unknown): string {
  return JSON.stringify(v, (_cle, valeur: unknown) =>
    valeur && typeof valeur === "object" && !Array.isArray(valeur)
      ? Object.fromEntries(
          Object.entries(valeur as Record<string, unknown>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : valeur,
  );
}

/** Compare les colonnes écrites à la ligne en base : pas d'écriture inutile, pas de version inutile. */
function inchange(
  colonnes: Record<string, unknown>,
  ligne: Record<string, unknown>,
): boolean {
  return Object.keys(colonnes).every((k) => stable(colonnes[k]) === stable(ligne[k]));
}

/* ──────────────────────────────────────────────────────────────────
   JOURNAL — content_versions
   ────────────────────────────────────────────────────────────────── */

interface Version {
  /** 'content:seo' · 'article:<uuid>' · 'annonce:<ref>' · 'agence:<id>' */
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
  const valeurs: unknown[] = [];
  const tuples = versions.map((v) => {
    valeurs.push(v.scope, JSON.stringify(v.snapshot ?? null), auteur);
    const n = valeurs.length;
    return `($${n - 2}, $${n - 1}::jsonb, $${n})`;
  });
  try {
    await sql(
      `insert into content_versions (scope, snapshot, created_by) values ${tuples.join(", ")}`,
      valeurs,
    );
  } catch (e) {
    console.error(
      "[store/postgres] journal des versions indisponible :",
      (e as Error).message,
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
  if (!isBaseConfiguree()) return;
  await journaliser([{ scope, snapshot }], await auteurCourant());
}

/** Toute erreur SQL remonte avec son contexte : le back-office doit pouvoir dire « non enregistré ». */
async function executer<T>(contexte: string, requete: () => Promise<T>): Promise<T> {
  try {
    return await requete();
  } catch (e) {
    throw new Error(`[store/postgres] ${contexte} : ${(e as Error).message}`);
  }
}

/**
 * Insère ou met à jour plusieurs lignes en une requête.
 *
 * `table`, `cle` et les noms de colonnes viennent du code, jamais d'une
 * saisie : ils peuvent donc entrer dans le texte SQL. Les VALEURS, elles,
 * passent toutes en paramètres. Les colonnes JSONB sont sérialisées et
 * castées à part — voir l'avertissement de `sql()`.
 */
async function upsert(
  table: string,
  cle: string,
  lignes: Record<string, unknown>[],
  colonnesJson: string[] = [],
): Promise<void> {
  if (lignes.length === 0) return;
  const colonnes = Object.keys(lignes[0]);
  const valeurs: unknown[] = [];
  const tuples = lignes.map(
    (ligne) =>
      `(${colonnes
        .map((c) => {
          const json = colonnesJson.includes(c);
          valeurs.push(json ? JSON.stringify(ligne[c] ?? {}) : ligne[c]);
          return `$${valeurs.length}${json ? "::jsonb" : ""}`;
        })
        .join(", ")})`,
  );
  const maj = colonnes
    .filter((c) => c !== cle)
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");
  await sql(
    `insert into ${table} (${colonnes.join(", ")}) values ${tuples.join(", ")} ` +
      `on conflict (${cle}) do update set ${maj}`,
    valeurs,
  );
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
 * `agences` et `medias` n'existaient pas au départ. Une base dont le
 * schéma n'a pas été rejoué ne doit pas faire tomber TOUTE la lecture —
 * donc le site entier — pour une table que personne n'utilise encore.
 *
 * ⚠ SEULE L'ABSENCE DE LA TABLE EST TOLÉRÉE. Toute autre erreur remonte
 * et fait échouer la lecture entière. C'est voulu : la lecture est mise
 * en cache une demi-heure, et une panne passagère avalée ici y figerait
 * une liste d'agences vide — le site afficherait « aucune agence » à
 * tous les visiteurs pendant trente minutes après une coupure d'une
 * seconde. Une lecture qui échoue, elle, n'est pas mise en cache.
 */
async function lireTableOptionnelle<T>(
  table: string,
  requete: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await requete();
  } catch (e) {
    if (codeErreur(e) !== TABLE_ABSENTE) throw e;
    console.error(`[store/postgres] table « ${table} » absente (db/schema.sql à rejouer ?)`);
    return [];
  }
}

async function lireBase(): Promise<Partial<Content>> {
  const [lignesContenu, lignesArticles, lignesAnnonces, agences, medias] = await Promise.all([
    sql<LigneContent>("select key, value, updated_at from content"),
    /* Les plus récents d'abord, les non datés (brouillons) en tête :
       c'est l'ordre attendu par l'écran d'administration, et les pages
       publiques retrient de toute façon ce qu'elles affichent. */
    sql<LigneArticle>("select * from articles order by publie_le desc nulls first, slug asc"),
    sql<LigneAnnonce>("select * from annonce_overrides order by ref asc"),
    lireTableOptionnelle("agences", () =>
      sql<LigneAgence>("select * from agences order by ordre asc, nom asc"),
    ),
    lireTableOptionnelle("medias", () =>
      sql<LigneMedia>("select * from medias order by created_at desc"),
    ),
  ]);

  const parCle = new Map(lignesContenu.map((l) => [l.key, l.value]));

  return {
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
}

/* La lecture mise en cache, étiquetée : voir `TAG_MAGASIN` plus haut. */
const lireEnCache = unstable_cache(lireBase, ["magasin-contenu"], {
  tags: [TAG_MAGASIN],
  revalidate: FRAICHEUR,
});

export async function read(frais = false): Promise<Partial<Content>> {
  try {
    /* ⚠ `frais` : lecture HORS CACHE, pour les écrans qui vont écrire.
       Ils lisent la liste complète, la modifient et la renvoient
       ENTIÈRE : une ligne absente de la liste reçue est supprimée. Lire
       cette liste dans un cache, c'est risquer d'effacer ce qui a été
       créé depuis l'instantané, sans message ni erreur. */
    const data = frais ? await lireBase() : await lireEnCache();
    dernierSucces = data;
    return data;
  } catch (e) {
    console.error("[store/postgres] lecture impossible :", (e as Error).message);
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
  /* `undefined` n'est pas une valeur JSON : rien à écrire. */
  if (value === undefined) return;

  const [actuel] = await executer(`lecture de content:${key}`, () =>
    sql<{ value: unknown }>("select value from content where key = $1", [key]),
  );

  const avant = actuel?.value ?? null;
  if (stable(avant) === stable(value)) return;

  await journaliser([{ scope: `content:${key}`, snapshot: avant ?? {} }], auteur);
  await executer(`écriture de content:${key}`, () =>
    sql(
      `insert into content (key, value, updated_by) values ($1, $2::jsonb, $3)
       on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by`,
      [key, JSON.stringify(value), auteur],
    ),
  );
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
  const existantes = await executer("lecture de articles", () =>
    sql<LigneArticle>("select * from articles"),
  );
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

  await executer("écriture de articles", () => upsert("articles", "id", aEcrire, ["seo"]));
  if (aSupprimer.length) {
    await executer("suppression d'articles", () =>
      sql("delete from articles where id = any($1::uuid[])", [aSupprimer.map((l) => l.id)]),
    );
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
  const existantes = await executer("lecture de annonce_overrides", () =>
    sql<LigneAnnonce>("select * from annonce_overrides"),
  );
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

  await executer("écriture de annonce_overrides", () =>
    upsert("annonce_overrides", "ref", aEcrire, ["seo"]),
  );
  if (aSupprimer.length) {
    await executer("suppression de surcharges d'annonces", () =>
      sql("delete from annonce_overrides where ref = any($1::text[])", [
        aSupprimer.map((l) => l.ref),
      ]),
    );
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
  const existantes = await executer("lecture de agences", () =>
    sql<LigneAgence>("select * from agences"),
  );
  const parId = new Map(existantes.map((l) => [l.id, l]));

  const versions: Version[] = [];
  const aEcrire: (ColonnesAgence & { id: string; updated_by: Auteur })[] = [];
  const gardes = new Set<string>();

  for (const agence of liste) {
    /* ⚠ L'identifiant d'une agence EST son adresse publique.
       `slugAgence()` normalise sans dénaturer, et ne tire au sort qu'en
       tout dernier recours — un nom composé uniquement de caractères
       non latins, par exemple. Ne jamais le remplacer par un uuid : le
       slug lisible serait jeté à l'écriture, et l'agence se
       retrouverait à /agences/6f3a1b2c-… sans que rien ne le signale. */
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

  await executer("écriture de agences", () => upsert("agences", "id", aEcrire));
  if (aSupprimer.length) {
    await executer("suppression d'agences", () =>
      sql("delete from agences where id = any($1::text[])", [aSupprimer.map((l) => l.id)]),
    );
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
 *
 * ⚠ UPDATE ET NON UPSERT : une fiche ne naît que du téléversement. Un
 * upsert partiel tenterait d'insérer une ligne sans `chemin`, que la
 * contrainte NOT NULL refuserait.
 */
async function ecrireMedias(liste: Media[], auteur: Auteur): Promise<void> {
  const existantes = await executer("lecture de medias", () =>
    sql<LigneMedia>("select * from medias"),
  );
  const parId = new Map(existantes.map((l) => [l.id, l]));

  const versions: Version[] = [];
  const aEcrire: { id: string; alt: string; nom: string }[] = [];

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
    aEcrire.push({ id: media.id, ...colonnes });
  }

  await journaliser(versions, auteur);

  for (const m of aEcrire) {
    await executer("écriture de medias", () =>
      sql("update medias set alt = $2, nom = $3, updated_by = $4 where id = $1", [
        m.id,
        m.alt,
        m.nom,
        auteur,
      ]),
    );
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
 * On interroge en lecture plutôt qu'en écriture : le serveur est
 * propriétaire de la base, donc qui lit écrit. Une sonde en écriture
 * salirait la base à chaque affichage du tableau de bord.
 */
export async function writable(): Promise<boolean> {
  if (!isBaseConfiguree()) return false;
  if (sonde && Date.now() - sonde.at < SONDE_TTL) return sonde.ok;
  try {
    await sql("select key from content limit 1");
    sonde = { ok: true, at: Date.now() };
  } catch {
    sonde = { ok: false, at: Date.now() };
  }
  return sonde.ok;
}
