import "server-only";
import { Pool, types } from "pg";

/* ════════════════════════════════════════════════════════════════
   BASE POSTGRES — la connexion, et rien d'autre

   Le site parlait à Postgres À TRAVERS Supabase (PostgREST, GoTrue,
   Storage) : trois services américains entre le serveur et ses données.
   L'hébergement souverain demandé par le client (Clever Cloud, Paris)
   fournit un Postgres nu. On s'y connecte donc directement, en SQL, avec
   `pg` — la bibliothèque de référence, sans ORM : les requêtes du site
   tiennent en une poignée de SELECT et d'upserts, et le mapping
   snake_case ⇄ camelCase est déjà écrit à la main dans le magasin.

   LE SCHÉMA FAIT FOI : `db/schema.sql`.

   CONFIGURATION, dans cet ordre :
     · DATABASE_URL — l'adresse complète, nom standard partout ;
     · POSTGRESQL_ADDON_URI — injectée par Clever Cloud dès que l'add-on
       PostgreSQL est lié à l'application : rien à recopier.
   Sans l'une ni l'autre, le site retombe sur le pilote fichier, comme
   avant : il se construit et tourne en local sans base.

   ⚠ CE MODULE NE DOIT JAMAIS ATTEINDRE LE NAVIGATEUR : l'adresse porte
   le mot de passe de la base. D'où `server-only` en tête de fichier.
   ════════════════════════════════════════════════════════════════ */

/* Lue à la requête : une constante de module fige la valeur dans les
   artefacts de build — un déploiement a déjà échoué pour cela. */
const urlBase = (): string =>
  (process.env.DATABASE_URL || process.env.POSTGRESQL_ADDON_URI || "").trim();

/**
 * LA détection de « la base est configurée », pour tout le projet : le
 * magasin, la médiathèque et les comptes nommés en dépendent tous.
 *
 * Le schéma de l'URL est exigé, pas seulement sa présence : une adresse
 * tronquée au copier-coller doit être traitée comme absente — le repli
 * fichier + mot de passe partagé est cohérent, une base à moitié
 * configurée ne l'est pas.
 */
export function isBaseConfiguree(): boolean {
  return /^postgres(ql)?:\/\/.+/.test(urlBase());
}

/* ════ TYPES RENDUS PAR POSTGRES ════
   Deux réglages, et ils ne sont pas cosmétiques.

   · `timestamptz` en chaîne ISO « …Z ». Par défaut `pg` rend un objet
     Date. Or le magasin compare les colonnes écrites à la ligne en base
     par `JSON.stringify` pour ne pas créer de version inutile : une Date
     ne serait jamais égale à la chaîne ISO que produit le mapping, et
     chaque enregistrement journaliserait un faux changement de date.

   · `bigint` (int8) en nombre. `pg` le rend en chaîne pour ne pas perdre
     de précision au-delà de 2^53. Nos seuls int8 sont la taille d'un
     fichier (10 Mo au plus) et l'identifiant du journal : on reste très
     loin de la limite, et les gabarits attendent des nombres. */
types.setTypeParser(1184, (v: string) => new Date(v).toISOString());
types.setTypeParser(20, (v: string) => Number(v));

/* Un seul pool par processus. Rangé sur `globalThis` : en développement,
   le rechargement à chaud réévalue ce module à chaque modification, et
   chaque évaluation ouvrirait un pool de plus jusqu'à saturer la base. */
const g = globalThis as typeof globalThis & { __essensyaPool?: Pool };

function pool(): Pool {
  if (!isBaseConfiguree()) {
    throw new Error("La base n'est pas configurée (DATABASE_URL ou POSTGRESQL_ADDON_URI).");
  }
  g.__essensyaPool ??= new Pool({
    connectionString: urlBase(),
    /* ⚠ PETIT À DESSEIN. Les offres Postgres d'entrée de gamme limitent
       le nombre de connexions simultanées, et `next build` prérend les
       pages dans plusieurs processus à la fois — chacun avec son pool.
       Deux connexions par processus suffisent largement à un site
       vitrine ; au-delà, les requêtes attendent leur tour au lieu de
       se faire refuser par la base. */
    max: Number(process.env.PG_POOL_MAX ?? 2),
    /* Une connexion inutilisée est rendue vite : un processus de build
       qui a fini ne doit pas garder ses places jusqu'à sa mort. */
    idleTimeoutMillis: 10_000,
    /* Une base injoignable ne doit pas suspendre une page : sans borne,
       l'écran de connexion tournerait jusqu'au délai de l'hébergeur. */
    connectionTimeoutMillis: 8_000,
  });
  return g.__essensyaPool;
}

/**
 * Exécute une requête paramétrée et rend ses lignes.
 *
 * ⚠ TOUJOURS DES PARAMÈTRES ($1, $2…), JAMAIS DE CONCATÉNATION d'une
 * valeur venue d'un formulaire : c'est ce qui rend l'injection SQL
 * impossible. Seuls des noms de tables et de colonnes écrits en dur
 * dans le code peuvent entrer dans le texte de la requête.
 *
 * ⚠ JSONB : passer `JSON.stringify(valeur)` et caster `$n::jsonb`. Sans
 * cela, `pg` convertit un tableau JavaScript en tableau Postgres
 * (`{a,b}`), que la colonne JSONB refuse — et le domaine `seo` est un
 * tableau.
 */
export async function sql<T = Record<string, unknown>>(
  texte: string,
  valeurs: unknown[] = [],
): Promise<T[]> {
  const { rows } = await pool().query(texte, valeurs);
  return rows as T[];
}

/** Code d'erreur Postgres : la table n'existe pas (schéma pas encore joué). */
export const TABLE_ABSENTE = "42P01";

/** Le code SQLSTATE d'une erreur `pg`, ou "" pour une erreur réseau. */
export const codeErreur = (e: unknown): string =>
  e && typeof e === "object" && "code" in e && typeof e.code === "string" ? e.code : "";

/**
 * Le secret de la base, pour les modules qui en dérivent une clé de
 * repli (signature des sessions). Jamais affiché, jamais journalisé.
 */
export const secretBase = (): string => urlBase();
