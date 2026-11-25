import type { Metadata } from "next";
import Link from "next/link";
import FilAriane from "@/components/FilAriane";
import AgencyCard from "@/components/AgencyCard";
import AgencesMapLazy from "@/components/AgencesMapLazy";
import { agencesPubliees } from "@/lib/agences";
import { lecteurBlocs } from "@/lib/blocs";
import { agencyUrl } from "@/lib/format";
import { markdownToHtml } from "@/lib/markdown";
import { resolveMetadata } from "@/lib/seo";
import { jsonLd, listeSchema } from "@/lib/schema";
import { getContent } from "@/lib/store";
import "@/styles/carte.css";
import "@/styles/prose.css";
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
    title: "Nos agences : Landes et Gironde",
    description:
      "Constructeur de maisons dans les Landes et en Gironde. Chaque agence connaît le terrain de son secteur et suit votre projet jusqu'à la remise des clés.",
    alternates: { canonical: "/agences" },
  });
}

export default async function AgencesPage() {
  const [content, agences] = await Promise.all([getContent(), agencesPubliees()]);

  /* Le chapô et le texte de référencement vivaient ici, en repli d'un
     champ que l'admin montrait vide. Ils sont désormais le texte livré
     du catalogue (`PAGES_DEFAUT`) : le back-office les affiche dans le
     champ, et la page y retombe dès qu'on vide celui-ci. */
  const bloc = lecteurBlocs(content.pages, "agences");
  const titre = bloc("hero.titre");
  const chapo = bloc("hero.chapo");
  const lien = bloc("hero.lien");
  const texteSeo = markdownToHtml(bloc("seo.texte"));

  /* Seules les agences dont les coordonnées ont été saisies vont sur la
     carte — `geo` n'existe que si elles sont vraies (src/lib/agences.ts).
     Les autres restent dans la liste, comme les annonces sans
     coordonnées sur /annonces. */
  const points = agences.flatMap((g) =>
    g.geo
      ? [{ id: g.id, nom: g.name, adresse: g.address, href: agencyUrl(g), ...g.geo }]
      : [],
  );

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
      <section className="p-head">
        <div className="container g-head">
          <div>
            <FilAriane items={[{ nom: "Accueil", path: "/" }, { nom: titre }]} />
            <h1>{titre}</h1>
            <p>{chapo}</p>
            <p style={{ marginTop: "var(--s-3)" }}>
              <Link href="/contact" className="c-link">
                {lien} <span aria-hidden="true">→</span>
              </Link>
            </p>
          </div>
          {points.length > 0 && (
            <div className="g-map">
              <AgencesMapLazy agences={points} />
            </div>
          )}
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
                Écrivez-nous votre projet <span aria-hidden="true">→</span>
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

      {/* Le texte de référencement saisi dans « Pages → Nos agences ».
          Placé après les fiches : le visiteur vient chercher une adresse,
          on ne la lui fait pas attendre derrière trois paragraphes.
          `dangerouslySetInnerHTML` sans risque : `markdownToHtml` échappe
          toute la saisie AVANT d'émettre ses propres balises — voir la
          note en tête de src/lib/markdown.ts. */}
      {texteSeo ? (
        <section className="g-seo">
          <div className="container">
            <div className="c-prose" dangerouslySetInnerHTML={{ __html: texteSeo }} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
