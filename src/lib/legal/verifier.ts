import { cleJeton, jetonsDe, jetonValide, MENTIONS } from "./jetons";

/* ════════════════════════════════════════════════════════════════
   CE QU'UN CORPS LÉGAL N'A PAS LE DROIT DE PERDRE

   Le client réécrit librement ses mentions légales et sa politique de
   données. Trois choses seulement lui sont refusées, et chacune parce
   qu'elle ferait disparaître quelque chose d'obligatoire sans qu'il s'en
   aperçoive.

   · UN JETON SUPPRIMÉ. Les quinze mentions et le bouton de retrait du
     consentement sont insérés par des jetons au milieu des phrases. Les
     effacer en réécrivant un paragraphe est facile et silencieux : la
     page continue de s'afficher, simplement sans l'assurance décennale,
     ou sans le moyen de retirer son consentement — ce dernier étant une
     non-conformité caractérisée.

     ⚠ LA LISTE DES JETONS OBLIGATOIRES EST CALCULÉE depuis le texte
     livré, pas déclarée. Une vérité, pas deux : le développeur qui
     ajoutera une mention demain n'aura rien à inscrire ici.

   · UN JETON INVENTÉ. `{{champ:assurance}}` au lieu de
     `{{champ:assurance.decennale}}` ne lèverait aucune erreur au rendu —
     il afficherait le jeton tel quel. Autant le dire à la saisie.

   · UN CORPS SANS TITRE. Chaque section commence par `## ` ; sans lui,
     elle s'afficherait sans intitulé, et l'ancre n'aurait plus de
     support.

   ⚠ CE QUI N'EST PAS REFUSÉ : tout le reste. Le client peut réécrire,
   raccourcir, allonger, réordonner ses paragraphes, changer ses titres.
   C'est le but. Ces règles ne défendent pas une mise en forme, elles
   défendent des obligations.
   ════════════════════════════════════════════════════════════════ */

const nomLisible = (j: { nom: string; arg?: string }): string => {
  if (j.nom === "champ" && j.arg && j.arg in MENTIONS) return `« ${MENTIONS[j.arg].label} »`;
  if (j.nom === "cookies") return "le bouton « Modifier mes préférences »";
  if (j.nom === "tel") return "le téléphone";
  if (j.nom === "email") return "l'adresse de contact";
  if (j.nom === "date") return "la date de mise à jour";
  return `« ${cleJeton(j)} »`;
};

/**
 * Vérifie un corps de section légale.
 *
 * @param corps   le Markdown saisi par le client
 * @param livre   le texte livré, qui sert de référence aux jetons requis
 * @returns les refus, en français, destinés au client. Vide = accepté.
 */
export function verifierCorps(corps: string, livre: string): string[] {
  const erreurs: string[] = [];
  const texte = corps.trim();

  /* Un corps vidé n'est pas une erreur : le gabarit reprend son texte
     d'origine, comme pour tous les autres blocs du site. */
  if (!texte) return erreurs;

  if (!texte.startsWith("## ")) {
    erreurs.push(
      "Cette section doit commencer par son titre, écrit « ## Titre de la section ». Sans lui, elle s'afficherait sans intitulé.",
    );
  }

  const presents = jetonsDe(texte);
  const inconnus = presents.filter((j) => !jetonValide(j.nom, j.arg));
  for (const j of inconnus) {
    erreurs.push(
      `L'élément {{${cleJeton(j)}}} n'existe pas. Vérifiez son orthographe : il s'afficherait tel quel sur la page.`,
    );
  }

  const requis = jetonsDe(livre).filter((j) => j.nom === "champ" || j.nom === "cookies");
  const vus = new Set(presents.map(cleJeton));
  for (const j of requis) {
    if (!vus.has(cleJeton(j))) {
      erreurs.push(
        `${nomLisible(j)} a disparu de cette section. C'est une mention obligatoire : réécrivez {{${cleJeton(j)}}} à l'endroit qui convient.`,
      );
    }
  }

  return erreurs;
}
