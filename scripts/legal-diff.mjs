/* ════════════════════════════════════════════════════════════════
   LE TÉMOIN DES PAGES LÉGALES

   Il n'y a qu'une façon honnête d'affirmer qu'un texte juridique a été
   « migré tel quel » : le relever avant, le relever après, et comparer.
   Sur ces deux pages, une phrase perdue n'est pas une coquille — c'est
   une mention obligatoire manquante.

     node scripts/legal-diff.mjs <adresse-du-site> <dossier-de-sortie>

   Deux artefacts par page.

   · <page>.texte.txt — tout le texte visible, un bloc par ligne. C'est
     lui qui doit rester STRICTEMENT identique. Les entités sont
     décodées, les espaces insécables ramenés à des espaces ordinaires et
     les espaces multiples réduits : on compare ce qu'un lecteur lit, pas
     la façon dont le HTML l'écrit.

   · <page>.structure.txt — la charpente : identifiants d'ancre, niveaux
     de titre, liens et leurs cibles, boutons. Lui a le droit de bouger,
     mais chaque écart doit être explicable.
   ════════════════════════════════════════════════════════════════ */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2];
const SORTIE = process.argv[3];
const PAGES = ["/mentions-legales", "/confidentialite"];

if (!BASE || !SORTIE) {
  console.error("usage : node scripts/legal-diff.mjs <adresse> <dossier>");
  process.exit(1);
}

const ENTITES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#x27;": "'", "&#39;": "'", "&apos;": "'", "&nbsp;": " ", "&#160;": " ",
  "&eacute;": "é", "&egrave;": "è", "&agrave;": "à", "&ccedil;": "ç",
  "&laquo;": "«", "&raquo;": "»", "&hellip;": "…", "&mdash;": "—", "&ndash;": "–",
};
const decode = (s) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
   .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
   .replace(/&[a-z]+;/gi, (e) => ENTITES[e] ?? e);

/** Le contenu de <main>, débarrassé des scripts et des styles. */
const principal = (html) => {
  const i = html.indexOf("<main");
  const j = html.lastIndexOf("</main>");
  const dedans = i >= 0 && j > i ? html.slice(i, j) : html;
  return dedans.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
};

const texteDe = (html) =>
  decode(
    principal(html)
      /* Une frontière de bloc devient un saut de ligne : sans quoi deux
         paragraphes voisins se colleraient et un mot disparu passerait
         inaperçu au milieu de la soudure. */
      .replace(/<\/(p|h1|h2|h3|h4|li|div|section|figcaption|dt|dd|tr)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

const structureDe = (html) => {
  const dedans = principal(html);
  const out = [];
  for (const m of dedans.matchAll(/<(section|h1|h2|h3|a|button)\b([^>]*)>/gi)) {
    const balise = m[1].toLowerCase();
    const attrs = m[2];
    const id = /\bid="([^"]*)"/.exec(attrs)?.[1];
    const href = /\bhref="([^"]*)"/.exec(attrs)?.[1];
    if (balise === "section") out.push(`section#${id ?? "(sans id)"}`);
    else if (balise === "a") out.push(`lien → ${href ?? "(sans href)"}`);
    else if (balise === "button") out.push("bouton");
    else out.push(`${balise}${id ? "#" + id : ""}`);
  }
  return out.join("\n");
};

await mkdir(SORTIE, { recursive: true });
for (const p of PAGES) {
  const r = await fetch(BASE + p);
  if (!r.ok) { console.error(`${p} → HTTP ${r.status}`); process.exit(1); }
  const html = await r.text();
  const nom = p.replace(/^\//, "");
  await writeFile(path.join(SORTIE, `${nom}.texte.txt`), texteDe(html) + "\n", "utf8");
  await writeFile(path.join(SORTIE, `${nom}.structure.txt`), structureDe(html) + "\n", "utf8");
  console.log(`  ${p} → ${texteDe(html).split("\n").length} blocs de texte, ${structureDe(html).split("\n").length} éléments de structure`);
}
console.log(`relevé écrit dans ${SORTIE}`);
