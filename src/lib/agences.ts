import "server-only";
import { AGENCIES } from "@/data/essensya";
import { resoudreMedia } from "@/lib/medias";
import { getContent } from "@/lib/store";
import type { Agence } from "@/lib/store/types";
import type { Agency } from "@/types";

/* ════════════════════════════════════════════════════════════════
   LES AGENCES PUBLIÉES — une seule source

   Ce module n'existait pas : les deux pages `/agences` portaient chacune
   leur copie, avec ce commentaire de part et d'autre — « si un troisième
   appelant apparaît, c'est le moment de l'extraire ». Les pages de zone
   sont ce troisième appelant.

   ⚠ Et entre-temps les deux copies avaient DIVERGÉ, sans que rien ne le
   signale : la fiche avait gagné le traitement séparé des coordonnées
   (`geo`), la liste était restée au repli sur `0`. Les deux commentaires
   continuaient d'affirmer qu'elles étaient identiques. C'est la version
   la plus stricte — celle de la fiche — qui fait foi ici.
   ════════════════════════════════════════════════════════════════ */

/* Une carte sans photo doit rester une carte, pas une icône d'image
   cassée. `src=""` ne serait pas neutre non plus : le navigateur le
   résout en rechargeant la page courante. D'où cet aplat de 130 octets,
   à la couleur « sable » de la palette. */
export const SANS_PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='10'%3E%3Crect width='16' height='10' fill='%23E8E3D9'/%3E%3C/svg%3E";

/**
 * L'`Agency` des gabarits, plus les coordonnées quand elles existent.
 *
 * `Agency.lat` / `.lng` sont des nombres obligatoires — un héritage de
 * l'époque où les deux agences étaient écrites à la main. Le client, lui,
 * peut enregistrer une agence sans coordonnées, et le back-office le
 * prévient. Retomber sur `0` remplirait le JSON-LD d'un point au large
 * du golfe de Guinée : `geo` reste donc à part, et n'est publié que s'il
 * est vrai.
 */
export type AgenceAffichee = Agency & { geo?: { lat: number; lng: number } };

/**
 * La description de repli d'une agence, quand le client n'en a saisi
 * aucune — c'est le cas des cinq.
 *
 * ⚠ ELLE NE DIT QUE CE QU'ON SAIT. Nom, zone, commune desservie : trois
 * champs remplis par le back-office. Aucune promesse de service, aucun
 * horaire inventé. C'est le minimum qui distingue les cinq fiches les
 * unes des autres — une description identique sur cinq pages vaudrait à
 * peine mieux qu'une absence.
 *
 * Elle sert UNIQUEMENT de repli : dès que le client écrit sa
 * présentation, c'est la sienne qui part.
 */
export function descriptionAgence(g: Agency): string {
  const villes = g.cities.filter(Boolean);
  const ou =
    villes.length > 0
      ? `${villes.slice(0, 3).join(", ")}${villes.length > 3 ? " et alentours" : ""}`
      : g.zone;
  return `${g.name} : votre constructeur de maisons individuelles à ${ou}. Adresse, téléphone et contact pour étudier votre projet de construction.`;
}

/** Une `Agence` éditable → l'`Agency` qu'attendent les gabarits. */
export async function versAgency(a: Agence): Promise<AgenceAffichee> {
  return {
    id: a.id,
    name: a.nom,
    zone: a.zone,
    address: a.adresse,
    phone: a.telephone,
    email: a.email,
    hours: a.horaires,
    lat: a.lat ?? 0,
    lng: a.lng ?? 0,
    ...(a.lat !== undefined && a.lng !== undefined
      ? { geo: { lat: a.lat, lng: a.lng } }
      : {}),
    image: (await resoudreMedia(a.image)) ?? SANS_PHOTO,
    cities: a.villes,
    description: a.description,
  };
}

/**
 * Les agences réellement publiées, dans l'ordre voulu par le client.
 *
 * ⚠ REPLI SUR LA CONSTANTE : UNIQUEMENT SI LA LISTE EST VIDE.
 * Pas « si aucune agence n'est visible ». La nuance est le cœur du
 * contrat : fermer toutes ses agences est une décision, et le site doit
 * l'appliquer. Réafficher les agences du code à ce moment-là remettrait
 * en ligne des adresses et des numéros que le client vient de retirer —
 * c'est-à-dire exactement ce qu'il a demandé de ne plus publier.
 */
export async function agencesPubliees(): Promise<AgenceAffichee[]> {
  const { agences } = await getContent();
  if (agences.length === 0) {
    return AGENCIES.map((g) => ({ ...g, geo: { lat: g.lat, lng: g.lng } }));
  }
  return Promise.all(
    agences
      .filter((a) => a.actif)
      .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"))
      .map(versAgency),
  );
}
