"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import AnnonceCard from "@/components/AnnonceCard";
import {
  CHAMBRES,
  CRITERES_VIDES,
  TRIS,
  TYPES,
  estFiltre,
  memeZone,
  normaliserRecherche,
  requeteDe,
  urlAnnonces,
  zoneUtile,
  type Criteres,
  type ResultatRecherche,
  type Tri,
  type TypeAnnonce,
  type Zone,
} from "@/lib/annonces/criteres";
import type { PointCarte } from "@/types";

/* Leaflet touche à `window` dès son import : la carte ne peut pas être
   rendue côté serveur. Le reste de la page, lui, reste pré-rendu. */
const AnnoncesMap = dynamic(() => import("@/components/AnnoncesMap"), {
  ssr: false,
  loading: () => <div className="c-map__frame l-map__frame--loading" />,
});

/* ════════════════════════════════════════════════════════════════
   LE LISTING NE FILTRE PLUS RIEN LUI-MÊME

   Il écrit les critères dans l'URL ; le serveur cherche
   (src/lib/annonces/recherche.ts) et renvoie la page de résultats, les
   points de la carte et le compte. Tout passe par `naviguer()`.

   · Les menus montrent le choix tout de suite (`useOptimistic`) ; la
     liste, elle, attend la réponse, grisée le temps du trajet.
   · La recherche libre attend la fin d'un mot (`ATTENTE_SAISIE`), un
     déplacement de carte la fin du geste (`ATTENTE_CARTE`) : une
     requête par intention, pas par lettre ni par cran de molette.
   · Les pages sont de vrais liens : Google les suit, et un clic du
     milieu les ouvre dans un onglet comme n'importe quel lien.

   Pas de budget maximum : le filtre a été retiré à la demande du
   client. Une ancienne URL en `?max=` reste valide, le paramètre est
   ignoré (voir `lireCriteres`).
   ════════════════════════════════════════════════════════════════ */

const ATTENTE_SAISIE = 300;
const ATTENTE_CARTE = 300;

const libelleChambres = (n: number) => `${n} chambre${n === 1 ? "" : "s"}`;
const libelleTotal = (n: number) => `${n} opportunité${n > 1 ? "s" : ""}`;

/** La valeur d'un menu, si elle est l'une des valeurs prévues ; « all » → aucune. */
const parmi = <T extends string>(v: string, valides: readonly T[]): T | null =>
  (valides as readonly string[]).includes(v) ? (v as T) : null;

/* ── ACCROCHES DE LA FEUILLE DE RÉSULTATS (mobile, en vue carte) ──
   Trois positions plutôt qu'un glissé libre : on se cale toujours sur
   une hauteur lisible, et le pouce n'a pas à viser. Pourcentages de la
   hauteur de la feuille, appliqués en `translateY` — 0 = plein écran,
   78 = simple aperçu. Hors du composant : une constante recréée à
   chaque rendu fausse les dépendances des hooks. */
const ACCROCHES = [0, 45, 78] as const;

/**
 * Les numéros à afficher : la première page, la dernière, la courante
 * et ses voisines — `null` pour une ellipse. Un seul numéro sauté est
 * affiché plutôt que remplacé par « … », qui prendrait autant de place.
 *   1 2 3 4 … 12   ·   1 … 5 6 7 … 12   ·   1 … 9 10 11 12
 */
function fenetre(page: number, pages: number): (number | null)[] {
  const garder = new Set([1, pages]);
  const debut = Math.max(2, Math.min(page - 1, pages - 3));
  const fin = Math.min(pages - 1, Math.max(page + 1, 4));
  for (let n = debut; n <= fin; n++) garder.add(n);
  const out: (number | null)[] = [];
  let avant = 0;
  for (const n of [...garder].sort((x, y) => x - y)) {
    if (n - avant === 2) out.push(n - 1);
    else if (n - avant > 2) out.push(null);
    out.push(n);
    avant = n;
  }
  return out;
}

/**
 * La pagination du listing. De vrais liens `<a href>`, que Google suit
 * et qui marchent sans JavaScript ; un clic ordinaire passe par
 * `onPage`, pour que la liste se grise et remonte pendant le trajet.
 */
function Pagination({
  criteres,
  pages,
  onPage,
}: {
  criteres: Criteres;
  pages: number;
  onPage: (n: number) => void;
}) {
  if (pages <= 1) return null;
  const page = criteres.page;
  const href = (n: number) => urlAnnonces({ ...criteres, page: n });
  /* `onNavigate` ne se déclenche que pour une navigation dans la page :
     Ctrl+clic et clic du milieu gardent leur comportement d'onglet. */
  const aller = (n: number) => (e: { preventDefault: () => void }) => {
    e.preventDefault();
    onPage(n);
  };

  return (
    <nav className="l-pages" aria-label="Pages de résultats">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          rel="prev"
          className="l-pages__pas"
          aria-label="Page précédente"
          onNavigate={aller(page - 1)}
        >
          <span aria-hidden="true">←</span> <span className="l-pages__mot">Précédente</span>
        </Link>
      ) : (
        <span className="l-pages__pas is-off" aria-hidden="true">
          ← <span className="l-pages__mot">Précédente</span>
        </span>
      )}
      <ol>
        {fenetre(page, pages).map((n, i) =>
          n === null ? (
            <li key={`ellipse-${i}`} className="l-pages__ellipse" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={n}>
              {n === page ? (
                <span aria-current="page">
                  <span className="u-sr-only">Page </span>
                  {n}
                </span>
              ) : (
                <Link href={href(n)} onNavigate={aller(n)}>
                  <span className="u-sr-only">Page </span>
                  {n}
                </Link>
              )}
            </li>
          ),
        )}
      </ol>
      {page < pages ? (
        <Link
          href={href(page + 1)}
          rel="next"
          className="l-pages__pas"
          aria-label="Page suivante"
          onNavigate={aller(page + 1)}
        >
          <span className="l-pages__mot">Suivante</span> <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span className="l-pages__pas is-off" aria-hidden="true">
          <span className="l-pages__mot">Suivante</span> →
        </span>
      )}
    </nav>
  );
}

export default function AnnoncesBrowser({ resultat }: { resultat: ResultatRecherche }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [criteres, poserCriteres] = useOptimistic(resultat.criteres);

  /* La recherche libre a son propre état : la frappe ne doit jamais
     attendre le serveur, ni être réécrite par sa réponse. */
  const [saisie, setSaisie] = useState(resultat.criteres.q);

  /* ── ÉCHO OU NAVIGATION ? ──
     Chaque réponse du serveur arrive en nouveau `resultat`. Soit c'est
     l'écho de ce que la page vient de demander (`demande`) — rien à
     faire ; soit c'est une vraie navigation : un lien du menu vers
     /annonces?chambres=3 depuis le listing (Next garde alors ce
     composant monté), un retour arrière. Elle s'applique en entier :
     recherche libre comprise, et la carte se recadre.
     Un écho en retard ne peut pas défaire un choix plus récent : Next
     abandonne une navigation dès qu'une autre part, seule la dernière
     est rendue. */
  const [demande, setDemande] = useState(() => requeteDe(resultat.criteres));
  const [rupture, setRupture] = useState(0);
  const [resultatVu, setResultatVu] = useState(resultat);
  if (resultat !== resultatVu) {
    setResultatVu(resultat);
    const recue = requeteDe(resultat.criteres);
    if (recue !== demande) {
      setDemande(recue);
      setSaisie(resultat.criteres.q);
      setRupture((n) => n + 1);
    }
  }

  /* Les points ne changent qu'avec les critères : tourner les pages ou
     déplacer la carte renvoie les mêmes. On garde alors le même tableau,
     pour que la carte ne repose pas ses marqueurs à chaque réponse. */
  const [carte, setCarte] = useState({ cle: resultat.pointsCle, points: resultat.points });
  if (resultat.pointsCle !== carte.cle) setCarte({ cle: resultat.pointsCle, points: resultat.points });

  /* Les critères DEMANDÉS en dernier, en avance sur `resultat` tant que
     le serveur n'a pas répondu : deux menus changés coup sur coup
     s'additionnent au lieu de s'écraser. Le serveur reprend la main à
     chaque réponse — ce sont ses critères, validés, qui font foi. */
  const voulu = useRef(resultat.criteres);
  useEffect(() => {
    voulu.current = resultat.criteres;
  }, [resultat]);

  /** La frappe pas encore envoyée — `null` quand il n'y en a pas. */
  const qEnAttente = useRef<string | null>(null);
  const minuterieSaisie = useRef<ReturnType<typeof setTimeout>>(undefined);
  const minuterieCarte = useRef<ReturnType<typeof setTimeout>>(undefined);

  /**
   * Écrit des critères dans l'URL ; le serveur cherche et renvoie la page.
   * `replace` pour un filtre — filtrer n'est pas naviguer, le retour
   * arrière doit ramener à la page précédente, pas au filtre précédent ;
   * `push` pour tourner une page, comme un lien.
   */
  const naviguer = useCallback(
    (maj: (c: Criteres) => Criteres, mode: "replace" | "push" = "replace") => {
      /* Une frappe en attente part avec : changer un menu en cours de
         saisie ne doit pas perdre la commune tapée. */
      clearTimeout(minuterieSaisie.current);
      let base = voulu.current;
      if (qEnAttente.current !== null) {
        const q = normaliserRecherche(qEnAttente.current);
        qEnAttente.current = null;
        if (q !== base.q) base = { ...base, q, page: 1 };
      }
      const suivants = maj(base);
      const qs = requeteDe(suivants);
      if (qs === requeteDe(voulu.current)) return;
      voulu.current = suivants;
      setDemande(qs);
      demarrer(() => {
        poserCriteres(suivants);
        const url = urlAnnonces(suivants);
        if (mode === "push") router.push(url, { scroll: false });
        else router.replace(url, { scroll: false });
      });
    },
    [router, poserCriteres],
  );

  /** Un filtre change : on repart de la première page. */
  const filtrer = (maj: (c: Criteres) => Criteres) => naviguer((c) => ({ ...maj(c), page: 1 }));

  const onSaisie = (v: string) => {
    setSaisie(v);
    qEnAttente.current = v;
    clearTimeout(minuterieSaisie.current);
    minuterieSaisie.current = setTimeout(() => naviguer((c) => c), ATTENTE_SAISIE);
  };

  /* Une navigation venue d'ailleurs, ou « Réinitialiser » : ce qui était
     en attente ne vaut plus. */
  useEffect(() => {
    clearTimeout(minuterieSaisie.current);
    clearTimeout(minuterieCarte.current);
    qEnAttente.current = null;
  }, [rupture]);

  useEffect(() => {
    const saisieT = minuterieSaisie;
    const carteT = minuterieCarte;
    return () => {
      clearTimeout(saisieT.current);
      clearTimeout(carteT.current);
    };
  }, []);

  const reset = () => {
    qEnAttente.current = null;
    setSaisie("");
    naviguer(() => CRITERES_VIDES);
    /* La carte se recadre sur tout — même si aucun filtre n'était posé. */
    setRupture((n) => n + 1);
  };

  /* ── LA CARTE ── */
  const [syncMap, setSyncMap] = useState(true);
  const [mapMode, setMapMode] = useState(false);
  /** La dernière vue de la carte, cadrage compris. */
  const vue = useRef<Zone | null>(null);

  const onBoundsChange = useCallback(
    (z: Zone, auto: boolean) => {
      vue.current = z;
      clearTimeout(minuterieCarte.current);
      /* Un cadrage de la carte n'est pas une recherche — voir AnnoncesMap. */
      if (auto || !syncMap) return;
      minuterieCarte.current = setTimeout(() => {
        const zone = zoneUtile(z, carte.points);
        naviguer((c) => (memeZone(c.zone, zone) ? c : { ...c, zone, page: 1 }));
      }, ATTENTE_CARTE);
    },
    [syncMap, carte.points, naviguer],
  );

  const suivreCarte = (on: boolean) => {
    setSyncMap(on);
    clearTimeout(minuterieCarte.current);
    const zone = on && vue.current ? zoneUtile(vue.current, carte.points) : null;
    naviguer((c) => (memeZone(c.zone, zone) ? c : { ...c, zone, page: 1 }));
  };

  const onSelect = useCallback((p: PointCarte) => router.push(p.href), [router]);
  const [highlight, setHighlight] = useState<string | null>(null);

  /* ── LA FEUILLE DE RÉSULTATS (mobile) ── */
  const [accroche, setAccroche] = useState(2);
  const feuilleRef = useRef<HTMLDivElement>(null);
  const glisse = useRef<{ y0: number; depart: number } | null>(null);

  /** Applique une position, en pixels, sans repasser par React. */
  const poser = useCallback((px: number, anime: boolean) => {
    const el = feuilleRef.current;
    if (!el) return;
    el.dataset.glisse = anime ? "0" : "1";
    el.style.setProperty("--feuille", `${px}px`);
  }, []);

  const hauteurFeuille = () => feuilleRef.current?.offsetHeight ?? 0;

  const caler = useCallback(
    (i: number) => {
      const idx = Math.max(0, Math.min(ACCROCHES.length - 1, i));
      setAccroche(idx);
      poser((hauteurFeuille() * ACCROCHES[idx]) / 100, true);
    },
    [poser],
  );

  /* `setPointerCapture` : le doigt peut sortir de la poignée sans que le
     glissé s'interrompe — sinon il se coupe dès qu'on va vite. */
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    glisse.current = {
      y0: e.clientY,
      depart: (hauteurFeuille() * ACCROCHES[accroche]) / 100,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = glisse.current;
    if (!g) return;
    const h = hauteurFeuille();
    /* Bornes larges : on peut dépasser un peu, jamais sortir de l'écran. */
    const y = Math.max(0, Math.min(h * 0.9, g.depart + (e.clientY - g.y0)));
    poser(y, false);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = glisse.current;
    glisse.current = null;
    if (!g) return;
    const h = hauteurFeuille();
    const y = Math.max(0, Math.min(h * 0.9, g.depart + (e.clientY - g.y0)));
    /* On rejoint l'accroche la plus proche en pourcentage parcouru. */
    const pct = (y / h) * 100;
    let proche = 0;
    ACCROCHES.forEach((a, i) => {
      if (Math.abs(a - pct) < Math.abs(ACCROCHES[proche] - pct)) proche = i;
    });
    caler(proche);
  };

  /* Le lien de page cliqué devient la page courante, qui n'est plus un
     lien : le focus clavier tomberait sur <body>, et la lecture
     reprendrait en haut du document. On le pose sur la liste, une fois
     la nouvelle page arrivée. */
  const focusApresPage = useRef(false);
  useEffect(() => {
    if (!focusApresPage.current) return;
    focusApresPage.current = false;
    feuilleRef.current?.focus({ preventScroll: true });
  }, [resultat]);

  /** Tourner une page ramène en haut des résultats — de la feuille sur
   *  mobile, de la liste sinon — sans attendre la réponse. */
  const allerPage = (n: number) => {
    focusApresPage.current = true;
    naviguer((c) => ({ ...c, page: n }), "push");
    const el = feuilleRef.current;
    if (!el) return;
    if (getComputedStyle(el).position === "fixed") {
      el.scrollTo({ top: 0 });
      return;
    }
    const doux = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "start", behavior: doux ? "smooth" : "auto" });
  };

  const { total, annonces } = resultat;

  return (
    <>
      <div className="l-filters">
        {/* Un vrai formulaire : Entrée lance la recherche tout de suite, et
            sans JavaScript, il soumet les mêmes critères au serveur. */}
        <form
          className="container"
          role="search"
          action="/annonces"
          onSubmit={(e) => {
            e.preventDefault();
            naviguer((c) => c);
          }}
        >
          <div className="l-filter l-filter--wide">
            <label htmlFor="fl-q">Commune ou code postal</label>
            <input
              id="fl-q"
              name="q"
              type="search"
              value={saisie}
              onChange={(e) => onSaisie(e.target.value)}
              placeholder="Mont-de-Marsan, 40000…"
              autoComplete="off"
            />
          </div>
          <div className="l-filter">
            <label htmlFor="fl-type">Type</label>
            <select
              id="fl-type"
              name="type"
              value={criteres.type ?? "all"}
              onChange={(e) =>
                filtrer((c) => ({ ...c, type: parmi<TypeAnnonce>(e.target.value, TYPES) }))
              }
            >
              <option value="all">Tout</option>
              <option value="terrain-maison">Terrain + maison</option>
              <option value="terrain">Terrain seul</option>
            </select>
          </div>
          <div className="l-filter">
            <label htmlFor="fl-dept">Département</label>
            <select
              id="fl-dept"
              name="dept"
              value={criteres.dept ?? "all"}
              onChange={(e) =>
                filtrer((c) => ({ ...c, dept: e.target.value === "all" ? null : e.target.value }))
              }
            >
              <option value="all">Tous</option>
              {resultat.departements.map(([code, name]) => (
                <option key={code} value={code}>
                  {name === code ? code : `${name} (${code})`}
                </option>
              ))}
            </select>
          </div>
          <div className="l-filter">
            <label htmlFor="fl-bed">Chambres</label>
            <select
              id="fl-bed"
              name="chambres"
              value={criteres.chambres ?? "all"}
              onChange={(e) =>
                filtrer((c) => ({
                  ...c,
                  chambres: e.target.value === "all" ? null : Number(e.target.value),
                }))
              }
            >
              <option value="all">Indifférent</option>
              {CHAMBRES.map((n) => (
                <option key={n} value={n}>
                  {libelleChambres(n)}
                </option>
              ))}
            </select>
          </div>
          <div className="l-filter">
            <label htmlFor="fl-sort">Trier</label>
            <select
              id="fl-sort"
              name="tri"
              value={criteres.tri}
              onChange={(e) =>
                filtrer((c) => ({ ...c, tri: parmi<Tri>(e.target.value, TRIS) ?? "recent" }))
              }
            >
              <option value="recent">Plus récentes</option>
              <option value="prix-asc">Prix croissant</option>
              <option value="prix-desc">Prix décroissant</option>
            </select>
          </div>
          <button type="button" className="l-filters__reset" onClick={reset}>
            Réinitialiser
          </button>
          <div className="l-view-toggle" role="group" aria-label="Affichage">
            <button
              type="button"
              className={mapMode ? "" : "is-on"}
              onClick={() => {
                setMapMode(false);
                caler(0);
              }}
            >
              Liste
            </button>
            <button
              type="button"
              className={mapMode ? "is-on" : ""}
              onClick={() => {
                setMapMode(true);
                caler(2);
              }}
            >
              Carte
            </button>
          </div>
          <span className="l-filters__count" role="status">
            {libelleTotal(total)}
          </span>
        </form>
      </div>

      <div className={`l-body${mapMode ? " is-map-mode" : ""}`}>
        <div className="container">
          <div
            className="l-results"
            ref={feuilleRef}
            tabIndex={-1}
            role="region"
            aria-label="Résultats"
            aria-busy={enCours || undefined}
          >
            {/* Poignée : visible seulement en vue carte sur mobile. Un
                appui simple bascule entre aperçu et plein écran — tout le
                monde ne glisse pas. */}
            <div
              className="l-sheet-handle"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onClick={() => caler(accroche === 0 ? 2 : 0)}
              role="button"
              tabIndex={0}
              aria-label={
                accroche === 0 ? "Réduire la liste des résultats" : "Agrandir la liste des résultats"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  caler(accroche === 0 ? 2 : 0);
                } else if (e.key === "ArrowUp") caler(accroche - 1);
                else if (e.key === "ArrowDown") caler(accroche + 1);
              }}
            >
              <span>{libelleTotal(total)}</span>
            </div>
            {annonces.length ? (
              <>
                {annonces.map(({ annonce: a, href }) => (
                  <AnnonceCard
                    key={a.id}
                    annonce={a}
                    href={href}
                    reveal={false}
                    highlighted={highlight === a.id}
                    onMouseEnter={() => setHighlight(a.id)}
                    onMouseLeave={() => setHighlight(null)}
                  />
                ))}
                <Pagination criteres={resultat.criteres} pages={resultat.pages} onPage={allerPage} />
              </>
            ) : resultat.chambresAbsentes && resultat.criteres.chambres !== null ? (
              /* Rien à élargir : aucune annonce du flux n'a ce nombre de
                 chambres, où que soit la carte. Le dire, plutôt que de
                 renvoyer le visiteur déplacer une carte qui ne trouvera
                 rien — il arrive souvent ici depuis le menu. */
              <div className="l-results__empty">
                Aucune maison {libelleChambres(resultat.criteres.chambres)} parmi nos annonces en
                ce moment.
                <br />
                Choisissez un autre nombre de chambres, ou{" "}
                <Link href="/contact">parlez-nous de votre projet</Link>.
              </div>
            ) : resultat.criteres.zone ? (
              <div className="l-results__empty">
                Aucune opportunité dans cette zone avec ces critères.
                <br />
                Élargissez la carte ou réinitialisez les filtres.
              </div>
            ) : !estFiltre(resultat.criteres) ? (
              /* Rien du tout, sans aucun filtre : le flux est vide — token
                 expiré, maintenance Vitahome. Ce n'est pas « aucun
                 résultat », et le visiteur n'a rien à réinitialiser. */
              <div className="l-results__empty">
                Nos annonces sont en cours de mise à jour.
                <br />
                <Link href="/contact">Dites-nous où vous construisez</Link>, nous vous
                recontactons.
              </div>
            ) : (
              <div className="l-results__empty">
                Aucune opportunité avec ces critères.
                <br />
                Réinitialisez les filtres, ou{" "}
                <Link href="/contact">dites-nous où vous cherchez</Link>.
              </div>
            )}
          </div>

          <div className="l-map">
            <AnnoncesMap
              points={carte.points}
              highlight={highlight}
              onHighlight={setHighlight}
              onBoundsChange={onBoundsChange}
              onSelect={onSelect}
              fitToken={rupture}
              cadre={criteres.zone}
            />
            <label className="l-map__sync">
              <input
                type="checkbox"
                checked={syncMap}
                onChange={(e) => suivreCarte(e.target.checked)}
              />{" "}
              Rechercher quand je déplace la carte
            </label>
            <p className="l-map__hint">
              Les annonces proches sont regroupées en bulles : zoomez ou cliquez une
              bulle pour la scinder. Les résultats suivent la zone visible.
              {resultat.sansCoordonnees > 0 && (
                <>
                  {" "}
                  {resultat.sansCoordonnees} annonce{resultat.sansCoordonnees > 1 ? "s" : ""} sans
                  coordonnées, absente{resultat.sansCoordonnees > 1 ? "s" : ""} de la carte mais
                  conservée{resultat.sansCoordonnees > 1 ? "s" : ""} dans la liste.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
