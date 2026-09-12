import "server-only";
import { LOCAL_ANNONCES_RAW } from "@/data/annonces-demo";
import { getContent } from "@/lib/store";
import type { AnnonceOverride } from "@/lib/store/types";
import type { Annonce } from "@/types";
import {
  FEED_REVALIDATE,
  SANITY,
  VERSION_SLUG_MAP,
  VITAHOME,
  hasLiveFeed,
} from "./config";
import type { VitahomeAnnonce, VitahomeMedia } from "./types";

/* ════════════════════════════════════════════════════════════════
   ADAPTATEUR : format Vitahome → contrat interne
   Pièges confirmés sur le flux réel (253 annonces, relevé 11/09/2026) :
     · house === false pour un terrain seul
     · price peut valoir `false` (booléen) ou 0
     · latitude / longitude sont des Strings
     · postCode est une String, pas un Number
     · dateAd est un objet ; seul land.updatedAt est exploitable
     · mention traîne une queue de debug « 1- IS => … »
     · signature dégrade en « Contactez X au  ou au … » si pas de tél.
     · 90 terrains sur 100 n'ont AUCUN média → image: null assumé
   ════════════════════════════════════════════════════════════════ */

/** Nettoie une chaîne du flux : trim, vide → null. */
const nz = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
};

/** Un nombre exploitable, ou null. Absorbe `false`, 0, NaN et les strings. */
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/** Un prix plausible, ou null. `false <= 150000` est `true` en JS : d'où ce garde-fou. */
const price = (v: unknown): number | null => {
  const n = num(v);
  return n !== null && n >= SANITY.minPrice && n <= SANITY.maxPrice ? n : null;
};

/** « LA ROCHELLE » → « La Rochelle ». Respecte les traits d'union et les élisions. */
const titleCase = (s: string) =>
  s
    .toLocaleLowerCase("fr-FR")
    .replace(/(^|[\s'’-])([a-zà-ÿ])/g, (_, sep, c) => sep + c.toLocaleUpperCase("fr-FR"));

const cityName = (raw: { cityName?: string; city?: string }): string => {
  const v = nz(raw.cityName) ?? nz(raw.city) ?? "";
  return v === v.toUpperCase() ? titleCase(v) : v;
};

/**
 * Coupe la queue de debug des mentions légales.
 * Le flux sert « <texte légal>\n\n1-  IS => terrain non viabilisé / 2- … ».
 */
const cleanMention = (v: unknown): string | null => {
  const s = nz(v);
  if (!s) return null;
  /* On coupe au premier paragraphe, puis on retire toute ligne du motif
     de debug. `[\s\S]` plutôt que le flag `s`, indisponible sur la cible
     ES du projet. */
  const cut = s
    .split(/\n\s*\n/)[0]
    .replace(/\s*\d+\s*-\s+[A-Z]+\s*=>[\s\S]*$/g, "")
    .trim();
  return cut.length > 20 ? cut : null;
};

/** `dd/MM/yyyy HH:mm:ss` → ISO. Le seul champ de date fiable du flux. */
const parseFrDate = (v: unknown): string | null => {
  const s = nz(v);
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
  if (!m) return null;
  const [, d, mo, y, h = "00", mi = "00", se = "00"] = m;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${se}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const mediaPaths = (list: VitahomeMedia[] | undefined): string[] =>
  (list ?? []).map((m) => nz(m?.path)).filter((p): p is string => !!p);

const imgPath = (v: { path?: string } | false | null | undefined): string | null =>
  v && typeof v === "object" ? nz(v.path) : null;

/* ════ FILTRE DE SANITÉ ════
   Renvoie la raison du rejet, ou null si l'annonce est publiable. */
function rejectReason(raw: VitahomeAnnonce): string | null {
  if (!nz(raw.reference)) return "référence absente";
  if (SANITY.rejectManualAds && raw.type === "M") return "annonce saisie à la main";

  const p = price(raw.price);
  if (p === null) return `prix non exploitable (${JSON.stringify(raw.price)})`;

  const land = raw.land;
  if (!land) return "terrain absent";

  const ls = num(land.surface);
  if (ls === null || ls < SANITY.minLandSurface || ls > SANITY.maxLandSurface)
    return `surface de terrain aberrante (${land.surface})`;

  const house = raw.house || null;
  if (house) {
    const hs = num(house.area);
    if (hs === null || hs < SANITY.minHouseSurface || hs > SANITY.maxHouseSurface)
      return `surface de maison aberrante (${house.area})`;
    const bd = num(house.bedroomNumber);
    if (bd !== null && bd > SANITY.maxBedrooms) return `nombre de chambres aberrant (${bd})`;
  }
  return null;
}

/** `null` quand l'annonce ne doit pas être publiée. */
export function mapAnnonce(raw: VitahomeAnnonce): Annonce | null {
  if (rejectReason(raw)) return null;

  const land = raw.land;
  const house = raw.house || null; // `false` = terrain seul (spec Vitahome)

  const lat = num(land.latitude);
  const lng = num(land.longitude);

  const gallery = [
    ...mediaPaths(raw.media),
    ...mediaPaths(house?.media),
    ...mediaPaths(land.media),
  ];
  const adImg = imgPath(house?.adImage);
  const plan = imgPath(house?.groundFloorImage);

  /* Cascade de repli : média d'annonce → visuel maison → plan du RDC.
     Pas de photo de stock : `null` déclenche le substitut graphique. */
  const image = gallery[0] ?? adImg ?? plan ?? null;

  const commercial = nz(land.commercialName);
  const phone = nz(land.commercialPhone) ?? nz(land.agencyPhone);

  /* Cette annonce brute est UNE offre sur la parcelle. groupByParcel()
     rassemblera ensuite toutes celles qui portent le même `land.id`. */
  const offre = {
    ref: raw.reference,
    versionSlug: house ? VERSION_SLUG_MAP[house.modelSlug] ?? null : null,
    houseSurface: num(house?.area),
    bedrooms: num(house?.bedroomNumber),
    rooms: num(house?.roomNumber),
    garageArea: num(house?.garageArea),
    planImage: plan,
    price: price(raw.price),
  };

  return {
    offres: [offre],
    id: raw.reference,
    ref: raw.reference,
    type: house ? "terrain-maison" : "terrain",
    title: nz(raw.title),
    description: nz(raw.description) ?? nz(house?.description) ?? "",
    price: price(raw.price),
    landPrice: price(land.price),
    landSurface: num(land.surface),
    servicing: nz(land.isServicing),
    servicingLong: nz(land.isServicingLong),
    landConfiguration: nz(land.landConfiguration),
    landType: nz(land.landType),
    landState: nz(land.landState),
    lotNumber: nz(land.lotNumber),
    subdivision: nz(land.homeSubdivision?.name),
    city: cityName(land),
    cityId: num(land.cityId),
    insee: nz(land.inseeCode),
    zip: String(land.postCode ?? "").trim(),
    dept: nz(land.departmentName) ? titleCase(land.departmentName!) : "",
    deptCode: nz(land.inseeDepartmentCode) ?? "",
    lat,
    lng,
    houseSurface: num(house?.area),
    bedrooms: num(house?.bedroomNumber),
    rooms: num(house?.roomNumber),
    garageArea: num(house?.garageArea),
    houseName: nz(house?.name),
    /* Aucun slug inconnu ne devient un produit. */
    versionSlug: house ? VERSION_SLUG_MAP[house.modelSlug] ?? null : null,
    planImage: plan,
    mention: cleanMention(raw.mention),
    contact: commercial || phone ? { name: commercial, phone } : null,
    updatedAt: parseFrDate(land.updatedAt),
    highlighted: !!(land.isPriority || land.isExclusive),
    agency: {
      slug: nz(land.agencySlug),
      name: nz(land.agencyName),
      phone: nz(land.agencyPhone),
      email: nz(land.agencyEmail),
      address: [nz(land.agencyAdresse), [land.agencyPostcode, nz(land.agencyCity)].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ")
        .trim(),
    },
    image,
    gallery: [...new Set([...gallery, adImg, plan].filter((x): x is string => !!x))],
  };
}

/* ════ REGROUPEMENT PAR PARCELLE ════
   Le flux publie une annonce par COUPLE terrain × maison. La parcelle 68040
   de La Rochelle apparaît ainsi trois fois : en terrain nu (pack-26), avec
   la maison 2 chambres et avec la maison 3 chambres (pack-1860). Ce ne sont
   pas trois biens — c'est une parcelle et trois façons de l'acheter.

   ⚠ Dédupliquer sur `land.id` seul PERDRAIT une déclinaison au passage
   (les 6 offres 2 chambres partagent toutes leur parcelle avec une offre
   3 chambres). On regroupe donc, et on porte les offres dans `offres[]`.  */
function groupByParcel(list: Annonce[], keys: (number | null)[]): Annonce[] {
  const byParcel = new Map<string, Annonce[]>();
  list.forEach((a, i) => {
    const key = keys[i] !== null ? `land:${keys[i]}` : `ref:${a.id}`;
    byParcel.set(key, [...(byParcel.get(key) ?? []), a]);
  });

  return [...byParcel.values()].map((group) => {
    const offres = group
      .flatMap((a) => a.offres)
      .filter((o, i, arr) => arr.findIndex((x) => x.ref === o.ref) === i)
      .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

    /* L'offre mise en avant : la maison la moins chère. C'est elle qui
       porte le « à partir de » et le visuel de la carte. */
    const maison = offres.filter((o) => o.versionSlug !== null || o.houseSurface !== null);
    const primaire = maison[0] ?? offres[0];
    const terrainNu = offres.find((o) => o.houseSurface === null);

    /* Représentant : celui qui a un visuel, sinon la première offre maison. */
    const base =
      group.find((a) => a.image && a.type === "terrain-maison") ??
      group.find((a) => a.type === "terrain-maison") ??
      group.find((a) => a.image) ??
      group[0];

    return {
      ...base,
      offres,
      type: maison.length ? ("terrain-maison" as const) : ("terrain" as const),
      price: primaire?.price ?? base.price,
      landPrice: terrainNu?.price ?? base.landPrice,
      houseSurface: primaire?.houseSurface ?? null,
      bedrooms: primaire?.bedrooms ?? null,
      rooms: primaire?.rooms ?? null,
      garageArea: primaire?.garageArea ?? null,
      versionSlug: primaire?.versionSlug ?? null,
      planImage: primaire?.planImage ?? base.planImage,
      /* Les galeries des offres d'une même parcelle se complètent. */
      gallery: [...new Set(group.flatMap((a) => a.gallery))],
      image: base.image ?? group.find((a) => a.image)?.image ?? null,
      updatedAt: group.map((a) => a.updatedAt).sort().reverse()[0] ?? null,
      highlighted: group.some((a) => a.highlighted),
    };
  });
}

export function mapAnnonces(list: VitahomeAnnonce[]): Annonce[] {
  const raws = (list ?? []).filter(Boolean);
  const mapped: Annonce[] = [];
  const keys: (number | null)[] = [];
  let rejected = 0;

  for (const raw of raws) {
    const a = mapAnnonce(raw);
    if (!a) {
      rejected++;
      continue;
    }
    mapped.push(a);
    keys.push(num(raw.land?.id));
  }

  const deduped = groupByParcel(mapped, keys);
  if (rejected || deduped.length !== mapped.length) {
    console.info(
      `[vitahome] ${raws.length} brutes → ${mapped.length} valides (${rejected} rejetées) → ${deduped.length} parcelles`,
    );
  }
  /* Tri par défaut : les plus récentes d'abord, T+M avant terrain nu
     à date égale (le listing s'ouvrait sur 100 terrains d'affilée). */
  return deduped.sort((a, b) => {
    if (a.type !== b.type) return a.type === "terrain-maison" ? -1 : 1;
    return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
  });
}

/* ════ RÉCUPÉRATION DU FLUX ════
   Exécuté CÔTÉ SERVEUR uniquement, avec cache ISR.
   Le navigateur ne voit ni le token, ni l'URL du flux.               */

/**
 * Un message d'erreur SANS secret, prêt à partir dans un log.
 *
 * ⚠ L'URL du flux porte le token en query string, et un échec `fetch`
 * recopie cette URL dans le message de l'`Error`. Loguer `reason` brut
 * publierait donc le token dans les logs de l'hébergeur. On ne garde que
 * le message, et on le nettoie en trois passes : query string des URLs,
 * tout paramètre `token=` isolé, puis la valeur du token elle-même — au
 * cas où elle apparaîtrait ailleurs (chemin, en-tête recopié, cause).
 */
function safeError(reason: unknown): string {
  const raw = reason instanceof Error ? reason.message : String(reason);
  let msg = raw
    .replace(/(https?:\/\/[^\s'"]*?)\?[^\s'"]*/gi, "$1?[masqué]")
    .replace(/token=[^\s&'"]*/gi, "token=[masqué]");
  /* Comparaison littérale en dernier recours : elle attrape ce qu'aucun
     motif ne prévoit. Vide en dev, donc sans effet sur le jeu de démo. */
  if (VITAHOME.token) msg = msg.split(VITAHOME.token).join("[masqué]");
  return msg;
}

/**
 * Le flux seul, SANS les surcharges éditoriales : c'est la donnée
 * Vitahome telle qu'elle arrive, annonces masquées comprises.
 * Réservé au back-office, qui doit pouvoir montrer ce qu'il surcharge.
 * Les pages publiques, elles, passent par getAnnonces().
 */
export async function getAnnoncesFlux(): Promise<Annonce[]> {
  if (!hasLiveFeed()) return mapAnnonces(LOCAL_ANNONCES_RAW);

  const urls = [VITAHOME.feeds.terrain, VITAHOME.feeds.tm].map(
    (pack) =>
      `${VITAHOME.base}/${pack}/annonces.json?token=${encodeURIComponent(VITAHOME.token)}`,
  );

  /* allSettled : un pack en échec ne doit pas emporter l'autre. */
  const settled = await Promise.allSettled(
    urls.map(async (url) => {
      const r = await fetch(url, {
        next: { revalidate: FEED_REVALIDATE, tags: ["annonces"] },
      });
      if (!r.ok) throw new Error(`Vitahome ${r.status}`);
      return (await r.json()) as VitahomeAnnonce[];
    }),
  );

  const items = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  settled.forEach((s, i) => {
    /* Jamais `s.reason` : l'objet d'erreur porte l'URL, donc le token. */
    if (s.status === "rejected")
      console.error(`[vitahome] pack ${i} indisponible — ${safeError(s.reason)}`);
  });

  /* ⚠ Ne JAMAIS publier le jeu de démo quand le token est configuré :
     il ferait passer des annonces fictives pour le catalogue réel.
     En cas d'échec total, on renvoie vide et l'ISR conserve la page. */
  if (!items.length) {
    console.error("[vitahome] aucun flux exploitable — la page précédente est conservée par l'ISR");
    return [];
  }
  return mapAnnonces(items);
}

/* ════ ENRICHISSEMENT ÉDITORIAL ════
   Le flux a raison. Le back-office ne RÉÉCRIT jamais une annonce : il
   pose des écarts, indexés sur la référence (voir `AnnonceOverride`).
   Prix, surfaces, photos, viabilisation et mentions légales restent ceux
   de Vitahome — on les corrige dans le CRM, pas ici. Toute autre approche
   ferait diverger le site et le CRM dès le premier import.

   Les surcharges s'appliquent APRÈS mapAnnonces(), donc après le filtre
   de sanité ET le regroupement par parcelle : le client enrichit ce qu'il
   voit publié, pas une ligne brute du flux.                            */

const refKey = (ref: string) => ref.trim().toLowerCase();

/**
 * Indexe les surcharges par référence, une fois pour toutes.
 * Exporté pour le back-office, qui rapproche ~100 lignes du flux de leur
 * écart : il ne doit pas reconstruire l'index à chaque ligne.
 */
export function overrideIndex(list: AnnonceOverride[] | undefined): Map<string, AnnonceOverride> {
  const index = new Map<string, AnnonceOverride>();
  for (const o of list ?? []) {
    const ref = nz(o?.ref);
    if (ref) index.set(refKey(ref), o);
  }
  return index;
}

/**
 * La surcharge qui s'applique à une parcelle.
 * On cherche d'abord sur la référence publiée (`id`), puis sur celles des
 * offres : le regroupement peut changer de représentant quand le flux
 * bouge, et une surcharge saisie hier doit continuer à suivre sa parcelle
 * plutôt que de disparaître silencieusement.
 */
export function findOverride(
  a: Annonce,
  index: Map<string, AnnonceOverride>,
): AnnonceOverride | null {
  const direct = index.get(refKey(a.id));
  if (direct) return direct;
  for (const o of a.offres) {
    const hit = index.get(refKey(o.ref));
    if (hit) return hit;
  }
  return null;
}

/**
 * Trois effets sur l'objet `Annonce`, et pas un de plus :
 *   · `masquee` retire l'annonce du site — le CRM, lui, n'en sait rien ;
 *   · `titre` remplit `title`, le champ de titre du flux ;
 *   · `coupDeCoeur` force `highlighted`, que getSpotlight() interroge
 *     déjà pour l'opportunité mise en avant en home.
 * L'accroche et le SEO ne sont portés par aucun champ d'`Annonce` : la
 * fiche les lit directement, via getAnnonceOverride().
 */
function applyOverrides(list: Annonce[], index: Map<string, AnnonceOverride>): Annonce[] {
  if (!index.size) return list;
  const out: Annonce[] = [];
  for (const a of list) {
    const o = findOverride(a, index);
    if (!o) {
      out.push(a);
      continue;
    }
    if (o.masquee) continue;
    out.push({
      ...a,
      title: nz(o.titre) ?? a.title,
      /* Un coup de cœur ajoute une mise en avant, il n'en retire jamais :
         `highlighted` porte aussi isPriority / isExclusive côté Vitahome. */
      highlighted: o.coupDeCoeur === true || a.highlighted,
    });
  }
  return out;
}

/** Le flux enrichi des écarts du back-office — ce que voit le public. */
export async function getAnnonces(): Promise<Annonce[]> {
  /* getContent() a son propre cache court : à chaque rendu, l'enrichissement
     ne coûte qu'une lecture mémoire et un parcours de liste. */
  const [flux, content] = await Promise.all([getAnnoncesFlux(), getContent()]);
  return applyOverrides(flux, overrideIndex(content.annonces));
}

/**
 * La surcharge d'une annonce déjà résolue, ou `null`.
 * Sert à la fiche (accroche, SEO) et au back-office, qui ont besoin de
 * l'écart lui-même et pas seulement de son effet.
 */
export async function getAnnonceOverride(a: Annonce): Promise<AnnonceOverride | null> {
  const content = await getContent();
  return findOverride(a, overrideIndex(content.annonces));
}

export async function getAnnonceByRef(ref: string): Promise<Annonce | null> {
  const all = await getAnnonces();
  const r = ref.toLowerCase();
  /* On accepte AUSSI la référence d'une offre secondaire : une parcelle
     regroupe plusieurs références Vitahome, et celles qui ont été indexées
     avant le regroupement doivent continuer à résoudre plutôt que 404. */
  return (
    all.find((a) => a.id.toLowerCase() === r) ??
    all.find((a) => a.offres.some((o) => o.ref.toLowerCase() === r)) ??
    null
  );
}

/** L'opportunité mise en avant en home — jamais une annonce sans prix ni photo. */
export async function getSpotlight(): Promise<Annonce | null> {
  const all = await getAnnonces();
  const eligible = all.filter((a) => a.type === "terrain-maison" && a.price !== null);
  return eligible.find((a) => a.highlighted && a.image) ?? eligible.find((a) => a.image) ?? eligible[0] ?? null;
}
