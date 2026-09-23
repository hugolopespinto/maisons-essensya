import Link from "next/link";
import CookiePrefsLink from "@/components/CookiePrefsLink";
import { modelesEnAvant } from "@/data/gamme";
import { houseUrl } from "@/lib/format";

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
const colonnesDefaut = (
  zones: LienZone[],
  agences: LienZone[],
): ColonneChrome[] => [
  {
    /* Le client écrit « Nos Maisons » avec une majuscule à Maisons. */
    titre: "Nos Maisons",
    /* ⚠ LE BRIEF DEMANDE « Maison 1 chambre » À « Maison 4 chambres »,
       ET CES QUATRE PAGES N'EXISTENT PAS ENCORE. Elles figurent dans
       l'arborescence du 22/09 sous « Plans de maisons ». Deux raisons de
       ne pas les poser tout de suite :

         · aucune route ne les sert — ce seraient quatre liens morts ;
         · la donnée manque. Sur les onze modèles de `gamme.ts`, un seul
           (Ankara) a son nombre de chambres renseigné. Les pages
           existeraient, mais trois sur quatre seraient vides.

       La colonne garde donc les liens qui mènent quelque part. Elle
       passera au découpage par chambres le jour où les caractéristiques
       des modèles seront livrées — c'est une bascule d'une ligne. */
    liens: [
      { href: houseUrl(), label: "Toute la gamme" },
      /* Les publiables d'abord : `MODELES.slice(0, 3)` donnait Ankara,
         Athènes et Berlin sur toutes les pages, et laissait Pékin — le
         modèle qui porte le prix d'appel — sans lien depuis le pied. */
      ...modelesEnAvant(3).map((m) => ({ href: `/maisons/${m.slug}`, label: m.nom })),
      { href: `${houseUrl()}#prix`, label: "Ce qui est compris" },
    ],
  },
  {
    titre: "Projets de construction",
    /* ⚠ MÊME SITUATION. Le brief demande six entrées géographiques —
       « Construire dans les Landes / au Pays basque / en Gironde » et
       les « Terrains constructibles » correspondants. Aucune n'existe,
       et le flux Vitahome ne sert aujourd'hui ni les Landes ni la
       Gironde : il rend la Charente-Maritime, la Vendée et
       l'Eure-et-Loir. Poser ces liens maintenant, ce serait annoncer un
       stock qu'on n'a pas.

       En attendant, la colonne mène au stock réel. */
    liens: [
      { href: "/annonces", label: "Tous nos terrains" },
      { href: "/annonces?type=terrain", label: "Terrain seul" },
      { href: "/annonces?type=terrain-maison", label: "Terrain + maison" },
      /* Vide quand le flux ne rend aucun département au-dessus du
         seuil : on garde alors l'entrée vers l'index, qui sait le dire. */
      ...(zones.length ? zones : [{ href: "/terrains", label: "Toutes nos zones" }]),
    ],
  },
  {
    /* Le brief remplace « Où nous construisons » — qui listait les
       départements du flux — par les cinq agences. Celles-ci existent
       toutes, avec leur page : c'est la seule colonne du brief qui soit
       intégralement câblable aujourd'hui. Les libellés viennent de la
       base, donc une agence ajoutée ou renommée en back-office suit. */
    titre: "Nos agences",
    liens: agences.length ? agences : [{ href: "/agences", label: "Toutes nos agences" }],
  },
  {
    titre: "L'expérience ESSENSYA",
    /* Le brief en demande sept. Quatre n'existent pas encore —
       « Qui sommes-nous », « L'accompagnement ESSENSYA » et les deux
       guides — et attendent l'arborescence. Les trois autres sont là,
       sous leur nom du brief. */
    liens: [
      { href: "/concept", label: "Le concept ESSENSYA" },
      { href: "/concept#engagements", label: "Nos engagements" },
      { href: "/realisations", label: "Nos réalisations" },
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
  /** Les départements réellement publiables, calculés par le layout. */
  zones?: LienZone[];
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
  zones = [],
  agences = [],
}: FooterProps) {
  const cols = colonnes ?? colonnesDefaut(zones, agences);

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
