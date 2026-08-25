import "server-only";
import { LOCAL_ANNONCES_RAW } from "@/data/annonces-demo";
import type { Annonce } from "@/types";
import { FEED_REVALIDATE, MODEL_SLUG_MAP, VITAHOME, hasLiveFeed } from "./config";
import type { VitahomeAnnonce } from "./types";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop";

/* ════ ADAPTATEUR : format Vitahome → contrat interne ════
   Points d'attention issus du spec :
   — house === false pour un terrain seul
   — land.latitude / longitude sont des Strings → parseFloat
   — land.postCode est un Number → String pour l'affichage
   — price racine = prix terrain seul, ou addition T+M           */
export function mapAnnonce(raw: VitahomeAnnonce): Annonce {
  const land = raw.land ?? ({} as VitahomeAnnonce["land"]);
  const house = raw.house || null; // `false` = terrain seul (spec Vitahome)

  const mainMedia =
    raw.media?.[0]?.path ??
    house?.adImage?.path ??
    land.media?.[0]?.path ??
    FALLBACK_IMG;

  const gallery = [
    ...(raw.media ?? []).map((x) => x.path),
    ...(house?.media ?? []).map((x) => x.path),
    ...(land.media ?? []).map((x) => x.path),
  ].filter(Boolean);

  return {
    id: raw.reference, // la référence sert d'id d'URL
    ref: raw.reference,
    type: house ? "terrain-maison" : "terrain",
    title: raw.title ?? null,
    description: raw.description ?? house?.description ?? "",
    price: raw.price,
    landPrice: land.price ?? null,
    landSurface: land.surface ?? null,
    servicing: land.isServicing ?? null,
    landConfiguration: land.landConfiguration ?? null,
    landType: land.landType ?? null,
    city: land.city,
    cityId: land.cityId ?? null,
    insee: land.inseeCode ?? null,
    zip: String(land.postCode ?? ""),
    dept: land.departmentName ?? "",
    deptCode: land.inseeDepartmentCode ?? "",
    lat: parseFloat(land.latitude ?? "0"),
    lng: parseFloat(land.longitude ?? "0"),
    houseSurface: house?.area ?? null,
    bedrooms: house?.bedroomNumber ?? null,
    rooms: house?.roomNumber ?? null,
    houseName: house?.name ?? null,
    modelId: house ? MODEL_SLUG_MAP[house.modelSlug] ?? null : null,
    planImage: house?.groundFloorImage?.path ?? null,
    agency: {
      slug: land.agencySlug ?? null,
      name: land.agencyName ?? null,
      phone: land.agencyPhone ?? null,
      email: land.agencyEmail ?? null,
      address: `${land.agencyAdresse ?? ""}, ${land.agencyPostcode ?? ""} ${
        land.agencyCity ?? ""
      }`
        .replace(/^, /, "")
        .trim(),
    },
    image: mainMedia,
    gallery,
  };
}

export const mapAnnonces = (list: VitahomeAnnonce[]): Annonce[] =>
  (list ?? []).map(mapAnnonce);

/* ════ RÉCUPÉRATION DU FLUX ════
   Exécuté CÔTÉ SERVEUR uniquement, avec cache ISR : `next.revalidate`
   remplace le couple cron + transient de l'ancienne cible WordPress.
   Le navigateur ne voit ni le token, ni l'URL du flux.              */
export async function getAnnonces(): Promise<Annonce[]> {
  if (!hasLiveFeed()) return mapAnnonces(LOCAL_ANNONCES_RAW);

  const urls = [VITAHOME.feeds.terrain, VITAHOME.feeds.tm].map(
    (pack) =>
      `${VITAHOME.base}/${pack}/annonces.json?token=${encodeURIComponent(
        VITAHOME.token,
      )}`,
  );

  try {
    const responses = await Promise.all(
      urls.map((url) =>
        fetch(url, { next: { revalidate: FEED_REVALIDATE, tags: ["annonces"] } }),
      ),
    );
    const payloads = await Promise.all(
      responses.map((r) => {
        if (!r.ok) throw new Error(`Vitahome ${r.status}`);
        return r.json() as Promise<VitahomeAnnonce[]>;
      }),
    );
    const items = payloads.flat();
    return items.length ? mapAnnonces(items) : mapAnnonces(LOCAL_ANNONCES_RAW);
  } catch (err) {
    // Flux indisponible : le site reste debout sur le jeu local.
    console.error("[vitahome] flux annonces indisponible —", err);
    return mapAnnonces(LOCAL_ANNONCES_RAW);
  }
}

export async function getAnnonceByRef(ref: string): Promise<Annonce | null> {
  const all = await getAnnonces();
  return all.find((a) => a.id.toLowerCase() === ref.toLowerCase()) ?? null;
}
