import { NextResponse } from "next/server";
import { VITAHOME } from "@/lib/vitahome/config";
import { buildPayload, sendProspect } from "@/lib/vitahome/prospects";
import type { OriginKey } from "@/lib/vitahome/types";
import { SITE_URL } from "@/lib/site-url";

/* ════ PROXY PROSPECTS ════
   Le navigateur POSTe ici ; c'est ce handler — et lui seul — qui connaît
   le token Vitahome. C'est la version Next du proxy WordPress prévu au
   doc (/wp-json/essensya/v1/lead).

   C'est aussi le SEUL point de passage des données personnelles vers un
   tiers. Tout ce qui protège le visiteur doit donc être vérifié ici, et
   pas seulement dans le formulaire : une case cochée côté navigateur se
   contourne avec trois lignes de curl.
     1. origine de la requête ;
     2. quota par IP ;
     3. leurre anti-robot ;
     4. consentement — sans lui, rien ne part ;
     5. liste blanche de champs, puis relais.                          */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORIGIN_KEYS = Object.keys(VITAHOME.origins) as OriginKey[];

/** Sanitize : on ne relaie que des champs texte courts et connus.
 *  Ajouter un champ à un formulaire NE SUFFIT PAS à le transmettre : il
 *  faut l'inscrire ici, et ce frottement est volontaire — c'est ce qui
 *  garantit qu'aucune donnée n'atteint le CRM sans avoir été décidée.
 *  ⚠ `consent`, `marketing` et le leurre n'y figurent pas et n'y ont pas
 *  leur place : ce ne sont pas des données de contact, ils sont traités
 *  plus bas par leur propre chemin. */
const ALLOWED_FIELDS = [
  "name",
  "phone",
  "email",
  "message",
  "zone",
  "stage",
  "reason",
  "msg",
] as const;

/** Longueur max relayée par champ (le message libre est le seul long). */
const MAX_FIELD_LEN = 2000;

/* ════ PREUVE DE CONSENTEMENT ════
   Le serveur est seul juge du texte accepté : un client peut prétendre
   n'importe quoi. On archive donc NOTRE texte, celui que le déploiement
   en cours affiche réellement.
   ⚠ Miroir client : `CONSENT_TEXT` / `CONSENT_TEXT_VERSION` dans
   src/components/LeadForm.tsx. Les deux constantes doivent rester
   identiques mot pour mot — LeadForm étant un composant client, ses
   exports ne sont pas importables ici sans franchir la frontière RSC.
   TODO conformité : à la prochaine refonte, extraire ce texte dans un
   module neutre (src/lib/consent-form.ts) importable des deux côtés. */
const CONSENT_TEXT_VERSION = 1;
const CONSENT_TEXT =
  "J’accepte que les informations saisies soient transmises à l’agence " +
  "Maisons Essensya de mon secteur ainsi qu’à son outil de gestion " +
  "commerciale (Vitahome, sous-traitant du constructeur), afin de traiter " +
  "ma demande et d’être recontacté.";

/** Nom du champ leurre — identique à HONEYPOT_FIELD côté LeadForm.
 *  LeadForm l'extrait et l'envoie sous `trap` ; on relit aussi `fields`
 *  au cas où un script POSTerait le formulaire tel quel. */
const HONEYPOT_FIELD = "company";

/* ════ CONTRÔLE D'ORIGINE ════
   Un POST de formulaire porte toujours un en-tête `Origin` dans les
   navigateurs actuels. Refuser ce qui ne vient pas du site écarte les
   soumissions depuis une page tierce (CSRF) et une bonne part des
   scripts qui tapent l'endpoint en direct. */
function hostOf(url: string | null | undefined) {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function isSameSite(req: Request) {
  const origin = hostOf(req.headers.get("origin"));
  if (!origin) return false; // Origin absent = pas un envoi de formulaire.
  const allowed = new Set<string>();
  /* L'hôte réellement servi : couvre la prod, les deploy previews
     Netlify et le localhost de développement sans les énumérer. */
  const self = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (self) allowed.add(self);
  const site = hostOf(SITE_URL);
  if (site) allowed.add(site);
  return allowed.has(origin);
}

/* ════ QUOTA PAR IP ════
   ⚠ Mémoire de PROCESSUS. Sur Netlify, chaque instance de function a la
   sienne et une instance froide repart de zéro : ce compteur freine un
   script naïf, il n'arrête pas une campagne distribuée. C'est un
   garde-fou, pas une protection. Une vraie limite suppose un store
   partagé — Netlify Blobs, Upstash Redis, ou le rate-limiting du WAF.
   TODO conformité / sécurité : brancher un store partagé avant d'ouvrir
   le site à la publicité payante (le volume de spam suit le trafic). */
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_MAX = 5; // envois autorisés par fenêtre et par IP
const RATE_MAX_KEYS = 5_000; // plafond mémoire, purge au-delà

const hits = new Map<string, number[]>();

function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-nf-client-connection-ip") || "inconnue";
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);

  /* Purge opportuniste : la Map ne doit pas grossir indéfiniment sur une
     instance longue durée. On ne garde que les IP encore dans la fenêtre. */
  if (hits.size > RATE_MAX_KEYS) {
    for (const [key, stamps] of hits) {
      if (!stamps.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(key);
    }
  }
  return false;
}

export async function POST(req: Request) {
  if (!isSameSite(req)) {
    return NextResponse.json({ error: "Origine refusée" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { originKey, fields, ctx, consent, marketing, trap } = (body ?? {}) as {
    originKey?: string;
    fields?: Record<string, unknown>;
    ctx?: Record<string, unknown>;
    consent?: boolean;
    marketing?: boolean;
    trap?: string;
  };

  if (isRateLimited(clientIp(req))) {
    /* 429 explicite plutôt qu'un silence : un humain qui envoie deux
       formulaires d'affilée doit comprendre ce qui se passe. */
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez dans quelques minutes." },
      { status: 429, headers: { "Retry-After": String(RATE_WINDOW_MS / 1000) } },
    );
  }

  /* Leurre rempli = robot. On répond 200 : signaler le rejet apprendrait
     au script à contourner le piège. Rien n'est relayé. */
  const decoy = fields?.[HONEYPOT_FIELD];
  const trapped =
    (typeof trap === "string" && trap.trim() !== "") ||
    (typeof decoy === "string" && decoy.trim() !== "");
  if (trapped) {
    return NextResponse.json({ ok: true });
  }

  if (!originKey || !ORIGIN_KEYS.includes(originKey as OriginKey)) {
    return NextResponse.json({ error: "originKey inconnu" }, { status: 400 });
  }

  /* ⚠ Le point dur de la conformité : pas de consentement, pas de
     transfert. La case du formulaire ne fait que renseigner ce booléen ;
     c'est ce test-ci qui la rend opposable. */
  if (consent !== true) {
    return NextResponse.json(
      { error: "Le consentement au traitement de la demande est requis" },
      { status: 422 },
    );
  }

  const clean: Record<string, string> = {};
  for (const key of ALLOWED_FIELDS) {
    const v = fields?.[key];
    if (typeof v === "string" && v.trim()) {
      clean[key === "msg" ? "message" : key] = v.trim().slice(0, MAX_FIELD_LEN);
    }
  }
  if (!clean.name || !clean.phone) {
    return NextResponse.json(
      { error: "Nom et téléphone sont requis" },
      { status: 422 },
    );
  }

  const payload = buildPayload(
    originKey as OriginKey,
    clean,
    {
      cityId: typeof ctx?.cityId === "number" ? ctx.cityId : null,
      insee: typeof ctx?.insee === "string" ? ctx.insee : null,
      adContent: typeof ctx?.adContent === "string" ? ctx.adContent : null,
      link: typeof ctx?.link === "string" ? ctx.link : null,
    },
    {
      /* Horodatage serveur : la machine du visiteur peut être à l'heure
         qu'elle veut, la preuve doit être datée par nous. */
      at: new Date().toISOString(),
      version: CONSENT_TEXT_VERSION,
      text: CONSENT_TEXT,
      marketing: marketing === true,
    },
  );

  try {
    const result = await sendProspect(payload, { consent: true });
    return NextResponse.json(result);
  } catch (err) {
    /* ⚠ Ne JAMAIS logguer `payload` ni `clean` ici : ils contiennent nom,
       téléphone et e-mail. On ne trace que la nature de la panne. */
    console.error(
      "[api/leads] échec relais Vitahome",
      err instanceof Error ? err.message : "erreur inconnue",
    );
    return NextResponse.json({ error: "Envoi impossible" }, { status: 502 });
  }
}
