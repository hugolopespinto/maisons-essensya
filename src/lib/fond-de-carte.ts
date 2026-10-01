/* ════════════════════════════════════════════════════════════════
   LE FOND DE CARTE — une seule source pour toutes les cartes du site

   ⚠ CARTO A FERMÉ SON ACCÈS SANS CLÉ. Ses tuiles Positron
   (basemaps.cartocdn.com) répondent toujours 200, mais l'image servie
   est un filigrane « API KEY REQUIRED » : rien ne casse dans la console,
   la carte est simplement illisible. C'était le défaut ici jusqu'en
   septembre 2026.

   Défaut actuel : le Plan IGN de la Géoplateforme (data.geopf.fr).
   · Sans clé, sans quota à déclarer, sous Licence Ouverte Etalab —
     usage commercial compris.
   · Servi par l'IGN, établissement public français : pas de nouveau
     destinataire hors UE à déclarer dans la politique de confidentialité.
   · Couverture France entière, ce qui suffit à un constructeur landais.

   Le Plan IGN est coloré (routes orange, forêts vertes). La classe
   `map-fond--ign` le désature en CSS (src/styles/carte.css) pour
   retrouver le fond clair et neutre sur lequel les points se lisent.

   N'importe quel fournisseur XYZ peut le remplacer via
   NEXT_PUBLIC_MAP_TILE_URL et NEXT_PUBLIC_MAP_TILE_ATTRIBUTION. Le
   filtre ne s'applique alors plus : un fond choisi est affiché tel quel.
   Penser à ouvrir son domaine dans `img-src` (netlify.toml).
   ════════════════════════════════════════════════════════════════ */

import type { TileLayerOptions } from "leaflet";

const IGN_URL =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
  "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM" +
  "&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}";
const IGN_ATTRIBUTION = '&copy; <a href="https://www.ign.fr/">IGN</a> — Plan IGN';

const PERSO = process.env.NEXT_PUBLIC_MAP_TILE_URL;

export const FOND_DE_CARTE: { url: string; options: TileLayerOptions } = {
  url: PERSO || IGN_URL,
  options: {
    /* Un fond personnalisé sans attribution renseignée n'hérite pas de
       celle de l'IGN : créditer le mauvais fournisseur serait pire que
       rien. */
    attribution: PERSO
      ? (process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ?? "")
      : IGN_ATTRIBUTION,
    /* Le Plan IGN s'arrête au zoom 19. */
    maxZoom: 19,
    /* L'IGN n'a pas de tuiles haute densité : `detectRetina` irait
       chercher le zoom supérieur en demi-taille, et les noms de commune
       deviendraient illisibles sur un écran Retina. */
    detectRetina: !!PERSO,
    className: PERSO ? undefined : "map-fond--ign",
  },
};
