import "server-only";
import { VITAHOME, hasLiveFeed } from "./config";
import type { OriginKey, ProspectContext, ProspectFields } from "./types";

/* ════ ADAPTATEUR PROSPECTS : POST /api/ajout-contact.json ════
   Champs « IMPORTANT » du doc :
   — construction-location-id   : ID Vitahome de la commune (villes.json)
   — construction-location-insee: code INSEE
   — history-ad-content         : contenu de l'annonce (type, surface…)
   — history-link               : lien vers l'annonce sur le site
   — history-content            : message du prospect                 */
export function buildPayload(
  originKey: OriginKey,
  fields: ProspectFields,
  ctx: ProspectContext = {},
) {
  return {
    "entity-id": VITAHOME.entityId,
    "origin-id": VITAHOME.origins[originKey],
    ...fields, // name, phone, email… — noms exacts : doc pro.vitahome.fr/doc/api
    "construction-location-id": ctx.cityId ?? null,
    "construction-location-insee": ctx.insee ?? null,
    "history-ad-content": ctx.adContent ?? null,
    "history-link": ctx.link ?? null,
    "history-content": fields.message ?? null,
  };
}

export async function sendProspect(payload: ReturnType<typeof buildPayload>) {
  if (!hasLiveFeed()) {
    // Dev / preview sans token : on trace le mapping sans rien envoyer.
    console.info("[vitahome → ajout-contact.json] (dry-run)", payload);
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

  if (!res.ok) throw new Error(`Vitahome ajout-contact ${res.status}`);
  return { ok: true as const, dryRun: false as const };
}
