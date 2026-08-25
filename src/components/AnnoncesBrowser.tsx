"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import AnnonceCard from "@/components/AnnonceCard";
import type { Bounds } from "@/components/AnnoncesMap";
import { MODELS } from "@/data/essensya";
import { annonceUrl } from "@/lib/format";
import type { Annonce } from "@/types";

/* Leaflet touche à `window` dès son import : la carte ne peut pas être
   rendue côté serveur. Le reste de la page, lui, reste pré-rendu. */
const AnnoncesMap = dynamic(() => import("@/components/AnnoncesMap"), {
  ssr: false,
  loading: () => <div className="l-map__frame l-map__frame--loading" />,
});

interface Filters {
  type: string;
  city: string;
  bedrooms: string;
  maxPrice: string;
  modelId: string;
  sort: string;
}

const INITIAL: Filters = {
  type: "all",
  city: "all",
  bedrooms: "all",
  maxPrice: "all",
  modelId: "all",
  sort: "recent",
};

export default function AnnoncesBrowser({ annonces }: { annonces: Annonce[] }) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(INITIAL);
  const [view, setView] = useState<Bounds | null>(null);
  /* Incrémenté par « Réinitialiser » : la carte se recadre sur tout. */
  const [fitToken, setFitToken] = useState(0);
  const [syncMap, setSyncMap] = useState(true);
  const [mapMode, setMapMode] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  const cities = useMemo(
    () => [...new Set(annonces.map((a) => a.city))].sort(),
    [annonces],
  );

  const items = useMemo(() => {
    let list = [...annonces];
    const f = filters;
    if (f.type !== "all") list = list.filter((a) => a.type === f.type);
    if (f.city !== "all") list = list.filter((a) => a.city === f.city);
    if (f.bedrooms !== "all")
      list = list.filter((a) => (a.bedrooms ?? 0) >= +f.bedrooms);
    if (f.maxPrice !== "all") list = list.filter((a) => a.price <= +f.maxPrice);
    if (f.modelId !== "all")
      list = list.filter((a) => a.modelId === f.modelId || a.type === "terrain");
    if (f.sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (f.sort === "price-desc") list.sort((a, b) => b.price - a.price);
    return list;
  }, [annonces, filters]);

  const inView = (a: Annonce) =>
    !view ||
    (a.lat >= view.south &&
      a.lat <= view.north &&
      a.lng >= view.west &&
      a.lng <= view.east);

  const visible = syncMap ? items.filter(inView) : items;

  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [key]: e.target.value }));

  const reset = () => {
    setFilters(INITIAL);
    setFitToken((n) => n + 1);
  };

  const onBoundsChange = useCallback((b: Bounds) => setView(b), []);
  const onSelect = useCallback(
    (a: Annonce) => router.push(annonceUrl(a)),
    [router],
  );

  return (
    <>
      <div className="l-filters">
        <div className="container">
          <div className="l-filter">
            <label htmlFor="fl-type">Type</label>
            <select id="fl-type" value={filters.type} onChange={set("type")}>
              <option value="all">Tout</option>
              <option value="terrain-maison">Terrain + maison</option>
              <option value="terrain">Terrain seul</option>
            </select>
          </div>
          <div className="l-filter">
            <label htmlFor="fl-city">Localité</label>
            <select id="fl-city" value={filters.city} onChange={set("city")}>
              <option value="all">Toutes</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="l-filter">
            <label htmlFor="fl-bed">Chambres</label>
            <select id="fl-bed" value={filters.bedrooms} onChange={set("bedrooms")}>
              <option value="all">Indifférent</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </div>
          <div className="l-filter">
            <label htmlFor="fl-price">Budget max</label>
            <select id="fl-price" value={filters.maxPrice} onChange={set("maxPrice")}>
              <option value="all">Indifférent</option>
              <option value="150000">150 000 €</option>
              <option value="260000">260 000 €</option>
              <option value="300000">300 000 €</option>
              <option value="350000">350 000 €</option>
            </select>
          </div>
          <div className="l-filter">
            <label htmlFor="fl-model">Modèle</label>
            <select id="fl-model" value={filters.modelId} onChange={set("modelId")}>
              <option value="all">Tous</option>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
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
            <button
              className={mapMode ? "" : "is-on"}
              onClick={() => setMapMode(false)}
            >
              Liste
            </button>
            <button className={mapMode ? "is-on" : ""} onClick={() => setMapMode(true)}>
              Carte
            </button>
          </div>
          <span className="l-filters__count">
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
              annonces={items}
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
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
