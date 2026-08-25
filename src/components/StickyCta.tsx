"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/* Le CTA flottant mobile ne s'affiche que si la page n'offre pas déjà
   son propre formulaire à l'écran (règle v7). */
const HIDDEN_ON = [/^\/contact/, /^\/lp\//, /^\/annonces\/[^/]+$/, /^\/agences\/[^/]+$/];

export default function StickyCta() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const hidden = HIDDEN_ON.some((re) => re.test(pathname));

  useEffect(() => {
    // Rien à observer : le composant ne rend rien sur ces pages.
    if (hidden) return;
    const isHome = pathname === "/";
    const onScroll = () => {
      const threshold = window.innerHeight * (isHome ? 2.6 : 0.9);
      let show = window.scrollY > threshold;
      // Masqué quand la section « Votre projet » est déjà à l'écran.
      const cta = document.getElementById("projet");
      if (show && cta) {
        const r = cta.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) show = false;
      }
      setVisible(show);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, hidden]);

  if (hidden) return null;

  return (
    <div className={`c-sticky-cta${visible ? " is-visible" : ""}`}>
      <Link href="/contact" className="c-btn c-btn--light">
        Parler de mon projet
      </Link>
    </div>
  );
}
