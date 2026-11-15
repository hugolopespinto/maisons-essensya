import Link from "next/link";
import { GUIDE, type CleGuide, type GuideEcran as Guide } from "@/lib/admin/guide";

/* ════ LE GUIDE EN TÊTE D'ÉCRAN ════
   Pour les personnes qui ouvrent le back-office sans connaître le site :
   ce que change chaque élément de l'écran sur le site public, et où
   aller pour ce qui ne se règle pas ici.

   Pas de résumé de l'écran : chaque en-tête a déjà le sien, juste
   au-dessus — le répéter faisait lire deux fois la même phrase. Le
   résumé du guide sert à la recherche.

   Replié par défaut : relu à chaque visite, un guide ouvert repousserait
   le formulaire sous la ligne de flottaison pour ceux qui le connaissent
   déjà. `<details>` s'ouvre au doigt et au clavier, sans JavaScript.

   Le texte vit dans src/lib/admin/guide.ts, qui nourrit aussi la
   recherche : les deux ne peuvent pas se contredire. */
export default function GuideEcran({ cle }: { cle: CleGuide }) {
  const g: Guide = GUIDE[cle];
  return (
    <details className="adm-guide">
      <summary>
        <span className="adm-guide__label">Guide</span>
        Ce que change chaque élément de cet écran sur le site
      </summary>
      <dl className="adm-guide__liste">
        {g.elements.map((e) => (
          <div key={e.nom}>
            <dt>{e.ancre ? <a href={`#${e.ancre}`}>{e.nom}</a> : e.nom}</dt>
            <dd>{e.effet}</dd>
          </div>
        ))}
      </dl>
      {g.ailleurs?.length ? (
        <>
          <p className="adm-guide__sous">Vous cherchez autre chose&nbsp;?</p>
          <ul className="adm-guide__ailleurs">
            {g.ailleurs.map((a) => (
              <li key={a.quoi}>
                {a.quoi}&nbsp;:{" "}
                {a.href ? <Link href={a.href}>{a.ecran}</Link> : <em>{a.ecran}</em>}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="adm-guide__astuce">
        Astuce : la barre de recherche en haut à droite (Ctrl&nbsp;K) trouve
        n&apos;importe quel réglage — tapez « simulateur », « logo », « prix »…
      </p>
    </details>
  );
}
