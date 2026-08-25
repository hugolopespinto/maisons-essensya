import type { Metadata } from "next";
import Link from "next/link";
import ModelRow from "@/components/ModelRow";
import { MODELS } from "@/data/essensya";

export const metadata: Metadata = {
  title: "La collection — 3 modèles de maisons",
  description:
    "Trois modèles, pas trente. Chacun conçu, optimisé et chiffré dans le détail — pour que le choix soit simple et le prix maîtrisé.",
  alternates: { canonical: "/maisons" },
};

export default function MaisonsPage() {
  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>Maisons</span>
          </nav>
          <h1>La collection</h1>
          <p>
            Trois modèles, pas trente. Chacun conçu, optimisé et chiffré dans le détail
            — pour que le choix soit simple et le prix maîtrisé.
          </p>
        </div>
      </section>

      <section className="s-collection" style={{ paddingTop: "var(--s-5)" }}>
        <div className="container">
          <div className="s-collection__list">
            {MODELS.map((m) => (
              <ModelRow model={m} key={m.id} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
