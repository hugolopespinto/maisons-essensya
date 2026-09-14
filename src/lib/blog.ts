import type { Article } from "@/lib/store/types";

/* ════════════════════════════════════════════════════════════════
   LE FILTRE ÉDITORIAL DU BLOG — une seule copie

   Un article n'est public que s'il n'est pas un brouillon, qu'il porte
   une date de publication et qu'il a un slug. Servir un brouillon une
   seule fois suffit à le faire indexer, et sortir une page de l'index
   prend des semaines : c'est la règle de sécurité du blog.

   ⚠ POURQUOI CE FICHIER EXISTE, alors que la règle était jusqu'ici
   recopiée à dessein dans `/blog` et `/blog/[slug]` — avec ce
   commentaire : « on préfère répéter quatre lignes ». L'argument se
   tenait : chaque page applique alors le filtre pour son propre compte,
   sans dépendre d'un import qu'on pourrait oublier.

   Ce qui l'a emporté, c'est une mesure et non une préférence. Dans ce
   même dépôt, `versAgency()` était copié à l'identique dans deux pages,
   avec des deux côtés un commentaire affirmant qu'elles l'étaient — et
   elles avaient divergé. Une des deux avait gagné un correctif, l'autre
   non, et rien ne l'avait signalé. Une règle de sécurité recopiée trois
   fois n'est pas trois fois plus sûre : elle a trois fois plus d'endroits
   où se périmer. Le sitemap aurait été la troisième copie.
   ════════════════════════════════════════════════════════════════ */

/** Les articles réellement publics, du plus récent au plus ancien. */
export const articlesPublies = (articles: Article[]): Article[] =>
  articles
    .filter((a) => !a.brouillon && !!a.publieLe && !!a.slug)
    .sort((a, b) => (b.publieLe ?? "").localeCompare(a.publieLe ?? ""));
