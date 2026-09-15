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
  communeParSlug,
  communesPubliables,
  departementsPubliables,
} from "@/lib/geo";
import { filAriane, jsonLd, listeSchema } from "@/lib/schema";
import { resolveMetadata } from "@/lib/seo";
import "@/styles/pages/terrains.css";

/* ════════════════════════════════════════════════════════════════
   TERRAINS PAR COMMUNE

   Le niveau le plus rentable — « terrain à bâtir la rochelle » vaut dix
   fois « terrain à bâtir charente-maritime » en intention d'achat — et
   le plus dangereux : c'est ici qu'on fabriquerait cent pages à une
   annonce si personne ne tenait la porte.

   La porte, c'est `communeParSlug()`, qui ne sert QUE les communes
   au-dessus de `SEUIL_COMMUNE`. Une URL forgée à la main vers une
   commune à une annonce rend 404 — sinon le seuil ne protégerait que le
   maillage interne, et pas l'index.

   Ici, au moins, le français est simple : « à {ville} » marche toujours.
   ════════════════════════════════════════════════════════════════ */

export const revalidate = 1800;

export async function generateStaticParams() {
  const depts = await departementsPubliables();
  return depts.flatMap((d) =>
    communesPubliables(d).map((c) => ({ departement: d.slug, commune: c.slug })),
  );
}

const titreDe = (ville: string, cp: string) =>
  `Terrains à bâtir à ${ville}${cp ? ` (${cp})` : ""}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ departement: string; commune: string }>;
}): Promise<Metadata> {
  const { departement, commune } = await params;
  const c = await communeParSlug(departement, commune);
  if (!c) return {};

  const n = chiffres(c.annonces);
  const prix = n.prixMin !== null ? ` à partir de ${fmtPrice(n.prixMin)}` : "";

  return resolveMetadata(communeUrl(c.departement.slug, c.slug), {
    title: titreDe(c.nom, c.cp),
    description:
      `${n.total} terrain${n.total > 1 ? "s" : ""} à bâtir à ${c.nom}${prix}. ` +
      `Seuls ou livrés avec la maison Essensya, à partir de ${fmtPrice(PRICE_FROM)} ` +
      `hors terrain — le même prix qu'ailleurs.`,
    alternates: { canonical: communeUrl(c.departement.slug, c.slug) },
  });
}

export default async function CommunePage({
  params,
}: {
  params: Promise<{ departement: string; commune: string }>;
}) {
  const { departement, commune } = await params;
  const c = await communeParSlug(departement, commune);
  if (!c) notFound();

  const n = chiffres(c.annonces);
  const agence = agenceDeZone(await agencesPubliees(), [c.nom]);
  const titre = titreDe(c.nom, c.cp);

  return (
    <main className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            listeSchema(
              titre,
              c.annonces.map((a) => ({
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
              { nom: c.departement.nom, path: deptUrl(c.departement.slug) },
              { nom: c.nom },
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
            <Link href={deptUrl(c.departement.slug)}>{c.departement.nom}</Link>
            <span className="sep">/</span>
            <span>{c.nom}</span>
          </nav>
          <h1>{titre}</h1>
          <p>
            Nos parcelles disponibles à {c.nom}, seules ou livrées avec la maison
            de votre choix. Nos modèles sont les mêmes partout, et leur prix aussi :
            à partir de {fmtPrice(PRICE_FROM)} hors terrain.
          </p>
          <ZoneChiffres c={n} />
        </div>
      </section>

      <section className="tz-section" style={{ paddingBottom: "var(--s-5)" }}>
        <div className="container">
          <div className="tz-grid">
            {c.annonces.map((a) => (
              <AnnonceCard annonce={a} key={a.id} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: "var(--s-7)" }}>
        <div className="container">
          <ZoneAgence agence={agence} zone={c.nom} />
          {/* Remontée explicite vers le département : c'est ce lien qui
              fait circuler l'autorité entre les pages de zone, et c'est
              aussi la sortie naturelle quand aucune parcelle de la
              commune ne convient au visiteur. */}
          <p style={{ marginTop: "var(--s-4)" }}>
            <Link href={deptUrl(c.departement.slug)} className="c-link">
              Tous nos terrains dans le département {c.departement.nom} →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
