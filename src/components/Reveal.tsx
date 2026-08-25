"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/* ════ RÉVÉLATION AU SCROLL ════
   Reprise 1:1 du comportement v7 : cascade des frères entrant dans le
   même lot (65 ms d'écart, plafonné à 320 ms), délais explicites
   `--reveal-delay` respectés, neutralisé en prefers-reduced-motion.
   Monté une fois dans le layout, re-scanné à chaque changement d'URL. */
export default function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(
      "[data-reveal], .c-reveal-img",
    );
    if (!nodes.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries
          .filter((e) => e.isIntersecting)
          .forEach((e, i) => {
            const el = e.target as HTMLElement;
            if (i > 0 && !el.style.getPropertyValue("--reveal-delay")) {
              el.style.transitionDelay = `${Math.min(i * 65, 320)}ms`;
            }
            el.classList.add("is-visible");
            io.unobserve(el);
          });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    nodes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
