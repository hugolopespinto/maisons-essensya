import type { Metadata } from "next";
import Link from "next/link";
import AgencyCard from "@/components/AgencyCard";
import { REEL } from "@/data/essensya";
import { agencesPubliees } from "@/lib/agences";
import { fmtPrice } from "@/lib/format";
import { resolveMetadata } from "@/lib/seo";
import { filAriane, jsonLd, listeSchema } from "@/lib/schema";
import { getContent } from "@/lib/store";
import type { PageEditable } from "@/lib/store/types";
import "@/styles/pages/agences.css";

/* ════════════════════════════════════════════════════════════════
   NOS AGENCES — la liste

   Les agences ne sont plus figées dans le code : elles viennent du
   contenu éditable. Avec un repli sur `AGENCIES` tant que RIEN n'a été
   saisi, pour que le site livré continue de tourner tel quel avant la
   première connexion du client au back-office.

   La lecture, le tri et le repli vivent dans `src/lib/agences.ts` —
   partagés avec la fiche d'agence et les pages de zone. La règle qui
   compte y est écrite : le repli sur la constante ne joue QUE si la
   liste est vide, jamais si toutes les agences ont été masquées.

   ⚠ `revalidate` PLUTÔT QUE `force-static`. Les photos d'agence peuvent
   venir de la médiathèque, dont le bucket est privé : `resoudreMedia()`
   rend alors une URL SIGNÉE qui expire au bout d'une heure
   (`SIGNATURE_TTL`, src/lib/medias.ts). Une page figée une fois pour
   toutes servirait des images mortes dès la deuxième heure. On
   régénère donc largement avant l'échéance ; le back-office, lui,
   appelle `revalidatePath()` pour que toute modification soit visible
   immédiatement.
   ════════════════════════════════════════════════════════════════ */

export const revalidate = 1800;

/* Le défaut reste ici, versionné et relu ; l'écran « Référencement »
   du back-office vient par-dessus quand le client y a écrit quelque
   chose. Voir la note de fin de src/lib/seo.ts. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/agences", {
    title: "Nos agences dans les Landes",
    description:
      "Nous construisons dans les Landes. Notre équipe connaît le terrain de son secteur — au sens propre — et suit votre projet jusqu'à la remise des clés.",
    alternates: { canonical: "/agences" },
  });
}

/** La valeur saisie dans « Pages → Nos agences », ou rien. */
function bloc(pages: PageEditable[], cle: string): string {
  const page = pages.find((p) => p.cle === "agences");
  return page?.blocs.find((b) => b.cle === cle)?.valeur.trim() ?? "";
}

export default async function AgencesPage() {
  const [content, agences] = await Promise.all([getContent(), agencesPubliees()]);

  const titre = bloc(content.pages, "hero.titre") || "Nos agences";
  const chapo = bloc(content.pages, "hero.chapo");
  const lien =
    bloc(content.pages, "hero.lien") ||
    "Votre commune n'est pas dans la liste ? Dites-nous où vous construisez";

  return (
    <main className="page">
      {/* Chaque agence a déjà son `HomeAndConstructionBusiness` sur sa
          fiche. Ici, l'ItemList dit seulement que cette page les indexe —
          c'est ce qui permet à Google de remonter la bonne agence plutôt
          que cette liste sur une requête locale. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            listeSchema(
              titre,
              agences.map((g) => ({ nom: g.name, path: `/agences/${g.id}` })),
            ),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(filAriane([{ nom: "Accueil", path: "/" }, { nom: titre }])),
        }}
      />
      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>{titre}</span>
          </nav>
          <h1>{titre}</h1>
          {/* Chapô laissé vide dans le back-office : on garde la phrase
              d'origine, qui affiche le prix de départ À JOUR. Une version
              figée dans le contenu mentirait au premier changement de
              tarif — c'est exactement ce que dit l'aide du champ. */}
          {chapo ? (
            <p>{chapo}</p>
          ) : (
            <p>
              Nous construisons dans les Landes, au même prix partout : à partir
              de {fmtPrice(REEL.prixEntree)} hors terrain. Notre équipe connaît le
              terrain de son secteur — au sens propre : les PLU, les lotissements
              et les parcelles compatibles avec nos modèles.
            </p>
          )}
          <p style={{ marginTop: "var(--s-3)" }}>
            <Link href="/contact" className="c-link">
              {lien} →
            </Link>
          </p>
        </div>
      </section>

      <section style={{ paddingTop: "var(--s-4)" }}>
        <div className="container">
          {agences.length === 0 ? (
            /* Toutes les agences ont été fermées depuis le back-office.
               On ne remet pas d'anciennes adresses en ligne pour combler
               le vide : on renvoie vers le formulaire, qui reste le seul
               point de contact valide. */
            <p style={{ maxWidth: "38em" }}>
              Nos agences sont en cours de réorganisation.{" "}
              <Link href="/contact" className="c-link">
                Écrivez-nous votre projet →
              </Link>
            </p>
          ) : (
            <div className="g-grid">
              {agences.map((g) => (
                <AgencyCard agency={g} key={g.id} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
