import Link from "next/link";
import { SpecList } from "@/components/SpecList";
import { fmtPrice, fmtSurface, versionUrl } from "@/lib/format";
import { HOUSE } from "@/data/essensya";
import type { HouseVersion } from "@/types";

/* Une déclinaison — PAS un second produit. Le libellé, le sous-titre et
   la fiche insistent tous sur ce qui NE change pas d'une version à l'autre. */
export default function VersionCard({ version: v }: { version: HouseVersion }) {
  return (
    <article className="c-version" data-reveal>
      <div className="c-version__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={v.image} alt={v.alt} loading="lazy" />
        <span className="c-version__chiffre" aria-hidden="true">
          {v.chiffre}
        </span>
      </div>
      <div className="c-version__body">
        <span className="c-label c-label--accent">
          {HOUSE.name} · {v.label}
        </span>
        <h3 className="c-version__name">
          {v.surface.toLocaleString("fr-FR")} m²
          <br />
          {v.label}
        </h3>
        <p className="c-version__pour">{v.pour}</p>
        <SpecList
          rows={[
            ["Surface", fmtSurface(v.surface)],
            ["Pièces", `${v.rooms} dont ${v.bedrooms} ch.`],
            ["Garage", fmtSurface(v.garageArea)],
          ]}
        />
        <div className="c-version__price">
          <span>À partir de</span>
          <b>{fmtPrice(v.priceFrom)}</b>
        </div>
      </div>
      <div className="c-version__foot">
        <Link href={versionUrl(v)} className="c-link">
          Voir le plan {v.label} →
        </Link>
      </div>
    </article>
  );
}
