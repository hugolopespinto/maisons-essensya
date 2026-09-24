import Link from "next/link";
import FilAriane, { type Etape } from "@/components/FilAriane";
import "@/styles/pages/plan.css";

/* ════════════════════════════════════════════════════════════════
   UNE PAGE ANNONCÉE MAIS PAS ENCORE ÉCRITE

   ⚠ POURQUOI CES PAGES EXISTENT ALORS QU'ELLES N'ONT PAS DE CONTENU.

   Le pied de page suit l'arborescence livrée le 22/09, et cette
   arborescence contient des pages à créer. Le client a demandé que les
   liens y figurent dès maintenant. Trois façons de le faire :

     1. poser les liens vers des URLs inexistantes — le pied de page est
        sur les 29 pages du site, ce seraient donc 29 × 14 chemins vers
        des 404, offerts à Google en prime ;
     2. afficher les libellés sans lien — le pied de page ne
        ressemblerait plus au brief, et un texte gris non cliquable au
        milieu de liens est un défaut d'interface, pas une solution ;
     3. créer les pages. C'est ce qui est fait ici.

   La page dit ce qu'elle est, propose l'endroit où trouver la même
   information aujourd'hui, et ne sera PAS indexée tant qu'elle est
   vide — voir `metadataEnPreparation` plus bas. Le jour où le contenu
   arrive, l'URL ne bouge pas : on remplace le corps, on retire le
   noindex, on ajoute l'entrée au sitemap. Aucune redirection, aucun
   lien cassé, aucune URL brûlée.

   ⚠ CE GABARIT N'EST PAS UNE DESTINATION. Si une page reste ici plus
   de quelques semaines, c'est qu'elle n'aurait pas dû être annoncée :
   il vaut mieux retirer son lien du pied de page que laisser un
   visiteur cliquer deux fois sur la même promesse vide.
   ════════════════════════════════════════════════════════════════ */

/** Les métadonnées communes : jamais d'indexation d'une page vide. */
export const metadataEnPreparation = {
  robots: { index: false, follow: true },
} as const;

export interface RelaisUtile {
  href: string;
  label: string;
  /** Ce que le visiteur y trouvera vraiment, en une ligne. */
  quoi: string;
}

export default function EnPreparation({
  fil,
  titre,
  quand,
  relais,
}: {
  fil: Etape[];
  titre: string;
  /** Ce que la page contiendra, écrit au futur et sans promesse de date. */
  quand: string;
  relais: RelaisUtile[];
}) {
  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <FilAriane items={fil} />
          <h1>{titre}</h1>
          <p>{quand}</p>
        </div>
      </section>

      <section className="prep">
        <div className="container">
          <div className="prep__carte">
            <span className="c-label c-label--accent">En préparation</span>
            <h2>Cette page arrive</h2>
            <p className="u-measure">
              Elle n&apos;est pas encore écrite. En attendant, voici où trouver la
              même information sur le site.
            </p>
            <ul className="prep__relais">
              {relais.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="c-link">
                    {r.label} <span className="arrow">→</span>
                  </Link>
                  <span>{r.quoi}</span>
                </li>
              ))}
            </ul>
            <p className="prep__contact">
              Vous cherchez un renseignement précis&nbsp;?{" "}
              <Link href="/contact" className="c-link">
                Posez-nous la question <span className="arrow">→</span>
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
