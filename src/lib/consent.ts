/* ════════════════════════════════════════════════════════════════
   CONSENTEMENT COOKIES — socle logique

   Choix d'une CMP maison plutôt qu'un service tiers (Axeptio, Cookiebot,
   Tarteaucitron) pour trois raisons :
     · c'est le premier écran que voit 100 % des visiteurs — il doit être
       à la DA, pas au thème par défaut d'un widget ;
     · aucun abonnement, aucune dépendance tierce, aucun script externe
       chargé AVANT le consentement (ce que font plusieurs CMP du marché) ;
     · le périmètre est petit : GA4 via GTM, et rien d'autre.
   Si le client ajoute un jour des tags publicitaires à forte volumétrie,
   basculer vers une CMP certifiée IAB TCF se discutera — ce socle expose
   déjà la même forme d'API.

   Exigences CNIL tenues ici (délibération n° 2020-092) :
     · refuser doit être aussi simple qu'accepter → deux boutons de même
       niveau, même taille, même écran, un seul clic chacun ;
     · pas de consentement = pas de dépôt. L'absence de choix vaut refus ;
     · choix granulaire par finalité ;
     · le choix est révocable à tout moment (lien permanent en pied de page) ;
     · durée de conservation du choix limitée à 6 mois ;
     · preuve du consentement : horodatage + version des finalités.
   ════════════════════════════════════════════════════════════════ */

export const CONSENT_COOKIE = "essensya_consent";

/** Incrémenter à chaque changement de finalités : re-demande le consentement. */
export const CONSENT_VERSION = 1;

/** 6 mois. La CNIL tolère 13 mois ; on est volontairement plus court. */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 182;

export interface Consent {
  /** Toujours true : strictement nécessaires au fonctionnement. */
  necessaire: true;
  /** Mesure d'audience (GA4). */
  mesure: boolean;
  /** Publicité et remarketing. */
  marketing: boolean;
  /** Version des finalités au moment du choix. */
  v: number;
  /** Horodatage ISO — sert de preuve du consentement. */
  at: string;
}

export const REFUS_TOTAL: Omit<Consent, "at"> = {
  necessaire: true,
  mesure: false,
  marketing: false,
  v: CONSENT_VERSION,
};

export const ACCEPT_TOTAL: Omit<Consent, "at"> = {
  necessaire: true,
  mesure: true,
  marketing: true,
  v: CONSENT_VERSION,
};

/** Les finalités présentées à l'utilisateur, dans l'ordre d'affichage. */
export const FINALITES = [
  {
    cle: "necessaire" as const,
    titre: "Strictement nécessaires",
    texte:
      "Indispensables au fonctionnement du site : mémorisation de votre choix de cookies, sécurité des formulaires. Ils ne peuvent pas être désactivés et ne servent à aucun suivi.",
    verrouille: true,
  },
  {
    cle: "mesure" as const,
    titre: "Mesure d'audience",
    texte:
      "Nous aident à comprendre quelles pages sont consultées et par combien de personnes, pour améliorer le site. Les données sont agrégées — Google Analytics 4, via Google Tag Manager.",
    verrouille: false,
  },
  {
    cle: "marketing" as const,
    titre: "Publicité et personnalisation",
    texte:
      "Permettent de mesurer l'efficacité de nos campagnes et de vous présenter nos offres sur d'autres sites. Aucun cookie publicitaire n'est déposé sans votre accord.",
    verrouille: false,
  },
];

/* ════ LECTURE / ÉCRITURE ════ */

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Consent;
    /* Un choix exprimé sur d'anciennes finalités ne vaut plus : on redemande. */
    if (parsed.v !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(choix: Omit<Consent, "at">): Consent {
  const consent: Consent = { ...choix, at: new Date().toISOString() };
  const secure = typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = [
    `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}`,
    "path=/",
    `max-age=${CONSENT_MAX_AGE}`,
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  pushConsentToDataLayer(consent);
  window.dispatchEvent(new CustomEvent("essensya:consent", { detail: consent }));
  return consent;
}

/* ════ GOOGLE CONSENT MODE v2 ════
   `gtag('consent','update',…)` doit suivre un `default` posé AVANT le
   chargement du conteneur GTM — voir ConsentModeScript. Sans ce default,
   GA4 dépose avant le choix de l'utilisateur, ce qui est exactement ce
   que la CNIL sanctionne.                                              */
/**
 * ⚠ `gtag` DOIT pousser l'objet `arguments`, pas un tableau.
 *
 * Google Tag Manager reconnaît une commande `consent` à la forme exacte
 * de ce qui est poussé : un objet `arguments` (« array-like », avec sa
 * propriété `callee`). Un vrai tableau est ignoré en silence — le
 * `consent update` ne serait jamais pris en compte et l'acceptation de
 * l'utilisateur resterait sans effet jusqu'au rechargement suivant.
 * D'où la fonction classique et `arguments` : c'est ce que fait le
 * snippet officiel, et c'est déjà ce que fait le script du <head>.
 */
function gtag(
  command: "consent",
  action: "update" | "default",
  params: Record<string, string | number>,
) {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  /* Les trois paramètres nommés ne servent qu'à typer l'appel : c'est
     l'objet `arguments` qui est poussé, et lui seul. */
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  void command, action, params;
  // eslint-disable-next-line prefer-rest-params
  w.dataLayer.push(arguments);
}

/**
 * Expire les cookies de mesure déjà déposés.
 *
 * Retirer son consentement doit avoir un effet rétroactif : sans ça,
 * l'identifiant `_ga` continue de vivre treize mois dans le navigateur
 * après un refus, ce qui vide le retrait de sa substance.
 * On balaie les variantes de domaine parce qu'un cookie posé sur
 * `.exemple.fr` ne s'efface pas depuis `www.exemple.fr` sans préciser
 * le même domaine.
 */
function expireAnalyticsCookies() {
  const noms = document.cookie
    .split("; ")
    .map((c) => c.split("=")[0])
    .filter((n) => /^_ga/.test(n) || n === "_gid" || /^_gat/.test(n));
  if (!noms.length) return;

  const hote = location.hostname;
  const parent = hote.split(".").slice(-2).join(".");
  const domaines = [undefined, hote, `.${hote}`, `.${parent}`];

  for (const nom of noms) {
    for (const d of domaines) {
      document.cookie = `${nom}=; path=/; max-age=0${d ? `; domain=${d}` : ""}`;
    }
  }
}

export function pushConsentToDataLayer(c: Consent) {
  gtag("consent", "update", {
    analytics_storage: c.mesure ? "granted" : "denied",
    ad_storage: c.marketing ? "granted" : "denied",
    ad_user_data: c.marketing ? "granted" : "denied",
    ad_personalization: c.marketing ? "granted" : "denied",
  });
  if (!c.mesure) expireAnalyticsCookies();

  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({
    event: "consent_update",
    consent_mesure: c.mesure,
    consent_marketing: c.marketing,
  });
}

/** Ouvre le panneau de préférences depuis n'importe où (lien de pied de page). */
export const OPEN_PREFS_EVENT = "essensya:open-consent";
export function openConsentPreferences() {
  window.dispatchEvent(new Event(OPEN_PREFS_EVENT));
}
