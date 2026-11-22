"use client";
import { useState } from "react";

const POINTS = [
  "Fonctionnement des portes, fenêtres et volets",
  "Prises, éclairage, tableau électrique et chauffage",
  "Robinetterie, écoulements et absence de fuites",
  "Aspect des sols, murs et plafonds, finitions extérieures",
  "Remise des documents : notices, attestations, plans",
];

/* La check-list de réception de /etapes-de-construction (maquette
   approuvée, artefact Mg4eyRfwPAFJL8B56qJwjC, #ph-9) : rien n'est
   enregistré, un rechargement de la page efface les coches. */
export default function ReceptionChecklist() {
  const [coches, setCoches] = useState(() => POINTS.map(() => false));
  const n = coches.filter(Boolean).length;

  return (
    <div className="pe-recep">
      <h3>La check-list des points à vérifier lors de la réception</h3>
      <p style={{ marginBottom: ".8rem" }}>
        Vous avez la possibilité de vous faire accompagner par un professionnel indépendant si vous le désirez. Sans
        accompagnement, vous disposez de huit jours après la réception pour signaler par écrit les défauts apparents
        en CCMI.
      </p>
      {POINTS.map((p, i) => (
        <label key={p} htmlFor={`r${i}`}>
          <input
            type="checkbox"
            id={`r${i}`}
            checked={coches[i]}
            onChange={() => setCoches((c) => c.map((v, j) => (j === i ? !v : v)))}
          />
          <span>{p}</span>
        </label>
      ))}
      <p className="pe-recep__c">{n} {n > 1 ? "points vérifiés" : "point vérifié"} sur 5</p>
      <p style={{ marginTop: ".3rem", fontSize: ".78rem", lineHeight: 1.4, color: "var(--pierre)" }}>
        Cette liste est une simple aide&nbsp;: rien n&apos;est enregistré ni envoyé. Recharger la page efface vos coches.
      </p>
    </div>
  );
}
