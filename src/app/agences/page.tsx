import type { Metadata } from "next";
import Link from "next/link";
import AgencyCard from "@/components/AgencyCard";
import { AGENCIES, PRICE_FROM } from "@/data/essensya";
import { fmtPrice } from "@/lib/format";
import { resoudreMedia } from "@/lib/medias";
import { resolveMetadata } from "@/lib/seo";
import { filAriane, jsonLd, listeSchema } from "@/lib/schema";
import { getContent } from "@/lib/store";
import type { Agence, PageEditable } from "@/lib/store/types";
import type { Agency } from "@/types";
import "@/styles/pages/agences.css";

/* ════════════════════════════════════════════════════════════════
   NOS AGENCES — la liste

   Les agences ne sont plus figées dans le code : elles viennent du
   contenu éditable. Avec un repli sur `AGENCIES` tant que RIEN n'a été
   saisi, pour que le site livré continue de tourner tel quel avant la
   première connexion du client au back-office.

   ⚠ REPLI SUR LA CONSTANTE : UNIQUEMENT SI LA LISTE EST VIDE.
   Pas « si aucune agence n'est visible ». La nuance est le cœur du
   contrat : fermer toutes ses agences est une décision, et le site doit
   l'appliquer. Réafficher les agences du code à ce moment-là remettrait
   en ligne des adresses et des numéros que le client vient de retirer —
   c'est-à-dire exactement ce qu'il a demandé de ne plus publier. Le
   back-office le lui dit, plutôt que de le contredire en silence.

   ⚠ `revalidate` PLUTÔT QUE `force-static`. Les photos d'agence peuvent
   venir de la médiathèque, dont le bucket est privé : `resoudreMedia()`
   rend alors une URL SIGNÉE qui expire au bout d'une heure
   (`SIGNATURE_TTL`, src/lib/medias.ts). Une page figée une fois pour
   toutes servirait des images mortes dès la deuxième heure. On
   régénère donc largement avant l'échéance ; le back-office, lui,
   appelle `revalidatePath()` pour que toute modification soit visible
   immédiatement.
   ════════════════════════════════════════════════════════════════ */

export const revalidate = 1800;

/* Le défaut reste ici, versionné et relu ; l'écran « Référencement »
   du back-office vient par-dessus quand le client y a écrit quelque
   chose. Voir la note de fin de src/lib/seo.ts. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/agences", {
    title: "Nos agences — La Rochelle et Thouars",
    description:
      "Deux agences, une maison. Chaque équipe connaît le terrain de son secteur — au sens propre — et suit votre projet jusqu'à la remise des clés.",
    alternates: { canonical: "/agences" },
  });
}

/* Une carte sans photo doit rester une carte, pas une icône d'image
   cassée. `src=""` ne serait pas neutre non plus : le navigateur le
   résout en rechargeant la page courante. D'où cet aplat de 130 octets,
   à la couleur « sable » de la palette. */
const SANS_PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='10'%3E%3Crect width='16' height='10' fill='%23E8E3D9'/%3E%3C/svg%3E";

/**
 * Une `Agence` éditable → l'`Agency` qu'attendent les gabarits.
 *
 * ⚠ Cette fonction existe À L'IDENTIQUE dans `./[slug]/page.tsx`. Ce
 * n'est pas un oubli : les deux seuls consommateurs sont ces deux
 * routes, et un module partagé dans `src/lib` serait un fichier de plus
 * pour quinze lignes sans logique métier. Si un troisième appelant
 * apparaît, c'est le moment de l'extraire — pas avant.
 *
 * `lat` / `lng` retombent sur 0 parce que le type public les exige :
 * les gabarits qui s'en servent vraiment (le JSON-LD de la fiche) lisent
 * l'`Agence` d'origine et omettent le bloc quand elles manquent, plutôt
 * que d'annoncer une agence au large du golfe de Guinée.
 */
async function versAgency(a: Agence): Promise<Agency> {
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
    image: (await resoudreMedia(a.image)) ?? SANS_PHOTO,
    cities: a.villes,
    description: a.description,
  };
}

/** Les agences réellement publiées, dans l'ordre voulu par le client. */
async function agencesPubliees(): Promise<Agency[]> {
  const { agences } = await getContent();
  if (agences.length === 0) return AGENCIES;
  return Promise.all(
    agences
      .filter((a) => a.actif)
      .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"))
      .map(versAgency),
  );
}

/** La valeur saisie dans « Pages → Nos agences », ou rien. */
function bloc(pages: PageEditable[], cle: string): string {
  const page = pages.find((p) => p.cle === "agences");
  return page?.blocs.find((b) => b.cle === cle)?.valeur.trim() ?? "";
}

export default async function AgencesPage() {
  const [content, agences] = await Promise.all([getContent(), agencesPubliees()]);

  const titre = bloc(content.pages, "hero.titre") || "Nos agences";
  const chapo = bloc(content.pages, "hero.chapo");
  const lien =
    bloc(content.pages, "hero.lien") ||
    "Votre commune n'est pas dans la liste ? Dites-nous où vous construisez";

  return (
    <main className="page">
      {/* Chaque agence a déjà son `HomeAndConstructionBusiness` sur sa
          fiche. Ici, l'ItemList dit seulement que cette page les indexe —
          c'est ce qui permet à Google de remonter la bonne agence plutôt
          que cette liste sur une requête locale. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            listeSchema(
              titre,
              agences.map((g) => ({ nom: g.name, path: `/agences/${g.id}` })),
            ),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(filAriane([{ nom: "Accueil", path: "/" }, { nom: titre }])),
        }}
      />
      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>{titre}</span>
          </nav>
          <h1>{titre}</h1>
          {/* Chapô laissé vide dans le back-office : on garde la phrase
              d'origine, qui affiche le prix de départ À JOUR. Une version
              figée dans le contenu mentirait au premier changement de
              tarif — c'est exactement ce que dit l'aide du champ. */}
          {chapo ? (
            <p>{chapo}</p>
          ) : (
            <p>
              Deux agences, une maison, le même prix partout : à partir de{" "}
              {fmtPrice(PRICE_FROM)} hors terrain. Chaque équipe connaît le terrain
              de son secteur — au sens propre : les PLU, les lotissements et les
              parcelles compatibles avec une maison de plain-pied.
            </p>
          )}
          <p style={{ marginTop: "var(--s-3)" }}>
            <Link href="/contact" className="c-link">
              {lien} →
            </Link>
          </p>
        </div>
      </section>

      <section style={{ paddingTop: "var(--s-4)" }}>
        <div className="container">
          {agences.length === 0 ? (
            /* Toutes les agences ont été fermées depuis le back-office.
               On ne remet pas d'anciennes adresses en ligne pour combler
               le vide : on renvoie vers le formulaire, qui reste le seul
               point de contact valide. */
            <p style={{ maxWidth: "38em" }}>
              Nos agences sont en cours de réorganisation.{" "}
              <Link href="/contact" className="c-link">
                Écrivez-nous votre projet →
              </Link>
            </p>
          ) : (
            <div className="g-grid">
              {agences.map((g) => (
                <AgencyCard agency={g} key={g.id} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
