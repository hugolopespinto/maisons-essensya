import Link from "next/link";
import CookiePrefsLink from "@/components/CookiePrefsLink";
import { PRICE_FROM, VERSIONS } from "@/data/essensya";
import { fmtPrice, houseUrl, versionUrl } from "@/lib/format";

/* Départements réellement couverts par le flux Vitahome. Ce bloc n'est pas
   décoratif : « maison + terrain <département> » est la requête qui convertit
   sur ce métier, et le site n'avait aucun lien interne vers ces pages. */
const DEPTS: [string, string][] = [
  ["17", "Charente-Maritime"],
  ["79", "Deux-Sèvres"],
  ["85", "Vendée"],
  ["28", "Eure-et-Loir"],
  ["49", "Maine-et-Loire"],
];

/** Une colonne du pied de page, déjà nettoyée par le layout racine. */
export interface ColonneChrome {
  titre: string;
  liens: { label: string; href: string }[];
}

/* Colonnes d'origine. Comme pour l'en-tête, elles restent le REPLI des
   colonnes éditables : rien de saisi dans /admin/menus, ou tout effacé,
   et le pied de page garde exactement ces quatre colonnes. */
const COLS: ColonneChrome[] = [
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
    liens: DEPTS.map(([code, nom]) => ({
      href: `/annonces?dept=${code}`,
      label: `${nom} (${code})`,
    })),
  },
  {
    titre: "Essensya",
    liens: [
      { href: "/concept", label: "Notre concept" },
      { href: "/concept#engagements", label: "Nos engagements" },
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
  /** Colonnes saisies en back-office. Absent = on garde `COLS`. */
  colonnes?: ColonneChrome[];
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
}: FooterProps) {
  const cols = colonnes ?? COLS;

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
            <p>
              Une maison de plain-pied, deux déclinaisons — 2 ou 3 chambres.
              Conçue une seule fois et construite à l&apos;identique : c&apos;est
              exactement ce qui permet de l&apos;annoncer à partir de{" "}
              {fmtPrice(PRICE_FROM)}, hors terrain.
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
