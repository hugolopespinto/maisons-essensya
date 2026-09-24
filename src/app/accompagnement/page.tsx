import type { Metadata } from "next";
import EnPreparation, { metadataEnPreparation } from "@/components/EnPreparation";
import { resolveMetadata } from "@/lib/seo";

/* Page annoncée par l'arborescence du 22/09, pas encore écrite. Le
   gabarit et la raison d'être de ces pages sont dans EnPreparation.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/accompagnement", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "L'accompagnement ESSENSYA",
  description: "De la première visite à la remise des clés : qui vous suit, à quel moment, et sur quoi nous nous engageons.",
  alternates: { canonical: "/accompagnement" },
  ...metadataEnPreparation,
};

export default function Page() {
  return (
    <EnPreparation
      fil={[{ nom: "Accueil", path: "/" }, { nom: "L'accompagnement ESSENSYA" }]}
      titre={"L'accompagnement ESSENSYA"}
      quand={"Ce que nous prenons en charge à chaque étape, de la recherche du terrain à la remise des clés."}
      relais={[{ href: "/concept#etapes", label: "Les étapes de construction", quoi: "Le parcours en quatre étapes, déjà détaillé." }, { href: "/concept#engagements", label: "Nos engagements", quoi: "Ce sur quoi nous nous engageons, écrit noir sur blanc." }]}
    />
  );
}
