"use client";
import { useSyncExternalStore } from "react";

/* Lit une media query sans setState dans un effet : le rendu serveur
   utilise `serverFallback`, le client se corrige dès l'hydratation. */
export function useMediaQuery(query: string, serverFallback: boolean) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverFallback,
  );
}
