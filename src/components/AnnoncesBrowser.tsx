"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnnonceCard from "@/components/AnnonceCard";
import type { Bounds } from "@/components/AnnoncesMap";
import { annonceUrl } from "@/lib/format";
import { urlVersion, versionAChambres } from "@/lib/offres";
import type { Annonce } from "@/types";

/* Leaflet touche à `window` dès son import : la carte ne peut pas être
   rendue côté serveur. Le reste de la page, lui, reste pré-rendu. */
const AnnoncesMap = dynamic(() => import("@/components/AnnoncesMap"), {
  ssr: false,
  loading: () => <div className="c-map__frame l-map__frame--loading" />,
});

interface Filters {
  /** Commune ou code postal, saisie libre. */
  q: string;
  type: string;
  dept: string;
  bedrooms: string;
  sort: string;
}

/* Pas de budget maximum : le filtre a été retiré à la demande du client.
   Une ancienne URL en `?max=` reste valide, le paramètre est ignoré. */
const INITIAL: Filters = {
  q: "",
  type: "all",
  dept: "all",
  bedrooms: "all",
  sort: "recent",
};

const TYPES = ["terrain", "terrain-maison"];

/* ⚠ LE NOMBRE EXACT DE CHAMBRES, PLUS UN PLANCHER. Ce filtre est la
   destination des liens « Plans maison N chambres » de la navigation
   (`?chambres=N`) : « 2 chambres » doit montrer des maisons à deux
   chambres, pas aussi celles à trois, comme le faisait « 2 et plus ».
   De 1 à 4, comme le menu. Le flux ne compte aujourd'hui que des 2 et
   des 3 chambres : 1 et 4 rendent une liste vide, que la page explique
   au lieu de laisser croire à une zone trop étroite. */
const CHAMBRES = ["1", "2", "3", "4"];

const libelleChambres = (n: string) => `${n} chambre${n === "1" ? "" : "s"}`;

type Initial = Partial<Record<"q" | "type" | "dept" | "bedrooms", string>>;

/** La query qui décrit ces filtres — celle que l'URL porte. Le tri n'y
 *  figure pas : il ne se partage pas. */
function requeteDe(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.type !== "all") p.set("type", f.type);
  if (f.dept !== "all") p.set("dept", f.dept);
  if (f.bedrooms !== "all") p.set("chambres", f.bedrooms);
  return p.toString();
}

/** Les filtres que l'URL demande, re-validés : une URL forgée à la main
 *  ne doit pas produire un filtre inconnu. */
function lireInitial(initial: Initial | undefined, depts: [string, string][]): Filters {
  return {
    ...INITIAL,
    q: initial?.q ?? "",
    type: TYPES.includes(initial?.type ?? "") ? initial!.type! : "all",
    dept: depts.some(([code]) => code === initial?.dept) ? initial!.dept! : "all",
    bedrooms: CHAMBRES.includes(initial?.bedrooms ?? "") ? initial!.bedrooms! : "all",
  };
}

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
  initial?: Initial;
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
  const [filters, setFilters] = useState<Filters>(() => lireInitial(initial, depts));

  const [view, setView] = useState<Bounds | null>(null);
  /* Incrémenté par « Réinitialiser » : la carte se recadre sur tout. */
  const [fitToken, setFitToken] = useState(0);

  /* ⚠ UN LIEN VERS /annonces?… DEPUIS /annonces NE REMONTE PAS CE
     COMPOSANT. Next garde l'état d'une page quand seule la query change :
     « Plans maison 3 chambres », cliqué dans le menu alors qu'on est déjà
     sur le listing, changeait l'URL et laissait la liste telle quelle.
     Le serveur, lui, renvoie bien le nouveau `initial` : on le reprend.

     COMMENT ON RECONNAÎT UNE NAVIGATION. `initial` est un objet sérialisé
     par le serveur : chaque rendu serveur en livre un NOUVEAU, alors
     qu'un re-rendu local garde le même. Mais chaque filtre choisi ici
     repasse aussi par le serveur (`router.replace` plus bas) et revient
     en `initial` : c'est un écho, et il porte exactement les filtres
     courants. D'où la règle : nouvel objet ET autre chose que les
     filtres courants = une navigation, appliquée en entier — recherche
     libre comprise, sans quoi un lien vers /annonces laisserait la liste
     filtrée sur la commune tapée avant.
     Un écho en retard ne peut pas défaire un choix plus récent : Next
     abandonne un `replace` dès qu'un autre part, seul le dernier est
     rendu. Et l'écho d'une frappe ne mange pas l'espace en cours de
     saisie : la comparaison se fait sur la query, qui l'ignore aussi.
     Pas de `key` sur le composant à la place : chaque `router.replace`
     le remonterait, carte comprise, et le champ de recherche perdrait le
     focus à chaque lettre. */
  const [initialVu, setInitialVu] = useState(initial);
  if (initial !== initialVu) {
    setInitialVu(initial);
    const lu = lireInitial(initial, depts);
    if (requeteDe(lu) !== requeteDe(filters)) {
      setFilters((f) => ({ ...lu, sort: f.sort }));
      /* La carte se recadre sur les nouveaux résultats. Et tant qu'elle
         ne l'a pas fait — masquée en vue Liste sur mobile, elle ne le
         fera qu'une fois rouverte —, la liste n'est plus filtrée par la
         zone de l'ANCIENNE recherche : elle paraîtrait vide. */
      setView(null);
      setFitToken((n) => n + 1);
    }
  }
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
    const qs = requeteDe(filters);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

  /* `liens` : où mène chaque carte. Sous un filtre chambres, la carte
     montre la version à N chambres (voir src/lib/offres.ts) ; sa fiche
     doit montrer LA MÊME, sinon le visiteur voit la maison changer au
     clic et sa demande part au commercial avec la mauvaise référence. */
  const { items, liens } = useMemo(() => {
    const f = filters;
    const q = norm(f.q);
    const chambres = f.bedrooms !== "all" ? +f.bedrooms : null;
    const liens = new Map<string, string>();
    let list = annonces.flatMap((a): Annonce[] => {
      if (f.type !== "all" && a.type !== f.type) return [];
      if (f.dept !== "all" && a.deptCode !== f.dept) return [];
      if (q && !norm(`${a.city} ${a.zip} ${a.dept} ${a.deptCode}`).includes(q)) return [];
      const v = chambres === null ? a : versionAChambres(a, chambres);
      if (!v) return [];
      liens.set(a.id, chambres === null ? annonceUrl(a) : urlVersion(a, chambres));
      return [v];
    });
    list = [...list];
    if (f.sort === "price-asc") list.sort(byPrice(1));
    else if (f.sort === "price-desc") list.sort(byPrice(-1));
    else list.sort(byRecent);
    return { items: list, liens };
  }, [annonces, filters]);

  /* Jugé sur le flux ENTIER, pas sur la liste filtrée : « 2 chambres »
     croisé avec « Terrain seul » ne rend rien, mais des maisons 2
     chambres existent — leur nier l'existence serait faux. */
  const chambresAbsentes = useMemo(
    () =>
      filters.bedrooms !== "all" &&
      !annonces.some((a) => versionAChambres(a, +filters.bedrooms) !== null),
    [annonces, filters.bedrooms],
  );

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
  const onSelect = useCallback(
    (a: Annonce) => router.push(liens.get(a.id) ?? annonceUrl(a)),
    [router, liens],
  );

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
              {CHAMBRES.map((n) => (
                <option key={n} value={n}>
                  {libelleChambres(n)}
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
                  href={liens.get(a.id)}
                  reveal={false}
                  highlighted={highlight === a.id}
                  onMouseEnter={() => setHighlight(a.id)}
                  onMouseLeave={() => setHighlight(null)}
                />
              ))
            ) : chambresAbsentes ? (
              /* Rien à élargir : aucune annonce du flux n'a ce nombre de
                 chambres, où que soit la carte. Le dire, plutôt que de
                 renvoyer le visiteur déplacer une carte qui ne trouvera
                 rien — il arrive souvent ici depuis le menu. */
              <div className="l-results__empty">
                Aucune maison {libelleChambres(filters.bedrooms)} parmi nos annonces en ce
                moment.
                <br />
                Choisissez un autre nombre de chambres, ou{" "}
                <Link href="/contact">parlez-nous de votre projet</Link>.
              </div>
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
