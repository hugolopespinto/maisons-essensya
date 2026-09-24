import type { Metadata } from "next";
import EnPreparation, { metadataEnPreparation } from "@/components/EnPreparation";
import { resolveMetadata } from "@/lib/seo";

/* Page annoncée par l'arborescence du 22/09, pas encore écrite. Le
   gabarit et la raison d'être de ces pages sont dans EnPreparation.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/terrains-constructibles/gironde", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Terrains constructibles en Gironde",
  description: "Les terrains à bâtir en Gironde : surfaces, prix et communes, mis à jour avec notre stock.",
  alternates: { canonical: "/terrains-constructibles/gironde" },
  ...metadataEnPreparation,
};

export default function Page() {
  return (
    <EnPreparation
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Projets de construction", path: "/annonces?type=terrain" }, { nom: "Terrains constructibles en Gironde" }]}
      titre={"Terrains constructibles en Gironde"}
      quand={"Les terrains à bâtir en Gironde seront listés ici, avec leur surface, leur prix et leur commune."}
      relais={[{ href: "/annonces?type=terrain", label: "Tous nos terrains", quoi: "Le stock actuel, avec sa carte et ses filtres." }, { href: "/terrains", label: "Où nous construisons", quoi: "Les secteurs couverts aujourd'hui." }]}
    />
  );
}
