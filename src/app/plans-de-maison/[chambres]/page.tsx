import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FilAriane from "@/components/FilAriane";
import ModeleCard from "@/components/ModeleCard";
import { PRICE_FROM } from "@/data/essensya";
import { modelesAvecVisuels } from "@/data/gamme";
import { fmtPrice } from "@/lib/format";
import {
  CHAMBRES_PLANS,
  chambresDuSlugPlans,
  libelleChambres,
  modelesAChambres,
  modelesChambresInconnues,
  plansPubliables,
  slugPlans,
  urlPlans,
} from "@/lib/plans";
import { jsonLd, listeSchema } from "@/lib/schema";
import { resolveMetadata } from "@/lib/seo";
import "@/styles/pages/gamme.css";
import "@/styles/pages/plans.css";

/* ════════════════════════════════════════════════════════════════
   PLANS DE MAISON N CHAMBRES

   Les modèles de la gamme qui ont exactement N chambres — la
   destination des liens « Plans maison N chambres » du menu. Le pourquoi
   et la règle des données incomplètes sont dans src/lib/plans.ts.

   ⚠ UNE PAGE VIDE RESTE EN LIGNE, HORS INDEX. Le menu y mène : elle
   doit répondre, et dire ce qui manque plutôt que de rendre 404. Elle
   entre dans l'index et le sitemap dès qu'un modèle publiable y figure.
   ════════════════════════════════════════════════════════════════ */

export const dynamicParams = false;
export const revalidate = 1800;

export async function generateStaticParams() {
  return CHAMBRES_PLANS.map((n) => ({ chambres: slugPlans(n) }));
}

const titre = (n: number) => `Plans de maison ${libelleChambres(n)}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chambres: string }>;
}): Promise<Metadata> {
  const { chambres } = await params;
  const n = chambresDuSlugPlans(chambres);
  if (n === null) return {};

  const noms = modelesAChambres(n).map((m) => m.nom);
  return resolveMetadata(urlPlans(n), {
    title: titre(n),
    description: noms.length
      ? `Nos modèles de maison ${libelleChambres(n)} : ${noms.join(", ")}. ` +
        `Des plans optimisés jusqu'au dernier mètre carré, dans une gamme à partir de ${fmtPrice(PRICE_FROM)} hors terrain.`
      : `Les modèles de maison ${libelleChambres(n)} de la gamme Essensya : leurs vues, et le chiffrage pour votre commune.`,
    alternates: { canonical: urlPlans(n) },
    ...(plansPubliables(n) ? {} : { robots: { index: false, follow: true } }),
  });
}

export default async function PlansParChambresPage({
  params,
}: {
  params: Promise<{ chambres: string }>;
}) {
  const { chambres } = await params;
  const n = chambresDuSlugPlans(chambres);
  if (n === null) notFound();

  const modeles = modelesAChambres(n);
  const inconnus = modelesChambresInconnues();
  const total = modelesAvecVisuels().length;

  return (
    <main className="page">
      {modeles.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              listeSchema(
                titre(n),
                modeles.map((m) => ({ nom: m.nom, path: `/maisons/${m.slug}` })),
              ),
            ),
          }}
        />
      )}

      <section className="p-head">
        <div className="container">
          <FilAriane
            items={[
              { nom: "Accueil", path: "/" },
              { nom: "Nos modèles", path: "/maisons" },
              { nom: titre(n) },
            ]}
          />
          <h1>{titre(n)}</h1>
          <p>
            Les modèles de la gamme Essensya qui comptent {libelleChambres(n)}. Chaque fiche
            montre ses vues, et vous permet de demander le chiffrage pour votre commune.
          </p>

          <nav className="pm-chambres" aria-label="Nombre de chambres">
            {CHAMBRES_PLANS.map((k) => (
              <Link
                key={k}
                href={urlPlans(k)}
                className="pm-chambres__lien"
                aria-current={k === n ? "page" : undefined}
              >
                {libelleChambres(k)}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section className="g-gamme pm-gamme">
        <div className="container">
          {modeles.length > 0 ? (
            <div className="g-gamme__grid">
              {modeles.map((m) => (
                <ModeleCard modele={m} key={m.slug} />
              ))}
            </div>
          ) : (
            <div className="g-attente">
              <p>
                <strong>Aucun modèle {libelleChambres(n)} n&apos;est encore publié.</strong>
                {inconnus.length > 0 &&
                  ` ${inconnus.length} de nos ${total} modèles n'ont pas encore leur nombre de chambres en ligne : cette page se complétera à mesure qu'il sera publié.`}
              </p>
              <p>Vous cherchez une maison {libelleChambres(n)} dès maintenant ?</p>
              <p>
                <Link href="/contact" className="c-link">
                  Parlez-nous de votre projet <span className="arrow">→</span>
                </Link>
              </p>
            </div>
          )}

          {/* Les modèles qui n'ont pas encore leur nombre de chambres : ni
              rangés au jugé sur cette page, ni passés sous silence. */}
          {inconnus.length > 0 && (
            <div className="pm-inconnus">
              <p className="c-label">Nombre de chambres à confirmer</p>
              <ul>
                {inconnus.map((m) => (
                  <li key={m.slug}>
                    <Link href={`/maisons/${m.slug}`}>{m.nom}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="pm-gamme__suite">
            <Link href="/maisons#gamme" className="c-link">
              Voir toute la gamme en images <span className="arrow">→</span>
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
