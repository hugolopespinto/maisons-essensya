import { PRICE_FROM, REEL } from "@/data/essensya";
import { MODELES } from "@/data/gamme";
import { fmtPrice } from "@/lib/format";
import { PAGES_DEFAUT } from "@/lib/store";
import type { PageEditable } from "@/lib/store/types";

/* ════════════════════════════════════════════════════════════════
   CE QU'UNE PAGE AFFICHE QUAND SON BLOC EST VIDE

   Une seule réponse, partagée par les gabarits ET par le back-office.

   ⚠ ELLE VIVAIT EN DEUX ENDROITS, et l'écart se voyait à l'écran. Le
   gabarit posait son propre texte de repli (`t("cle", "…")`), le
   back-office ne connaissait que le catalogue. Résultat : un chapô
   affiché en toutes lettres sur /agences arrivait dans un champ VIDE de
   l'admin, sans même un texte gris pour dire ce qu'il remplaçait (relevé
   du 25/11). Et plusieurs replis de gabarit étaient restés à l'ancienne
   version quand le catalogue avait reçu les textes du client le 16/09.

   Désormais :
     · le texte livré du catalogue (`PAGES_DEFAUT`) fait foi ;
     · à défaut, la phrase que le site compose lui-même (prix, nombre de
       modèles), déclarée ci-dessous une seule fois ;
     · le `defaut` passé par un gabarit ne sert plus qu'à un bloc absent
       du catalogue.
   ════════════════════════════════════════════════════════════════ */

/**
 * Les phrases recomposées à chaque rendu. Leur bloc est livré VIDE dans
 * le catalogue, et doit le rester : une copie figée dans le stockage
 * mentirait au premier changement de tarif. Le back-office les montre
 * dans le champ, et ne les enregistre pas tant qu'on n'y a pas touché.
 */
const PHRASES_CALCULEES: Record<string, Record<string, () => string>> = {
  accueil: {
    "juste.mention": () => REEL.mentionPrix,
  },
  maison: {
    "gamme.titre": () => `${MODELES.length} modèles, un seul parti-pris`,
  },
  contact: {
    "hero.chapo": () =>
      `Une gamme de modèles optimisés, à partir de ${fmtPrice(PRICE_FROM)} hors terrain. Dites-nous où vous en êtes : une agence vous répond sous 48 h, sans engagement et sans démarchage.`,
  },
};

/**
 * Retours à la ligne ramenés à LF, blancs de bord retirés. Une zone de
 * texte renvoie ses retours en CRLF : sans cela, un titre sur deux
 * lignes renvoyé tel quel diffère de son texte livré.
 */
export const normaliserSaisie = (s: string): string => s.replace(/\r\n?/g, "\n").trim();

/** Ce que la page affiche pour ce bloc tant que rien n'y est saisi. */
export function texteDeRepli(clePage: string, cleBloc: string): string {
  const livre = PAGES_DEFAUT.find((p) => p.cle === clePage)?.blocs.find(
    (b) => b.cle === cleBloc,
  )?.valeur;
  return normaliserSaisie(livre ?? "") || PHRASES_CALCULEES[clePage]?.[cleBloc]?.() || "";
}

/** Ce que la page affiche pour ce bloc, compte tenu de la saisie. */
export function texteAffiche(clePage: string, cleBloc: string, saisie: string): string {
  return normaliserSaisie(saisie) || texteDeRepli(clePage, cleBloc);
}

/**
 * Lecteur des blocs saisis dans « Pages → … ».
 *
 * Le texte du back-office se substitue à celui du gabarit UNIQUEMENT
 * s'il est renseigné : effacer un champ rend au site son texte livré —
 * ou la phrase qu'il compose lui-même — et ne laisse jamais de trou.
 *
 * ⚠ CETTE FONCTION ÉTAIT RECOPIÉE DANS CINQ PAGES, et les cinq copies
 * avaient déjà divergé : celle de /contact avait perdu son paramètre
 * `defaut` et rendait `""` au lieu du texte du gabarit. Personne ne
 * l'aurait vu en relisant une page isolée — c'est le genre d'écart qui
 * se découvre le jour où un champ vidé dans le back-office efface la
 * phrase au lieu de la restaurer.
 *
 * Une page qui n'a pas de repli — les mentions obligatoires des pages
 * légales, où il n'existe aucune valeur honnête à inventer — reçoit `""`.
 */
export function lecteurBlocs(pages: PageEditable[], clePage: string) {
  const blocs = pages.find((p) => p.cle === clePage)?.blocs ?? [];
  return (cle: string, defaut = ""): string =>
    blocs.find((b) => b.cle === cle)?.valeur.trim() || texteDeRepli(clePage, cle) || defaut;
}
