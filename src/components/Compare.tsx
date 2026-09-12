import type { Compare as CompareData } from "@/types";

/* Le comparatif de prix : l'argument central du positionnement, et le seul
   bloc du site qui le rend vérifiable. Volontairement sobre — filets, mono,
   un fond sable pour distinguer notre colonne. Un tableau criard ferait
   douter du prix au lieu de le justifier. */
export default function Compare({ data }: { data: CompareData }) {
  return (
    <>
      <div className="c-compare__wrap" data-reveal>
        <table className="c-compare">
          <caption className="u-sr-only">{data.title}</caption>
          <thead>
            <tr>
              <th scope="col">Poste</th>
              <th scope="col" className="is-us">
                Essensya
              </th>
              <th scope="col">Constructeur classique</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.poste}>
                <th scope="row">{r.poste}</th>
                <td className={`is-us${r.gain ? " is-gain" : ""}`}>{r.essensya}</td>
                <td>{r.classique}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="c-compare__note" data-reveal>
        {data.note}
      </p>
    </>
  );
}
