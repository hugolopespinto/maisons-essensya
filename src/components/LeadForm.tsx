"use client";
import Link from "next/link";
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import type { OriginKey, ProspectContext } from "@/lib/vitahome/types";

/* ════════════════════════════════════════════════════════════════
   CONSENTEMENT AU TRAITEMENT — pourquoi il vit ICI et pas dans les pages

   Le site compte huit formulaires. Tant que la case RGPD était recopiée
   à la main page par page, elle manquait sur cinq d'entre eux, et la
   neuvième instance aurait eu une chance sur deux de l'oublier aussi.
   En la posant dans LeadForm — le composant par lequel passent les huit —
   elle devient structurelle : on ne peut plus collecter sans elle.

   Deux cases, jamais une seule :
     · le consentement au TRAITEMENT de la demande (obligatoire, non
       pré-coché) — il nomme le destinataire réel, agence + Vitahome ;
     · l'opt-in PROSPECTION (facultatif, non pré-coché, séparé).
   Les fondre en une seule case reviendrait à conditionner la réponse à
   une demande à l'acceptation de démarchage : c'est exactement ce que
   la CNIL requalifie en consentement non libre.
   ════════════════════════════════════════════════════════════════ */

/** Version du texte de consentement affiché ci-dessous.
 *  ⚠ À incrémenter à CHAQUE reformulation : la preuve archivée côté CRM
 *  ne vaut que si elle référence le texte réellement lu par le visiteur.
 *  ⚠ Miroir serveur (source de vérité de la preuve) :
 *  `CONSENT_TEXT` / `CONSENT_TEXT_VERSION` dans src/app/api/leads/route.ts. */
export const CONSENT_TEXT_VERSION = 1;

export const CONSENT_TEXT =
  "J’accepte que les informations saisies soient transmises à l’agence " +
  "Maisons Essensya de mon secteur ainsi qu’à son outil de gestion " +
  "commerciale (Vitahome, sous-traitant du constructeur), afin de traiter " +
  "ma demande et d’être recontacté.";

export const MARKETING_TEXT =
  "J’accepte de recevoir les actualités, offres et invitations de Maisons " +
  "Essensya — facultatif, sans effet sur ma demande, désinscription à tout " +
  "moment.";

/** Nom du champ leurre. Doit rester identique côté API (route.ts). */
export const HONEYPOT_FIELD = "company";

/* ⚠ 24 px, PAS 17. La WCAG 2.2 (critère 2.5.8) fixe 24 × 24 px comme
   taille minimale d'une cible tactile ; la case en faisait 17, mesuré au
   navigateur en 360 px de large. Et ce n'est pas une case ordinaire :
   sans elle le formulaire ne part pas, donc la rater c'est ne pas
   pouvoir demander un devis depuis un téléphone. */
const CHECKBOX: CSSProperties = {
  appearance: "auto",
  width: "1.5rem",
  height: "1.5rem",
  padding: 0,
  flex: "none",
  marginTop: ".05rem",
  accentColor: "var(--bois)",
};

/* .c-field label est en mono capitales : c'est juste pour un intitulé de
   champ, illisible pour une phrase de consentement. On revient au corps
   de texte — un consentement doit être lu, pas déchiffré. */
const CONSENT_LABEL: CSSProperties = {
  textTransform: "none",
  letterSpacing: "normal",
  fontFamily: "var(--f-body)",
  fontSize: "var(--fs-small)",
  lineHeight: 1.45,
  color: "inherit",
  opacity: 1,
};

const CONSENT_ROW: CSSProperties = {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: ".7rem",
};

const POLICY_LINK: CSSProperties = { color: "var(--bois)", textDecoration: "underline" };

/* Leurre anti-robot : masqué en CSS, pas en `type="hidden"` — un champ
   caché HTML est ignoré des scripts de spam, un champ hors écran non.
   Ni `display:none` ni `visibility:hidden`, que certains bots détectent. */
const HONEYPOT: CSSProperties = {
  position: "absolute",
  left: "-9999px",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  opacity: 0,
  pointerEvents: "none",
};

interface Props {
  /** Détermine l'ORIGIN-ID Vitahome côté serveur. */
  originKey: OriginKey;
  /** Contexte annonce (construction-location-id/-insee, history-*). */
  ctx?: ProspectContext;
  /** Événement GTM poussé au succès. */
  gtmEvent?: string;
  dark?: boolean;
  submitLabel?: string;
  /** Classe du bouton d'envoi. Absent : le style par défaut du thème. */
  submitClassName?: string;
  note?: ReactNode;
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
  submitClassName,
  note = "Vos données ne servent qu'à traiter votre demande. Jamais revendues.",
  successMessage = "Merci — une agence Essensya vous recontacte sous 48 h.",
  className = "",
  children,
}: Props) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  /* Identifiants uniques par instance : plusieurs formulaires cohabitent
     sur une même page (cartes d'annonces), et deux `id` identiques
     casseraient l'association label ↔ case à cocher. `useId` plutôt qu'un
     aléatoire : l'identifiant doit être stable entre serveur et client. */
  const uid = useId();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;

    setState("sending");
    const data = new FormData(form);

    /* Consentements et leurre ne sont pas des données de contact : ils
       voyagent dans un contrat explicite, et ne peuvent donc pas se
       retrouver relayés par erreur comme un champ de plus au CRM. */
    const consent = data.get("consent") === "1";
    const marketing = data.get("marketing") === "1";
    const trap = String(data.get(HONEYPOT_FIELD) ?? "");
    data.delete("consent");
    data.delete("marketing");
    data.delete(HONEYPOT_FIELD);
    const fields = Object.fromEntries(data.entries());

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originKey,
          fields,
          consent,
          marketing,
          trap,
          ctx: { ...ctx, link: ctx?.link ?? window.location.href },
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("sent");
      if (gtmEvent) {
        (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({
          event: gtmEvent,
          origin_key: originKey,
          /* Aucune donnée personnelle dans le dataLayer : GTM part chez
             Google, l'e-mail du prospect n'a rien à y faire. */
          consent_marketing: marketing,
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
      style={{ position: "relative" }}
    >
      {children}

      {/* Leurre. `aria-hidden` + tabIndex -1 : invisible aussi pour un
          lecteur d'écran et pour la navigation au clavier. */}
      <div style={HONEYPOT} aria-hidden="true">
        <label htmlFor={`hp-${uid}`}>Société (laissez ce champ vide)</label>
        <input
          type="text"
          id={`hp-${uid}`}
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="c-field" style={CONSENT_ROW}>
        <input
          type="checkbox"
          id={`consent-${uid}`}
          name="consent"
          value="1"
          required
          style={CHECKBOX}
        />
        <span style={{ display: "grid", gap: ".3rem" }}>
          {/* Le texte affiché EST la constante archivée côté serveur :
              aucune reformulation ne peut diverger de la preuve. */}
          <label htmlFor={`consent-${uid}`} style={CONSENT_LABEL}>
            {CONSENT_TEXT}{" "}
            <Link href="/confidentialite" style={POLICY_LINK}>
              En savoir plus
            </Link>
          </label>
        </span>
      </div>

      <div className="c-field" style={CONSENT_ROW}>
        <input
          type="checkbox"
          id={`marketing-${uid}`}
          name="marketing"
          value="1"
          style={CHECKBOX}
        />
        <label htmlFor={`marketing-${uid}`} style={CONSENT_LABEL}>
          {MARKETING_TEXT}
        </label>
      </div>

      <div className="c-form__actions">
        <button
          type="submit"
          className={submitClassName ?? `c-btn${dark ? " c-btn--light" : " c-btn--solid"}`}
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
      {/* Mention des droits : rendue par LeadForm, donc présente sur les
          huit formulaires sans qu'une page ait à y penser. */}
      <p className="c-form__note">
        Vous disposez d&apos;un droit d&apos;accès, de rectification,
        d&apos;effacement et d&apos;opposition sur vos données —{" "}
        <Link href="/confidentialite" style={POLICY_LINK}>
          politique de confidentialité
        </Link>
        .
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
