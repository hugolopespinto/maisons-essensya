"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/* Rangée d'annonces qui défile à l'horizontale, avec des flèches.
   Le défilement reste natif (scroll-snap) : doigt, molette et clavier
   fonctionnent sans code ; les flèches ne font que le déclencher. Elles
   n'apparaissent que s'il y a quelque chose à faire défiler. */

export default function CarrouselAnnonces({ children }: { children: ReactNode }) {
  const pisteRef = useRef<HTMLDivElement>(null);
  const [peutReculer, setPeutReculer] = useState(false);
  const [peutAvancer, setPeutAvancer] = useState(false);

  const mesurer = useCallback(() => {
    const el = pisteRef.current;
    if (!el) return;
    setPeutReculer(el.scrollLeft > 4);
    setPeutAvancer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    mesurer();
    const el = pisteRef.current;
    if (!el) return;
    const obs = new ResizeObserver(mesurer);
    obs.observe(el);
    return () => obs.disconnect();
  }, [mesurer]);

  const defiler = (sens: 1 | -1) => {
    const el = pisteRef.current;
    if (!el) return;
    el.scrollBy({ left: sens * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <div className="g-carrousel">
      <div className="g-carrousel__piste" ref={pisteRef} onScroll={mesurer}>
        {children}
      </div>
      {(peutReculer || peutAvancer) && (
        <div className="g-carrousel__fleches">
          <button
            type="button"
            onClick={() => defiler(-1)}
            disabled={!peutReculer}
            aria-label="Annonces précédentes"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => defiler(1)}
            disabled={!peutAvancer}
            aria-label="Annonces suivantes"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
