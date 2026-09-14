import Link from "next/link";
import CookiePrefsLink from "@/components/CookiePrefsLink";
import { REEL, VERSIONS } from "@/data/essensya";
import { fmtPrice, houseUrl, versionUrl } from "@/lib/format";

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
const colonnesDefaut = (zones: LienZone[]): ColonneChrome[] => [
  {
    titre: "La maison",
    liens: [
      { href: houseUrl(), label: "La maison" },
      // Les deux déclinaisons ont leur URL propre : autant la donner à lire.
      ...VERSIONS.map((v) => ({ href: versionUrl(v), label: `Version ${v.label}` })),
      { href: `${houseUrl()}#prix`, label: "Ce qui est compris" },
    ],
  },
  {
    titre: "Terrains",
    liens: [
      { href: "/annonces", label: "Tous nos terrains" },
      { href: "/annonces?type=terrain", label: "Terrain seul" },
      { href: "/annonces?type=terrain-maison", label: "Terrain + maison" },
      { href: "/contact", label: "Demander un rappel" },
    ],
  },
  {
    titre: "Où nous construisons",
    /* Vide quand le flux ne rend aucun département au-dessus du seuil :
       on garde alors l'entrée vers l'index, qui, lui, sait le dire. */
    liens: zones.length ? zones : [{ href: "/terrains", label: "Toutes nos zones" }],
  },
  {
    titre: "Essensya",
    liens: [
      { href: "/concept", label: "Notre concept" },
      { href: "/concept#engagements", label: "Nos engagements" },
      { href: "/realisations", label: "Nos réalisations" },
      { href: "/agences", label: "Nos agences" },
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
}: FooterProps) {
  const cols = colonnes ?? colonnesDefaut(zones);

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
            {/* ⚠ Ce paragraphe disait « une maison de plain-pied, deux
                déclinaisons — 2 ou 3 chambres », et le prix qui allait
                avec. Le client construit une GAMME : la phrase était
                fausse sur toutes les pages du site à la fois, pied de
                page oblige. Réécrite sans inventer de caractéristiques,
                puisque nous n'avons pas encore celles des modèles. */}
            <p>
              Des modèles de maisons optimisés jusqu&apos;au dernier mètre
              carré, conçus par notre bureau d&apos;études : c&apos;est ce qui
              permet de les annoncer à partir de {fmtPrice(REEL.prixEntree)},
              hors terrain.
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
            <Link href="/confidentialite">Confidentialité</Link>
            <Link href="/cookies">Cookies</Link>
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
