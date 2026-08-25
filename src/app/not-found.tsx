import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <span className="c-label c-label--accent">Erreur 404</span>
          <h1>Cette page n&apos;existe pas</h1>
          <p>
            Le lien est peut-être obsolète, ou l&apos;annonce que vous cherchez
            n&apos;est plus disponible.
          </p>
          <div style={{ marginTop: "var(--s-4)", display: "flex", gap: "var(--s-2)", flexWrap: "wrap" }}>
            <Link href="/maisons" className="c-btn c-btn--solid">
              Voir la collection <span className="arrow">→</span>
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
