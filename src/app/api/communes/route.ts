import { NextResponse } from "next/server";
import { chercherCommunes } from "@/lib/communes";

/* ════ AUTO-COMPLÉTION DES COMMUNES ════
   Interrogé à chaque frappe par le champ « Secteur du projet »
   (src/components/ChampCommune.tsx). Ne reçoit qu'un début de nom de
   commune ou de code postal, ne stocke rien et ne relaie rien : l'index
   est embarqué, aucun tiers ne voit passer la saisie. */

export const runtime = "nodejs";

/** Aucune commune française n'a un nom plus long ; au-delà, c'est du bruit. */
const MAX_SAISIE = 60;

export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.slice(0, MAX_SAISIE) ?? "";
  return NextResponse.json(chercherCommunes(q));
}
