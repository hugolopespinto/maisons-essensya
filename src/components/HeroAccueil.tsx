import Link from "next/link";
import { srcSet, type Visuel } from "@/data/visuels";

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

   Ce qui le remplace n'a AUCUN JavaScript : pas de `use client`, pas
   d'écouteur de défilement, pas d'hydratation à attendre. Le titre est
   dans le HTML servi, donc lisible à la première frame — c'est le
   meilleur LCP qu'on puisse offrir, et accessoirement le meilleur
   signal SEO.

   ⚠ PAS DE CHIFFRES SUR CE VISUEL. Le client garde le principe des
   chiffres posés sur les images, mais l'exclut de ces rendus de
   maisons. On n'en pose donc aucun ici, même si le gabarit s'y prête.
   ════════════════════════════════════════════════════════════════ */

export default function HeroAccueil({
  visuel,
  baseline,
  titre,
  alt,
}: {
  visuel: Visuel;
  baseline: string;
  titre: string;
  alt: string;
}) {
  return (
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
      </div>

      <div className="hero-fixe__voile" aria-hidden="true" />

      <div className="container hero-fixe__texte">
        <span className="c-label">{baseline}</span>
        <h1 id="hero-t">{titre}</h1>
        <div className="hero-fixe__actions">
          <Link href="/maisons" className="c-btn c-btn--solid">
            Voir nos modèles <span className="arrow">→</span>
          </Link>
          <Link href="/contact" className="c-btn c-btn--light">
            Parler de mon projet
          </Link>
        </div>
      </div>
    </section>
  );
}
