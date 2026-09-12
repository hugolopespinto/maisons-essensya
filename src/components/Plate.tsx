import { fmtPrice, fmtSurface } from "@/lib/format";
import { HOUSE } from "@/data/essensya";
import type { HouseVersion } from "@/types";

/* La « plaque » de specs — composant signature du design system.
   Elle portait « Essen — 01 » : le numéro n'avait de sens que dans un
   catalogue de trois. Elle porte désormais la donnée qui vend. */
export default function Plate({
  version,
  withName = true,
  withGarage = false,
}: {
  version: HouseVersion;
  withName?: boolean;
  withGarage?: boolean;
}) {
  return (
    <>
      {withName && (
        <span className="c-plate__name">
          {HOUSE.name} — {version.label}
        </span>
      )}
      <span className="c-plate__spec">
        Surface <strong>{fmtSurface(version.surface)}</strong>
      </span>
      <span className="c-plate__spec">
        Chambres <strong>{version.bedrooms}</strong>
      </span>
      {withGarage && (
        <span className="c-plate__spec">
          Garage <strong>{fmtSurface(version.garageArea)}</strong>
        </span>
      )}
      <span className="c-plate__spec">
        À partir de <strong>{fmtPrice(version.priceFrom)}</strong>
      </span>
    </>
  );
}
