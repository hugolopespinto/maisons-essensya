import Link from "next/link";
import CookiePrefsLink from "@/components/CookiePrefsLink";

/* ⚠ CETTE LISTE ÉTAIT ÉCRITE EN DUR, et elle était déjà fausse : elle
   annonçait les Deux-Sèvres et le Maine-et-Loire, absents du flux, et
   pointait vers /annonces?dept=NN — une seule et même URL pour tout le
   stock, donc aucune page à référencer. « maison + terrain <département> »
   est pourtant la requête qui convertit sur ce métier.

   Les zones viennent maintenant du stock réel (`departementsPubliables()`),
   calculées par le layout et passées en `zones`. Un département qui se
   vide disparaît du pied de page au lieu d'y laisser un lien mort. */

/** Un lien de zone : libellé prêt à afficher, chemin déjà calculé. */
export interface LienZone {
  href: string;
  label: string;
}

/** Une colonne du pied de page, déjà nettoyée par le layout racine. */
export interface ColonneChrome {
  titre: string;
  liens: { label: string; href: string }[];
}

/* Colonnes d'origine. Comme pour l'en-tête, elles restent le REPLI des
   colonnes éditables : rien de saisi dans /admin/menus, ou tout effacé,
   et le pied de page garde exactement ces quatre colonnes. */
/* ⚠ CE PIED DE PAGE SUIT LE BRIEF DU 22/09 AU MOT PRÈS, Y COMPRIS POUR
   DES PAGES QUI N'ONT PAS ENCORE LEUR CONTENU. C'est une demande
   explicite du client, et elle est tenable parce que ces pages EXISTENT :
   elles répondent 200, expliquent qu'elles arrivent et renvoient vers
   l'information équivalente (voir `EnPreparation.tsx`). Aucun de ces
   liens ne mène à une 404.

   Ce qu'il ne faut pas faire à la place, et qui a été écarté :
     · pointer vers des URLs inexistantes — le pied de page est sur les
       quarante-quatre pages du site, cela ferait autant de chemins vers
       des 404, offerts à Google au passage ;
     · afficher les libellés sans lien — le pied ne ressemblerait plus au
       brief, et du texte gris non cliquable au milieu de liens est un
       défaut d'interface.

   Les pages en préparation sont en `noindex` et hors du sitemap : elles
   sont atteignables par un visiteur, invisibles pour Google, et elles
   basculeront sans changer d'URL le jour où leur contenu arrivera. */
const colonnesDefaut = (agences: LienZone[]): ColonneChrome[] => [
  {
    /* « Nos Maisons », avec la majuscule du brief. */
    titre: "Nos Maisons",
    /* ⚠ LE CHEMIN EST /plans-de-maison ET NON /maisons/N-chambres,
       parce que ces deux-là existaient déjà : `/maisons/2-chambres` et
       `/maisons/3-chambres` étaient les anciennes déclinaisons du
       mono-produit, redirigées en 308 vers /maisons (next.config.ts).
       Les reprendre enverrait leur historique de référencement vers des
       pages encore vides. Elles pourront être réclamées plus tard, quand
       ces pages auront du contenu — ce sera une décision SEO à prendre,
       pas un effet de bord.

       Le brief remplace les noms de modèles par un découpage selon le
       nombre de chambres. ⚠ La donnée manque encore : sur les onze
       modèles de `gamme.ts`, seul Ankara a son nombre de chambres. Les
       quatre pages existent et le disent ; elles se rempliront quand le
       tableau des caractéristiques sera livré. */
    liens: [
      { href: "/plans-de-maison/1-chambre", label: "Maison 1 chambre" },
      { href: "/plans-de-maison/2-chambres", label: "Maison 2 chambres" },
      { href: "/plans-de-maison/3-chambres", label: "Maison 3 chambres" },
      { href: "/plans-de-maison/4-chambres", label: "Maison 4 chambres" },
    ],
  },
  {
    titre: "Projets de construction",
    /* Les six entrées géographiques du brief. ⚠ Le flux Vitahome ne sert
       aujourd'hui ni les Landes, ni la Gironde, ni le Pays basque — il
       rend la Charente-Maritime, la Vendée et l'Eure-et-Loir. Ces pages
       annoncent donc un territoire, pas un stock, tant qu'un flux pour
       ces départements n'est pas branché. */
    liens: [
      { href: "/construire/landes", label: "Construction de maisons dans les Landes" },
      { href: "/construire/pays-basque", label: "Construction de maisons au Pays basque" },
      { href: "/construire/gironde", label: "Construction de maisons en Gironde" },
      { href: "/terrains-constructibles/landes", label: "Terrains constructibles dans les Landes" },
      { href: "/terrains-constructibles/pays-basque", label: "Terrains constructibles au Pays basque" },
      { href: "/terrains-constructibles/gironde", label: "Terrains constructibles en Gironde" },
    ],
  },
  {
    titre: "Nos agences",
    /* ⚠ LES LIBELLÉS VIENNENT DE LA BASE, PAS DU BRIEF, et c'est
       délibéré : le brief écrit « Agence à Tartas » quand le back-office
       dit « Agence de Tartas ». Recopier le brief ici figerait cinq noms
       que Julien peut changer lui-même en trente secondes — et la
       prochaine agence ouverte n'apparaîtrait pas. La source reste
       l'écran Agences ; le libellé s'y corrige. */
    liens: agences.length ? agences : [{ href: "/agences", label: "Toutes nos agences" }],
  },
  {
    titre: "L'expérience ESSENSYA",
    liens: [
      { href: "/qui-sommes-nous", label: "Qui sommes-nous" },
      { href: "/concept", label: "Le concept ESSENSYA" },
      { href: "/accompagnement", label: "L'accompagnement ESSENSYA" },
      { href: "/concept#engagements", label: "Nos engagements" },
      { href: "/guides/choisir-son-plan-de-maison", label: "Guide pour choisir votre plan de maison" },
      { href: "/guides/choisir-son-terrain", label: "Guide pour choisir votre terrain" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

/* Mono pour la donnée, mais pas la classe .c-label : sur le fond noir du
   footer, le gris pierre tombe à 3,4:1 — un contact doit rester lisible. */
const STYLE_CONTACT: React.CSSProperties = {
  marginTop: "var(--s-2)",
  fontFamily: "var(--f-mono)",
  letterSpacing: ".04em",
};

export interface FooterProps {
  /** Le mot du bloc-marque (Réglages → « Nom du site »). */
  marque: string;
  /** Le nom complet de l'entreprise, pour la ligne de copyright. */
  nomSite: string;
  /** La ligne en petit sous la marque (Réglages → « Baseline »). */
  baseline: string;
  /** URL déjà résolue, ou `null` : sans logo, on écrit le nom. */
  logo: string | null;
  telephone: string;
  telHref: string;
  email: string;
  /** Réglages → « Adresse postale ». Vide = aucune ligne ajoutée. */
  adresse?: string;
  /** Réglages → « Horaires ». Vide = aucune ligne ajoutée. */
  horaires?: string;
  /** Les seuls réseaux renseignés, dans l'ordre de l'écran Réglages. */
  reseaux: { label: string; href: string }[];
  /** Colonnes saisies en back-office. Absent = on garde les colonnes par défaut. */
  colonnes?: ColonneChrome[];
  /** Les agences publiées, dans l'ordre du back-office. */
  agences?: LienZone[];
}

export default function Footer({
  marque,
  nomSite,
  baseline,
  logo,
  telephone,
  telHref,
  email,
  adresse,
  horaires,
  reseaux,
  colonnes,
  agences = [],
}: FooterProps) {
  const cols = colonnes ?? colonnesDefaut(agences);

  return (
    <footer className="site-footer" id="siteFooter">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link className="logo" href="/" aria-label={`${marque} — accueil`}>
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt=""
                  style={{ display: "block", height: "2.4rem", width: "auto" }}
                />
              ) : (
                <>
                  {marque}
                  <small>{baseline}</small>
                </>
              )}
            </Link>
            {/* La baseline de la charte, que le pied de page n'affichait
                pas : `baseline` vaut « Maisons », le petit mot du logo,
                et il disparaît dès qu'un logo image est posé. Celle-ci
                est la signature de la marque, elle doit rester visible
                avec ou sans logo. */}
            <p className="footer-baseline">
              L&apos;essentiel de la qualité au meilleur prix
            </p>
            {/* ⚠ TEXTE DU CLIENT, REPRIS MOT POUR MOT (brief du 22/09).
                Il remplace une phrase que nous avions écrite faute de
                mieux. Deux choses à savoir avant de le retoucher :

                · il annonce « dans les Landes et en Gironde », ce qui
                  contredit le H1 de l'accueil, resté « dans les Landes »
                  seul — et qui est indexé. L'écart est signalé, il se
                  tranche côté client, pas ici ;
                · il ne cite plus le prix. C'est volontaire de sa part ;
                  ne pas le réintroduire au motif qu'il était là avant. */}
            <p>
              Constructeur de maisons individuelles dans les Landes et en
              Gironde. Des plans de maisons conçus intelligemment pour
              conserver l&apos;essentiel de la qualité au meilleur prix.
            </p>
            <p style={STYLE_CONTACT}>
              <a href={telHref}>{telephone}</a>
              {" · "}
              <a href={`mailto:${email}`}>{email}</a>
            </p>
            {/* Adresse et horaires n'existent pas dans le gabarit d'origine :
                on n'ajoute la ligne QUE si le client les a saisis. Vider les
                champs remet donc le pied de page dans son état d'avant, sans
                laisser d'espace vide. */}
            {(adresse || horaires) && (
              <p style={STYLE_CONTACT}>
                {adresse}
                {adresse && horaires ? " · " : ""}
                {horaires}
              </p>
            )}
          </div>
          {cols.map((col, i) => (
            <div className="footer-col" key={`${col.titre}-${i}`}>
              <h4>{col.titre}</h4>
              {col.liens.map((l, j) => (
                <Link key={`${l.href}-${j}`} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="footer-legal">
          <span>© 2026 {nomSite} — Constructeur de maisons individuelles</span>
          {/* Les trois pages légales sont livrées. Le bouton de préférences,
              lui, reste obligatoire et permanent : la CNIL exige que le
              consentement soit retirable aussi facilement qu'il a été donné,
              donc depuis n'importe quelle page. */}
          <nav aria-label="Informations légales">
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/confidentialite">Politique de confidentialité</Link>
            <Link href="/cookies">Gestion des cookies</Link>
            <Link href="/plan-du-site">Plan du site</Link>
            <CookiePrefsLink>Personnaliser les cookies</CookiePrefsLink>
          </nav>
          {/* Les réseaux étaient trois libellés morts. Ils sont désormais ce
              que l'écran Réglages promet : un compte renseigné devient un
              lien, un compte vide ne s'affiche pas du tout — plutôt qu'un
              `href="#"` qui piège le clavier et ne promet rien au lecteur
              d'écran. Aucun réseau renseigné : pas de bloc. */}
          {reseaux.length > 0 && (
            <nav aria-label="Réseaux sociaux">
              {reseaux.map((r) => (
                <a
                  key={r.href}
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer me"
                >
                  {r.label}
                </a>
              ))}
            </nav>
          )}
        </div>
      </div>
    </footer>
  );
}
