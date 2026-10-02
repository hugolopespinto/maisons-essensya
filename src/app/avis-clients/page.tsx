import type { Metadata } from "next";
import EnPreparation, { metadataEnPreparation } from "@/components/EnPreparation";
import { resolveMetadata } from "@/lib/seo";

/* Page annoncée par la navigation principale (schéma d'arborescence du
   client), pas encore écrite. Le gabarit et la raison d'être de ces
   pages sont dans EnPreparation.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/avis-clients", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Avis clients",
  description: "Ce que disent les clients de Maisons Essensya, après la remise des clés.",
  alternates: { canonical: "/avis-clients" },
  ...metadataEnPreparation,
};

export default function Page() {
  return (
    <EnPreparation
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Avis clients" }]}
      titre={"Avis clients"}
      quand={"Les avis de nos clients, recueillis après la remise des clés."}
      relais={[{ href: "/realisations", label: "Nos réalisations", quoi: "Les maisons déjà livrées." }, { href: "/concept#engagements", label: "Nos engagements", quoi: "Ce sur quoi nous nous engageons, écrit noir sur blanc." }]}
    />
  );
}
