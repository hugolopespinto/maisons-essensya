import Link from "next/link";
import { facadeDe, type Modele } from "@/data/gamme";
import { srcSet } from "@/data/visuels";
import { fmtPrice, fmtSurface } from "@/lib/format";

/* ════════════════════════════════════════════════════════════════
   UNE CARTE DE MODÈLE

   Remplace `VersionCard`, qui affichait une déclinaison inventée avec
   sa surface, son nombre de chambres et son prix.

   ⚠ CETTE CARTE SAIT SE TAIRE. Les caractéristiques sont optionnelles
   (voir src/data/gamme.ts) et, aujourd'hui, toutes absentes. Une carte
   qui afficherait « — m² » ou « 0 chambre » ferait passer un catalogue
   en attente pour un site en panne. Tant qu'un chiffre manque, la ligne
   correspondante n'existe pas ; quand le client livrera son tableau,
   elle apparaîtra sans qu'on touche à ce fichier.

   La carte n'est rendue que pour un modèle qui a une façade — c'est le
   rôle de `modelesAvecVisuels()` chez l'appelant. Pékin en était exclu
   faute de visuel ; ses rendus sont arrivés, la grille en compte onze.
   ════════════════════════════════════════════════════════════════ */

export default function ModeleCard({ modele: m }: { modele: Modele }) {
  const visuel = facadeDe(m);
  if (!visuel) return null;

  /* Les caractéristiques réellement connues, et elles seules. */
  const specs = [
    m.surface !== undefined ? fmtSurface(m.surface) : null,
    m.chambres !== undefined ? `${m.chambres} chambre${m.chambres > 1 ? "s" : ""}` : null,
  ].filter(Boolean);

  return (
    <Link className="g-modele" href={`/maisons/${m.slug}`} data-reveal>
      <div className="g-modele__media">
        <picture>
          <source
            type="image/avif"
            srcSet={srcSet(visuel, "avif")}
            sizes="(max-width:700px) 100vw, (max-width:1100px) 50vw, 33vw"
          />
          <source
            type="image/webp"
            srcSet={srcSet(visuel, "webp")}
            sizes="(max-width:700px) 100vw, (max-width:1100px) 50vw, 33vw"
          />
          <img
            src={visuel.src}
            width={visuel.largeur}
            height={visuel.hauteur}
            alt={`Maison Essensya modèle ${m.nom}, vue extérieure`}
            loading="lazy"
          />
        </picture>
      </div>
      <div className="g-modele__corps">
        <h3>{m.nom}</h3>
        {specs.length > 0 && <p className="g-modele__specs">{specs.join(" · ")}</p>}
        {m.prixDepart !== undefined && (
          <p className="g-modele__prix">
            À partir de <strong>{fmtPrice(m.prixDepart)}</strong>
          </p>
        )}
        <span className="g-modele__lien">
          Voir le modèle <span className="arrow">→</span>
        </span>
      </div>
    </Link>
  );
}
