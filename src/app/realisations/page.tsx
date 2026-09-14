import type { Metadata } from "next";
import Link from "next/link";
import { REEL } from "@/data/essensya";
import { fmtPrice } from "@/lib/format";
import { resoudreMedia } from "@/lib/medias";
import { filAriane, jsonLd, listeSchema } from "@/lib/schema";
import { resolveMetadata } from "@/lib/seo";
import { getContent } from "@/lib/store";
import type { Realisation } from "@/lib/store/types";
import "@/styles/pages/realisations.css";

/* ════════════════════════════════════════════════════════════════
   NOS RÉALISATIONS

   La page la plus convaincante d'un site de constructeur, et la seule
   que personne ne peut fabriquer : elle ne contient que des maisons
   réellement livrées.

   ⚠ ELLE EST VIDE AUJOURD'HUI, ET C'EST VOULU. Le site dispose de
   rendus 3D magnifiques — dix modèles, soixante-quatorze vues. Les
   poser ici serait immédiat, et ce serait une pratique commerciale
   trompeuse : un acquéreur qui regarde des « réalisations » croit voir
   des chantiers terminés, pas des images de synthèse. L'écart entre les
   deux est précisément ce qu'il cherche à évaluer.

   Tant que le client n'a pas transmis de photographies, la page dit ce
   qu'elle est, et renvoie vers les modèles — qui, eux, assument d'être
   des rendus. Une page honnête vaut mieux qu'une page flatteuse.

   ⚠ `revalidate` et non `force-static` : les photos viennent de la
   médiathèque, dont le bucket est privé. `resoudreMedia()` rend alors
   une URL signée qui expire au bout d'une heure (src/lib/medias.ts) ;
   une page figée servirait des images mortes dès la deuxième heure.
   ════════════════════════════════════════════════════════════════ */

export const revalidate = 1800;

const TITRE = "Nos réalisations";

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/realisations", {
    title: "Nos réalisations dans les Landes",
    description:
      "Les maisons que nous avons construites et livrées, commune par commune. Des chantiers terminés, pas des images de synthèse.",
    alternates: { canonical: "/realisations" },
  });
}

/** Publiées, dans l'ordre voulu par le client. */
const publiees = (liste: Realisation[]): Realisation[] =>
  liste
    .filter((r) => r.actif && r.commune.trim())
    .sort((a, b) => a.ordre - b.ordre || a.commune.localeCompare(b.commune, "fr"));

/** « Lisbonne · 2025 » — sans les séparateurs des champs vides. */
const sousTitre = (r: Realisation) =>
  [r.modele?.trim(), r.annee?.trim()].filter(Boolean).join(" · ");

export default async function RealisationsPage() {
  const { realisations } = await getContent();
  const liste = publiees(realisations);

  /* Les URL signées sont résolues en une fois : une par fiche, en
     parallèle, plutôt qu'en cascade pendant le rendu. */
  const avecImages = await Promise.all(
    liste.map(async (r) => ({ r, src: await resoudreMedia(r.image) })),
  );

  return (
    <main className="page">
      {liste.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              listeSchema(
                TITRE,
                /* Pas de `path` : ces fiches n'ont pas d'URL propre.
                   `listeSchema` sait n'émettre que le nom — on ne balise
                   jamais un lien qui n'existe pas. */
                liste.map((r) => ({ nom: `Maison livrée à ${r.commune}` })),
              ),
            ),
          }}
        />
      )}
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
            <span>Réalisations</span>
          </nav>
          <h1>{TITRE}</h1>
          <p>
            Les maisons que nous avons construites et livrées dans les Landes.
            Des chantiers terminés, commune par commune.
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: "var(--s-7)" }}>
        <div className="container">
          {avecImages.length === 0 ? (
            /* L'état vide dit la vérité et propose la suite, plutôt que
               de laisser un blanc ou de combler avec des rendus. */
            <div className="rz-vide">
              <h2>Nos premiers chantiers arrivent</h2>
              <p>
                Nous préférons attendre d&apos;avoir photographié nos maisons
                livrées plutôt que d&apos;illustrer cette page avec des images de
                synthèse. En attendant, nos modèles sont présentés en détail —
                plans, prestations et prix — à partir de{" "}
                {fmtPrice(REEL.prixEntree)} hors terrain.
              </p>
              <div className="rz-vide__actions">
                <Link href="/maisons" className="c-btn c-btn--solid">
                  Découvrir nos modèles <span className="arrow">→</span>
                </Link>
                <Link href="/contact" className="c-btn">
                  Visiter une maison
                </Link>
              </div>
            </div>
          ) : (
            <div className="rz-grid">
              {avecImages.map(({ r, src }) => (
                <article className="rz-carte" key={r.id} data-reveal>
                  <div className="rz-carte__media">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={r.imageAlt?.trim() || `Maison Essensya livrée à ${r.commune}`}
                        loading="lazy"
                      />
                    ) : (
                      /* Fiche sans photo : on garde le cadre et le texte
                         plutôt que de laisser une image cassée. */
                      <span className="rz-carte__sansphoto">Photo à venir</span>
                    )}
                  </div>
                  <div className="rz-carte__corps">
                    <h2>{r.commune}</h2>
                    {sousTitre(r) && <p className="c-label">{sousTitre(r)}</p>}
                    {r.texte?.trim() && <p className="u-muted">{r.texte}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
