import type { Metadata } from "next";
import EnPreparation, { metadataEnPreparation } from "@/components/EnPreparation";
import { resolveMetadata } from "@/lib/seo";

/* Page annoncée par l'arborescence du 22/09, pas encore écrite. Le
   gabarit et la raison d'être de ces pages sont dans EnPreparation.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/guides/choisir-son-plan-de-maison", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Choisir son plan de maison",
  description: "Surface, nombre de chambres, orientation, garage : les questions à trancher avant de choisir un plan.",
  alternates: { canonical: "/guides/choisir-son-plan-de-maison" },
  ...metadataEnPreparation,
};

export default function Page() {
  return (
    <EnPreparation
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Nos guides", path: "/blog" }, { nom: "Choisir votre plan de maison" }]}
      titre={"Guide pour choisir votre plan de maison"}
      quand={"Les critères qui comptent vraiment pour choisir un plan, et ceux qui coûtent cher pour rien."}
      relais={[{ href: "/maisons", label: "Nos modèles", quoi: "Les plans disponibles et leurs caractéristiques." }, { href: "/blog", label: "Le journal", quoi: "Nos articles sur la construction." }]}
    />
  );
}
