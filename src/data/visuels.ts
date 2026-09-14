import catalogue from "./visuels.json";

/* ════════════════════════════════════════════════════════════════
   LE CATALOGUE DES VISUELS

   Écrit par `scripts/images.mjs` à partir des rendus livrés par le
   client, jamais à la main. Chaque entrée porte de quoi afficher une
   image correctement du premier coup : les deux largeurs, les
   dimensions réelles — sans elles le navigateur ne réserve pas la place
   et la page saute au chargement — et une empreinte de 20 px qui tient
   le cadre en attendant le réseau.

   ⚠ LES SOURCES FONT 1376 px DE LARGE. Aucune image ne peut être servie
   plus grande : sur un écran très large, un bandeau pleine largeur sera
   légèrement étiré. C'est une limite de la livraison, pas du code, et
   elle se lève en redemandant les rendus en 2560 px.
   ════════════════════════════════════════════════════════════════ */

export interface Visuel {
  cle: string;
  src: string;
  srcPetit: string;
  largeur: number;
  hauteur: number;
  /** Miniature encodée, posée en fond le temps du chargement. */
  empreinte: string;
  type: "exterieur" | "interieur";
}

export interface Modele {
  /** Le nom tel que le client l'écrit : « Athènes », « Lisbonne ». */
  nom: string;
  vues: Visuel[];
}

const MODELES = catalogue as Record<string, Modele>;

export const modeles = (): { cle: string; modele: Modele }[] =>
  Object.entries(MODELES).map(([cle, modele]) => ({ cle, modele }));

export const modele = (cle: string): Modele | null => MODELES[cle] ?? null;

/**
 * Une vue précise. Lève si elle n'existe pas — volontairement.
 *
 * Une image manquante référencée par une page doit casser le build, pas
 * produire un carré vide en production : c'est le seul moment où
 * quelqu'un la verra avant le visiteur. Le nom du modèle et celui de la
 * vue viennent du dossier livré, ils ne changent pas tout seuls.
 */
export function vue(cleModele: string, cleVue: string): Visuel {
  const m = MODELES[cleModele];
  const v = m?.vues.find((x) => x.cle === cleVue);
  if (!v) {
    throw new Error(
      `Visuel introuvable : ${cleModele}/${cleVue}. ` +
        `Vues disponibles : ${m ? m.vues.map((x) => x.cle).join(", ") : "modèle inconnu"}`,
    );
  }
  return v;
}

/** La première vue extérieure d'un modèle — sa façade de présentation. */
export const facade = (cleModele: string): Visuel | null =>
  MODELES[cleModele]?.vues.find((v) => v.type === "exterieur") ?? null;
