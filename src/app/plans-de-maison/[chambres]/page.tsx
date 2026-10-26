import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FilAriane from "@/components/FilAriane";
import PageGamme from "@/components/PageGamme";
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

   ⚠ MÊME MISE EN PAGE QUE /maisons (client, 24/10) : héros en
   diaporama, vitrine de toutes les vues, dossier — le composant
   PageGamme, partagé. Ces pages gardaient l'ancienne grille de cartes,
   et le visiteur changeait de site en changeant de filtre.

   ⚠ UNE PAGE VIDE RESTE EN LIGNE, HORS INDEX. Le menu y mène : elle
   doit répondre, et dire ce qui manque plutôt que de rendre 404. Elle
   entre dans l'index et le sitemap dès qu'un modèle publiable y figure.
   Sans modèle, pas de diaporama possible : elle garde alors une simple
   page de texte.
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
  const fil = [
    { nom: "Accueil", path: "/" },
    { nom: "Nos modèles", path: "/maisons" },
    { nom: titre(n) },
  ];

  /* Les modèles qui n'ont pas encore leur nombre de chambres : ni rangés
     au jugé sur cette page, ni passés sous silence. */
  const listeInconnus =
    inconnus.length > 0 ? (
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
    ) : null;

  if (modeles.length > 0) {
    return (
      <main className="page">
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
        <PageGamme
          modeles={modeles}
          fil={fil}
          titre={titre(n)}
          accroche={`Les modèles de la gamme Essensya qui comptent ${libelleChambres(n)}. Toutes leurs vues, et le chiffrage pour votre commune.`}
          chambres={n}
          teteVitrine={{
            titre: `${modeles.length > 1 ? `${modeles.length} modèles` : "Un modèle"} ${libelleChambres(n)}`,
            texte:
              "Choisissez un modèle, faites défiler ses vues, ouvrez-les en plein écran. Le modèle change, la méthode ne change pas.",
          }}
          complete={false}
          origine={`Page ${titre(n).toLowerCase()}`}
          apresVitrine={listeInconnus}
        />
      </main>
    );
  }

  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <FilAriane items={fil} />
          <h1>{titre(n)}</h1>
          <p>
            Les modèles de la gamme Essensya qui comptent {libelleChambres(n)}. Chaque fiche
            montre ses vues, et vous permet de demander le chiffrage pour votre commune.
          </p>

          <nav className="pm-chambres" aria-label="Nombre de chambres">
            {/* Sans filtre, c'est la gamme entière : /plans-de-maison y
                redirige déjà (next.config.ts). */}
            <Link href="/maisons#gamme" className="pm-chambres__lien">
              Tous les modèles
            </Link>
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
          <div className="g-attente">
            <p>
              <strong>Aucun modèle {libelleChambres(n)} n&apos;est encore publié.</strong>
              {inconnus.length > 0 &&
                ` ${inconnus.length} de nos ${total} modèles n'ont pas encore leur nombre de chambres en ligne : cette page se complétera à mesure qu'il sera publié.`}
            </p>
            <p>Vous cherchez une maison {libelleChambres(n)} dès maintenant ?</p>
            <p>
              <Link href="/contact" className="c-link">
                Parlez-nous de votre projet <span className="arrow" aria-hidden="true">→</span>
              </Link>
            </p>
          </div>

          {listeInconnus}

          <p className="pm-gamme__suite">
            <Link href="/maisons#gamme" className="c-link">
              Voir toute la gamme en images <span className="arrow" aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
