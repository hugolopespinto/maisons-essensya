import type { Metadata } from "next";
import EnPreparation, { metadataEnPreparation } from "@/components/EnPreparation";
import { resolveMetadata } from "@/lib/seo";

/* Page annoncée par la navigation principale (schéma d'arborescence du
   client), pas encore écrite. Le gabarit et la raison d'être de ces
   pages sont dans EnPreparation.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/parrainage", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Parrainage",
  description: "Recommander Maisons Essensya à un proche qui a un projet de construction.",
  alternates: { canonical: "/parrainage" },
  ...metadataEnPreparation,
};

export default function Page() {
  return (
    <EnPreparation
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Parrainage" }]}
      titre={"Parrainage"}
      quand={"Comment recommander Maisons Essensya à un proche qui a un projet de construction."}
      relais={[{ href: "/concept", label: "Le concept ESSENSYA", quoi: "Pourquoi nos maisons coûtent moins cher, et ce que ça change." }, { href: "/realisations", label: "Nos réalisations", quoi: "Les maisons déjà livrées." }]}
    />
  );
}
