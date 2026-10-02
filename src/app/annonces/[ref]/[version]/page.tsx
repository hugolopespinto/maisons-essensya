import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { chambresDuSlug, slugChambres, versionAChambres, versionsAvecFiche } from "@/lib/offres";
import { getAnnonceByRef, getAnnonces } from "@/lib/vitahome/annonces";
import type { Annonce } from "@/types";
import { FicheAnnonce, metadataFiche } from "../fiche";

/* ════════════════════════════════════════════════════════════════
   UNE PARCELLE, VUE AVEC SA MAISON À N CHAMBRES

   /annonces/[ref]/3-chambres : la fiche de la parcelle, mais avec les
   chiffres de la version 3 chambres au lieu de ceux de la moins chère.
   C'est là que mène une carte du listing filtré par chambres quand la
   version cherchée n'est pas la moins chère — voir src/lib/offres.ts.

   La canonical reste la fiche de la parcelle (`metadataFiche`) : Google
   n'y voit qu'une page, le visiteur voit la maison qu'il a choisie.
   ════════════════════════════════════════════════════════════════ */

/* Pré-rendu des versions connues au build, les autres à la demande —
   comme la fiche de la parcelle. Écrit pour les deux modes d'appel de
   Next : une fois par parcelle (avec `params.ref`), ou une seule fois
   pour tout le catalogue. */
export async function generateStaticParams({ params }: { params?: { ref?: string } }) {
  const annonces = await getAnnonces();
  const cible = params?.ref
    ? annonces.filter((a) => a.id.toLowerCase() === params.ref)
    : annonces;
  return cible.flatMap((a) =>
    /* Les seules versions vers lesquelles le listing renvoie : les
       autres mènent à la fiche ordinaire (voir `urlVersion`). */
    versionsAvecFiche(a).map((n) => ({ ref: a.id.toLowerCase(), version: slugChambres(n) })),
  );
}

/** La parcelle projetée sur la version demandée, ou `null` : segment qui
 *  n'est pas une version, parcelle inconnue, ou version qu'elle n'a pas. */
async function charger(ref: string, version: string): Promise<Annonce | null> {
  const n = chambresDuSlug(version);
  if (n === null) return null;
  const a = await getAnnonceByRef(ref);
  return a ? versionAChambres(a, n) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ref: string; version: string }>;
}): Promise<Metadata> {
  const { ref, version } = await params;
  const vue = await charger(ref, version);
  return vue ? metadataFiche(vue) : {};
}

export default async function VersionAnnoncePage({
  params,
}: {
  params: Promise<{ ref: string; version: string }>;
}) {
  const { ref, version } = await params;
  const vue = await charger(ref, version);
  if (!vue) notFound();
  return <FicheAnnonce a={vue} />;
}
