"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

/* ════════════════════════════════════════════════════════════════
   LE SÉLECTEUR DE MÉDIA — le composant partagé du back-office

   CE QU'IL REMPLACE. Jusqu'ici, changer une image voulait dire coller
   une URL dans un champ texte : il fallait déjà avoir hébergé le fichier
   quelque part, et personne ne pouvait vérifier ce qui était pointé. Le
   client vient de WordPress, où choisir une image est un clic. C'est ce
   clic qu'on lui rend.

   ⚠ CONTRAT PUBLIC — trois autres écrans (Réglages, Agences, Blog)
   l'utilisent et ne le verront qu'au build. Il ne change pas de forme
   sans les casser :

       <MediaPicker
         name="logo"            // nom du champ de formulaire — obligatoire
         value={reglages.logo}  // id de Media ou URL, peut être vide
         label="Logo du site"
         aide="PNG ou SVG, fond transparent"
       />

   Exporté en NOMMÉ et en DÉFAUT : les deux importations fonctionnent,
   parce qu'un désaccord d'importation entre quatre agents qui ne se
   relisent pas est une erreur de build gratuite.

   LE CHAMP EST UN VRAI CHAMP, ET IL EST VISIBLE. Le contrat parlait d'un
   champ caché ; c'est un `<input type="text" name={name}>` replié dans un
   `<details>`. Même nom, même valeur, même `formData.get(name)` côté
   action — mais un écran qui ne s'hydrate pas (JavaScript coupé, erreur
   de bundle, hydratation en retard) reste utilisable au lieu de
   renvoyer silencieusement l'ancienne valeur. C'est aussi le repli
   demandé pour les URL externes : la médiathèque indisponible ne doit
   bloquer aucun écran.

   ⚠ Ce fichier porte AUSSI `TeleverseurMedias`, la zone de dépôt. Elle
   sert à deux endroits — l'écran `/admin/medias` et la surcouche
   ci-dessous — et dupliquer une logique d'envoi de fichiers, c'est
   garantir que les deux copies divergeront sur la gestion d'erreur.
   ════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────────
   LA DONNÉE — ce que rend /api/admin/medias

   Redéclaré ici plutôt qu'importé du handler de route : un `import type`
   depuis un module serveur suffit à ce qu'un outil de build moins malin
   le suive et tire `src/lib/medias.ts` — donc la clé `service_role` —
   dans le bundle du navigateur. La forme est petite et stable, la
   recopier coûte moins cher que ce risque.
   ────────────────────────────────────────────────────────────────── */

export interface MediaPublie {
  id: string;
  nom: string;
  alt: string;
  type: string;
  taille: number;
  largeur?: number;
  hauteur?: number;
  creeLe: string;
  /** URL signée, temporaire. `null` si elle n'a pas pu être produite. */
  url: string | null;
}

interface Bibliotheque {
  disponible: boolean;
  raison?: string;
  medias: MediaPublie[];
}

const VIDE: Bibliotheque = { disponible: false, medias: [] };

/* La bibliothèque est partagée par TOUTES les instances de la page.
   L'écran Réglages en pose trois (logo, favicon, image de partage) : sans
   ce mémo, ouvrir la première surcouche déclencherait trois requêtes
   identiques, et chaque instance afficherait sa propre copie périmée. */
let memo: Promise<Bibliotheque> | null = null;

function chargerBibliotheque(force = false): Promise<Bibliotheque> {
  if (force || !memo) {
    memo = fetch("/api/admin/medias", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (r) => {
        if (r.status === 401) {
          return {
            disponible: false,
            raison: "Votre session a expiré. Rechargez la page pour vous reconnecter.",
            medias: [],
          };
        }
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as Bibliotheque;
      })
      .catch(() => {
        /* Un échec ne doit pas se figer dans le mémo : la prochaine
           ouverture doit pouvoir réessayer. */
        memo = null;
        return {
          disponible: false,
          raison: "La médiathèque n'a pas répondu. Vérifiez votre connexion et réessayez.",
          medias: [],
        };
      });
  }
  return memo;
}

/** À appeler après tout téléversement : le mémo est périmé. */
function invaliderBibliotheque(): void {
  memo = null;
}

/**
 * Charge la bibliothèque dès que `actif` passe à vrai, pas avant.
 *
 * ⚠ Aucun `setState` synchrone dans l'effet, et aucun état « en cours de
 * chargement » : le premier déclenche une cascade de rendus (le
 * compilateur React le refuse), le second n'apporte rien puisqu'il se
 * déduit — tant que rien n'est revenu, `etat` vaut `null`.
 */
function useBibliotheque(actif: boolean) {
  const [etat, setEtat] = useState<Bibliotheque | null>(null);

  useEffect(() => {
    if (!actif) return;
    /* Le démontage pendant la requête est le cas normal : on ferme la
       surcouche avant qu'elle ait répondu. */
    let vivant = true;
    void chargerBibliotheque().then((b) => {
      if (vivant) setEtat(b);
    });
    return () => {
      vivant = false;
    };
  }, [actif]);

  const recharger = useCallback(async (force = false) => {
    const b = await chargerBibliotheque(force);
    setEtat(b);
    return b;
  }, []);

  return {
    bibliotheque: etat ?? VIDE,
    connue: etat !== null,
    chargement: actif && etat === null,
    recharger,
  };
}

/* ──────────────────────────────────────────────────────────────────
   PETITS FORMATS
   ────────────────────────────────────────────────────────────────── */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Vrai si la valeur stockée désigne un média de la bibliothèque. */
const estIdentifiant = (v: string): boolean => UUID.test(v.trim());

/** Vrai si la valeur est déjà une adresse affichable telle quelle. */
const estAdresse = (v: string): boolean =>
  /^(https?:)?\/\//i.test(v) || v.startsWith("/") || v.startsWith("data:");

export function poidsLisible(octets: number): string {
  if (!Number.isFinite(octets) || octets <= 0) return "—";
  if (octets >= 1024 * 1024) return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  return `${Math.max(1, Math.round(octets / 1024))} Ko`;
}

/** Ce qui s'affiche dans une balise `<img>`. Le SVG en fait partie ; le
 *  PDF non, et c'est le seul cas non-image accepté par la médiathèque. */
const estImage = (type: string): boolean => type.startsWith("image/");

/* ──────────────────────────────────────────────────────────────────
   STYLES

   `src/styles/admin.css` est partagé avec les autres écrans et n'est pas
   à nous : les quelques règles propres à la médiathèque sont posées en
   ligne, avec les variables du thème, exactement comme le fait déjà la
   navigation du back-office.
   ────────────────────────────────────────────────────────────────── */

const S = {
  cadre: {
    display: "flex",
    gap: "1rem",
    alignItems: "flex-start",
    padding: ".75rem",
    border: "1px solid var(--beton)",
    borderRadius: "var(--radius)",
    background: "var(--blanc)",
  } as React.CSSProperties,
  vignette: {
    flex: "0 0 auto",
    width: "5.5rem",
    height: "5.5rem",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    border: "1px solid var(--beton)",
    borderRadius: "var(--radius)",
    background: "var(--craie)",
    fontFamily: "var(--f-mono)",
    fontSize: "var(--fs-label)",
    color: "var(--pierre)",
    textAlign: "center",
  } as React.CSSProperties,
  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
  } as React.CSSProperties,
  voile: {
    position: "fixed",
    inset: 0,
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(.5rem, 3vw, 2rem)",
    background: "rgba(19, 18, 16, .55)",
  } as React.CSSProperties,
  panneau: {
    display: "flex",
    flexDirection: "column",
    width: "min(68rem, 100%)",
    maxHeight: "100%",
    overflow: "hidden",
    border: "1px solid var(--beton)",
    borderRadius: "var(--radius)",
    background: "var(--craie)",
    boxShadow: "0 1.5rem 3rem rgba(19, 18, 16, .28)",
  } as React.CSSProperties,
  entete: {
    display: "flex",
    flexWrap: "wrap",
    gap: "var(--s-2)",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--s-2) var(--s-3)",
    borderBottom: "1px solid var(--beton)",
    background: "var(--blanc)",
  } as React.CSSProperties,
  corps: {
    overflowY: "auto",
    padding: "var(--s-3)",
  } as React.CSSProperties,
  grille: {
    display: "grid",
    gap: "var(--s-2)",
    gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))",
  } as React.CSSProperties,
  tuile: {
    display: "flex",
    flexDirection: "column",
    gap: ".4rem",
    padding: ".5rem",
    textAlign: "left",
    border: "1px solid var(--beton)",
    borderRadius: "var(--radius)",
    background: "var(--blanc)",
    cursor: "pointer",
    font: "inherit",
    color: "inherit",
  } as React.CSSProperties,
  tuileActive: {
    borderColor: "var(--bois)",
    boxShadow: "0 0 0 1px var(--bois)",
  } as React.CSSProperties,
  depot: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: ".6rem",
    padding: "var(--s-3)",
    textAlign: "center",
    border: "1px dashed var(--beton-2)",
    borderRadius: "var(--radius)",
    background: "var(--blanc)",
    transition: "border-color var(--dur-fast), background var(--dur-fast)",
  } as React.CSSProperties,
  depotSurvol: {
    borderColor: "var(--bois)",
    background: "var(--bois-clair)",
  } as React.CSSProperties,
  meta: {
    fontFamily: "var(--f-mono)",
    fontSize: "var(--fs-label)",
    color: "var(--pierre)",
    lineHeight: 1.6,
    overflowWrap: "anywhere",
  } as React.CSSProperties,
};

/* ──────────────────────────────────────────────────────────────────
   APERÇU — une vignette qui ne casse jamais
   ────────────────────────────────────────────────────────────────── */

function Apercu({
  url,
  type,
  alt,
  style,
}: {
  url: string | null;
  type?: string;
  alt: string;
  style?: React.CSSProperties;
}) {
  /* Une URL signée expire, un fichier peut avoir été supprimé ailleurs :
     l'image cassée est un état normal, pas un accident. On montre alors
     le type du fichier plutôt qu'une icône brisée du navigateur.

     ⚠ On mémorise l'URL QUI a échoué, pas un booléen : changer de média
     doit repartir d'un aperçu propre, et remettre un booléen à zéro
     depuis un effet est exactement la cascade de rendus que le
     compilateur React interdit. Comparer suffit. */
  const [casse, setCasse] = useState<string | null>(null);
  const enPanne = casse !== null && casse === url;

  const etiquette = type === "application/pdf" ? "PDF" : (type?.split("/")[1] ?? "").toUpperCase();

  if (!url || enPanne || (type && !estImage(type))) {
    return (
      <div style={{ ...S.vignette, ...style }} aria-hidden="true">
        {etiquette || "—"}
      </div>
    );
  }
  return (
    <div style={{ ...S.vignette, ...style }}>
      {/* Fichiers de la médiathèque : URL signées, temporaires et hors
          des domaines déclarés — next/image ne peut pas les optimiser. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} style={S.image} loading="lazy" onError={() => setCasse(url)} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   ZONE DE DÉPÔT — partagée par l'écran et la surcouche
   ────────────────────────────────────────────────────────────────── */

export interface TeleverseurProps {
  /** Appelé avec les médias réellement ajoutés. */
  onAjout?: (medias: MediaPublie[]) => void;
  /** Rafraîchit le rendu serveur après l'envoi — pour `/admin/medias`,
   *  dont la grille est rendue côté serveur. */
  rafraichir?: boolean;
  /** Version resserrée, pour la surcouche. */
  compact?: boolean;
  /** Désactive tout : médiathèque indisponible. */
  desactive?: boolean;
}

export function TeleverseurMedias({
  onAjout,
  rafraichir = false,
  compact = false,
  desactive = false,
}: TeleverseurProps) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement | null>(null);
  const [survol, setSurvol] = useState(false);
  const [encours, setEncours] = useState<{ fait: number; total: number } | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [succes, setSucces] = useState(0);

  /* Les compteurs de glissement s'empilent : `dragleave` se déclenche
     aussi en passant d'un enfant à l'autre de la zone. Sans ce compteur,
     la bordure clignote dès que le curseur survole le texte du bouton. */
  const profondeur = useRef(0);

  const envoyer = useCallback(
    async (fichiers: File[]) => {
      if (desactive || fichiers.length === 0) return;
      setErreurs([]);
      setSucces(0);
      setEncours({ fait: 0, total: fichiers.length });

      const ajoutes: MediaPublie[] = [];
      const soucis: string[] = [];

      /* Un fichier par requête : c'est ce qui permet d'avancer le
         compteur, et surtout de nommer précisément celui qui a échoué au
         lieu de rejeter le lot entier. */
      for (let i = 0; i < fichiers.length; i++) {
        const corps = new FormData();
        corps.append("fichier", fichiers[i]);
        try {
          const r = await fetch("/api/admin/medias", {
            method: "POST",
            headers: { Accept: "application/json" },
            body: corps,
          });
          const data = (await r.json()) as {
            medias?: MediaPublie[];
            erreurs?: string[];
            erreur?: string;
          };
          if (data.medias?.length) ajoutes.push(...data.medias);
          if (data.erreur) soucis.push(data.erreur);
          for (const e of data.erreurs ?? []) soucis.push(e);
        } catch {
          soucis.push(`« ${fichiers[i].name} » n'a pas pu être envoyé. Réessayez.`);
        }
        setEncours({ fait: i + 1, total: fichiers.length });
      }

      setEncours(null);
      setErreurs(soucis);
      setSucces(ajoutes.length);
      if (ajoutes.length) {
        invaliderBibliotheque();
        onAjout?.(ajoutes);
        if (rafraichir) router.refresh();
      }
      /* Sans cette remise à zéro, re-sélectionner le MÊME fichier après
         une erreur ne déclenche aucun `change` : le champ n'a pas changé. */
      if (champ.current) champ.current.value = "";
    },
    [desactive, onAjout, rafraichir, router],
  );

  const occupe = encours !== null;

  return (
    <div>
      <div
        style={{
          ...S.depot,
          ...(survol && !desactive ? S.depotSurvol : null),
          ...(compact ? { padding: "var(--s-2)" } : null),
          ...(desactive ? { opacity: 0.55 } : null),
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          profondeur.current += 1;
          if (!desactive) setSurvol(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          profondeur.current -= 1;
          if (profondeur.current <= 0) {
            profondeur.current = 0;
            setSurvol(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          profondeur.current = 0;
          setSurvol(false);
          void envoyer(Array.from(e.dataTransfer.files));
        }}
      >
        <p style={{ fontSize: "var(--fs-small)", margin: 0 }}>
          {occupe ? (
            <strong>
              Envoi en cours — {encours.fait} sur {encours.total}…
            </strong>
          ) : (
            <>
              Glissez vos fichiers ici, ou{" "}
              <button
                type="button"
                onClick={() => champ.current?.click()}
                disabled={desactive}
                style={{
                  font: "inherit",
                  color: "var(--bois-fonce)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  textDecoration: "underline",
                  textUnderlineOffset: ".2em",
                  cursor: desactive ? "not-allowed" : "pointer",
                }}
              >
                parcourez votre ordinateur
              </button>
              .
            </>
          )}
        </p>
        {!compact && (
          <p style={{ ...S.meta, margin: 0 }}>
            JPEG, PNG, WebP, AVIF, GIF, SVG et PDF — 10 Mo maximum par fichier.
          </p>
        )}
        <input
          ref={champ}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml,application/pdf"
          disabled={desactive}
          className="u-sr-only"
          onChange={(e) => void envoyer(Array.from(e.target.files ?? []))}
        />
      </div>

      {succes > 0 && erreurs.length === 0 ? (
        <p className="adm-note" role="status" style={{ marginTop: "var(--s-2)" }}>
          {succes === 1 ? "1 fichier ajouté" : `${succes} fichiers ajoutés`} à la médiathèque.
          {" Pensez au texte alternatif : sans lui, l'image est invisible pour Google et pour un lecteur d'écran."}
        </p>
      ) : null}

      {erreurs.length > 0 ? (
        <div
          className="adm-note adm-note--alerte"
          role="alert"
          style={{ marginTop: "var(--s-2)" }}
        >
          <strong>
            {erreurs.length === 1 ? "Un fichier a été refusé." : `${erreurs.length} fichiers ont été refusés.`}
          </strong>
          <ul style={{ marginTop: ".4rem", paddingLeft: "1.1rem", listStyle: "disc" }}>
            {erreurs.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   LA SURCOUCHE
   ────────────────────────────────────────────────────────────────── */

function Surcouche({
  valeur,
  documents,
  onChoix,
  onFermer,
}: {
  valeur: string;
  documents: boolean;
  onChoix: (media: MediaPublie) => void;
  onFermer: () => void;
}) {
  const { bibliotheque, connue, chargement, recharger } = useBibliotheque(true);
  const [q, setQ] = useState("");
  const recherche = useRef<HTMLInputElement | null>(null);

  /* Échappement : la sortie attendue de toute surcouche. Posé sur le
     document, parce que le focus peut être n'importe où dedans. */
  useEffect(() => {
    const sortie = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    document.addEventListener("keydown", sortie);
    /* La page dessous ne doit pas défiler pendant qu'on parcourt la
       grille — sinon on perd sa position dans le formulaire. */
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    recherche.current?.focus();
    return () => {
      document.removeEventListener("keydown", sortie);
      document.body.style.overflow = avant;
    };
  }, [onFermer]);

  const terme = q.trim().toLowerCase();
  const visibles = bibliotheque.medias
    .filter((m) => documents || m.type !== "application/pdf")
    .filter((m) => !terme || m.nom.toLowerCase().includes(terme) || m.alt.toLowerCase().includes(terme));

  return (
    <div
      style={S.voile}
      /* Le clic sur le voile ferme ; celui sur le panneau ne doit pas
         remonter jusqu'ici. */
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFermer();
      }}
    >
      <div
        style={S.panneau}
        role="dialog"
        aria-modal="true"
        aria-label="Choisir un média"
      >
        <div style={S.entete}>
          <strong style={{ fontSize: "1rem" }}>Médiathèque</strong>
          <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flex: "1 1 14rem" }}>
            <input
              ref={recherche}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher par nom…"
              aria-label="Rechercher un média par nom"
              style={{
                flex: 1,
                minWidth: 0,
                font: "inherit",
                padding: ".5rem .7rem",
                border: "1px solid var(--beton)",
                borderRadius: "var(--radius)",
                background: "var(--blanc)",
              }}
            />
            <button type="button" className="c-btn" onClick={onFermer}>
              Fermer
            </button>
          </div>
        </div>

        <div style={S.corps}>
          {connue && !bibliotheque.disponible ? (
            <p className="adm-note adm-note--alerte" style={{ marginBottom: "var(--s-2)" }}>
              {bibliotheque.raison ?? "La médiathèque n'est pas disponible."}{" "}
              Vous pouvez toujours coller une adresse à la main dans le champ
              «&nbsp;Adresse ou identifiant&nbsp;».
            </p>
          ) : null}

          <TeleverseurMedias
            compact
            desactive={connue && !bibliotheque.disponible}
            onAjout={(ajoutes) => {
              void recharger(true);
              /* Un seul fichier envoyé depuis la surcouche : c'est
                 évidemment celui qu'on venait chercher. */
              if (ajoutes.length === 1) onChoix(ajoutes[0]);
            }}
          />

          <div style={{ marginTop: "var(--s-3)" }}>
            {chargement && !connue ? (
              <p className="adm-empty">Chargement de la médiathèque…</p>
            ) : visibles.length === 0 ? (
              <p className="adm-empty">
                <strong>{terme ? "Aucun résultat" : "Médiathèque vide"}</strong>
                {terme
                  ? `Aucun média ne correspond à « ${q.trim()} ».`
                  : "Envoyez un premier fichier avec la zone ci-dessus."}
              </p>
            ) : (
              <div style={S.grille}>
                {visibles.map((m) => {
                  const choisi = m.id === valeur;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onChoix(m)}
                      style={{ ...S.tuile, ...(choisi ? S.tuileActive : null) }}
                      aria-pressed={choisi}
                      title={m.nom}
                    >
                      <Apercu
                        url={m.url}
                        type={m.type}
                        alt=""
                        style={{ width: "100%", height: "6rem" }}
                      />
                      <span
                        style={{
                          fontSize: "var(--fs-label)",
                          lineHeight: 1.4,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {m.nom}
                      </span>
                      <span style={S.meta}>
                        {poidsLisible(m.taille)}
                        {m.largeur && m.hauteur ? ` · ${m.largeur}×${m.hauteur}` : ""}
                      </span>
                      {!m.alt.trim() && m.type !== "application/pdf" ? (
                        <span className="adm-badge adm-badge--off">sans alt</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   LE SÉLECTEUR
   ────────────────────────────────────────────────────────────────── */

export interface MediaPickerProps {
  /** Nom du champ de formulaire — le seul paramètre obligatoire. */
  name: string;
  /** Identifiant de `Media` ou URL. Vide accepté. */
  value?: string | null;
  label?: string;
  aide?: string;
  /** Autorise aussi les PDF dans la surcouche. Par défaut : images seules. */
  documents?: boolean;
  /** Signale visuellement qu'une image est attendue. N'impose rien : le
   *  champ reste soumettable vide, c'est l'action qui tranche. */
  requis?: boolean;
  id?: string;
  className?: string;
}

export function MediaPicker({
  name,
  value,
  label,
  aide,
  documents = false,
  requis = false,
  id,
  className,
}: MediaPickerProps) {
  const auto = useId();
  const champId = id ?? `media-${auto}`;
  const [valeur, setValeur] = useState((value ?? "").trim());
  const [ouvert, setOuvert] = useState(false);
  const bouton = useRef<HTMLButtonElement | null>(null);

  /* On ne charge la bibliothèque au montage que si l'aperçu en dépend —
     c'est-à-dire quand la valeur est un identifiant. Une URL externe
     s'affiche sans rien demander au serveur. */
  const besoin = ouvert || estIdentifiant(valeur);
  const { bibliotheque } = useBibliotheque(besoin);

  const choisi = estIdentifiant(valeur)
    ? (bibliotheque.medias.find((m) => m.id === valeur) ?? null)
    : null;

  const urlApercu = choisi ? choisi.url : estAdresse(valeur) ? valeur : null;

  const fermer = useCallback(() => {
    setOuvert(false);
    /* Le focus revient d'où il venait : une surcouche qui se ferme en
       laissant le focus sur `<body>` renvoie au début de la page au
       premier Tab. */
    bouton.current?.focus();
  }, []);

  return (
    <div className={className ? `adm-field ${className}` : "adm-field"}>
      {label ? (
        <span className="adm-field__label" id={`${champId}-label`}>
          {label}
          {requis ? " *" : ""}
        </span>
      ) : null}

      <div style={S.cadre}>
        <Apercu url={urlApercu} type={choisi?.type} alt="" />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: ".5rem" }}>
          <div style={S.meta}>
            {choisi ? (
              <>
                <strong style={{ color: "var(--anthracite)" }}>{choisi.nom}</strong>
                <br />
                {poidsLisible(choisi.taille)}
                {choisi.largeur && choisi.hauteur ? ` · ${choisi.largeur}×${choisi.hauteur}` : ""}
                {!choisi.alt.trim() && choisi.type !== "application/pdf" ? (
                  <>
                    <br />
                    <span style={{ color: "var(--bois-fonce)" }}>
                      Sans texte alternatif — à renseigner dans la médiathèque.
                    </span>
                  </>
                ) : null}
              </>
            ) : valeur ? (
              <>
                <strong style={{ color: "var(--anthracite)" }}>Adresse externe</strong>
                <br />
                {valeur}
              </>
            ) : (
              "Aucune image choisie."
            )}
          </div>

          <div className="adm-actions adm-actions--serre" style={{ gap: ".5rem" }}>
            <button
              ref={bouton}
              type="button"
              className="c-btn"
              onClick={() => setOuvert(true)}
              aria-haspopup="dialog"
            >
              {valeur ? "Remplacer" : "Choisir dans la médiathèque"}
            </button>
            {valeur ? (
              <button
                type="button"
                className="c-btn c-btn--danger"
                onClick={() => setValeur("")}
              >
                Retirer
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ════ LE CHAMP RÉEL ════
          Replié, mais présent dans le DOM et soumis comme n'importe quel
          champ : c'est lui que lit `formData.get(name)`. C'est aussi le
          repli quand la médiathèque est indisponible. */}
      <details>
        <summary
          style={{
            cursor: "pointer",
            fontFamily: "var(--f-mono)",
            fontSize: "var(--fs-label)",
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: "var(--pierre)",
          }}
        >
          Adresse ou identifiant
        </summary>
        <input
          id={champId}
          type="text"
          name={name}
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          placeholder="https://… ou /images/exemple.jpg"
          aria-label={label ? `${label} — adresse ou identifiant` : "Adresse ou identifiant du média"}
          style={{ marginTop: ".4rem" }}
        />
        <p className="adm-field__aide" style={{ marginTop: ".4rem" }}>
          Rempli automatiquement par la médiathèque. Une adresse complète
          (<code>https://…</code>) ou un chemin du site (<code>/images/…</code>)
          reste accepté : c&apos;est ce qui permet de garder un visuel déjà en
          place, ou d&apos;en pointer un hébergé ailleurs.
        </p>
      </details>

      {aide ? <p className="adm-field__aide">{aide}</p> : null}

      {/* La surcouche part dans `document.body` : un `position: fixed`
          posé dans une carte qui a un `overflow-x: auto` — c'est le cas
          de `.adm-card` — s'y retrouverait rogné. Pas de garde de montage
          nécessaire : `ouvert` ne devient vrai que sur un clic, donc
          jamais pendant le rendu serveur, où `document` n'existe pas. */}
      {ouvert
        ? createPortal(
            <Surcouche
              valeur={valeur}
              documents={documents}
              onChoix={(m) => {
                setValeur(m.id);
                fermer();
              }}
              onFermer={fermer}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

export default MediaPicker;
