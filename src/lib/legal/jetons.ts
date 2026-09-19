/* ════════════════════════════════════════════════════════════════
   LE VOCABULAIRE DES PAGES LÉGALES

   Le corps de chaque section est du Markdown que le client écrit
   librement. Cinq jetons y survivent à la réécriture — ce sont les
   seules choses qu'un champ de texte ne sait pas porter :

     {{champ:<cle>}}  une des quinze mentions obligatoires. Affiche la
                      valeur saisie, ou le pavé surligné qui décrit ce
                      qui manque.
     {{cookies}}      le bouton qui rouvre le panneau de consentement.
                      Ce n'est pas un lien : c'est un <button onClick>.
                      Sans lui, le consentement cesse d'être retirable —
                      une non-conformité, pas un défaut d'affichage.
     {{tel}}          le téléphone, lu dans Réglages à chaque affichage.
     {{email}}        l'adresse de contact, même origine.
     {{date}}         la date de dernière mise à jour de la page.

   ⚠ UN JETON INCONNU N'EXISTE PAS. Le client ne peut pas en inventer :
   le rendu affiche le jeton tel quel, en évidence, et la validation
   refuse l'enregistrement. C'est délibéré — un jeton mal orthographié
   qui disparaîtrait en silence ferait disparaître une mention légale.

   ⚠ UNE SEULE TABLE POUR DEUX USAGES. `MENTIONS` alimente à la fois
   l'aide affichée au client dans le back-office et le texte du pavé
   affiché au visiteur. Ces deux chaînes étaient des quasi-copies l'une
   de l'autre, quinze fois, dans deux fichiers différents. Cette semaine,
   une table d'adresses recopiée dans deux fichiers et une fonction
   recopiée dans cinq pages ont toutes deux fini par diverger.
   ════════════════════════════════════════════════════════════════ */

export interface Mention {
  /** Intitulé du champ dans le back-office. */
  label: string;
  /** Ce qu'il faut écrire, et pourquoi c'est obligatoire. */
  aide: string;
  /** Le pavé affiché au visiteur tant que rien n'est saisi. */
  pave: string;
}

export const MENTIONS: Record<string, Mention> = {
  "editeur.identite": {
    label: "Identité de l'éditeur",
    aide: "Dénomination sociale, forme juridique, montant du capital social, adresse du siège, numéro SIREN, ville d'immatriculation au RCS et numéro de TVA intracommunautaire. Obligatoire : article 6-III de la LCEN.",
    pave: "[[À COMPLÉTER : dénomination sociale, forme juridique, montant du capital social, adresse du siège social, numéro SIREN, ville d'immatriculation au RCS, numéro de TVA intracommunautaire]]",
  },
  "editeur.directeur": {
    label: "Directeur de la publication",
    aide: "Nom, prénom et qualité — en principe le représentant légal de la société.",
    pave: "[[À COMPLÉTER : nom, prénom et qualité du directeur de la publication (en principe le représentant légal)]]",
  },
  "hebergeur": {
    label: "Hébergeur du site",
    aide: "Dénomination sociale, adresse postale, numéro de téléphone et pays d'hébergement des serveurs. À faire correspondre à l'hébergeur réellement retenu.",
    pave: "[[À COMPLÉTER : dénomination sociale de l'hébergeur, adresse postale, numéro de téléphone, pays d'hébergement des serveurs]]",
  },
  "rcs": {
    label: "Immatriculation au RCS",
    aide: "Numéro RCS et ville du greffe. Doit figurer sur tous les documents commerciaux.",
    pave: "[[À COMPLÉTER : numéro RCS et ville du greffe]]",
  },
  "assurance.decennale": {
    label: "Assurance décennale",
    aide: "Nom et adresse de l'assureur, numéro de contrat et couverture géographique. Mention obligatoire pour un constructeur : article L.241-1 du code des assurances.",
    pave: "[[À COMPLÉTER : nom et adresse de l'assureur décennale, numéro de contrat, couverture géographique du contrat]]",
  },
  "garantie.livraison": {
    label: "Garantie de livraison",
    aide: "Nom et adresse de l'établissement garant, et référence de la garantie. Obligatoire dans le cadre du CCMI.",
    pave: "[[À COMPLÉTER : nom et adresse de l'établissement garant de livraison, référence de la garantie]]",
  },
  "assurance.rcpro": {
    label: "Responsabilité civile et dommages-ouvrage",
    aide: "Assureur et numéro de contrat de la RC professionnelle, et modalités de l'assurance dommages-ouvrage.",
    pave: "[[À COMPLÉTER : assurance de responsabilité civile professionnelle (assureur, n° de contrat) et modalités de l'assurance dommages-ouvrage]]",
  },
  "mediateur": {
    label: "Médiateur de la consommation",
    aide: "Nom du médiateur dont relève l'entreprise, adresse postale et adresse du site de saisine. Obligatoire : article L.616-1 du code de la consommation.",
    pave: "[[À COMPLÉTER : nom du médiateur de la consommation dont relève l'entreprise, adresse postale et adresse du site de saisine]]",
  },
  "credits": {
    label: "Crédits",
    aide: "Crédits photographiques définitifs (auteur, licence) et crédits de conception et réalisation du site.",
    pave: "[[À COMPLÉTER : crédits photographiques définitifs (auteur, licence) et crédits de conception / réalisation du site]]",
  },
  "responsable": {
    label: "Responsable du traitement",
    aide: "Raison sociale, forme juridique, adresse du siège, SIREN / RCS. C'est l'entité juridiquement responsable des données collectées.",
    pave: "[[À COMPLÉTER : raison sociale, forme juridique, adresse du siège, SIREN / RCS]]",
  },
  "soustraitant.vitahome": {
    label: "Contrat de sous-traitance Vitahome",
    aide: "Référence et date du contrat signé avec Vitahome au titre de l'article 28 du RGPD.",
    pave: "[[À COMPLÉTER : référence et date du contrat de sous-traitance signé avec Vitahome (art. 28 RGPD)]]",
  },
  "transferts": {
    label: "Transferts hors Union européenne",
    aide: "Pays depuis lesquels CARTO et Vitahome servent leurs ressources, et garantie applicable en cas de transfert hors UE (clauses contractuelles types, décision d'adéquation…).",
    pave: "[[À COMPLÉTER : pays depuis lesquels CARTO et Vitahome servent ces ressources, et garantie applicable en cas de transfert hors UE]]",
  },
  "conservation": {
    label: "Durées de conservation",
    aide: "Durée retenue pour les prospects — usuellement 3 ans après le dernier contact — et durée de conservation des dossiers contractuels.",
    pave: "[[À COMPLÉTER : durée retenue pour les prospects (usuellement 3 ans après le dernier contact) et durée de conservation des dossiers contractuels]]",
  },
  "hebergement": {
    label: "Hébergement et localisation des données",
    aide: "Hébergeur du site, pays d'hébergement, localisation des serveurs Vitahome, et existence éventuelle d'un transfert hors UE.",
    pave: "[[À COMPLÉTER : hébergeur du site, pays d'hébergement, localisation des serveurs Vitahome, et existence éventuelle d'un transfert hors UE avec la garantie applicable]]",
  },
  "dpo": {
    label: "Contact RGPD",
    aide: "Adresse e-mail de contact RGPD, adresse postale du responsable de traitement, et désignation ou non d'un délégué à la protection des données. C'est par cette adresse que s'exercent les droits d'accès, de rectification et d'effacement.",
    pave: "[[À COMPLÉTER : adresse e-mail de contact RGPD / DPO, adresse postale du responsable de traitement, et désignation ou non d'un délégué à la protection des données]]",
  },
};

/** Les clés des quinze mentions, dans l'ordre du catalogue. */
export const CLES_MENTIONS = Object.keys(MENTIONS);

/** Les jetons sans argument, reconnus tels quels. */
export const JETONS_SIMPLES = ["cookies", "tel", "email", "date"] as const;
export type JetonSimple = (typeof JETONS_SIMPLES)[number];

/** Le motif qui reconnaît un jeton dans un corps Markdown. */
export const MOTIF_JETON = /\{\{\s*([a-z]+)(?::([a-zA-Z.]+))?\s*\}\}/g;

/** Un jeton est-il connu du code ? */
export function jetonValide(nom: string, arg?: string): boolean {
  if (nom === "champ") return arg !== undefined && arg in MENTIONS;
  return (JETONS_SIMPLES as readonly string[]).includes(nom);
}

/**
 * Les jetons présents dans un texte, dans l'ordre d'apparition.
 *
 * Sert à deux choses : rendre le corps, et vérifier qu'aucun jeton
 * obligatoire n'a été supprimé par une réécriture.
 */
export function jetonsDe(md: string): { nom: string; arg?: string }[] {
  const out: { nom: string; arg?: string }[] = [];
  for (const m of md.matchAll(MOTIF_JETON)) {
    out.push({ nom: m[1], ...(m[2] ? { arg: m[2] } : {}) });
  }
  return out;
}

/** Forme canonique d'un jeton, pour comparer deux listes. */
export const cleJeton = (j: { nom: string; arg?: string }) =>
  j.arg ? `${j.nom}:${j.arg}` : j.nom;
