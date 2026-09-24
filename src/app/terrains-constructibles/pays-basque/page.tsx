import type { Metadata } from "next";
import EnPreparation, { metadataEnPreparation } from "@/components/EnPreparation";
import { resolveMetadata } from "@/lib/seo";

/* Page annoncée par l'arborescence du 22/09, pas encore écrite. Le
   gabarit et la raison d'être de ces pages sont dans EnPreparation.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/terrains-constructibles/pays-basque", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Terrains constructibles au Pays basque",
  description: "Les terrains à bâtir au Pays basque : surfaces, prix et communes, mis à jour avec notre stock.",
  alternates: { canonical: "/terrains-constructibles/pays-basque" },
  ...metadataEnPreparation,
};

export default function Page() {
  return (
    <EnPreparation
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Projets de construction", path: "/annonces?type=terrain" }, { nom: "Terrains constructibles au Pays basque" }]}
      titre={"Terrains constructibles au Pays basque"}
      quand={"Les terrains à bâtir au Pays basque seront listés ici, avec leur surface, leur prix et leur commune."}
      relais={[{ href: "/annonces?type=terrain", label: "Tous nos terrains", quoi: "Le stock actuel, avec sa carte et ses filtres." }, { href: "/terrains", label: "Où nous construisons", quoi: "Les secteurs couverts aujourd'hui." }]}
    />
  );
}
