import { ESSENSYA_DATA, HOUSE } from "@/data/essensya";
import { fmtPrice } from "@/lib/format";
import type {
  BlocCampagne,
  ChampCampagne,
  PageCampagne,
  TypeBlocCampagne,
} from "@/lib/store/types";

/* ════════════════════════════════════════════════════════════════
   PAGES DE CAMPAGNE — ce que partagent l'éditeur et la page publique

   Le back-office (src/app/admin/campagnes) écrit, la route publique
   (src/app/lp/[slug]) lit. Tout ce qui doit être identique des deux
   côtés vit ici : le catalogue des blocs, la règle de publication, la
   fabrication des adresses.

   Ce module ne lit pas le magasin : il reçoit la liste des pages. C'est
   l'appelant qui choisit entre lecture en cache (site public) et lecture
   fraîche (back-office, avant d'écrire).
   ════════════════════════════════════════════════════════════════ */

/** Les champs qu'un type de bloc utilise — l'éditeur n'affiche qu'eux. */
type ChampBloc =
  | "surtitre"
  | "titre"
  | "texte"
  | "image"
  | "legende"
  | "imageAGauche"
  | "fond";

export interface TypeBloc {
  type: TypeBlocCampagne;
  label: string;
  /** Une phrase pour le bouton « Ajouter » et l'en-tête du bloc. */
  aide: string;
  champs: ChampBloc[];
}

/** Dans l'ordre des boutons « Ajouter un bloc » : du plus courant au plus rare. */
export const TYPES_BLOC: TypeBloc[] = [
  {
    type: "texte",
    label: "Texte",
    aide: "Un titre et un paragraphe — l'argument que l'annonce n'a pas eu la place de développer.",
    champs: ["surtitre", "titre", "texte", "fond"],
  },
  {
    type: "texteImage",
    label: "Texte et image",
    aide: "Un paragraphe à côté d'une photo : un modèle, une commune, un intérieur.",
    champs: ["surtitre", "titre", "texte", "image", "imageAGauche", "fond"],
  },
  {
    type: "image",
    label: "Image",
    aide: "Une grande image sur toute la largeur, avec une légende facultative.",
    champs: ["image", "legende"],
  },
  {
    type: "formulaire",
    label: "Formulaire",
    aide: "Le formulaire de la page, repris plus bas — pour ceux qui ont lu jusqu'au bout.",
    champs: ["titre", "texte", "fond"],
  },
  {
    type: "compris",
    label: "Ce que le prix comprend",
    aide: "La liste des prestations comprises, telle qu'elle est sur les pages modèles. Elle se met à jour avec le site.",
    champs: ["surtitre", "titre"],
  },
  {
    type: "garanties",
    label: "Nos garanties",
    aide: "Les quatre engagements de l'accueil (CCMI, constructeur-concepteur, agences locales, livraison garantie).",
    champs: ["surtitre", "titre"],
  },
];

export const typeBloc = (t: string): TypeBloc | undefined =>
  TYPES_BLOC.find((x) => x.type === t);

export const utiliseChamp = (t: TypeBlocCampagne, champ: ChampBloc): boolean =>
  typeBloc(t)?.champs.includes(champ) ?? false;

/** Les champs facultatifs du formulaire, avec leur libellé à l'écran. */
export const CHAMPS_FORMULAIRE: { champ: ChampCampagne; label: string; aide: string }[] = [
  {
    champ: "zone",
    label: "Commune du projet",
    aide: "Liste de toutes les communes de France, par nom ou code postal. Transmise à l'agence avec la demande.",
  },
  {
    champ: "message",
    label: "Message libre",
    aide: "Une zone de texte facultative pour le visiteur.",
  },
];

/* Les textes par défaut du formulaire : ceux de l'ancienne page de
   campagne, qui servaient déjà en production. Un champ laissé vide dans
   l'éditeur les reprend. */
export const FORMULAIRE_DEFAUT = {
  titre: "Être rappelé",
  bouton: "Envoyer ma demande",
  confirmation: "Merci — une agence Essensya vous recontacte sous 48 h.",
} as const;

/* ──────────────────────────────────────────────────────────────────
   ADRESSES
   ────────────────────────────────────────────────────────────────── */

/**
 * Texte → slug. Sans accent, sans ponctuation, sans capitale — même
 * règle que les articles du blog.
 *
 * `normalize("NFD")` décompose « é » en « e » + accent combinant, que la
 * plage U+0300–U+036F retire ensuite.
 */
export const slugifier = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");

/** Suffixe le slug jusqu'à ce qu'il soit libre : deux pages ne partagent jamais une adresse. */
export const slugLibre = (base: string, pris: string[]): string => {
  const racine = base || "campagne";
  if (!pris.includes(racine)) return racine;
  let n = 2;
  while (pris.includes(`${racine}-${n}`)) n += 1;
  return `${racine}-${n}`;
};

/* ──────────────────────────────────────────────────────────────────
   LECTURE
   ────────────────────────────────────────────────────────────────── */

/**
 * Une page de campagne n'est servie que publiée ET titrée : sans H1, le
 * visiteur arriverait sur un formulaire sans promesse.
 */
export const estEnLigne = (p: PageCampagne): boolean =>
  p.publiee && p.titre.trim() !== "" && p.slug.trim() !== "";

/**
 * Les pages livrées dans le code (`ESSENSYA_DATA.landings`), traduites
 * dans la forme éditable.
 *
 * ⚠ ELLES RESTENT SERVIES tant que le back-office n'a pas de page à la
 * même adresse : une annonce déjà diffusée pointe peut-être dessus, et la
 * passer en 404 la ferait payer pour rien. Le back-office les liste et
 * propose de les reprendre ; une fois reprises, c'est la copie éditable
 * qui est servie — la version du code ne l'est plus.
 */
export function pagesDuCode(): PageCampagne[] {
  return Object.entries(ESSENSYA_DATA.landings).map(([slug, lp]) => ({
    id: `code:${slug}`,
    slug,
    nom: lp.title,
    publiee: true,
    surtitre: "Prix de lancement",
    titre: lp.title,
    sousTitre: lp.subtitle,
    chiffre: fmtPrice(lp.price),
    chiffreNote: lp.priceNote,
    points: [...lp.bullets],
    image: lp.image,
    imageAlt: HOUSE.alt,
    formulaireEnTete: true,
    formulaire: {
      titre: lp.formTitle,
      texte: lp.formText,
      champs: [],
      bouton: "Recevoir le dossier",
      confirmation: "Merci — le dossier arrive sous 48 h.",
    },
    blocs: [
      { id: "compris", type: "compris" },
      { id: "garanties", type: "garanties" },
    ],
  }));
}

/**
 * La page servie à une adresse : celle du back-office si elle existe —
 * en ligne ou non —, sinon celle du code.
 *
 * Une page du back-office HORS LIGNE masque aussi la page du code à la
 * même adresse : reprendre une page puis la dépublier doit la retirer,
 * pas faire réapparaître l'ancienne version.
 */
export function pageServie(campagnes: PageCampagne[], slug: string): PageCampagne | null {
  const editee = campagnes.find((p) => p.slug === slug);
  if (editee) return estEnLigne(editee) ? editee : null;
  return pagesDuCode().find((p) => p.slug === slug) ?? null;
}

/** Toutes les adresses servies — pour `generateStaticParams` et les menus. */
export function slugsServis(campagnes: PageCampagne[]): string[] {
  const edites = new Set(campagnes.map((p) => p.slug));
  return [
    ...campagnes.filter(estEnLigne).map((p) => p.slug),
    ...pagesDuCode()
      .map((p) => p.slug)
      .filter((s) => !edites.has(s)),
  ];
}

/** Un bloc neuf, prêt à remplir. Le formulaire part sur fond sombre :
 *  c'est la dernière invitation de la page, elle doit trancher sur les
 *  blocs clairs qui la précèdent — comme le bloc de rappel de l'accueil. */
export const blocVide = (type: TypeBlocCampagne, id: string): BlocCampagne => ({
  id,
  type,
  ...(utiliseChamp(type, "fond")
    ? { fond: type === "formulaire" ? ("sombre" as const) : ("clair" as const) }
    : {}),
});
