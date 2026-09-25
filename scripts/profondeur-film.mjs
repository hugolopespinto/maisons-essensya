import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

/* ════════════════════════════════════════════════════════════════
   LE RELIEF DU FILM D'ACCUEIL — une carte de profondeur par demi-seconde

   Le film de l'accueil suit la souris en relief : le proche glisse plus
   que le lointain. Pour cela, chaque instant du film a besoin de sa
   carte de profondeur (clair = proche, sombre = loin). La maison monte
   et la caméra bouge : une seule carte ne suffit pas, on en calcule une
   toutes les `--pas` secondes et le navigateur passe de l'une à l'autre.

     npm i --no-save puppeteer-core @huggingface/transformers@3
     node scripts/profondeur-film.mjs public/film/chantier.mp4 --debut 2 --fin 10

   Sortie :
     · public/film/<nom>-profondeur.webp — la planche, cartes rangées
       ligne par ligne depuis le coin haut gauche ;
     · src/data/film-accueil.json — le film et sa planche, lus par le site.

   ── CE QUI TOURNE ──
   Les images du film sont extraites par Chrome (installé sur le poste,
   piloté par puppeteer-core) : pas de ffmpeg à installer. La profondeur
   est estimée par Depth Anything v2 (petit modèle, ~100 Mo téléchargés
   au premier lancement puis mis en cache), sur le processeur : compter
   quelques secondes par image.

   ⚠ NE PAS IMPORTER `sharp` DANS CE SCRIPT. @huggingface/transformers
   embarque sa propre copie de sharp ; deux copies dans le même processus
   se disputent libvips et plantent (« colourspace: parameter space not
   set »). Toutes les images passent donc par `RawImage`, qui utilise la
   copie de transformers.

   ⚠ LES DÉPENDANCES NE SONT PAS DANS package.json, à dessein : ce script
   tourne une fois par film, et onnxruntime pèse plusieurs centaines de
   mégaoctets que ni le build ni Netlify n'ont à installer.
   ════════════════════════════════════════════════════════════════ */

const TUILE_LARGEUR = 480;
const COLONNES = 4;
const MODELE = "onnx-community/depth-anything-v2-small";

function lireArguments(argv) {
  const opts = { debut: 2, fin: 10, pas: 0.5 };
  let film = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) opts[a.slice(2)] = Number(argv[++i]);
    else film = a;
  }
  if (!film || !/^public[\\/]/.test(film)) {
    console.error("Usage : node scripts/profondeur-film.mjs public/film/<film>.mp4 [--debut 2] [--fin 10] [--pas 0.5]");
    process.exit(1);
  }
  return { film, ...opts };
}

async function charger() {
  try {
    const puppeteer = (await import("puppeteer-core")).default;
    const transformers = await import("@huggingface/transformers");
    return { puppeteer, transformers };
  } catch {
    console.error("Dépendances absentes. Lancer d'abord :\n  npm i --no-save puppeteer-core @huggingface/transformers@3");
    process.exit(1);
  }
}

/** Flou 3×3 appliqué deux fois : adoucit les bords de profondeur, sinon
    le relief déchire l'image là où le premier plan touche le ciel. */
function adoucir(px, l, h) {
  let src = px;
  for (let passe = 0; passe < 2; passe++) {
    const dst = new Uint8ClampedArray(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < l; x++) {
        let somme = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= l) continue;
            somme += src[yy * l + xx];
            n++;
          }
        }
        dst[y * l + x] = somme / n;
      }
    }
    src = dst;
  }
  return src;
}

const { film, debut, fin, pas } = lireArguments(process.argv.slice(2));
const { puppeteer, transformers } = await charger();
const { pipeline, RawImage } = transformers;

const temps = [];
for (let t = debut; t <= fin + 1e-6; t += pas) temps.push(Math.round(t * 1000) / 1000);

const tmp = await mkdtemp(path.join(os.tmpdir(), "profondeur-"));
const page0 = path.join(tmp, "extraction.html");
await writeFile(page0, "<!doctype html><title>extraction</title>");

/* ── 1. Les images du film, par Chrome ── */
console.log(`Extraction de ${temps.length} images de ${film}…`);
const navigateur = await puppeteer.launch({
  channel: "chrome",
  headless: true,
  args: ["--allow-file-access-from-files", "--autoplay-policy=no-user-gesture-required"],
});
const page = await navigateur.newPage();
await page.goto(pathToFileURL(page0).href);
const infos = await page.evaluate(async (src) => {
  const v = document.createElement("video");
  v.muted = true;
  v.preload = "auto";
  v.src = src;
  await new Promise((ok, ko) => {
    v.onloadedmetadata = ok;
    v.onerror = () => ko(new Error("vidéo illisible par Chrome"));
  });
  window.__v = v;
  return { largeur: v.videoWidth, hauteur: v.videoHeight, duree: v.duration };
}, pathToFileURL(path.resolve(film)).href);

const images = [];
for (const [i, t] of temps.entries()) {
  const donnees = await page.evaluate(async (t) => {
    const v = window.__v;
    await new Promise((ok) => {
      v.onseeked = ok;
      v.currentTime = t;
    });
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    return c.toDataURL("image/png");
  }, Math.min(t, infos.duree - 0.05));
  const fichier = path.join(tmp, `image-${i}.png`);
  await writeFile(fichier, Buffer.from(donnees.split(",")[1], "base64"));
  images.push(fichier);
}
await navigateur.close();

/* ── 2. La profondeur de chaque image, puis la planche ── */
console.log(`Estimation de la profondeur (${MODELE})…`);
const estimer = await pipeline("depth-estimation", MODELE, { dtype: "fp32" });
const tuileL = TUILE_LARGEUR;
const tuileH = Math.round((TUILE_LARGEUR * infos.hauteur) / infos.largeur);
const lignes = Math.ceil(images.length / COLONNES);
const planche = new Uint8ClampedArray(tuileL * COLONNES * tuileH * lignes);

for (const [i, fichier] of images.entries()) {
  const { depth } = await estimer(await RawImage.read(fichier));
  const carte = await depth.resize(tuileL, tuileH);
  const douce = adoucir(carte.data, tuileL, tuileH);
  const x0 = (i % COLONNES) * tuileL;
  const y0 = Math.floor(i / COLONNES) * tuileH;
  for (let y = 0; y < tuileH; y++) {
    planche.set(douce.subarray(y * tuileL, (y + 1) * tuileL), (y0 + y) * tuileL * COLONNES + x0);
  }
  process.stdout.write(`  ${i + 1}/${images.length}\r`);
}

const nom = path.basename(film, path.extname(film));
const sortie = path.join(path.dirname(film), `${nom}-profondeur.webp`);
await new RawImage(planche, tuileL * COLONNES, tuileH * lignes, 1).save(sortie);

/* ── 3. Ce que le site lit ── */
const publique = (f) => "/" + path.relative("public", f).split(path.sep).join("/");
const reglages = {
  src: publique(film),
  largeur: infos.largeur,
  hauteur: infos.hauteur,
  debut,
  fin,
  profondeur: { src: publique(sortie), pas, nombre: images.length, colonnes: COLONNES, lignes },
};
await writeFile("src/data/film-accueil.json", JSON.stringify(reglages, null, 2) + "\n");
await rm(tmp, { recursive: true, force: true });

console.log(`\n${sortie} — ${images.length} cartes, ${COLONNES} × ${lignes}`);
console.log("src/data/film-accueil.json mis à jour.");
