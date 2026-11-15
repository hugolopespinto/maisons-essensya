import type { Metadata } from "next";
import FilAriane from "@/components/FilAriane";
import { resolveMetadata } from "@/lib/seo";
import { getContent } from "@/lib/store";
import type { Avis } from "@/lib/store/types";
import "@/styles/pages/avis-clients.css";

/* ════════════════════════════════════════════════════════════════
   AVIS CLIENTS — la version « maison », sans API Google

   L'API Place Details ne rend que 5 avis par fiche, facturés, et il
   faudrait un `place_id` par agence. Ici, le back-office (/admin/avis)
   laisse recopier mot pour mot des avis réels — Google, Trustpilot, ou
   recueillis directement — avec un lien vers l'avis d'origine : c'est ce
   lien, pas un badge, qui atteste qu'ils n'ont pas été inventés.

   ⚠ PAS DE DONNÉES STRUCTURÉES « Review »/« AggregateRating » ICI, et
   c'est volontaire. Les consignes de Google sur les extraits d'avis
   excluent les avis auto-hébergés sur le site de l'entreprise qu'ils
   concernent : les baliser ferait courir un risque de pénalité pour un
   rich result qui ne s'afficherait de toute façon pas.

   ⚠ Page restée hors du menu principal tant qu'elle est vide (voir
   src/data/navigation.ts) : ajouter l'entrée est le geste à faire une
   fois que de vrais avis auront été saisis dans le back-office.
   ════════════════════════════════════════════════════════════════ */

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/avis-clients", {
    title: "Avis clients",
    description: "Ce que disent nos clients de Maisons Essensya, après la remise des clés.",
    alternates: { canonical: "/avis-clients" },
  });
}

/** Publiés, dans l'ordre voulu par le client. */
const publies = (liste: Avis[]): Avis[] =>
  liste
    .filter((a) => a.actif && a.auteur.trim() && a.texte.trim())
    .sort((a, b) => a.ordre - b.ordre);

/** « Saint-Vincent-de-Tyrosse · Avril 2025 » — sans séparateur de champ vide. */
const sousTitre = (a: Avis) => [a.agence?.trim(), a.date?.trim()].filter(Boolean).join(" · ");

function Etoiles({ note }: { note: number }) {
  const pleines = Math.min(5, Math.max(0, Math.round(note)));
  return (
    <span className="av-etoiles" role="img" aria-label={`${pleines} étoiles sur 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} aria-hidden="true">
          {i < pleines ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

export default async function AvisClientsPage() {
  const { avis } = await getContent();
  const liste = publies(avis);

  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <FilAriane items={[{ nom: "Accueil", path: "/" }, { nom: "Avis clients" }]} />
          <h1>Avis clients</h1>
          <p>Ce que disent nos clients, après la remise des clés.</p>
        </div>
      </section>

      <section style={{ paddingBottom: "var(--s-7)" }}>
        <div className="container">
          {liste.length === 0 ? (
            <div className="av-vide">
              <h2>Nos premiers avis arrivent</h2>
              <p>
                Cette page affichera les avis de nos clients dès que nous en aurons
                recueilli. En attendant, n&apos;hésitez pas à consulter les avis
                publiés sur les fiches Google de nos agences.
              </p>
            </div>
          ) : (
            <div className="av-grid">
              {liste.map((a) => (
                <article className="av-carte" key={a.id}>
                  <Etoiles note={a.note} />
                  <p className="av-carte__texte">&laquo;&nbsp;{a.texte}&nbsp;&raquo;</p>
                  <div className="av-carte__pied">
                    <div>
                      <strong>{a.auteur}</strong>
                      {sousTitre(a) && <p className="c-label">{sousTitre(a)}</p>}
                    </div>
                    {a.lien ? (
                      <a
                        href={a.lien}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="av-carte__source"
                      >
                        {a.source?.trim() || "Voir l'avis"} <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      a.source?.trim() && <span className="av-carte__source">{a.source}</span>
                    )}
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
