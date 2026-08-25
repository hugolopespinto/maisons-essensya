"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/maisons", label: "Maisons" },
  { href: "/annonces", label: "Terrains & opportunités" },
  { href: "/concept", label: "Notre concept" },
  { href: "/agences", label: "Nos agences" },
];

/* Pages où le header reste transparent tant qu'on n'a pas scrollé :
   celles qui ouvrent sur un visuel plein écran. Partout ailleurs il est
   solide dès le chargement (équivalent de `solidHeader` en v7).       */
const TRANSPARENT = [/^\/$/, /^\/maisons\/[^/]+$/, /^\/agences\/[^/]+$/, /^\/lp\//];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const alwaysSolid = !TRANSPARENT.some((re) => re.test(pathname));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={`site-header${alwaysSolid || scrolled || open ? " is-solid" : ""}`}
        id="siteHeader"
      >
        <div className="container">
          <Link className="logo" href="/" aria-label="Maisons Essensya — accueil">
            Essensya<small>Maisons</small>
          </Link>
          <nav className="main-nav" aria-label="Navigation principale">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
          <Link href="/contact" className="c-btn header-cta">
            Parler de mon projet
          </Link>
          <button
            className="nav-toggle"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="mobileNav"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* Le menu se referme au clic sur un lien — pas via un effet sur
          le pathname, qui déclencherait un rendu en cascade. */}
      <nav
        className={`mobile-nav${open ? " is-open" : ""}`}
        id="mobileNav"
        aria-label="Navigation mobile"
        onClick={() => setOpen(false)}
      >
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
        <Link href="/contact">Contact</Link>
        <Link href="/contact" className="c-btn c-btn--light">
          Parler de mon projet
        </Link>
      </nav>
    </>
  );
}
