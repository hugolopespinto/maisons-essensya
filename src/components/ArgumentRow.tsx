import Link from "next/link";
import type { Argument } from "@/types";

/* Remplace ModelRow. Même gabarit exactement — grille 5fr/7fr, alternance
   gauche/droite, image révélée, chiffre géant en contour — mais l'axe de
   répétition change : une rangée par ARGUMENT de la maison, plus une
   rangée par produit. Le geste graphique survit, il ne numérote plus un
   catalogue : il martèle un chiffre (93 m², 0 option, 1 prix). */
export default function ArgumentRow({ item }: { item: Argument }) {
  return (
    <article className="c-model-row">
      <div className="c-model-row__media" data-reveal>
        <span className="c-model-row__num c-model-row__num--data" aria-hidden="true">
          {item.chiffre}
        </span>
        <div className="c-reveal-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt={item.alt} loading="lazy" />
        </div>
      </div>
      <div className="c-model-row__body">
        <span className="c-label c-label--accent" data-reveal>
          {item.label}
        </span>
        <h3 className="c-model-row__name" data-reveal>
          {item.title}
        </h3>
        <p className="c-model-row__tagline" data-reveal>
          {item.text}
        </p>
        {item.href && (
          <Link href={item.href} className="c-link" data-reveal>
            {item.linkLabel ?? "En savoir plus"} →
          </Link>
        )}
      </div>
    </article>
  );
}
