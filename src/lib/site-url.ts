/* ════════════════════════════════════════════════════════════════
   L'ADRESSE PUBLIQUE DU SITE — un seul endroit qui la résout

   Elle sert aux URLs canoniques, aux images de partage, au sitemap, au
   robots.txt et au contrôle d'origine de /api/leads. Ces cinq usages
   doivent voir exactement la même valeur.

   ⚠ POURQUOI CE MODULE EXISTE
   Un build Netlify a échoué sur `new URL("$URL")`. `netlify.toml`
   contenait `NEXT_PUBLIC_SITE_URL = "$URL"`, en supposant que Netlify
   développerait la variable — il n'en fait rien, la chaîne arrive
   littéralement. Le prérendu de /blog est tombé, et avec lui tout le
   déploiement.

   La leçon retenue ici : une adresse mal configurée doit dégrader le
   référencement, jamais casser le build. Tout passe donc par une
   validation, et la cascade de replis est explicite plutôt que
   dispersée dans neuf fichiers.
   ════════════════════════════════════════════════════════════════ */

const LOCAL = "http://localhost:3000";

/** Une URL http(s) exploitable, ou `null`. Absorbe "$URL", "", "undefined". */
function valide(v: string | undefined): string | null {
  const s = v?.trim();
  if (!s || s.startsWith("$")) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    /* Pas de barre finale : toutes les concaténations du projet écrivent
       `${BASE}/chemin`, une barre en trop donnerait `//chemin`. */
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * L'adresse publique, dans l'ordre de priorité :
 *
 *  1. `NEXT_PUBLIC_SITE_URL` — ce que le développeur a explicitement posé ;
 *  2. `URL` — injectée par Netlify, l'adresse principale du site ;
 *  3. `DEPLOY_PRIME_URL` — injectée par Netlify sur une preview de branche ;
 *  4. localhost — dernier recours, qui fait servir `Disallow: /`.
 *
 * Les deux variables Netlify sont lues directement plutôt que recopiées
 * dans `netlify.toml` : c'est la seule façon d'obtenir leur VALEUR.
 */
export const SITE_URL: string =
  valide(process.env.NEXT_PUBLIC_SITE_URL) ??
  valide(process.env.URL) ??
  valide(process.env.DEPLOY_PRIME_URL) ??
  LOCAL;

/** `true` si l'adresse a été réellement configurée. */
export const siteUrlConfiguree = (): boolean => SITE_URL !== LOCAL;

/**
 * Vrai seulement pour une adresse de production plausible.
 *
 * On ne cherche pas à reconnaître la prod par son domaine — il est encore
 * inconnu — mais à écarter tout ce qui n'en est manifestement pas une.
 * Se tromper dans ce sens coûte un robots.txt trop strict ; l'inverse
 * coûte le site en double dans l'index de Google.
 */
export function estProduction(url: string = SITE_URL): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:") return false;
    if (/^(localhost$|127\.|0\.0\.0\.0$|\[|\d+\.\d+\.\d+\.\d+$)/.test(hostname)) return false;
    // Sous-domaines techniques des plateformes de déploiement.
    if (/\.(netlify|vercel|pages\.dev|onrender|fly)\.(app|dev|com)$/.test(hostname)) return false;
    if (/^(deploy-preview|preview|staging|recette|dev|test)[.-]/.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}
