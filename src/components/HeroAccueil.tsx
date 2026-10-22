import Link from "next/link";
import { Fragment } from "react";
import type { FilmAccueil } from "@/data/film-accueil";
import { srcSet, type Visuel } from "@/data/visuels";
import HeroFilm from "./HeroFilm";
import IntroAccueil from "./IntroAccueil";

/* ════════════════════════════════════════════════════════════════
   HERO D'ACCUEIL — une image, un message, tout de suite

   ⚠ CE COMPOSANT REMPLACE UN HERO PILOTÉ AU SCROLL, ET C'EST UNE
   CORRECTION, PAS UN RECUL. L'ancien tenait la première image épinglée
   sur 320 svh et faisait entrer le discours par paliers. Le retour du
   client est sans appel : « cela donne l'impression que le site ne
   fonctionne pas avec l'animation qui arrive tardivement ». Il a
   raison, et la raison est mesurable — tant que rien n'est apparu,
   l'écran est une image muette, et un visiteur qui ne fait pas défiler
   ne voit jamais le prix.

   Ce composant n'a AUCUN JavaScript : pas de `use client`, pas
   d'écouteur de défilement. Le titre est dans le HTML servi — c'est le
   meilleur LCP qu'on puisse offrir, et le meilleur signal SEO.

   ⚠ SAUF À LA PREMIÈRE ARRIVÉE DE LA VISITE, SUR ORDINATEUR. Le client
   a retenu depuis un écran de chargement façon Makhno Studio (voir
   IntroAccueil) : le titre y reste caché 3,5 à 4,5 s, le temps que le
   film se télécharge et que la page se dévoile. Choix fait en voyant ce
   prix affiché sur la démo. Partout ailleurs — mobile, retours sur
   l'accueil, animations réduites — ce qui précède reste vrai.

   ⚠ PAS DE CHIFFRES SUR CE VISUEL. Le client garde le principe des
   chiffres posés sur les images, mais l'exclut de ces rendus de
   maisons. On n'en pose donc aucun ici, même si le gabarit s'y prête.
   ════════════════════════════════════════════════════════════════ */

export default function HeroAccueil({
  visuel,
  baseline,
  titre,
  alt,
  film,
}: {
  visuel: Visuel;
  baseline: string;
  titre: string;
  alt: string;
  /**
   * Film d'arrivée optionnel, posé à l'encre par-dessus le visuel, avec
   * son écran de chargement. Absent → ni film ni écran : ce composant
   * reste exactement ce qu'il était, zéro JavaScript. Voir HeroFilm et
   * IntroAccueil pour les garde-fous.
   */
  film?: FilmAccueil;
}) {
  /* Chaque mot dans son cache : c'est ce qui permet au titre de monter
     mot par mot à la sortie de l'écran de chargement. Le texte servi est
     inchangé — mêmes mots, mêmes espaces — pour Google comme pour les
     lecteurs d'écran. */
  const mots = titre.trim().split(/\s+/);

  return (
    <>
    {film ? <IntroAccueil /> : null}
    <section className="hero-fixe" aria-labelledby="hero-t">
      <div
        className="hero-fixe__media"
        /* L'empreinte de 20 px tient la place et la couleur pendant le
           chargement. Sans elle, le premier écran est un rectangle vide :
           exactement l'effet « site cassé » qu'on corrige ici. */
        style={{ backgroundImage: `url(${visuel.empreinte})` }}
      >
        {/* AVIF d'abord, WebP en repli. Mesuré sur cette image même :
            85 Ko contre 163 Ko à 1376 px, soit près de moitié moins
            pour la seule image que Chrome chronomètre. Le navigateur
            prend le premier format qu'il sait lire et ignore le reste. */}
        <picture>
          <source type="image/avif" srcSet={srcSet(visuel, "avif")} sizes="100vw" />
          <source type="image/webp" srcSet={srcSet(visuel, "webp")} sizes="100vw" />
          <img
            src={visuel.src}
            width={visuel.largeur}
            height={visuel.hauteur}
            alt={alt}
            /* La seule image de la page qui mérite cette priorité : c'est
               elle que Chrome mesure pour le LCP. */
            fetchPriority="high"
            decoding="sync"
          />
        </picture>

        {/* Le film se place APRÈS la photo et AVANT le voile, DANS le
            cadre de l'image : les trois calques sont en
            `position:absolute`, donc l'ordre du document suffit à les
            empiler, et le cadre les borne. Hors de ce cadre, le film
            recouvrirait la bande de texte, désormais sous l'image. */}
        {film ? <HeroFilm film={film} /> : null}

        <div className="hero-fixe__voile" aria-hidden="true" />
      </div>

      <div className="container hero-fixe__texte">
        {/* ⚠ LE TEXTE EST SOUS L'IMAGE, PLUS DESSUS. Quatrième état, et
            le premier où il ne recouvre rien.

            1. Titre pleine largeur sur un dégradé faible : « ça mange
               trop le visuel de la maison ».
            2. Un rectangle opaque borné à 60 % de la largeur : il
               recouvrait la terrasse et le bas de la façade.
            3. Un dégradé franc en bas de l'image : il cachait le premier
               plan — le vélo, le ballon — et le texte restait « peu
               lisible ».
            4. Une bande au fond du site, sous l'image : la piste F des
               six maquettes, mise à l'essai. L'image garde toute la
               largeur, et la lisibilité du texte ne dépend plus d'aucun
               pixel de la photo ni du film.

            Ce que cela coûte, et qui est assumé : le titre descend à
            26 px environ, et l'image perd la hauteur de la bande. */}
        <div className="hero-fixe__titre">
          <span className="c-label c-label--accent">{baseline}</span>
          <h1 id="hero-t">
            {mots.map((m, i) => (
              <Fragment key={i}>
                {i > 0 ? " " : null}
                <span className="mot">
                  <span>{m}</span>
                </span>
              </Fragment>
            ))}
          </h1>
        </div>
        <div className="hero-fixe__actions">
          <Link href="/maisons" className="c-btn c-btn--solid">
            Voir nos modèles <span className="arrow">→</span>
          </Link>
          {/* Contour anthracite : le contour craie d'avant, fait pour la
              photo, disparaissait sur le fond clair de la bande. */}
          <Link href="/contact" className="c-btn">
            Parler de mon projet
          </Link>
        </div>
      </div>
    </section>
    </>
  );
}
