import type { PageEditable } from "@/lib/store/types";

/**
 * Lecteur des blocs saisis dans « Pages → … ».
 *
 * Le texte du back-office se substitue à celui du gabarit UNIQUEMENT
 * s'il est renseigné : effacer un champ doit rendre au site sa phrase
 * d'origine — souvent celle qui affiche un prix calculé, à jour — et
 * jamais laisser un trou à l'écran.
 *
 * ⚠ CETTE FONCTION ÉTAIT RECOPIÉE DANS CINQ PAGES, et les cinq copies
 * avaient déjà divergé : celle de /contact avait perdu son paramètre
 * `defaut` et rendait `""` au lieu du texte du gabarit. Personne ne
 * l'aurait vu en relisant une page isolée — c'est le genre d'écart qui
 * se découvre le jour où un champ vidé dans le back-office efface la
 * phrase au lieu de la restaurer.
 *
 * Le `defaut` vaut `""` quand on ne le passe pas : une page qui n'a pas
 * de repli — les mentions légales, par exemple, où il n'existe aucune
 * valeur honnête à inventer — appelle simplement `t("cle")`.
 */
export function lecteurBlocs(pages: PageEditable[], clePage: string) {
  const blocs = pages.find((p) => p.cle === clePage)?.blocs ?? [];
  return (cle: string, defaut = ""): string =>
    blocs.find((b) => b.cle === cle)?.valeur.trim() || defaut;
}
