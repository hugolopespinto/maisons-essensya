import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/* ════════════════════════════════════════════════════════════════
   LES VISUELS DES MODÈLES — du rendu 3D au fichier servi

   Le client livre des PNG de 1,5 à 3 Mo, en 1376 × 768. Servis tels
   quels, la page d'accueil pèserait une dizaine de mégaoctets : c'est
   trois secondes de LCP sur un mobile en 4G, et le référencement que
   nous venons de construire s'effondre avec.

   Ce script est la conversion, et il est versionné pour être rejouable :
   de nouveaux modèles arriveront, et la règle ne doit pas être à
   réinventer à chaque livraison.

     node scripts/images.mjs <dossier des visuels>

   ⚠ LA SOURCE FAIT 1376 px DE LARGE. C'est peu pour une image pleine
   largeur : sur un écran 2560 px elle sera étirée et molle. On ne
   fabrique donc PAS de variante plus grande — agrandir n'ajoute aucun
   détail, seulement des octets. La vraie réponse est une livraison en
   2560 px, à demander au client. En attendant, 1376 est le plafond
   honnête.
   ════════════════════════════════════════════════════════════════ */

const SOURCE = process.argv[2];
const SORTIE = "public/maisons";

/* Deux largeurs : celle des grandes images (pleine largeur, hero et
   bandeaux) et celle des vignettes de grille. `sharp` n'agrandit jamais
   au-delà de la source grâce à `withoutEnlargement`. */
const TAILLES = [
  { suffixe: "", largeur: 1376, qualite: 78 },
  { suffixe: "-sm", largeur: 720, qualite: 74 },
];

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
   chargement : sans elle, chaque image laisse un rectangle vide le
   temps du réseau — l'effet « site cassé » que le client nous a
   justement signalé sur l'accueil. */
async function empreinte(fichier) {
  const buf = await sharp(fichier).resize(20).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${buf.toString("base64")}`;
}

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

  for (const modele of modeles) {
    const cle = slug(modele);
    const dossier = path.join(SORTIE, cle);
    await mkdir(dossier, { recursive: true });

    const vues = (await readdir(path.join(SOURCE, modele)))
      .filter((f) => /\.(png|jpe?g)$/i.test(f))
      .sort();

    catalogue[cle] = { nom: modele, vues: [] };

    for (const vue of vues) {
      const src = path.join(SOURCE, modele, vue);
      const base = slug(vue);
      const meta = await sharp(src).metadata();

      for (const t of TAILLES) {
        await sharp(src)
          .resize({ width: t.largeur, withoutEnlargement: true })
          .webp({ quality: t.qualite })
          .toFile(path.join(dossier, `${base}${t.suffixe}.webp`));
      }

      catalogue[cle].vues.push({
        cle: base,
        src: `/maisons/${cle}/${base}.webp`,
        srcPetit: `/maisons/${cle}/${base}-sm.webp`,
        largeur: Math.min(meta.width ?? 1376, 1376),
        hauteur: Math.round(
          ((meta.height ?? 768) * Math.min(meta.width ?? 1376, 1376)) / (meta.width ?? 1376),
        ),
        empreinte: await empreinte(src),
        /* « vue-2-exterieur » → « extérieur ». Le libellé sert à composer
           un texte alternatif lisible, pas à trier. */
        type: /interieur/.test(base) ? "interieur" : "exterieur",
      });
    }
    console.log(`  ${modele.padEnd(12)} ${vues.length} vues`);
  }

  await writeFile(
    "src/data/visuels.json",
    `${JSON.stringify(catalogue, null, 2)}\n`,
    "utf8",
  );
  const total = Object.values(catalogue).reduce((n, m) => n + m.vues.length, 0);
  console.log(`\n${total} visuels · catalogue écrit dans src/data/visuels.json`);
}

main();
