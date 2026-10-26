/* ════════════════════════════════════════════════════════════════
   LA SIMULATION DE PRÊT — le calcul seul, sans interface

   Partagé par la page /simulateur-de-financement et la fenêtre
   « Simuler mon financement » des fiches annonce. Hors du composant
   client : une constante exportée d'un module "use client" n'arrive sur
   le serveur que sous forme de référence, et les pages serveur ont
   besoin de la VALEUR du taux par défaut pour l'écrire dans la mention.

   Mensualité hors assurance, à taux fixe, amortissement constant — la
   formule de toutes les banques :
     M = C × t / (1 − (1 + t)^−n), t = taux annuel / 12, n = mois.
   ════════════════════════════════════════════════════════════════ */

/**
 * Le taux pré-rempli, demandé par le client le 24/10.
 *
 * ⚠ C'EST UN EXEMPLE, ET IL DOIT LE RESTER À L'ÉCRAN. Un taux affiché
 * par le site rapproche le simulateur d'une publicité pour un crédit :
 * l'aide du champ le dit (« un exemple »), la mention le répète, et la
 * page reste hors de l'index tant que le client ne l'a pas fait valider.
 */
export const TAUX_DEFAUT = 3;
/** La borne haute du curseur ; un taux plus élevé reste saisissable. */
export const TAUX_MAX_CURSEUR = 5;
export const DUREE_DEFAUT = 20;

/** L'apport proposé : 10 % du projet, arrondi aux 5 000 € les plus proches. */
export const apportSuggere = (projet: number): number =>
  Math.round((projet * 0.1) / 5000) * 5000;

/**
 * « 180 000 », « 3,45 % » → nombre ; vide, négatif ou illisible → null.
 * `\s` couvre aussi les espaces insécables qu'insère `Intl` en français.
 */
export const lire = (v: string): number | null => {
  const s = v.replace(/[\s€%]/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const NF = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** 90000 → « 90 000 », 2.5 → « 2,5 » : ce que le visiteur aurait tapé. */
export const enSaisie = (n: number): string => NF.format(n);

/** Mensualité d'un prêt amortissable à taux fixe, hors assurance. */
export const mensualite = (capital: number, tauxAnnuel: number, mois: number): number => {
  const t = tauxAnnuel / 100 / 12;
  return t === 0 ? capital / mois : (capital * t) / (1 - (1 + t) ** -mois);
};

export type Resultat =
  | { ok: false; message: string; emprunt?: number }
  | { ok: true; emprunt: number; mois: number; mensualite: number; interets: number };

export function calculer(projet: string, apport: string, taux: string, duree: string): Resultat {
  const p = lire(projet);
  if (p === null || p === 0) return { ok: false, message: "Indiquez le montant total de votre projet." };
  const emprunt = Math.max(p - (lire(apport) ?? 0), 0);
  if (emprunt === 0) {
    return { ok: false, message: "Votre apport couvre le projet : aucun prêt n'est nécessaire." };
  }
  const tx = lire(taux);
  if (tx === null) return { ok: false, emprunt, message: "Indiquez le taux du crédit." };
  if (tx > 20) return { ok: false, emprunt, message: "Vérifiez le taux : il dépasse 20 %." };
  const d = lire(duree);
  if (d === null || d < 1 || d > 30) {
    return { ok: false, emprunt, message: "Indiquez une durée entre 1 et 30 ans." };
  }
  const mois = Math.round(d * 12);
  const m = mensualite(emprunt, tx, mois);
  return { ok: true, emprunt, mois, mensualite: m, interets: m * mois - emprunt };
}
