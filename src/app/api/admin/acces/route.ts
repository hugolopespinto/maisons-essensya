import { NextResponse } from "next/server";
import { sessionPour, setSessionCookie } from "@/lib/admin/auth";
import { cheminAcces, definirMotDePasse, motifMotDePasseFaible } from "@/lib/admin/comptes";

/* ════════════════════════════════════════════════════════════════
   LIEN D'ACCÈS — enregistrement du mot de passe

   POST classique, réponse 303 : même raison que la connexion (voir
   src/app/api/admin/login/route.ts) — c'est le motif que les
   gestionnaires de mots de passe reconnaissent pour proposer
   d'enregistrer le mot de passe qui vient d'être choisi.

   Le jeton est CONSOMMÉ ici, dans la requête qui enregistre le mot de
   passe : un lien cliqué deux fois ne sert qu'une fois.
   ════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Retour au formulaire, jeton compris, avec un code d'erreur. */
function retour(req: Request, jeton: string, params: Record<string, string>) {
  const url = new URL(cheminAcces(jeton), req.url);
  for (const [cle, valeur] of Object.entries(params)) url.searchParams.set(cle, valeur);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const jeton = String(form.get("jeton") ?? "");
  const motDePasse = String(form.get("motdepasse") ?? "");
  const confirmation = String(form.get("confirmation") ?? "");

  if (motDePasse !== confirmation) return retour(req, jeton, { e: "different" });

  const motif = motifMotDePasseFaible(motDePasse);
  if (motif) return retour(req, jeton, { e: "faible", motif });

  let admin;
  try {
    admin = await definirMotDePasse(jeton, motDePasse);
  } catch (e) {
    console.error("[admin/acces] enregistrement impossible :", (e as Error).message);
    return retour(req, jeton, { e: "base" });
  }

  /* Lien expiré ou déjà utilisé : la page le dit d'elle-même en
     revérifiant le jeton, inutile d'ajouter un code. */
  if (!admin) return retour(req, jeton, {});

  await setSessionCookie(sessionPour(admin));
  return NextResponse.redirect(new URL("/admin", req.url), 303);
}

/* Une navigation directe vers cette adresse n'a rien à afficher. */
export async function GET(req: Request) {
  return NextResponse.redirect(new URL("/admin/login", req.url), 303);
}
