"use client";
import { useState, type ReactNode } from "react";
import type { OriginKey, ProspectContext } from "@/lib/vitahome/types";

interface Props {
  /** Détermine l'ORIGIN-ID Vitahome côté serveur. */
  originKey: OriginKey;
  /** Contexte annonce (construction-location-id/-insee, history-*). */
  ctx?: ProspectContext;
  /** Événement GTM poussé au succès. */
  gtmEvent?: string;
  dark?: boolean;
  submitLabel?: string;
  note?: string;
  successMessage?: string;
  className?: string;
  children: ReactNode;
}

/* Un seul composant pour les 8 formulaires du site. Il ne connaît ni le
   token ni l'endpoint Vitahome : il POSTe vers /api/leads, qui relaie.  */
export default function LeadForm({
  originKey,
  ctx,
  gtmEvent,
  dark = false,
  submitLabel = "Envoyer",
  note = "Vos données ne servent qu'à vous recontacter. Jamais revendues.",
  successMessage = "Merci — une agence Essensya vous recontacte sous 48 h.",
  className = "",
  children,
}: Props) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;

    setState("sending");
    const fields = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originKey,
          fields,
          ctx: { ...ctx, link: ctx?.link ?? window.location.href },
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("sent");
      if (gtmEvent) {
        (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({
          event: gtmEvent,
          origin_key: originKey,
        });
      }
    } catch {
      setState("error");
    }
  }

  return (
    <form
      className={`c-form${dark ? " c-form--dark" : ""}${
        state === "sent" ? " is-sent" : ""
      } ${className}`}
      onSubmit={onSubmit}
      noValidate
    >
      {children}
      <div className="c-form__actions">
        <button
          type="submit"
          className={`c-btn${dark ? " c-btn--light" : " c-btn--solid"}`}
          disabled={state === "sending"}
        >
          {state === "sending" ? "Envoi…" : submitLabel} <span className="arrow">→</span>
        </button>
      </div>
      <p className="c-form__note">
        {state === "error"
          ? "L'envoi a échoué. Réessayez ou appelez votre agence."
          : note}
      </p>
      <p className="c-form__success" role="status">
        {successMessage}
      </p>
    </form>
  );
}

/** Trio prénom/nom · téléphone · e-mail, commun à tous les formulaires. */
export function ContactFields({ prefix }: { prefix: string }) {
  return (
    <>
      <div className="c-field">
        <label htmlFor={`${prefix}-name`}>Prénom &amp; nom</label>
        <input type="text" id={`${prefix}-name`} name="name" required />
      </div>
      <div className="c-field">
        <label htmlFor={`${prefix}-phone`}>Téléphone</label>
        <input type="tel" id={`${prefix}-phone`} name="phone" required />
      </div>
      <div className="c-field">
        <label htmlFor={`${prefix}-email`}>E-mail</label>
        <input type="email" id={`${prefix}-email`} name="email" />
      </div>
    </>
  );
}
