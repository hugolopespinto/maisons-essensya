import type { Metadata } from "next";
import PageRedactionnelle from "@/components/PageRedactionnelle";
import { FAQ } from "@/data/faq";
import { resolveMetadata } from "@/lib/seo";

/* La FAQ au complet, avec ses données structurées. /concept#faq n'en garde
   qu'un extrait et un lien vers ici : la même FAQ sur deux adresses se ferait
   concurrence. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/faq", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Foire aux questions",
  description:
    "Prix, personnalisation, contrat CCMI, terrain, délais, apport : les réponses à vos questions sur la construction de votre maison avec Maisons Essensya.",
  alternates: { canonical: "/faq" },
};

export default function Page() {
  return (
    <PageRedactionnelle
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Foire aux questions" }]}
      titre="Foire aux questions"
      chapo="Prix, personnalisation, contrat, terrain, délais, apport : les réponses avant les questions."
      corps=""
      faq={FAQ}
      titreFaq="Vos questions, nos réponses"
      liens={[
        { href: "/contact", label: "Poser une autre question" },
        { href: "/etapes-de-construction", label: "Les étapes de construction" },
      ]}
    />
  );
}
