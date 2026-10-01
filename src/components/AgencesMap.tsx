"use client";
import L from "leaflet";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { FOND_DE_CARTE } from "@/lib/fond-de-carte";
import "leaflet/dist/leaflet.css";

/* ════ CARTE DES AGENCES ════
   La petite sœur de la carte des annonces : même fond, mêmes points,
   mêmes infobulles — mais une poignée d'adresses au lieu de centaines.
   Pas de regroupement en bulles, donc pas de markercluster : cinq points
   sur deux départements ne se chevauchent pas, et le greffon pèserait
   plus lourd que la carte.

   Un clic sur un point ouvre la fiche de l'agence. Au clavier, chaque
   point est focalisable et Entrée l'ouvre de la même façon.            */

export interface PointAgence {
  id: string;
  nom: string;
  adresse: string;
  href: string;
  lat: number;
  lng: number;
}

/* La maison du pictogramme, à la place du « M » / « T » des annonces. */
const MAISON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-6.5 8 6.5v9H4z"/><path d="M10 20v-5.5h4V20"/></svg>';

const echapper = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export default function AgencesMap({ agences }: { agences: PointAgence[] }) {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const fittedRef = useRef(false);

  /* Le routeur et la liste changent d'identité à chaque rendu : on les
     lit dans une ref pour ne pas recréer la carte. */
  const ctx = useRef({ router, agences });
  useEffect(() => {
    ctx.current = { router, agences };
  });

  /* Une carte masquée mesure 0 × 0 : ses bornes ne veulent rien dire. */
  const isSized = () => !!hostRef.current?.clientWidth;

  const fitAll = useCallback(() => {
    const map = mapRef.current;
    const list = ctx.current.agences;
    if (!map || !list.length || !isSized()) return false;
    map.fitBounds(
      L.latLngBounds(list.map((a) => [a.lat, a.lng] as [number, number])),
      /* maxZoom : une seule agence ne doit pas cadrer sur sa rue. */
      { padding: [36, 36], maxZoom: 11 },
    );
    return true;
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || mapRef.current) return;

    /* Au doigt, un glisser sur la carte capturerait le défilement de la
       page — la carte est au milieu du flux, pas en plein écran comme sur
       /annonces. On le réserve donc à la souris ; le pincement et les
       boutons restent pour zoomer. */
    const tactile = window.matchMedia("(hover: none)").matches;

    const map = L.map(host, {
      zoomControl: false,
      attributionControl: true,
      // Même règle que sur /annonces : la molette ne zoome qu'après un
      // clic, sinon elle capturerait le défilement de la page.
      scrollWheelZoom: false,
      dragging: !tactile,
    }).setView([44.2, -0.9], 8);

    map.on("click focus", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());

    L.tileLayer(FOND_DE_CARTE.url, FOND_DE_CARTE.options).addTo(map);

    for (const a of ctx.current.agences) {
      const marker = L.marker([a.lat, a.lng], {
        icon: L.divIcon({
          html: `<span>${MAISON}</span>`,
          className: "map-pin",
          iconSize: L.point(34, 34),
        }),
        title: a.nom,
        alt: a.nom,
        keyboard: true,
      });
      marker.bindTooltip(
        `<strong>${echapper(a.nom)}</strong><br>${echapper(a.adresse)}`,
        { direction: "top", offset: L.point(0, -16), className: "map-tip" },
      );
      marker.on("click", () => ctx.current.router.push(a.href));
      marker.addTo(map);
    }

    mapRef.current = map;

    /* Resynchronise la taille dès que le cadre bouge (rotation d'écran,
       passage d'une colonne à deux), et cadre la première fois que la
       carte a une taille réelle. */
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      if (!fittedRef.current) fittedRef.current = fitAll();
    });
    ro.observe(host);
    fittedRef.current = fitAll();

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      fittedRef.current = false;
    };
  }, [fitAll]);

  return (
    <div className="c-map__frame">
      <div className="c-map__canvas" ref={hostRef} aria-label="Carte des agences" />
      <div className="c-map__controls">
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
