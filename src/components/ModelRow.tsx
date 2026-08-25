import Link from "next/link";
import { modelUrl } from "@/lib/format";
import type { Model } from "@/types";
import Plate from "./Plate";

export default function ModelRow({ model }: { model: Model }) {
  return (
    <article className="c-model-row">
      <div className="c-model-row__media" data-reveal>
        <span className="c-model-row__num" aria-hidden="true">
          {model.index}
        </span>
        <Link
          href={modelUrl(model)}
          className="c-reveal-img"
          aria-label={`Découvrir ${model.name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={model.image} alt={model.alt} loading="lazy" />
        </Link>
      </div>
      <div className="c-model-row__body">
        <span className="c-label c-label--accent" data-reveal>
          Modèle {model.index}
        </span>
        <div className="c-model-row__name" data-reveal>
          {model.name}
        </div>
        <p className="c-model-row__tagline" data-reveal>
          {model.tagline}
        </p>
        <div className="c-plate" data-reveal>
          <Plate model={model} withName={false} />
        </div>
        <Link href={modelUrl(model)} className="c-link" data-reveal>
          Découvrir {model.name} →
        </Link>
      </div>
    </article>
  );
}
