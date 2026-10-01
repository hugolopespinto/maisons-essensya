import type { ReactNode } from "react";

/* ════ LE PETIT « ? » DU BACK-OFFICE ════
   Une explication repliée à côté d'un libellé qui ne parle pas de
   lui-même — un badge, un terme technique.

   `<details>` plutôt qu'un attribut `title` : une infobulle native ne
   s'ouvre ni au doigt ni au clavier, et un client qui gère son site
   depuis sa tablette ne la verrait jamais. Ici, un appui ouvre, un
   second referme, sans une ligne de JavaScript — comme le sélecteur de
   médias (MediaPicker.tsx).

   `label` est le nom lu par un lecteur d'écran et affiché au survol :
   un « ? » seul ne dit pas de quoi il est la question. */
export default function Aide({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="adm-aide">
      <summary aria-label={label} title={label}>
        <span aria-hidden="true">?</span>
      </summary>
      <div className="adm-aide__bulle">{children}</div>
    </details>
  );
}
