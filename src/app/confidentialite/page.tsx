import type { Metadata } from "next";
import Link from "next/link";
import ProseLegale, { type ContexteLegal } from "@/components/legal/ProseLegale";
import { AGENCIES, PLACEHOLDER } from "@/data/essensya";
import { lecteurBlocs } from "@/lib/blocs";
import { emailPublie, telephonePublie } from "@/lib/format";
import { SECTIONS_CONFIDENTIALITE } from "@/lib/legal/sections";
import { resolveMetadata } from "@/lib/seo";
import { getContent } from "@/lib/store";

/* ════════════════════════════════════════════════════════════════
   POLITIQUE DE PROTECTION DES DONNÉES

   ⚠ CETTE PAGE DÉCRIT UN TRAITEMENT RÉEL, et c'est ce qui la rend
   utile ou dangereuse. Elle se modifie EN MÊME TEMPS que le code, jamais
   après : le jour où un destinataire s'ajoute — un nouvel outil, une
   nouvelle ressource externe appelée à l'affichage — il s'écrit ici dans
   le même geste. Une politique qui décrit l'état d'il y a six mois est
   une omission au sens de l'article 13 du RGPD.

   La règle vaut dans les deux sens : la ligne « Unsplash » du point 5 a
   été retirée parce que ce transfert n'a plus lieu, les visuels étant
   désormais servis par le site lui-même. Déclarer un destinataire qui ne
   reçoit rien décrédibilise le reste de la page — et c'est le reste qui
   protège.

   ⚠ TOUT LE TEXTE EST ÉDITABLE depuis « Pages → Confidentialité », un
   bloc Markdown par section. Le gabarit ne garde que ce qu'un champ de
   texte ne sait pas porter : les dix ancres (src/lib/legal/sections.ts),
   les six mentions obligatoires insérées par `{{champ:…}}`, le téléphone
   et l'adresse relus à chaque affichage, et surtout le jeton
   `{{cookies}}` du point 9 — le bouton qui rouvre le panneau de
   consentement. La CNIL impose que le retrait soit aussi simple que
   l'acceptation : ce bouton n'est pas un ornement, et la validation du
   back-office refuse un texte qui l'aurait perdu.
   ════════════════════════════════════════════════════════════════ */

const METADATA_DEFAUT: Metadata = {
  title: "Protection des données",
  description:
    "Quelles données nous recueillons, pourquoi, qui les reçoit, combien de temps nous les gardons, et comment exercer vos droits.",
  alternates: { canonical: "/confidentialite" },
};

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/confidentialite", METADATA_DEFAUT);
}

export default async function ConfidentialitePage() {
  const { pages, reglages, textes } = await getContent();
  const t = lecteurBlocs(pages, "confidentialite");

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
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>Confidentialité</span>
          </nav>
          <h1>{t("hero.titre")}</h1>
          <p>{t("hero.chapo")}</p>
        </div>
      </section>

      <section style={{ paddingBottom: "var(--s-7)" }}>
        <div className="container" style={{ maxWidth: "58rem" }}>
          <p className="c-label">Dernière mise à jour · {ctx.date}</p>

          {SECTIONS_CONFIDENTIALITE.map((s) => (
            <ProseLegale key={s.ancre} ancre={s.ancre} md={t(s.bloc)} ctx={ctx} />
          ))}

          <p className="c-label c-label--accent" style={{ marginTop: "var(--s-3)" }}>
            Version du {ctx.date}
          </p>
        </div>
      </section>
    </main>
  );
}
