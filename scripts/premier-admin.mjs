/* ════════════════════════════════════════════════════════════════
   PREMIER ADMINISTRATEUR — crée le compte et affiche son lien d'accès

   L'écran « Utilisateurs » distribue les comptes, mais il faut déjà être
   administrateur pour l'ouvrir. Ce script fait le tout premier compte,
   directement en base.

     DATABASE_URL=postgresql://… NEXT_PUBLIC_SITE_URL=https://… \
       node scripts/premier-admin.mjs vous@exemple.fr

   Chez Clever Cloud, l'adresse de la base est dans la console de
   l'add-on PostgreSQL (POSTGRESQL_ADDON_URI, lue aussi).

   Le script affiche un lien d'accès à usage unique, valable 72 h : on
   l'ouvre, on choisit son mot de passe, on est dans le back-office.
   Relancé sur une adresse existante, il rend au compte le rôle `admin`
   et produit un nouveau lien — c'est aussi la porte de secours si plus
   personne ne peut se connecter.

   ⚠ Même format de jeton que src/lib/admin/comptes.ts (32 octets
   aléatoires en base64url, empreinte SHA-256 en hexadécimal) : les deux
   doivent rester alignés.
   ════════════════════════════════════════════════════════════════ */

import { createHash, randomBytes } from "node:crypto";
import pg from "pg";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
  console.error("Usage : node scripts/premier-admin.mjs adresse@exemple.fr");
  process.exit(1);
}

const url = process.env.DATABASE_URL || process.env.POSTGRESQL_ADDON_URI;
if (!url) {
  console.error("DATABASE_URL (ou POSTGRESQL_ADDON_URI) manquante.");
  process.exit(1);
}

const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
const jeton = randomBytes(32).toString("base64url");
const empreinte = createHash("sha256").update(jeton).digest("hex");
const expire = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(
    `insert into admins (email, role, jeton, jeton_expire) values ($1, 'admin', $2, $3)
     on conflict (email) do update
       set role = 'admin', revoque_le = null, jeton = excluded.jeton, jeton_expire = excluded.jeton_expire`,
    [email, empreinte, expire],
  );
} catch (e) {
  console.error(
    `Écriture impossible : ${e.message}\nLa table « admins » existe-t-elle ? Exécutez d'abord db/schema.sql.`,
  );
  process.exitCode = 1;
} finally {
  await client.end();
}

if (!process.exitCode) {
  const chemin = `/admin/acces?jeton=${encodeURIComponent(jeton)}`;
  console.log(`\nCompte administrateur prêt : ${email}`);
  console.log(`Lien d'accès (usage unique, 72 h) :\n\n  ${site ? site + chemin : chemin}\n`);
  if (!site) console.log("(NEXT_PUBLIC_SITE_URL absente : préfixez le chemin par l'adresse du site.)\n");
}
