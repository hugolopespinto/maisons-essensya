import type { Metadata } from "next";
import FilAriane from "@/components/FilAriane";
import MentionSimulation from "@/components/MentionSimulation";
import SimulateurPret from "@/components/SimulateurPret";
import { resolveMetadata } from "@/lib/seo";
import { TAUX_DEFAUT, enSaisie, lire } from "@/lib/simulation";
import "@/styles/pages/simulateur.css";

/* La page « en préparation » annoncée par la navigation (« Votre
   construction ») reçoit son outil : même URL, aucun lien à reprendre.
   Le calcul et ses garde-fous vivent dans SimulateurPret.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/simulateur-de-financement", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Simulateur de financement",
  description:
    "Estimez la mensualité de votre projet de maison : montant, apport, taux et durée. Une simulation indicative, avant de rencontrer votre banque.",
  alternates: { canonical: "/simulateur-de-financement" },
  /* ⚠ ENCORE HORS INDEX, ET HORS SITEMAP. Un simulateur de mensualité
     touche à la publicité pour le crédit : le client doit faire relire
     la page et sa mention avant qu'elle ne soit mise en avant par
     Google. Le jour où c'est fait : retirer cette ligne, ajouter
     l'entrée à src/app/sitemap.ts. */
  robots: { index: false, follow: true },
};

/* `?montant=90000` pré-remplit le projet : un lien depuis une fiche ou
   un courriel peut ouvrir la simulation d'un bien précis. Une valeur
   illisible est ignorée, jamais une erreur. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ montant?: string | string[] }>;
}) {
  const { montant } = await searchParams;
  const montantInitial = typeof montant === "string" ? lire(montant) ?? undefined : undefined;

  return (
    <main className="page">
      <section className="p-head sf-tete">
        <div className="container">
          <FilAriane items={[{ nom: "Accueil", path: "/" }, { nom: "Simulateur de financement" }]} />
          <h1>Simulateur de financement</h1>
        </div>
      </section>

      <section className="sf">
        <div className="container">
          {/* Le chapô, la mention et le lien vivent dans la colonne des
              champs : voir la note du composant. Écrits ici, ils restent
              dans le HTML servi — la mention est là avant tout calcul. */}
          <SimulateurPret
            montantInitial={montantInitial}
            intro={
              <p className="sf-chapo">
                Estimez la mensualité de votre projet avant de rencontrer votre
                banque. Le taux de {enSaisie(TAUX_DEFAUT)} % est un exemple :
                réglez-le sur celui qu&apos;elle vous propose.
              </p>
            }
            pied={<MentionSimulation />}
          />
        </div>
      </section>
    </main>
  );
}
