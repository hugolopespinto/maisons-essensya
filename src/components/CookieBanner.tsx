"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ACCEPT_TOTAL,
  CONSENT_VERSION,
  type Consent,
  FINALITES,
  OPEN_PREFS_EVENT,
  REFUS_TOTAL,
  readConsent,
  writeConsent,
} from "@/lib/consent";

/* Le cookie est un store externe : on le lit avec useSyncExternalStore
   plutôt qu'avec un setState dans un effet. Côté serveur, le snapshot vaut
   « aucun choix connu » — le HTML pré-rendu est donc identique pour tout le
   monde et reste cachable sur le CDN. */
const consentStore = {
  subscribe(onChange: () => void) {
    window.addEventListener("essensya:consent", onChange);
    return () => window.removeEventListener("essensya:consent", onChange);
  },
  getSnapshot: () => readConsent()?.at ?? "",
  getServerSnapshot: () => "",
};

/* ════════════════════════════════════════════════════════════════
   BANDEAU COOKIES

   Deux états : le bandeau (2 boutons de même poids + un lien) et le
   panneau de préférences (une finalité par ligne, interrupteurs).

   Points de conformité qui se jouent dans ce fichier :
     · « Tout refuser » a EXACTEMENT le même style que « Tout accepter ».
       C'est le point n°1 des mises en demeure CNIL. Ne pas « adoucir »
       le refus au profit de l'acceptation.
     · Aucun interrupteur n'est pré-coché (hors finalité nécessaire).
     · Fermer sans choisir ne vaut PAS acceptation : il n'y a d'ailleurs
       pas de croix de fermeture sur le bandeau, seulement des choix.
     · Le panneau est une vraie boîte de dialogue : focus piégé, Échap,
       retour du focus à l'élément déclencheur.
   ════════════════════════════════════════════════════════════════ */

/** "auto" = on suit le cookie ; les autres valeurs sont des choix d'affichage. */
type Vue = "auto" | "prefs" | "ferme";

export default function CookieBanner() {
  const [vue, setVue] = useState<Vue>("auto");
  const [choix, setChoix] = useState({ mesure: false, marketing: false });
  const panelRef = useRef<HTMLDivElement>(null);
  const declencheur = useRef<HTMLElement | null>(null);

  const stamp = useSyncExternalStore(
    consentStore.subscribe,
    consentStore.getSnapshot,
    consentStore.getServerSnapshot,
  );
  /* Pas d'horodatage = pas de choix exprimé = pas de consentement. */
  const aChoisi = stamp !== "";

  /* Rouvrable à tout moment depuis le pied de page (exigence CNIL). */
  useEffect(() => {
    const open = () => {
      declencheur.current = document.activeElement as HTMLElement;
      const c = readConsent();
      if (c) setChoix({ mesure: c.mesure, marketing: c.marketing });
      setVue("prefs");
    };
    window.addEventListener(OPEN_PREFS_EVENT, open);
    return () => window.removeEventListener(OPEN_PREFS_EVENT, open);
  }, []);

  const fermer = useCallback((c?: Consent) => {
    setVue("ferme");
    if (c) setChoix({ mesure: c.mesure, marketing: c.marketing });
    declencheur.current?.focus();
    declencheur.current = null;
  }, []);

  /* Échap ferme le panneau SANS rien enregistrer — l'absence de choix
     vaut refus, on ne profite pas d'une fermeture pour consentir. */
  useEffect(() => {
    if (vue !== "prefs") return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("button, input, a")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        /* Échap ne vaut jamais consentement : s'il n'y a pas encore de
           choix, on retombe sur le bandeau, on ne ferme pas. */
        if (aChoisi) fermer();
        else setVue("auto");
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const f = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href]',
      );
      if (!f.length) return;
      const [first, last] = [f[0], f[f.length - 1]];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [vue, fermer, aChoisi]);

  const toutAccepter = () => fermer(writeConsent(ACCEPT_TOTAL));
  const toutRefuser = () => fermer(writeConsent(REFUS_TOTAL));
  const enregistrer = () =>
    fermer(writeConsent({ necessaire: true, ...choix, v: CONSENT_VERSION }));

  if (vue === "ferme") return null;
  /* En mode auto, le bandeau n'apparaît que tant qu'aucun choix n'est fait. */
  if (vue === "auto" && aChoisi) return null;

  if (vue !== "prefs") {
    return (
      <aside
        className="c-cookies"
        role="dialog"
        aria-modal="false"
        aria-labelledby="ck-titre"
        aria-describedby="ck-texte"
      >
        <div className="c-cookies__inner">
          <div className="c-cookies__text">
            <h2 id="ck-titre" className="c-cookies__titre">
              Cookies
            </h2>
            <p id="ck-texte">
              Nous utilisons des cookies pour mesurer l&apos;audience du site et
              améliorer nos pages. Rien n&apos;est déposé sans votre accord, et vous
              pouvez changer d&apos;avis à tout moment.{" "}
              <Link href="/cookies">En savoir plus</Link>
            </p>
          </div>
          {/* Refuser et accepter : même composant, même poids visuel. */}
          <div className="c-cookies__actions">
            <button type="button" className="c-btn c-btn--light" onClick={toutRefuser}>
              Tout refuser
            </button>
            <button type="button" className="c-btn c-btn--light" onClick={toutAccepter}>
              Tout accepter
            </button>
            <button
              type="button"
              className="c-cookies__perso"
              onClick={() => setVue("prefs")}
            >
              Personnaliser
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <div className="c-cookies__overlay">
      <div
        className="c-cookies__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ck-prefs-titre"
        ref={panelRef}
      >
        <div className="c-cookies__head">
          <span className="c-label c-label--accent">Vos préférences</span>
          <h2 id="ck-prefs-titre">Gestion des cookies</h2>
          <p className="u-muted">
            Choisissez finalité par finalité. Votre choix est conservé six mois et
            reste modifiable depuis le pied de page.
          </p>
        </div>

        <ul className="c-cookies__list">
          {FINALITES.map((f) => {
            const actif = f.verrouille || choix[f.cle as "mesure" | "marketing"];
            return (
              <li key={f.cle}>
                <div className="c-cookies__row">
                  <h3>{f.titre}</h3>
                  <label className="c-switch">
                    <input
                      type="checkbox"
                      checked={actif}
                      disabled={f.verrouille}
                      onChange={(e) =>
                        setChoix((c) => ({ ...c, [f.cle]: e.target.checked }))
                      }
                    />
                    <span className="c-switch__track" aria-hidden="true" />
                    <span className="u-sr-only">
                      {f.verrouille
                        ? `${f.titre} — toujours actifs`
                        : `Activer ${f.titre}`}
                    </span>
                  </label>
                </div>
                <p>{f.texte}</p>
                {f.verrouille && (
                  <span className="c-cookies__lock">Toujours actifs</span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="c-cookies__foot">
          <button type="button" className="c-btn" onClick={toutRefuser}>
            Tout refuser
          </button>
          <button type="button" className="c-btn" onClick={toutAccepter}>
            Tout accepter
          </button>
          <button type="button" className="c-btn c-btn--solid" onClick={enregistrer}>
            Enregistrer mes choix <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
