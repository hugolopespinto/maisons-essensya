import catalogue from "./visuels.json";

/* ════════════════════════════════════════════════════════════════
   LE CATALOGUE DES VISUELS

   Écrit par `scripts/images.mjs` à partir des rendus livrés par le
   client, jamais à la main. Chaque entrée porte de quoi afficher une
   image correctement du premier coup : toutes les largeurs produites en
   deux formats, les dimensions réelles — sans elles le navigateur ne
   réserve pas la place et la page saute au chargement — et une empreinte
   de 20 px qui tient le cadre en attendant le réseau.

   ⚠ LE PLAFOND EST CELUI DE CHAQUE SOURCE, ET ELLES NE SE VALENT PLUS.
   Le script ne fabrique jamais un palier plus grand que sa source. Les
   rendus livrés en premier font 1376 px — sur un écran très large, un
   bandeau pleine largeur sera légèrement étiré. Ceux de Pékin et les
   plans font 1920 et 2160 px et produisent un palier de plus, tout
   seuls. La limite est dans la livraison, pas dans le code : redemander
   les premiers rendus en 2560 px suffit à la lever au prochain passage.
   ════════════════════════════════════════════════════════════════ */

export interface Variante {
  largeur: number;
  avif: string;
  webp: string;
}

export interface Visuel {
  cle: string;
  /** Le WebP le plus large — l'adresse stable, citable à la main. */
  src: string;
  largeur: number;
  hauteur: number;
  /** Miniature encodée, posée en fond le temps du chargement. */
  empreinte: string;
  variantes: Variante[];
  /* « plan » désigne l'axonométrie 3D livrée par le client, pas un
     rendu de la maison. Elle vit dans le même catalogue — mêmes
     paliers, même empreinte, même srcset — mais aucune grille ni
     galerie ne doit la servir comme une vue de plus. */
  type: "exterieur" | "interieur" | "plan";
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
 * quelqu'un la verra avant le visiteur.
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

/**
 * Le plan axonométrique d'un modèle, ou `null`.
 *
 * `null` est le cas général aujourd'hui : le client n'a livré les plans
 * que de deux modèles sur onze, et annonce les autres plus tard. Une
 * section « le plan » doit donc disparaître entièrement quand il manque,
 * pas afficher un cadre vide.
 */
export const plan = (cleModele: string): Visuel | null =>
  MODELES[cleModele]?.vues.find((v) => v.type === "plan") ?? null;

/**
 * Le `srcset` d'un format. C'est LUI qui répond à « des images plus
 * grandes vont-elles ralentir le site ».
 *
 * Le navigateur ne télécharge qu'UN fichier : celui dont la largeur
 * correspond à la place que l'image occupe, densité d'écran comprise.
 * Ajouter un palier de 2560 px ne change donc rien pour un téléphone —
 * il continue de prendre le 720 ou le 1024. Sans `srcset`, en revanche,
 * tout le monde télécharge le plus gros : c'est là que le poids devient
 * un problème.
 */
export const srcSet = (v: Visuel, format: "avif" | "webp"): string =>
  v.variantes.map((x) => `${x[format]} ${x.largeur}w`).join(", ");
