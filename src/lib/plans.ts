import { estPubliable, modelesAvecVisuels, type Modele } from "@/data/gamme";

/* ════════════════════════════════════════════════════════════════
   LES PLANS PAR NOMBRE DE CHAMBRES — /plans-de-maison/N-chambres

   Le menu « Plans de maisons » se découpe en « Plans maison 1 chambre »,
   « 2 chambres »… Ces liens mènent aux MODÈLES DE LA GAMME qui ont ce
   nombre de chambres. Ils menaient au listing des annonces filtré
   (/annonces?chambres=N) : le client a corrigé — « Plans de maisons »
   est le catalogue de ses modèles, pas son stock de terrains + maisons.
   Le filtre `?chambres=N` du listing reste, il n'est simplement plus la
   destination du menu.

   ⚠ LE NOMBRE EXACT, COMME LE MENU : « 2 chambres » ne montre pas les
   modèles à trois.

   ⚠ LA DONNÉE EST CELLE DE src/data/gamme.ts, et rien ne garantit
   qu'elle soit complète : les onze modèles ont leur nombre de chambres
   depuis le tableau du 08/10, mais un modèle peut arriver avec ses
   rendus avant ses chiffres. Un modèle sans nombre de chambres n'apparaît
   sur AUCUNE de ces pages : le ranger au jugé ferait annoncer à un
   visiteur une maison 3 chambres qui en a deux. Les pages le disent et
   listent ces modèles à part (`modelesChambresInconnues`) ; chacun
   rejoint sa page le jour où son `chambres` est saisi dans gamme.ts,
   sans qu'on touche une ligne ici.

   ⚠ AUCUN IMPORT DE CE MODULE DANS LA NAVIGATION. src/data/navigation.ts
   est lu par l'en-tête, composant client : passer par ici y tirerait la
   gamme et son catalogue de visuels. Les liens du menu, du pied de page
   et du plan du site écrivent donc leurs adresses en toutes lettres.
   ════════════════════════════════════════════════════════════════ */

/** Les pages, de 1 à 4 chambres, comme le menu. */
export const CHAMBRES_PLANS = [1, 2, 3, 4] as const;

/** « 1-chambre », « 3-chambres ». */
export const slugPlans = (n: number) => `${n}-chambre${n > 1 ? "s" : ""}`;

export const urlPlans = (n: number) => `/plans-de-maison/${slugPlans(n)}`;

/** L'inverse de `slugPlans`, borné aux pages qui existent. */
export const chambresDuSlugPlans = (slug: string): number | null =>
  CHAMBRES_PLANS.find((n) => slugPlans(n) === slug) ?? null;

/** « 1 chambre », « 3 chambres ». */
export const libelleChambres = (n: number) => `${n} chambre${n > 1 ? "s" : ""}`;

/** Les modèles montrables qui ont exactement `n` chambres. */
export const modelesAChambres = (n: number): Modele[] =>
  modelesAvecVisuels().filter((m) => m.chambres === n);

/** Les modèles montrables dont on ne connaît pas encore le nombre de chambres. */
export const modelesChambresInconnues = (): Modele[] =>
  modelesAvecVisuels().filter((m) => m.chambres === undefined);

/**
 * La page mérite-t-elle l'index ? Il lui faut au moins un modèle
 * publiable (voir `estPubliable`) : une page qui ne liste rien, ou que
 * des fiches elles-mêmes hors index, n'a rien à proposer à Google.
 * Même règle pour le sitemap.
 */
export const plansPubliables = (n: number): boolean =>
  modelesAChambres(n).some(estPubliable);
