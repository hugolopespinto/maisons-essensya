import type { Metadata } from "next";
import EnPreparation, { metadataEnPreparation } from "@/components/EnPreparation";
import { resolveMetadata } from "@/lib/seo";

/* Page annoncée par l'arborescence du 22/09, pas encore écrite. Le
   gabarit et la raison d'être de ces pages sont dans EnPreparation.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/construire/gironde", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Construction de maisons en Gironde",
  description: "Faire construire en Gironde avec Maisons Essensya : plans optimisés, prix annoncé, contrat CCMI.",
  alternates: { canonical: "/construire/gironde" },
  ...metadataEnPreparation,
};

export default function Page() {
  return (
    <EnPreparation
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Projets de construction", path: "/annonces?type=terrain-maison" }, { nom: "Construction de maisons en Gironde" }]}
      titre={"Construction de maisons en Gironde"}
      quand={"Construire en Gironde : les terrains, les modèles adaptés et l'agence qui suivra le chantier."}
      relais={[{ href: "/annonces?type=terrain-maison", label: "Nos terrains + maison", quoi: "Le stock disponible, terrain et maison ensemble." }, { href: "/agences", label: "Nos agences", quoi: "Les cinq agences, et celle qui couvre la Gironde." }]}
    />
  );
}
