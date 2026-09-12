import { NextResponse } from "next/server";
import {
  DELAI_ECHEC_MS,
  attendre,
  ipClient,
  noterEchec,
  reinitialiserEchecs,
  tropDeTentatives,
} from "@/lib/admin/tentatives";
import { createSession, isAdminEnabled, setSessionCookie } from "@/lib/admin/auth";

/* ════════════════════════════════════════════════════════════════
   CONNEXION — POINT D'ENTRÉE HTTP CLASSIQUE

   ⚠ POURQUOI PAS UNE SERVER ACTION, alors que tout le reste du
   back-office en utilise ?

   Parce que les gestionnaires de mots de passe ne les reconnaissent pas.
   Chrome, Firefox et Safari décident de proposer « enregistrer ce mot de
   passe ? » sur une heuristique simple : un formulaire est envoyé, puis
   le DOCUMENT navigue. Une Server Action, elle, répond en RSC et le
   `redirect()` qu'elle exécute est une navigation CÔTÉ CLIENT — le
   navigateur ne voit jamais le second temps, et ne propose donc rien.
   Constaté sur le déploiement : l'e-mail était pré-rempli par
   l'autocomplétion générique, jamais le mot de passe.

   D'où ce POST classique qui répond **303 See Other**. C'est le motif
   que les navigateurs reconnaissent depuis toujours : envoi, redirection
   de document, proposition d'enregistrement. Il fonctionne aussi sans
   JavaScript, comme l'écran de connexion l'exigeait déjà.

   Le 303 (et non 302) est délibéré : il impose au navigateur de suivre
   la redirection en GET, ce qui évite de renvoyer le mot de passe sur
   la page d'arrivée.

   Tout le reste est identique à l'ancienne Server Action, compteur de
   tentatives COMPRIS — il vit dans `@/lib/admin/tentatives`, partagé par
   les deux chemins. Deux compteurs séparés auraient valu aucun compteur.
   ════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Réponse unique de tous les échecs : on ne dit jamais lequel. */
function refus(req: Request) {
  return NextResponse.redirect(new URL("/admin/login?e=1", req.url), 303);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "");
  const motDePasse = String(form.get("motdepasse") ?? "");
  const ip = await ipClient();

  /* Quota épuisé : on ne vérifie même pas les identifiants. Annoncer le
     blocage renseignerait un attaquant sur l'efficacité de sa campagne,
     et sur l'existence du compte visé — donc même réponse que pour un
     mot de passe faux. */
  if (tropDeTentatives(ip)) {
    await attendre(DELAI_ECHEC_MS);
    return refus(req);
  }

  const token = isAdminEnabled() ? await createSession(motDePasse, email) : null;

  if (!token) {
    noterEchec(ip);
    await attendre(DELAI_ECHEC_MS);
    /* Un seul code d'erreur, jamais de détail : ne dire ni « mot de passe
       incorrect », ni « compte inconnu », ni « back-office non
       configuré », ni « trop de tentatives ». */
    return refus(req);
  }

  reinitialiserEchecs(ip);
  await setSessionCookie(token);
  return NextResponse.redirect(new URL("/admin", req.url), 303);
}

/* Une navigation directe vers cette adresse n'a rien à afficher. */
export async function GET(req: Request) {
  return NextResponse.redirect(new URL("/admin/login", req.url), 303);
}
