import { writeFile } from "node:fs/promises";

/* ════════════════════════════════════════════════════════════════
   LES COMMUNES DE FRANCE — l'index de l'auto-complétion « Secteur »

     node scripts/communes.mjs

   Produit src/data/communes.json depuis le Découpage administratif
   (geo.api.gouv.fr), la source officielle de l'État.

   ── POURQUOI UN FICHIER, ET PAS L'API EN DIRECT ──
   · La CSP du site n'ouvre `connect-src` qu'au domaine lui-même
     (netlify.toml) : le navigateur ne peut pas interroger l'API.
   · Un relais serveur vers l'API ajouterait un tiers dont dépend
     chaque frappe au clavier — une panne chez eux, et le champ se tait.
   · Sa recherche floue ne fait pas l'affaire : « mont-de » n'y renvoie
     pas Mont-de-Marsan, et un code postal partiel (« 400 ») n'y renvoie
     rien du tout.

   ── QUAND LE RELANCER ──
   Une fois par an suffit : les fusions de communes prennent effet au
   1er janvier. Entre-temps le champ reste en saisie libre — une commune
   absente de l'index se tape à la main, rien n'est bloqué.

   ── FORMAT ──
   [nom, codes postaux séparés par une espace, département], du plus
   peuplé au moins peuplé. L'ordre EST le classement : à pertinence
   égale, la grande ville passe devant le hameau homonyme, et la
   population n'a plus besoin d'être stockée.
   ════════════════════════════════════════════════════════════════ */

const SOURCE =
  "https://geo.api.gouv.fr/communes?fields=nom,codesPostaux,codeDepartement,population&format=json";
const SORTIE = "src/data/communes.json";

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`geo.api.gouv.fr a répondu ${res.status}`);
const communes = await res.json();

const lignes = communes
  .filter((c) => c.nom && c.codesPostaux?.length)
  .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
  .map((c) => [c.nom, [...c.codesPostaux].sort().join(" "), c.codeDepartement ?? ""]);

/* Une ligne par commune : le fichier reste lisible, et un diff après
   régénération montre commune par commune ce qui a changé. */
await writeFile(SORTIE, "[\n" + lignes.map((l) => JSON.stringify(l)).join(",\n") + "\n]\n");
console.log(`${lignes.length} communes → ${SORTIE}`);
