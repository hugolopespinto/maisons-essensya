"use client";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useSyncExternalStore } from "react";
import { CONSENT_COOKIE, readConsent } from "@/lib/consent";

/* ════════════════════════════════════════════════════════════════
   GTM + GA4 + CONSENT MODE v2 — mode « basic »

   L'ordre compte, et c'est tout l'enjeu de conformité :
     1. `consent default` en `denied` — INLINE dans le <head>, donc
        exécuté avant tout le reste ;
     2. le conteneur GTM, chargé UNIQUEMENT après accord de mesure ;
     3. `consent update` au choix de l'utilisateur (voir lib/consent.ts).

   ── Pourquoi « basic » et pas « advanced » ───────────────────────
   En mode « advanced », GTM se charge dès la première page et n'envoie
   que des pings sans cookie tant que le consentement manque. Rien n'est
   déposé, mais `googletagmanager.com` reçoit tout de même l'adresse IP
   de chaque visiteur — donc une donnée personnelle transmise à Google
   avant tout choix.

   Or `/confidentialite` écrit noir sur blanc que Google n'intervient
   « que si vous avez accepté » et que « refuser les cookies de mesure
   suffit à écarter ce transfert ». Entre affaiblir la promesse et aligner
   le code dessus, on aligne le code : mode « basic », aucun contact avec
   Google avant le clic.

   Ce qu'on y perd, et qui est assumé : sans les pings « consent denied »,
   Google ne peut modéliser ni les conversions ni le trafic des visiteurs
   qui refusent. L'audience mesurée est celle des seuls consentants, sans
   extrapolation. Sur un constructeur dont la conversion réelle est un
   rendez-vous en agence, la modélisation vaut moins que la promesse tenue.

   Le `consent default` reste posé inconditionnellement : c'est lui qui
   garantit que rien ne part si le conteneur finit par se charger — y
   compris dans la fenêtre entre son injection et le `consent update`.

   Le conteneur n'est chargé que si un identifiant existe — la variable
   NEXT_PUBLIC_GTM_ID, ou à défaut celui saisi dans le back-office (écran
   Tracking). Sans identifiant, en local comme en preview, rien ne part.
   ════════════════════════════════════════════════════════════════ */

const ENV_GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

/**
 * L'identifiant retenu : la variable d'environnement D'ABORD, le
 * back-office ensuite. L'ordre n'est pas neutre — `NEXT_PUBLIC_GTM_ID` est
 * maîtrisée par le développeur et par l'hébergeur, elle doit pouvoir
 * reprendre la main sur une saisie faite dans l'administration. L'inverse
 * laisserait un conteneur de production se faire remplacer depuis un écran
 * d'admin, ce qu'on ne veut pas.
 *
 * `Analytics` est un composant client : il ne peut pas lire `getContent()`.
 * C'est le layout — Server Component — qui lui passe la valeur du contenu.
 */
const resoudreGtm = (gtmId?: string) => ENV_GTM_ID || gtmId || "";

/* Le mode « denied par défaut » lit le cookie AVANT GTM pour ne pas
   annuler un consentement déjà donné le temps de l'hydratation. */
const CONSENT_DEFAULT = `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments)}
var granted={};
try{
  var m=document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/);
  if(m){granted=JSON.parse(decodeURIComponent(m[1]))||{}}
}catch(e){}
var a=granted.mesure?'granted':'denied';
var p=granted.marketing?'granted':'denied';
gtag('consent','default',{
  'analytics_storage':a,
  'ad_storage':p,
  'ad_user_data':p,
  'ad_personalization':p,
  'functionality_storage':'granted',
  'security_storage':'granted',
  'wait_for_update':500
});
`;

/* ════ LE CONSENTEMENT COMME STORE EXTERNE ════
   Le cookie n'est pas un état React : on le lit avec useSyncExternalStore,
   jamais avec un setState dans un effet (règle interdite par le lint,
   `react-hooks/set-state-in-effect`). Même mécanique que CookieBanner et
   sur le même événement `essensya:consent`, déjà émis par `writeConsent()` :
   l'acceptation charge donc GTM sans rechargement de page.

   Le snapshot serveur vaut « denied » : le HTML pré-rendu ne contient
   jamais GTM, il reste identique pour tout le monde et cachable sur le
   CDN. Un visiteur déjà consentant récupère le conteneur juste après
   l'hydratation, quand useSyncExternalStore relit le cookie. */
const mesureStore = {
  subscribe(onChange: () => void) {
    window.addEventListener("essensya:consent", onChange);
    return () => window.removeEventListener("essensya:consent", onChange);
  },
  /* Une chaîne plutôt qu'un booléen dérivé d'un objet : React compare les
     snapshots avec Object.is, il leur faut une identité stable d'un appel
     à l'autre. */
  getSnapshot: () => (readConsent()?.mesure ? "granted" : "denied"),
  getServerSnapshot: () => "denied",
};

/** `true` dès que l'utilisateur a accepté la mesure d'audience. */
function useMesureAutorisee() {
  const etat = useSyncExternalStore(
    mesureStore.subscribe,
    mesureStore.getSnapshot,
    mesureStore.getServerSnapshot,
  );
  return etat === "granted";
}

/** L'App Router ne pousse pas de page_view au changement de route. */
function PageViews({ gtmId }: { gtmId: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    if (!gtmId) return;
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    const qs = params.toString();
    w.dataLayer.push({
      event: "page_view",
      page_path: pathname + (qs ? `?${qs}` : ""),
      page_title: document.title,
    });
  }, [gtmId, pathname, params]);
  return null;
}

/**
 * Le défaut de consentement, en <script> BRUT à poser dans le <head>.
 *
 * Pas un `next/script` : `beforeInteractive` n'a pas de sens ici (et le
 * lint le signale à juste titre). Un script inline dans le <head> s'exécute
 * en ordre de document, donc forcément avant le conteneur GTM chargé en
 * `afterInteractive`. C'est exactement la garantie qu'on cherche.
 *
 * ⚠ Inconditionnel, et il doit le rester : c'est lui qui fait que le
 * conteneur — injecté plus tard, à l'acceptation — trouve toujours un état
 * de consentement déjà posé plutôt qu'un dataLayer vierge.
 */
export function ConsentDefaultScript() {
  return (
    <script
      id="consent-default"
      // Contenu statique écrit ici, aucune donnée utilisateur interpolée.
      dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT }}
    />
  );
}

export default function Analytics({ gtmId }: { gtmId?: string }) {
  const id = resoudreGtm(gtmId);
  const mesure = useMesureAutorisee();

  /* Pas d'identifiant ou pas d'accord : aucune requête vers Google, pas
     même celle du conteneur.

     Un retrait de consentement démonte ce <Script> mais ne décharge pas un
     conteneur déjà présent dans la page — le JS ne sait pas faire. C'est
     `pushConsentToDataLayer()` qui prend le relais : `consent update` en
     `denied`, puis expiration des cookies `_ga*`. Le chargement de page
     suivant repart, lui, sans GTM du tout. */
  if (!id || !mesure) return null;

  return (
    <>
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer','${id}');`}
      </Script>
      {/* Monté en même temps que le conteneur : le page_view de la page en
          cours part à l'acceptation, puis à chaque changement de route. */}
      <Suspense fallback={null}>
        <PageViews gtmId={id} />
      </Suspense>
    </>
  );
}

/**
 * Le <noscript> de GTM, juste après l'ouverture de <body>.
 *
 * Soumis au même verrou que le conteneur : tant que la mesure n'est pas
 * acceptée, l'iframe n'est pas dans le document et Google ne reçoit rien.
 * En pratique cela revient à ne jamais la rendre pour un visiteur sans
 * JavaScript — qui ne peut pas davantage utiliser le bandeau, donc ne peut
 * pas consentir. C'est le comportement juste : pas de consentement
 * possible, pas de mesure. On la conserve pour le cas où JavaScript est
 * réactivé alors qu'un consentement a déjà été enregistré.
 */
export function GtmNoScript({ gtmId }: { gtmId?: string }) {
  const id = resoudreGtm(gtmId);
  const mesure = useMesureAutorisee();
  if (!id || !mesure) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${id}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
