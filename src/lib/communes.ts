import "server-only";
import INDEX from "@/data/communes.json";

/* ════════════════════════════════════════════════════════════════
   AUTO-COMPLÉTION « SECTEUR DU PROJET »

   Toutes les communes de France, pas seulement celles du flux. Le
   `<datalist>` d'avant ne connaissait que la cinquantaine de communes
   où un terrain est en stock : un visiteur dont la commune n'y figurait
   pas ne voyait rien venir — c'est-à-dire la grande majorité, puisque
   l'on construit aussi sur le terrain du client.

   ⚠ SERVEUR UNIQUEMENT. L'index pèse un mégaoctet : importé dans un
   composant client, il partirait dans le bundle de chaque page qui
   porte un formulaire. Le navigateur passe par /api/communes.

   Source et régénération : scripts/communes.mjs.
   ════════════════════════════════════════════════════════════════ */

export interface CommuneProposee {
  nom: string;
  /** Le code postal cherché, ou l'unique code de la commune ; à défaut
   *  le département — « Toulouse » en a six, en choisir un au hasard
   *  enverrait l'agence vers le mauvais quartier. */
  code: string;
}

export const MAX_PROPOSITIONS = 8;

/** « Saint-Étienne-de-Montluc » → « saint etienne de montluc ». */
function normaliser(s: string): string {
  return s
    .normalize("NFD")
    /* Même précaution que `slug()` dans src/lib/geo.ts : les marques
       combinantes désignées par leur nom, pas par un intervalle. */
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    /* On tape « St Jean », l'index écrit « Saint-Jean ». Seulement
       devant un autre mot : « st » seul est peut-être le début de
       Strasbourg. */
    .replace(/\bst /g, "saint ")
    .replace(/\bste /g, "sainte ");
}

/* Normalisé une fois, au chargement du module : 35 000 communes, une
   poignée de millisecondes, et plus rien à refaire à chaque frappe. */
const COMMUNES = (INDEX as [string, string, string][]).map(([nom, cps, dept]) => ({
  nom,
  cps: cps.split(" "),
  dept,
  cle: normaliser(nom),
}));

/**
 * Le texte se cherche dans le nom, les chiffres dans les codes postaux,
 * et les deux se combinent : « marsan 40 » est une requête valable.
 *
 * Deux niveaux de pertinence — le nom COMMENCE par la saisie, puis un
 * de ses mots commence par elle (« marsan » → Mont-de-Marsan). Dans
 * chaque niveau, l'ordre de l'index, c'est-à-dire la population.
 */
export function chercherCommunes(saisie: string): CommuneProposee[] {
  const q = normaliser(saisie);
  const chiffres = q.match(/\b\d{2,5}\b/)?.[0] ?? "";
  const texte = q.replace(/\b\d+\b/g, " ").replace(/\s+/g, " ").trim();
  if (!chiffres && texte.length < 2) return [];

  const debut: CommuneProposee[] = [];
  const mot: CommuneProposee[] = [];

  for (const c of COMMUNES) {
    const cp = chiffres ? c.cps.find((x) => x.startsWith(chiffres)) : undefined;
    if (chiffres && !cp) continue;

    let niveau = debut;
    if (texte) {
      if (c.cle.startsWith(texte)) niveau = debut;
      else if (c.cle.includes(" " + texte)) niveau = mot;
      else continue;
    }

    niveau.push({
      nom: c.nom,
      code: cp ?? (c.cps.length === 1 ? c.cps[0] : c.dept),
    });
    /* Le premier niveau plein, inutile de parcourir le reste. */
    if (debut.length >= MAX_PROPOSITIONS) break;
  }

  return [...debut, ...mot].slice(0, MAX_PROPOSITIONS);
}
