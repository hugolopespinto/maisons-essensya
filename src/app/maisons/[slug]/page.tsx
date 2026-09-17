import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LeadForm, { ContactFields } from "@/components/LeadForm";
import ModeleCard from "@/components/ModeleCard";
import { MarkedList } from "@/components/SpecList";
import { HOUSE, PRICE_FROM, REEL } from "@/data/essensya";
import {
  descriptionModele,
  estPubliable,
  facadeDe,
  modeleParSlug,
  modelesAvecVisuels,
  planDe,
  specsModele,
  titreModele,
  voisinsDe,
  vuesDe,
} from "@/data/gamme";
import { srcSet, type Visuel } from "@/data/visuels";
import { fmtPrice, fmtSurface } from "@/lib/format";
import { filAriane, jsonLd, produitModele } from "@/lib/schema";
import { resolveMetadata } from "@/lib/seo";
import "@/styles/pages/modele.css";
import "@/styles/pages/maison.css";
import "@/styles/pages/gamme.css";

/* ════════════════════════════════════════════════════════════════
   LA FICHE D'UN MODÈLE

   Cette route servait « /maisons/2-chambres » et « /maisons/3-chambres »
   — deux déclinaisons inventées pour la maquette, avec leurs surfaces,
   leurs plans cotés et leurs prix. Elle sert désormais les modèles
   réels : /maisons/lisbonne, /maisons/athenes…

   ⚠ LES DEUX ANCIENNES ADRESSES SONT REDIRIGÉES EN 301, pas supprimées.
   Elles figuraient au sitemap, dans le pied de page et dans l'écran
   Référencement : les laisser tomber en 404 perdrait ce qu'elles ont pu
   accumuler et remplirait la Search Console d'erreurs. Voir
   `redirects()` dans next.config.ts.

   ⚠ UNE FICHE SUR ONZE EST INDEXÉE, ET C'EST VOULU.
   Une fiche qui ne montre que des images est du contenu mince, et dix
   d'un coup, bâties sur le même gabarit, sont le scénario que Google
   traite le plus sévèrement. Les onze EXISTENT — le client doit pouvoir
   les regarder et les envoyer — mais seule Ankara, qui porte ses 75 m²
   depuis le 17/09, est indexée et au sitemap. `estPubliable()`
   (src/data/gamme.ts) tient la frontière, et chaque modèle la franchit
   dès que ses caractéristiques arrivent, sans qu'on touche une ligne ici.

   ⚠ CETTE PAGE NE MONTRE PAS DE PRIX EN GRAND TANT QU'ELLE N'A PAS LE
   SIEN. Elle affichait le prix d'appel de la gamme — 78 000 €, celui de
   Pékin — dans le plus gros caractère de la page, sous un H1 qui nomme
   un autre modèle. Le sur-titre « Nos maisons » était tout ce qui
   empêchait de le lire comme le prix du modèle consulté, et il pesait
   six fois moins lourd que le nombre. Un constructeur s'engage sur ce
   qu'il affiche : le repère de prix est passé en corps de texte, avec la
   mention qui nomme Pékin. La grande typographie revient d'elle-même
   pour un modèle qui a son propre `prixDepart`.
   ════════════════════════════════════════════════════════════════ */

/* ⚠ UN DICTIONNAIRE EXHAUSTIF, PAS UN TERNAIRE. Le code écrivait
   `v.type === "exterieur" ? "vue extérieure" : "vue intérieure"`, qui
   range TOUT type inconnu dans « intérieure » — c'est ce qui aurait
   étiqueté les plans « vue intérieure » si `vuesDe()` ne les filtrait
   pas. `Record` force TypeScript à casser le build le jour où un
   quatrième type apparaît, au lieu de le laisser tomber dans la branche
   par défaut. */
const LIBELLE_VUE: Record<Visuel["type"], string> = {
  exterieur: "vue extérieure",
  interieur: "vue intérieure",
  plan: "plan",
};

export const revalidate = 1800;

export async function generateStaticParams() {
  return modelesAvecVisuels().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const m = modeleParSlug(slug);
  if (!m || !facadeDe(m)) return {};

  /* Titre et description viennent de `gamme.ts`, comme le défaut affiché
     au client dans l'écran Référencement. Les deux avaient divergé : le
     back-office promettait « La maison Ankara, en images » là où la page
     servait ses 75 m², sous la promesse écrite que le gris est bien ce
     qui part en ligne. */
  const facade = facadeDe(m);

  return resolveMetadata(`/maisons/${m.slug}`, {
    title: titreModele(m),
    description: descriptionModele(m, fmtPrice(PRICE_FROM)),
    alternates: { canonical: `/maisons/${m.slug}` },
    /* Le client envoie ces adresses par courriel : sans vignette, la
       fiche arrive nue dans la conversation. */
    ...(facade ? { openGraph: { images: [facade.src] } } : {}),
    /* Hors index tant que la fiche n'a pas de quoi être lue. `follow`
       reste vrai : on retire la page de l'index, on ne coupe pas le
       suivi des liens qu'elle porte vers /maisons et /contact. */
    ...(estPubliable(m) ? {} : { robots: { index: false, follow: true } }),
  });
}

export default async function ModelePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const m = modeleParSlug(slug);
  /* Un modèle sans visuel n'a rien à montrer. Plus aucun n'est dans ce
     cas depuis les visuels de Pékin, mais la garde reste : le catalogue
     accueille des modèles avant leurs rendus, c'est sa raison d'être. */
  if (!m || !facadeDe(m)) notFound();

  const vues = vuesDe(m);
  const planVue = planDe(m);
  const facade = facadeDe(m);
  const autres = voisinsDe(m, 3);

  const specs: [string, string][] = [
    m.surface !== undefined ? ["Surface habitable", fmtSurface(m.surface)] : null,
    m.chambres !== undefined ? ["Chambres", String(m.chambres)] : null,
    m.pieces !== undefined ? ["Pièces", String(m.pieces)] : null,
    /* « Oui » / « Non », et non une surface : le client a dit que la
       superficie du garage n'avait pas d'importance. `false` s'affiche
       donc, `undefined` fait disparaître la ligne. */
    m.garage !== undefined ? ["Garage", m.garage ? "Oui" : "Non"] : null,
  ].filter(Boolean) as [string, string][];

  return (
    <main className="page">
      {/* Le `Product` n'était pas émis « sans surface ni prix propres » —
          condition tombée avec les 75 m² d'Ankara. Il s'ajoute donc dès
          que la fiche a quelque chose à déclarer, et uniquement ce
          qu'elle AFFICHE. Toujours sans `offers` : le seul montant
          disponible est celui de la gamme, et il appartient à Pékin. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            filAriane([
              { nom: "Accueil", path: "/" },
              { nom: "Nos modèles", path: "/maisons" },
              { nom: m.nom },
            ]),
          ),
        }}
      />
      {specs.length > 0 && facade && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(produitModele(m, facade.src, `/maisons/${m.slug}`)),
          }}
        />
      )}

      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <Link href="/maisons">Nos modèles</Link>
            <span className="sep">/</span>
            <span>{m.nom}</span>
          </nav>
          <span className="c-label c-label--accent">Modèle</span>
          {/* Le H1 affichait « Ankara » : aucun terme de la requête visée.
              Un seul H1, deux niveaux visuels — l'échelle typographique ne
              bouge pas, les mots arrivent. Le département n'y entre PAS :
              il ferait doublon avec l'accueil et /maisons, et la fiche
              concourt sur la typologie, pas sur la géographie. */}
          <h1>
            <span className="p-head__nom">Maison {m.nom}</span>
            {specs.length > 0 && (
              <span className="p-head__specs">{specsModele(m).join(" · ")}</span>
            )}
          </h1>

          {specs.length > 0 ? (
            <div className="c-plate" style={{ marginTop: "var(--s-3)" }}>
              {specs.map(([k, v]) => (
                <span className="c-plate__spec" key={k}>
                  {k} <strong>{v}</strong>
                </span>
              ))}
            </div>
          ) : (
            /* Aucune caractéristique : on le dit plutôt que de laisser le
               visiteur chercher une surface qui n'est nulle part. */
            /* « Plan coté » promettait deux choses fausses : nous n'avons
               pas de cotes, seulement des axonométries, et Athènes a son
               plan sans avoir une seule caractéristique. */
            <p className="u-muted u-measure" style={{ marginTop: "var(--s-3)" }}>
              Les caractéristiques de ce modèle — surface, nombre de chambres et
              de pièces — sont en cours de publication.
            </p>
          )}

          {m.prixDepart !== undefined ? (
            <p className="c-price-xl" style={{ marginTop: "var(--s-4)" }}>
              <span className="from">Modèle {m.nom}, à partir de</span>
              {fmtPrice(m.prixDepart)}
              <small>Maison seule, hors terrain, hors adaptation.</small>
            </p>
          ) : (
            /* Le prix ne disparaît pas — un site dont l'argument est le
               prix ne peut pas se taire dessus — il change de registre :
               il cesse d'annoncer un montant pour dire où il commence et
               à qui il appartient. `REEL.mentionPrix` nomme Pékin. */
            <div style={{ marginTop: "var(--s-4)" }}>
              <span className="c-label">Le prix</span>
              <p className="u-muted u-measure" style={{ marginTop: "var(--s-2)" }}>
                Le prix de ce modèle est en cours de publication. La gamme
                commence à {fmtPrice(PRICE_FROM)} — {REEL.mentionPrix} Le
                chiffrage de votre maison est établi selon le terrain et la
                commune.
              </p>
            </div>
          )}

          {/* `#prix` et `#dossier` existaient depuis toujours sans qu'un
              seul lien de la page y mène. « Le plan ↓ » répond à la
              remarque du client — c'est ce que les visiteurs regardent en
              premier — sans ouvrir la fiche sur un dessin technique. */}
          <p className="p-head__ancres">
            {planVue && (
              <a href="#plan" className="c-link">
                Le plan ↓
              </a>
            )}
            <a href="#prix" className="c-link">
              Ce que le prix comprend ↓
            </a>
            <a href="#dossier" className="c-link">
              Recevoir le dossier ↓
            </a>
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: "var(--s-5)" }}>
        <div className="container">
          <div className="g-fiche__galerie">
            {vues.map((v, i) => (
              <figure className="g-fiche__vue" key={v.cle}>
                <picture>
                  <source
                    type="image/avif"
                    srcSet={srcSet(v, "avif")}
                    sizes={i === 0 ? "100vw" : "(max-width:700px) 100vw, 50vw"}
                  />
                  <source
                    type="image/webp"
                    srcSet={srcSet(v, "webp")}
                    sizes={i === 0 ? "100vw" : "(max-width:700px) 100vw, 50vw"}
                  />
                  <img
                    src={v.src}
                    width={v.largeur}
                    height={v.hauteur}
                    alt={`Maison Essensya modèle ${m.nom} — ${
                      LIBELLE_VUE[v.type]
                    }`}
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : undefined}
                  />
                </picture>
              </figure>
            ))}
          </div>
          {/* Les rendus sont des images de synthèse, et le dire ici évite
              qu'un visiteur les prenne pour des photos de chantier. La
              même exigence tient la page Réalisations vide. */}
          <p
            className="u-muted"
            style={{ marginTop: "var(--s-3)", fontSize: "var(--fs-small)" }}
          >
            Vues d&apos;architecte non contractuelles.
          </p>
        </div>
      </section>

      {/* Le plan APRÈS la galerie, pas avant : la façade vend, le plan
          prouve — et c'est elle qui doit rester la plus grosse image
          chargée. Le client doute lui-même de ses plans (« je ne pense
          pas avoir une belle image de plan à mettre en avant ») ; ouvrir
          la fiche sur une axonométrie plate desservirait le modèle. Sa
          remarque — c'est ce qu'on regarde en premier — est servie par
          l'ancre « Le plan ↓ », visible dès le premier écran.

          Neuf modèles sur onze n'ont pas de plan : la section n'est alors
          pas rendue du tout, ni titre, ni cadre, ni ancre. C'est pour ça
          que toute mention de plan a été retirée ailleurs sur la page. */}
      {planVue && (
        <section className="g-plan mp-anchor" id="plan">
          <div className="container">
            <div className="c-section-head">
              <span className="c-label">Le plan</span>
              <h2>L&apos;organisation du {m.nom}</h2>
            </div>
            <figure className="g-plan__figure">
              <picture>
                <source
                  type="image/avif"
                  srcSet={srcSet(planVue, "avif")}
                  sizes="(max-width:900px) 100vw, 900px"
                />
                <source
                  type="image/webp"
                  srcSet={srcSet(planVue, "webp")}
                  sizes="(max-width:900px) 100vw, 900px"
                />
                <img
                  src={planVue.src}
                  width={planVue.largeur}
                  height={planVue.hauteur}
                  alt={`Plan axonométrique de la maison Essensya modèle ${m.nom}`}
                  loading="lazy"
                />
              </picture>
              <figcaption className="u-muted">
                {specs.length > 0 && `${specsModele(m).join(", ")}. `}
                Axonométrie non contractuelle : elle montre l&apos;organisation
                des pièces, pas leurs cotes.{" "}
                <a href="#dossier" className="c-link">
                  Ce plan sur votre terrain ? Demandez l&apos;étude →
                </a>
              </figcaption>
            </figure>
          </div>
        </section>
      )}

      <section className="m-price mp-anchor" id="prix">
        <div className="container">
          <div className="c-section-head">
            <span className="c-label">Le prix</span>
            <h2>Ce qu&apos;il comprend, ce qu&apos;il ne comprend pas</h2>
          </div>
          <div className="m-price__grid">
            <div className="mp-price__col">
              <h3>Compris dans le prix</h3>
              <MarkedList items={HOUSE.included} variant="in" />
            </div>
            <div className="mp-price__col mp-price__col--out">
              <h3>Non compris</h3>
              <MarkedList items={HOUSE.excluded} variant="out" />
            </div>
          </div>
        </div>
      </section>

      <section className="s-cta mp-anchor" id="dossier">
        <div className="container">
          <div className="s-cta__grid">
            <div>
              <span className="c-label">Le dossier</span>
              <h2>Le détail du modèle {m.nom}</h2>
              {/* Le mot « plan » est sorti d'ici : on ne promet que ce
                  qu'on montre, et neuf modèles sur onze n'en ont pas. */}
              <p>
                Le descriptif détaillé des prestations, la liste de ce qui est
                compris et de ce qui ne l&apos;est pas, et le chiffrage pour
                votre commune.
              </p>
            </div>
            <LeadForm
              originKey="model"
              gtmEvent="lead_model_request"
              dark
              submitLabel="Recevoir le dossier"
              successMessage="Merci — le dossier et le chiffrage vous arrivent rapidement."
              ctx={{ adContent: `Modèle ${m.nom}` }}
            >
              <ContactFields prefix={`md-${m.slug}`} />
              {/* Le modèle consulté part avec la demande : c'est
                  l'information la plus utile à l'agence, et elle est
                  vraie par construction. */}
              <input type="hidden" name="reason" value={`Modèle ${m.nom}`} />
              <div className="c-field">
                <label htmlFor={`md-${m.slug}-zone`}>Commune ou code postal</label>
                <input
                  type="text"
                  id={`md-${m.slug}-zone`}
                  name="zone"
                  placeholder="Ex. 40000"
                />
              </div>
            </LeadForm>
          </div>
        </div>
      </section>

      {autres.length > 0 && (
        <section className="g-gamme">
          <div className="container">
            <div className="c-section-head">
              <span className="c-label">La gamme</span>
              <h2>Les autres modèles</h2>
            </div>
            <div className="g-gamme__grid">
              {autres.map((x) => (
                <ModeleCard modele={x} key={x.slug} />
              ))}
            </div>
            <p style={{ marginTop: "var(--s-4)" }}>
              <Link href="/maisons" className="c-link">
                Voir toute la gamme →
              </Link>
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
