/* ════════════════════════════════════════════════════════════════
   MARKDOWN → HTML — convertisseur minimal, sans dépendance

   C'est le SEUL endroit du projet où du contenu saisi dans le
   back-office devient du HTML injecté dans la page. Tout le reste du
   site passe par React, qui échappe pour nous. Ici non : le corps d'un
   article est rendu avec `dangerouslySetInnerHTML`. Cette fonction est
   donc la frontière de confiance, et elle est écrite comme telle.

   ── STRATÉGIE D'ÉCHAPPEMENT ──
   Un seul principe, appliqué dans cet ordre et jamais dans l'autre :

     1. ON ÉCHAPPE TOUT, D'ABORD. `escapeHtml()` est appliqué à
        l'intégralité de la source AVANT la moindre analyse Markdown.
        À la sortie de cette étape, la chaîne ne contient plus un seul
        caractère capable d'ouvrir une balise ou un attribut : ni `<`,
        ni `>`, ni `"`, ni `'`, ni `&` non entitisé.

     2. ON N'AJOUTE QUE DU BALISAGE QUE L'ON ÉCRIT NOUS-MÊMES. Après
        l'étape 1, les seules balises du résultat sont les littéraux
        présents dans ce fichier (`<h2>`, `<p>`, `<strong>`, `<a …>`…).
        Aucune portion de la saisie ne peut redevenir du balisage :
        `<script>` saisi par le client ressort `&lt;script&gt;`, c'est-
        à-dire du texte affiché, jamais un script exécuté.

     3. LES URL SONT VALIDÉES EN PLUS, PAS À LA PLACE. L'échappement
        interdit déjà de sortir de l'attribut (`"` est devenu `&quot;`),
        mais il n'interdit pas `javascript:alert(1)` — qui ne contient
        aucun caractère spécial. `safeHref()` impose donc une liste
        blanche de schémas. Une URL refusée n'est pas rendue en lien :
        seul son libellé (déjà échappé) subsiste.

   Corollaire à retenir si ce fichier évolue : toute nouvelle règle
   Markdown doit se contenter de reconnaître un motif dans la chaîne
   DÉJÀ échappée et d'émettre des balises littérales. Le jour où l'on
   voudrait autoriser du HTML dans les articles, ce n'est pas une
   ligne à modifier ici — c'est un assainisseur (DOMPurify et un DOM
   côté serveur) à introduire, et cette note à réécrire.

   ── PÉRIMÈTRE ──
   Volontairement réduit à ce dont un article de blog a besoin :
   titres `##` / `###`, paragraphes, listes à puces et numérotées,
   gras, italique, liens. Pas d'images (elles passent par le champ
   dédié de l'article), pas de tableaux, pas de HTML brut.
   ════════════════════════════════════════════════════════════════ */

/* ════ 1. ÉCHAPPEMENT ════ */

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Neutralise les cinq caractères qui permettent d'ouvrir une balise ou de
 * s'échapper d'un attribut. `&` est traité en premier par la classe de
 * caractères elle-même — le remplacement est simultané, on ne risque donc
 * pas de ré-échapper les `&` que l'on vient d'introduire.
 */
const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ENTITIES[c]);

/* ════ 2. LIENS ════ */

/** Les seuls schémas d'URL rendus en lien. Tout le reste est refusé. */
const SCHEMAS = ["http", "https", "mailto", "tel"];

/**
 * Renvoie l'URL si elle est sûre, `null` sinon.
 *
 * Reçoit une chaîne DÉJÀ échappée : `"` y est devenu `&quot;`, il n'y a donc
 * aucun moyen de refermer l'attribut `href`. Ce qui reste à écarter, c'est
 * le schéma exécutable (`javascript:`, `data:`, `vbscript:`) qui, lui,
 * ne contient que des caractères parfaitement anodins.
 *
 * Une obfuscation du type `java&#x73;cript:` ne passe pas non plus : après
 * échappement elle vaut `java&amp;#x73;cript:`, qui n'est plus un schéma
 * reconnu par la regex ci-dessous et tombe donc dans le refus.
 */
function safeHref(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  /* Caractères de contrôle : le seul intérêt de les glisser dans une URL
     est de casser l'analyse du schéma par le navigateur. */
  if (/[\u0000-\u001F\u007F]/.test(url)) return null;
  /* Lien interne ou ancre : sûrs par construction, aucun schéma possible. */
  if (url.startsWith("/") || url.startsWith("#")) return url;
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(url);
  /* Ni chemin interne, ni schéma explicite (« exemple.fr ») : refusé plutôt
     que réparé. Deviner l'intention d'une URL est un mauvais réflexe ici. */
  if (!m) return null;
  return SCHEMAS.indexOf(m[1].toLowerCase()) === -1 ? null : url;
}

/* ════ 3. INLINE ════ */

/**
 * Applique les règles de niveau caractère à un fragment DÉJÀ échappé.
 *
 * Toutes les substitutions passent par une fonction de remplacement et
 * jamais par une chaîne à `$1` : un contenu comportant `$&` ou `$'` serait
 * sinon réinterprété par `String.replace`, ce qui duplique du texte et,
 * dans le pire des cas, recompose des séquences inattendues.
 */
function inline(text: string): string {
  let out = text;

  /* Liens — traités en premier : leur libellé peut contenir du gras, mais
     leur URL ne doit surtout pas être réécrite par les règles suivantes. */
  out = out.replace(/\[([^\]\n]*)\]\(([^)\s]+)\)/g, (whole, label: string, href: string) => {
    const safe = safeHref(href);
    /* URL refusée : on garde le libellé en texte. Ne rien afficher ferait
       disparaître du contenu sans que l'auteur comprenne pourquoi. */
    if (!safe) return label || whole;
    /* `rel` sur les liens sortants : un article de blog est exactement
       l'endroit où un lien externe finit par pointer ailleurs qu'on
       croyait. `noopener` est une protection, `nofollow` un choix SEO. */
    const externe = /^https?:/i.test(safe);
    const attrs = externe ? ' target="_blank" rel="noopener nofollow"' : "";
    return `<a href="${safe}"${attrs}>${label}</a>`;
  });

  /* Gras avant italique : sinon `**mot**` serait lu comme deux `*`. */
  out = out.replace(/\*\*([^\n]+?)\*\*/g, (_m, c: string) => `<strong>${c}</strong>`);
  out = out.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, (_m, before: string, c: string) => `${before}<em>${c}</em>`);
  /* `_` n'est reconnu qu'en bordure de mot : sinon `nom_de_variable`
     deviendrait de l'italique au milieu d'un mot. */
  out = out.replace(/(^|[\s(])_([^_\n]+?)_(?=[\s).,;:!?]|$)/g, (_m, before: string, c: string) => `${before}<em>${c}</em>`);

  return out;
}

/* ════ 4. BLOCS ════ */

/* ⚠ EXPORTÉES POUR N'ÊTRE ÉCRITES QU'UNE FOIS. L'analyseur des pages
   légales (src/lib/legal/analyse.ts) reconnaît la même grammaire de blocs
   mais rend un arbre JSX au lieu d'une chaîne HTML. Deux émetteurs, une
   seule grammaire : recopier ces motifs garantirait qu'un jour une liste
   se comporte différemment dans le blog et dans les mentions légales. */
export const PUCE = /^[-*]\s+(.*)$/;
export const NUM = /^\d{1,3}[.)]\s+(.*)$/;

/** Assemble une liste à partir des lignes d'un bloc. */
function liste(lignes: string[], motif: RegExp, balise: "ul" | "ol"): string {
  const items: string[] = [];
  for (const ligne of lignes) {
    const m = motif.exec(ligne);
    if (m) {
      items.push(m[1]);
    } else if (items.length > 0) {
      /* Ligne de continuation : elle prolonge l'item précédent plutôt que
         d'en ouvrir un vide. */
      items[items.length - 1] += ` ${ligne.trim()}`;
    }
  }
  const html = items.map((i) => `<li>${inline(i.trim())}</li>`).join("");
  return `<${balise}>${html}</${balise}>`;
}

/**
 * Rend un bloc, titre compris, SANS PERDRE CE QUI LE SUIT.
 *
 * ⚠ LE DÉFAUT CORRIGÉ ICI FAISAIT DISPARAÎTRE DU TEXTE EN SILENCE. Le
 * code reconnaissait un titre sur la première ligne d'un bloc, émettait
 * le `<h2>`, puis passait au bloc suivant — jetant toutes les lignes
 * restantes. Autrement dit, ceci :
 *
 *     ## Vos droits
 *     Vous disposez d'un droit d'accès et d'effacement.
 *
 * rendait le titre, et rien d'autre. Le paragraphe n'apparaissait nulle
 * part, aucune erreur n'était levée, et l'auteur ne pouvait s'en
 * apercevoir qu'en relisant la page publique ligne à ligne.
 *
 * Personne ne l'avait vu parce que le blog, seul consommateur jusqu'ici,
 * sépare naturellement ses titres par une ligne vide. Les pages légales
 * vont être écrites par un juriste dans un champ de six lignes : l'oubli
 * de la ligne vide y sera la norme, et le texte perdu serait du texte
 * qui engage.
 *
 * Le titre est donc émis, puis LE RESTE est rendu à son tour — ce qui
 * enchaîne correctement un titre suivi d'une liste ou d'un paragraphe.
 */
function rendreLignes(lignes: string[], html: string[]): void {
  if (lignes.length === 0) return;
  const premiere = lignes[0];

  /* `###` avant `##`, l'inverse mangerait le troisième dièse. `#` seul
     n'est pas reconnu : le h1 d'une page est son titre, saisi à part —
     deux h1 dans une page est une erreur de référencement. */
  const h3 = /^###\s+(.*)$/.exec(premiere);
  if (h3) {
    html.push(`<h3>${inline(h3[1].trim())}</h3>`);
    rendreLignes(lignes.slice(1), html);
    return;
  }
  const h2 = /^##\s+(.*)$/.exec(premiere);
  if (h2) {
    html.push(`<h2>${inline(h2[1].trim())}</h2>`);
    rendreLignes(lignes.slice(1), html);
    return;
  }

  if (PUCE.test(premiere)) {
    html.push(liste(lignes, PUCE, "ul"));
    return;
  }
  if (NUM.test(premiere)) {
    html.push(liste(lignes, NUM, "ol"));
    return;
  }

  /* Paragraphe : les retours à la ligne simples sont conservés en `<br />`.
     Un auteur qui va à la ligne dans le champ attend de la voir. */
  html.push(`<p>${lignes.map((l) => inline(l.trim())).join("<br />")}</p>`);
}

/**
 * Convertit du Markdown léger en HTML sûr.
 *
 * @param source Texte saisi dans le back-office. Peut être vide.
 * @returns Fragment HTML destiné à `dangerouslySetInnerHTML`.
 */
export function markdownToHtml(source: string): string {
  if (!source) return "";

  /* ÉTAPE 1 — on échappe la totalité de l'entrée. Rien, après cette ligne,
     ne peut plus devenir une balise : tout ce qui suit se contente de
     reconnaître des motifs et d'émettre du balisage littéral. */
  const texte = escapeHtml(source.replace(/\r\n?/g, "\n"));

  /* Un bloc = une suite de lignes séparée des autres par une ligne vide.
     C'est la seule structure dont Markdown a besoin ici. */
  const blocs = texte.split(/\n{2,}/);
  const html: string[] = [];

  for (const brut of blocs) {
    const bloc = brut.trim();
    if (!bloc) continue;

    rendreLignes(bloc.split("\n"), html);
  }

  return html.join("\n");
}

/**
 * Version texte brut du Markdown — pour une meta description ou un extrait.
 *
 * Aucun enjeu de sécurité ici (le résultat repart dans du JSX, donc
 * rééchappé par React), mais l'inverse est vrai : on ne doit PAS rendre ce
 * texte avec `dangerouslySetInnerHTML`. D'où le nom explicite.
 */
export function markdownToText(source: string, max = 0): string {
  if (!source) return "";
  const texte = source
    .replace(/\r\n?/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d{1,3}[.)]\s+/gm, "")
    .replace(/\[([^\]\n]*)\]\([^)\s]*\)/g, "$1")
    .replace(/\*\*([^\n]+?)\*\*/g, "$1")
    .replace(/\*([^*\n]+?)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!max || texte.length <= max) return texte;
  /* Coupe sur un espace : « …construction d'une mai » est illisible en SERP. */
  const coupe = texte.slice(0, max);
  const esp = coupe.lastIndexOf(" ");
  return `${(esp > max * 0.6 ? coupe.slice(0, esp) : coupe).trim()}…`;
}
