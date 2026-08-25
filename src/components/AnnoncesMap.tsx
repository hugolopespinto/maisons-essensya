"use client";
import L from "leaflet";
import "leaflet.markercluster";
import { useCallback, useEffect, useRef } from "react";
import { annonceTitle, fmtPrice } from "@/lib/format";
import { modelById } from "@/data/essensya";
import type { Annonce } from "@/types";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

/* ════ CARTE DES OPPORTUNITÉS ════
   Leaflet + markercluster. Les annonces proches sont agrégées en une
   bulle chiffrée ; zoomer (ou cliquer la bulle) la scinde jusqu'aux
   points individuels. Chaque déplacement remonte les bornes visibles
   au parent, qui filtre la liste — le contrat du prototype v7.

   Fond de carte : n'importe quel fournisseur XYZ via
   NEXT_PUBLIC_MAP_TILE_URL. Défaut CARTO Positron, sans clé.       */

const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface Props {
  annonces: Annonce[];
  highlight: string | null;
  onHighlight: (id: string | null) => void;
  onBoundsChange: (b: Bounds) => void;
  onSelect: (a: Annonce) => void;
  /** Change de valeur → la carte se recadre sur toutes les annonces. */
  fitToken: number;
}

/* Taille de la bulle indexée sur le nombre d'annonces regroupées. */
const clusterSize = (n: number) =>
  n < 10 ? 36 : n < 50 ? 44 : n < 200 ? 52 : 60;

const bounds = (m: L.Map): Bounds => {
  const b = m.getBounds();
  return {
    north: b.getNorth(),
    south: b.getSouth(),
    east: b.getEast(),
    west: b.getWest(),
  };
};

export default function AnnoncesMap({
  annonces,
  highlight,
  onHighlight,
  onBoundsChange,
  onSelect,
  fitToken,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const fittedRef = useRef(false);

  /* Les callbacks changent à chaque rendu du parent : on les garde dans
     des refs pour ne pas re-souscrire les événements Leaflet. */
  const cb = useRef({ onHighlight, onBoundsChange, onSelect });
  const annoncesRef = useRef(annonces);

  /* Déclaré avant les autres effets : les refs sont donc à jour quand
     ceux-ci s'exécutent (React lance les effets dans l'ordre). */
  useEffect(() => {
    cb.current = { onHighlight, onBoundsChange, onSelect };
    annoncesRef.current = annonces;
  });

  /* Sur mobile la carte n'est affichée qu'en vue Carte : tant qu'elle est
     masquée, Leaflet mesure 0×0 et ses bornes ne veulent rien dire. */
  const isSized = () => !!hostRef.current?.clientWidth;

  /* Cadre la vue sur l'ensemble des annonces filtrées. Le moveend qui
     s'ensuit remonte les nouvelles bornes au parent. Renvoie false si le
     cadrage n'a pas pu se faire (carte masquée ou aucune annonce). */
  const fitAll = useCallback(() => {
    const map = mapRef.current;
    const list = annoncesRef.current;
    if (!map || !list.length || !isSized()) return false;
    map.fitBounds(
      L.latLngBounds(list.map((a) => [a.lat, a.lng] as [number, number])),
      { padding: [42, 42], maxZoom: 12 },
    );
    return true;
  }, []);

  /* ── Création de la carte (une seule fois) ── */
  useEffect(() => {
    const host = hostRef.current;
    if (!host || mapRef.current) return;

    const map = L.map(host, {
      zoomControl: false,
      attributionControl: true,
      // La molette ne zoome qu'après un clic dans la carte : sinon elle
      // capturerait le scroll de la page (la carte est en sticky).
      scrollWheelZoom: false,
    }).setView([43.53, 3.75], 10);

    map.on("click focus", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
      detectRetina: true,
    }).addTo(map);

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 56,
      chunkedLoading: true,
      iconCreateFunction: (c) => {
        const n = c.getChildCount();
        const size = clusterSize(n);
        return L.divIcon({
          html: `<span>${n}</span>`,
          className: "map-cluster",
          iconSize: L.point(size, size),
        });
      },
    });
    map.addLayer(cluster);

    const push = () => {
      if (isSized()) cb.current.onBoundsChange(bounds(map));
    };
    map.on("moveend zoomend", push);

    mapRef.current = map;
    clusterRef.current = cluster;

    /* Le conteneur est masqué tant qu'on est en vue Liste sur mobile :
       Leaflet mesurerait 0×0. On resynchronise — et on cadre enfin —
       dès qu'il prend sa taille réelle. */
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      if (!fittedRef.current) fittedRef.current = fitAll();
    });
    ro.observe(host);

    const markers = markersRef.current;
    return () => {
      ro.disconnect();
      map.off("moveend zoomend", push);
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
      markers.clear();
    };
    // fitAll est stable (useCallback sans dépendance) : la carte n'est
    // donc créée qu'une fois.
  }, [fitAll]);

  /* ── (Re)pose des marqueurs à chaque changement de filtres ── */
  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!map || !cluster) return;

    cluster.clearLayers();
    markersRef.current.clear();

    const markers = annonces.map((a) => {
      const label = annonceTitle(a, a.modelId ? modelById(a.modelId)?.name : null);
      const marker = L.marker([a.lat, a.lng], {
        icon: L.divIcon({
          html: `<span>${a.type === "terrain" ? "T" : "M"}</span>`,
          className: "map-pin",
          iconSize: L.point(30, 30),
        }),
        title: label,
        alt: label,
        keyboard: true,
      });
      marker.bindTooltip(`${label} — ${fmtPrice(a.price)}`, {
        direction: "top",
        offset: L.point(0, -14),
        className: "map-tip",
      });
      marker.on("click", () => cb.current.onSelect(a));
      marker.on("mouseover", () => cb.current.onHighlight(a.id));
      marker.on("mouseout", () => cb.current.onHighlight(null));
      markersRef.current.set(a.id, marker);
      return marker;
    });

    cluster.addLayers(markers);

    /* Cadrage initial seulement : recadrer à chaque filtre déclencherait
       une boucle (bornes → filtre → recadrage → bornes…). */
    if (!fittedRef.current) {
      fittedRef.current = fitAll();
    } else if (isSized()) {
      cb.current.onBoundsChange(bounds(map));
    }
  }, [annonces, fitAll]);

  /* ── « Réinitialiser » : retour au cadrage global ── */
  useEffect(() => {
    if (fitToken > 0) fitAll();
  }, [fitToken, fitAll]);

  /* ── Survol d'une carte de résultat → point mis en avant ── */
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (el) el.classList.toggle("is-hl", id === highlight);
    });
    // Si le point est agrégé, c'est la bulle parente qu'on éclaire.
    if (highlight) {
      const marker = markersRef.current.get(highlight);
      const parent = marker && cluster.getVisibleParent(marker);
      if (parent && parent !== marker) parent.getElement()?.classList.add("is-hl");
    } else {
      cluster
        .getLayers()
        .forEach((l) => (l as L.Marker).getElement()?.classList.remove("is-hl"));
      document
        .querySelectorAll(".map-cluster.is-hl")
        .forEach((el) => el.classList.remove("is-hl"));
    }
  }, [highlight]);

  return (
    <div className="l-map__frame">
      <div className="l-map__canvas" ref={hostRef} aria-label="Carte des opportunités" />
      <div className="l-map__controls">
        <button onClick={() => mapRef.current?.zoomIn()} aria-label="Zoomer">
          +
        </button>
        <button onClick={() => mapRef.current?.zoomOut()} aria-label="Dézoomer">
          −
        </button>
      </div>
    </div>
  );
}
