"use client";
import dynamic from "next/dynamic";
import type { PointAgence } from "@/components/AgencesMap";

/* Leaflet touche à `window` dès son import : la carte ne peut pas être
   rendue côté serveur. Et `ssr: false` n'est permis que dans un
   composant client — d'où ce relais, que la page serveur importe. */
const AgencesMap = dynamic(() => import("@/components/AgencesMap"), {
  ssr: false,
  loading: () => <div className="c-map__frame" />,
});

export default function AgencesMapLazy({ agences }: { agences: PointAgence[] }) {
  return <AgencesMap agences={agences} />;
}
