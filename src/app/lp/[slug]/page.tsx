import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageCampagneVue from "@/components/PageCampagneVue";
import { pageServie, slugsServis } from "@/lib/campagnes";
import { landingUrl } from "@/lib/format";
import { getContent } from "@/lib/store";
import "@/styles/prose.css";
import "@/styles/pages/gamme.css";
import "@/styles/pages/landing.css";

/* ════════════════════════════════════════════════════════════════
   PAGE DE CAMPAGNE — /lp/<slug>

   La page d'atterrissage d'UN message publicitaire. Elle se compose dans
   le back-office (Contenu › Pages de campagne) ; la page livrée dans le
   code (`ESSENSYA_DATA.landings`) reste servie tant qu'aucune page du
   back-office ne prend son adresse — voir `pageServie()`.

   ⚠ `revalidate` et non `force-static` : les images viennent de la
   médiathèque, dont le bucket est privé. `resoudreMedia()` rend des URL
   signées qui expirent ; une page figée servirait des images mortes.
   Le back-office appelle `revalidatePath()` à chaque enregistrement.

   Le consentement RGPD n'est pas posé ici : il vit dans <LeadForm>, qui
   le rend sur tous les formulaires du site. Une page de campagne est
   justement le genre de page qu'on duplique vite — la case ne doit pas
   dépendre de la vigilance de celui qui duplique.
   ════════════════════════════════════════════════════════════════ */

export const revalidate = 1800;

/* Les pages en ligne au moment du build. Une page publiée plus tard est
   rendue à sa première visite (`dynamicParams`, actif par défaut). */
export async function generateStaticParams() {
  const { campagnes } = await getContent();
  return slugsServis(campagnes).map((slug) => ({ slug }));
}

/** Une image partageable : une adresse publique, jamais une URL signée
 *  de la médiathèque — elle expirerait dans le cache des réseaux sociaux. */
const imagePublique = (v?: string): string | undefined =>
  v && (v.startsWith("/") || /^https?:\/\//i.test(v)) ? v : undefined;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = pageServie((await getContent()).campagnes, slug);
  if (!page) return {};
  const title = page.seo?.title?.trim() || page.titre;
  const description = (page.seo?.description?.trim() || page.sousTitre?.trim() || "").slice(0, 160);
  const image = imagePublique(page.image);
  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical: landingUrl(slug) },
    /* Une page de campagne n'a pas vocation à être indexée : elle double
       des pages du site pour un public précis, et `/lp/` est déjà exclu
       par robots.txt. La balise s'impose là où le fichier se négocie. */
    robots: { index: false, follow: false },
    openGraph: { title, ...(description ? { description } : {}), ...(image ? { images: [image] } : {}) },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = pageServie((await getContent()).campagnes, slug);
  /* Hors ligne, inexistante ou sans titre : 404, sans distinction. */
  if (!page) notFound();

  return <PageCampagneVue page={page} />;
}
