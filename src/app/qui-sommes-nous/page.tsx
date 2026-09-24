import type { Metadata } from "next";
import EnPreparation, { metadataEnPreparation } from "@/components/EnPreparation";
import { resolveMetadata } from "@/lib/seo";

/* Page annoncée par l'arborescence du 22/09, pas encore écrite. Le
   gabarit et la raison d'être de ces pages sont dans EnPreparation.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/qui-sommes-nous", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Qui sommes-nous",
  description: "Maisons Essensya, constructeur du groupe CIMI : quarante ans d'expérience, cinq agences, un prix annoncé.",
  alternates: { canonical: "/qui-sommes-nous" },
  ...metadataEnPreparation,
};

export default function Page() {
  return (
    <EnPreparation
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Qui sommes-nous" }]}
      titre={"Qui sommes-nous"}
      quand={"L'histoire de Maisons Essensya, son appartenance au groupe CIMI et les équipes qui suivent les chantiers."}
      relais={[{ href: "/concept", label: "Le concept ESSENSYA", quoi: "Pourquoi nos maisons coûtent moins cher, et ce que ça change." }, { href: "/agences", label: "Nos agences", quoi: "Les cinq implantations et leurs équipes." }]}
    />
  );
}
