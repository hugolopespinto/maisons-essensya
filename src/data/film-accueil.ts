import film from "./film-accueil.json";

/* ════════════════════════════════════════════════════════════════
   LE FILM D'ARRIVÉE DE L'ACCUEIL

   `film-accueil.json` est écrit par `scripts/profondeur-film.mjs`,
   jamais à la main : il décrit le film ET sa planche de profondeur, et
   les deux doivent correspondre à la demi-seconde près. Une planche
   calculée sur un autre film, ou un autre point de départ, ferait
   glisser le relief à contretemps de l'image.

   ⚠ CHANGER DE FILM = RELANCER LE SCRIPT. Remplacer le .mp4 sans
   régénérer la planche laisse le relief de l'ancien film sur le nouveau.

   ⚠ PLACEHOLDER — `chantier.mp4` est la référence de 10 s fournie par
   le client (720p, 5 Mo) : la maison filmée n'est PAS une Essensya. Le
   film définitif doit faire 1920 de large et tenir sous 2 Mo — il est
   téléchargé en entier pendant l'écran de chargement.
   ════════════════════════════════════════════════════════════════ */

export interface FilmAccueil {
  /** Chemin public du .mp4. */
  src: string;
  largeur: number;
  hauteur: number;
  /** Chaque tour de boucle va de `debut` à `fin`, en secondes. On saute
      la parcelle vide : elle ne raconte rien. */
  debut: number;
  fin: number;
  profondeur: {
    src: string;
    /** Une carte toutes les `pas` secondes, à partir de `debut`. */
    pas: number;
    nombre: number;
    colonnes: number;
    lignes: number;
  };
}

export const FILM_ACCUEIL: FilmAccueil = film;

/** Sous cette largeur, ni film ni écran de chargement : le cadrage 16/9
    ne donne plus rien, et la data mobile n'a pas à payer le fichier. */
export const LARGEUR_MINI_FILM = 768;

/** Posée en sessionStorage au premier passage : l'écran de chargement
    ne se joue qu'une fois par visite. */
export const CLE_INTRO = "essensya:intro-accueil";
