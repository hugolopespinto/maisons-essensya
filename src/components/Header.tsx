"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { NAVIGATION } from "@/data/navigation";

/** Une entrée de navigation, déjà nettoyée par le layout racine. */
export interface LienChrome {
  label: string;
  href: string;
}

/** Une rubrique de l'en-tête : un lien, un sous-menu, ou les deux. Sans
 *  `href`, le libellé ne fait qu'ouvrir le sous-menu. */
export interface EntreeChrome {
  label: string;
  href?: string;
  enfants?: LienChrome[];
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

/* Le menu par défaut vit dans `src/data/navigation.ts`, partagé avec
   l'écran Menus. Il reste le REPLI du menu éditable : tant que le client
   n'a rien saisi dans /admin/menus — ou s'il efface tout — le site garde
   exactement ces rubriques. Une liste vide ne peut donc pas décapiter la
   navigation. */

/* Délai avant qu'un sous-menu ouvert au survol se referme. Sans lui, la
   souris qui glisse en diagonale du titre vers le troisième lien sort
   une fraction de seconde de la zone, et le menu se ferme sous elle. */
const DELAI_FERMETURE = 200;

/** Le chevron des rubriques à sous-menu, au filet des icônes du site. */
function Chevron() {
  return (
    <svg
      className="nav-chevron"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1.5 3.5 5 7l3.5-3.5" />
    </svg>
  );
}

/* Pages où le header reste transparent tant qu'on n'a pas scrollé :
   celles qui ouvrent sur un visuel plein écran. Partout ailleurs il est
   solide dès le chargement (équivalent de `solidHeader` en v7).

   ⚠ `/^\/maisons\/[^/]+$/` A ÉTÉ RETIRÉ DE CETTE LISTE, ET C'ÉTAIT LE
   PIRE DÉFAUT DE CONTRASTE DU SITE : 1,00:1, sur onze pages produit.

   La règle datait du temps où la fiche d'un modèle ouvrait, elle aussi,
   sur un héros plein écran. Elle n'y ouvre plus depuis longtemps — elle
   commence par `.p-head`, sur fond craie — mais l'en-tête, lui,
   continuait de se rendre transparent, donc `color:var(--craie)` POSÉ
   SUR de la craie. Mesuré au pixel : zéro pixel de différence entre
   l'encre et le fond sur 13 104 pour le bouton d'appel, 45 sur 3 710
   avec un écart maximal de 3 niveaux pour les liens de navigation. Toute
   la navigation principale était littéralement invisible au chargement,
   au-dessus de 900 px de large, jusqu'au premier défilement. Le survol
   aggravait : `.main-nav a:hover{opacity:1}` alignait le texte
   exactement sur le fond.

   Aucun relevé ne le voyait : le balayage DOM exclut
   `.site-header:not(.is-solid)` en supposant qu'il est mesuré ailleurs,
   et il ne l'était nulle part. C'est corrigé dans heros-pixels.mjs. */
const TRANSPARENT = [
  /^\/$/,
  /^\/maisons$/,
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
  /** Version claire du logo, pour l'en-tête transparent. Voir plus bas. */
  logoClair?: string | null;
  /** Numéro affiché, déjà arbitré entre Réglages, Contenu et le code. */
  telephone: string;
  /** Le `tel:` correspondant — calculé une fois dans le layout racine. */
  telHref: string;
  /** Menu saisi en back-office. Absent = on garde `NAVIGATION`. */
  liens?: EntreeChrome[];
}

/** Le libellé « Contact » du panneau mobile ne doit pas doubler une
 *  entrée que le client aurait lui-même ajoutée à son menu — à la barre
 *  comme dans un sous-menu. */
const pointeVersContact = (l: { href?: string }) =>
  (l.href ?? "").replace(/\/+$/, "").toLowerCase() === "/contact";

export default function Header({
  marque,
  baseline,
  logo,
  logoClair,
  telephone,
  telHref,
  liens,
}: HeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  /* ── LES SOUS-MENUS DE LA BARRE ──
     L'ouverture est pilotée par l'état, pas par `:hover` en CSS, pour
     trois raisons :
       · au toucher, `:hover` reste collé après le premier tap : le menu
         ne se refermait plus sur tablette ;
       · un lien cliqué dans le sous-menu laisse la souris posée dessus —
         en CSS, il restait ouvert sur la page d'arrivée ;
       · l'en-tête doit devenir opaque pendant qu'un menu est ouvert, et
         c'est la même condition qui permute le logo (voir `solide`).
     Deux façons d'ouvrir : le survol à la souris, qui se referme quand
     la souris part, et le clic — tactile, clavier ou souris —, qui
     épingle le menu jusqu'à Échap, un clic ailleurs ou la sortie du
     focus. `parSurvol` retient laquelle des deux a ouvert le menu. */
  const [ouvert, setOuvert] = useState<number | null>(null);
  const parSurvol = useRef(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barreRef = useRef<HTMLElement | null>(null);
  /* Le panneau mobile déplie une rubrique à la fois : ouvertes toutes
     ensemble, elles ne tiendraient pas dans un écran de téléphone. */
  const [deplie, setDeplie] = useState<number | null>(null);

  const alwaysSolid = !TRANSPARENT.some((re) => re.test(pathname));
  const entrees: EntreeChrome[] = liens ?? NAVIGATION;

  const annulerFermeture = () => {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = null;
  };
  /* Stable (refs et setter seulement) : l'effet d'Échap en dépend sans
     se réabonner à chaque rendu. */
  const fermerSousMenu = useCallback(() => {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = null;
    parSurvol.current = false;
    setOuvert(null);
  }, []);
  const survoler = (i: number) => {
    annulerFermeture();
    if (ouvert === i) return;
    parSurvol.current = true;
    setOuvert(i);
  };
  const quitter = () => {
    // Un menu épinglé par un clic ne se referme pas parce que la souris part.
    if (!parSurvol.current) return;
    annulerFermeture();
    minuterie.current = setTimeout(fermerSousMenu, DELAI_FERMETURE);
  };
  const basculer = (i: number) => {
    annulerFermeture();
    /* Un clic sur un menu ouvert AU SURVOL l'épingle au lieu de le
       fermer : c'est le geste de quelqu'un qui veut qu'il reste là. */
    if (ouvert === i && !parSurvol.current) {
      fermerSousMenu();
      return;
    }
    parSurvol.current = false;
    setOuvert(i);
  };

  // Pas de fermeture programmée qui survive au démontage.
  useEffect(() => {
    const m = minuterie;
    return () => {
      if (m.current) clearTimeout(m.current);
    };
  }, []);

  /* Échap et clic en dehors referment le sous-menu ouvert. Échap rend le
     focus au bouton de la rubrique s'il était dans son sous-menu — sans
     quoi il tomberait sur un lien devenu invisible. */
  useEffect(() => {
    if (ouvert === null) return;
    const barre = barreRef.current;
    if (!barre) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const rubrique = barre.querySelector<HTMLElement>(`[data-rubrique="${ouvert}"]`);
      const bouton = rubrique?.querySelector<HTMLElement>("[aria-expanded]");
      const dedans = rubrique?.contains(document.activeElement);
      fermerSousMenu();
      if (dedans) bouton?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!barre.contains(e.target as Node)) fermerSousMenu();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [ouvert, fermerSousMenu]);

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

    /* Seulement ce qui est affiché : les liens d'une rubrique repliée
       sont dans le DOM mais `hidden`. Les compter ferait du dernier
       d'entre eux la borne du piège, et la tabulation s'échapperait. */
    const items = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.getClientRects().length > 0,
      );
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
  /* ⚠ DEUX LOGOS, PARCE QU'IL Y A DEUX FONDS.
     L'en-tête est TRANSPARENT au-dessus du visuel d'accueil — texte
     clair sur photo — puis bascule en crème dès qu'on défile. Un seul
     logo ne peut pas tenir les deux : la version sombre disparaît sur
     la photo, la version blanche disparaît sur le crème. On les rend
     donc toutes les deux et on les permute au même moment que le fond,
     par la même condition. Le client qui téléverse SON logo n'en
     fournit qu'un : il s'applique alors aux deux états, faute de mieux.

     Un sous-menu ouvert rend lui aussi l'en-tête opaque : son panneau
     blanc descendrait sinon d'une barre transparente posée sur la
     photo, et le titre qui l'a ouvert resterait écrit en clair au-dessus
     d'un fond qui ne l'est plus. */
  const solide = alwaysSolid || scrolled || open || ouvert !== null;
  const contactPresent = entrees.some(
    (e) => pointeVersContact(e) || (e.enfants ?? []).some(pointeVersContact),
  );
  const logoAffiche = (solide ? logo : (logoClair ?? logo)) ?? null;

  const marqueVisuelle = logoAffiche ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoAffiche}
      alt=""
      /* ⚠ 2,6 rem, PAS 2,1. Le logo de la charte est HORIZONTAL : la
         maison, puis « Maisons », puis « ESSENSYA » sur une seule ligne.
         À 2,1 rem, cette composition rend le nom illisible — le raster
         précédent tenait à cette hauteur parce qu'il était empilé et
         recadré. La barre fait 76 px : 42 px de logo y laissent encore
         17 px de respiration de chaque côté. */
      style={{ display: "block", height: "2.6rem", width: "auto" }}
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
        className={`site-header${solide ? " is-solid" : ""}`}
        id="siteHeader"
      >
        <div className="container">
          <Link className="logo" href="/" aria-label={`${marque} — accueil`}>
            {marqueVisuelle}
          </Link>
          {/* Le motif « navigation à volets » du WAI : chaque rubrique à
              sous-menu porte un vrai bouton `aria-expanded`, et PAS de
              rôle `menu` — celui-ci promet au lecteur d'écran une
              navigation aux flèches façon logiciel, que des liens de site
              n'ont pas. Au clavier : Tab jusqu'au bouton, Entrée ouvre,
              Tab parcourt les liens, Échap referme. */}
          <nav className="main-nav" aria-label="Navigation principale" ref={barreRef}>
            <ul className="main-nav__list">
              {entrees.map((e, i) => {
                const enfants = e.enfants ?? [];
                const cle = `${e.href ?? e.label}-${i}`;
                if (!enfants.length) {
                  return e.href ? (
                    <li className="main-nav__item" key={cle}>
                      <Link className="main-nav__link" href={e.href}>
                        {e.label}
                      </Link>
                    </li>
                  ) : null;
                }
                const estOuvert = ouvert === i;
                const idSous = `sous-menu-${i}`;
                return (
                  <li
                    key={cle}
                    data-rubrique={i}
                    className={`main-nav__item main-nav__item--parent${estOuvert ? " is-open" : ""}`}
                    /* `pointerType` écarte le toucher : un tap émet aussi un
                       survol, qui ouvrirait le menu juste avant que le clic
                       qui suit ne le referme. */
                    onPointerEnter={(ev) => ev.pointerType === "mouse" && survoler(i)}
                    onPointerLeave={(ev) => ev.pointerType === "mouse" && quitter()}
                    onBlur={(ev) => {
                      if (estOuvert && !ev.currentTarget.contains(ev.relatedTarget as Node | null)) {
                        fermerSousMenu();
                      }
                    }}
                  >
                    {e.href ? (
                      /* La rubrique a sa page : le libellé y mène, et un
                         bouton distinct ouvre le sous-menu — au toucher et
                         au clavier, où il n'y a pas de survol. */
                      <>
                        <Link className="main-nav__link" href={e.href} onClick={fermerSousMenu}>
                          {e.label}
                        </Link>
                        <button
                          type="button"
                          className="main-nav__toggle"
                          aria-expanded={estOuvert}
                          aria-controls={idSous}
                          onClick={() => basculer(i)}
                        >
                          <Chevron />
                          <span className="u-sr-only">Sous-menu {e.label}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="main-nav__link main-nav__toggle main-nav__toggle--titre"
                        aria-expanded={estOuvert}
                        aria-controls={idSous}
                        onClick={() => basculer(i)}
                      >
                        {e.label}
                        <Chevron />
                      </button>
                    )}
                    <ul className="main-nav__sub" id={idSous}>
                      {enfants.map((c, k) => (
                        <li key={`${c.href}-${k}`}>
                          <Link href={c.href} onClick={fermerSousMenu}>
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
              {/* Sur ce métier, l'appel est le premier canal : aucun numéro
                  n'était composable nulle part. Il est logé dans .main-nav,
                  que le CSS masque avec le reste de la barre sous le seuil
                  du menu mobile — celui-ci le reprend à l'identique. */}
              <li className="main-nav__item main-nav__item--tel">
                <a className="main-nav__link" href={telHref} aria-label={`Appeler le ${telephone}`}>
                  {telephone}
                </a>
              </li>
            </ul>
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

      {/* Le menu se referme au clic sur un LIEN — pas via un effet sur
          le pathname, qui déclencherait un rendu en cascade, et pas au
          clic sur un bouton de rubrique, qui ne fait que la déplier.
          Fermé, il est en `visibility:hidden` : ses liens sortent donc
          d'eux-mêmes de l'ordre de tabulation, rien à masquer en plus. */}
      <nav
        className={`mobile-nav${open ? " is-open" : ""}`}
        id="mobileNav"
        ref={navRef}
        aria-label="Navigation mobile"
        onClick={(ev) => {
          if ((ev.target as Element).closest("a")) setOpen(false);
        }}
      >
        <ul className="mobile-nav__list">
          {entrees.map((e, i) => {
            const enfants = e.enfants ?? [];
            const cle = `${e.href ?? e.label}-${i}`;
            if (!enfants.length) {
              return e.href ? (
                <li key={cle}>
                  <Link className="mobile-nav__link" href={e.href}>
                    {e.label}
                  </Link>
                </li>
              ) : null;
            }
            const estDeplie = deplie === i;
            const idSous = `sous-menu-mobile-${i}`;
            return (
              <li key={cle} className={`mobile-nav__groupe${estDeplie ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="mobile-nav__link mobile-nav__toggle"
                  aria-expanded={estDeplie}
                  aria-controls={idSous}
                  onClick={() => setDeplie((d) => (d === i ? null : i))}
                >
                  {e.label}
                  <Chevron />
                </button>
                <ul className="mobile-nav__sub" id={idSous} hidden={!estDeplie}>
                  {/* Au doigt, le titre déplie : la page de la rubrique,
                      quand elle en a une, devient donc le premier lien. */}
                  {e.href ? (
                    <li>
                      <Link href={e.href}>
                        Tout voir<span className="u-sr-only"> : {e.label}</span>{" "}
                        <span aria-hidden="true">→</span>
                      </Link>
                    </li>
                  ) : null}
                  {enfants.map((c, k) => (
                    <li key={`${c.href}-${k}`}>
                      <Link href={c.href}>{c.label}</Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
          {!contactPresent && (
            <li>
              <Link className="mobile-nav__link" href="/contact">
                Contact
              </Link>
            </li>
          )}
        </ul>
        <a className="mobile-nav__tel" href={telHref} aria-label={`Appeler le ${telephone}`}>
          {telephone}
        </a>
        <Link href="/contact" className="c-btn c-btn--light">
          Parler de mon projet
        </Link>
      </nav>
    </>
  );
}
