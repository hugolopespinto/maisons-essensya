import type { Metadata } from "next";
import Link from "next/link";
import AnnoncesBrowser from "@/components/AnnoncesBrowser";
import { getAnnonces } from "@/lib/vitahome/annonces";
import "@/styles/pages/annonces.css";

export const metadata: Metadata = {
  title: "Terrains & maisons disponibles",
  description:
    "Des terrains sélectionnés par nos agences, seuls ou associés à un modèle de la collection. Choisissez la maison, nous avons déjà repéré le lieu.",
  alternates: { canonical: "/annonces" },
};

export default async function AnnoncesPage() {
  const annonces = await getAnnonces();

  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>Terrains &amp; opportunités</span>
          </nav>
          <h1>Terrains &amp; maisons</h1>
          <p>
            Des terrains sélectionnés par nos agences, seuls ou associés à un modèle de
            la collection. Choisissez la maison, nous avons déjà repéré le lieu.
          </p>
        </div>
      </section>

      {/* Le flux est récupéré côté serveur ; le navigateur ne reçoit que
          les annonces déjà normalisées, filtrées ensuite en local. */}
      <AnnoncesBrowser annonces={annonces} />
    </main>
  );
}
