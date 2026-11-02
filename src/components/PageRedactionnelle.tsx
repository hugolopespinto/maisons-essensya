import Link from "next/link";
import FilAriane, { type Etape } from "@/components/FilAriane";
import { markdownToHtml } from "@/lib/markdown";
import "@/styles/prose.css";
import "@/styles/pages/redactionnel.css";

/* ════════════════════════════════════════════════════════════════
   UNE PAGE DE TEXTE — les guides livrés par le client en Word

   Le Markdown passe par `markdownToHtml`, la frontière de confiance du
   projet. Les tableaux, qu'il ne connaît pas, arrivent en `children`, entre
   `corps` et `suite`.

   Une FAQ, quand il y en a une, est rendue dans la page et déclarée à Google :
   ses données structurées n'y ont droit qu'à condition d'être visibles.
   ════════════════════════════════════════════════════════════════ */

export interface QuestionReponse {
  q: string;
  a: string;
}

export default function PageRedactionnelle({
  fil,
  titre,
  chapo,
  corps,
  children,
  suite,
  faq,
  titreFaq = "Questions fréquentes",
  liens,
}: {
  fil: Etape[];
  titre: string;
  chapo?: string;
  corps: string;
  children?: React.ReactNode;
  suite?: string;
  faq?: QuestionReponse[];
  titreFaq?: string;
  liens?: { href: string; label: string }[];
}) {
  return (
    <main className="page">
      {faq?.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      <section className="p-head">
        <div className="container">
          <FilAriane items={fil} />
          <h1 className="r-titre">{titre}</h1>
          {chapo ? <p>{chapo}</p> : null}
        </div>
      </section>
      <section className="r-corps">
        <div className="container">
          <div className="c-prose" dangerouslySetInnerHTML={{ __html: markdownToHtml(corps) }} />
          {children}
          {suite ? (
            <div className="c-prose" dangerouslySetInnerHTML={{ __html: markdownToHtml(suite) }} />
          ) : null}
          {faq?.length ? (
            <div className="r-faq">
              <h2>{titreFaq}</h2>
              {faq.map((f) => (
                <div className="r-faq__item" key={f.q}>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </div>
          ) : null}
          {liens?.length ? (
            <div className="r-liens">
              {liens.map((l, i) => (
                <Link href={l.href} className={`c-btn${i === 0 ? " c-btn--solid" : ""}`} key={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
