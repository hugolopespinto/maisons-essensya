import type { Metadata } from "next";
import EnPreparation, { metadataEnPreparation } from "@/components/EnPreparation";
import { resolveMetadata } from "@/lib/seo";

/* Page annoncée par l'arborescence du 22/09, pas encore écrite. Le
   gabarit et la raison d'être de ces pages sont dans EnPreparation.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/plans-de-maison/3-chambres", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Maison 3 chambres",
  description: "Nos plans de maison 3 chambres : surfaces, pièces et prix, dans les Landes, en Gironde et au Pays basque.",
  alternates: { canonical: "/plans-de-maison/3-chambres" },
  ...metadataEnPreparation,
};

export default function Page() {
  return (
    <EnPreparation
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Nos modèles", path: "/maisons" }, { nom: "Maison 3 chambres" }]}
      titre={"Maison 3 chambres"}
      quand={"Les plans de maison à 3 chambres seront réunis ici, avec leur surface, leurs pièces et leur prix."}
      relais={[{ href: "/maisons", label: "Toute la gamme", quoi: "Les onze modèles, leurs plans et leur prix d'appel." }, { href: "/maisons#prix", label: "Ce que le prix comprend", quoi: "Le détail de ce qui est inclus, et de ce qui ne l'est pas." }]}
    />
  );
}
