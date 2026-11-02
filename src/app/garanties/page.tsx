import type { Metadata } from "next";
import PageRedactionnelle from "@/components/PageRedactionnelle";
import { resolveMetadata } from "@/lib/seo";

/* ⚠ TEXTE À FAIRE VALIDER PAR LE CLIENT, qui n'en a pas livré pour cette page :
   il ne reprend que ses documents du 01/11 (Construire_Landes, Etapes). Ces
   documents annoncent « 10 garanties » sans les énumérer : seules celles qu'ils
   nomment sont décrites ici. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/garanties", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Nos garanties",
  description:
    "Livraison, parfait achèvement, biennale, décennale, dommages-ouvrage : les garanties qui encadrent votre construction.",
  alternates: { canonical: "/garanties" },
};

const CORPS = `## Le contrat CCMI, le cadre le plus protecteur

Le contrat de construction de maison individuelle (CCMI), encadré par la loi du 19 décembre 1990, fixe un prix ferme et un délai. Les garanties et les assurances sont incluses dans nos contrats de construction.

## Avant et pendant le chantier

### La garantie de livraison à prix et délais convenus

Elle protège votre projet jusqu'à la remise des clés : la maison vous est livrée au prix et dans les délais fixés par le contrat. Avant de signer, vérifiez que le CCMI mentionne l'attestation de cette garantie.

### L'assurance dommages-ouvrage

Souscrite par Maisons ESSENSYA, à votre nom, avant l'ouverture des travaux, elle préfinance les réparations sans attendre de décision de justice.

## Après la remise des clés

La signature du procès-verbal de réception fait démarrer les garanties légales.

- **La garantie de parfait achèvement, pendant un an.**
- **La garantie de bon fonctionnement des équipements (biennale), pendant deux ans.**
- **La garantie décennale, pendant dix ans :** elle couvre les dommages qui compromettent la solidité du bâtiment ou le rendent impropre à sa destination.
`;

export default function Page() {
  return (
    <PageRedactionnelle
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Nos garanties" }]}
      titre="Nos garanties"
      chapo="Les garanties qui encadrent votre construction : ce qu'elles couvrent, et pendant combien de temps."
      corps={CORPS}
      liens={[
        { href: "/contact", label: "Parler de mon projet" },
        { href: "/concept#engagements", label: "Nos engagements" },
      ]}
    />
  );
}
