"use client";

import { useState } from "react";

/* Le lien d'accès, prêt à copier. Sans JavaScript, le champ reste
   sélectionnable à la main : le bouton n'est qu'un raccourci. */
export function CopierLien({ lien }: { lien: string }) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
    } catch {
      /* Presse-papiers refusé (contexte non sécurisé, permission) : le
         champ reste là, à copier à la main. */
    }
  }

  return (
    <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
      <div className="adm-field" style={{ flex: "1 1 20rem", margin: 0 }}>
        <input
          type="text"
          value={lien}
          readOnly
          aria-label="Lien d'accès"
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>
      <button className="c-btn" type="button" onClick={copier}>
        {copie ? "Copié" : "Copier le lien"}
      </button>
    </div>
  );
}
