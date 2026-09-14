"use client";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnnonceCard from "@/components/AnnonceCard";
import type { Bounds } from "@/components/AnnoncesMap";
import { annonceUrl } from "@/lib/format";
import type { Annonce } from "@/types";

/* Leaflet touche à `window` dès son import : la carte ne peut pas être
   rendue côté serveur. Le reste de la page, lui, reste pré-rendu. */
const AnnoncesMap = dynamic(() => import("@/components/AnnoncesMap"), {
  ssr: false,
  loading: () => <div className="l-map__frame l-map__frame--loading" />,
});

interface Filters {
  /** Commune ou code postal, saisie libre. */
  q: string;
  type: string;
  dept: string;
  bedrooms: string;
  maxPrice: string;
  sort: string;
}

const INITIAL: Filters = {
  q: "",
  type: "all",
  dept: "all",
  bedrooms: "all",
  maxPrice: "all",
  sort: "recent",
};

const TYPES = ["terrain", "terrain-maison"];

/* Paliers calés sur le flux réel : la médiane T+M est à 161 000 € et
   presque rien ne dépasse 250 000 €. Des paliers à 300/350 000 € ne
   filtraient donc jamais rien. */
const BUDGETS = ["120000", "150000", "180000", "220000"];

/* ── ACCROCHES DE LA FEUILLE DE RÉSULTATS (mobile, en vue carte) ──
   Trois positions plutôt qu'un glissé libre : on se cale toujours sur
   une hauteur lisible, et le pouce n'a pas à viser. Pourcentages de la
   hauteur de la feuille, appliqués en `translateY` — 0 = plein écran,
   78 = simple aperçu. Hors du composant : une constante recréée à
   chaque rendu fausse les dépendances des hooks. */
const ACCROCHES = [0, 45, 78] as const;

/** Comparaison insensible aux accents et à la casse : « la rochelle » = « La Rochelle ». */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Les prix inconnus partent en fin de liste, quel que soit le sens du tri. */
const byPrice = (dir: 1 | -1) => (x: Annonce, y: Annonce) => {
  if (x.price === null) return y.price === null ? 0 : 1;
  if (y.price === null) return -1;
  return (x.price - y.price) * dir;
};

/** Tri « plus récentes » : sur updatedAt (ISO), annonces sans date en dernier. */
const byRecent = (x: Annonce, y: Annonce) => {
  if (!x.updatedAt) return y.updatedAt ? 1 : 0;
  if (!y.updatedAt) return -1;
  return y.updatedAt.localeCompare(x.updatedAt);
};

export default function AnnoncesBrowser({
  annonces,
  initial,
}: {
  annonces: Annonce[];
  /** Filtres lus dans l'URL CÔTÉ SERVEUR — voir le commentaire de page.tsx. */
  initial?: Partial<Record<"q" | "type" | "dept" | "maxPrice", string>>;
}) {
  const router = useRouter();
  const pathname = usePathname();

  /* Le département est la vraie maille du flux (17, 79, 85, 28, 49…) :
     la liste des communes se compte en centaines, elle ne fait pas un
     menu déroulant utilisable. */
  const depts = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of annonces) if (a.deptCode) m.set(a.deptCode, a.dept || a.deptCode);
    return [...m.entries()].sort((x, y) => x[0].localeCompare(y[0], "fr"));
  }, [annonces]);

  /* La home et le pied de page produisent déjà des liens filtrés
     (/annonces?type=terrain) : l'état part de l'URL, jamais de zéro.
     Les valeurs arrivent du serveur, et elles sont re-validées ici —
     une URL forgée à la main ne doit pas produire un filtre inconnu. */
  const [filters, setFilters] = useState<Filters>(() => ({
    ...INITIAL,
    q: initial?.q ?? "",
    type: TYPES.includes(initial?.type ?? "") ? initial!.type! : "all",
    dept: depts.some(([code]) => code === initial?.dept) ? initial!.dept! : "all",
    maxPrice: BUDGETS.includes(initial?.maxPrice ?? "") ? initial!.maxPrice! : "all",
  }));

  const [view, setView] = useState<Bounds | null>(null);
  /* Incrémenté par « Réinitialiser » : la carte se recadre sur tout. */
  const [fitToken, setFitToken] = useState(0);
  const [syncMap, setSyncMap] = useState(true);
  const [mapMode, setMapMode] = useState(false);

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
  const [highlight, setHighlight] = useState<string | null>(null);

  /* Une recherche doit se partager : les filtres se reflètent dans l'URL.
     `replace` et non `push` — filtrer n'est pas naviguer, et le retour
     arrière doit ramener à la page précédente, pas au filtre précédent. */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const p = new URLSearchParams();
    if (filters.q.trim()) p.set("q", filters.q.trim());
    if (filters.type !== "all") p.set("type", filters.type);
    if (filters.dept !== "all") p.set("dept", filters.dept);
    if (filters.maxPrice !== "all") p.set("max", filters.maxPrice);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

  const items = useMemo(() => {
    const f = filters;
    const q = norm(f.q);
    let list = annonces.filter((a) => {
      if (f.type !== "all" && a.type !== f.type) return false;
      if (f.dept !== "all" && a.deptCode !== f.dept) return false;
      if (f.bedrooms !== "all" && (a.bedrooms ?? 0) < +f.bedrooms) return false;
      /* Un prix inconnu ne peut pas être promis sous un budget. */
      if (f.maxPrice !== "all" && (a.price === null || a.price > +f.maxPrice)) return false;
      if (q && !norm(`${a.city} ${a.zip} ${a.dept} ${a.deptCode}`).includes(q)) return false;
      return true;
    });
    list = [...list];
    if (f.sort === "price-asc") list.sort(byPrice(1));
    else if (f.sort === "price-desc") list.sort(byPrice(-1));
    else list.sort(byRecent);
    return list;
  }, [annonces, filters]);

  /* Une annonce sans coordonnées n'est pas plaçable — mais elle reste
     dans la liste : elle représente une vraie opportunité. */
  const mapItems = useMemo(
    () => items.filter((a) => a.lat !== null && a.lng !== null),
    [items],
  );

  const inView = (a: Annonce) => {
    if (!view || a.lat === null || a.lng === null) return true;
    return (
      a.lat >= view.south &&
      a.lat <= view.north &&
      a.lng >= view.west &&
      a.lng <= view.east
    );
  };

  const visible = syncMap ? items.filter(inView) : items;
  /* Annonces retenues par les filtres mais impossibles à placer. */
  const offMap = items.length - mapItems.length;

  const set =
    (key: keyof Filters) =>
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      setFilters((f) => ({ ...f, [key]: e.target.value }));

  const reset = () => {
    setFilters(INITIAL);
    setFitToken((n) => n + 1);
  };

  const onBoundsChange = useCallback((b: Bounds) => setView(b), []);
  const onSelect = useCallback((a: Annonce) => router.push(annonceUrl(a)), [router]);

  return (
    <>
      <div className="l-filters">
        <div className="container">
          <div className="l-filter l-filter--wide">
            <label htmlFor="fl-q">Commune ou code postal</label>
            <input
              id="fl-q"
              type="search"
              value={filters.q}
              onChange={set("q")}
              placeholder="Mont-de-Marsan, 40000…"
              autoComplete="off"
            />
          </div>
          <div className="l-filter">
            <label htmlFor="fl-type">Type</label>
            <select id="fl-type" value={filters.type} onChange={set("type")}>
              <option value="all">Tout</option>
              <option value="terrain-maison">Terrain + maison</option>
              <option value="terrain">Terrain seul</option>
            </select>
          </div>
          <div className="l-filter">
            <label htmlFor="fl-dept">Département</label>
            <select id="fl-dept" value={filters.dept} onChange={set("dept")}>
              <option value="all">Tous</option>
              {depts.map(([code, name]) => (
                <option key={code} value={code}>
                  {name === code ? code : `${name} (${code})`}
                </option>
              ))}
            </select>
          </div>
          <div className="l-filter">
            <label htmlFor="fl-bed">Chambres</label>
            <select id="fl-bed" value={filters.bedrooms} onChange={set("bedrooms")}>
              <option value="all">Indifférent</option>
              {/* Le flux ne contient pas de maison au-delà de 3 chambres. */}
              <option value="2">2 et plus</option>
              <option value="3">3 et plus</option>
            </select>
          </div>
          <div className="l-filter">
            <label htmlFor="fl-price">Budget max</label>
            <select id="fl-price" value={filters.maxPrice} onChange={set("maxPrice")}>
              <option value="all">Indifférent</option>
              <option value="120000">120 000 €</option>
              <option value="150000">150 000 €</option>
              <option value="180000">180 000 €</option>
              <option value="220000">220 000 €</option>
            </select>
          </div>
          <div className="l-filter">
            <label htmlFor="fl-sort">Trier</label>
            <select id="fl-sort" value={filters.sort} onChange={set("sort")}>
              <option value="recent">Plus récentes</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </select>
          </div>
          <button className="l-filters__reset" onClick={reset}>
            Réinitialiser
          </button>
          <div className="l-view-toggle" role="group" aria-label="Affichage">
            <button className={mapMode ? "" : "is-on"} onClick={() => { setMapMode(false); caler(0); }}>
              Liste
            </button>
            <button className={mapMode ? "is-on" : ""} onClick={() => { setMapMode(true); caler(2); }}>
              Carte
            </button>
          </div>
          <span className="l-filters__count" role="status">
            {visible.length} opportunité{visible.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className={`l-body${mapMode ? " is-map-mode" : ""}`}>
        <div className="container">
          <div className="l-results" ref={feuilleRef}>
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
              <span>
                {visible.length} opportunité{visible.length > 1 ? "s" : ""}
              </span>
            </div>
            {visible.length ? (
              visible.map((a) => (
                <AnnonceCard
                  key={a.id}
                  annonce={a}
                  reveal={false}
                  highlighted={highlight === a.id}
                  onMouseEnter={() => setHighlight(a.id)}
                  onMouseLeave={() => setHighlight(null)}
                />
              ))
            ) : (
              <div className="l-results__empty">
                Aucune opportunité dans cette zone avec ces critères.
                <br />
                Élargissez la carte ou réinitialisez les filtres.
              </div>
            )}
          </div>

          <div className="l-map">
            <AnnoncesMap
              annonces={mapItems}
              highlight={highlight}
              onHighlight={setHighlight}
              onBoundsChange={onBoundsChange}
              onSelect={onSelect}
              fitToken={fitToken}
            />
            <label className="l-map__sync">
              <input
                type="checkbox"
                checked={syncMap}
                onChange={(e) => setSyncMap(e.target.checked)}
              />{" "}
              Rechercher quand je déplace la carte
            </label>
            <p className="l-map__hint">
              Les annonces proches sont regroupées en bulles : zoomez ou cliquez une
              bulle pour la scinder. Les résultats suivent la zone visible.
              {offMap > 0 && (
                <>
                  {" "}
                  {offMap} annonce{offMap > 1 ? "s" : ""} sans coordonnées, absente
                  {offMap > 1 ? "s" : ""} de la carte mais conservée
                  {offMap > 1 ? "s" : ""} dans la liste.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
