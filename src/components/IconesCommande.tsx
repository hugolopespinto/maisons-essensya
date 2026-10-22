/* Les pictos des commandes de carrousel — flèches, lecture, pause, plein
   écran, fermeture. Partagés par le héros et la vitrine de /maisons.
   Hors du jeu `Icon` (icons.tsx) : celui-là décrit des biens et des
   arguments, à 20 ou 28 px ; ceux-ci sont des gestes d'interface, tracés
   au même filet que les boutons ronds qui les portent. */

const TRAIT = { fill: "none", stroke: "currentColor", strokeWidth: 1.4 } as const;

export function Fleche({ sens }: { sens: "gauche" | "droite" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...TRAIT} aria-hidden="true" focusable="false">
      {sens === "gauche" ? <path d="M15 5l-7 7 7 7M8 12h13" /> : <path d="M9 5l7 7-7 7M16 12H3" />}
    </svg>
  );
}

export function IconePause() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="5" y="4" width="4.5" height="16" rx="1" />
      <rect x="14.5" y="4" width="4.5" height="16" rx="1" />
    </svg>
  );
}

export function IconeLecture() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M7 4.5v15l12-7.5z" />
    </svg>
  );
}

export function IconePleinEcran() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...TRAIT} aria-hidden="true" focusable="false">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

export function IconeFermer() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...TRAIT} aria-hidden="true" focusable="false">
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}
