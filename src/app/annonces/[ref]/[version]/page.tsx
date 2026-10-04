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
   comme la fiche de la parcelle. Les deux segments sont produits ICI,
   pour tout le catalogue : `[ref]` n'a pas de layout qui génère ses
   paramètres, Next appelle donc cette fonction une seule fois, sans
   paramètre parent.
   ⚠ SANS ARGUMENT, et c'est voulu. La version précédente déclarait un
   `params` optionnel pour un appel « par parcelle » qui n'arrivait
   jamais — et le contrôle de types du build webpack (NextTypesPlugin)
   exige un `params` obligatoire : `next build --webpack` échouait. */
export async function generateStaticParams() {
  const annonces = await getAnnonces();
  return annonces.flatMap((a) =>
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
