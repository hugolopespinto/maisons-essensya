"use client";
import L from "leaflet";
import "leaflet.markercluster";
import { useCallback, useEffect, useRef } from "react";
import type { Zone } from "@/lib/annonces/criteres";
import { FOND_DE_CARTE } from "@/lib/fond-de-carte";
import { fmtPrice } from "@/lib/format";
import type { PointCarte } from "@/types";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

/* ════ CARTE DES OPPORTUNITÉS ════
   Leaflet + markercluster. Les annonces proches sont agrégées en une
   bulle chiffrée ; zoomer (ou cliquer la bulle) la scinde jusqu'aux
   points individuels. Chaque déplacement remonte la zone visible au
   parent, qui la confie au serveur : c'est lui qui filtre la liste.

   ⚠ UN CADRAGE N'EST PAS UNE RECHERCHE. Quand la carte se cadre d'elle-
   même — au chargement, sur de nouveaux résultats, à « Réinitialiser » —
   ses `moveend` remontent marqués `auto`, et le parent les ignore. Seul
   un geste du visiteur exprime une zone de recherche ; sans cette
   distinction, chaque cadrage relancerait une recherche, dont la
   réponse recadrerait la carte, et ainsi de suite.

   Fond de carte : src/lib/fond-de-carte.ts, commun à toutes les
   cartes du site.                                                  */

interface Props {
  /** Tous les points retenus — pas seulement ceux de la page affichée. */
  points: PointCarte[];
  highlight: string | null;
  onHighlight: (id: string | null) => void;
  /** `auto` : le mouvement vient d'un cadrage de la carte, pas du visiteur. */
  onBoundsChange: (zone: Zone, auto: boolean) => void;
  onSelect: (p: PointCarte) => void;
  /** Change de valeur → la carte se recadre. */
  fitToken: number;
  /** La zone de recherche en cours. Quand il y en a une, c'est elle que la
   *  carte cadre, et de nouveaux résultats ne la font pas bouger. */
  cadre: Zone | null;
}

/* Taille de la bulle indexée sur le nombre d'annonces regroupées. */
const clusterSize = (n: number) =>
  n < 10 ? 36 : n < 50 ? 44 : n < 200 ? 52 : 60;

const zoneDe = (m: L.Map): Zone => {
  const b = m.getBounds();
  return { nord: b.getNorth(), sud: b.getSouth(), est: b.getEast(), ouest: b.getWest() };
};

/* Un cadrage se termine par un `moveend`, parfois deux — une animation
   interrompue par la suivante en émet un pour elle-même. Tout ce qui
   arrive dans ce délai appartient au cadrage. */
const DUREE_CADRAGE = 700;

export default function AnnoncesMap({
  points,
  highlight,
  onHighlight,
  onBoundsChange,
  onSelect,
  fitToken,
  cadre,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const fittedRef = useRef(false);
  /** Jusqu'à quand les déplacements sont ceux d'un cadrage. */
  const autoJusqua = useRef(0);

  /* Les callbacks changent à chaque rendu du parent : on les garde dans
     des refs pour ne pas re-souscrire les événements Leaflet. */
  const cb = useRef({ onHighlight, onBoundsChange, onSelect });
  const pointsRef = useRef(points);
  const cadreRef = useRef(cadre);

  /* Déclaré avant les autres effets : les refs sont donc à jour quand
     ceux-ci s'exécutent (React lance les effets dans l'ordre). */
  useEffect(() => {
    cb.current = { onHighlight, onBoundsChange, onSelect };
    pointsRef.current = points;
    cadreRef.current = cadre;
  });

  /* Sur mobile la carte n'est affichée qu'en vue Carte : tant qu'elle est
     masquée, Leaflet mesure 0×0 et ses bornes ne veulent rien dire. */
  const isSized = () => !!hostRef.current?.clientWidth;

  /* Cadre la vue sur la zone de recherche s'il y en a une, sinon sur
     l'ensemble des points. Renvoie false si le cadrage n'a pas pu se
     faire (carte masquée, ou rien à cadrer). */
  const fitAll = useCallback(() => {
    const map = mapRef.current;
    if (!map || !isSized()) return false;
    const zone = cadreRef.current;
    const list = pointsRef.current;
    if (!zone && !list.length) return false;
    autoJusqua.current = performance.now() + DUREE_CADRAGE;
    if (zone) {
      map.fitBounds([
        [zone.sud, zone.ouest],
        [zone.nord, zone.est],
      ]);
    } else {
      map.fitBounds(
        L.latLngBounds(list.map((p) => [p.lat, p.lng] as [number, number])),
        { padding: [42, 42], maxZoom: 12 },
      );
    }
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

    L.tileLayer(FOND_DE_CARTE.url, FOND_DE_CARTE.options).addTo(map);

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 56,
      chunkedLoading: true,
      iconCreateFunction: (c) => {
        const n = c.getChildCount();
        const size = clusterSize(n);
        /* Leaflet en fait un bouton : sans le texte masqué, son nom était
           le seul chiffre — « 4 », « 5 » — lu sans dire ce qu'il compte
           ni ce que fait le clic. `n` est un nombre : rien à échapper. */
        return L.divIcon({
          html: `<span aria-hidden="true">${n}</span><span class="u-sr-only">${n} annonces dans ce secteur, zoomer</span>`,
          className: "map-cluster",
          iconSize: L.point(size, size),
        });
      },
    });
    map.addLayer(cluster);

    /* `moveend` seul : un zoom émet `zoomend` PUIS `moveend`, et les
       écouter tous les deux remontait chaque zoom deux fois. */
    const push = () => {
      if (isSized()) cb.current.onBoundsChange(zoneDe(map), performance.now() < autoJusqua.current);
    };
    map.on("moveend", push);

    mapRef.current = map;
    clusterRef.current = cluster;

    /* Le conteneur est masqué tant qu'on est en vue Liste sur mobile :
       Leaflet mesurerait 0×0. On resynchronise — et on cadre enfin —
       dès qu'il prend sa taille réelle. Ce redimensionnement-là, qui
       précède le premier cadrage, est à la carte : il est marqué `auto`
       comme le cadrage lui-même. */
    const ro = new ResizeObserver(() => {
      const cadrer = !fittedRef.current;
      if (cadrer) autoJusqua.current = performance.now() + DUREE_CADRAGE;
      map.invalidateSize();
      if (cadrer) fittedRef.current = fitAll();
    });
    ro.observe(host);

    const markers = markersRef.current;
    const cadree = fittedRef;
    return () => {
      ro.disconnect();
      map.off("moveend", push);
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
      markers.clear();
      /* ⚠ LA CARTE DÉTRUITE EMPORTE SON CADRAGE. Sans cette ligne, en
         développement, React monte la carte deux fois (StrictMode) : la
         première se cadre et lève le drapeau, la seconde naît sur la vue
         par défaut et ne se cadre jamais — et la liste, qui suit la zone
         visible, affichait « 0 opportunité » sur toute la page. */
      cadree.current = false;
    };
    // fitAll est stable (useCallback sans dépendance) : la carte n'est
    // donc créée qu'une fois.
  }, [fitAll]);

  /* ── (Re)pose des marqueurs quand les points changent ──
     Le parent ne transmet un nouveau tableau que si les points ont
     changé (`pointsCle`) : tourner les pages ou déplacer la carte ne
     repose rien. */
  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!map || !cluster) return;

    cluster.clearLayers();
    markersRef.current.clear();

    const markers = points.map((p) => {
      const marker = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          html: `<span aria-hidden="true">${p.type === "terrain" ? "T" : "M"}</span>`,
          className: "map-pin",
          iconSize: L.point(30, 30),
        }),
        title: p.titre,
        alt: p.titre,
        keyboard: true,
      });
      /* `alt` ne nomme rien sur une divIcon : le point se lisait « M » ou
         « T ». Le nom est posé à chaque ajout — le regroupement retire et
         remet l'élément — et par `setAttribute`, car le titre vient du
         flux et ne doit jamais passer par du HTML. */
      marker.on("add", () =>
        marker.getElement()?.setAttribute("aria-label", `${p.titre} — ${fmtPrice(p.prix)}`),
      );
      /* Un nœud texte, pas une chaîne : Leaflet poserait une chaîne en
         innerHTML, et le nom de commune vient du flux. */
      const bulle = document.createElement("span");
      bulle.textContent = `${p.titre} — ${fmtPrice(p.prix)}`;
      marker.bindTooltip(bulle, {
        direction: "top",
        offset: L.point(0, -14),
        className: "map-tip",
      });
      marker.on("click", () => cb.current.onSelect(p));
      marker.on("mouseover", () => cb.current.onHighlight(p.id));
      marker.on("mouseout", () => cb.current.onHighlight(null));
      markersRef.current.set(p.id, marker);
      return marker;
    });

    cluster.addLayers(markers);

    /* Sans zone de recherche, la carte suit les résultats : un filtre
       qui change le catalogue la recadre dessus. Avec une zone, elle
       reste où le visiteur l'a mise — c'est sa recherche. */
    if (!fittedRef.current || !cadreRef.current) fittedRef.current = fitAll();
  }, [points, fitAll]);

  /* ── « Réinitialiser », ou une navigation : retour au cadrage ── */
  useEffect(() => {
    if (fitToken === 0) return;
    /* Carte masquée (vue Liste sur mobile) : le cadrage échoue. On ne
       perd pas la demande pour autant — le ResizeObserver la rejoue dès
       que la carte reprend sa taille. Seulement quand elle est masquée :
       une liste vide après un choix manuel ne doit rien recadrer. */
    if (!fitAll() && !isSized()) fittedRef.current = false;
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
    <div className="c-map__frame">
      <div className="c-map__canvas" ref={hostRef} aria-label="Carte des opportunités" />
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
