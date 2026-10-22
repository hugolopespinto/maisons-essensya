import ankara from "./ankara";
import athenes from "./athenes";
import berlin from "./berlin";
import dakar from "./dakar";
import dublin from "./dublin";
import hanoi from "./hanoi";
import jakarta from "./jakarta";
import lima from "./lima";
import lisbonne from "./lisbonne";
import londres from "./londres";
import monaco from "./monaco";
import oslo from "./oslo";
import panama from "./panama";
import paris from "./paris";
import pekin from "./pekin";
import prague from "./prague";
import quito from "./quito";
import rome from "./rome";
import stockholm from "./stockholm";
import tokyo from "./tokyo";
import vienne from "./vienne";

/* ════════════════════════════════════════════════════════════════
   LES TEXTES DES MODÈLES

   Une fiche rédigée par modèle, livrée par le client le 14/10 en Word
   (« texte modeles/ »), convertie par scripts/textes-modeles.mjs. Les
   fichiers voisins sont PRODUITS par ce script : c'est lui qu'on
   relance quand une fiche révisée arrive.

   ── VINGT ET UN TEXTES, ONZE FICHES EN LIGNE ──
   Les textes couvrent les vingt et un modèles du tableau ; seuls ceux
   du catalogue (src/data/gamme.ts) ont une page. Les dix autres —
   Monaco, Oslo, Panama, Paris, Prague, Quito, Rome, Stockholm, Tokyo,
   Vienne — attendent leurs rendus : leur texte est prêt, et leur fiche
   le portera le jour où ils entreront au catalogue.

   Un modèle sans texte garde le gabarit nu (H1 « Maison <nom> ») :
   c'est le cas de tout modèle ajouté au catalogue avant sa fiche.
   ════════════════════════════════════════════════════════════════ */

export interface TexteModele {
  /**
   * Le H1 de la fiche, tel que le rédacteur l'a écrit — la requête visée
   * d'abord (« Maison 2 chambres : … »). Il remplace « Maison Ankara »,
   * qui ne contenait aucun terme recherché.
   */
  h1: string;
  /**
   * Le reste du texte, en Markdown léger (`##`, `###`, listes, gras,
   * liens) : la grammaire de src/lib/markdown.ts, rendue par
   * `markdownToHtml`. Jamais de `#` seul : le H1 est le champ du dessus.
   */
  corps: string;
}

const TEXTES: Record<string, TexteModele> = {
  ankara,
  athenes,
  berlin,
  dakar,
  dublin,
  hanoi,
  jakarta,
  lima,
  lisbonne,
  londres,
  monaco,
  oslo,
  panama,
  paris,
  pekin,
  prague,
  quito,
  rome,
  stockholm,
  tokyo,
  vienne,
};

/** Le texte d'un modèle, par son slug, ou `null` s'il n'en a pas encore. */
export const texteDe = (slug: string): TexteModele | null => TEXTES[slug] ?? null;
