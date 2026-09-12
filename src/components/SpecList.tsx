import type { ReactNode } from "react";

/* Le motif le plus fort de la DA — liste bordée de filets 1px, libellé en
   mono capitales à gauche, valeur à droite. Il était réécrit à l'identique
   dans 5 fichiers (.m-arch__materials, .m-plan__rooms, .a-land, .g-info,
   .m-price__included) sans jamais être un composant. C'est pourtant lui
   qui porte les prestations, le détail du prix et le comparatif. */

export function SpecList({
  rows,
  dark = false,
  className = "",
}: {
  /** [libellé, valeur] — les entrées à valeur vide sont ignorées. */
  rows: [string, ReactNode][];
  dark?: boolean;
  className?: string;
}) {
  const visible = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (!visible.length) return null;
  return (
    <ul className={`c-specs${dark ? " c-specs--dark" : ""} ${className}`}>
      {visible.map(([k, v]) => (
        <li key={k}>
          <span>{k}</span>
          <span>{v}</span>
        </li>
      ))}
    </ul>
  );
}

/** Liste à puce « compris » / « non compris ». */
export function MarkedList({
  items,
  variant,
  className = "",
}: {
  items: string[];
  variant: "in" | "out";
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <ul className={`c-specs c-specs--marked c-specs--${variant} ${className}`}>
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

export default SpecList;
