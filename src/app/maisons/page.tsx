import type { Metadata } from "next";
import PageGamme from "@/components/PageGamme";
import { HOUSE, PRICE_FROM, REEL } from "@/data/essensya";
import { modelesAvecVisuels, MODELES } from "@/data/gamme";
import { fmtPrice } from "@/lib/format";
import { jsonLd, listeSchema, produitGamme } from "@/lib/schema";
import { resolveMetadata, titreGamme } from "@/lib/seo";

/* ════════════════════════════════════════════════════════════════
   NOS MODÈLES — la page de gamme

   ⚠ CETTE PAGE ÉTAIT LA FICHE D'UNE MAISON UNIQUE QUI N'EXISTE PAS.
   Elle s'ouvrait sur « Essen », nom commercial inventé pour la maquette,
   affichait deux déclinaisons fictives avec leurs prix, une visite
   pièce par pièce cotée au mètre carré, une toiture monopente en bac
   acier — et un prix d'appel de 94 900 € que la page d'accueil
   contredisait à 78 000 €. Tout cela a été retiré parce que c'était
   FAUX, pas pour alléger : ne pas le réintroduire au détour d'une
   refonte visuelle.

   ── LA REFONTE « VITRINE » (octobre 2026) ──
   La page montrait onze cartes de même taille, chacune avec UNE façade,
   alors que le client a livré entre quatre et neuf rendus par modèle :
   les intérieurs n'étaient visibles qu'en ouvrant les fiches une à une.
   Elle s'organise désormais autour de ces images :

     1. le héros fait défiler les onze façades, Pékin en tête ;
     2. la vitrine montre, modèle par modèle, TOUTES ses vues dans un
        carrousel, avec une visionneuse plein écran ;
     3. le reste — méthode, prestations, prix, dossier — garde ses
        textes, déjà arbitrés avec le client, dans une alternance
        clair / sombre qui laisse respirer les deux blocs d'images.

   Le corps de la page vit dans src/components/PageGamme.tsx depuis le
   24/10 : les pages « Plans maison N chambres » le partagent.

   ⚠ CE QUE LA PAGE DIT N'A PAS CHANGÉ, et rien de plus : la gamme
   existe, voici ses modèles en images, voici le prix d'entrée avec son
   périmètre exact, voici ce que le prix comprend. Aucune surface,
   aucun prix par modèle n'a été ajouté — la vitrine les affiche dès
   qu'ils existent dans src/data/gamme.ts, et s'en tait sinon.

   ⚠ TANT QUE LES CARACTÉRISTIQUES MANQUENT, ON LE DIT. Le bloc
   « caractéristiques à venir » n'est pas un pis-aller : un visiteur qui
   cherche une surface et n'en trouve aucune, sans explication, conclut
   que le site est inachevé. Il disparaîtra tout seul — voir
   `gammeIncomplete()`.
   ════════════════════════════════════════════════════════════════ */

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/maisons", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: titreGamme(),
  description:
    `Une gamme de ${MODELES.length} modèles de maisons individuelles, optimisés jusqu'au dernier mètre carré. ` +
    `À partir de ${fmtPrice(PRICE_FROM)} — ${REEL.mentionPrix.toLowerCase()} ` +
    `Ce que le prix comprend, écrit noir sur blanc.`,
  alternates: { canonical: "/maisons" },
  openGraph: {
    title: titreGamme(),
    images: [HOUSE.heroImage],
  },
};

export default async function MaisonsPage() {
  const modeles = modelesAvecVisuels();

  return (
    <main className="page">
      {/* Un seul `Product`, celui de la gamme, et il ne déclare que ce
          que la page affiche : la marque et le prix d'entrée. Aucune
          surface, aucun modèle nommé — voir src/lib/schema.ts. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(produitGamme()) }}
      />
      {/* ⚠ LES ONZE, Y COMPRIS LES DIX EN `noindex`, ET C'EST DÉLIBÉRÉ.
          Un `ItemList` décrit ce que la page REND ; il ne demande pas
          l'indexation de ce qu'il liste. N'annoncer qu'Ankara
          sous-décrirait une vitrine qui en montre onze. Le sitemap, lui,
          est une promesse d'URL qui répondent : il n'annonce que les
          publiables. Les deux règles sont écrites des deux côtés pour
          qu'elles cessent de se contredire. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            listeSchema(
              "Nos modèles",
              modeles.map((m) => ({ nom: m.nom, path: `/maisons/${m.slug}` })),
            ),
          ),
        }}
      />

      <PageGamme
        modeles={modeles}
        fil={[{ nom: "Accueil", path: "/" }, { nom: "Nos modèles" }]}
        titre="Nos modèles"
        accroche={HOUSE.tagline}
        chambres={null}
        complete
        origine="Page gamme"
      />
    </main>
  );
}
