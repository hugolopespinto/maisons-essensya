import "server-only";
import type { Metadata } from "next";
import { HOUSE, PRICE_FROM, VERSIONS } from "@/data/essensya";
import { fmtPrice, fmtSurface } from "@/lib/format";
import { getContent } from "@/lib/store";
import type { SeoEntry } from "@/lib/store/types";

/* ════════════════════════════════════════════════════════════════
   SEO ÉDITABLE — le pont entre le back-office et les pages

   Principe : le code garde TOUJOURS une valeur par défaut correcte.
   Le back-office ne remplace qu'un champ à la fois, et un champ laissé
   vide par le client ne vide pas la page — il laisse simplement le
   défaut s'appliquer. C'est ce qui permet de confier le SEO au client
   sans risquer de se réveiller avec un site sans title ni description.

   Le sens de lecture est donc : défaut du code <— surcharge client,
   jamais l'inverse.
   ════════════════════════════════════════════════════════════════ */

/** Seuils indicatifs, repris par les compteurs du back-office. */
export const SEO_LIMITES = { title: 60, description: 155 } as const;

export interface SeoRoute {
  path: string;
  label: string;
  /** Courte explication affichée au client dans le back-office. */
  aide?: string;
  /* ⚠ Recopié des `metadata` de la page correspondante, et affiché en
     PLACEHOLDER uniquement — jamais injecté dans le rendu public. Le
     rendu, lui, reçoit le vrai défaut par `resolveMetadata(path, …)`.
     Le jour où chaque page appellera `resolveMetadata`, cette recopie
     pourra disparaître : la page passera son propre défaut. */
  defaut: { title?: string; description?: string };
}

const V3 = VERSIONS.find((v) => v.slug === "3-chambres");
const V2 = VERSIONS.find((v) => v.slug === "2-chambres");

const defautVersion = (v: (typeof VERSIONS)[number] | undefined) =>
  v
    ? { title: `${HOUSE.name} — ${v.label}, ${fmtSurface(v.surface)}`, description: v.pour }
    : {};

/** Les routes proposées à l'édition, dans l'ordre d'affichage. */
export const SEO_ROUTES: SeoRoute[] = [
  {
    path: "/",
    label: "Accueil",
    aide: "La page la plus visitée. Son title sert aussi de titre de repli aux pages qui n'en définissent pas.",
    defaut: {
      title: `Maisons Essensya — une maison, à partir de ${fmtPrice(PRICE_FROM)}`,
      description:
        `Une seule maison de plain-pied, deux déclinaisons : 2 ou 3 chambres. ` +
        `À partir de ${fmtPrice(PRICE_FROM)} hors terrain, cuisine aménagée, ` +
        `terrasse couverte et garage compris. Prix annoncé au premier rendez-vous, ` +
        `figé au contrat CCMI.`,
    },
  },
  {
    path: "/maisons",
    label: "La maison",
    defaut: {
      title: `La maison ${HOUSE.name} — à partir de ${fmtPrice(PRICE_FROM)}`,
      description: `Une seule maison, deux déclinaisons : 2 ou 3 chambres. Plain-pied de ${fmtSurface(
        VERSIONS[0].surface,
      )}, cuisine, terrasse couverte et garage compris, à partir de ${fmtPrice(
        PRICE_FROM,
      )} hors terrain. Ce qui est compris et ce qui ne l'est pas, écrit noir sur blanc.`,
    },
  },
  { path: "/maisons/3-chambres", label: "Déclinaison 3 chambres", defaut: defautVersion(V3) },
  { path: "/maisons/2-chambres", label: "Déclinaison 2 chambres", defaut: defautVersion(V2) },
  {
    path: "/annonces",
    label: "Terrains & maisons",
    aide: "Le contenu des annonces vient de Vitahome : on ne règle ici que la page de liste.",
    defaut: {
      title: "Terrains & maisons disponibles",
      description:
        "Des terrains repérés par nos agences, seuls ou livrés avec la maison Essensya. Le lieu change, la maison ne change pas — et son prix non plus.",
    },
  },
  {
    path: "/agences",
    label: "Nos agences",
    defaut: {
      title: "Nos agences — La Rochelle et Thouars",
      description:
        "Deux agences, une maison. Chaque équipe connaît le terrain de son secteur — au sens propre — et suit votre projet jusqu'à la remise des clés.",
    },
  },
  {
    path: "/concept",
    label: "Le concept",
    defaut: {
      title: "Notre concept — une maison, deux déclinaisons",
      description:
        "Pourquoi nous ne construisons qu'une maison, pourquoi elle coûte moins cher, et ce que le prix comprend exactement. Questions fréquentes comprises.",
    },
  },
  {
    path: "/contact",
    label: "Contact",
    defaut: {
      title: "Contact — parler de votre projet",
      description:
        "Un formulaire, pas un parcours du combattant. Une agence vous répond sous 48 h, sans engagement et sans démarchage.",
    },
  },
  {
    path: "/blog",
    label: "Blog",
    aide: "Chaque article a par ailleurs son propre title et sa propre description, réglables depuis l'écran Blog.",
    defaut: {},
  },
  {
    path: "/cookies",
    label: "Gestion des cookies",
    defaut: {
      title: "Gestion des cookies",
      description:
        "Quels cookies nous déposons, pourquoi, combien de temps, et comment modifier votre choix à tout moment.",
    },
  },
  /* Les deux déclinaisons sont générées à partir des données : ajouter
     ou retirer une version met l'écran Référencement à jour tout seul.
     Elles méritent leur propre entrée — deux pages aussi proches se
     cannibalisent dans les résultats si elles portent le même titre, et
     c'est justement au client de trancher lequel il veut mettre en avant. */
  ...VERSIONS.map((v) => ({
    path: `/maisons/${v.slug}`,
    label: `La maison — ${v.label}`,
    aide:
      "Cette page et l'autre déclinaison sont très proches : donnez-leur des titres nettement différents, sinon Google choisit lui-même laquelle afficher.",
    defaut: defautVersion(v),
  })),
];

/** "/maisons/" et "/maisons" désignent la même route. */
function normalise(path: string): string {
  const p = path.trim();
  if (!p) return "/";
  const sans = p.replace(/\/+$/, "");
  return sans === "" ? "/" : sans;
}

const propre = (s: string | undefined): string | undefined => {
  const t = s?.trim();
  return t ? t : undefined;
};

/* Le title de la racine est un gabarit (`%s — Maisons Essensya`) : on ne
   remplace que sa valeur par défaut, sinon le suffixe saute partout. */
function fusionneTitle(fallback: Metadata["title"], titre: string): Metadata["title"] {
  if (fallback && typeof fallback === "object" && "default" in fallback) {
    return { ...fallback, default: titre };
  }
  return titre;
}

/**
 * Fusionne la surcharge du back-office PAR-DESSUS le défaut codé en dur.
 *
 * @param path     chemin de la route, tel qu'il figure dans `SEO_ROUTES`
 * @param fallback les `metadata` que la page produirait sans back-office
 */
export async function resolveMetadata(path: string, fallback: Metadata): Promise<Metadata> {
  const cible = normalise(path);
  let entry: SeoEntry | undefined;
  try {
    const content = await getContent();
    entry = content.seo.find((e) => normalise(e.path) === cible);
  } catch {
    /* Le SEO ne doit jamais faire tomber une page : en cas de souci de
       stockage, on sert le défaut du code, qui est toujours valide. */
    return fallback;
  }
  if (!entry) return fallback;

  const out: Metadata = { ...fallback };

  const title = propre(entry.title);
  if (title) out.title = fusionneTitle(fallback.title, title);

  const description = propre(entry.description);
  if (description) out.description = description;

  const ogImage = propre(entry.ogImage);
  if (ogImage) out.openGraph = { ...(fallback.openGraph ?? {}), images: [ogImage] };

  /* L'aperçu de partage suit le texte surchargé : sans cela, Facebook et
     LinkedIn continueraient d'afficher l'ancien titre. */
  if (title || description) {
    out.openGraph = {
      ...(out.openGraph ?? fallback.openGraph ?? {}),
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    };
  }

  const canonical = propre(entry.canonical);
  if (canonical) out.alternates = { ...(fallback.alternates ?? {}), canonical };

  /* `follow: true` volontairement : on retire la page de l'index, on ne
     coupe pas le suivi des liens qu'elle porte. */
  if (entry.noindex) out.robots = { index: false, follow: true };

  return out;
}

/* ════ BRANCHER UNE PAGE, PLUS TARD ════
   Seule la racine (`src/app/layout.tsx`) passe aujourd'hui par
   `resolveMetadata`. Pour une page statique, remplacer :

     export const metadata: Metadata = { title: "…", description: "…" };

   par :

     export async function generateMetadata(): Promise<Metadata> {
       return resolveMetadata("/concept", {
         title: "…",                            // le défaut d'origine,
         description: "…",                      // inchangé
         alternates: { canonical: "/concept" },
       });
     }

   Pour une page dynamique, même geste dans le `generateMetadata` déjà
   présent : `return resolveMetadata(versionUrl(v), { … })`.
   Rien d'autre ne bouge : le défaut reste dans la page, versionné et
   relu, et la surcharge client vient par-dessus.                        */
