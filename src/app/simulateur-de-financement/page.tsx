import type { Metadata } from "next";
import EnPreparation, { metadataEnPreparation } from "@/components/EnPreparation";
import { resolveMetadata } from "@/lib/seo";

/* Page annoncée par la navigation principale (schéma d'arborescence du
   client), pas encore écrite. Le gabarit et la raison d'être de ces
   pages sont dans EnPreparation.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/simulateur-de-financement", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Simulateur de financement",
  description: "Estimez le budget et la mensualité de votre projet de maison avant de rencontrer votre banque.",
  alternates: { canonical: "/simulateur-de-financement" },
  ...metadataEnPreparation,
};

export default function Page() {
  return (
    <EnPreparation
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Simulateur de financement" }]}
      titre={"Simulateur de financement"}
      quand={"Un outil pour estimer le budget et la mensualité de votre projet — maison, terrain et frais — avant de rencontrer votre banque."}
      relais={[{ href: "/concept#prix", label: "Ce que le prix comprend", quoi: "Le détail de ce qui est inclus, et de ce qui ne l'est pas." }, { href: "/concept#faq", label: "Apport et prêts aidés", quoi: "Ce qu'il faut savoir avant de voir sa banque, dans nos questions fréquentes." }]}
    />
  );
}
