"use client";
import { openConsentPreferences } from "@/lib/consent";

/* Le choix doit être révocable aussi facilement qu'il a été donné : la CNIL
   impose un point d'accès permanent. D'où ce déclencheur, posé en pied de
   page sur toutes les routes. */
export default function CookiePrefsLink({
  className = "",
  children = "Gestion des cookies",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button type="button" className={className} onClick={openConsentPreferences}>
      {children}
    </button>
  );
}
