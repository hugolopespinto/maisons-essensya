import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/app/admin/actions";
import {
  etatMediatheque,
  listerMedias,
  signerChemins,
  televerser,
  TAILLE_MAX,
  TYPES_AUTORISES,
} from "@/lib/medias";
import type { Media } from "@/lib/store/types";

/* ════════════════════════════════════════════════════════════════
   MÉDIATHÈQUE — LA ROUTE DE TÉLÉVERSEMENT

   POURQUOI UNE ROUTE ET PAS UNE SERVER ACTION. Une Server Action reçoit
   son corps sérialisé par le runtime React, avec une limite de taille
   basse (1 Mo par défaut) et aucune notion de progression : un JPEG de
   4 Mo y est refusé sans que le client comprenne pourquoi. Un
   `multipart/form-data` binaire appartient à un handler HTTP, qui le lit
   en flux et répond ce qu'il veut. Le reste du back-office continue de
   passer par des Server Actions — c'est le seul cas qui ne le peut pas.

   ⚠ CETTE ROUTE EST UN POINT D'ENTRÉE PUBLIC, exactement comme une
   Server Action : elle est joignable en POST direct, sans passer par
   l'écran. `assertAdmin()` est donc appelé en première ligne des DEUX
   verbes, avant toute lecture du corps de la requête.

   CE QU'ON NE FAIT JAMAIS : faire confiance au fichier reçu.
   Trois verrous, dans cet ordre, du moins cher au plus cher :
     1. la TAILLE annoncée (`content-length`) — on refuse avant d'avoir
        bufferisé quoi que ce soit ;
     2. le TYPE DÉCLARÉ, contre une liste blanche ;
     3. le TYPE RÉEL, lu dans les premiers octets du fichier.
   Le verrou 3 est le seul qui compte vraiment : `file.type` vient du
   navigateur, qui l'a lui-même déduit de l'EXTENSION. Renommer
   `charge.exe` en `photo.png` suffit à obtenir un `image/png` déclaré.
   On compare donc toujours ce qui est annoncé à ce qui est écrit dans
   l'en-tête du fichier, et on refuse au moindre désaccord.

   ⚠ Le stockage lui-même reste l'affaire de `src/lib/medias.ts` — le
   seul module autorisé à toucher au bucket. Cette route valide, elle
   n'écrit pas.
   ════════════════════════════════════════════════════════════════ */

/* Le sniffing lit des octets avec `Buffer` : c'est du Node, pas de l'Edge. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fichiers acceptés par requête. Le glisser-déposer d'un dossier entier
 *  est une erreur de manipulation courante — on l'arrête net plutôt que
 *  de lancer deux cents téléversements. */
const MAX_FICHIERS = 20;

/** Plafond du corps complet : de quoi envoyer plusieurs fichiers à la
 *  taille maximale, avec la marge du protocole multipart. */
const MAX_CORPS = TAILLE_MAX * 5;

/* ──────────────────────────────────────────────────────────────────
   GARDE
   ────────────────────────────────────────────────────────────────── */

/** Vrai si la requête est authentifiée. `assertAdmin()` lève ; ici on a
 *  besoin d'un code HTTP, pas d'une exception qui finirait en 500. */
async function autorise(): Promise<boolean> {
  try {
    await assertAdmin();
    return true;
  } catch {
    return false;
  }
}

/* Réponse volontairement pauvre et identique dans tous les cas de refus :
   elle ne dit ni si le back-office est configuré, ni si la session a
   expiré, ni si le compte existe. */
const refus = () =>
  NextResponse.json({ ok: false, erreur: "Accès refusé." }, { status: 401 });

/* ──────────────────────────────────────────────────────────────────
   TYPE RÉEL — lecture des octets de tête

   Aucune dépendance : les signatures des sept formats acceptés tiennent
   en quarante lignes, et une bibliothèque de plus pour ça serait une
   surface d'attaque de plus.
   ────────────────────────────────────────────────────────────────── */

const ascii = (b: Buffer, d: number, f: number): string =>
  b.length >= f ? b.toString("ascii", d, f) : "";

/**
 * Le type réellement contenu dans ces octets, ou `null` si rien de connu
 * n'y est reconnu — auquel cas on refuse, quelle que soit l'extension.
 */
function typeReel(tete: Buffer): string | null {
  if (tete.length < 12) return null;

  /* JPEG : SOI suivi d'un marqueur. */
  if (tete[0] === 0xff && tete[1] === 0xd8 && tete[2] === 0xff) return "image/jpeg";

  /* PNG : signature de huit octets, celle du standard. */
  if (
    tete[0] === 0x89 &&
    ascii(tete, 1, 4) === "PNG" &&
    tete[4] === 0x0d &&
    tete[5] === 0x0a &&
    tete[6] === 0x1a &&
    tete[7] === 0x0a
  ) {
    return "image/png";
  }

  const six = ascii(tete, 0, 6);
  if (six === "GIF87a" || six === "GIF89a") return "image/gif";

  /* WebP : conteneur RIFF dont le type de forme est « WEBP ». */
  if (ascii(tete, 0, 4) === "RIFF" && ascii(tete, 8, 12) === "WEBP") {
    return "image/webp";
  }

  /* AVIF : boîte ISOBMFF `ftyp`. La marque principale et les marques
     compatibles tiennent dans les vingt-quatre premiers octets ; on
     cherche « avif » / « avis » parmi elles plutôt que de dérouler le
     conteneur, ce qui suffit à distinguer un AVIF d'un MP4. */
  if (ascii(tete, 4, 8) === "ftyp") {
    const marques = ascii(tete, 8, Math.min(tete.length, 32));
    if (marques.includes("avif") || marques.includes("avis")) return "image/avif";
    return null;
  }

  if (ascii(tete, 0, 5) === "%PDF-") return "application/pdf";

  /* SVG : du XML, donc pas de signature binaire. On accepte l'en-tête
     XML, une éventuelle déclaration de type, un commentaire, ou la
     balise racine directement — mais la balise `<svg` doit apparaître. */
  const texte = tete.toString("utf8").replace(/^﻿/, "").trimStart();
  if (/^<(\?xml|!--|!DOCTYPE svg|svg)[\s>]/i.test(texte) && /<svg[\s>]/i.test(texte)) {
    return "image/svg+xml";
  }

  return null;
}

/**
 * Un SVG est du code exécutable, pas une image.
 *
 * Il est servi depuis le domaine de Supabase Storage et affiché dans une
 * balise `<img>`, où aucun script ne s'exécute — c'est le raisonnement
 * documenté dans `src/lib/medias.ts`, et il tient. Mais une URL signée
 * ouverte dans un onglet, elle, rend le document en entier. On refuse
 * donc les SVG porteurs de script : un logo n'en a jamais besoin, et
 * c'est le seul usage prévu pour ce format ici.
 */
function svgDangereux(source: string): boolean {
  const s = source.toLowerCase();
  return (
    s.includes("<script") ||
    s.includes("javascript:") ||
    s.includes("<foreignobject") ||
    /\son\w+\s*=/.test(s)
  );
}

/** Message de refus — écrit pour le client, pas pour un journal. */
async function verifier(fichier: File): Promise<string | null> {
  if (fichier.size === 0) return `« ${fichier.name} » est vide.`;
  if (fichier.size > TAILLE_MAX) {
    const mo = Math.round((fichier.size / (1024 * 1024)) * 10) / 10;
    return `« ${fichier.name} » pèse ${mo} Mo — le maximum est de ${Math.round(TAILLE_MAX / (1024 * 1024))} Mo. Redimensionnez l'image avant de l'envoyer.`;
  }

  const declare = (fichier.type || "").toLowerCase().split(";")[0].trim();
  if (!TYPES_AUTORISES.includes(declare as (typeof TYPES_AUTORISES)[number])) {
    return `« ${fichier.name} » n'est pas dans un format accepté. Formats possibles : JPEG, PNG, WebP, AVIF, GIF, SVG et PDF.`;
  }

  /* Quatre kilo-octets : assez pour couvrir un en-tête XML bavard avant
     la balise `<svg`, et sans rapport avec le poids du fichier. */
  const tete = Buffer.from(await fichier.slice(0, 4096).arrayBuffer());
  const reel = typeReel(tete);

  if (reel !== declare) {
    /* Le désaccord est le cas intéressant : soit le fichier est corrompu,
       soit il a été renommé. On ne distingue pas — on refuse. */
    return `« ${fichier.name} » n'a pas le contenu annoncé par son extension. Le fichier est peut-être abîmé, ou renommé : il n'a pas été envoyé.`;
  }

  if (reel === "image/svg+xml" && svgDangereux(await fichier.text())) {
    return `« ${fichier.name} » contient du code exécutable (script ou gestionnaire d'événement). Un SVG de logo n'en a pas besoin : exportez-le à nouveau depuis votre outil de dessin.`;
  }

  return null;
}

/* ──────────────────────────────────────────────────────────────────
   GET — LA BIBLIOTHÈQUE, POUR LE SÉLECTEUR

   Le sélecteur de média (`src/components/admin/MediaPicker.tsx`) est un
   composant CLIENT posé dans des écrans serveur : il ne peut pas lire la
   base lui-même, et lui passer la liste en props obligerait chaque écran
   à la charger, même quand la surcouche n'est jamais ouverte. Il la
   demande donc ici, une fois, à l'ouverture.

   Les URL sont signées côté serveur : le bucket est privé, et le
   navigateur n'a pas de quoi signer quoi que ce soit.
   ────────────────────────────────────────────────────────────────── */

/** Ce que reçoit le sélecteur. `chemin` n'y figure pas : le navigateur
 *  n'a rien à faire de l'arborescence interne du bucket. */
export type MediaPublie = Omit<Media, "chemin"> & { url: string | null };

export async function GET(): Promise<NextResponse> {
  if (!(await autorise())) return refus();

  const etat = etatMediatheque();
  if (!etat.disponible) {
    /* 200, pas 503 : « la médiathèque n'est pas configurée » est une
       réponse valide que le sélecteur doit afficher, pas une panne. */
    return NextResponse.json({ ok: true, disponible: false, raison: etat.raison, medias: [] });
  }

  const medias = await listerMedias();
  const urls = await signerChemins(medias.map((m) => m.chemin));

  const publies: MediaPublie[] = medias.map(({ chemin, ...reste }) => ({
    ...reste,
    url: urls.get(chemin) ?? null,
  }));

  return NextResponse.json(
    { ok: true, disponible: true, medias: publies },
    /* Les URL signées expirent : rien à mettre en cache, nulle part. */
    { headers: { "Cache-Control": "no-store" } },
  );
}

/* ──────────────────────────────────────────────────────────────────
   POST — TÉLÉVERSEMENT
   ────────────────────────────────────────────────────────────────── */

/**
 * Réponse JSON pour le navigateur qui sait la lire, redirection pour
 * celui qui ne le sait pas.
 *
 * Le formulaire de secours de `/admin/medias` poste ici sans JavaScript :
 * lui renvoyer du JSON afficherait un objet brut dans la fenêtre. On
 * distingue les deux sur l'en-tête `Accept`, que `fetch()` pose
 * explicitement.
 *
 * ⚠ Les détails d'erreur ne passent PAS par l'URL de redirection : un
 * message repris tel quel d'un paramètre et réaffiché permettrait de
 * faire dire n'importe quoi à l'écran via un simple lien. Le chemin sans
 * JavaScript ne transporte donc que des CODES, traduits par l'écran.
 */
function reponse(
  requete: NextRequest,
  json: Record<string, unknown>,
  code: string,
  statut = 200,
): NextResponse {
  const veutJson = (requete.headers.get("accept") ?? "").includes("application/json");
  if (veutJson) return NextResponse.json(json, { status: statut });

  const url = new URL("/admin/medias", requete.url);
  url.searchParams.set("envoi", code);
  /* 303 : la redirection après un POST doit devenir un GET, sinon le
     navigateur rejoue le téléversement au premier rafraîchissement. */
  return NextResponse.redirect(url, 303);
}

export async function POST(requete: NextRequest): Promise<NextResponse> {
  if (!(await autorise())) return refus();

  const etat = etatMediatheque();
  if (!etat.disponible) {
    return reponse(requete, { ok: false, erreurs: [etat.raison] }, "indisponible", 503);
  }

  /* Refus AVANT lecture du corps : on ne bufferise pas 400 Mo pour
     découvrir ensuite qu'ils étaient de trop. L'en-tête peut mentir, mais
     un menteur sera arrêté plus bas, fichier par fichier. */
  const annonce = Number(requete.headers.get("content-length") ?? 0);
  if (Number.isFinite(annonce) && annonce > MAX_CORPS) {
    return reponse(
      requete,
      { ok: false, erreurs: ["Envoi trop volumineux. Envoyez les fichiers en plusieurs fois."] },
      "trop-gros",
      413,
    );
  }

  let formulaire: FormData;
  try {
    formulaire = await requete.formData();
  } catch {
    return reponse(
      requete,
      { ok: false, erreurs: ["Envoi illisible. Réessayez."] },
      "illisible",
      400,
    );
  }

  /* Toute entrée qui est un fichier est prise, quel que soit son nom de
     champ : le formulaire de secours, le glisser-déposer et le sélecteur
     ne nomment pas forcément leur champ de la même façon, et ce n'est pas
     au navigateur de connaître notre convention. */
  const fichiers: File[] = [];
  for (const valeur of formulaire.values()) {
    if (valeur instanceof File && valeur.size > 0) fichiers.push(valeur);
  }

  if (fichiers.length === 0) {
    return reponse(requete, { ok: false, erreurs: ["Aucun fichier reçu."] }, "vide", 400);
  }
  if (fichiers.length > MAX_FICHIERS) {
    return reponse(
      requete,
      {
        ok: false,
        erreurs: [
          `${fichiers.length} fichiers d'un coup, c'est trop (maximum ${MAX_FICHIERS}). Procédez par lots.`,
        ],
      },
      "trop-nombreux",
      400,
    );
  }

  /* Le texte alternatif n'est saisi à l'envoi que s'il y a UN fichier :
     appliquer le même à dix images serait pire que de ne rien mettre. */
  const alt = fichiers.length === 1 ? String(formulaire.get("alt") ?? "").slice(0, 300) : "";

  const ajoutes: MediaPublie[] = [];
  const erreurs: string[] = [];

  /* En série, volontairement : dix téléversements simultanés vers le même
     bucket n'iraient pas plus vite et rendraient les erreurs illisibles. */
  for (const fichier of fichiers) {
    const probleme = await verifier(fichier);
    if (probleme) {
      erreurs.push(probleme);
      continue;
    }
    const resultat = await televerser(fichier, alt);
    if (!resultat.ok) {
      erreurs.push(resultat.erreur);
      continue;
    }
    const { chemin, ...reste } = resultat.media;
    ajoutes.push({ ...reste, url: (await signerChemins([chemin])).get(chemin) ?? null });
  }

  const code = erreurs.length === 0 ? "ok" : ajoutes.length > 0 ? "partiel" : "echec";
  return reponse(
    requete,
    { ok: ajoutes.length > 0, medias: ajoutes, erreurs },
    code,
    ajoutes.length > 0 ? 200 : 400,
  );
}
