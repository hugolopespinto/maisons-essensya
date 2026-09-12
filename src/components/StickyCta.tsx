"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/* Le CTA flottant mobile ne s'affiche que si la page n'offre pas déjà
   son propre formulaire à l'écran (règle v7).
   `/maisons` n'est volontairement PAS dans cette liste : la page produit
   a bien un formulaire, mais tout en bas. L'exclure ferait disparaître le
   seul point de contact des 90 % de page qui le précèdent — alors que la
   détection ci-dessous suffit à éviter les deux CTA simultanés. */
const HIDDEN_ON = [/^\/contact/, /^\/lp\//, /^\/annonces\/[^/]+$/, /^\/agences\/[^/]+$/];

/* Tout bloc de conversion intégré à la page. `#projet` était le seul
   repère ; la refonte en ajoute sur la page produit et les déclinaisons. */
const INPAGE_CTA = "#projet, .s-cta, .lp-form-card";

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
      // Masqué dès qu'un formulaire de la page est lui-même à l'écran.
      if (show) {
        for (const el of document.querySelectorAll(INPAGE_CTA)) {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) {
            show = false;
            break;
          }
        }
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
