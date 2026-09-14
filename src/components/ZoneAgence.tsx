import Link from "next/link";
import { telHref } from "@/components/AgencyCard";
import type { AgenceAffichee } from "@/lib/agences";
import { agencyUrl } from "@/lib/format";

/* L'encart agence d'une page de zone. Rendu seulement quand une agence
   revendique vraiment la zone (`agenceDeZone()`) — sinon on renvoie vers
   la liste, ce qui est honnête, plutôt que vers une agence prise au
   hasard. */
export default function ZoneAgence({
  agence: g,
  zone,
}: {
  agence: AgenceAffichee | null;
  /** « la Charente-Maritime », « La Rochelle » — au cas objet direct. */
  zone: string;
}) {
  if (!g) {
    return (
      <div className="tz-agence">
        <div>
          <h2>Qui suit votre projet</h2>
          <p>
            Dites-nous où vous construisez : nous vous orientons vers l&apos;agence
            qui connaît le secteur, ses PLU et ses lotissements.
          </p>
        </div>
        <Link href="/agences" className="c-btn">
          Voir nos agences <span className="arrow">→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="tz-agence">
      <div>
        <h2>{g.name}</h2>
        <p>
          C&apos;est cette équipe qui suit les terrains de {zone}. {g.description}
        </p>
        <p className="c-label" style={{ marginTop: "var(--s-2)" }}>
          {g.address}
          {g.phone ? ` · ${g.phone}` : ""}
        </p>
      </div>
      <div style={{ display: "grid", gap: ".6rem" }}>
        <Link href={agencyUrl(g)} className="c-btn">
          La fiche agence <span className="arrow">→</span>
        </Link>
        {g.phone ? (
          <a href={telHref(g.phone)} className="c-btn c-btn--solid">
            Appeler
          </a>
        ) : null}
      </div>
    </div>
  );
}
