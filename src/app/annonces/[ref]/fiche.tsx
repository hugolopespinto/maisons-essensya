import type { Metadata } from "next";
import { ViewTransition } from "react";
import Link from "next/link";
import FilAriane from "@/components/FilAriane";
import { AnnonceAside, AnnonceStickyForm } from "@/components/AnnonceCard";
import { MarkedList, SpecList } from "@/components/SpecList";
import { AnnonceMedia } from "@/components/Substitut";
import { Picto } from "@/components/icons";
import { AGENCIES, HOUSE, PRICE_FROM, REEL, versionBySlug } from "@/data/essensya";
import {
  agencyUrl,
  annonceTitle,
  annonceUrl,
  fmtPrice,
  fmtSurface,
  houseUrl,
  housePart,
} from "@/lib/format";
import { annonceSchema, jsonLd } from "@/lib/schema";
import { couper, titreCourt } from "@/lib/seo";
import { getAnnonceOverride } from "@/lib/vitahome/annonces";
import type { Annonce } from "@/types";
import "@/styles/pages/annonce.css";

/* ════════════════════════════════════════════════════════════════
   LA FICHE D'UNE ANNONCE — partagée par deux routes

     /annonces/[ref]            la parcelle, avec sa maison la moins chère
     /annonces/[ref]/[version]  la même parcelle avec la maison à
                                N chambres (« 3-chambres »)

   La seconde existe parce qu'une parcelle se vend avec plusieurs
   maisons (voir src/lib/offres.ts). Le listing filtré par chambres
   montre la version cherchée ; sans cette route, sa carte ouvrait une
   fiche qui en montrait une autre — prix, plan, et référence envoyée au
   commercial compris.

   `a` est ici l'annonce DÉJÀ projetée sur la version à montrer :
   identifiant, offres et surcharges du back-office restent ceux de la
   parcelle, seuls les chiffres de la maison changent.
   ════════════════════════════════════════════════════════════════ */

/** Un numéro du flux arrive formaté « 05 46 00 00 00 » : href tel: à nettoyer. */
const tel = (p: string) => `tel:${p.replace(/[^+\d]/g, "")}`;

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

/** Une surcharge vide ou blanche ne surcharge rien. */
const trim = (v: string | undefined): string | undefined => {
  const s = v?.trim();
  return s ? s : undefined;
};

/** Les métadonnées de la fiche. La canonical est TOUJOURS la fiche de la
 *  parcelle : une version n'est pas une page de plus à indexer, c'est la
 *  même annonce vue sous une autre maison. */
export async function metadataFiche(a: Annonce): Promise<Metadata> {
  /* Le back-office peut surcharger le titre et le SEO de cette fiche.
     Jamais son prix ni ses surfaces : ceux-là se corrigent dans Vitahome. */
  const o = await getAnnonceOverride(a);
  const title = trim(o?.titre) ?? annonceTitle(a);
  const seoTitle = trim(o?.seo?.title);
  const seoDesc = trim(o?.seo?.description) ?? trim(o?.accroche);
  return {
    /* Le prix n'entre dans le titre que s'il y tient. Il était collé
       systématiquement, et Google coupait la moitié des fiches — le
       compteur du back-office les affichait en rouge. */
    title: seoTitle ?? titreCourt(title, fmtPrice(a.price)),
    description: couper(seoDesc ?? a.description),
    alternates: { canonical: annonceUrl(a) },
    /* Pas d'image sociale inventée : 9 annonces sur 10 n'en ont aucune. */
    openGraph: { title: seoTitle ?? title, ...(a.image ? { images: [a.image] } : {}) },
  };
}

export async function FicheAnnonce({ a }: { a: Annonce }) {
  /* Enrichissement éditorial : le client peut forcer le titre et poser une
     accroche devant la description. Tout le reste vient du flux. */
  const o = await getAnnonceOverride(a);

  const isTM = a.type === "terrain-maison";
  const title = trim(o?.titre) ?? annonceTitle(a);
  const accroche = trim(o?.accroche);
  /* La déclinaison réellement portée par l'annonce — jamais un autre produit. */
  const version = a.versionSlug ? versionBySlug(a.versionSlug) : null;
  const agencyPage = a.agency.slug ? (AGENCIES.find((g) => g.id === a.agency.slug) ?? null) : null;
  const agencyHref = agencyPage ? agencyUrl(agencyPage) : null;
  const phone = a.contact?.phone ?? a.agency.phone;
  const part = housePart(a);
  const plan = a.planImage ?? version?.planImage ?? null;
  /* Une annonce T+M dont le slug Vitahome est inconnu ne devient pas
     un autre produit : on retombe sur ce que le flux dit de la maison. */
  const houseLabel = version?.label ?? (a.bedrooms ? `${a.bedrooms} chambres` : "plain-pied");
  const houseMeta = [
    fmtSurface(a.houseSurface ?? version?.surface ?? null),
    a.rooms ? `${a.rooms} pièces` : null,
    a.garageArea ? `garage ${fmtSurface(a.garageArea)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  /* « Le terrain » figure dans les exclusions de la maison seule : sur une
     annonce terrain + maison, il est justement compris dans le prix. */
  const horsPrix = HOUSE.excluded.filter((x) => x.toLowerCase() !== "le terrain");
  const resteACharge = isTM ? horsPrix : ["La construction de la maison", ...horsPrix];

  /* Le plan a son propre bloc plus bas : il ne fait pas nombre en galerie.
     S'il ne reste aucune photo, le tracé coté occupe toute la largeur — on
     ne bouche plus les trous avec des paysages d'Unsplash. */
  /* Ni le plan de cette maison, ni celui des AUTRES versions de la
     parcelle : la galerie est commune à toutes, et le plan d'une 2
     chambres glissé à côté d'une fiche 3 chambres se lit comme le sien. */
  const plans = new Set([a.planImage, ...a.offres.map((o) => o.planImage)].filter(Boolean));
  const photos = a.gallery.filter((src) => !plans.has(src));
  /* Le visuel principal est retiré par son adresse, pas par sa place :
     quand c'est un plan, il n'est plus dans `photos`, et `slice(1)`
     aurait écarté la première vraie photo à sa place. */
  const side = photos.filter((src) => src !== a.image).slice(0, 2);

  const secteur = [a.city && `${a.city}${a.zip ? ` (${a.zip})` : ""}`, a.dept]
    .filter(Boolean)
    .join(" — ");

  return (
    <main className="page">
      {/* Le prix, les surfaces et la commune, dans la langue de Google.
          L'offre n'est émise que si le prix existe vraiment : le flux en
          livre à `null`, et annoncer une offre sans montant vaut un
          avertissement en Search Console. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(annonceSchema(a, title)) }}
      />
      <section className="a-head">
        <div className="container">
          <FilAriane
            items={[
              { nom: "Accueil", path: "/" },
              { nom: "Terrains & opportunités", path: "/annonces" },
              { nom: a.city },
            ]}
          />
          <div className="a-head__top">
            <div>
              <span className={`c-tag${isTM ? "" : " c-tag--terrain"}`}>
                {isTM ? "Terrain + maison" : "Terrain"}
              </span>
              {a.highlighted && <span className="c-offer">Sélection agence</span>}
              <h1>{title}</h1>
            </div>
            {/* Le prix est le plus gros chiffre de la page, devant le titre. */}
            <div className="a-head__price">
              {a.price !== null ? (
                <span className="c-price-xl">
                  <span className="from">À partir de</span>
                  {fmtPrice(a.price)}
                  <small>
                    {isTM ? "terrain + maison" : "terrain seul"} · réf. {a.ref}
                  </small>
                </span>
              ) : (
                <span className="a-head__ask">
                  Prix sur demande
                  <small>réf. {a.ref}</small>
                </span>
              )}
            </div>
          </div>
          {/* Quatre chiffres au plus, et aucun qui répète le titre ou le prix. */}
          <div className="c-pictos">
            {isTM ? (
              <>
                {a.houseSurface ? (
                  <Picto icon="surface" value={fmtSurface(a.houseSurface)} label="Maison" />
                ) : null}
                {a.bedrooms ? <Picto icon="bed" value={a.bedrooms} label="Chambres" /> : null}
                {a.landSurface ? (
                  <Picto icon="land" value={fmtSurface(a.landSurface)} label="Terrain" />
                ) : null}
                {a.garageArea ? (
                  <Picto icon="garage" value={fmtSurface(a.garageArea)} label="Garage" />
                ) : null}
              </>
            ) : (
              <>
                {a.landSurface ? (
                  <Picto icon="land" value={fmtSurface(a.landSurface)} label="Terrain" />
                ) : null}
                {a.dept ? <Picto icon="loc" value={a.dept} label="Département" /> : null}
              </>
            )}
          </div>
        </div>
      </section>

      <section className="a-gallery">
        <div className={`container${side.length ? "" : " is-solo"}`}>
          {/* Même `name` que la vignette du listing — voir AnnonceCard. */}
          <ViewTransition name={`annonce-${a.id}`} share="morph" default="none">
            <div className="c-reveal-img">
              <AnnonceMedia annonce={a} eager />
            </div>
          </ViewTransition>
          {side.length > 0 && (
            <div className="a-gallery__side">
              {side.map((src) => (
                <div className="c-reveal-img" key={src}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${title} — visuel complémentaire`} loading="lazy" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="a-body">
        <div className="container">
          <div className="a-content">
            <h2>L&apos;opportunité</h2>
            {/* L'accroche du back-office passe DEVANT la description du flux :
                c'est le seul texte que le client écrit lui-même sur la fiche. */}
            {accroche ? (
              <p>
                <strong>{accroche}</strong>
              </p>
            ) : null}
            <p>
              {a.description ||
                `${title}. Votre agence vous communique le détail de la parcelle et l'étude d'implantation de votre maison.`}
            </p>

            <h3 className="a-sub">Le terrain</h3>
            <SpecList
              rows={[
                ["Surface", fmtSurface(a.landSurface)],
                ["Viabilisation", a.servicingLong ?? a.servicing ?? ""],
                [
                  "Configuration",
                  [a.landConfiguration, a.landType].filter(Boolean).join(" · "),
                ],
                ["État", a.landState ?? ""],
                ["Lotissement", a.subdivision ?? ""],
                ["Numéro de lot", a.lotNumber ?? ""],
                ["Secteur", secteur],
              ]}
            />

            <h3 className="a-sub">À propos du prix</h3>
            <SpecList
              rows={[
                [isTM ? "Terrain + maison" : "Terrain", fmtPrice(a.price)],
                ["Dont terrain", a.landPrice !== null ? fmtPrice(a.landPrice) : ""],
                ["Dont maison", part !== null ? fmtPrice(part) : ""],
              ]}
            />
            {/* Un prix bas ne tient que si l'on dit aussi ce qu'il ne couvre pas. */}
            <p className="u-muted u-measure a-note">
              {isTM
                ? "Reste à votre charge, en plus du prix affiché :"
                : "Prix du terrain seul. Restent à votre charge, en plus du prix affiché :"}
            </p>
            <MarkedList items={resteACharge} variant="out" />

            {isTM ? (
              <Link
                className={`a-house${plan ? "" : " a-house--noplan"}`}
                href={houseUrl()}
              >
                {plan ? (
                  <div className="a-house__media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={plan}
                      alt="Plan du rez-de-chaussée de la maison sur ce terrain"
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <div className="a-house__body">
                  <span className="c-label c-label--accent">La maison sur ce terrain</span>
                  <div className="a-house__name">{houseLabel}</div>
                  {houseMeta ? <div className="a-house__meta">{houseMeta}</div> : null}
                  <p className="a-house__text">
                    {version
                      ? version.difference
                      : "Votre agence vous confirme le modèle retenu sur cette parcelle et le détail de ce que le prix comprend."}
                  </p>
                  <span className="c-link">Voir nos modèles →</span>
                </div>
              </Link>
            ) : (
              <div className="a-next">
                <span className="c-label c-label--accent">
                  Quelle maison sur ce terrain&nbsp;?
                </span>
                <p className="u-measure">
                  Nos modèles sont optimisés jusqu&apos;au dernier mètre carré, à
                  partir de {fmtPrice(PRICE_FROM)} — {REEL.mentionPrix} Votre agence
                  vérifie gratuitement lesquels s&apos;implantent sur cette parcelle.
                </p>
                <Link href={houseUrl()} className="c-link">
                  Voir nos modèles →
                </Link>
              </div>
            )}

            <h3 className="a-sub">Votre interlocuteur</h3>
            <SpecList
              rows={[
                ["Conseiller", a.contact?.name ?? ""],
                /* Aucun numéro n'était cliquable : sur mobile, c'est le
                   chemin le plus court entre l'annonce et l'agence. */
                ["Téléphone", phone ? <a href={tel(phone)}>{phone}</a> : ""],
                [
                  "Agence",
                  agencyHref && a.agency.name ? (
                    <Link href={agencyHref}>{a.agency.name}</Link>
                  ) : (
                    (a.agency.name ?? "")
                  ),
                ],
                ["Adresse", a.agency.address],
              ]}
            />

            {/* Mentions légales de l'annonce : fournies par le flux, elles
                engagent le constructeur et n'étaient jamais affichées. */}
            {(a.mention || a.updatedAt) && (
              <p className="a-mention">
                {a.updatedAt && <>Annonce mise à jour le {fmtDate(a.updatedAt)}. </>}
                {a.mention}
              </p>
            )}
          </div>

          <aside className="a-aside">
            <AnnonceAside annonce={a} agencyHref={agencyHref} prefix="af" />
          </aside>
        </div>
      </section>

      {/* Sous 900 px, l'aside sort du champ de vision : même formulaire,
          rejoué dans un tiroir depuis une barre fixe. */}
      <AnnonceStickyForm annonce={a} agencyHref={agencyHref} />
    </main>
  );
}
