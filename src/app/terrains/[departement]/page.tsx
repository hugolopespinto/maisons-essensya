import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnnonceCard from "@/components/AnnonceCard";
import ZoneAgence from "@/components/ZoneAgence";
import ZoneChiffres from "@/components/ZoneChiffres";
import { PRICE_FROM } from "@/data/essensya";
import { agencesPubliees } from "@/lib/agences";
import { communeUrl, deptUrl, fmtPrice } from "@/lib/format";
import {
  agenceDeZone,
  chiffres,
  communesPubliables,
  departementParSlug,
  departementsPubliables,
} from "@/lib/geo";
import { filAriane, jsonLd, listeSchema } from "@/lib/schema";
import { resolveMetadata } from "@/lib/seo";
import "@/styles/pages/terrains.css";

/* ════════════════════════════════════════════════════════════════
   TERRAINS PAR DÉPARTEMENT

   Le gisement de requêtes le plus important du site, et il était à zéro :
   « terrain à bâtir charente-maritime » n'avait aucune page à atteindre,
   /annonces étant une URL unique pour tout le stock.

   CE QUI REND CETTE PAGE NON DUPLIQUÉE — et c'est la seule question qui
   compte ici, parce que douze pages bâties sur le même gabarit sont
   exactement ce que Google regroupe et dévalue :
     · les chiffres de la zone, calculés sur son stock réel ;
     · les annonces elles-mêmes, qui ne se recoupent jamais ;
     · l'agence qui la couvre, seul contenu rédigé et proprement local ;
     · le maillage vers ses communes, différent partout.

   ⚠ TITRE SANS PRÉPOSITION, et c'est délibéré. « en Charente-Maritime »
   se dit, « en Deux-Sèvres » non — le genre et le nombre d'un
   département ne se déduisent pas de son nom, et le flux en sert douze.
   Un deux-points garde l'adjacence des mots-clés sans prendre le
   risque d'une faute de français sur douze pages à la fois.
   ════════════════════════════════════════════════════════════════ */

export const revalidate = 1800;

/* Les départements publiables au moment du build. Un département qui
   franchit le seuil plus tard est rendu à la première visite
   (`dynamicParams`, actif par défaut), puis figé par l'ISR. */
export async function generateStaticParams() {
  const depts = await departementsPubliables();
  return depts.map((d) => ({ departement: d.slug }));
}

/* Deux-points plutôt que tiret cadratin : le gabarit du layout ajoute
   déjà « — Maisons Essensya », et deux cadratins dans un même titre
   rendent le résultat de recherche illisible. Toujours pas de
   préposition, pour la raison expliquée en tête de fichier. */
const titreDe = (nom: string, code: string) => `Terrains à bâtir : ${nom} (${code})`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ departement: string }>;
}): Promise<Metadata> {
  const { departement } = await params;
  const d = await departementParSlug(departement);
  if (!d) return {};

  const c = chiffres(d.annonces);
  const prix = c.prixMin !== null ? ` à partir de ${fmtPrice(c.prixMin)}` : "";

  /* Le chemin passé à `resolveMetadata` est celui de CETTE page : si une
     surcharge y est un jour enregistrée, elle s'applique. L'écran
     Référencement ne propose pas encore les zones — elles sont trop
     nombreuses et varient avec le stock — mais le branchement, lui, est
     déjà là, et ne promet rien qu'il ne tienne. */
  return resolveMetadata(deptUrl(d.slug), {
    title: titreDe(d.nom, d.code),
    description:
      `${c.total} terrain${c.total > 1 ? "s" : ""} disponible${c.total > 1 ? "s" : ""}` +
      ` dans le département ${d.nom} (${d.code})${prix}. Seuls ou livrés avec la maison Essensya, ` +
      `à partir de ${fmtPrice(PRICE_FROM)} hors terrain — même prix partout.`,
    alternates: { canonical: deptUrl(d.slug) },
  });
}

export default async function DepartementPage({
  params,
}: {
  params: Promise<{ departement: string }>;
}) {
  const { departement } = await params;
  const d = await departementParSlug(departement);
  if (!d) notFound();

  const c = chiffres(d.annonces);
  const communes = communesPubliables(d);
  const agence = agenceDeZone(
    await agencesPubliees(),
    d.communes.map((x) => x.nom),
  );
  const titre = titreDe(d.nom, d.code);

  return (
    <main className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            listeSchema(
              titre,
              /* On ne balise que ce que la page affiche : les annonces,
                 pas les communes du maillage. */
              d.annonces.map((a) => ({
                nom: `${a.type === "terrain" ? "Terrain" : "Terrain + maison"} à ${a.city}`,
                path: `/annonces/${a.id.toLowerCase()}`,
              })),
            ),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            filAriane([
              { nom: "Accueil", path: "/" },
              { nom: "Terrains", path: "/terrains" },
              { nom: d.nom },
            ]),
          ),
        }}
      />

      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <Link href="/terrains">Terrains</Link>
            <span className="sep">/</span>
            <span>{d.nom}</span>
          </nav>
          <h1>{titre}</h1>
          <p>
            Des parcelles repérées par nos agences dans le département {d.nom},
            seules ou livrées avec la maison. Elle est la même ici qu&apos;ailleurs,
            et son prix aussi : à partir de {fmtPrice(PRICE_FROM)} hors terrain.
          </p>
          <ZoneChiffres c={c} />
        </div>
      </section>

      {communes.length > 0 && (
        <section className="tz-section">
          <div className="container">
            <h2>Par commune</h2>
            <div className="tz-maillage">
              {communes.map((x) => (
                <Link key={x.slug} href={communeUrl(d.slug, x.slug)} className="tz-lien">
                  {x.nom} <em>{x.annonces.length}</em>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="tz-section" style={{ paddingBottom: "var(--s-5)" }}>
        <div className="container">
          <h2>
            {c.total} terrain{c.total > 1 ? "s" : ""} disponible
            {c.total > 1 ? "s" : ""}
          </h2>
          <div className="tz-grid" style={{ marginTop: "var(--s-3)" }}>
            {d.annonces.map((a) => (
              <AnnonceCard annonce={a} key={a.id} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: "var(--s-7)" }}>
        <div className="container">
          <ZoneAgence agence={agence} zone="ce département" />
        </div>
      </section>
    </main>
  );
}
