import { HOUSE, PRICE_FROM, VERSIONS } from "@/data/essensya";
import { SITE_URL } from "@/lib/site-url";
import type { Annonce, HouseVersion } from "@/types";

/* Les agences existent en deux formes — celle du contenu éditorial
   (`Agency`) et celle éditable en back-office (`Agence`). Le balisage
   n'a besoin que de leur dénominateur commun : on le déclare ici plutôt
   que de forcer les appelants à convertir. */
export interface AgencePourSchema {
  id: string;
  name?: string;
  nom?: string;
  description: string;
  address?: string;
  adresse?: string;
  phone?: string;
  telephone?: string;
  email: string;
  lat?: number;
  lng?: number;
  cities?: string[];
  villes?: string[];
}

/* ════════════════════════════════════════════════════════════════
   DONNÉES STRUCTURÉES

   Ce que Google ne devine pas, il faut le lui dire. Sur ce métier,
   trois balisages rapportent réellement :

     · `Product` + `Offer` — c'est lui qui fait apparaître LE PRIX dans
       les résultats. Sur un site dont le prix EST l'argument, son
       absence était le manque le plus coûteux.
     · `BreadcrumbList` — remplace l'URL par un fil d'ariane lisible.
       Gain immédiat de taux de clic, surtout sur mobile où l'URL est
       tronquée.
     · `HomeAndConstructionBusiness` par agence — le panneau local, le
       numéro cliquable, la zone d'intervention. Déjà en place.

   ⚠ RÈGLE ABSOLUE : on ne balise QUE ce qui est visible sur la page.
   Un prix annoncé à Google mais absent de l'écran est une manipulation
   sanctionnée, pas une optimisation. Chaque fonction ci-dessous ne lit
   donc que des valeurs réellement affichées.
   ════════════════════════════════════════════════════════════════ */

type Noeud = Record<string, unknown>;

const abs = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Le JSON-LD, sérialisé sans risque d'injection.
 *
 * `<` échappé : une donnée qui contiendrait `</script>` refermerait la
 * balise et le reste passerait pour du HTML. Le contenu vient du flux
 * Vitahome et du back-office — donc d'ailleurs que de nous.
 */
export const jsonLd = (data: Noeud) =>
  JSON.stringify(data).replace(/</g, "\\u003c");

/* ════ FIL D'ARIANE ════ */
export function filAriane(items: { nom: string; path?: string }[]): Noeud {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.nom,
      /* Le dernier élément est la page courante : pas d'`item`, c'est
         ce que demande la spécification. */
      ...(it.path ? { item: abs(it.path) } : {}),
    })),
  };
}

/* ════ LA MAISON ════
   Un `Product` unique avec ses deux déclinaisons en offres. Le prix
   affiché est bien celui de la page — « à partir de », maison seule. */
export function produitMaison(version?: HouseVersion): Noeud {
  const offres = (version ? [version] : VERSIONS).map((v) => ({
    "@type": "Offer",
    name: `${HOUSE.name} — ${v.label}`,
    price: v.priceFrom,
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    url: abs(version ? `/maisons/${v.slug}` : "/maisons"),
    /* `priceValidUntil` est exigé par Google pour une offre. Sans date
       réelle du client, on ne l'invente pas : mieux vaut un avertissement
       dans la Search Console qu'une échéance fausse. */
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: v.priceFrom,
      priceCurrency: "EUR",
      valueAddedTaxIncluded: true,
    },
  }));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: version ? `${HOUSE.name} — ${version.label}` : HOUSE.name,
    description: version ? version.pour : HOUSE.tagline,
    category: "Maison individuelle",
    brand: { "@type": "Brand", name: "Maisons Essensya" },
    ...(HOUSE.image ? { image: [HOUSE.image] } : {}),
    /* Les caractéristiques que le visiteur lit sur la page, et rien de
       plus : surface, chambres, garage. */
    additionalProperty: (version ? [version] : VERSIONS).flatMap((v) => [
      { "@type": "PropertyValue", name: "Surface habitable", value: `${v.surface} m²`, unitCode: "MTK" },
      { "@type": "PropertyValue", name: "Chambres", value: v.bedrooms },
      { "@type": "PropertyValue", name: "Garage", value: `${v.garageArea} m²`, unitCode: "MTK" },
    ]),
    offers:
      offres.length === 1
        ? offres[0]
        : {
            "@type": "AggregateOffer",
            lowPrice: PRICE_FROM,
            highPrice: Math.max(...VERSIONS.map((v) => v.priceFrom)),
            priceCurrency: "EUR",
            offerCount: offres.length,
            offers: offres,
          },
  };
}

/* ════ UNE ANNONCE ════
   Un terrain, ou un terrain avec sa maison. On n'émet l'offre que si le
   prix existe réellement — le flux en livre à `null`. */
export function annonceSchema(a: Annonce, titre: string): Noeud {
  const base: Noeud = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: titre,
    description: a.description.slice(0, 300),
    category: a.type === "terrain" ? "Terrain à bâtir" : "Maison + terrain",
    ...(a.image ? { image: [a.image] } : {}),
    additionalProperty: [
      a.landSurface && {
        "@type": "PropertyValue",
        name: "Surface du terrain",
        value: `${a.landSurface} m²`,
        unitCode: "MTK",
      },
      a.houseSurface && {
        "@type": "PropertyValue",
        name: "Surface habitable",
        value: `${a.houseSurface} m²`,
        unitCode: "MTK",
      },
      a.bedrooms && { "@type": "PropertyValue", name: "Chambres", value: a.bedrooms },
    ].filter(Boolean),
    ...(a.city
      ? {
          areaServed: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: a.city,
              ...(a.zip ? { postalCode: a.zip } : {}),
              addressCountry: "FR",
            },
          },
        }
      : {}),
  };

  if (a.price === null) return base;
  return {
    ...base,
    offers: {
      "@type": "Offer",
      price: a.price,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: abs(`/annonces/${a.id.toLowerCase()}`),
    },
  };
}

/* ════ UNE LISTE ════
   Dit à Google que la page est un index, et dans quel ordre. On ne
   balise que ce qui est réellement rendu — pas le catalogue entier. */
export function listeSchema(
  nom: string,
  liens: { nom: string; path: string }[],
): Noeud {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: nom,
    numberOfItems: liens.length,
    itemListElement: liens.map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: l.nom,
      url: abs(l.path),
    })),
  };
}

/* ════ UNE AGENCE ════ */
export function agenceSchema(g: AgencePourSchema): Noeud {
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: g.nom ?? g.name ?? "",
    description: g.description,
    url: abs(`/agences/${g.id}`),
    ...(g.telephone ?? g.phone ? { telephone: g.telephone ?? g.phone } : {}),
    ...(g.email ? { email: g.email } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: g.adresse ?? g.address ?? "",
      addressCountry: "FR",
    },
    ...(g.lat && g.lng
      ? { geo: { "@type": "GeoCoordinates", latitude: g.lat, longitude: g.lng } }
      : {}),
    areaServed: (g.villes ?? g.cities ?? []).map((v: string) => ({
      "@type": "City",
      name: v,
    })),
  };
}

/* ════ LE SITE ════
   `WebSite` porte le nom du site dans les résultats. On n'y met PAS de
   `SearchAction` : elle annonce à Google une recherche interne à la
   `/recherche?q=`, que le site n'expose pas. La déclarer sans la servir
   est une promesse non tenue. */
export function siteSchema(nomSite: string): Noeud {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: nomSite,
    url: SITE_URL,
    inLanguage: "fr-FR",
  };
}
