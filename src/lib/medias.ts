import "server-only";
import { randomUUID } from "node:crypto";
import { invaliderCache } from "@/lib/store";
import {
  auteurCourant,
  clientSupabase,
  isSupabaseConfigured,
  journaliserExterne,
} from "@/lib/store/supabase";
import type { Media } from "@/lib/store/types";

/* ════════════════════════════════════════════════════════════════
   MÉDIATHÈQUE — l'accès au stockage de fichiers

   Le client vient de WordPress : « Médias » est un réflexe. Ce module
   est le SEUL endroit qui touche au bucket. Tout le reste du site ne
   manipule que des identifiants de `Media` (ou des URL), et demande une
   adresse affichable avec `resoudreMedia()`.

   DEUX OBJETS POUR UN MÉDIA, et ils doivent rester synchrones :
     · le FICHIER, dans le bucket privé « medias » de Supabase Storage ;
     · la FICHE, dans la table `public.medias` (nom, alt, dimensions).
   Les créer ou les supprimer séparément produit soit un objet orphelin
   facturé et invisible, soit une fiche qui pointe vers le vide. Les deux
   opérations sont donc ici, et nulle part ailleurs — `patchContent
   ("medias", …)` ne sait volontairement que corriger un texte alternatif.

   BUCKET PRIVÉ, URL SIGNÉES. Un bucket public exposerait la photothèque
   entière du client — plans, visuels non diffusés, brouillons — à qui
   devine un nom de fichier, sans trace dans aucun journal. On signe donc
   à la demande, et les adresses expirent.

   ⚠ SANS SUPABASE, CE MODULE NE LÈVE PAS. Il répond « indisponible ».
   Le back-office doit pouvoir afficher « médiathèque indisponible sans
   Supabase » sur un écran qui s'ouvre, pas planter : c'est exactement le
   mode dans lequel tourne une recette locale, et la règle du projet veut
   que le site fonctionne sans base.
   ════════════════════════════════════════════════════════════════ */

/** Le bucket à créer une fois — voir la fin de `supabase/schema.sql`. */
export const BUCKET = "medias";

/** 10 Mo. Au-delà, c'est une photo non redimensionnée : on refuse et on
 *  le dit, plutôt que de laisser le client gonfler ses pages. */
export const TAILLE_MAX = 10 * 1024 * 1024;

/**
 * Ce qu'on accepte de recevoir.
 *
 * Liste blanche, pas liste noire : un format inconnu est refusé. Le SVG
 * y figure parce que les logos en ont besoin — il est servi depuis le
 * domaine de Supabase Storage, jamais depuis celui du site, et toujours
 * dans une balise `<img>` où aucun script embarqué ne s'exécute.
 */
export const TYPES_AUTORISES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
] as const;

/** Durée de validité d'une URL signée : assez pour servir la page et son
 *  cache navigateur, trop peu pour circuler utilement. */
const SIGNATURE_TTL = 60 * 60;

/* ──────────────────────────────────────────────────────────────────
   DISPONIBILITÉ — la dégradation explicite
   ────────────────────────────────────────────────────────────────── */

export type EtatMediatheque =
  | { disponible: true }
  | { disponible: false; raison: string };

/**
 * Est-ce que la médiathèque peut fonctionner ? La `raison` est écrite
 * pour être affichée telle quelle au client, pas pour être lue par un
 * développeur dans des logs.
 */
export function etatMediatheque(): EtatMediatheque {
  if (!isSupabaseConfigured()) {
    return {
      disponible: false,
      raison:
        "La médiathèque a besoin de Supabase pour stocker les fichiers. Sans SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY, les images doivent rester dans le code du site.",
    };
  }
  return { disponible: true };
}

/** Résultat d'une opération qui écrit. `erreur` est affichable telle quelle. */
export type ResultatMedia =
  | { ok: true; media: Media }
  | { ok: false; erreur: string };

export type Resultat = { ok: true } | { ok: false; erreur: string };

/* ──────────────────────────────────────────────────────────────────
   FORME DE LA LIGNE SQL — mapping explicite, comme dans le magasin
   ────────────────────────────────────────────────────────────────── */

interface LigneMedia {
  id: string;
  chemin: string;
  nom: string;
  alt: string | null;
  type: string;
  taille: number | null;
  largeur: number | null;
  hauteur: number | null;
  created_at: string;
}

const nombre = (v: number | null | undefined): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

function versTs(r: LigneMedia): Media {
  return {
    id: r.id,
    chemin: r.chemin,
    nom: r.nom,
    alt: r.alt ?? "",
    type: r.type,
    taille: nombre(r.taille) ?? 0,
    largeur: nombre(r.largeur),
    hauteur: nombre(r.hauteur),
    creeLe: new Date(r.created_at).toISOString(),
  };
}

/* ──────────────────────────────────────────────────────────────────
   LISTAGE
   ────────────────────────────────────────────────────────────────── */

/**
 * Les fiches, de la plus récente à la plus ancienne.
 *
 * Rend une liste vide — jamais une exception — quand la médiathèque est
 * indisponible : l'écran affiche `etatMediatheque().raison` et reste
 * ouvert. `getContent().medias` sert la même donnée quand on a déjà le
 * contenu en main ; cette fonction existe pour les écrans qui ne
 * regardent que les médias.
 */
export async function listerMedias(): Promise<Media[]> {
  if (!etatMediatheque().disponible) return [];
  try {
    const { data, error } = await clientSupabase()
      .from("medias")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[medias] listage impossible :", error.message);
      return [];
    }
    return ((data ?? []) as LigneMedia[]).map(versTs);
  } catch (e) {
    console.error("[medias] listage impossible :", (e as Error).message);
    return [];
  }
}

/** Les fiches sans texte alternatif — l'écran les signale, il ne les
 *  cache pas : une image sans alt est invisible pour Google et pour un
 *  lecteur d'écran, et c'est au client de le savoir. */
export function mediasSansAlt(medias: Media[]): Media[] {
  return medias.filter((m) => m.type !== "application/pdf" && !m.alt.trim());
}

/* ──────────────────────────────────────────────────────────────────
   URL SIGNÉES
   ────────────────────────────────────────────────────────────────── */

/* Signer coûte un aller-retour réseau. Une grille de médiathèque en
   demanderait des dizaines par rendu, et la page d'accueil en
   redemanderait à chaque visiteur. On garde donc les adresses jusqu'à
   une minute avant leur expiration. */
const signatures = new Map<string, { url: string; exp: number }>();

/** Adresse temporaire d'un objet du bucket, ou `null` si elle n'a pas pu
 *  être produite (objet supprimé, bucket absent, base injoignable). */
export async function urlSignee(
  chemin: string,
  secondes = SIGNATURE_TTL,
): Promise<string | null> {
  const map = await signerChemins([chemin], secondes);
  return map.get(chemin) ?? null;
}

/**
 * Signe plusieurs chemins d'un coup — ce dont a besoin une grille.
 *
 * Rend une Map plutôt qu'un tableau : l'appelant retrouve l'URL par son
 * chemin sans dépendre de l'ordre, et un chemin qui a échoué est
 * simplement absent, pas `null` au milieu d'un tableau décalé.
 */
export async function signerChemins(
  chemins: string[],
  secondes = SIGNATURE_TTL,
): Promise<Map<string, string>> {
  const resultat = new Map<string, string>();
  if (!etatMediatheque().disponible) return resultat;

  const maintenant = Date.now();
  const aSigner: string[] = [];
  for (const chemin of new Set(chemins.filter(Boolean))) {
    const memo = signatures.get(chemin);
    if (memo && memo.exp > maintenant) resultat.set(chemin, memo.url);
    else aSigner.push(chemin);
  }
  if (aSigner.length === 0) return resultat;

  try {
    const { data, error } = await clientSupabase()
      .storage.from(BUCKET)
      .createSignedUrls(aSigner, secondes);
    if (error) {
      console.error("[medias] signature impossible :", error.message);
      return resultat;
    }
    /* On garde la signature une minute de moins que sa durée réelle :
       une URL servie juste avant l'échéance expirerait pendant le
       chargement de l'image. */
    const exp = maintenant + Math.max(secondes - 60, 30) * 1000;
    for (const entree of data ?? []) {
      /* Supabase rend une entrée par chemin demandé, `path` et
         `signedUrl` à null pour celles qui ont échoué (objet absent) :
         on les saute, l'appelant verra simplement un chemin manquant. */
      if (entree.error || !entree.path || !entree.signedUrl) continue;
      signatures.set(entree.path, { url: entree.signedUrl, exp });
      resultat.set(entree.path, entree.signedUrl);
    }
  } catch (e) {
    console.error("[medias] signature impossible :", (e as Error).message);
  }
  return resultat;
}

/* ──────────────────────────────────────────────────────────────────
   RÉSOLUTION — ce qui permet aux écrans d'accepter les deux
   ────────────────────────────────────────────────────────────────── */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* id → chemin. La correspondance ne change jamais pour un média donné :
   le mémo ne peut pas mentir, il ne peut que survivre à une suppression
   — auquel cas la signature échoue et l'appelant reçoit `null`. */
const cheminsConnus = new Map<string, string>();

async function cheminDeId(id: string): Promise<string | null> {
  const connu = cheminsConnus.get(id);
  if (connu) return connu;
  try {
    const { data, error } = await clientSupabase()
      .from("medias")
      .select("chemin")
      .eq("id", id)
      .maybeSingle();
    const ligne = data as { chemin?: string } | null;
    if (error || typeof ligne?.chemin !== "string") return null;
    cheminsConnus.set(id, ligne.chemin);
    return ligne.chemin;
  } catch {
    return null;
  }
}

/**
 * Rend une adresse affichable à partir de ce qu'un écran a stocké.
 *
 * Les champs image du back-office acceptent DEUX choses, et c'est
 * volontaire : un identifiant de média téléversé, ou une URL / un chemin
 * public déjà en place. Le premier est le cas nominal une fois la
 * médiathèque en service ; le second permet de ne rien casser des
 * visuels livrés dans `/public`, et de pointer une image hébergée
 * ailleurs sans la recopier.
 *
 * Rend `null` pour une valeur vide ou un média introuvable : l'appelant
 * affiche alors son substitut, jamais une balise `<img>` cassée.
 */
export async function resoudreMedia(
  idOuUrl: string | undefined | null,
): Promise<string | null> {
  const v = (idOuUrl ?? "").trim();
  if (!v) return null;
  /* Déjà une adresse : URL absolue, protocole implicite, chemin public
     du site, ou donnée embarquée. On ne touche à rien. */
  if (/^(https?:)?\/\//i.test(v) || v.startsWith("/") || v.startsWith("data:")) {
    return v;
  }
  if (!UUID.test(v)) return v;
  if (!etatMediatheque().disponible) return null;

  const chemin = await cheminDeId(v);
  return chemin ? urlSignee(chemin) : null;
}

/* ──────────────────────────────────────────────────────────────────
   TÉLÉVERSEMENT
   ────────────────────────────────────────────────────────────────── */

/** Nom de fichier réduit à ce qui passe dans une URL, accents compris. */
function assainir(nom: string): string {
  const point = nom.lastIndexOf(".");
  const base = point > 0 ? nom.slice(0, point) : nom;
  const ext = point > 0 ? nom.slice(point + 1).toLowerCase() : "";
  const propre =
    base
      .normalize("NFD")
      /* Les diacritiques détachés par la décomposition NFD : « é » est
         devenu « e » + accent, on ne garde que la lettre. */
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "fichier";
  const extension = ext.replace(/[^a-z0-9]/g, "").slice(0, 8);
  return extension ? `${propre}.${extension}` : propre;
}

/* Rangement par année/mois, comme WordPress : un dossier reste lisible
   dans l'explorateur Supabase même après trois ans de photos. */
function cheminPour(nom: string): string {
  const d = new Date();
  const mois = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${d.getUTCFullYear()}/${mois}/${randomUUID()}-${assainir(nom)}`;
}

const lisible = (octets: number): string =>
  octets >= 1024 * 1024
    ? `${Math.round(octets / (1024 * 1024))} Mo`
    : `${Math.max(1, Math.round(octets / 1024))} Ko`;

/**
 * Ajoute un fichier à la médiathèque : l'objet dans le bucket, puis la
 * fiche en base.
 *
 * ⚠ Les deux écritures ne sont pas une transaction — Storage et Postgres
 * sont deux services. Si la fiche échoue après le téléversement, l'objet
 * est retiré immédiatement : mieux vaut un échec net qu'un fichier
 * orphelin dans le bucket, facturé et invisible du back-office.
 *
 * `alt` est accepté vide pour ne pas bloquer un enregistrement en cours,
 * mais l'écran DOIT le demander — `mediasSansAlt()` sert à le rappeler.
 */
export async function televerser(
  fichier: File,
  alt = "",
): Promise<ResultatMedia> {
  const etat = etatMediatheque();
  if (!etat.disponible) return { ok: false, erreur: etat.raison };

  if (!fichier || typeof fichier.arrayBuffer !== "function") {
    return { ok: false, erreur: "Aucun fichier reçu." };
  }
  if (fichier.size === 0) {
    return { ok: false, erreur: "Le fichier est vide." };
  }
  if (fichier.size > TAILLE_MAX) {
    return {
      ok: false,
      erreur: `Fichier trop lourd (${lisible(fichier.size)}). Maximum ${lisible(TAILLE_MAX)} — redimensionnez l'image avant de l'envoyer.`,
    };
  }

  const type = (fichier.type || "").toLowerCase().split(";")[0].trim();
  if (!TYPES_AUTORISES.includes(type as (typeof TYPES_AUTORISES)[number])) {
    return {
      ok: false,
      erreur:
        "Format non accepté. Formats possibles : JPEG, PNG, WebP, AVIF, GIF, SVG et PDF.",
    };
  }

  const chemin = cheminPour(fichier.name || "fichier");
  const octets = Buffer.from(await fichier.arrayBuffer());
  const db = clientSupabase();

  const envoi = await db.storage.from(BUCKET).upload(chemin, octets, {
    contentType: type,
    /* Le chemin porte un uuid : une collision signifierait un vrai
       problème, pas un doublon à écraser silencieusement. */
    upsert: false,
  });
  if (envoi.error) {
    return {
      ok: false,
      erreur: `Téléversement refusé : ${envoi.error.message}. Vérifiez que le bucket « ${BUCKET} » existe.`,
    };
  }

  const taille = dimensions(octets, type);
  const ligne = {
    id: randomUUID(),
    chemin,
    nom: fichier.name || assainir(chemin),
    alt: alt.trim(),
    type,
    taille: fichier.size,
    largeur: taille?.largeur ?? null,
    hauteur: taille?.hauteur ?? null,
    updated_by: await auteurCourant(),
  };

  const { data, error } = await db
    .from("medias")
    .insert(ligne)
    .select("*")
    .single();

  if (error || !data) {
    await db.storage.from(BUCKET).remove([chemin]);
    return {
      ok: false,
      erreur: `Fichier envoyé mais fiche non enregistrée : ${error?.message ?? "réponse vide"}. Rien n'a été conservé.`,
    };
  }

  const media = versTs(data as LigneMedia);
  cheminsConnus.set(media.id, media.chemin);
  invaliderCache();
  return { ok: true, media };
}

/* ──────────────────────────────────────────────────────────────────
   SUPPRESSION
   ────────────────────────────────────────────────────────────────── */

/**
 * Retire un média : la fiche ET le fichier.
 *
 * ⚠ La fiche part en dernier. Si le retrait du bucket échoue, la fiche
 * reste : le média est toujours visible et la suppression peut être
 * retentée. L'inverse — fiche supprimée, objet resté — laisserait un
 * fichier facturé que plus rien ne référence.
 *
 * ⚠ AUCUNE VÉRIFICATION DES USAGES. Une image encore utilisée par une
 * agence ou un article disparaîtra du site. C'est le comportement de
 * WordPress, et le prix à payer pour que les écrans acceptent aussi des
 * URL externes : il n'existe pas de graphe de références fiable. C'est à
 * l'interface d'avertir avant de confirmer.
 */
export async function supprimerMedia(id: string): Promise<Resultat> {
  const etat = etatMediatheque();
  if (!etat.disponible) return { ok: false, erreur: etat.raison };
  if (!UUID.test(id)) return { ok: false, erreur: "Identifiant de média invalide." };

  const db = clientSupabase();
  const { data, error } = await db
    .from("medias")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return { ok: false, erreur: `Média introuvable : ${error.message}` };
  }
  if (!data) return { ok: false, erreur: "Ce média n'existe plus." };

  const ligne = data as LigneMedia;

  /* L'instantané part AVANT la suppression : c'est la seule trace qui
     restera de ce fichier, avec son nom et son texte alternatif. */
  await journaliserExterne(`media:${id}`, ligne);

  const retrait = await db.storage.from(BUCKET).remove([ligne.chemin]);
  if (retrait.error) {
    return {
      ok: false,
      erreur: `Fichier non supprimé du stockage : ${retrait.error.message}. La fiche a été conservée, réessayez.`,
    };
  }

  const suppression = await db.from("medias").delete().eq("id", id);
  if (suppression.error) {
    return {
      ok: false,
      erreur: `Fichier supprimé mais fiche conservée : ${suppression.error.message}`,
    };
  }

  cheminsConnus.delete(id);
  signatures.delete(ligne.chemin);
  invaliderCache();
  return { ok: true };
}

/* ──────────────────────────────────────────────────────────────────
   DIMENSIONS — lues dans l'en-tête, sans dépendance

   La médiathèque affiche « 1600 × 900 » comme celle de WordPress, et
   c'est ce qui permet au client de repérer seul l'image de 6 000 px
   qu'il vient d'envoyer. Les quatre formats matriciels courants suffisent :
   un PDF ou un SVG n'ont pas de dimensions en pixels, et un format
   inconnu rend `undefined` plutôt qu'un chiffre faux.
   ────────────────────────────────────────────────────────────────── */

type Dimensions = { largeur: number; hauteur: number } | undefined;

function dimensions(buf: Buffer, type: string): Dimensions {
  try {
    if (type === "image/png") return dimensionsPng(buf);
    if (type === "image/gif") return dimensionsGif(buf);
    if (type === "image/jpeg") return dimensionsJpeg(buf);
    if (type === "image/webp") return dimensionsWebp(buf);
  } catch {
    /* En-tête tronqué ou exotique : mieux vaut pas de dimensions qu'une
       valeur inventée. */
  }
  return undefined;
}

function dimensionsPng(b: Buffer): Dimensions {
  /* Signature PNG, puis le chunk IHDR : largeur et hauteur en gros
     boutiste aux octets 16 et 20. */
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return undefined;
  return { largeur: b.readUInt32BE(16), hauteur: b.readUInt32BE(20) };
}

function dimensionsGif(b: Buffer): Dimensions {
  if (b.length < 10 || b.toString("ascii", 0, 3) !== "GIF") return undefined;
  return { largeur: b.readUInt16LE(6), hauteur: b.readUInt16LE(8) };
}

function dimensionsJpeg(b: Buffer): Dimensions {
  if (b.length < 4 || b.readUInt16BE(0) !== 0xffd8) return undefined;
  let o = 2;
  while (o + 9 < b.length) {
    if (b[o] !== 0xff) {
      o += 1;
      continue;
    }
    const marqueur = b[o + 1];
    /* Marqueurs sans charge utile : on avance simplement. */
    if (marqueur === 0xd8 || marqueur === 0x01 || (marqueur >= 0xd0 && marqueur <= 0xd7)) {
      o += 2;
      continue;
    }
    /* Début d'image (SOF0…SOF15), hors tables de Huffman (C4),
       arithmétiques (C8) et DNL (CC) : c'est là que sont les tailles. */
    const sof =
      marqueur >= 0xc0 &&
      marqueur <= 0xcf &&
      marqueur !== 0xc4 &&
      marqueur !== 0xc8 &&
      marqueur !== 0xcc;
    if (sof) return { hauteur: b.readUInt16BE(o + 5), largeur: b.readUInt16BE(o + 7) };
    const longueur = b.readUInt16BE(o + 2);
    if (longueur < 2) return undefined;
    o += 2 + longueur;
  }
  return undefined;
}

function dimensionsWebp(b: Buffer): Dimensions {
  if (b.length < 30 || b.toString("ascii", 8, 12) !== "WEBP") return undefined;
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    /* Trois octets petit-boutiste, valeur diminuée de 1 par le format. */
    const l = b[24] | (b[25] << 8) | (b[26] << 16);
    const h = b[27] | (b[28] << 8) | (b[29] << 16);
    return { largeur: l + 1, hauteur: h + 1 };
  }
  if (chunk === "VP8 ") {
    return {
      largeur: b.readUInt16LE(26) & 0x3fff,
      hauteur: b.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    /* 14 bits de largeur puis 14 bits de hauteur, après l'octet de
       signature 0x2f. */
    const bits = b.readUInt32LE(21);
    return {
      largeur: (bits & 0x3fff) + 1,
      hauteur: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  return undefined;
}
