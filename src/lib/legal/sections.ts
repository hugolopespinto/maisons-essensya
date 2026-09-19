/* ════════════════════════════════════════════════════════════════
   LA CHARPENTE DES DEUX PAGES LÉGALES

   L'ordre des sections et, surtout, LEURS ANCRES. C'est le seul élément
   de ces pages qui ne traverse jamais le stockage.

   ⚠ POURQUOI LES ANCRES RESTENT EN CODE. Le corps de chaque section est
   désormais écrit par le client, titre compris. Si l'identifiant était
   dérivé du titre saisi, réécrire « 8. Vos droits » en « Vos droits »
   suffirait à faire disparaître `#droits` — et avec lui tout lien
   entrant, interne ou externe, sans le moindre avertissement. Une ancre
   morte dans une politique de données, c'est un visiteur qui ne trouve
   pas comment exercer son droit d'effacement.

   Le client peut donc tout réécrire ; il ne peut pas casser la
   navigation. C'est exactement la frontière qu'on veut.

   ⚠ LA GARDE CI-DESSOUS S'EXÉCUTE AU CHARGEMENT DU MODULE, donc au
   build. Supprimer un bloc de `pages-legales.ts` sans retirer sa section
   ici — ou l'inverse — fait échouer la construction plutôt que de servir
   une page amputée d'un paragraphe.
   ════════════════════════════════════════════════════════════════ */

export interface SectionLegale {
  /** L'identifiant d'ancre, posé sur le `<h2>`. Jamais issu du stockage. */
  ancre: string;
  /** La clé du bloc éditable qui porte le corps. */
  bloc: string;
}

const section = (ancre: string): SectionLegale => ({ ancre, bloc: `corps.${ancre}` });

export const SECTIONS_MENTIONS: SectionLegale[] = [
  "editeur",
  "publication",
  "hebergeur",
  "constructeur",
  "mediation",
  "propriete",
  "credits",
  "donnees",
  "droit",
].map(section);

export const SECTIONS_CONFIDENTIALITE: SectionLegale[] = [
  "responsable",
  "donnees",
  "finalites",
  "destinataires",
  "fournisseurs",
  "duree",
  "hebergement",
  "droits",
  "cookies",
  "maj",
].map(section);

/** Les dix-neuf ancres publiques, pour vérifier un lien interne. */
export const ANCRES_LEGALES: Record<string, string[]> = {
  "/mentions-legales": SECTIONS_MENTIONS.map((s) => s.ancre),
  "/confidentialite": SECTIONS_CONFIDENTIALITE.map((s) => s.ancre),
};

/* ⚠ GARDE-FOU DE COHÉRENCE, exécuté au chargement du module donc au
   build. Le catalogue des blocs (src/lib/store/pages-legales.ts) et
   cette charpente sont deux listes écrites à la main : elles peuvent
   diverger. Un bloc retiré d'un côté sans l'autre servirait une page
   amputée d'une section entière — et sur ces deux pages, une section
   manquante est une obligation non remplie. On échoue au build. */
import { PAGES_LEGALES } from "@/lib/store/pages-legales";

for (const [cle, sections] of [
  ["mentions-legales", SECTIONS_MENTIONS],
  ["confidentialite", SECTIONS_CONFIDENTIALITE],
] as const) {
  const page = PAGES_LEGALES.find((p) => p.cle === cle);
  if (!page) throw new Error(`Page légale « ${cle} » absente du catalogue de blocs.`);
  const presents = new Set(page.blocs.map((b) => b.cle));
  const manquants = sections.filter((s) => !presents.has(s.bloc)).map((s) => s.bloc);
  if (manquants.length) {
    throw new Error(
      `Sections déclarées sans bloc correspondant dans « ${cle} » : ${manquants.join(", ")}.`,
    );
  }
  const orphelins = page.blocs
    .map((b) => b.cle)
    .filter((c) => c.startsWith("corps.") && !sections.some((s) => s.bloc === c));
  if (orphelins.length) {
    throw new Error(
      `Blocs de corps jamais affichés dans « ${cle} » : ${orphelins.join(", ")}.`,
    );
  }
}
