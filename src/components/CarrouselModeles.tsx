"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Fleche } from "./IconesCommande";

/* ════════════════════════════════════════════════════════════════
   LES AUTRES MODÈLES DE LA TYPOLOGIE, EN DÉFILEMENT

   Au bas d'une fiche, les modèles qui ont le même nombre de chambres
   défilent ici (retour du client, 26/10) : un défilement natif
   (`scroll-snap`), avec deux flèches qui le déplacent d'une page. Les
   flèches s'éteignent aux extrémités ; sans JavaScript, la rangée reste
   défilable au doigt et à la molette.
   ════════════════════════════════════════════════════════════════ */

export default function CarrouselModeles({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const piste = useRef<HTMLDivElement | null>(null);
  const [debut, setDebut] = useState(true);
  const [fin, setFin] = useState(true);

  const lire = useCallback(() => {
    const el = piste.current;
    if (!el) return;
    setDebut(el.scrollLeft <= 2);
    setFin(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    lire();
    window.addEventListener("resize", lire);
    return () => window.removeEventListener("resize", lire);
  }, [lire]);

  const aller = (sens: 1 | -1) => {
    const el = piste.current;
    if (!el) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: sens * el.clientWidth * 0.9, behavior: reduit ? "instant" : "smooth" });
  };

  return (
    <div className="g-carrousel" role="group" aria-roledescription="carrousel" aria-label={label}>
      <div className="g-carrousel__piste" ref={piste} onScroll={lire}>
        {children}
      </div>
      <div className="g-carrousel__fleches">
        <button type="button" className="g-carrousel__fleche" onClick={() => aller(-1)} disabled={debut} aria-label="Modèles précédents">
          <Fleche sens="gauche" />
        </button>
        <button type="button" className="g-carrousel__fleche" onClick={() => aller(1)} disabled={fin} aria-label="Modèles suivants">
          <Fleche sens="droite" />
        </button>
      </div>
    </div>
  );
}
