import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/* ════════════════════════════════════════════════════════════════
   LES VISUELS DES MODÈLES — du rendu 3D au fichier servi

   Le client livre des PNG de 1,5 à 3 Mo. Servis tels quels, la page
   d'accueil pèserait une dizaine de mégaoctets : trois secondes de LCP
   sur un mobile en 4G, et le référencement s'effondre avec.

     node scripts/images.mjs <dossier des visuels>

   ── CE QUE LE NAVIGATEUR TÉLÉCHARGE RÉELLEMENT ──
   Un seul fichier par image, celui qui correspond à son écran. C'est le
   rôle de `srcset` et de `sizes`. D'où la règle qui répond à la question
   « des sources plus grandes vont-elles ralentir le site ? » : NON, tant
   qu'on produit les paliers. Une source plus grande n'ajoute qu'un
   palier de plus, réservé aux écrans qui en profitent.

   ── LES PALIERS SUIVENT LA SOURCE ──
   On ne fabrique QUE les largeurs réellement disponibles. Un palier
   1920 tiré d'une source de 1376 produirait un fichier de 1376 px
   étiqueté 1920 : le navigateur le choisirait pour rien, et l'image
   serait molle. `withoutEnlargement` empêche l'agrandissement, mais pas
   le mensonge du nom — d'où le filtrage explicite ci-dessous.

   ── DEUX FORMATS ──
   AVIF puis WebP. Mesuré sur le hero du site : 85 Ko en AVIF contre
   163 Ko en WebP à 1376 px, soit près de la moitié. AVIF est reconnu
   par tous les navigateurs courants depuis 2024 ; WebP reste le filet
   de sécurité, et `<picture>` laisse le navigateur trancher.

   ⚠ LE FICHIER LE PLUS LARGE N'A PAS DE SUFFIXE. C'est lui que
   désignent les chemins écrits à la main (`src/data/essensya.ts`).
   Changer cette convention casserait ces chemins en silence.
   ════════════════════════════════════════════════════════════════ */

const SOURCE = process.argv[2];
const SORTIE = "public/maisons";

/* Paliers candidats. Ceux qui dépassent la source sont écartés, et la
   largeur de la source est toujours produite : c'est le palier haut. */
const PALIERS = [480, 720, 1024, 1440, 1920, 2560];

const QUALITE = { webp: 78, avif: 50 };

/* ⚠ LE NOM DU FICHIER EST LA SEULE SOURCE DU TYPE, et il ne dit pas
   toujours « intérieur ». Le client nomme ses rendus par la pièce :
   « Vue 3 séjour », « Vue 4 chambre 1 ». Tester le seul mot
   « interieur » classait donc trois vues d'Ankara en extérieur, et la
   fiche décrivait une chambre comme « vue extérieure » dans son texte
   alternatif — lu par Google et par les lecteurs d'écran.

   « terrasse » reste dehors de cette liste à dessein : une terrasse est
   extérieure, et Pékin en a une. */
const INTERIEUR =
  /interieur|sejour|salon|chambre|cuisine|suite|dressing|salle|bain|douche|wc|degagement|buanderie|cellier/;

/** « Vue 2 extérieur.png » → « vue-2-exterieur ». */
const slug = (s) =>
  s
    .replace(/\.[a-z]+$/i, "")
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* Une miniature de 20 px encodée en base64, posée en fond pendant le
   chargement : sans elle, chaque image laisse un rectangle vide le temps
   du réseau — l'effet « site cassé » que le client nous a signalé. */
async function empreinte(fichier) {
  const buf = await sharp(fichier).resize(20).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${buf.toString("base64")}`;
}

/** Les largeurs à produire pour une source donnée, de la plus petite à la source. */
const largeursPour = (largeurSource) => [
  ...PALIERS.filter((w) => w < largeurSource),
  largeurSource,
];

async function main() {
  if (!SOURCE) {
    console.error("usage : node scripts/images.mjs <dossier des visuels>");
    process.exit(1);
  }

  const modeles = (await readdir(SOURCE, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const catalogue = {};
  let octets = 0;

  for (const modele of modeles) {
    const cle = slug(modele);
    const dossier = path.join(SORTIE, cle);
    await mkdir(dossier, { recursive: true });

    const vues = (await readdir(path.join(SOURCE, modele)))
      .filter((f) => /\.(png|jpe?g)$/i.test(f))
      .sort();

    catalogue[cle] = { nom: modele, vues: [] };

    /* ⚠ DEUX FICHIERS QUI SE SLUGIFIENT PAREIL S'ÉCRASENT EN SILENCE.
       « Plan RDC.png » et « plan-rdc.jpg » rendent la même clé : le second
       remplacerait le premier sur le disque ET dans le catalogue, et le
       journal annoncerait quand même deux vues. On s'arrête. */
    const vues_ = new Set();

    for (const vue of vues) {
      const src = path.join(SOURCE, modele, vue);
      const base = slug(vue);
      if (vues_.has(base)) {
        throw new Error(
          `Collision de nom dans ${modele} : « ${vue} » produit la clé ` +
            `« ${base} », déjà prise. Renommez l'un des deux fichiers.`,
        );
      }
      vues_.add(base);
      const meta = await sharp(src).metadata();
      const largeurSource = meta.width ?? 1376;
      const ratio = (meta.height ?? 768) / largeurSource;

      const largeurs = largeursPour(largeurSource);
      const variantes = [];

      for (const w of largeurs) {
        /* Le plus large ne porte pas de suffixe : c'est l'adresse
           stable, celle qu'on peut écrire à la main. */
        const suffixe = w === largeurSource ? "" : `-${w}`;
        const redim = sharp(src).resize({ width: w, withoutEnlargement: true });

        for (const format of ["avif", "webp"]) {
          const sortie = path.join(dossier, `${base}${suffixe}.${format}`);
          const info = await redim
            .clone()
            [format]({ quality: QUALITE[format] })
            .toFile(sortie);
          octets += info.size;
        }

        variantes.push({
          largeur: w,
          avif: `/maisons/${cle}/${base}${suffixe}.avif`,
          webp: `/maisons/${cle}/${base}${suffixe}.webp`,
        });
      }

      catalogue[cle].vues.push({
        cle: base,
        /* Compatibilité : `src` reste le WebP le plus large. */
        src: `/maisons/${cle}/${base}.webp`,
        largeur: largeurSource,
        hauteur: Math.round(largeurSource * ratio),
        empreinte: await empreinte(src),
        variantes,
        /* ⚠ LE PLAN N'EST PAS UNE VUE COMME LES AUTRES, et le distinguer
           ici n'est pas cosmétique. `facade()` rend la PREMIÈRE vue de
           type « exterieur » : un plan rangé dans cette catégorie
           deviendrait la vignette du modèle dans les grilles, puisque
           « Plan… » précède « Vue 1… » dans l'ordre alphabétique. Le
           catalogue afficherait onze plans au lieu de onze maisons. */
        type: /^plan/.test(base) ? "plan" : INTERIEUR.test(base) ? "interieur" : "exterieur",
      });
    }
    console.log(`  ${modele.padEnd(12)} ${vues.length} vues`);
  }

  await writeFile("src/data/visuels.json", `${JSON.stringify(catalogue, null, 2)}\n`, "utf8");
  const total = Object.values(catalogue).reduce((n, m) => n + m.vues.length, 0);
  console.log(
    `\n${total} visuels · ${(octets / 1048576).toFixed(1)} Mo produits · catalogue dans src/data/visuels.json`,
  );
}

main();
