import Link from "next/link";
import { agencyUrl } from "@/lib/format";
import type { Agency } from "@/types";

export default function AgencyCard({
  agency: g,
  reveal = true,
}: {
  agency: Agency;
  reveal?: boolean;
}) {
  return (
    <Link
      className="c-agency-card"
      href={agencyUrl(g)}
      {...(reveal ? { "data-reveal": "" } : {})}
    >
      <div className="c-agency-card__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={g.image} alt={g.name} loading="lazy" />
      </div>
      <div className="c-agency-card__body">
        <span className="c-agency-card__zone">{g.zone}</span>
        <div className="c-agency-card__name">{g.name}</div>
        <div className="c-agency-card__meta">
          {g.address}
          <br />
          {g.phone} · {g.hours}
        </div>
      </div>
    </Link>
  );
}
