import "server-only";
import { AwsClient } from "aws4fetch";

/* ════════════════════════════════════════════════════════════════
   STOCKAGE DE FICHIERS — le bucket S3 (Cellar chez Clever Cloud)

   Les fichiers de la médiathèque vivaient dans Supabase Storage. Ils
   vont dans Cellar, le stockage objet de Clever Cloud, hébergé en
   France et compatible avec l'API S3. Ce module ne parle QUE le
   protocole S3 standard : n'importe quel stockage compatible (Scaleway,
   OVHcloud…) fait l'affaire en changeant quatre variables.

   Il ne sait faire que trois choses — déposer, retirer, signer une
   adresse temporaire — et un seul module l'appelle : `src/lib/medias.ts`,
   qui garde le fichier et sa fiche synchrones.

   POURQUOI `aws4fetch` ET PAS LE SDK D'AMAZON : il signe les requêtes
   (SigV4) au-dessus du `fetch` natif, en quelques kilo-octets et sans
   dépendance. Le SDK officiel pèse plusieurs méga-octets, et ses
   versions récentes ajoutent par défaut des sommes de contrôle que
   plusieurs stockages compatibles S3 refusent.

   CONFIGURATION — les noms Clever Cloud sont lus d'office, il suffit de
   lier l'add-on Cellar à l'application ; les noms S3_* les remplacent
   pour un autre fournisseur :
     · S3_ENDPOINT          ou CELLAR_ADDON_HOST       — l'hôte ;
     · S3_ACCESS_KEY_ID     ou CELLAR_ADDON_KEY_ID ;
     · S3_SECRET_ACCESS_KEY ou CELLAR_ADDON_KEY_SECRET ;
     · S3_BUCKET — le nom du bucket, à créer une fois (privé) ;
     · S3_REGION — facultatif, « us-east-1 » par défaut, ce qu'attendent
       Cellar et la plupart des stockages compatibles.

   ⚠ Les clés ne doivent jamais atteindre le navigateur : `server-only`,
   et aucune variable NEXT_PUBLIC_. Le navigateur ne voit que des
   adresses signées, qui expirent.
   ════════════════════════════════════════════════════════════════ */

/* Lues à la requête : une constante de module fige la valeur dans les
   artefacts de build. */
const env = (...noms: string[]): string => {
  for (const nom of noms) {
    const v = (process.env[nom] ?? "").trim();
    if (v) return v;
  }
  return "";
};

const cleAcces = () => env("S3_ACCESS_KEY_ID", "CELLAR_ADDON_KEY_ID");
const cleSecrete = () => env("S3_SECRET_ACCESS_KEY", "CELLAR_ADDON_KEY_SECRET");
const bucket = () => env("S3_BUCKET");
const region = () => env("S3_REGION") || "us-east-1";

/**
 * L'origine du stockage, schéma compris, sans barre finale.
 *
 * Clever Cloud donne un hôte nu (`cellar-c2.services.clever-cloud.com`) ;
 * d'autres fournisseurs documentent une URL complète. On accepte les
 * deux, et on impose HTTPS quand rien n'est précisé : des clés S3 ne
 * circulent pas en clair.
 */
export function origineStockage(): string {
  const brut = env("S3_ENDPOINT", "CELLAR_ADDON_HOST").replace(/\/+$/, "");
  if (!brut) return "";
  return /^https?:\/\//i.test(brut) ? brut : `https://${brut}`;
}

/** Les cinq réglages sont là. Sans eux, la médiathèque se dit indisponible. */
export function isStockageConfigure(): boolean {
  return Boolean(origineStockage() && cleAcces() && cleSecrete() && bucket());
}

/* Un seul client par processus. Il ne garde aucun état de session : la
   signature est recalculée à chaque requête à partir des clés. */
let client: AwsClient | null = null;

function aws(): AwsClient {
  client ??= new AwsClient({
    accessKeyId: cleAcces(),
    secretAccessKey: cleSecrete(),
    service: "s3",
    region: region(),
  });
  return client;
}

/**
 * L'adresse d'un objet, en « path-style » (`hôte/bucket/clé`).
 *
 * Path-style plutôt que sous-domaine (`bucket.hôte/clé`) : il fonctionne
 * chez tous les fournisseurs compatibles, quel que soit le nom du bucket,
 * et ne demande aucun certificat générique. Chaque segment est encodé :
 * les chemins produits par la médiathèque sont déjà sûrs, mais une
 * fonction qui fabrique une URL ne doit pas parier sur ses entrées.
 */
function urlObjet(chemin: string): URL {
  const cle = chemin.split("/").map(encodeURIComponent).join("/");
  return new URL(`${origineStockage()}/${encodeURIComponent(bucket())}/${cle}`);
}

/** Message d'erreur lisible à partir d'une réponse S3 (du XML, en général). */
async function motif(r: Response): Promise<string> {
  const corps = await r.text().catch(() => "");
  const code = /<Code>([^<]+)<\/Code>/.exec(corps)?.[1];
  return `HTTP ${r.status}${code ? ` — ${code}` : ""}`;
}

/**
 * Adresse temporaire d'un objet, signée localement.
 *
 * Aucun appel réseau : la signature se calcule avec la clé secrète. Le
 * stockage vérifie la signature et l'échéance à la lecture, et refuse
 * l'adresse dès qu'elle a expiré.
 */
export async function signerObjet(chemin: string, secondes: number): Promise<string> {
  const url = urlObjet(chemin);
  /* S3 plafonne à sept jours. Au-delà, l'adresse serait refusée. */
  url.searchParams.set("X-Amz-Expires", String(Math.min(Math.max(secondes, 1), 604_800)));
  const signee = await aws().sign(url, { method: "GET", aws: { signQuery: true } });
  return signee.url;
}

/** Dépose un objet. Lève avec un message affichable si le stockage refuse. */
export async function deposerObjet(
  chemin: string,
  contenu: ArrayBuffer,
  type: string,
): Promise<void> {
  const r = await aws().fetch(urlObjet(chemin), {
    method: "PUT",
    body: contenu,
    headers: { "Content-Type": type },
    /* Une écriture n'a rien à faire dans le cache de `fetch` de Next. */
    cache: "no-store",
  });
  if (!r.ok) throw new Error(await motif(r));
}

/**
 * Retire un objet. S3 répond « succès » même si l'objet n'existait plus :
 * c'est le comportement voulu, une suppression retentée ne doit pas
 * échouer parce que la première avait abouti.
 */
export async function retirerObjet(chemin: string): Promise<void> {
  const r = await aws().fetch(urlObjet(chemin), { method: "DELETE", cache: "no-store" });
  if (!r.ok && r.status !== 404) throw new Error(await motif(r));
}
