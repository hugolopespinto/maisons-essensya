import { CLE_INTRO, FILM_ACCUEIL, LARGEUR_MINI_FILM } from "@/data/film-accueil";

/* ════════════════════════════════════════════════════════════════
   L'ÉCRAN DE CHARGEMENT DE L'ACCUEIL — option B, choisie par le client

   Un aplat craie, le logo, un compteur qui suit le VRAI téléchargement
   du film, puis la page se dévoile en tache d'encre. Repris du site
   Makhno Studio, montré en démo, et retenu en connaissance de cause.

   ⚠ CE CHOIX REVIENT SUR UN RETOUR ANTÉRIEUR, ET C'EST VOULU. L'ancien
   hero animé avait été retiré parce que « cela donne l'impression que
   le site ne fonctionne pas avec l'animation qui arrive tardivement ».
   La démo affichait noir sur blanc le prix de l'option B — 3,7 s avant
   de pouvoir lire le titre — face à une option A sans attente. Le
   client a choisi B. Mesuré sur le build : 4,5 s en local, chargement
   de la page compris. Les garde-fous qui suivent sont ce qui la rend
   défendable ; ils ne sont pas négociables.

   1. UNE FOIS PAR VISITE. Les retours suivants sur l'accueil passent
      par l'arrivée sans attente (le film à l'encre, texte immédiat).
   2. JAMAIS SUR MOBILE, ni si le système demande moins d'animations, ni
      en mode économie de données : mêmes critères que le film lui-même.
   3. TOUJOURS PASSABLE : bouton « Passer l'intro », Échap, ou Tab.
   4. JAMAIS BLOQUANT : au bout de 8 s, le film est abandonné et la page
      s'ouvre sur la photo. Si le JavaScript de la page ne démarre pas du
      tout, le script ci-dessous rend la main seul, au même délai.

   ── POURQUOI UN SCRIPT DANS LE <head> ──
   L'écran doit couvrir la page DÈS LA PREMIÈRE IMAGE, sinon le visiteur
   voit l'accueil, puis l'écran qui le recouvre : le pire des deux mondes.
   Or le serveur ne peut pas savoir si le visiteur est sur mobile ni s'il
   est déjà passé. Le script tranche pendant la lecture du HTML, avant
   tout affichage, et pose `data-intro-accueil` sur <html>. Tout le reste
   (masquer le texte, montrer l'écran) est du CSS qui dépend de ce
   drapeau — voir « ÉCRAN DE CHARGEMENT » dans accueil.css.
   ════════════════════════════════════════════════════════════════ */

/** Délai au-delà duquel le script rend la main si HeroFilm n'a pas pris
    le relais : le JavaScript de la page a échoué ou n'arrive pas. */
const ABANDON_MS = 8000;

/* Écrit en ES5 : il s'exécute avant tout polyfill. `try` global : un
   sessionStorage refusé (navigation privée stricte) ne doit rien casser
   — on ne joue simplement pas l'écran. Le préchargement du film n'est
   lancé QUE pour les visiteurs qui auront l'écran : pour les autres, il
   coûterait 5 Mo pour rien. */
const SCRIPT = `(function(){try{
var d=document.documentElement,c=navigator.connection;
if(location.pathname!=="/"||innerWidth<${LARGEUR_MINI_FILM})return;
if(matchMedia("(prefers-reduced-motion: reduce)").matches||(c&&c.saveData))return;
if(sessionStorage.getItem(${JSON.stringify(CLE_INTRO)}))return;
sessionStorage.setItem(${JSON.stringify(CLE_INTRO)},"1");
var l=document.createElement("link");l.rel="preload";l.as="fetch";l.crossOrigin="anonymous";l.href=${JSON.stringify(FILM_ACCUEIL.src)};document.head.appendChild(l);
d.setAttribute("data-intro-accueil","");
var e=window.__introAccueil={t0:performance.now(),pilote:false,fini:false};
setTimeout(function(){if(!e.pilote){e.fini=true;d.removeAttribute("data-intro-accueil")}},${ABANDON_MS});
}catch(x){}})();`;

/** À poser dans le <head> du layout, juste après le défaut de consentement. */
export function IntroAccueilScript() {
  // Contenu statique écrit ici, aucune donnée utilisateur interpolée.
  return <script id="intro-accueil-decision" dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}

/**
 * L'écran lui-même, masqué par défaut (`display:none`). Il n'apparaît que
 * si le script du <head> a posé son drapeau. Le compteur et la tache
 * d'encre sont pilotés par HeroFilm, qui retrouve cet écran par son id.
 *
 * ⚠ À RENDRE HORS DE `.hero-fixe` : le hero est une section sombre, qui
 * bascule l'anneau de focus en craie — invisible sur l'aplat craie de
 * cet écran, où le bouton « Passer l'intro » doit rester repérable.
 */
export default function IntroAccueil() {
  return (
    <div className="intro-accueil" id="intro-accueil">
      <canvas className="intro-accueil__toile" aria-hidden="true" />
      <div className="intro-accueil__centre" aria-hidden="true">
        {/* Logo encre, pour fond clair — le seul fond de cet écran. Un SVG
            de 7 Ko : next/image n'aurait rien à optimiser. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="intro-accueil__logo" src="/marque/logo.svg" alt="" width={260} height={96} />
        <span className="intro-accueil__pct">0&nbsp;%</span>
      </div>
      <button type="button" className="intro-accueil__passer">
        Passer l&apos;intro
      </button>
    </div>
  );
}
