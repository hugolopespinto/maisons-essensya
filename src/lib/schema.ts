import { PRICE_FROM } from "@/data/essensya";
import { SITE_URL } from "@/lib/site-url";
import type { Annonce } from "@/types";

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

/* ════ LA GAMME ════

   ⚠ CE QUE CETTE FONCTION PUBLIAIT, ET QU'ELLE NE PUBLIE PLUS.

   Elle émettait un `Product` nommé « Essen » — une maison INVENTÉE pour
   la maquette — avec, en `additionalProperty`, sa surface habitable, son
   nombre de chambres et la surface de son garage. Puis un
   `AggregateOffer` sur les prix de deux déclinaisons tout aussi
   fictives.

   Une balise de prix ou de caractéristique n'est pas un ornement : c'est
   ce que Google affiche dans ses résultats et ce sur quoi il engage sa
   confiance. Déclarer « 93 m², 3 chambres, 94 900 € » pour un produit
   qui n'existe pas relève de la donnée structurée trompeuse, que Google
   sanctionne par une action manuelle — et, côté client, d'un engagement
   commercial sur un bien inexistant.

   LA RÈGLE DU FICHIER S'APPLIQUE D'ELLE-MÊME : on ne balise que ce qui
   est visible ET vrai. Aujourd'hui, du produit, nous savons deux choses
   seulement — que c'est une gamme de maisons individuelles, et qu'elle
   commence à 78 000 € hors terrain (modèle Pékin). C'est donc
   exactement ce qui est publié : pas de surface, pas de chambres, pas de
   prix par modèle, aucun nom de produit fictif.

   Le jour où le client transmettra ses caractéristiques, elles
   reviendront ici — et pas avant. `estPubliable()` dans
   src/data/gamme.ts tient la même frontière côté pages.

   Le paramètre `version` a disparu avec les déclinaisons : les deux
   appelants passaient soit rien, soit une déclinaison inventée. */
export function produitGamme(): Noeud {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Maisons Essensya",
    description:
      "Une gamme de maisons individuelles optimisées, conçues par notre bureau d'études pour un prix maîtrisé.",
    category: "Maison individuelle",
    brand: { "@type": "Brand", name: "Maisons Essensya" },
    offers: {
      "@type": "AggregateOffer",
      /* Le seul prix réel dont nous disposions. Pas de `highPrice` : nous
         ignorons le haut de gamme, et un intervalle inventé serait plus
         trompeur qu'un intervalle ouvert. Pas d'`offerCount` non plus —
         il annoncerait des offres individuelles qui n'existent pas. */
      lowPrice: PRICE_FROM,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: abs("/maisons"),
    },
  };
}

/* ════ UN MODÈLE ════
   Le pendant de `produitGamme()` à l'échelle d'une fiche, et il n'est
   émis QUE si la fiche a quelque chose à déclarer.

   ⚠ AUCUN `offers`, ET C'EST LE POINT DÉLICAT. Ankara a une surface mais
   pas de prix : le seul montant disponible est celui de la gamme, qui
   appartient à Pékin. L'attacher à un `Offer` sur /maisons/ankara serait
   exactement la « donnée structurée trompeuse » décrite plus haut — un
   engagement commercial sur un prix qui n'est pas celui du produit
   balisé. L'`AggregateOffer` de la gamme reste sur /maisons, à sa place.

   Ce qu'on déclare, ce sont les caractéristiques AFFICHÉES sur la page,
   via `additionalProperty` : c'est le vocabulaire que schema.org prévoit
   pour ce qu'aucune propriété native ne couvre, et il n'engage sur aucun
   prix. Le jour où un modèle aura son `prixDepart`, l'`Offer` s'ajoutera
   ici — et pas avant. */
export function produitModele(
  m: { nom: string; surface?: number; chambres?: number; pieces?: number; garage?: boolean },
  imageSrc: string,
  path: string,
): Noeud {
  const proprietes = [
    m.surface !== undefined && {
      "@type": "PropertyValue",
      name: "Surface habitable",
      value: m.surface,
      unitCode: "MTK",
    },
    m.chambres !== undefined && {
      "@type": "PropertyValue",
      name: "Chambres",
      value: m.chambres,
    },
    m.pieces !== undefined && {
      "@type": "PropertyValue",
      name: "Pièces",
      value: m.pieces,
    },
    m.garage !== undefined && {
      "@type": "PropertyValue",
      name: "Garage",
      value: m.garage ? "Oui" : "Non",
    },
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `Maison ${m.nom}`,
    category: "Maison individuelle",
    brand: { "@type": "Brand", name: "Maisons Essensya" },
    image: [abs(imageSrc)],
    url: abs(path),
    additionalProperty: proprietes,
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
  /* `path` est FACULTATIF : toutes les listes ne mènent pas ailleurs.
     Les réalisations, par exemple, sont des fiches sans page propre.
     Leur inventer une URL — ou émettre `url: undefined` — annoncerait à
     Google des pages qui n'existent pas, et c'est lui qui viendrait les
     chercher. On omet la clé, ce qu'un ItemList accepte parfaitement. */
  liens: { nom: string; path?: string }[],
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
      ...(l.path ? { url: abs(l.path) } : {}),
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
