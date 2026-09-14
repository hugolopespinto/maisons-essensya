import type { Metadata } from "next";
import Link from "next/link";
import ZoneChiffres from "@/components/ZoneChiffres";
import { PRICE_FROM } from "@/data/essensya";
import { deptUrl, fmtPrice } from "@/lib/format";
import { chiffres, departementsPubliables, SEUIL_DEPARTEMENT } from "@/lib/geo";
import { filAriane, jsonLd, listeSchema } from "@/lib/schema";
import { resolveMetadata } from "@/lib/seo";
import "@/styles/pages/terrains.css";

/* ════════════════════════════════════════════════════════════════
   OÙ NOUS CONSTRUISONS — la racine des pages de zone

   Cette page a deux fonctions, et la seconde compte autant que la
   première : elle donne aux pages de département un point d'entrée
   indexable. Un sitemap suffit à faire découvrir une URL ; il ne suffit
   pas à lui donner du poids. Le maillage interne, si.

   ⚠ Elle ne liste QUE les départements publiables. Lier depuis ici un
   département sous le seuil reviendrait à annoncer une page qui rend
   404 — voir `departementsPubliables()` dans src/lib/geo.ts.
   ════════════════════════════════════════════════════════════════ */

export const revalidate = 1800;

const TITRE = "Où nous construisons";

export async function generateMetadata(): Promise<Metadata> {
  const depts = await departementsPubliables();
  const noms = depts.map((d) => d.nom).join(", ");
  return resolveMetadata("/terrains", {
    title: "Terrains à bâtir : tous nos départements",
    /* La description nomme les départements réellement couverts : c'est
       ce qui la rend vraie au fil du stock, et utile dans les résultats.
       Si le flux se vide, la phrase tient encore. */
    description: noms
      ? `Nos terrains à bâtir, département par département : ${noms}. La maison est la même partout, et son prix aussi — à partir de ${fmtPrice(PRICE_FROM)} hors terrain.`
      : `Nos terrains à bâtir, département par département. La maison est la même partout, et son prix aussi — à partir de ${fmtPrice(PRICE_FROM)} hors terrain.`,
    alternates: { canonical: "/terrains" },
  });
}

export default async function TerrainsPage() {
  const depts = await departementsPubliables();
  const global = chiffres(depts.flatMap((d) => d.annonces));

  return (
    <main className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            listeSchema(
              TITRE,
              depts.map((d) => ({ nom: d.nom, path: deptUrl(d.slug) })),
            ),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(filAriane([{ nom: "Accueil", path: "/" }, { nom: TITRE }])),
        }}
      />

      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>Terrains</span>
          </nav>
          <h1>{TITRE}</h1>
          <p>
            Nos agences repèrent les parcelles compatibles avec la maison, souvent
            avant leur mise sur le marché. Le lieu change ; la maison, et son prix,
            ne changent pas.
          </p>
        </div>
      </section>

      <section>
        <div className="container">
          <ZoneChiffres c={global} />
        </div>
      </section>

      <section className="tz-section" style={{ paddingBottom: "var(--s-7)" }}>
        <div className="container">
          <h2>Par département</h2>
          {depts.length ? (
            <>
              <div className="tz-maillage">
                {depts.map((d) => (
                  <Link key={d.code} href={deptUrl(d.slug)} className="tz-lien">
                    {d.nom} <em>{d.code}</em> <em>· {d.annonces.length}</em>
                  </Link>
                ))}
              </div>
              {/* Dire pourquoi la liste est ce qu'elle est, plutôt que de
                  laisser croire que nous ne construisons nulle part
                  ailleurs. Le listing complet reste à un clic. */}
              <p className="u-muted" style={{ marginTop: "var(--s-3)", fontSize: "var(--fs-small)" }}>
                Ces départements sont ceux où nous avons au moins{" "}
                {SEUIL_DEPARTEMENT} terrains en ce moment. Nous construisons
                ailleurs :{" "}
                <Link href="/annonces" className="c-link" style={{ display: "inline" }}>
                  voir tous les terrains
                </Link>{" "}
                ou{" "}
                <Link href="/contact" className="c-link" style={{ display: "inline" }}>
                  dites-nous où vous cherchez
                </Link>
                .
              </p>
            </>
          ) : (
            /* Le flux peut être vide — token expiré, maintenance Vitahome.
               On ne laisse pas une page blanche : on renvoie au contact,
               qui reste valable quoi qu'il arrive. */
            <p style={{ maxWidth: "38em", marginTop: "var(--s-3)" }}>
              Nos terrains sont en cours de mise à jour.{" "}
              <Link href="/contact" className="c-link" style={{ display: "inline" }}>
                Dites-nous où vous construisez →
              </Link>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
