import { fmtPrice, fmtSurface } from "@/lib/format";
import type { Chiffres } from "@/lib/geo";

/* ════════════════════════════════════════════════════════════════
   LES CHIFFRES D'UNE ZONE

   Ce bloc est la raison d'être des pages de zone. Sans lui, une page
   « Terrains à bâtir — Charente-Maritime » et une page
   « Terrains à bâtir — Vendée » seraient le même texte à deux mots
   près : du contenu dupliqué, que Google regroupe et dévalue.

   Chaque valeur est calculée sur le stock RÉEL de la zone (`chiffres()`
   dans src/lib/geo.ts). Aucune n'est arrondie ni « jolie » : c'est ce
   qui les rend vérifiables, et c'est ce qui les rend différentes d'une
   page à l'autre.

   ⚠ Une case sans donnée disparaît au lieu d'afficher un tiret. Le flux
   a de vrais trous — des annonces sans prix, sans surface — et une
   colonne « — » sur une page de zone ressemble à un site en panne.
   ════════════════════════════════════════════════════════════════ */

export default function ZoneChiffres({ c }: { c: Chiffres }) {
  const cases: [string, string][] = [
    [String(c.total), c.total > 1 ? "terrains disponibles" : "terrain disponible"],
  ];

  /* On n'affiche la répartition que si les deux formules coexistent dans
     la zone : « 0 terrain seul » n'apprend rien et occupe une colonne. */
  if (c.terrains > 0 && c.avecMaison > 0) {
    cases.push([String(c.terrains), "terrain seul"], [String(c.avecMaison), "avec la maison"]);
  }

  if (c.prixMin !== null) cases.push([fmtPrice(c.prixMin), "à partir de"]);
  if (c.surfaceMediane !== null) cases.push([fmtSurface(c.surfaceMediane), "surface médiane"]);

  return (
    <div className="tz-chiffres">
      {cases.map(([valeur, libelle]) => (
        <div className="tz-chiffre" key={libelle}>
          <b>{valeur}</b>
          <span>{libelle}</span>
        </div>
      ))}
    </div>
  );
}
