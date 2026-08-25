import { NextResponse } from "next/server";
import { VITAHOME } from "@/lib/vitahome/config";
import { buildPayload, sendProspect } from "@/lib/vitahome/prospects";
import type { OriginKey } from "@/lib/vitahome/types";

/* ════ PROXY PROSPECTS ════
   Le navigateur POSTe ici ; c'est ce handler — et lui seul — qui connaît
   le token Vitahome. C'est la version Next du proxy WordPress prévu au
   doc (/wp-json/essensya/v1/lead).                                     */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORIGIN_KEYS = Object.keys(VITAHOME.origins) as OriginKey[];

/** Sanitize : on ne relaie que des champs texte courts et connus. */
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

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { originKey, fields, ctx } = (body ?? {}) as {
    originKey?: string;
    fields?: Record<string, unknown>;
    ctx?: Record<string, unknown>;
  };

  if (!originKey || !ORIGIN_KEYS.includes(originKey as OriginKey)) {
    return NextResponse.json({ error: "originKey inconnu" }, { status: 400 });
  }

  const clean: Record<string, string> = {};
  for (const key of ALLOWED_FIELDS) {
    const v = fields?.[key];
    if (typeof v === "string" && v.trim()) {
      clean[key === "msg" ? "message" : key] = v.trim().slice(0, 2000);
    }
  }
  if (!clean.name || !clean.phone) {
    return NextResponse.json(
      { error: "Nom et téléphone sont requis" },
      { status: 422 },
    );
  }

  const payload = buildPayload(originKey as OriginKey, clean, {
    cityId: typeof ctx?.cityId === "number" ? ctx.cityId : null,
    insee: typeof ctx?.insee === "string" ? ctx.insee : null,
    adContent: typeof ctx?.adContent === "string" ? ctx.adContent : null,
    link: typeof ctx?.link === "string" ? ctx.link : null,
  });

  try {
    const result = await sendProspect(payload);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/leads]", err);
    return NextResponse.json({ error: "Envoi impossible" }, { status: 502 });
  }
}
