import Link from "next/link";
import { filAriane, jsonLd } from "@/lib/schema";

/* ════════════════════════════════════════════════════════════════
   FIL D'ARIANE — une seule liste, deux sorties

   ⚠ CE COMPOSANT REMPLACE DIX-SEPT COPIES DU MÊME BALISAGE, ET IL
   CORRIGE TROIS DÉFAUTS QUE CES COPIES PARTAGEAIENT.

   1. LA HIÉRARCHIE N'ÉTAIT PAS DANS LE BALISAGE. C'était une suite
      de `<a>` et de `<span>` séparés par un `<span class="sep">/</span>`
      — ni liste ordonnée, ni `aria-current`. Le « / » était donc le
      SEUL marqueur de niveau, à l'écran comme à l'oreille : relevé dans
      l'arbre d'accessibilité, son nœud sortait avec `ignored = false`,
      un lecteur d'écran l'annonçait. Il n'était pas décoratif, et son
      `opacity:.4` le laissait à 1,73:1 — sous le seuil, sans échappatoire.

      Une `<ol>` avec `aria-current="page"` porte désormais la
      hiérarchie. Le séparateur devient alors VRAIMENT décoratif : il
      est `aria-hidden`, il ne dit plus rien que la structure ne dise
      déjà, et sa discrétion redevient légitime. C'est le motif ARIA
      standard, et c'est le seul correctif qui n'oblige pas à choisir
      entre la conformité et le dessin.

   2. LES DONNÉES DU FIL ÉTAIENT SAISIES DEUX FOIS PAR PAGE : une fois
      en JSX pour l'affichage, une fois en argument de `filAriane()`
      pour le JSON-LD. Elles avaient déjà divergé — six pages
      (/concept, /contact, /blog, /cookies, /mentions-legales,
      /confidentialite) affichaient un fil d'ariane sans jamais le
      déclarer à Google. Ici la liste est écrite une fois et sert aux
      deux ; l'oubli n'est plus possible.

   3. LE LIEN ÉTAIT À 2,83:1. Il portait `opacity:.7`, ce qui le
      délavait sous le seuil sur les treize pages à fond clair. La
      feuille de style ne le délave plus ; le survol, qui reposait sur
      cette même opacité, passe au soulignement — qui fonctionne aussi
      sur les héros photo, là où une couleur d'accent ne passait pas.
   ════════════════════════════════════════════════════════════════ */

export interface Etape {
  nom: string;
  /** Absent = page courante. Le dernier élément n'en a jamais. */
  path?: string;
}

export default function FilAriane({ items }: { items: Etape[] }) {
  return (
    <>
      {/* Le même tableau que ci-dessous : le balisage et la déclaration
          à Google ne peuvent plus se contredire. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(filAriane(items)) }}
      />
      <nav aria-label="Fil d'ariane">
        <ol className="c-breadcrumb">
          {items.map((e, i) => {
            const courante = i === items.length - 1;
            return (
              <li key={`${i}-${e.nom}`}>
                {/* Le séparateur ne porte plus d'information : la liste
                    ordonnée et `aria-current` la portent. Il est donc
                    masqué aux technologies d'assistance, ce qui le rend
                    décoratif au sens de WCAG 1.4.3 — et sa discrétion
                    cesse d'être un défaut de contraste. */}
                {i > 0 && (
                  <span className="sep" aria-hidden="true">
                    /
                  </span>
                )}
                {courante || !e.path ? (
                  <span aria-current={courante ? "page" : undefined}>{e.nom}</span>
                ) : (
                  <Link href={e.path}>{e.nom}</Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
