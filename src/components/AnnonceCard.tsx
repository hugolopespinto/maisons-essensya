import Link from "next/link";
import { annonceTitle, annonceUrl, dept, fmtPrice } from "@/lib/format";
import { modelById } from "@/data/essensya";
import type { Annonce } from "@/types";

export default function AnnonceCard({
  annonce: a,
  reveal = true,
  highlighted = false,
  onMouseEnter,
  onMouseLeave,
}: {
  annonce: Annonce;
  reveal?: boolean;
  /** Survol croisé avec la carte du listing. */
  highlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const isTerrain = a.type === "terrain";
  const title = annonceTitle(a, a.modelId ? modelById(a.modelId)?.name : null);

  return (
    <Link
      className={`c-annonce${highlighted ? " is-hl" : ""}`}
      href={annonceUrl(a)}
      data-annonce={a.id}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...(reveal ? { "data-reveal": "" } : {})}
    >
      <div className="c-annonce__media">
        <span className={`c-tag${isTerrain ? " c-tag--terrain" : ""}`}>
          {isTerrain ? "Terrain" : "Terrain + maison"}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={a.image} alt={title} loading="lazy" />
      </div>
      <div className="c-annonce__body">
        <span className="c-annonce__loc">
          {a.city} ({dept(a)})
        </span>
        <div className="c-annonce__title">{title}</div>
        <div className="c-annonce__specs">
          <span>Terrain {a.landSurface} m²</span>
          {isTerrain ? (
            <span>Tous modèles</span>
          ) : (
            <>
              <span>Maison {a.houseSurface} m²</span>
              <span>{a.bedrooms} ch.</span>
            </>
          )}
        </div>
        <div className="c-annonce__price">
          <small>à partir de </small>
          <strong>{fmtPrice(a.price)}</strong>
        </div>
      </div>
    </Link>
  );
}
