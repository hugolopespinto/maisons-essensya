import type { Metadata } from "next";
import EnPreparation, { metadataEnPreparation } from "@/components/EnPreparation";
import { resolveMetadata } from "@/lib/seo";

/* Page annoncée par l'arborescence du 22/09, pas encore écrite. Le
   gabarit et la raison d'être de ces pages sont dans EnPreparation.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/construire/pays-basque", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Construction de maisons au Pays basque",
  description: "Faire construire au Pays basque avec Maisons Essensya : plans optimisés, prix annoncé, contrat CCMI.",
  alternates: { canonical: "/construire/pays-basque" },
  ...metadataEnPreparation,
};

export default function Page() {
  return (
    <EnPreparation
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Projets de construction", path: "/annonces?type=terrain-maison" }, { nom: "Construction de maisons au Pays basque" }]}
      titre={"Construction de maisons au Pays basque"}
      quand={"Construire au Pays basque : les terrains, les modèles adaptés et l'agence qui suivra le chantier."}
      relais={[{ href: "/annonces?type=terrain-maison", label: "Nos terrains + maison", quoi: "Le stock disponible, terrain et maison ensemble." }, { href: "/agences", label: "Nos agences", quoi: "Les cinq agences, et celle qui couvre le Pays basque." }]}
    />
  );
}
