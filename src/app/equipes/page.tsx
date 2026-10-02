import type { Metadata } from "next";
import EnPreparation, { metadataEnPreparation } from "@/components/EnPreparation";
import { resolveMetadata } from "@/lib/seo";

/* Page annoncée par la navigation principale (schéma d'arborescence du
   client), pas encore écrite. Le gabarit et la raison d'être de ces
   pages sont dans EnPreparation.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/equipes", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Nos équipes",
  description: "Les équipes de Maisons Essensya, de l'agence au chantier.",
  alternates: { canonical: "/equipes" },
  ...metadataEnPreparation,
};

export default function Page() {
  return (
    <EnPreparation
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Nos équipes" }]}
      titre={"Nos équipes"}
      quand={"Les personnes qui vous accompagnent, de l'agence au chantier, présentées une par une."}
      relais={[{ href: "/agences", label: "Nos agences", quoi: "Nos implantations et leurs coordonnées." }, { href: "/realisations", label: "Nos réalisations", quoi: "Les maisons déjà livrées." }]}
    />
  );
}
