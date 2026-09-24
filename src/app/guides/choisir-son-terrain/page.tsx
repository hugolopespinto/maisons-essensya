import type { Metadata } from "next";
import EnPreparation, { metadataEnPreparation } from "@/components/EnPreparation";
import { resolveMetadata } from "@/lib/seo";

/* Page annoncée par l'arborescence du 22/09, pas encore écrite. Le
   gabarit et la raison d'être de ces pages sont dans EnPreparation.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/guides/choisir-son-terrain", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Choisir son terrain constructible",
  description: "Viabilisation, pente, exposition, PLU : ce qu'il faut vérifier avant d'acheter un terrain à bâtir.",
  alternates: { canonical: "/guides/choisir-son-terrain" },
  ...metadataEnPreparation,
};

export default function Page() {
  return (
    <EnPreparation
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Nos guides", path: "/blog" }, { nom: "Choisir votre terrain" }]}
      titre={"Guide pour choisir votre terrain"}
      quand={"Ce qu'il faut vérifier avant d'acheter un terrain, et ce qui se paie après la signature."}
      relais={[{ href: "/annonces?type=terrain", label: "Nos terrains", quoi: "Le stock disponible, avec sa carte." }, { href: "/concept#prix", label: "Ce que le prix comprend", quoi: "Terrain, viabilisation, taxes : ce qui est inclus ou non." }]}
    />
  );
}
