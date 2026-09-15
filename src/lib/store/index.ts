import "server-only";
import { revalidateTag, updateTag } from "next/cache";
import type { Content, PageEditable } from "./types";
import * as fichier from "./file";
import { TAG_MAGASIN } from "./supabase";
import * as supabase from "./supabase";

/* ════════════════════════════════════════════════════════════════
   STOCKAGE DU CONTENU ÉDITABLE — sélecteur de pilote

   Une seule interface, deux pilotes. Les pages publiques et les écrans
   du back-office passent tous par `getContent()` / `saveContent()` /
   `patchContent()` et ne savent RIEN du pilote : c'est ce qui a permis
   de trancher l'infrastructure après coup sans retoucher une seule ligne
   d'administration.

   LE CHOIX SE FAIT SUR L'ENVIRONNEMENT, pas sur un drapeau :
     · SUPABASE_URL (avec son schéma http/https) + SUPABASE_SERVICE_ROLE_KEY
       définies → Postgres ;
     · sinon → fichier JSON local.
   Le repli fichier reste le comportement par défaut, et il n'exige
   aucune configuration : le site se build et tourne en local sans base,
   exactement comme avant.

   ⚠ Le pilote fichier ne sait pas écrire en serverless (disque en
   lecture seule). `isWritable()` le dit, et le tableau de bord l'affiche.
   Pour confier le back-office au client en production, il faut Supabase.

   Quatre choses vivent ici plutôt que dans les pilotes, parce qu'elles
   sont communes aux deux : le cache court, les valeurs par défaut,
   l'horodatage des écritures et le catalogue des blocs de page. Un
   pilote ne fait que persister.
   ════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────────
   CATALOGUE DES BLOCS DE PAGE

   La structure est ICI, en code ; le stockage ne garde que les valeurs
   (voir `fusionnerPages`). C'est délibéré : un bloc n'existe dans le
   back-office que si un gabarit sait l'afficher, et ajouter une section
   au site suffit à la rendre éditable — sans migration de base.

   ⚠ Les `valeur` amorcées ci-dessous sont le texte RÉELLEMENT présent
   aujourd'hui dans `src/app/page.tsx`, `src/app/concept/page.tsx`,
   `src/app/maisons/page.tsx`, `src/app/annonces/page.tsx`,
   `src/app/agences/page.tsx` et `src/app/contact/page.tsx` — rien
   d'inventé. Là où le texte affiché mélange du littéral et une valeur
   calculée (le prix, le nom de la maison), la valeur est laissée VIDE et
   l'aide le dit : le gabarit garde alors sa phrase d'origine, prix
   compris, plutôt qu'une version figée qui mentirait au premier
   changement de tarif.
   ────────────────────────────────────────────────────────────────── */
export const PAGES_DEFAUT: PageEditable[] = [
  {
    cle: "accueil",
    label: "Accueil",
    blocs: [
      {
        cle: "recherche.surtitre",
        label: "Petit titre au-dessus de la recherche",
        aide: "Le mot en capitales au-dessus du moteur de recherche par ville.",
        valeur: "Où construire",
      },
      {
        cle: "recherche.titre",
        label: "Titre de la section recherche",
        valeur: "Trouvez le terrain, les maisons sont déjà dessinées.",
      },
      {
        cle: "hero.baseline",
        label: "Baseline, au-dessus du titre d'accueil",
        aide: "Le petit texte en capitales posé sur la grande image.",
        valeur: "Votre maison au prix juste",
      },
      {
        cle: "hero.titre",
        label: "Titre de la page d'accueil",
        aide: "C'est le H1 du site : la phrase que Google lit en premier. Gardez-y le métier et le secteur.",
        valeur:
          "Maisons Essensya, constructeur de maisons au prix juste dans les Landes",
        multiligne: true,
      },
      {
        cle: "juste.surtitre",
        label: "Petit titre de la section prix",
        valeur: "La maison juste, le prix juste",
      },
      {
        cle: "juste.mention",
        label: "Mention sous le prix",
        aide: "Ce que le prix ne comprend pas. À tenir à jour avec le tarif : une mention fausse sous un prix engage le constructeur.",
        valeur:
          "Maison seule, modèle Pékin, hors terrain, hors adaptation, la maison uniquement.",
        multiligne: true,
      },
      {
        cle: "juste.phrase",
        label: "Phrase forte de la section prix",
        valeur:
          "Construire mieux en choisissant l'essentiel. Des modèles de maisons pensés dans les moindres détails, optimisés à l'essentiel jusqu'au dernier mètre carré, pour obtenir un prix maîtrisé sans compromis sur la qualité.",
        multiligne: true,
      },
      {
        cle: "juste.texte",
        label: "Paragraphe secondaire de la section prix",
        valeur:
          "Avec Maisons ESSENSYA, chaque plan est conçu par notre bureau d'études avec un mot d'ordre : uniquement l'essentiel pour maximiser le prix.",
        multiligne: true,
      },
      {
        cle: "raison.surtitre",
        label: "Petit titre de la section « Notre raison d'être »",
        valeur: "Notre raison d'être",
      },
      {
        cle: "raison.titre",
        label: "Titre de la section « Notre raison d'être »",
        aide: "Un retour à la ligne dans le champ fait un retour à la ligne à l'écran.",
        valeur: "Votre construction de maison en 3 points",
        multiligne: true,
      },
      {
        cle: "forts.surtitre",
        label: "Petit titre de la section « Nos points forts »",
        valeur: "Nos points forts",
      },
      {
        cle: "forts.titre",
        label: "Titre de la section « Nos points forts »",
        valeur: "Six raisons de construire avec nous",
        multiligne: true,
      },
      {
        cle: "opportunite.surtitre",
        label: "Petit titre de l'annonce mise en avant",
        aide: "Cette section disparaît d'elle-même quand aucune annonce n'est en coup de cœur.",
        valeur: "L'opportunité du moment",
      },
      {
        cle: "etapes.surtitre",
        label: "Petit titre de la section « Comment ça marche »",
        valeur: "Comment ça marche",
      },
      {
        cle: "etapes.titre",
        label: "Titre de la section « Comment ça marche »",
        valeur: "Quatre étapes, pas quarante",
      },
      {
        cle: "terrains.surtitre",
        label: "Petit titre de la section terrains",
        valeur: "Terrains & opportunités",
      },
      {
        cle: "terrains.titre",
        label: "Titre de la section terrains",
        valeur: "Rendre la maison concrète",
      },
      {
        cle: "terrains.texte",
        label: "Paragraphe de la section terrains",
        valeur:
          "Nos agences repèrent les parcelles compatibles avec nos modèles, souvent avant leur mise sur le marché. La maison est choisie : il ne reste qu'à trouver où la poser.",
        multiligne: true,
      },
      {
        cle: "engagements.surtitre",
        label: "Petit titre de la section « Nos engagements »",
        valeur: "Nos engagements",
      },
      {
        cle: "engagements.titre",
        label: "Titre de la section « Nos engagements »",
        valeur: "Construire en confiance",
      },
      {
        cle: "cta.surtitre",
        label: "Petit titre du formulaire de rappel",
        valeur: "Votre projet",
      },
      {
        cle: "cta.titre",
        label: "Titre du formulaire de rappel",
        valeur: "Et si votre maison était déjà dessinée ?",
      },
      {
        cle: "cta.texte",
        label: "Paragraphe du formulaire de rappel",
        valeur:
          "Parlez-nous de votre projet. Une agence Essensya vous rappelle sous 48 h, sans engagement.",
        multiligne: true,
      },
    ],
  },
  {
    cle: "concept",
    label: "Notre concept",
    blocs: [
      {
        cle: "hero.titre",
        label: "Titre de la page",
        valeur: "Le concept Essensya",
      },
      {
        cle: "hero.chapo",
        label: "Chapô de la page",
        valeur:
          "Une maison, deux déclinaisons, aucune option. Pourquoi nous n'en construisons qu'une — et pourquoi c'est votre budget qui y gagne.",
        multiligne: true,
      },
      {
        cle: "manifeste.surtitre",
        label: "Petit titre du manifeste",
        aide: "Le texte du manifeste lui-même se modifie dans l'écran Contenu.",
        valeur: "Le manifeste",
      },
      {
        cle: "chiffres.surtitre",
        label: "Petit titre de la bande de chiffres",
        valeur: "En chiffres",
      },
      {
        cle: "methode.surtitre",
        label: "Petit titre de la section « La méthode »",
        valeur: "La méthode",
      },
      {
        cle: "methode.titre",
        label: "Titre de la section « La méthode »",
        valeur: "Moins de choix.\nMieux choisis.",
        multiligne: true,
      },
      {
        cle: "etapes.surtitre",
        label: "Petit titre de la section « Comment ça marche »",
        valeur: "Comment ça marche",
      },
      {
        cle: "etapes.titre",
        label: "Titre de la section « Comment ça marche »",
        valeur: "Quatre étapes, pas quarante",
      },
      {
        cle: "engagements.surtitre",
        label: "Petit titre de la section engagements",
        valeur: "Nos engagements",
      },
      {
        cle: "engagements.titre",
        label: "Titre de la section engagements",
        valeur: "Écrits noir sur blanc",
      },
      {
        cle: "prix.surtitre",
        label: "Petit titre de la section prix",
        valeur: "Le prix",
      },
      {
        cle: "prix.titre",
        label: "Titre de la section prix",
        aide: "Les listes « compris » et « non compris » se modifient dans l'écran Contenu.",
        valeur: "Ce qu'il comprend, ce qu'il ne comprend pas",
      },
      {
        cle: "faq.surtitre",
        label: "Petit titre de la FAQ",
        valeur: "Questions fréquentes",
      },
      {
        cle: "faq.titre",
        label: "Titre de la FAQ",
        valeur: "Les réponses avant les questions",
      },
      {
        cle: "cta.surtitre",
        label: "Petit titre du bloc de fin",
        valeur: "Et maintenant",
      },
      {
        cle: "cta.titre",
        label: "Titre du bloc de fin",
        valeur: "Découvrez la maison",
      },
    ],
  },
  {
    cle: "maison",
    label: "Nos modèles",
    blocs: [
      {
        cle: "hero.surtitre",
        label: "Petit titre au-dessus du nom de la maison",
        aide: "Le nom et l'accroche de la maison se modifient dans l'écran Contenu.",
        valeur: "La maison Essensya",
      },
      {
        cle: "partiPris.surtitre",
        label: "Petit titre de la citation « Le parti-pris »",
        valeur: "Le parti-pris",
      },
      {
        cle: "architecture.surtitre",
        label: "Petit titre de la section architecture",
        valeur: "L'architecture",
      },
      {
        cle: "architecture.titre",
        label: "Titre de la section architecture",
        valeur: "Un volume simple, dessiné jusqu'au bout",
      },
      {
        cle: "gamme.surtitre",
        label: "Petit titre de la section gamme",
        valeur: "La gamme",
      },
      {
        cle: "gamme.titre",
        label: "Titre de la section gamme",
        aide: "Le nombre de modèles est repris automatiquement si vous laissez ce champ vide.",
        valeur: "",
        multiligne: true,
      },
      {
        cle: "gamme.texte",
        label: "Paragraphe de la section gamme",
        valeur:
          "Chaque plan a été optimisé poste par poste, matériau par matériau : pas de dégagement inutile, pas de recoin qui ne sert à rien. Le modèle change, la méthode ne change pas.",
        multiligne: true,
      },
      {
        cle: "prestations.surtitre",
        label: "Petit titre de la section prestations",
        valeur: "Les prestations",
      },
      {
        cle: "prestations.titre",
        label: "Titre de la section prestations",
        valeur: "Là dès le départ, pas en supplément",
      },
      {
        cle: "prix.surtitre",
        label: "Petit titre de la section prix",
        valeur: "Le prix",
      },
      {
        cle: "prix.titre",
        label: "Titre de la section prix",
        valeur: "Ce qu'il comprend, ce qu'il ne comprend pas",
      },
      {
        cle: "comparatif.surtitre",
        label: "Petit titre du comparatif",
        aide: "Le comparatif « Pourquoi c'est moins cher » a quitté l'accueil, jugée trop longue, pour cette page où le visiteur veut comprendre le prix.",
        valeur: "Le prix",
      },
      {
        cle: "dossier.surtitre",
        label: "Petit titre du formulaire de fin",
        valeur: "Le dossier",
      },
      {
        cle: "dossier.titre",
        label: "Titre du formulaire de fin",
        valeur: "Recevoir le dossier complet",
      },
      {
        cle: "dossier.texte",
        label: "Paragraphe du formulaire de fin",
        valeur:
          "Les plans cotés des deux déclinaisons, le descriptif détaillé des prestations, la liste de ce qui est compris et de ce qui ne l'est pas, et le chiffrage pour votre commune.",
        multiligne: true,
      },
    ],
  },
  {
    cle: "annonces",
    label: "Terrains & opportunités",
    blocs: [
      {
        cle: "hero.titre",
        label: "Titre de la page",
        valeur: "Terrains & maisons",
      },
      {
        cle: "hero.chapo",
        label: "Chapô de la page",
        aide: "Sert aussi de description de la page pour Google si l'écran Référencement n'en donne pas d'autre.",
        valeur:
          "Des terrains repérés par nos agences, seuls ou livrés avec la maison Essensya. Le lieu change, la maison ne change pas — et son prix non plus.",
        multiligne: true,
      },
    ],
  },
  {
    cle: "agences",
    label: "Nos agences",
    blocs: [
      {
        cle: "hero.titre",
        label: "Titre de la page",
        valeur: "Nos agences",
      },
      {
        cle: "hero.chapo",
        label: "Chapô de la page",
        aide: "Laissé vide, le site garde sa phrase d'origine — celle qui affiche automatiquement le prix de départ à jour.",
        valeur: "",
        multiligne: true,
      },
      {
        cle: "hero.lien",
        label: "Lien sous le chapô",
        valeur:
          "Votre commune n'est pas dans la liste ? Dites-nous où vous construisez",
      },
    ],
  },
  {
    cle: "contact",
    label: "Contact",
    blocs: [
      {
        cle: "hero.titre",
        label: "Titre de la page",
        valeur: "Parler de votre projet",
      },
      {
        cle: "hero.chapo",
        label: "Chapô de la page",
        aide: "Laissé vide, le site garde sa phrase d'origine — celle qui affiche automatiquement le prix de départ à jour.",
        valeur: "",
        multiligne: true,
      },
      {
        cle: "formulaire.titre",
        label: "Titre du formulaire",
        valeur: "Être recontacté",
      },
    ],
  },
];

/** Contenu par défaut : le site fonctionne même sans aucune écriture. */
export const EMPTY: Content = {
  v: 1,
  seo: [],
  realisations: [],
  tracking: { conversions: [] },
  articles: [],
  annonces: [],
  textes: {},
  medias: [],
  agences: [],
  menus: { header: [], footer: [] },
  reglages: {},
  pages: PAGES_DEFAUT,
};

/** Le contrat que tout pilote doit remplir. */
interface Pilote {
  nom: "fichier" | "supabase";
  read(): Promise<Partial<Content>>;
  write(data: Content): Promise<void>;
  writable(): Promise<boolean>;
  /** Optionnel : écriture d'un seul domaine, quand le pilote sait le faire. */
  patch?<K extends keyof Content>(key: K, value: Content[K]): Promise<void>;
}

const pilote: Pilote = supabase.isSupabaseConfigured() ? supabase : fichier;

/**
 * LA définition de « Supabase est configuré », pour tout le projet.
 *
 * Elle vivait en double — ici sur la seule présence des deux variables,
 * dans `src/lib/admin/supabase-auth.ts` avec en plus la validation du
 * schéma de l'URL. Une URL saisie sans `https://` mettait donc le
 * magasin sur Postgres pendant que l'authentification retombait sur le
 * mot de passe partagé, sans le moindre message : le client se croyait
 * sur des comptes nommés alors que le site tournait sur un secret
 * partagé. Une seule fonction, la plus stricte, tranche désormais.
 *
 * ⚠ `src/lib/admin/supabase-auth.ts` garde pour l'instant sa propre
 * copie — MOT POUR MOT la même règle — parce qu'il s'interdit d'importer
 * `@supabase/supabase-js`, que ce module-ci charge. Le jour où ce fichier
 * est rouvert, la bonne ligne est :
 *   `export { isSupabaseConfigured } from "@/lib/store";`
 */
export const isSupabaseConfigured = supabase.isSupabaseConfigured;

/** Le pilote réellement actif — le tableau de bord l'affiche au client. */
export function storeDriver(): "supabase" | "fichier" {
  return pilote.nom;
}

/* Le contenu est lu à chaque rendu de page : sans ce cache très court, on
   relit la source des dizaines de fois par requête. Il est invalidé à
   l'écriture, donc le back-office reste immédiat. */
let cache: { data: Content; at: number } | null = null;
const TTL = 5_000;

/**
 * Recompose les pages éditables : la STRUCTURE vient du code
 * (`PAGES_DEFAUT`), les VALEURS viennent du stockage.
 *
 * Conséquences voulues :
 *   · un bloc ajouté au site apparaît dans le back-office sans migration,
 *     avec le texte livré comme valeur de départ ;
 *   · un bloc retiré du code disparaît de l'écran — le client n'édite
 *     jamais un texte qui n'est plus affiché nulle part ;
 *   · une page jamais enregistrée est complète dès le premier affichage.
 * La valeur stockée d'un bloc disparu n'est plus servie : elle reste
 * consultable dans le journal des versions, pas dans l'interface.
 */
function fusionnerPages(stockees: PageEditable[] | undefined): PageEditable[] {
  /* Copie systématique : `PAGES_DEFAUT` est une constante de module,
     partagée par toutes les requêtes du processus. La rendre telle quelle
     laisserait un écran la modifier pour tous les visiteurs suivants. */
  const parCle = new Map((stockees ?? []).map((p) => [p.cle, p]));
  return PAGES_DEFAUT.map((page) => {
    const valeurs = new Map(
      (parCle.get(page.cle)?.blocs ?? []).map((b) => [b.cle, b.valeur]),
    );
    return {
      ...page,
      blocs: page.blocs.map((bloc) => {
        const valeur = valeurs.get(bloc.cle);
        return { ...bloc, ...(typeof valeur === "string" ? { valeur } : {}) };
      }),
    };
  });
}

/**
 * Complète ce que rend le pilote avec les valeurs par défaut.
 *
 * Une source écrite par une version antérieure — ou une base où un
 * domaine n'a jamais été enregistré — ne doit pas faire tomber le site
 * sur une clé manquante. Les objets sont fusionnés champ par champ ;
 * les listes, elles, remplacent : une liste vide est une intention.
 */
function normaliser(partiel: Partial<Content>): Content {
  const reglages = partiel.reglages ?? {};
  return {
    ...EMPTY,
    ...partiel,
    tracking: { ...EMPTY.tracking, ...(partiel.tracking ?? {}) },
    textes: { ...EMPTY.textes, ...(partiel.textes ?? {}) },
    medias: partiel.medias ?? EMPTY.medias,
    agences: partiel.agences ?? EMPTY.agences,
    /* Une liste remplace, elle ne fusionne pas : une liste vide est une
       intention — « je n'ai plus de réalisation à montrer ». */
    realisations: partiel.realisations ?? EMPTY.realisations,
    menus: {
      header: partiel.menus?.header ?? [],
      footer: partiel.menus?.footer ?? [],
    },
    reglages: { ...reglages, reseaux: { ...(reglages.reseaux ?? {}) } },
    pages: fusionnerPages(partiel.pages),
  };
}

export async function getContent(): Promise<Content> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const data = normaliser(await pilote.read());
  cache = { data, at: Date.now() };
  return data;
}

/* ⚠ À APPELER APRÈS CHAQUE ÉCRITURE, SANS EXCEPTION.

   Les lectures Supabase sont étiquetées (`TAG_MAGASIN`, voir ./supabase)
   pour que les pages publiques restent pré-générées. Le revers : sans
   cette invalidation, une modification enregistrée resterait invisible
   jusqu'à une minute — et les `revalidatePath()` des écrans d'admin
   régénéreraient les pages À PARTIR DE LA RÉPONSE HTTP PÉRIMÉE. C'est
   exactement la panne qu'on vient de corriger ; elle ne donnait aucun
   message d'erreur.

   Elle vit ici, dans le magasin, et pas dans les vingt-sept écrans qui
   écrivent : un écran ajouté demain en hérite sans y penser.

   Le cache mémoire de ce module (`cache`) est à jour dès l'écriture, donc
   une page régénérée dans la foulée ne repasse même pas par le réseau. */
function invaliderDataCache(): void {
  /* `updateTag` est fait pour ce cas exact — « lire sa propre écriture » :
     la requête suivante ATTEND la donnée fraîche au lieu de servir du
     périmé. C'est ce qu'il faut quand le client vient d'enregistrer et
     rouvre sa page pour vérifier. Mais il n'existe que dans une action
     serveur (doc : 04-functions/updateTag.md).

     Hors de ce contexte — un gestionnaire de route, par exemple le
     téléversement de médias — il lève. On y retombe alors sur
     `revalidateTag(tag, { expire: 0 })`, la voie documentée pour une
     expiration immédiate ailleurs que dans une action.

     Dernier recours : on prévient et on continue. Le contenu est déjà
     écrit ; on ne fait pas échouer l'enregistrement du client pour une
     histoire de cache, et `FRAICHEUR` borne l'écart à une minute. */
  try {
    updateTag(TAG_MAGASIN);
  } catch {
    try {
      revalidateTag(TAG_MAGASIN, { expire: 0 });
    } catch (e) {
      console.warn("[store] invalidation du cache impossible :", e);
    }
  }
}

export async function saveContent(next: Content): Promise<void> {
  const data: Content = { ...next, v: 1, majLe: new Date().toISOString() };
  await pilote.write(data);
  cache = { data, at: Date.now() };
  invaliderDataCache();
}

/** Modifie un domaine sans toucher aux autres. */
export async function patchContent<K extends keyof Content>(
  key: K,
  value: Content[K],
): Promise<Content> {
  const current = await getContent();
  const next: Content = {
    ...current,
    [key]: value,
    v: 1,
    majLe: new Date().toISOString(),
  };
  /* Quand le pilote sait écrire un domaine seul (Supabase), on le laisse
     faire : réécrire l'ensemble à chaque virgule corrigée ferait tourner
     cinq requêtes au lieu d'une et noierait le journal des versions. */
  if (pilote.patch) await pilote.patch(key, value);
  else await pilote.write(next);
  cache = { data: next, at: Date.now() };
  invaliderDataCache();
  return next;
}

/** Vide le cache — à appeler après une écriture faite hors du magasin.
 *  Cas concret : un téléversement ajoute une fiche dans `medias` sans
 *  passer par `patchContent`, la médiathèque doit la voir tout de suite. */
export function invaliderCache(): void {
  cache = null;
}

/** Vrai si le pilote sait écrire — le back-office l'affiche clairement. */
export async function isWritable(): Promise<boolean> {
  return pilote.writable();
}

export type { Content } from "./types";
