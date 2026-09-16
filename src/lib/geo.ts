import "server-only";
import { getAnnonces } from "@/lib/vitahome/annonces";
import type { Annonce } from "@/types";

/* ════════════════════════════════════════════════════════════════
   PAGES GÉOGRAPHIQUES

   Le premier canal d'acquisition d'un constructeur, et il était à zéro.
   « terrain à bâtir charente-maritime », « maison à construire la
   rochelle » : ces requêtes ont du volume, une intention d'achat nette,
   et aucune page du site ne pouvait les capter — /annonces est une seule
   URL pour 93 parcelles réparties sur 12 départements.

   Le flux fournit déjà tout : `deptCode`, `dept`, `city`, `zip`.
   Il n'y a rien à saisir, rien à maintenir : les pages suivent le stock.

   ⚠ LA RÈGLE QUI PROTÈGE DE L'EFFET INVERSE
   Générer une page par commune produirait des dizaines de pages à une
   annonce, quasi identiques entre elles. Google appelle ça du contenu
   mince, et il ne se contente pas de les ignorer : il dévalue le site
   qui les produit. On impose donc un seuil aux DEUX niveaux. Une zone
   sous le seuil reste accessible par le listing filtré, elle n'a
   simplement pas sa page dédiée.
   ════════════════════════════════════════════════════════════════ */

/** En dessous, la commune n'a pas assez de matière pour une page propre. */
export const SEUIL_COMMUNE = 2;

/* Le département a besoin d'un seuil À LUI, et c'est le jeu de démo qui
   l'a montré : la Vendée n'y porte qu'UNE annonce. Une page
   « Terrains à bâtir en Vendée » construite sur une parcelle unique est
   précisément le contenu mince que ce fichier prétend éviter — le seuil
   des communes ne l'aurait pas arrêtée, puisqu'il ne regarde pas ce
   niveau-là. Trois annonces, c'est le minimum pour qu'une page de zone
   raconte autre chose que sa fiche. */
export const SEUIL_DEPARTEMENT = 3;

/** « Saint-Benoist-sur-Mer » → « saint-benoist-sur-mer ». */
export function slug(s: string): string {
  return s
    .normalize("NFD")
    /* `\p{Mn}` désigne les marques combinantes que produit NFD, PAR LEUR
       NOM plutôt que par un intervalle. Écrit en clair, cet intervalle est
       invisible à la relecture, et un éditeur le renormalise sans prévenir
       — ce qui est arrivé ici deux fois. */
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface Departement {
  /** Code INSEE : « 17 », « 2A »… */
  code: string;
  /** Nom en clair, tel que servi par le flux. */
  nom: string;
  slug: string;
  annonces: Annonce[];
  communes: Commune[];
}

export interface Commune {
  nom: string;
  slug: string;
  /** Code postal le plus fréquent — une commune peut en avoir plusieurs. */
  cp: string;
  annonces: Annonce[];
  departement: { code: string; nom: string; slug: string };
}

/* Un département sans nom exploitable n'aurait qu'un code pour titre :
   on ne fabrique pas une page « 17 ». */
const nomDept = (a: Annonce) => a.dept?.trim() || "";

/**
 * Le stock réel, groupé. Recalculé à chaque appel mais `getAnnonces()`
 * est déjà mis en cache par l'ISR : pas de coût supplémentaire.
 */
export async function geographie(): Promise<Departement[]> {
  const annonces = await getAnnonces();
  const parDept = new Map<string, Annonce[]>();

  for (const a of annonces) {
    if (!a.deptCode || !nomDept(a)) continue;
    parDept.set(a.deptCode, [...(parDept.get(a.deptCode) ?? []), a]);
  }

  return [...parDept.entries()]
    .map(([code, liste]) => {
      const nom = nomDept(liste[0]);
      const dept = { code, nom, slug: slug(nom) };

      const parCommune = new Map<string, Annonce[]>();
      for (const a of liste) {
        if (!a.city?.trim()) continue;
        parCommune.set(a.city, [...(parCommune.get(a.city) ?? []), a]);
      }

      const communes: Commune[] = [...parCommune.entries()]
        .map(([nomCommune, sub]) => ({
          nom: nomCommune,
          slug: slug(nomCommune),
          cp: sub.find((x) => x.zip)?.zip ?? "",
          annonces: sub,
          departement: dept,
        }))
        /* Les communes les mieux pourvues d'abord : c'est l'ordre utile
           au visiteur, et celui qui met en avant les pages qui existent. */
        .sort((x, y) => y.annonces.length - x.annonces.length || x.nom.localeCompare(y.nom, "fr"));

      return { code, nom, slug: dept.slug, annonces: liste, communes };
    })
    .sort((x, y) => y.annonces.length - x.annonces.length || x.nom.localeCompare(y.nom, "fr"));
}

/**
 * Toutes les communes du flux, pour l'auto-complétion des formulaires.
 *
 * ⚠ RIEN À VOIR AVEC LE SEUIL DE PUBLICATION. Les pages de zone ne sont
 * créées qu'au-dessus de `SEUIL_COMMUNE`, parce qu'une page doit avoir
 * de quoi se lire. Une liste de suggestions, elle, n'a pas ce problème :
 * plus elle est complète, plus elle aide. Une commune où nous n'avons
 * qu'un terrain reste une commune où nous construisons — la retirer de
 * l'auto-complétion ferait croire au visiteur qu'on ne la couvre pas.
 *
 * Le code postal accompagne le nom : le flux en sert un par annonce, et
 * c'est souvent par lui qu'on cherche sa commune plutôt que par son
 * orthographe exacte.
 */
export async function communesConnues(): Promise<{ nom: string; cp: string }[]> {
  const annonces = await getAnnonces();
  const vues = new Map<string, string>();
  for (const a of annonces) {
    const nom = a.city?.trim();
    if (!nom || vues.has(nom)) continue;
    vues.set(nom, a.zip?.trim() ?? "");
  }
  return [...vues.entries()]
    .map(([nom, cp]) => ({ nom, cp }))
    .sort((x, y) => x.nom.localeCompare(y.nom, "fr"));
}

/** Les communes qui méritent leur page — seuil appliqué ici, une seule fois. */
export const communesPubliables = (d: Departement): Commune[] =>
  d.communes.filter((c) => c.annonces.length >= SEUIL_COMMUNE);

/**
 * Les départements qui méritent leur page. C'est cette liste — et pas
 * `geographie()` — que doivent lire l'arborescence, le sitemap et les
 * liens du pied de page : ce qui n'est pas publiable ne doit être ni
 * annoncé à Google, ni proposé au visiteur.
 */
export async function departementsPubliables(): Promise<Departement[]> {
  return (await geographie()).filter((d) => d.annonces.length >= SEUIL_DEPARTEMENT);
}

export async function departementParSlug(s: string): Promise<Departement | null> {
  /* Même raison qu'en dessous pour les communes : une URL forgée à la
     main vers un département sous le seuil doit rendre 404. Sinon la
     page existe quand même, simplement sans lien vers elle — ce qui ne
     protège de rien, un crawler la trouvera par le sitemap d'un
     concurrent ou par un lien externe. */
  return (await departementsPubliables()).find((d) => d.slug === s) ?? null;
}

export async function communeParSlug(
  slugDept: string,
  slugCommune: string,
): Promise<Commune | null> {
  const d = await departementParSlug(slugDept);
  if (!d) return null;
  /* On ne sert QUE les communes au-dessus du seuil : une URL forgée à la
     main vers une commune à une annonce doit rendre 404, sinon on
     réintroduit par la fenêtre le contenu mince qu'on évite par la porte. */
  return communesPubliables(d).find((c) => c.slug === slugCommune) ?? null;
}

/**
 * L'agence qui couvre la zone : celle qui revendique le plus de ses
 * communes. C'est le SEUL contenu de la page qui ne se déduit pas du
 * stock — et donc celui qui justifie qu'un visiteur de Saintes ne lise
 * pas la page de La Rochelle. Sans lui, deux pages de zone ne
 * diffèreraient que par leurs nombres.
 *
 * Comparaison sur les slugs : le flux écrit « SAINT-CÉSAIRE », le client
 * saisit « Saint-Césaire » dans le back-office. Comparer les chaînes
 * brutes ne rattacherait jamais rien, en silence.
 *
 * Rend `null` plutôt qu'une agence au hasard : une page sans encart vaut
 * mieux qu'une page qui envoie le visiteur à trois heures de route.
 */
export function agenceDeZone<T extends { cities: string[] }>(
  agences: T[],
  communes: string[],
): T | null {
  const cibles = new Set(communes.map(slug));
  let meilleure: T | null = null;
  let meilleurScore = 0;
  for (const a of agences) {
    const score = a.cities.filter((v) => cibles.has(slug(v))).length;
    if (score > meilleurScore) {
      meilleurScore = score;
      meilleure = a;
    }
  }
  return meilleure;
}

/* ════ CHIFFRES AFFICHÉS ════
   Ce qui rend une page géographique utile plutôt que dupliquée : des
   nombres qui lui sont propres. Tous calculés sur le stock réel. */
export interface Chiffres {
  total: number;
  terrains: number;
  avecMaison: number;
  prixMin: number | null;
  surfaceMediane: number | null;
}

export function chiffres(annonces: Annonce[]): Chiffres {
  const prix = annonces.map((a) => a.price).filter((p): p is number => p !== null);
  const surfaces = annonces
    .map((a) => a.landSurface)
    .filter((s): s is number => s !== null)
    .sort((a, b) => a - b);

  return {
    total: annonces.length,
    terrains: annonces.filter((a) => a.type === "terrain").length,
    avecMaison: annonces.filter((a) => a.type === "terrain-maison").length,
    prixMin: prix.length ? Math.min(...prix) : null,
    surfaceMediane: surfaces.length ? surfaces[Math.floor(surfaces.length / 2)] : null,
  };
}
