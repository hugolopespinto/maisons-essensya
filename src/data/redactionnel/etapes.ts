/* Etapes.docx (livré le 01/11) et les retours de Julien du 02/11 et du
   09/11 par mail (reprise des étapes 3 et 5, voir la maquette validée,
   artefact Mg4eyRfwPAFJL8B56qJwjC, onglet #etapes). Texte repris mot pour
   mot ; seules les fautes de frappe sont corrigées. */

export const TITRE = "Les étapes de construction d'une maison neuve : le guide complet 2026";

export const CHAPO =
  "Construire une maison neuve suit un ordre précis : définir le projet et le budget, acheter le terrain, concevoir les plans, signer les contrats et les assurances, obtenir le permis de construire, ouvrir le chantier, réaliser le gros œuvre puis le second œuvre, et enfin effectuer la réception. De la signature du CCMI à la remise des clés, comptez en général **entre 12 et 18 mois**, dont 8 à 10 mois de travaux environ, selon les maisons et les conditions météo. Pour chaque étape, ce guide donne une durée indicative et précise ce que fait le constructeur et ce que fait le client.";

export interface Rang {
  id: string;
  numero: string;
  nom: string;
  /** Pourcentage de départ et de largeur des deux barres (mini / maxi), ou un jalon ponctuel. */
  bar: { min?: [number, number]; max?: [number, number]; jalon?: number };
  duree: string;
  dureePos: number;
}

export const FRISE: Rang[] = [
  { id: "ph-1", numero: "01", nom: "Projet et budget", bar: { min: [0, 10], max: [10, 20] }, duree: "1 à 3 mois", dureePos: 30 },
  { id: "ph-2", numero: "02", nom: "Le terrain", bar: { min: [0, 20], max: [20, 30] }, duree: "2 à 5 mois", dureePos: 50 },
  { id: "ph-3", numero: "03", nom: "Concevoir les plans", bar: { min: [0, 10] }, duree: "1 mois", dureePos: 10 },
  { id: "ph-4", numero: "04", nom: "Contrat et assurances", bar: { jalon: 0.6 }, duree: "Signature", dureePos: 1.2 },
  { id: "ph-5", numero: "05", nom: "Le permis de construire", bar: { min: [0, 20], max: [20, 20] }, duree: "2 mois, jusqu'à 4", dureePos: 40 },
  { id: "ph-6", numero: "06", nom: "Gros œuvre", bar: { min: [0, 30], max: [30, 20] }, duree: "3 à 5 mois", dureePos: 50 },
  { id: "ph-7", numero: "07", nom: "2nd œuvre et finition", bar: { min: [0, 30], max: [30, 20] }, duree: "3 à 5 mois", dureePos: 50 },
  { id: "ph-8", numero: "08", nom: "Suivi de chantier", bar: { min: [0, 80], max: [80, 20] }, duree: "8 à 10 mois environ", dureePos: 0 },
  { id: "ph-9", numero: "09", nom: "Réception", bar: { jalon: 0.6 }, duree: "Une demi-journée", dureePos: 1.2 },
];

export const FRISE_NOTE =
  "Durée de chaque étape prise séparément : les barres ne s'additionnent pas. De la signature du CCMI à la remise des clés, comptez en général entre 12 et 18 mois.";

export const RAIL_LEGENDES = [
  "Étape 1 : la maison n'existe encore que sur le papier.",
  "Étape 2 : la parcelle est bornée, le projet a une adresse.",
  "Étape 3 : les plans sont dessinés et cotés.",
  "Étape 4 : le contrat fixe le prix, le délai et les garanties.",
  "Étape 5 : le dossier part en mairie, puis le permis s'affiche sur le terrain.",
  "Étape 6 : fondations, murs, toiture. La maison est hors d'eau, hors d'air.",
  "Étape 7 : isolation, réseaux, cloisons. L'intérieur prend forme.",
  "Étape 8 : vous visitez avec le conducteur de travaux.",
  "Étape 9 : la maison est finie. Les clés vous sont remises.",
];

export const ETAPES_NAV = [
  "Projet et budget",
  "Le terrain",
  "Concevoir les plans",
  "Contrat et assurances",
  "Le permis de construire",
  "Gros œuvre",
  "2nd œuvre et finition",
  "Suivi de chantier",
  "Réception",
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: "Quel est le délai moyen pour construire une maison ?",
    a: "Comptez en moyenne 12 à 18 mois entre la signature du CCMI et l'emménagement, dont 8 à 10 mois de travaux pour une maison individuelle classique. Le délai varie selon les démarches, la météo et l'architecture de la construction.",
  },
  {
    q: "Comment protéger son projet avec le carnet d'information du logement ?",
    a: "Le carnet d'information du logement rassemble les documents sur la performance énergétique et les travaux réalisés. Le constructeur le remet au propriétaire, qui le transmet en cas de vente.",
  },
  {
    q: "Quelles sont les économies possibles grâce à la réglementation environnementale RE2020 ?",
    a: "La RE2020 s'applique aux permis déposés depuis le 1er janvier 2022. Elle impose une maison mieux isolée et moins consommatrice, ce qui réduit les factures d'énergie et limite l'impact carbone de la construction. Votre confort est également amélioré au quotidien.",
  },
];

export const CTA = {
  texte: "Avec ou sans terrain, même si vous n'avez pas de simulation financière, nous vous conseillons et accompagnons dès la première étape.",
};
