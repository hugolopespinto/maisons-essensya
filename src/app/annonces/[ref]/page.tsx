import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAnnonceByRef, getAnnonces } from "@/lib/vitahome/annonces";
import { FicheAnnonce, metadataFiche } from "./fiche";

/* La fiche elle-même vit dans ./fiche.tsx : elle sert aussi la route
   des versions, /annonces/[ref]/[version]. */

/* Le flux bouge : on pré-rend les annonces connues au build et on laisse
   Next générer les nouvelles à la demande (ISR). */
export async function generateStaticParams() {
  const annonces = await getAnnonces();
  return annonces.map((a) => ({ ref: a.id.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ref: string }>;
}): Promise<Metadata> {
  const { ref } = await params;
  const a = await getAnnonceByRef(ref);
  return a ? metadataFiche(a) : {};
}

export default async function AnnoncePage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const a = await getAnnonceByRef(ref);
  if (!a) notFound();
  return <FicheAnnonce a={a} />;
}
