import film from "./film-accueil.json";

/* ════════════════════════════════════════════════════════════════
   LE FILM D'ARRIVÉE DE L'ACCUEIL

   `film-accueil.json` associe le film à sa planche de profondeur.
   Les cartes sont espacées de 0,5 s à la lecture et générées à partir
   des images du chantier via `scripts/profondeur-film.mjs`.

   Régénérer la planche à chaque changement de film, de point de départ
   ou de cadence. Garder le MP4 sous 2 Mo pour l'écran de chargement.
   ════════════════════════════════════════════════════════════════ */

export interface FilmAccueil {
  /** Chemin public du .mp4. */
  src: string;
  largeur: number;
  hauteur: number;
  /** Chaque tour de boucle va de `debut` à `fin`, en secondes. */
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
