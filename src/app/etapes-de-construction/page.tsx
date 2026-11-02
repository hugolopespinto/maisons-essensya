import type { Metadata } from "next";
import PageRedactionnelle from "@/components/PageRedactionnelle";
import { CHAPO, CORPS, FAQ, TITRE } from "@/data/redactionnel/etapes";
import { resolveMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/etapes-de-construction", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Les étapes de construction d'une maison neuve",
  description:
    "Du budget à la remise des clés : les étapes de la construction d'une maison neuve, avec pour chacune une durée indicative, et ce que font le constructeur et le client.",
  alternates: { canonical: "/etapes-de-construction" },
};

export default function Page() {
  return (
    <PageRedactionnelle
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Les étapes de construction" }]}
      titre={TITRE}
      chapo={CHAPO}
      corps={CORPS}
      faq={FAQ}
      titreFaq="FAQ : vos questions sur la construction d'une maison"
      liens={[
        { href: "/contact", label: "Demander une étude personnalisée" },
        { href: "/agences", label: "Trouver une agence" },
      ]}
    />
  );
}
