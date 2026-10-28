/* ════════════════════════════════════════════════════════════════
   MIGRATION SUPABASE → CLEVER CLOUD (PostgreSQL + Cellar)

   À lancer UNE fois, au moment de la bascule, depuis un poste qui voit
   les deux côtés :

     SUPABASE_URL=https://xxxx.supabase.co \
     SUPABASE_SERVICE_ROLE_KEY=… \
     DATABASE_URL=postgresql://…            (base Clever Cloud) \
     CELLAR_ADDON_HOST=… CELLAR_ADDON_KEY_ID=… CELLAR_ADDON_KEY_SECRET=… \
     S3_BUCKET=… \
     NEXT_PUBLIC_SITE_URL=https://… \
       node scripts/migrer-depuis-supabase.mjs [--essai]

   `--essai` lit Supabase et affiche ce qui serait copié, sans rien
   écrire nulle part.

   CE QUI EST COPIÉ, dans l'ordre imposé par les clés étrangères :
     1. les comptes (`admins`), AVEC LEUR IDENTIFIANT d'origine : le
        journal et les colonnes `updated_by` les désignent par lui ;
     2. le contenu, les articles, les surcharges d'annonces, les
        agences, les fiches de médias, le journal des versions ;
     3. les FICHIERS de la médiathèque, du bucket Supabase vers Cellar.

   CE QUI NE L'EST PAS : les mots de passe. Ils vivent dans Supabase
   Auth, hors de notre schéma. Chaque compte migré reçoit un lien
   d'accès, affiché en fin de script, pour choisir un nouveau mot de
   passe sur le nouvel hébergement.

   RELANÇABLE : une ligne déjà présente n'est pas réécrite (on conflict
   do nothing), un fichier déjà déposé est simplement redéposé.

   Prérequis : `db/schema.sql` exécuté sur la base Clever Cloud, et le
   bucket Cellar créé.
   ════════════════════════════════════════════════════════════════ */

import { createHash, randomBytes } from "node:crypto";
import { AwsClient } from "aws4fetch";
import pg from "pg";

const ESSAI = process.argv.includes("--essai");

/* ── Configuration ─────────────────────────────────────────────── */

const env = (...noms) => {
  for (const nom of noms) {
    const v = (process.env[nom] ?? "").trim();
    if (v) return v;
  }
  return "";
};

const SB_URL = env("SUPABASE_URL").replace(/\/+$/, "");
const SB_CLE = env("SUPABASE_SERVICE_ROLE_KEY");
const PG_URL = env("DATABASE_URL", "POSTGRESQL_ADDON_URI");
const S3_HOTE = env("S3_ENDPOINT", "CELLAR_ADDON_HOST").replace(/\/+$/, "");
const S3_CLE = env("S3_ACCESS_KEY_ID", "CELLAR_ADDON_KEY_ID");
const S3_SECRET = env("S3_SECRET_ACCESS_KEY", "CELLAR_ADDON_KEY_SECRET");
const S3_BUCKET = env("S3_BUCKET");
const S3_REGION = env("S3_REGION") || "us-east-1";
const SITE = env("NEXT_PUBLIC_SITE_URL").replace(/\/+$/, "");

const manquantes = [
  ["SUPABASE_URL", SB_URL],
  ["SUPABASE_SERVICE_ROLE_KEY", SB_CLE],
  ...(ESSAI
    ? []
    : [
        ["DATABASE_URL", PG_URL],
        ["CELLAR_ADDON_HOST / S3_ENDPOINT", S3_HOTE],
        ["CELLAR_ADDON_KEY_ID / S3_ACCESS_KEY_ID", S3_CLE],
        ["CELLAR_ADDON_KEY_SECRET / S3_SECRET_ACCESS_KEY", S3_SECRET],
        ["S3_BUCKET", S3_BUCKET],
      ]),
]
  .filter(([, v]) => !v)
  .map(([nom]) => nom);

if (manquantes.length) {
  console.error(`Variables manquantes : ${manquantes.join(", ")}`);
  process.exit(1);
}

/* ── Lecture Supabase (API REST, avec la clé de service) ───────── */

/* Les nouvelles clés Supabase (`sb_secret_…`) ne sont pas des JWT : elles
   passent dans `apikey` seulement. Les anciennes clés JWT vont aussi en
   `Authorization`. */
const entetesSupabase = SB_CLE.startsWith("sb_")
  ? { apikey: SB_CLE }
  : { apikey: SB_CLE, Authorization: `Bearer ${SB_CLE}` };

/** Toutes les lignes d'une table, par pages de 1 000 (plafond de PostgREST). */
async function lireTable(table, ordre) {
  const lignes = [];
  for (let debut = 0; ; debut += 1000) {
    const url = `${SB_URL}/rest/v1/${table}?select=*&order=${ordre}.asc&limit=1000&offset=${debut}`;
    const r = await fetch(url, { headers: entetesSupabase });
    if (r.status === 404) {
      console.warn(`  · table « ${table} » absente côté Supabase : ignorée`);
      return lignes;
    }
    if (!r.ok) throw new Error(`Lecture de ${table} : HTTP ${r.status} ${await r.text()}`);
    const page = await r.json();
    lignes.push(...page);
    if (page.length < 1000) return lignes;
  }
}

/* ── Écriture Postgres ─────────────────────────────────────────── */

/**
 * Insère des lignes en conservant leurs identifiants et leurs dates.
 * `colonnes` liste ce que le nouveau schéma attend : une colonne
 * supplémentaire côté Supabase est ignorée, une colonne absente prend
 * sa valeur par défaut.
 *
 * `conflit` : ce qui se passe quand la ligne existe déjà. Par défaut,
 * rien — c'est ce qui rend le script relançable.
 */
async function inserer(db, table, colonnes, lignes, { json = [], cle, conflit = "do nothing" }) {
  let copiees = 0;
  for (const ligne of lignes) {
    const presentes = colonnes.filter((c) => ligne[c] !== undefined);
    const valeurs = presentes.map((c) =>
      json.includes(c) ? JSON.stringify(ligne[c] ?? null) : ligne[c],
    );
    const parametres = presentes.map((c, i) => `$${i + 1}${json.includes(c) ? "::jsonb" : ""}`);
    const r = await db.query(
      `insert into ${table} (${presentes.join(", ")}) values (${parametres.join(", ")})
       on conflict (${cle}) ${conflit}`,
      valeurs,
    );
    copiees += r.rowCount ?? 0;
  }
  return copiees;
}

/* ── Fichiers : Supabase Storage → Cellar ──────────────────────── */

const s3 = new AwsClient({
  accessKeyId: S3_CLE || "essai",
  secretAccessKey: S3_SECRET || "essai",
  service: "s3",
  region: S3_REGION,
});

const encoderChemin = (chemin) => chemin.split("/").map(encodeURIComponent).join("/");
const origineS3 = /^https?:\/\//i.test(S3_HOTE) ? S3_HOTE : `https://${S3_HOTE}`;

async function copierFichier(chemin, type) {
  const source = await fetch(
    `${SB_URL}/storage/v1/object/medias/${encoderChemin(chemin)}`,
    { headers: entetesSupabase },
  );
  if (!source.ok) throw new Error(`téléchargement : HTTP ${source.status}`);
  const contenu = await source.arrayBuffer();

  const depot = await s3.fetch(
    `${origineS3}/${encodeURIComponent(S3_BUCKET)}/${encoderChemin(chemin)}`,
    { method: "PUT", body: contenu, headers: { "Content-Type": type || "application/octet-stream" } },
  );
  if (!depot.ok) throw new Error(`dépôt Cellar : HTTP ${depot.status} ${await depot.text()}`);
  return contenu.byteLength;
}

/* ── Déroulé ───────────────────────────────────────────────────── */

console.log(`Lecture de Supabase (${SB_URL})…`);

const source = {
  admins: await lireTable("admins", "created_at"),
  content: await lireTable("content", "key"),
  articles: await lireTable("articles", "id"),
  annonce_overrides: await lireTable("annonce_overrides", "ref"),
  agences: await lireTable("agences", "id"),
  medias: await lireTable("medias", "id"),
  content_versions: await lireTable("content_versions", "id"),
};

for (const [table, lignes] of Object.entries(source)) {
  console.log(`  ${table.padEnd(18)} ${lignes.length} ligne(s)`);
}

/* ⚠ Pas de `process.exit()` une fois des requêtes réseau parties : sous
   Windows, Node peut planter à la sortie (« Assertion failed … async.c »)
   pendant que les connexions de `fetch` se ferment. On fixe le code de
   sortie et on laisse le script se terminer de lui-même. */
if (ESSAI) {
  console.log("\n--essai : rien n'a été écrit.");
} else {
  await migrer();
}

async function migrer() {
  const db = new pg.Client({ connectionString: PG_URL });
  await db.connect();

  try {
    await db.query("select 1 from admins limit 1");
  } catch {
    console.error("\nLa table « admins » est absente : exécutez d'abord db/schema.sql sur la base.");
    await db.end();
    process.exitCode = 1;
    return;
  }

  /* Les comptes d'abord : ils sont la cible des clés étrangères. Dans
     Supabase, la clé s'appelait `user_id` (elle pointait vers auth.users). */
  const admins = source.admins.map((a) => ({
    id: a.user_id,
    email: String(a.email ?? "").trim().toLowerCase(),
    role: a.role === "admin" ? "admin" : "editeur",
    created_at: a.created_at,
  }));
  const idsAdmins = new Set(admins.map((a) => a.id));

  /* Un auteur qui n'est pas dans `admins` (compte Supabase créé à la main,
     puis jamais rattaché) ferait échouer la clé étrangère : on garde la
     ligne, sans auteur. */
  const auteur = (id) => (id && idsAdmins.has(id) ? id : null);
  const avecAuteur = (lignes, colonne = "updated_by") =>
    lignes.map((l) => ({ ...l, [colonne]: auteur(l[colonne]) }));

  console.log("\nÉcriture dans la base Clever Cloud…");

  const bilan = {
    admins: await inserer(db, "admins", ["id", "email", "role", "created_at"], admins, { cle: "id" }),
    content: await inserer(
      db,
      "content",
      ["key", "value", "updated_at", "updated_by"],
      avecAuteur(source.content),
      {
        json: ["value"],
        cle: "key",
        /* ⚠ `db/schema.sql` AMORCE cette table avec des valeurs vides.
           « Ne rien faire si la ligne existe » garderait donc l'amorce à
           la place des textes du client. On remplace — mais seulement
           une ligne que le site n'a jamais modifiée, ce qui se lit à
           l'absence de version au journal pour cette clé : une relance
           après la bascule n'écrase rien de ce qui a été saisi depuis.
           (Le journal est copié APRÈS cette table, d'où l'effet voulu au
           premier passage.) */
        conflit: `do update set value = excluded.value, updated_at = excluded.updated_at,
                    updated_by = excluded.updated_by
                  where not exists (select 1 from content_versions v
                                     where v.scope = 'content:' || content.key)`,
      },
    ),
    articles: await inserer(
      db,
      "articles",
      [
        "id", "slug", "titre", "chapo", "corps", "image", "image_alt", "publie_le",
        "auteur", "brouillon", "seo", "created_at", "updated_at", "updated_by",
      ],
      avecAuteur(source.articles),
      { json: ["seo"], cle: "id" },
    ),
    annonce_overrides: await inserer(
      db,
      "annonce_overrides",
      ["ref", "titre", "accroche", "coup_de_coeur", "masquee", "seo", "updated_at", "updated_by"],
      avecAuteur(source.annonce_overrides),
      { json: ["seo"], cle: "ref" },
    ),
    agences: await inserer(
      db,
      "agences",
      [
        "id", "nom", "zone", "adresse", "telephone", "email", "horaires", "lat", "lng",
        "image", "villes", "description", "actif", "ordre", "created_at", "updated_at",
        "updated_by",
      ],
      avecAuteur(source.agences),
      { cle: "id" },
    ),
    medias: await inserer(
      db,
      "medias",
      [
        "id", "chemin", "nom", "alt", "type", "taille", "largeur", "hauteur",
        "created_at", "updated_at", "updated_by",
      ],
      avecAuteur(source.medias),
      { cle: "id" },
    ),
    content_versions: await inserer(
      db,
      "content_versions",
      ["id", "scope", "snapshot", "created_at", "created_by"],
      avecAuteur(source.content_versions, "created_by"),
      { json: ["snapshot"], cle: "id" },
    ),
  };

  /* Les identifiants du journal ont été copiés tels quels : la séquence
     doit repartir après le plus grand, sinon la prochaine écriture
     heurterait une ligne existante. */
  await db.query(
    `select setval(pg_get_serial_sequence('content_versions', 'id'),
                   greatest((select coalesce(max(id), 0) from content_versions), 1))`,
  );

  for (const [table, n] of Object.entries(bilan)) {
    console.log(`  ${table.padEnd(18)} ${n} ligne(s) copiée(s)`);
  }

  /* ── Fichiers ── */
  console.log("\nCopie des fichiers de la médiathèque vers Cellar…");
  let fichiersOk = 0;
  const fichiersKo = [];
  for (const m of source.medias) {
    try {
      const octets = await copierFichier(m.chemin, m.type);
      fichiersOk += 1;
      console.log(`  ✓ ${m.chemin} (${Math.round(octets / 1024)} Ko)`);
    } catch (e) {
      fichiersKo.push(m.chemin);
      console.error(`  ✗ ${m.chemin} — ${e.message}`);
    }
  }
  console.log(`  ${fichiersOk} fichier(s) copié(s), ${fichiersKo.length} en échec.`);

  /* ── Liens d'accès ── */
  console.log("\nLiens d'accès (usage unique, 72 h) — à transmettre à chaque personne :");
  for (const a of admins) {
    const jeton = randomBytes(32).toString("base64url");
    /* Un compte qui a déjà choisi son mot de passe (script relancé) ne
       reçoit pas de nouveau lien : il n'en a plus besoin. */
    const r = await db.query(
      `update admins set jeton = $2, jeton_expire = $3
        where id = $1 and mot_de_passe is null and revoque_le is null`,
      [
        a.id,
        createHash("sha256").update(jeton).digest("hex"),
        new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      ],
    );
    const chemin = `/admin/acces?jeton=${encodeURIComponent(jeton)}`;
    console.log(
      `  ${a.email.padEnd(32)} ${a.role.padEnd(8)} ${
        r.rowCount ? (SITE ? SITE + chemin : chemin) : "mot de passe déjà choisi"
      }`,
    );
  }

  await db.end();

  if (fichiersKo.length) {
    console.error("\n⚠ Des fichiers n'ont pas été copiés : relancez le script, il ne recopie que le nécessaire côté base.");
    process.exitCode = 1;
  }
  console.log("\nMigration terminée.");
}
