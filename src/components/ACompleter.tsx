import type { CSSProperties } from "react";

/* ════════════════════════════════════════════════════════════════
   UNE MENTION LÉGALE : CELLE DU CLIENT, OU LE TROU QUI RESTE

   Les pages légales sont les seules du site dont chaque phrase engage
   juridiquement l'éditeur : dénomination sociale, assureur décennal,
   durée de conservation des données, adresse d'exercice des droits. On
   ne les invente pas, et on ne les laisse pas non plus passer en
   silence.

   D'où les deux états de ce composant.

   · SANS VALEUR SAISIE, il affiche un pavé surligné qui décrit
     précisément l'information manquante. Visible du visiteur, et c'est
     voulu : une mention légale absente doit se voir, sinon personne ne
     la réclame jamais. Le pavé porte son propre libellé « à compléter »
     pour qu'un lecteur ne le prenne pas pour le texte définitif.

   · AVEC UNE VALEUR, il rend cette valeur et rien d'autre — pas de
     surlignage, pas de cadre : c'est du texte légal ordinaire.

   ⚠ CE QUI CHANGE POUR LE CLIENT. La valeur vient d'un bloc de
   « Pages → Mentions légales » ou « Pages → Confidentialité », c'est-à-dire
   du même écran que le reste du site. Ces informations demandaient
   jusqu'ici une intervention dans le code : les quinze mentions
   obligatoires étaient écrites en dur, et le back-office n'offrait
   aucun champ pour les remplir. Un site qu'on confie à son propriétaire
   ne peut pas lui interdire de renseigner ses propres mentions légales.

   ⚠ LE `white-space: pre-line` N'EST PAS DÉCORATIF. Plusieurs de ces
   mentions tiennent sur plusieurs lignes — une adresse d'hébergeur, un
   contrat d'assurance. Le client les saisit avec de vrais retours à la
   ligne dans un champ multiligne ; sans cette règle, ils s'écraseraient
   en un seul paragraphe.
   ════════════════════════════════════════════════════════════════ */

const MARQUEUR: CSSProperties = {
  display: "inline-block",
  background: "var(--bois-clair)",
  color: "var(--bois-fonce)",
  fontFamily: "var(--f-mono)",
  fontSize: "var(--fs-small)",
  padding: ".2em .55em",
  borderRadius: "var(--radius)",
};

const RENSEIGNE: CSSProperties = { whiteSpace: "pre-line" };

export default function ACompleter({
  texte,
  valeur,
}: {
  /** Ce qu'il faut fournir, décrit en clair. Affiché tant que rien n'est saisi. */
  texte: string;
  /** Ce que le client a saisi dans le back-office. Vide = pas encore renseigné. */
  valeur?: string;
}) {
  const saisi = valeur?.trim();
  if (saisi) return <span style={RENSEIGNE}>{saisi}</span>;
  return <mark style={MARQUEUR}>{texte}</mark>;
}
