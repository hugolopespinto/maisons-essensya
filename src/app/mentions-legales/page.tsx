import type { Metadata } from "next";
import FilAriane from "@/components/FilAriane";
import ProseLegale, { type ContexteLegal } from "@/components/legal/ProseLegale";
import { AGENCIES, PLACEHOLDER } from "@/data/essensya";
import { lecteurBlocs } from "@/lib/blocs";
import { emailPublie, telephonePublie } from "@/lib/format";
import { SECTIONS_MENTIONS } from "@/lib/legal/sections";
import { resolveMetadata } from "@/lib/seo";
import { getContent } from "@/lib/store";

/* ════════════════════════════════════════════════════════════════
   MENTIONS LÉGALES

   ⚠ CETTE PAGE RESTE BLOQUANTE POUR LA MISE EN LIGNE, mais ce n'est
   plus un problème de code.

   Un constructeur de maisons individuelles n'est pas un éditeur de site
   ordinaire. Au-delà des mentions imposées à tout site par la LCEN
   (art. 6-III — éditeur identifiable, directeur de publication,
   hébergeur), il exerce une activité réglementée : RCS, assurance
   décennale, garantie de livraison, médiateur de la consommation. Neuf
   de ces mentions manquent encore, et chacune s'affiche à sa place sous
   forme d'un pavé qui décrit ce qu'on attend.

   ⚠ TOUT LE TEXTE DE CETTE PAGE EST DÉSORMAIS ÉDITABLE. Il vit dans
   « Pages → Mentions légales », un bloc par section, en Markdown. Le
   gabarit ne garde que ce qu'un texte libre ne peut pas porter :

     · LES NEUF ANCRES, posées sur les `<h2>` depuis le code
       (src/lib/legal/sections.ts). Un client qui réécrit un titre ne
       peut pas faire disparaître le lien qui pointe dessus.
     · LES QUINZE MENTIONS, insérées par le jeton `{{champ:…}}` au
       milieu des phrases — elles y sont, pas en fin de section.
     · LE TÉLÉPHONE ET L'E-MAIL, relus à chaque affichage depuis les
       Réglages, pour qu'ils ne se figent pas dans le texte.

   La transcription du texte livré vers le Markdown a été vérifiée par
   comparaison du rendu avant/après (scripts/legal-diff.mjs) : aucun mot
   n'a changé.
   ════════════════════════════════════════════════════════════════ */

const METADATA_DEFAUT: Metadata = {
  title: "Mentions légales",
  description:
    "Éditeur du site, directeur de la publication, hébergeur, assurances et garanties du constructeur, propriété intellectuelle et médiation de la consommation.",
  alternates: { canonical: "/mentions-legales" },
};

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/mentions-legales", METADATA_DEFAUT);
}

export default async function MentionsLegalesPage() {
  const { pages, reglages, textes } = await getContent();
  const t = lecteurBlocs(pages, "mentions-legales");

  const ctx: ContexteLegal = {
    valeurs: (cle) => t(cle),
    tel: telephonePublie(reglages, textes, PLACEHOLDER.phone),
    email: emailPublie(reglages, AGENCIES[0]?.email ?? ""),
    date: t("maj"),
  };

  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <FilAriane
            items={[
              { nom: "Accueil", path: "/" },
              { nom: "Mentions légales" },
            ]}
          />
          <h1>{t("hero.titre")}</h1>
          <p>{t("hero.chapo")}</p>
        </div>
      </section>

      <section style={{ paddingBottom: "var(--s-7)" }}>
        <div className="container" style={{ maxWidth: "58rem" }}>
          <p className="c-label">Dernière mise à jour · {ctx.date}</p>

          {SECTIONS_MENTIONS.map((s) => (
            <ProseLegale key={s.ancre} ancre={s.ancre} md={t(s.bloc)} ctx={ctx} />
          ))}

          <p className="c-label c-label--accent" style={{ marginTop: "var(--s-5)" }}>
            Version du {ctx.date}
          </p>
        </div>
      </section>
    </main>
  );
}
