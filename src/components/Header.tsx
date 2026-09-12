"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Une entrée de navigation, déjà nettoyée par le layout racine. */
export interface LienChrome {
  label: string;
  href: string;
}

/* ════════════════════════════════════════════════════════════════
   COQUILLE PUBLIQUE — ce qui n'entoure QUE le site public

   Le layout racine est partagé par toutes les routes, /admin comprise :
   chaque écran d'administration portait donc le menu du site, le numéro
   de téléphone, le bouton flottant, le pied de page et le bandeau
   cookies. `admin.css` les masquait avec `body:has(.adm)` — un masquage
   visuel, qui laisse tout dans le DOM : navigation en double pour un
   lecteur d'écran, et un bandeau de consentement monté sur le
   back-office. Ici, ils ne sont pas rendus du tout.

   POURQUOI `usePathname()` ET PAS `headers()` + un proxy.
   Lire un en-tête de requête depuis le layout RACINE bascule TOUTES les
   routes en rendu dynamique (`headers` est une API de temps de requête :
   voir la doc Next 16). Le site public perdrait d'un coup sa génération
   statique — et avec elle le sens des dizaines de `revalidatePath()` que
   le back-office appelle après chaque enregistrement. Le prix est sans
   commune mesure avec le problème à régler. `usePathname()`, lui, est
   résolu au rendu serveur comme au client : le HTML servi sur /admin ne
   contient déjà pas le chrome, sans rien coûter au rendu statique.

   POURQUOI ICI, dans le module de l'en-tête : Footer doit rester un
   composant serveur, et le layout racine en est un aussi. Header est le
   seul module client de ce périmètre.

   ⚠ SOLUTION DÉFINITIVE : un groupe de routes `(site)` qui donne au site
   public son propre layout, et à /admin un layout nu. Il faut déplacer
   les fichiers de route — à faire quand plus personne n'édite les
   gabarits publics. Ce filtre disparaîtra ce jour-là.
   ════════════════════════════════════════════════════════════════ */
export function CoquillePublique({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return <>{children}</>;
}

/* Navigation d'origine. Elle reste le REPLI du menu éditable : tant que
   le client n'a rien saisi dans /admin/menus — ou s'il efface tout — le
   site garde exactement ces entrées. Une liste vide ne peut donc pas
   décapiter la navigation. */
const LINKS: LienChrome[] = [
  { href: "/maisons", label: "La maison" },
  { href: "/annonces", label: "Terrains & opportunités" },
  { href: "/concept", label: "Notre concept" },
  { href: "/agences", label: "Nos agences" },
];

/* Pages où le header reste transparent tant qu'on n'a pas scrollé :
   celles qui ouvrent sur un visuel plein écran. Partout ailleurs il est
   solide dès le chargement (équivalent de `solidHeader` en v7).
   `/maisons` s'y ajoute : la page produit n'est plus une grille de
   modèles mais un hero plein écran, comme la fiche d'une déclinaison. */
const TRANSPARENT = [
  /^\/$/,
  /^\/maisons$/,
  /^\/maisons\/[^/]+$/,
  /^\/agences\/[^/]+$/,
  /^\/lp\//,
];

/** Ce qui reste atteignable au clavier dans le panneau mobile. */
const FOCUSABLE = "a[href], button:not([disabled])";

export interface HeaderProps {
  /** Le mot du bloc-marque. Réglages → « Nom du site ». */
  marque: string;
  /** La ligne en petit sous la marque. Réglages → « Baseline ». */
  baseline: string;
  /** URL déjà résolue par `resoudreMedia()`, ou `null` : sans logo
   *  téléversé, le site continue d'écrire le nom en lettres. */
  logo: string | null;
  /** Numéro affiché, déjà arbitré entre Réglages, Contenu et le code. */
  telephone: string;
  /** Le `tel:` correspondant — calculé une fois dans le layout racine. */
  telHref: string;
  /** Menu saisi en back-office. Absent = on garde `LINKS`. */
  liens?: LienChrome[];
}

/** Le libellé « Contact » du panneau mobile ne doit pas doubler une
 *  entrée que le client aurait lui-même ajoutée à son menu. */
const pointeVersContact = (l: LienChrome) =>
  l.href.replace(/\/+$/, "").toLowerCase() === "/contact";

export default function Header({
  marque,
  baseline,
  logo,
  telephone,
  telHref,
  liens,
}: HeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  const alwaysSolid = !TRANSPARENT.some((re) => re.test(pathname));
  const entrees = liens ?? LINKS;

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

  /* RGAA 12.x : un panneau qui recouvre la page doit se fermer avec Échap
     et retenir le focus tant qu'il est ouvert — sinon la tabulation part
     dans la page masquée, invisible mais toujours là. */
  useEffect(() => {
    if (!open) return;
    const panel = navRef.current;
    if (!panel) return;

    const items = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    items()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        // Le focus revient d'où il venait, pas en haut du document.
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const f = items();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /* Le bloc-marque : l'image si le client en a téléversé une, sinon le
     lettrage d'origine. `alt` vide côté image — le lien porte déjà son
     `aria-label`, répéter le nom le ferait annoncer deux fois. */
  const marqueVisuelle = logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt=""
      style={{ display: "block", height: "2.1rem", width: "auto" }}
    />
  ) : (
    <>
      {marque}
      <small>{baseline}</small>
    </>
  );

  return (
    <>
      <header
        className={`site-header${alwaysSolid || scrolled || open ? " is-solid" : ""}`}
        id="siteHeader"
      >
        <div className="container">
          <Link className="logo" href="/" aria-label={`${marque} — accueil`}>
            {marqueVisuelle}
          </Link>
          <nav className="main-nav" aria-label="Navigation principale">
            {entrees.map((l, i) => (
              <Link key={`${l.href}-${i}`} href={l.href}>
                {l.label}
              </Link>
            ))}
            {/* Sur ce métier, l'appel est le premier canal : aucun numéro
                n'était composable nulle part. Il est logé dans .main-nav,
                la seule zone que le CSS masque déjà sous 900px — le menu
                mobile le reprend à l'identique en dessous. */}
            <a href={telHref} aria-label={`Appeler le ${telephone}`}>
              {telephone}
            </a>
          </nav>
          <Link href="/contact" className="c-btn header-cta">
            Parler de mon projet
          </Link>
          <button
            className="nav-toggle"
            ref={toggleRef}
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
          le pathname, qui déclencherait un rendu en cascade.
          Fermé, il est en `visibility:hidden` : ses liens sortent donc
          d'eux-mêmes de l'ordre de tabulation, rien à masquer en plus. */}
      <nav
        className={`mobile-nav${open ? " is-open" : ""}`}
        id="mobileNav"
        ref={navRef}
        aria-label="Navigation mobile"
        onClick={() => setOpen(false)}
      >
        {entrees.map((l, i) => (
          <Link key={`${l.href}-${i}`} href={l.href}>
            {l.label}
          </Link>
        ))}
        {!entrees.some(pointeVersContact) && <Link href="/contact">Contact</Link>}
        <a href={telHref} aria-label={`Appeler le ${telephone}`}>
          {telephone}
        </a>
        <Link href="/contact" className="c-btn c-btn--light">
          Parler de mon projet
        </Link>
      </nav>
    </>
  );
}
