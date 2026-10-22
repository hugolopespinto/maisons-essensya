import "server-only";
import { annonceTitle, annonceUrl } from "@/lib/format";
import { urlVersion, versionAChambres } from "@/lib/offres";
import { getAnnonces } from "@/lib/vitahome/annonces";
import type { Annonce, AnnonceVignette, PointCarte } from "@/types";
import {
  PAR_PAGE,
  dansZone,
  lireCriteres,
  type Params,
  type ResultatRecherche,
  type Tri,
} from "./criteres";

/* ════════════════════════════════════════════════════════════════
   LA RECHERCHE DU LISTING — côté serveur

   Le flux Vitahome ne pagine pas et ne filtre pas : `annonces.json`
   rend le pack entier, et la documentation de l'API (pro.vitahome.fr/
   doc/api) ne décrit aucun paramètre pour ce point d'accès. Il est donc
   lu en entier, une fois par cycle de cache (`FEED_REVALIDATE`), et
   c'est ICI qu'on filtre, trie et découpe — sur le serveur, au-dessus
   de ce cache, pas dans le navigateur.

   Avant, la page envoyait le catalogue entier au navigateur, chaque
   annonce complète, et le refaisait à chaque changement de filtre. Le
   navigateur ne reçoit plus que :
     · la page demandée, en vignettes (`PAR_PAGE` cartes) ;
     · les points de la carte — légers, mais TOUS : c'est la carte qui
       montre où chercher ailleurs.
   ════════════════════════════════════════════════════════════════ */

/** Insensible aux accents, à la casse et aux traits d'union :
 *  « saint jean » trouve « Saint-Jean-de-Luz ». */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s'’-]+/g, " ")
    .trim();

/** Les prix inconnus partent en fin de liste, quel que soit le sens du tri. */
const parPrix = (sens: 1 | -1) => (x: Annonce, y: Annonce) => {
  if (x.price === null) return y.price === null ? 0 : 1;
  if (y.price === null) return -1;
  return (x.price - y.price) * sens;
};

/** Les plus récentes d'abord, annonces sans date en dernier. Le tri est
 *  stable : à date égale, l'ordre du catalogue — T+M avant terrain nu,
 *  voir `mapAnnonces` — tient. */
const parDate = (x: Annonce, y: Annonce) => {
  if (!x.updatedAt) return y.updatedAt ? 1 : 0;
  if (!y.updatedAt) return -1;
  return y.updatedAt.localeCompare(x.updatedAt);
};

const TRIER: Record<Tri, (x: Annonce, y: Annonce) => number> = {
  recent: parDate,
  "prix-asc": parPrix(1),
  "prix-desc": parPrix(-1),
};

/** Ce qu'une carte de résultat affiche — voir `AnnonceVignette`. */
export const vignette = (a: Annonce): AnnonceVignette => ({
  id: a.id,
  type: a.type,
  title: a.title,
  city: a.city,
  zip: a.zip,
  deptCode: a.deptCode,
  price: a.price,
  landSurface: a.landSurface,
  houseSurface: a.houseSurface,
  bedrooms: a.bedrooms,
  highlighted: a.highlighted,
  image: a.image,
  landConfiguration: a.landConfiguration,
  landType: a.landType,
});

/* Le département est la vraie maille du flux (17, 79, 85, 28, 49…) : la
   liste des communes se compte en centaines, elle ne fait pas un menu
   déroulant utilisable. Calculée sur le catalogue ENTIER : un filtre ne
   doit pas faire disparaître les autres départements du menu. */
function departementsDe(catalogue: Annonce[]): [string, string][] {
  const m = new Map<string, string>();
  for (const a of catalogue) if (a.deptCode) m.set(a.deptCode, a.dept || a.deptCode);
  return [...m.entries()].sort((x, y) => x[0].localeCompare(y[0], "fr"));
}

/** Empreinte des points (FNV-1a) : la carte ne repose ses marqueurs que
 *  si elle change — pas à chaque page, ni à chaque déplacement. */
function empreinte(points: PointCarte[]): string {
  const s = JSON.stringify(points);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${points.length}-${(h >>> 0).toString(36)}`;
}

/**
 * La recherche elle-même, sur un catalogue donné. Pure : elle ne lit ni
 * le flux ni l'URL, ce qui la rend vérifiable sur un jeu fabriqué.
 */
export function chercher(catalogue: Annonce[], params: Params): ResultatRecherche {
  const departements = departementsDe(catalogue);
  const demande = lireCriteres(
    params,
    departements.map(([code]) => code),
  );
  const { type, dept, chambres, tri, zone } = demande;
  const q = norm(demande.q);

  /* 1. Les critères qui ne dépendent pas de la carte. Sous un filtre
        chambres, chaque parcelle est vue dans SA version à N chambres
        (src/lib/offres.ts) : la carte montre cette maison, et sa fiche
        doit montrer la même, d'où le `href` calculé ici. */
  const retenues: { a: Annonce; href: string }[] = [];
  for (const brute of catalogue) {
    if (type && brute.type !== type) continue;
    if (dept && brute.deptCode !== dept) continue;
    if (q && !norm(`${brute.city} ${brute.zip} ${brute.dept} ${brute.deptCode}`).includes(q)) continue;
    const a = chambres === null ? brute : versionAChambres(brute, chambres);
    if (!a) continue;
    retenues.push({ a, href: chambres === null ? annonceUrl(brute) : urlVersion(brute, chambres) });
  }

  /* 2. La carte : tout ce qui est retenu, zone ignorée. Une annonce sans
        coordonnées n'est pas plaçable — elle reste dans la liste, elle
        représente une vraie opportunité. */
  const points: PointCarte[] = [];
  let sansCoordonnees = 0;
  for (const { a, href } of retenues) {
    if (a.lat === null || a.lng === null) {
      sansCoordonnees++;
      continue;
    }
    points.push({
      id: a.id,
      lat: a.lat,
      lng: a.lng,
      type: a.type,
      prix: a.price,
      titre: annonceTitle(a),
      href,
    });
  }

  /* 3. La liste : la zone de carte s'applique, puis le tri, puis la page. */
  const liste = zone
    ? retenues.filter(({ a }) => a.lat === null || a.lng === null || dansZone(zone, a.lat, a.lng))
    : retenues;
  const trier = TRIER[tri];
  liste.sort((x, y) => trier(x.a, y.a));

  const total = liste.length;
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
  /* Une page au-delà de la dernière — lien ancien, catalogue qui a
     maigri — montre la dernière plutôt qu'une liste vide ; sa canonique
     suit (`urlCanonique`). */
  const page = Math.min(demande.page, pages);
  const debut = (page - 1) * PAR_PAGE;

  return {
    criteres: { ...demande, page },
    annonces: liste
      .slice(debut, debut + PAR_PAGE)
      .map(({ a, href }) => ({ annonce: vignette(a), href })),
    total,
    pages,
    debut,
    points,
    pointsCle: empreinte(points),
    sansCoordonnees,
    departements,
    /* Jugé sur le catalogue ENTIER, pas sur la liste filtrée : « 2
       chambres » croisé avec « Terrain seul » ne rend rien, mais des
       maisons 2 chambres existent — leur nier l'existence serait faux. */
    chambresAbsentes:
      chambres !== null && !catalogue.some((a) => versionAChambres(a, chambres) !== null),
  };
}

/** La recherche du listing public : le flux enrichi, tel que le voit le visiteur. */
export async function rechercherAnnonces(params: Params): Promise<ResultatRecherche> {
  return chercher(await getAnnonces(), params);
}
