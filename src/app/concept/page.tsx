import type { Metadata } from "next";
import Link from "next/link";
import { MarkedList } from "@/components/SpecList";
import { ESSENSYA_DATA, HOUSE, PRICE_FROM, REEL } from "@/data/essensya";
import { MODELES } from "@/data/gamme";
import { fmtPrice } from "@/lib/format";
import { getContent } from "@/lib/store";
import type { PageEditable } from "@/lib/store/types";
import "@/styles/pages/concept.css";
import { resolveMetadata } from "@/lib/seo";

/* Le back-office peut surcharger le titre, la description, l'image de
   partage, le canonical et le noindex de cette page — écran
   Référencement. `resolveMetadata` repart TOUJOURS du défaut ci-dessous :
   une surcharge vidée rend la valeur d'origine, elle n'efface jamais
   la balise. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/concept", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Notre concept — construire à l'essentiel",
  description:
    "Pourquoi nous ne construisons qu'une maison, pourquoi elle coûte moins cher, et ce que le prix comprend exactement. Questions fréquentes comprises.",
  alternates: { canonical: "/concept" },
};

const c = ESSENSYA_DATA.concept;


/* ════ FAQ ════
   Page de réassurance : c'est ici qu'on répond aux objections avant
   qu'elles n'arrivent au téléphone — et c'est le principal gisement de
   requêtes longue traîne du métier. Les réponses sont écrites en dur
   sauf les prix et les libellés produit, qui viennent des données pour
   ne jamais diverger de la fiche maison. */
const FAQ: { q: string; a: string }[] = [
  {
    q: "Pourquoi vos maisons coûtent-elles moins cher ?",
    a: `Parce qu'un plan dessiné jusqu'au bout revient moins cher qu'un catalogue de trente plans étudiés à moitié. Nos ${MODELES.length} modèles sont optimisés poste par poste, matériau par matériau : pas de dégagement inutile, pas de recoin qui ne sert à rien. L'étude de chacun est faite, chiffrée et amortie sur toutes les maisons construites — ce que nous ne dépensons pas en complexité, nous le rendons sur le prix.`,
  },
  {
    q: "« Moins cher », est-ce que ça veut dire moins bien construit ?",
    a: "Non, et c'est vérifiable poste par poste. Conformité RE 2020, système de chauffage performant, salle de bain équipée, garantie décennale et assurance dommages-ouvrage : ce sont les mêmes exigences et les mêmes garanties que chez un constructeur bien plus cher. Ce qui baisse, c'est le coût de la complexité — l'étude refaite à chaque client, les options à arbitrer, les avenants en cours de chantier. Pas le coût du mur.",
  },
  {
    q: "Puis-je personnaliser ma maison ?",
    a: "Oui, sur une base tenue. Les grands arbitrages — volumes, organisation du plan, équipements — sont déjà faits : c'est ce qui permet d'annoncer le prix avant le premier rendez-vous. La personnalisation porte sur ce qui ne rouvre ni l'étude ni le permis. Un plan entièrement sur mesure relève d'un architecte, qui le fera mieux que nous — et plus cher.",
  },
  {
    q: "Que comprend exactement le prix annoncé ?",
    a: `${fmtPrice(PRICE_FROM)}, c'est le prix d'entrée de gamme : ${REEL.mentionPrix} Sont compris : ${HOUSE.included.join(" · ")}. Ne sont pas compris : ${HOUSE.excluded.join(" · ")}. Cette seconde liste est affichée partout où le prix l'est : un prix bas dont on tait les exclusions n'est pas un prix bas.`,
  },
  {
    q: "Que couvre le contrat CCMI ?",
    a: "Le contrat de construction de maison individuelle est le cadre le plus protecteur du droit français. Il fige le prix et les délais, et il ouvre la garantie de livraison à prix et délais convenus, la garantie de parfait achèvement (1 an), la garantie biennale (2 ans), la garantie décennale (10 ans) et l'assurance dommages-ouvrage. Le prix ne peut pas bouger en cours de chantier, sauf si c'est vous qui demandez une modification.",
  },
  {
    q: "Et si mon terrain est en pente ou de forme irrégulière ?",
    a: "L'étude de sol et l'adaptation au terrain ne sont PAS comprises dans le prix affiché, et c'est écrit à côté de ce prix. Une pente marquée, un sol argileux ou un accès difficile demandent des fondations spécifiques : ce surcoût existe chez tous les constructeurs, et nous le chiffrons avant la signature, pas après. Nos agences repèrent les parcelles réellement compatibles avec nos modèles — et quand un terrain ne convient pas, nous vous le disons.",
  },
  {
    q: "Combien de temps entre le premier rendez-vous et les clés ?",
    a: "Le chiffrage complet est remis sous 48 h, puisqu'il n'y a rien à étudier de nouveau. Il faut ensuite compter l'instruction du permis de construire — deux mois pour une maison individuelle, trois en secteur protégé — puis le chantier. Les délais exacts sont écrits dans le CCMI, qui les garantit : un retard vous est dû, il n'est pas subi.",
  },
  {
    q: "Faut-il un apport pour faire construire ?",
    a: "Pas systématiquement. Les banques demandent le plus souvent de quoi couvrir les frais de notaire et de garantie, et certains prêts aidés — le prêt à taux zéro en tête, sous conditions de ressources et de zone — permettent de financer un premier achat avec un apport limité. Nous ne sommes ni banque ni courtier : nous vous remettons un chiffrage complet et daté, c'est exactement la pièce que votre banque réclamera.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

/**
 * Lecteur des blocs saisis dans « Pages → Notre concept ».
 *
 * Le texte du back-office ne se substitue au gabarit que s'il est
 * renseigné : un champ effacé rend au site sa phrase d'origine, jamais
 * un blanc.
 */
function lecteurBlocs(pages: PageEditable[], clePage: string) {
  const blocs = pages.find((p) => p.cle === clePage)?.blocs ?? [];
  return (cle: string, defaut: string) =>
    blocs.find((b) => b.cle === cle)?.valeur.trim() || defaut;
}

/* Les titres en deux temps sont saisis avec un vrai retour à la ligne :
   `pre-line` le rend à l'écran au lieu d'afficher le caractère brut. */
const PRE_LINE = { whiteSpace: "pre-line" } as const;

export default async function ConceptPage() {
  const { pages } = await getContent();
  const t = lecteurBlocs(pages, "concept");

  return (
    <main className="page">
      {/* JSON-LD FAQPage : les questions ci-dessous sont éligibles aux
          résultats enrichis, à condition d'être visibles dans la page. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>Notre concept</span>
          </nav>
          <h1>{t("hero.titre", "Le concept Essensya")}</h1>
          <p style={PRE_LINE}>
            {t(
              "hero.chapo",
              "Des plans optimisés jusqu'au dernier mètre carré, et les bons choix déjà faits. Pourquoi nos maisons coûtent moins cher — et pourquoi c'est votre budget qui y gagne.",
            )}
          </p>
          <div className="c-price-xl" style={{ marginTop: "var(--s-4)" }}>
            <span className="from">Nos maisons, à partir de</span>
            {fmtPrice(PRICE_FROM)}
            <small>{REEL.mentionPrix}</small>
          </div>
        </div>
      </section>

      <section className="pc-manifesto">
        <div className="container">
          <span
            className="c-label c-label--accent"
            data-reveal
            style={{ display: "block", marginBottom: "var(--s-3)" }}
          >
            {t("manifeste.surtitre", "Le manifeste")}
          </span>
          <p data-reveal>{c.manifesto}</p>
        </div>
      </section>

      {/* Les quatre chiffres du positionnement — .s-proof est la grille
          prévue pour quatre entrées, .pc-figures n'en tenait que trois. */}
      <section className="s-proof">
        <div className="container">
          <span
            className="c-label"
            style={{
              color: "var(--sable)",
              opacity: 0.65,
              display: "block",
              marginBottom: "var(--s-3)",
            }}
            data-reveal
          >
            {t("chiffres.surtitre", "En chiffres")}
          </span>
          <div className="s-proof__grid">
            {c.figures.map(([b, s]) => (
              <div className="s-proof__item" data-reveal key={b}>
                <b>{b}</b>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="s-philo"
        style={{ background: "var(--craie)", color: "var(--anthracite)" }}
      >
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">{t("methode.surtitre", "La méthode")}</span>
            <h2 style={PRE_LINE}>{t("methode.titre", "Moins de choix.\nMieux choisis.")}</h2>
          </div>
          <div className="s-philo__grid" style={{ borderColor: "var(--beton)" }}>
            {ESSENSYA_DATA.philosophy.map((i) => (
              <div className="s-philo__item" data-reveal key={i.num}>
                <span className="s-philo__num">{i.num}</span>
                <h3>{i.title}</h3>
                <p>{i.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="s-steps">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">
              {t("etapes.surtitre", "Comment ça marche")}
            </span>
            <h2>{t("etapes.titre", "Quatre étapes, pas quarante")}</h2>
          </div>
          <div className="s-steps__list">
            {ESSENSYA_DATA.steps.map((i) => (
              <div className="s-steps__item" data-reveal key={i.num}>
                <span className="s-steps__num">{i.num}</span>
                <h3>{i.title}</h3>
                <p>{i.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pc-commit" id="engagements">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">
              {t("engagements.surtitre", "Nos engagements")}
            </span>
            <h2>{t("engagements.titre", "Écrits noir sur blanc")}</h2>
          </div>
          <div className="pc-commit__list">
            {c.commitments.map((x, i) => (
              <div className="pc-commit__item" data-reveal key={x.t}>
                <span className="pc-commit__num">0{i + 1}</span>
                <h3>{x.t}</h3>
                <p>{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Le prix et ses exclusions côte à côte : c'est ce qui rend le
          premier crédible. */}
      <section className="pc-commit" style={{ paddingTop: 0 }} id="prix">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">{t("prix.surtitre", "Le prix")}</span>
            <h2>{t("prix.titre", "Ce qu'il comprend, ce qu'il ne comprend pas")}</h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: "var(--s-5)",
            }}
            data-reveal
          >
            <div>
              <span className="c-label" style={{ display: "block", marginBottom: "var(--s-2)" }}>
                Compris dans le prix
              </span>
              <MarkedList items={HOUSE.included} variant="in" />
            </div>
            <div>
              <span className="c-label" style={{ display: "block", marginBottom: "var(--s-2)" }}>
                Non compris
              </span>
              <MarkedList items={HOUSE.excluded} variant="out" />
            </div>
          </div>
        </div>
      </section>

      <section className="pc-commit" style={{ paddingTop: 0 }} id="faq">
        <div className="container">
          <div className="c-section-head" data-reveal>
            <span className="c-label c-label--accent">
              {t("faq.surtitre", "Questions fréquentes")}
            </span>
            <h2>{t("faq.titre", "Les réponses avant les questions")}</h2>
          </div>
          <div className="pc-commit__list">
            {FAQ.map((f, i) => (
              <div className="pc-commit__item" data-reveal key={f.q}>
                <span className="pc-commit__num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="s-cta">
        <div className="container" style={{ textAlign: "center" }}>
          <span className="c-label" style={{ color: "var(--bois)" }} data-reveal>
            {t("cta.surtitre", "Et maintenant")}
          </span>
          <h2
            data-reveal
            style={{ ...PRE_LINE, margin: "var(--s-2) auto 0", maxWidth: "16ch" }}
          >
            {t("cta.titre", "Découvrez la maison")}
          </h2>
          <div
            style={{
              marginTop: "var(--s-4)",
              display: "flex",
              gap: "var(--s-2)",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
            data-reveal
          >
            <Link href="/maisons" className="c-btn c-btn--light">
              Voir la maison <span className="arrow">→</span>
            </Link>
            <Link
              href="/contact"
              className="c-btn c-btn--light"
              style={{ borderColor: "rgba(243,241,236,.35)" }}
            >
              Parler de mon projet
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
