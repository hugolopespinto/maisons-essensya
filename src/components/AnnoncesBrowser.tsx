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
              placeholder="La Rochelle, 17000…"
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
            <button className={mapMode ? "" : "is-on"} onClick={() => setMapMode(false)}>
              Liste
            </button>
            <button className={mapMode ? "is-on" : ""} onClick={() => setMapMode(true)}>
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
          <div className="l-results">
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
