import type { Metadata } from "next";
import EnPreparation, { metadataEnPreparation } from "@/components/EnPreparation";
import { resolveMetadata } from "@/lib/seo";

/* Page annoncée par la navigation principale (schéma d'arborescence du
   client), pas encore écrite. Le gabarit et la raison d'être de ces
   pages sont dans EnPreparation.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/guides", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Nos guides de construction",
  description: "Terrain, plan, financement, CCMI : les guides pour préparer la construction de votre maison.",
  alternates: { canonical: "/guides" },
  ...metadataEnPreparation,
};

export default function Page() {
  return (
    <EnPreparation
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Nos guides de construction" }]}
      titre={"Nos guides de construction"}
      quand={"Les guides pour préparer votre projet seront réunis ici : choisir son terrain, choisir son plan, financer sa maison, comprendre le CCMI."}
      relais={[{ href: "/concept#faq", label: "Les questions fréquentes", quoi: "Prix, délais, apport, garanties : les réponses les plus demandées." }, { href: "/concept#etapes", label: "Les étapes de construction", quoi: "Le parcours en quatre étapes, déjà détaillé." }]}
    />
  );
}
