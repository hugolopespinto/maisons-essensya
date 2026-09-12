import Link from "next/link";
import { agencyUrl } from "@/lib/format";
import type { Agency } from "@/types";

/**
 * « 05 46 00 00 00 » → « tel:+33546000000 ».
 * Un href tel: ne tolère ni espace ni tiret, et le format international
 * est le seul qui fonctionne depuis l'étranger comme depuis un mobile.
 */
export const telHref = (phone: string) => {
  const d = phone.replace(/[^\d+]/g, "");
  return `tel:${d.startsWith("+") ? d : d.replace(/^0/, "+33")}`;
};

/* La carte n'est plus un seul <a> : le téléphone doit être appelable d'un
   pouce depuis la liste, et deux liens ne s'imbriquent pas. Le visuel reste
   cliquable vers la fiche, sans doublon dans l'ordre de tabulation. */
export default function AgencyCard({
  agency: g,
  reveal = true,
}: {
  agency: Agency;
  reveal?: boolean;
}) {
  return (
    <article className="c-agency-card" {...(reveal ? { "data-reveal": "" } : {})}>
      <Link
        className="c-agency-card__media"
        href={agencyUrl(g)}
        style={{ display: "block" }}
        tabIndex={-1}
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={g.image} alt="" loading="lazy" />
      </Link>
      <div className="c-agency-card__body">
        <span className="c-agency-card__zone">{g.zone}</span>
        <div className="c-agency-card__name">
          <Link href={agencyUrl(g)}>{g.name}</Link>
        </div>
        <div className="c-agency-card__meta">
          {g.address}
          <br />
          <a href={telHref(g.phone)}>{g.phone}</a> ·{" "}
          <a href={`mailto:${g.email}`}>{g.email}</a>
          <br />
          {g.hours}
        </div>
      </div>
    </article>
  );
}
