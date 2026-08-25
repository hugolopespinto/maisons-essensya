import type { Metadata } from "next";
import Link from "next/link";
import AgencyCard from "@/components/AgencyCard";
import { AGENCIES } from "@/data/essensya";
import "@/styles/pages/agences.css";

export const metadata: Metadata = {
  title: "Nos agences",
  description:
    "Des équipes locales qui connaissent le terrain — au sens propre. Chaque agence sélectionne les parcelles de son secteur et suit votre projet.",
  alternates: { canonical: "/agences" },
};

export default function AgencesPage() {
  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>Nos agences</span>
          </nav>
          <h1>Nos agences</h1>
          <p>
            Des équipes locales qui connaissent le terrain — au sens propre. Chaque
            agence sélectionne les parcelles de son secteur et suit votre projet de la
            première visite à la remise des clés.
          </p>
        </div>
      </section>

      <section style={{ paddingTop: "var(--s-4)" }}>
        <div className="container">
          <div className="g-grid">
            {AGENCIES.map((g) => (
              <AgencyCard agency={g} key={g.id} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
