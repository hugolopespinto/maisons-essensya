"use client";
import { useState } from "react";

/* Le sélecteur « Guide complet / Qui fait quoi » de /etapes-de-construction
   (maquette approuvée, artefact Mg4eyRfwPAFJL8B56qJwjC). Les neuf sections
   restent rendues côté serveur ; seul l'attribut data-mode qui les
   affiche ou les masque est piloté ici. */

export default function EtapesParcours({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"complet" | "essentiel">("complet");

  return (
    <>
      <div className="pe-mode">
        <fieldset>
          <legend>Niveau de détail</legend>
          <input type="radio" name="mode" id="mode-complet" value="complet" checked={mode === "complet"} onChange={() => setMode("complet")} />
          <label htmlFor="mode-complet">Guide complet</label>
          <input type="radio" name="mode" id="mode-essentiel" value="essentiel" checked={mode === "essentiel"} onChange={() => setMode("essentiel")} />
          <label htmlFor="mode-essentiel">Qui fait quoi</label>
        </fieldset>
        <p>«&nbsp;Qui fait quoi&nbsp;» ne garde que le résumé de chaque étape et la répartition des rôles.</p>
      </div>
      <div className="pe-parcours" data-mode={mode}>
        {children}
      </div>
    </>
  );
}
