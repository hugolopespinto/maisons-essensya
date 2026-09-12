import type { IconName } from "@/types";
import type { JSX } from "react";

/* Jeu d'icônes du design system (section 13 du styleguide).

   Deux tailles de rendu cohabitent — 28 px pour les blocs de réassurance,
   20 px pour les pictos d'annonce — sur une même grille de 24. À
   strokeWidth constant, le trait pesait donc 1,63 px d'un côté et 1,17 px
   de l'autre : deux graisses pour un seul jeu. On le calcule maintenant à
   partir de la taille rendue, pour un filet toujours égal à HAIRLINE —
   celui des séparateurs du site. */
const HAIRLINE = 1.25;

const paths: Record<IconName, { size: number; body: JSX.Element }> = {
  shield: { size: 28, body: <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" /> },
  ruler: {
    size: 28,
    body: (
      <>
        <rect x="3" y="9" width="18" height="6" />
        <path d="M7 9v3M11 9v3M15 9v3M19 9v3" />
      </>
    ),
  },
  pin: {
    size: 28,
    body: (
      <>
        <path d="M12 21s-6-5.2-6-10a6 6 0 1112 0c0 4.8-6 10-6 10z" />
        <circle cx="12" cy="11" r="2" />
      </>
    ),
  },
  key: {
    size: 28,
    body: (
      <>
        <circle cx="8" cy="12" r="4" />
        <path d="M12 12h9M18 12v3M15 12v2" />
      </>
    ),
  },
  surface: {
    size: 20,
    body: (
      <>
        <rect x="4" y="4" width="16" height="16" />
        <path d="M4 9h16M9 4v16" />
      </>
    ),
  },
  bed: {
    size: 20,
    body: (
      <>
        <path d="M3 18v-7h18v7M3 11V6M3 15h18" />
        <path d="M6 11V9h5v2" />
      </>
    ),
  },
  /* Une parcelle cotée, pas une colline : le même vocabulaire que le
     substitut graphique des annonces (quadrilatère + ligne de cote). */
  land: {
    size: 20,
    body: (
      <>
        <path d="M3 6.5L19.5 4.5L21 14L4.5 16.5Z" />
        <path d="M3 19.5h18M3 18.2v2.6M21 18.2v2.6" />
      </>
    ),
  },
  loc: {
    size: 20,
    body: (
      <>
        <path d="M12 21s-6-5.2-6-10a6 6 0 1112 0c0 4.8-6 10-6 10z" />
        <circle cx="12" cy="11" r="2" />
      </>
    ),
  },
  /* Le squelette du glyphe € — un C et ses deux barres. La DA est
     typographique : le prix ne se signale pas par une pièce de monnaie.
     Tracé plutôt que <text> pour hériter de la couleur du jeu (stroke),
     comme les autres icônes, quel que soit le contexte. */
  price: {
    size: 20,
    body: (
      <>
        <path d="M15.6 7.7A5.6 5.6 0 1 0 15.6 16.3" />
        <path d="M5.6 10.4h9.3M5.6 13.6h8.1" />
      </>
    ),
  },
  /* Toiture monopente, porte basculante : le garage de la maison. */
  garage: {
    size: 20,
    body: (
      <>
        <path d="M3 10L12 4.5L21 10" />
        <path d="M5 10v9.5h14V10" />
        <path d="M8 19.5v-6h8v6M8 16.5h8" />
      </>
    ),
  },
};

export function Icon({ name }: { name: IconName }) {
  const { size, body } = paths[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={(HAIRLINE * 24) / size}
      aria-hidden="true"
    >
      {body}
    </svg>
  );
}

export function Picto({
  icon,
  value,
  label,
}: {
  icon: IconName;
  value: string | number;
  /** Facultatif : les fiches annonce affichent des pictos nus. */
  label?: string;
}) {
  return (
    <div className="c-picto">
      <Icon name={icon} />
      <span>
        <strong>{value}</strong>
        {label ? <small>{label}</small> : null}
      </span>
    </div>
  );
}
