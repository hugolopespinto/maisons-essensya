import type { Metadata } from "next";
import EnPreparation, { metadataEnPreparation } from "@/components/EnPreparation";
import { resolveMetadata } from "@/lib/seo";

/* Page annoncée par la navigation principale (schéma d'arborescence du
   client), pas encore écrite. Le gabarit et la raison d'être de ces
   pages sont dans EnPreparation.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/garanties", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Nos garanties",
  description: "Livraison, parfait achèvement, biennale, décennale, dommages-ouvrage : les garanties qui encadrent votre construction.",
  alternates: { canonical: "/garanties" },
  ...metadataEnPreparation,
};

export default function Page() {
  return (
    <EnPreparation
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Nos garanties" }]}
      titre={"Nos garanties"}
      quand={"Les garanties qui encadrent votre construction, une par une : ce qu'elles couvrent, et pendant combien de temps."}
      relais={[{ href: "/concept#faq", label: "Le CCMI en questions", quoi: "Le contrat, et les garanties qu'il ouvre." }, { href: "/concept#engagements", label: "Nos engagements", quoi: "Ce sur quoi nous nous engageons, écrit noir sur blanc." }]}
    />
  );
}
