"use client";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconeFermer } from "@/components/IconesCommande";
import MentionSimulation from "@/components/MentionSimulation";
import SimulateurPret from "@/components/SimulateurPret";
import "@/styles/pages/simulateur.css";

/* ════════════════════════════════════════════════════════════════
   « SIMULER MON FINANCEMENT » — le simulateur en fenêtre, pré-rempli

   Demandé par le client le 24/10 : depuis une fiche qui affiche un prix,
   un clic ouvre le simulateur avec ce prix déjà saisi, sans quitter la
   page. Le reste des valeurs par défaut (taux, durée, apport) est celui
   du simulateur — voir SimulateurPret.tsx.

   ⚠ UN <dialog> NATIF, OUVERT EN `showModal()`, comme la visionneuse de
   /maisons (VitrineGamme.tsx) et pour les mêmes raisons : focus piégé,
   Échap qui ferme, page inerte derrière, aucune guerre de z-index avec
   l'en-tête fixe. La fenêtre n'est montée qu'à l'ouverture : le
   simulateur repart du prix de la fiche à chaque fois.

   ⚠ RENDUE DANS <body>, PAS À CÔTÉ DU BOUTON. Le calque supérieur du
   <dialog> ne coupe pas l'héritage CSS : posée dans le bloc prix de la
   fiche, la fenêtre en prenait l'alignement à droite, et les règles
   `.a-head__price .c-price-xl` restylaient sa mensualité. Le portail la
   rend indépendante de l'endroit où l'on place le bouton.
   ════════════════════════════════════════════════════════════════ */

export default function BoutonSimulateur({
  montant,
  className = "c-btn",
}: {
  /** Le prix affiché par la fiche : il devient le montant du projet. */
  montant: number;
  className?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOuvert(true)}
        aria-haspopup="dialog"
      >
        Simuler mon financement <span className="arrow" aria-hidden="true">→</span>
      </button>
      {ouvert && <Fenetre montant={montant} onFermer={() => setOuvert(false)} />}
    </>
  );
}

function Fenetre({ montant, onFermer }: { montant: number; onFermer: () => void }) {
  const dialogue = useRef<HTMLDialogElement | null>(null);
  const fermer = useRef(onFermer);
  const titre = useId();

  useLayoutEffect(() => {
    fermer.current = onFermer;
  });

  useLayoutEffect(() => {
    const d = dialogue.current;
    if (!d) return;
    d.showModal();
    /* ⚠ `close` EST ASYNCHRONE, d'où le test de `open` — même piège que
       la visionneuse : en développement, le démontage-remontage des
       effets refermait la fenêtre aussitôt ouverte. */
    const surFermeture = () => {
      if (!d.open) fermer.current();
    };
    d.addEventListener("close", surFermeture);
    return () => {
      d.removeEventListener("close", surFermeture);
      if (d.open) d.close();
    };
  }, []);

  /* Montée seulement après un clic : `document` existe toujours ici. */
  return createPortal(
    <dialog
      ref={dialogue}
      className="sf-modale"
      aria-labelledby={titre}
      /* Un clic sur le voile, hors du contenu, ferme la fenêtre. */
      onClick={(e) => {
        if (e.target === e.currentTarget) dialogue.current?.close();
      }}
    >
      <div className="sf-modale__corps">
        <div className="sf-modale__tete">
          <h2 id={titre}>Simuler mon financement</h2>
          <button
            type="button"
            className="sf-modale__fermer"
            onClick={() => dialogue.current?.close()}
            aria-label="Fermer le simulateur"
          >
            <IconeFermer />
          </button>
        </div>
        <SimulateurPret
          montantInitial={montant}
          intro={
            <p className="sf-chapo">
              Le prix de ce bien est déjà saisi. Ajustez l&apos;apport, la durée et le
              taux à votre situation.
            </p>
          }
          pied={<MentionSimulation />}
        />
      </div>
    </dialog>,
    document.body,
  );
}
