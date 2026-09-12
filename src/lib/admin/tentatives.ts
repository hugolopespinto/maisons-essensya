import "server-only";
import { headers } from "next/headers";

/* ════════ LIMITATION DES TENTATIVES DE CONNEXION ════════

   Deux freins qui se complètent :
     1. un DÉLAI de ~400 ms après chaque échec — il ramène le débit à
        2,5 essais par seconde et par connexion, sans jamais gêner
        quelqu'un qui se trompe une fois ;
     2. un COMPTEUR par IP — au-delà de 8 échecs en 10 minutes, plus
        aucune tentative n'est évaluée, même juste. C'est ce qui manquait :
        un délai ne compte rien, donc n'arrête rien sur la durée.

   ⚠ MÉMOIRE DE PROCESSUS, exactement comme le quota de
   `src/app/api/leads/route.ts` : sur Netlify ou Vercel, chaque instance
   de function a la sienne et une instance froide repart de zéro. Ce
   compteur freine un script naïf, il n'arrête pas une attaque
   distribuée. C'est un garde-fou, pas une protection. Une vraie limite
   suppose un magasin partagé — Upstash Redis, Netlify Blobs, ou le
   rate-limiting du WAF devant le site.

   Seuls les ÉCHECS sont comptés, et une connexion réussie remet le
   compteur de l'IP à zéro : un bureau entier derrière une même IP
   publique ne doit pas se verrouiller parce que deux personnes ont mal
   tapé leur mot de passe. */
const FENETRE_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ECHECS = 8; // échecs tolérés par fenêtre et par IP
const MAX_CLES = 2_000; // plafond mémoire, purge au-delà

const echecs = new Map<string, number[]>();

/** IP du client, telle que la voit l'hébergeur. Mêmes en-têtes que l'API
 *  prospects — Netlify pose `x-nf-client-connection-ip`, les autres
 *  proxys `x-forwarded-for` (premier élément : le client d'origine). */
export async function ipClient(): Promise<string> {
  const h = await headers();
  const transmise = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return transmise || h.get("x-nf-client-connection-ip") || "inconnue";
}

/** Vrai si cette IP a épuisé son quota d'échecs sur la fenêtre courante. */
export function tropDeTentatives(ip: string): boolean {
  const maintenant = Date.now();
  const recents = (echecs.get(ip) ?? []).filter((t) => maintenant - t < FENETRE_MS);
  if (recents.length === 0) {
    echecs.delete(ip);
    return false;
  }
  echecs.set(ip, recents);
  return recents.length >= MAX_ECHECS;
}

export function noterEchec(ip: string): void {
  const maintenant = Date.now();
  const recents = (echecs.get(ip) ?? []).filter((t) => maintenant - t < FENETRE_MS);
  recents.push(maintenant);
  echecs.set(ip, recents);

  /* Purge opportuniste : la Map ne doit pas grossir indéfiniment sur une
     instance longue durée. On ne garde que les IP encore dans la fenêtre. */
  if (echecs.size > MAX_CLES) {
    for (const [cle, dates] of echecs) {
      if (!dates.some((t) => maintenant - t < FENETRE_MS)) echecs.delete(cle);
    }
  }
}

/** Connexion réussie : l'IP repart d'une ardoise vierge. */
export function reinitialiserEchecs(ip: string): void {
  echecs.delete(ip);
}

export const DELAI_ECHEC_MS = 400;
export const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));
