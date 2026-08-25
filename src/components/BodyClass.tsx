"use client";
import { useEffect } from "react";

/** Ajoute une classe sur <body> le temps où la page est montée. */
export default function BodyClass({ name }: { name: string }) {
  useEffect(() => {
    document.body.classList.add(name);
    return () => document.body.classList.remove(name);
  }, [name]);
  return null;
}
