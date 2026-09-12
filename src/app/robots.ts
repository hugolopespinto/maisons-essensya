import type { MetadataRoute } from "next";
import { SITE_URL, estProduction } from "@/lib/site-url";

const BASE = SITE_URL;

/* Une preview indexée, c'est le site en double dans l'index : Google
   choisit lui-même la version canonique et il choisit souvent mal.
   On ne cherche donc pas à reconnaître la prod par son domaine (inconnu
   à ce stade), mais à écarter tout ce qui n'en est manifestement pas une :
   localhost, IP, HTTP en clair, et les domaines de preview des hébergeurs.
   Par défaut on suppose une preview — se tromper dans ce sens coûte un
   robots.txt trop strict, l'inverse coûte un duplicate de tout le site. */

export default function robots(): MetadataRoute.Robots {
  if (!estProduction(BASE)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      /* Landings d'acquisition, doc interne et back-office hors index.
         `/admin` couvre toute l'arborescence d'administration : les
         écrans portent aussi `robots: { index: false }` en métadonnée,
         parce qu'un robots.txt se négocie avec les robots quand la
         balise, elle, s'impose à ceux qui la lisent. */
      disallow: ["/lp/", "/styleguide", "/api/", "/admin"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
