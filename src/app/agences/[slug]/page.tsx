import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FilAriane from "@/components/FilAriane";
import AgencyCard, { telHref } from "@/components/AgencyCard";
import AnnonceCard from "@/components/AnnonceCard";
import LeadForm, { ContactFields } from "@/components/LeadForm";
import SpecList from "@/components/SpecList";
import { PRICE_FROM, REEL } from "@/data/essensya";
import {
  agencesPubliees,
  descriptionAgence,
  SANS_PHOTO,
  type AgenceAffichee,
} from "@/lib/agences";
import { agencyUrl, dept, fmtPrice } from "@/lib/format";
import { couper, titreCourt } from "@/lib/seo";
import { getAnnonces } from "@/lib/vitahome/annonces";
import { SITE_URL } from "@/lib/site-url";
import "@/styles/pages/agences.css";
import "@/styles/pages/annonce.css"; // .a-aside — carte formulaire partagée

/* Même repli que le metadataBase du layout : canonical et JSON-LD
   doivent désigner la même origine. */
const SITE = SITE_URL;

/* ════════════════════════════════════════════════════════════════
   FICHE D'AGENCE

   La fiche vient désormais du contenu éditable, avec repli sur
   `AGENCIES` tant que rien n'a été saisi (voir la note de ../page.tsx,
   qui porte le raisonnement complet — repli sur liste VIDE seulement, et
   `revalidate` plutôt que `force-static` à cause des URL signées de la
   médiathèque).

   ⚠ UNE AGENCE FERMÉE REND UN 404, pas une fiche « fermée ». C'est le
   sens de `actif: false` : la page sort du site. Elle n'est pas
   supprimée pour autant — le back-office la garde, et la rouvrir la
   remet en ligne à la même adresse, avec ses liens entrants intacts.
   ════════════════════════════════════════════════════════════════ */

export const revalidate = 1800;

/* Les agences réelles au moment du build. Une agence ouverte plus tard
   n'y est pas : `dynamicParams` (actif par défaut) la rend à la
   première visite, et le back-office appelle `revalidatePath()`. */
export async function generateStaticParams() {
  const agences = await agencesPubliees();
  return agences.map((g) => ({ slug: g.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = (await agencesPubliees()).find((a) => a.id === slug);
  if (!g) return {};

  return {
    title: titreCourt(g.name, g.zone),
    /* ⚠ `g.description` EST VIDE SUR LES CINQ AGENCES. Le champ est
       facultatif dans le back-office et le client ne l'a pas rempli :
       les cinq fiches sortaient avec `<meta name="description"
       content="">`, ce qui est pire que rien — Google écrit alors la
       sienne à partir de n'importe quel bout de page. Le gabarit, lui,
       savait déjà se passer du texte (voir plus bas) ; la métadonnée,
       non. Le repli est bâti sur ce qu'on sait vraiment de l'agence. */
    description: couper(g.description.trim() || descriptionAgence(g)),
    alternates: { canonical: agencyUrl(g) },
    openGraph: {
      title: `${g.name} — Maisons Essensya`,
      /* Pas d'aperçu de partage plutôt qu'un aplat gris : LinkedIn et
         les messageries afficheraient un rectangle vide. */
      ...(g.image === SANS_PHOTO ? {} : { images: [g.image] }),
    },
  };
}

/* ════ SEO LOCAL ════
   « constructeur maison Mont-de-Marsan » est la première requête du métier :
   la fiche agence doit être lisible par un moteur comme un établissement,
   adresse, téléphone et horaires compris. */

const DAYS_FR = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const DAYS_EN = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** « Lun – Sam · 9h–12h / 14h–18h30 » → créneaux Schema.org. */
function openingHours(hours: string) {
  const d = hours
    .toLowerCase()
    .match(/(lun|mar|mer|jeu|ven|sam|dim)[^a-z]*[–-][^a-z]*(lun|mar|mer|jeu|ven|sam|dim)/);
  const dayOfWeek = d
    ? DAYS_EN.slice(DAYS_FR.indexOf(d[1]), DAYS_FR.indexOf(d[2]) + 1)
    : DAYS_EN.slice(0, 6);
  const slots = [...hours.matchAll(/(\d{1,2})h(\d{2})?\s*[–-]\s*(\d{1,2})h(\d{2})?/g)];
  return slots.map(([, h1, m1, h2, m2]) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek,
    opens: `${h1.padStart(2, "0")}:${m1 ?? "00"}`,
    closes: `${h2.padStart(2, "0")}:${m2 ?? "00"}`,
  }));
}

/** « 12 avenue …, 40000 Mont-de-Marsan » → adresse postale structurée. */
function postalAddress(address: string) {
  const [street = address, cityLine = ""] = address.split(/,\s*/);
  return {
    "@type": "PostalAddress",
    streetAddress: street,
    postalCode: cityLine.match(/\d{5}/)?.[0] ?? "",
    addressLocality: cityLine.replace(/\d{5}/, "").trim(),
    addressCountry: "FR",
  };
}

/* Les champs vides ne sont pas déclarés du tout : un `telephone: ""` ou
   des horaires absents sont des données FAUSSES pour un moteur, là où
   une propriété manquante est simplement une propriété manquante. Le
   client peut enregistrer une agence incomplète — il ne doit pas pour
   autant publier une fiche d'établissement erronée. */
function businessJsonLd(g: AgenceAffichee) {
  const horaires = g.hours ? openingHours(g.hours) : [];
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    "@id": `${SITE}${agencyUrl(g)}`,
    name: `Maisons Essensya — ${g.name}`,
    description: g.description,
    url: `${SITE}${agencyUrl(g)}`,
    ...(g.image && g.image !== SANS_PHOTO ? { image: g.image } : {}),
    ...(g.phone ? { telephone: g.phone } : {}),
    ...(g.email ? { email: g.email } : {}),
    ...(g.address ? { address: postalAddress(g.address) } : {}),
    ...(g.geo
      ? { geo: { "@type": "GeoCoordinates", latitude: g.geo.lat, longitude: g.geo.lng } }
      : {}),
    ...(horaires.length ? { openingHoursSpecification: horaires } : {}),
    ...(g.cities.length
      ? { areaServed: g.cities.map((city) => ({ "@type": "City", name: city })) }
      : {}),
    priceRange: `À partir de ${fmtPrice(PRICE_FROM)}`,
    makesOffer: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: PRICE_FROM,
      itemOffered: { "@type": "Product", name: "Maisons Essensya" },
    },
  };
}

/* Le consentement RGPD n'est plus posé page par page : il vit dans
   <LeadForm>, qui le rend sur les huit formulaires du site. */

/** Comparaison de communes insensible aux accents, tirets et apostrophes.
    NFD sépare les diacritiques ; le filtre a-z les emporte avec le reste. */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");

export default async function AgencyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const publiees = await agencesPubliees();
  const g = publiees.find((a) => a.id === slug);
  /* Inconnue OU fermée : la distinction n'intéresse personne côté
     visiteur, et un 404 franc vaut mieux qu'une fiche fantôme. */
  if (!g) notFound();

  const all = await getAnnonces();

  /* Le flux ne porte aujourd'hui qu'une agence (« agence-demo-1 ») : un
     filtre strict viderait la grille des autres fiches. On retombe donc
     sur le secteur — communes couvertes, puis département de l'agence —
     plutôt que d'afficher une page morte. */
  const cities = new Set(g.cities.map(norm));
  const agencyDept = g.address.match(/\b(\d{2})\d{3}\b/)?.[1] ?? "";
  const exact = all.filter((a) => a.agency.slug === g.id);
  const local = all.filter(
    (a) => cities.has(norm(a.city)) || (!!agencyDept && dept(a) === agencyDept),
  );
  const annonces = (exact.length ? exact : local).slice(0, 3);

  const other = publiees.filter((x) => x.id !== g.id);

  /* Décoratif tant qu'aucune photo n'a été choisie : décrire un aplat de
     couleur n'apporte rien à un lecteur d'écran, et l'annoncer comme
     « l'agence de … » serait faux. */
  const altPhoto =
    g.image === SANS_PHOTO ? "" : `L'agence Essensya de ${g.zone || g.name}`;

  return (
    <main className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(businessJsonLd(g)).replace(/</g, "\\u003c"),
        }}
      />

      <section className="g-hero">
        <div className="g-hero__bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={g.image} alt={altPhoto} />
        </div>
        <div className="container">
          <FilAriane
            items={[
              { nom: "Accueil", path: "/" },
              { nom: "Nos agences", path: "/agences" },
              { nom: g.zone || g.name },
            ]}
          />
          {g.zone ? (
            <span className="c-label" style={{ color: "var(--sable)" }}>
              {g.zone}
            </span>
          ) : null}
          <h1>{g.name}</h1>
        </div>
      </section>

      <section className="g-body">
        <div className="container">
          <div>
            <h2 style={{ fontSize: "clamp(1.4rem,2.6vw,2rem)" }} data-reveal>
              Votre interlocuteur local
            </h2>
            {g.description ? (
              <p
                className="u-muted"
                style={{ marginTop: "var(--s-2)", maxWidth: "38em" }}
                data-reveal
              >
                {g.description}
              </p>
            ) : null}

            {/* Le prix est le même dans toutes les agences : autant le dire
                ici plutôt que de renvoyer le visiteur le chercher. */}
            <div
              className="c-price-xl"
              style={{ fontSize: "clamp(2.2rem,5.5vw,3.4rem)", marginTop: "var(--s-4)" }}
              data-reveal
            >
              <span className="from">Nos maisons, à partir de</span>
              {fmtPrice(PRICE_FROM)}
              <small>
                {REEL.mentionPrix}{" "}
                <Link href="/maisons" style={{ color: "var(--accent)" }}>
                  voir ce qui est compris
                </Link>
              </small>
            </div>

            {/* Une ligne par information RENSEIGNÉE : un « Téléphone — »
                suivi du vide ferait douter de tout le reste de la fiche.
                `SpecList` écarte lui-même les valeurs vides — d'où la
                chaîne vide plutôt qu'un lien sur rien. */}
            <SpecList
              rows={[
                ["Adresse", g.address],
                [
                  "Téléphone",
                  g.phone ? <a key="tel" href={telHref(g.phone)}>{g.phone}</a> : "",
                ],
                [
                  "E-mail",
                  g.email ? <a key="mail" href={`mailto:${g.email}`}>{g.email}</a> : "",
                ],
                ["Horaires", g.hours],
              ]}
            />

            {g.cities.length > 0 ? (
              <div data-reveal>
                <span
                  className="c-label c-label--accent"
                  style={{ display: "block", margin: "var(--s-4) 0 0" }}
                >
                  Communes couvertes
                </span>
                <div className="g-cities">
                  {g.cities.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="a-aside">
            <div className="a-aside__card">
              <h3>Contacter l&apos;agence</h3>
              <p>
                Un projet dans le secteur {g.zone || g.name} ? Réponse sous 48 h
                {g.phone ? (
                  <>
                    {" "}
                    — ou appelez directement le{" "}
                    <a href={telHref(g.phone)} style={{ color: "var(--accent)" }}>
                      {g.phone}
                    </a>
                  </>
                ) : null}
                .
              </p>
              <LeadForm
                originKey="agence"
                gtmEvent="lead_agency_request"
                dark
                submitLabel="Être recontacté"
                successMessage={`Merci — ${g.name} vous recontacte sous 48 h.`}
                ctx={{ adContent: `Contact agence — ${g.name}` }}
              >
                <ContactFields prefix="gf" />
              </LeadForm>
            </div>
          </aside>
        </div>
      </section>

      {annonces.length > 0 && (
        <section className="g-annonces">
          <div className="container">
            <div className="c-section-head" data-reveal>
              <span className="c-label c-label--accent">
                {exact.length ? "Suivis par cette agence" : "Dans le secteur"}
              </span>
              <h2>Des terrains pour y poser la maison</h2>
            </div>
            <div className="m-opps__grid">
              {annonces.map((a) => (
                <AnnonceCard annonce={a} key={a.id} />
              ))}
            </div>
            <div style={{ marginTop: "var(--s-4)" }} data-reveal>
              <Link href="/annonces" className="c-link">
                Voir tous les terrains →
              </Link>
            </div>
          </div>
        </section>
      )}

      {other.length > 0 && (
        <section style={{ padding: "var(--s-6) 0 var(--s-7)" }}>
          <div className="container">
            <div className="c-section-head" data-reveal>
              <span className="c-label c-label--accent">
                {other.length > 1 ? "Les autres agences" : "L’autre agence"}
              </span>
              <h2>Vous construisez ailleurs ?</h2>
            </div>
            <div className="g-grid" style={{ paddingBottom: 0 }}>
              {other.map((o) => (
                <AgencyCard agency={o} key={o.id} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
