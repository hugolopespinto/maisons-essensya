import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";
import path from "node:path";

/* ════════════════════════════════════════════════════════════════
   LES TEXTES DES MODÈLES — des fiches Word du client au site

     node scripts/textes-modeles.mjs

   Lit « texte modeles/*.docx » (une fiche par modèle, livrées le
   14/10) et écrit src/data/textes-modeles/<slug>.ts, un fichier par
   modèle : le H1 à part, le reste du texte en Markdown léger — celui
   que src/lib/markdown.ts sait rendre.

   ── CE QUE LA CONVERSION LIT DANS LE WORD ──
   Le rédacteur n'a pas utilisé les styles de titre de Word : il a
   préfixé ses titres à la main, « H1- », « H2- », « H3- », en gras.
   Ces préfixes sont la seule structure fiable des fiches, et c'est
   eux que l'on lit (« H2 - », « H3 – » et « H****3****- » compris).
     · « H1- … »  → le champ `h1`, rendu par la page, pas dans le corps ;
     · « H2- … »  → `## …` ;
     · « H3- … »  → `### …` ;
     · paragraphe numéroté (puce Word) → `- …` ;
     · gras → `**…**`, recollé quand Word l'a coupé en plusieurs runs.
   La première ligne, le nom du modèle en capitales (« ANKARA »), est
   un titre de document, pas du contenu : elle saute.

   ── CE QUI EST VOLONTAIREMENT IGNORÉ ──
   Les fiches contiennent des liens Word VIDES — aucun texte cliquable —
   vers l'ancien site maisonsdenfrance-sudouest.fr et vers le SharePoint
   du rédacteur. Ce sont des résidus de copier-coller : les reprendre
   publierait l'adresse d'un espace de travail privé.

   ── LES CORRECTIONS ──
   Le texte est celui du client, au mot près, À L'EXCEPTION de la table
   CORRECTIONS ci-dessous : fautes de frappe évidentes, un chiffre faux,
   deux liens que le texte appelait sans les porter. Chaque correction
   doit trouver son texte EXACTEMENT une fois, sinon le script échoue :
   une fiche révisée par le client ne doit pas perdre une correction en
   silence, ni en recevoir une au mauvais endroit.
   ════════════════════════════════════════════════════════════════ */

const SOURCE = "texte modeles";
const SORTIE = "src/data/textes-modeles";

/** [texte du Word, texte publié, raison] — par slug. */
const CORRECTIONS = {
  /* La maison fait 80 m² ; un garage de 80 m² est une coquille, et un
     chiffre faux sur une fiche de constructeur engage. Le client a dit
     que la surface du garage n'avait pas d'importance : on la retire
     plutôt que d'en inventer une. */
  berlin: [["Un garage polyvalent de 80 m², aménageable", "Un garage polyvalent, aménageable", "surface de garage erronée"]],
  /* « Découvrez nos propositions de terrains » : la phrase appelle un
     lien que le Word ne porte pas. */
  pekin: [
    [
      "Découvrez nos propositions de terrains constructibles pour le plan de maison Pékin",
      "[Découvrez nos propositions de terrains constructibles](/terrains) pour le plan de maison Pékin.",
      "lien appelé par le texte",
    ],
  ],
  prague: [
    [
      "D'autres modèles et plans de maisons sont disponibles sur notre site.",
      "D'autres [modèles et plans de maisons](/maisons) sont disponibles sur notre site.",
      "lien appelé par le texte",
    ],
    ["Ainsi vous bénéficier :", "Ainsi, vous bénéficiez :", "faute de frappe"],
  ],
  quito: [["Ce plan de maison 3 hambres", "Ce plan de maison 3 chambres", "faute de frappe"]],
  monaco: [
    ["## Une espace nuit", "## Un espace nuit", "faute de frappe"],
    ["deux toilettes indépendants", "deux toilettes indépendantes", "accord"],
    ["le stockage logement", "le stockage du logement", "mot manquant"],
  ],
  vienne: [
    ["Maison carrée 93 avec 3 chambres", "Maison carrée 93 m² avec 3 chambres", "unité manquante"],
    ["**maison carrée 3** grâce", "**maison carrée 3 chambres** grâce", "mot manquant"],
  ],
  londres: [
    ["surface vitrée supérieur au", "surface vitrée supérieure au", "accord"],
    ["simplifié;", "simplifié ;", "typographie"],
  ],
};

/* ════ 1. LIRE UN .DOCX SANS DÉPENDANCE ════
   Un .docx est une archive zip. On lit le répertoire central pour
   trouver `word/document.xml`, puis on décompresse son entrée locale.
   Pas de zip64 ni de chiffrement : Word n'en produit pas pour une
   fiche de quelques pages, et on échoue franchement si c'est le cas. */
function lireEntreeZip(buf, nom) {
  let fin = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new Error("archive zip illisible");
  const nbEntrees = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);
  for (let n = 0; n < nbEntrees; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("répertoire central illisible");
    const methode = buf.readUInt16LE(p + 10);
    const taille = buf.readUInt32LE(p + 20);
    const lgNom = buf.readUInt16LE(p + 28);
    const lgExtra = buf.readUInt16LE(p + 30);
    const lgComm = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const entree = buf.toString("utf8", p + 46, p + 46 + lgNom);
    if (entree === nom) {
      const debut = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const donnees = buf.subarray(debut, debut + taille);
      if (methode === 0) return donnees.toString("utf8");
      if (methode === 8) return inflateRawSync(donnees).toString("utf8");
      throw new Error(`compression ${methode} non prise en charge`);
    }
    p += 46 + lgNom + lgExtra + lgComm;
  }
  throw new Error(`${nom} absent de l'archive`);
}

/* ════ 2. LE XML DE WORD → DES PARAGRAPHES ════ */
const decoder = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** Un paragraphe : ses segments de texte (gras ou non) et s'il est une puce. */
function paragraphes(xml) {
  const corps = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
  return corps.map((p) => {
    const segments = [];
    for (const r of p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) ?? []) {
      /* `<w:b/>` seul vaut gras ; `<w:b w:val="0"/>` l'annule. */
      const gras = /<w:b\/>|<w:b w:val="(1|true|on)"\/>/.test(r);
      let texte = "";
      for (const m of r.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g)) {
        texte += m[1] !== undefined ? decoder(m[1]) : " ";
      }
      if (!texte) continue;
      const dernier = segments[segments.length - 1];
      if (dernier && dernier.gras === gras) dernier.texte += texte;
      else segments.push({ gras, texte });
    }
    return { puce: /<w:numPr>/.test(p), segments };
  });
}

/** Les segments en Markdown inline : le gras borné au mot, sans espace dedans. */
function inline(segments) {
  return segments
    .map(({ gras, texte }) => {
      if (!gras || !texte.trim()) return texte;
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(texte);
      return `${m[1]}**${m[2]}**${m[3]}`;
    })
    .join("")
    .replace(/[ \t]+/g, " ")
    .trim();
}

const brut = (segments) =>
  segments
    .map((s) => s.texte)
    .join("")
    .replace(/[ \t]+/g, " ")
    .trim();

/* ════ 3. UNE FICHE → { h1, corps } ════ */
function convertir(xml, nomModele) {
  let h1 = null;
  const blocs = [];
  let liste = [];
  const fermerListe = () => {
    if (liste.length) blocs.push(liste.join("\n"));
    liste = [];
  };

  let premier = true;
  for (const { puce, segments } of paragraphes(xml)) {
    const texte = brut(segments);
    if (!texte) continue;
    /* Le nom du modèle en tête de fiche : un titre de document. */
    if (!h1 && texte.toUpperCase() === nomModele) continue;

    /* ⚠ LA FICHE DE LISBONNE N'A PAS DE « H1- ». Son titre est le
       premier paragraphe, entièrement en gras, comme partout ailleurs —
       seul le préfixe manque. On ne l'accepte QUE en premier paragraphe :
       plus loin, un paragraphe tout en gras est une phrase d'accroche,
       pas un titre. */
    const estPremier = premier;
    premier = false;
    const titre = /^H\s*([1-3])\s*[-–]\s*(.+)$/.exec(texte);
    if (!titre && !h1 && estPremier && !puce && segments.every((s) => s.gras || !s.texte.trim())) {
      h1 = texte;
      continue;
    }

    if (titre) {
      fermerListe();
      if (titre[1] === "1") h1 = titre[2].trim();
      else blocs.push(`${"#".repeat(Number(titre[1]))} ${titre[2].trim()}`);
      continue;
    }
    if (puce) {
      liste.push(`- ${inline(segments)}`);
      continue;
    }
    fermerListe();
    blocs.push(inline(segments));
  }
  fermerListe();
  if (!h1) throw new Error("aucun « H1- » dans la fiche, ni premier paragraphe en gras");
  return { h1, corps: blocs.join("\n\n") };
}

/* ════ 4. TYPOGRAPHIE ════
   Le Word met une espace ordinaire devant « : ; ? ! » : le navigateur
   y coupe la ligne, et un H1 en capitales s'ouvrait sur « : DÉCOUVREZ ».
   L'espace devient insécable, comme le veut la typographie française.
   De même entre un nombre et son unité : « 33,49 » en fin de ligne et
   « m² » au début de la suivante, sur mobile. */
const typographie = (s) =>
  s
    .replace(/ ([:;?!»])/g, " $1")
    .replace(/« /g, "« ")
    .replace(/(\d) (m²|m\b|mètres\b)/g, "$1 $2");

/* ════ 5. ÉCRITURE ════ */
const echapperGabarit = (s) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

await mkdir(SORTIE, { recursive: true });
const fichiers = (await readdir(SOURCE)).filter((f) => f.toLowerCase().endsWith(".docx")).sort();
const slugs = [];

for (const fichier of fichiers) {
  /* « ANKARA-OK.docx », « DAKAR_OK.docx » → « ANKARA », « DAKAR ». */
  const nomModele = fichier.replace(/\.docx$/i, "").replace(/[-_ ]?OK$/i, "").toUpperCase();
  const slug = nomModele
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-");

  const xml = lireEntreeZip(await readFile(path.join(SOURCE, fichier)), "word/document.xml");
  let { h1, corps } = convertir(xml, nomModele);

  for (const [avant, apres, raison] of CORRECTIONS[slug] ?? []) {
    const n = corps.split(avant).length - 1;
    if (n !== 1) {
      throw new Error(`${fichier} : la correction « ${avant} » (${raison}) trouve ${n} occurrence(s) au lieu d'une.`);
    }
    corps = corps.replace(avant, () => apres);
  }
  /* Après les corrections, qui citent le Word avec ses espaces d'origine. */
  h1 = typographie(h1);
  corps = typographie(corps);

  const ts = `import type { TexteModele } from "./index";

/* ⚠ FICHIER PRODUIT PAR scripts/textes-modeles.mjs depuis
   « ${SOURCE}/${fichier} ». Une retouche faite ici sera écrasée au
   prochain passage du script : corriger la fiche Word, ou la table
   CORRECTIONS du script. */
const texte: TexteModele = {
  h1: ${JSON.stringify(h1)},
  corps: \`
${echapperGabarit(corps)}
\`,
};

export default texte;
`;
  await writeFile(path.join(SORTIE, `${slug}.ts`), ts);
  slugs.push(slug);
  console.log(`${slug.padEnd(10)} ${String(corps.length).padStart(6)} car.  H1 : ${h1}`);
}

console.log(`\n${slugs.length} fiches écrites dans ${SORTIE}/. L'index (index.ts) est tenu à la main.`);
