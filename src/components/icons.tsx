import type { IconName } from "@/types";
import type { JSX } from "react";

/* Jeu d'icônes du design system (section 13 du styleguide). */
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
  land: { size: 20, body: <path d="M4 20l4-12 4 6 3-4 5 10z" /> },
  loc: {
    size: 20,
    body: (
      <>
        <path d="M12 21s-6-5.2-6-10a6 6 0 1112 0c0 4.8-6 10-6 10z" />
        <circle cx="12" cy="11" r="2" />
      </>
    ),
  },
  price: {
    size: 20,
    body: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M9 12h5M9 15h4M14 8l-3 4" />
      </>
    ),
  },
};

export function Icon({ name }: { name: IconName }) {
  const { size, body } = paths[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={1.4}>
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
  label: string;
}) {
  return (
    <div className="c-picto">
      <Icon name={icon} />
      <span>
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
    </div>
  );
}
