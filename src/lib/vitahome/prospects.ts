import "server-only";
import { VITAHOME, hasLiveFeed } from "./config";
import type { OriginKey, ProspectContext, ProspectFields } from "./types";

/** Preuve de consentement, construite côté serveur (voir route.ts). */
export interface ConsentProof {
  /** Horodatage serveur de la réception, ISO 8601. */
  at: string;
  /** Version du texte accepté — incrémentée à chaque reformulation. */
  version: number;
  /** Texte exact soumis au visiteur au moment du clic. */
  text: string;
  /** Opt-in prospection commerciale : facultatif, distinct du consentement. */
  marketing: boolean;
}

/** Forme exacte envoyée à Vitahome. Typée explicitement pour qu'aucun
 *  champ ne s'y ajoute par inadvertance via un spread. */
export interface ProspectPayload {
  "entity-id": number;
  "origin-id": number;
  "construction-location-id": number | null;
  "construction-location-insee": string | null;
  "history-ad-content": string | null;
  "history-link": string | null;
  "history-content": string | null;
  [k: string]: string | number | null | undefined;
}

/* ════ TRACE DE CONSENTEMENT ════
   Le CRM est le seul endroit où le client retrouvera la demande : la
   preuve doit voyager AVEC elle, sinon elle n'est produisible nulle part
   en cas de contrôle. Vitahome n'expose pas de champ dédié au RGPD, on
   l'écrit donc dans `history-content`, qui est archivé avec le contact.
   TODO conformité : si Vitahome ouvre un champ personnalisé, y basculer
   cette trace — un champ structuré s'exporte, un commentaire se perd. */
function consentTrace(proof: ConsentProof) {
  return [
    `[Consentement RGPD v${proof.version} — recueilli le ${proof.at}]`,
    `Texte accepté : « ${proof.text} »`,
    `Prospection commerciale : ${proof.marketing ? "acceptée" : "refusée"}.`,
  ].join("\n");
}

/* ════ ADAPTATEUR PROSPECTS : POST /api/ajout-contact.json ════
   Champs « IMPORTANT » du doc :
   — construction-location-id   : ID Vitahome de la commune (villes.json)
   — construction-location-insee: code INSEE
   — history-ad-content         : contenu de l'annonce (type, surface…)
   — history-link               : lien vers l'annonce sur le site
   — history-content            : message du prospect + preuve de consentement */
export function buildPayload(
  originKey: OriginKey,
  fields: ProspectFields,
  ctx: ProspectContext = {},
  consent?: ConsentProof,
): ProspectPayload {
  const history = [fields.message ?? null, consent ? consentTrace(consent) : null]
    .filter(Boolean)
    .join("\n\n");

  return {
    "entity-id": VITAHOME.entityId,
    "origin-id": VITAHOME.origins[originKey],
    ...fields, // name, phone, email… — noms exacts : doc pro.vitahome.fr/doc/api
    "construction-location-id": ctx.cityId ?? null,
    "construction-location-insee": ctx.insee ?? null,
    "history-ad-content": ctx.adContent ?? null,
    "history-link": ctx.link ?? null,
    "history-content": history || null,
  };
}

export async function sendProspect(
  payload: ProspectPayload,
  meta: { consent: boolean } = { consent: false },
) {
  if (!hasLiveFeed()) {
    /* Dev / preview sans token : on trace QUE le mapping.
       ⚠ Ne jamais logguer `payload` : il porte nom, téléphone et e-mail,
       et un log de build ou de function est lu, archivé et exporté par
       des gens qui n'ont rien à faire de ces données (minimisation,
       RGPD art. 5.1.c). Un compteur de champs suffit à vérifier que le
       mapping est correct. */
    console.info("[vitahome → ajout-contact.json] (dry-run)", {
      entityId: payload["entity-id"],
      originId: payload["origin-id"],
      renseignes: Object.values(payload).filter(
        (v) => v !== null && v !== undefined && v !== "",
      ).length,
      champs: Object.keys(payload).length,
      consentement: meta.consent,
    });
    return { ok: true as const, dryRun: true as const };
  }

  const res = await fetch(`${VITAHOME.base}${VITAHOME.prospectEndpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VITAHOME.token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  /* Le corps de la réponse n'est pas relu : il peut renvoyer en écho les
     données envoyées, et une exception porte son message jusqu'aux logs. */
  if (!res.ok) throw new Error(`Vitahome ajout-contact ${res.status}`);
  return { ok: true as const, dryRun: false as const };
}
