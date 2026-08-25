import { fmtPrice } from "@/lib/format";
import type { Model } from "@/types";

/** La « plaque » de specs — composant signature du design system. */
export default function Plate({
  model,
  withName = true,
}: {
  model: Model;
  withName?: boolean;
}) {
  return (
    <>
      {withName && (
        <span className="c-plate__name">
          {model.name} — {model.index}
        </span>
      )}
      <span className="c-plate__spec">
        Surface <strong>{model.surface} m²</strong>
      </span>
      <span className="c-plate__spec">
        Chambres <strong>{model.bedrooms}</strong>
      </span>
      <span className="c-plate__spec">
        À partir de <strong>{fmtPrice(model.priceFrom)}</strong>
      </span>
    </>
  );
}
