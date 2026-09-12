"use client";
import Link from "next/link";
import { ViewTransition, useEffect, useRef, useState } from "react";
import LeadForm, { ContactFields } from "@/components/LeadForm";
import { AnnonceMedia } from "@/components/Substitut";
import {
  annonceSpecs,
  annonceTitle,
  annonceUrl,
  fmtPrice,
  fmtSurface,
  locLabel,
} from "@/lib/format";
import type { Annonce } from "@/types";

/* Tout ce qui touche à UNE annonce côté client vit ici : la carte de
   listing, la carte formulaire de la fiche et son rappel mobile. Les deux
   derniers partagent le même composant pour que l'aside sticky et le
   tiroir mobile envoient exactement le même ORIGIN-ID et le même ctx. */

/** Un numéro du flux arrive formaté « 05 46 00 00 00 » : href tel: à nettoyer. */
const tel = (p: string) => `tel:${p.replace(/[^+\d]/g, "")}`;

export default function AnnonceCard({
  annonce: a,
  reveal = true,
  highlighted = false,
  onMouseEnter,
  onMouseLeave,
}: {
  annonce: Annonce;
  reveal?: boolean;
  /** Survol croisé avec la carte du listing. */
  highlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const isTerrain = a.type === "terrain";
  const specs = annonceSpecs(a);

  return (
    <Link
      className={`c-annonce${highlighted ? " is-hl" : ""}`}
      href={annonceUrl(a)}
      data-annonce={a.id}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...(reveal ? { "data-reveal": "" } : {})}
    >
      {/* ── OBJET PARTAGÉ AVEC LA FICHE ──
          Même `name` des deux côtés : le navigateur reconnaît le même
          objet et l'anime de la vignette vers le visuel de la fiche. On
          ne voit plus deux pages se remplacer, mais une chose grandir.

          `default="none"` est indispensable : sans lui, CHAQUE média
          nommé rejouerait un fondu à la moindre transition de la page —
          soit des dizaines d'animations parasites sur le listing. Et
          avec `default="none"`, il faut garder `share` explicite, sinon
          la paire cesse silencieusement de se morpher. */}
      <ViewTransition name={`annonce-${a.id}`} share="morph" default="none">
        <div className="c-annonce__media">
          <span className={`c-tag${isTerrain ? " c-tag--terrain" : ""}`}>
            {isTerrain ? "Terrain" : "Terrain + maison"}
          </span>
          {/* 9 annonces sur 10 n'ont aucune photo : c'est le tracé coté qui
              s'affiche, et c'est le cas nominal, pas un pis-aller. */}
          <AnnonceMedia annonce={a} />
        </div>
      </ViewTransition>
      <div className="c-annonce__body">
        {a.highlighted && (
          <div className="c-annonce__offer">
            <span className="c-offer">Sélection agence</span>
          </div>
        )}
        <span className="c-annonce__loc">{locLabel(a)}</span>
        <div className="c-annonce__title">{annonceTitle(a)}</div>
        <div className="c-annonce__specs">
          {specs.map((s) => (
            <span key={s}>{s}</span>
          ))}
          {isTerrain && <span>Maison Essensya compatible</span>}
        </div>
        <div className="c-annonce__price">
          {/* « à partir de » n'a aucun sens devant un prix absent. */}
          {a.price !== null && <small>à partir de </small>}
          <strong>{fmtPrice(a.price)}</strong>
        </div>
      </div>
    </Link>
  );
}

/* ════ CARTE FORMULAIRE DE LA FICHE ════
   Rendue deux fois : dans l'aside sticky (desktop) et dans le tiroir
   mobile. `prefix` évite deux fois les mêmes id de champs dans la page. */
export function AnnonceAside({
  annonce: a,
  agencyHref = null,
  prefix = "af",
}: {
  annonce: Annonce;
  /** Lien vers la page agence, quand l'agence du flux en a une. */
  agencyHref?: string | null;
  prefix?: string;
}) {
  const isTM = a.type === "terrain-maison";

  /* Le commercial doit retrouver l'annonce dans son CRM : on ne pousse
     que les valeurs réellement connues, jamais « null m² ». */
  const adContent = [
    `${annonceTitle(a)} — réf. ${a.ref}`,
    a.landSurface ? `terrain ${fmtSurface(a.landSurface)}` : null,
    a.houseSurface ? `maison ${fmtSurface(a.houseSurface)}` : null,
    a.bedrooms ? `${a.bedrooms} ch.` : null,
    fmtPrice(a.price),
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <div className="a-aside__card">
      <span className="a-aside__ref">Réf. {a.ref}</span>
      <h3>{isTM ? "Ce projet vous intéresse ?" : "Ce terrain vous intéresse ?"}</h3>
      <p>
        Une réponse de votre agence sous 48 h. Visite du terrain et étude
        d&apos;implantation gratuites.
      </p>
      {/* ORIGIN-ID 53 (terrain) ou 54 (T+M) + champs « IMPORTANT » du doc */}
      <LeadForm
        originKey={isTM ? "annonceTM" : "annonceTerrain"}
        gtmEvent="lead_annonce_request"
        dark
        submitLabel="Être recontacté"
        successMessage={`Merci — ${a.agency.name ?? "votre agence"} vous recontacte sous 48 h au sujet de la réf. ${a.ref}.`}
        ctx={{ cityId: a.cityId, insee: a.insee, adContent }}
      >
        <ContactFields prefix={prefix} />
      </LeadForm>
      <div className="a-aside__agency">
        {agencyHref && a.agency.name ? (
          <Link href={agencyHref}>{a.agency.name}</Link>
        ) : (
          a.agency.name
        )}
        {a.agency.address && (
          <>
            <br />
            {a.agency.address}
          </>
        )}
        {a.agency.phone && (
          <>
            <br />
            <a href={tel(a.agency.phone)}>{a.agency.phone}</a>
          </>
        )}
      </div>
    </div>
  );
}

/* ════ RAPPEL MOBILE ════
   Sous 900 px l'aside tombe en fin de page : le prix et le formulaire
   disparaissent du champ de vision. Barre fixe (prix + bouton) qui ouvre
   le MÊME formulaire dans un tiroir. Le tiroir n'est monté qu'à
   l'ouverture : pas de doublon de champs dans le DOM au repos. */
export function AnnonceStickyForm({
  annonce: a,
  agencyHref = null,
}: {
  annonce: Annonce;
  agencyHref?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    /* Le fond ne doit pas défiler sous le tiroir. */
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="a-cta">
      <div className="a-cta__bar">
        <div className="a-cta__price">
          <small>{a.type === "terrain" ? "Terrain seul" : "Terrain + maison"}</small>
          <strong>{fmtPrice(a.price)}</strong>
        </div>
        <button
          type="button"
          className="c-btn c-btn--solid"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="a-cta-drawer"
        >
          Être recontacté
        </button>
      </div>

      {open && (
        <div
          className="a-cta__drawer"
          id="a-cta-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={`Être recontacté au sujet de la réf. ${a.ref}`}
        >
          <button
            type="button"
            className="a-cta__scrim"
            onClick={() => setOpen(false)}
            aria-label="Fermer le formulaire"
          />
          <div className="a-cta__panel">
            <button
              type="button"
              className="a-cta__close"
              onClick={() => setOpen(false)}
              ref={closeRef}
            >
              Fermer
            </button>
            <AnnonceAside annonce={a} agencyHref={agencyHref} prefix="am" />
          </div>
        </div>
      )}
    </div>
  );
}
