import Link from "next/link";
import { PRICE_FROM } from "@/data/essensya";
import { fmtPrice } from "@/lib/format";

export default function NotFound() {
  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <span className="c-label c-label--accent">Erreur 404</span>
          <h1>Cette page n&apos;existe pas</h1>
          <p>
            Le lien est peut-être obsolète, ou le terrain que vous cherchez
            n&apos;est plus disponible. La maison, elle, n&apos;a pas bougé :
            elle est toujours à partir de {fmtPrice(PRICE_FROM)}, hors terrain.
          </p>
          <div style={{ marginTop: "var(--s-4)", display: "flex", gap: "var(--s-2)", flexWrap: "wrap" }}>
            <Link href="/maisons" className="c-btn c-btn--solid">
              Voir la maison <span className="arrow">→</span>
            </Link>
            <Link href="/annonces" className="c-btn">
              Terrains &amp; opportunités
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
