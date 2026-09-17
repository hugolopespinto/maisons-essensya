import "server-only";
import type { Metadata } from "next";
import { PRICE_FROM, REEL } from "@/data/essensya";
import {
  descriptionModele,
  modelesAvecVisuels,
  titreModele,
  MODELES,
} from "@/data/gamme";
import { fmtPrice } from "@/lib/format";
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

/**
 * Raccourcit un texte à la limite, sans couper un mot en deux.
 *
 * ⚠ DEUX DÉFAUTS CORRIGÉS D'UN COUP. Les fiches d'annonce et d'agence
 * faisaient `.slice(0, 160)` : d'abord 160 alors que ce fichier fixe 155
 * et que le compteur du back-office mesure contre 155 — le client voyait
 * donc en rouge des descriptions que le site venait de produire. Ensuite
 * `slice` coupe où il tombe : « maison de plain-pied avec gar ».
 *
 * La coupe cherche la dernière frontière de mot, et l'ellipse dit que le
 * texte continue. Un texte déjà assez court ressort intact.
 */
/**
 * Ce qui reste à une page pour son titre, une fois le suffixe du gabarit
 * ajouté.
 *
 * Le gabarit racine compose `%s — ${nomSite}` (layout.tsx). Le budget est
 * donc calculé sur le nom par défaut : un client qui saisirait un nom plus
 * long dans Réglages mangerait la marge — c'est une approximation assumée,
 * et elle penche du bon côté tant que le nom ne s'allonge pas.
 */
export const BUDGET_TITRE = SEO_LIMITES.title - " — Maisons Essensya".length;

/* ⚠ CES DEUX TITRES VIVAIENT EN DOUBLE : une fois dans le gabarit qui
   les sert, une fois dans le défaut affiché en gris au client. Ils
   sortaient à 61 et 64 signes — au-dessus de la limite que ce fichier
   fixe et que le compteur du back-office applique. Une seule source,
   et le client voit exactement ce qui part en ligne. */
export const titreAccueil = (nomSite: string) =>
  `${nomSite} — constructeur au prix juste, ${REEL.departement}`;

export const titreGamme = () => `Nos modèles de maisons dès ${fmtPrice(PRICE_FROM)}`;

/**
 * Compose un titre en laissant tomber les compléments qui ne tiennent pas.
 *
 * Un complément est un « plus » : le prix d'une annonce, le département
 * d'une agence. Utile quand il tient, jamais au prix d'un titre coupé par
 * Google au milieu. L'ordre des arguments est l'ordre de priorité
 * décroissante — le premier qui ne rentre pas est abandonné, les suivants
 * sont quand même essayés.
 */
export function titreCourt(base: string, ...complements: string[]): string {
  let t = base.trim().replace(/s+/g, " ");
  for (const c of complements) {
    const essai = `${t} — ${c.trim()}`;
    if (c.trim() && essai.length <= BUDGET_TITRE) t = essai;
  }
  return t.length <= BUDGET_TITRE ? t : couper(t, BUDGET_TITRE);
}

export function couper(texte: string, max: number = SEO_LIMITES.description): string {
  const t = texte.trim().replace(/s+/g, " ");
  if (t.length <= max) return t;
  /* −1 pour l'ellipse. On remonte au dernier espace, et on retire une
     ponctuation laissée en bout de coupe. */
  const brut = t.slice(0, max - 1);
  const espace = brut.lastIndexOf(" ");
  return `${(espace > max * 0.6 ? brut.slice(0, espace) : brut).replace(/[s,;:.-–—]+$/, "")}…`;
}

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

/* ⚠ LES MÊMES CONSTRUCTEURS QUE LA PAGE, PAS UNE COPIE. Ce défaut est
   affiché au client en placeholder gris de l'écran Référencement, sous la
   promesse écrite que le gris est exactement ce qui part en ligne — et un
   compteur de signes le mesure. Les deux textes avaient divergé dès la
   première livraison : le back-office annonçait « La maison Ankara, en
   images » là où la page servait « Maison Ankara : 75 m², 2 chambres ».
   Le jour où les caractéristiques arrivent, les deux bougent ensemble. */
const defautModele = (m: (typeof MODELES)[number]) => ({
  title: `${titreModele(m)} — Maisons Essensya`,
  description: descriptionModele(m, fmtPrice(PRICE_FROM)),
});

/** Les routes proposées à l'édition, dans l'ordre d'affichage. */
export const SEO_ROUTES: SeoRoute[] = [
  {
    path: "/",
    label: "Accueil",
    aide: "La page la plus visitée. Son title sert aussi de titre de repli aux pages qui n'en définissent pas.",
    defaut: {
      title: titreAccueil("Maisons Essensya"),
      description:
        `Une gamme de ${MODELES.length} modèles de maisons individuelles, optimisés jusqu'au ` +
        `dernier mètre carré. À partir de ${fmtPrice(PRICE_FROM)} — ${REEL.mentionPrix.toLowerCase()} ` +
        `Prix annoncé avant le premier rendez-vous, figé au contrat CCMI.`,
    },
  },
  {
    path: "/maisons",
    label: "Nos modèles",
    defaut: {
      title: titreGamme(),
      description:
        `Une gamme de ${MODELES.length} modèles de maisons individuelles, optimisés jusqu'au ` +
        `dernier mètre carré. À partir de ${fmtPrice(PRICE_FROM)} — ${REEL.mentionPrix.toLowerCase()} ` +
        `Ce qui est compris et ce qui ne l'est pas, écrit noir sur blanc.`,
    },
  },
  /* Une entrée par modèle, générée depuis le catalogue : un modèle
     ajouté ou retiré met l'écran Référencement à jour tout seul.

     ⚠ NE JAMAIS RÉINTRODUIRE D'ENTRÉE ÉCRITE À LA MAIN pour une route
     qu'une boucle produit déjà. C'est arrivé avec les anciennes
     déclinaisons : elles figuraient deux fois, et comme
     `SEO_ROUTES.find()` rend la PREMIÈRE entrée trouvée, celle écrite en
     dur gagnait — l'entrée générée, avec son aide, n'était jamais lue, et
     deux champs du formulaire visaient le même chemin.

     Seuls les modèles qui ont un visuel sont proposés : sans façade, la
     page rend 404, et lui offrir un champ de titre serait promettre
     l'inexistant. La liste en compte onze depuis que Pékin a ses
     rendus — elle suit le catalogue, personne n'a à la tenir. */
  ...modelesAvecVisuels().map((m) => ({
    path: `/maisons/${m.slug}`,
    label: `Modèle — ${m.nom}`,
    /* L'aide était servie aux onze entrées ; elle est fausse pour celles
       qui ont leurs chiffres — leur titre les distingue déjà. */
    aide:
      m.surface === undefined
        ? "Ces fiches se ressemblent beaucoup tant qu'elles n'ont pas leurs caractéristiques : donnez-leur des titres nettement différents, sinon Google choisit lui-même laquelle afficher."
        : undefined,
    defaut: defautModele(m),
  })),
  {
    path: "/annonces",
    label: "Terrains & maisons",
    aide: "Le contenu des annonces vient de Vitahome : on ne règle ici que la page de liste.",
    defaut: {
      title: "Terrains & maisons disponibles",
      description:
        "Des terrains repérés par nos agences, seuls ou livrés avec une maison Essensya. Le lieu change, la méthode ne change pas — et le prix d'entrée non plus.",
    },
  },
  {
    path: "/terrains",
    label: "Où nous construisons",
    /* ⚠ L'écran ne propose QUE cette racine. Les pages de département et
       de commune appellent bien `resolveMetadata`, mais elles varient
       avec le stock : les lister ici reviendrait à afficher au client des
       champs pour des pages qui peuvent disparaître d'un jour à l'autre.
       Mieux vaut ne rien promettre que promettre l'instable. */
    aide: "Cette page présente les départements couverts. Chaque département et chaque commune a sa propre page, générée automatiquement à partir des terrains disponibles.",
    defaut: {
      title: "Terrains à bâtir : tous nos départements",
      description:
        "Nos terrains à bâtir, département par département. Nos modèles sont les mêmes partout, et leur prix aussi.",
    },
  },
  {
    path: "/realisations",
    label: "Réalisations",
    aide: "Le contenu vient de l'écran Réalisations : on ne règle ici que le titre et la description dans Google.",
    defaut: {
      title: "Nos réalisations dans les Landes",
      description:
        "Les maisons que nous avons construites et livrées, commune par commune. Des chantiers terminés, pas des images de synthèse.",
    },
  },
  {
    path: "/agences",
    label: "Nos agences",
    defaut: {
      title: "Nos agences dans les Landes",
      description:
        "Nous construisons dans les Landes. Notre équipe connaît le terrain de son secteur — au sens propre — et suit votre projet jusqu'à la remise des clés.",
    },
  },
  {
    path: "/concept",
    label: "Le concept",
    defaut: {
      title: "Notre concept — construire à l'essentiel",
      description:
        "Pourquoi nos maisons coûtent moins cher, comment nos plans sont optimisés, et ce que le prix comprend exactement. Questions fréquentes comprises.",
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
  /* Les pages légales sont indexables et figurent au sitemap : un visiteur
     qui cherche « mentions légales maisons essensya » doit les trouver. Leur
     TEXTE se modifie dans le code, mais leur title et leur description
     doivent rester à portée du client — c'est là qu'apparaîtront la raison
     sociale et le nom du garant dès qu'ils seront connus. */
  {
    path: "/mentions-legales",
    label: "Mentions légales",
    aide: "Page à faible enjeu de référencement, mais à fort enjeu de confiance : gardez un titre sobre et explicite.",
    defaut: {
      title: "Mentions légales",
      description:
        "Éditeur du site, directeur de la publication, hébergeur, assurances et garanties du constructeur, propriété intellectuelle et médiation de la consommation.",
    },
  },
  {
    path: "/confidentialite",
    label: "Protection des données",
    defaut: {
      title: "Protection de vos données",
      description:
        "Quelles données nos formulaires recueillent, pourquoi, à qui elles sont transmises, combien de temps elles sont conservées et comment exercer vos droits.",
    },
  },
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
export async function resolveMetadata(
  path: string,
  fallbackBrut: Metadata,
): Promise<Metadata> {
  /* ⚠ LE DÉFAUT DU CODE EST BORNÉ ICI, ET UNE SEULE FOIS.
     Les descriptions du gabarit se composent avec des données qui
     bougent : le nombre de modèles, la liste des départements servis par
     le flux, le nombre de terrains d'une commune. Écrites une fois sous
     la limite, elles la dépassaient dès que le stock changeait — treize
     pages sortaient au-dessus des 155 signes que ce fichier fixe et que
     le compteur du back-office affiche au client.

     La surcharge SAISIE PAR LE CLIENT, elle, n'est jamais coupée : c'est
     son texte, le compteur l'avertit, et le tronquer en silence serait
     lui reprendre une décision qu'on lui a explicitement donnée. */
  const fallback: Metadata =
    typeof fallbackBrut.description === "string"
      ? { ...fallbackBrut, description: couper(fallbackBrut.description) }
      : fallbackBrut;

  const cible = normalise(path);
  let entry: SeoEntry | undefined;
  try {
    const content = await getContent();
    entry = content.seo.find((e) => normalise(e.path) === cible);
  } catch (e) {
    /* Le SEO ne doit jamais faire tomber une page : en cas de souci de
       stockage, on sert le défaut du code, qui est toujours valide.

       ⚠ Mais un `catch` muet transformerait une panne du magasin en
       « le client enregistre et rien ne change », sans la moindre trace.
       On avale l'erreur pour le visiteur, jamais pour l'exploitant. */
    console.warn(`[seo] surcharge ignorée pour ${cible} — magasin illisible :`, e);
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
