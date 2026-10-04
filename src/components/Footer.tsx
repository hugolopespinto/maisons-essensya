import Link from "next/link";
import CookiePrefsLink from "@/components/CookiePrefsLink";
import { colonnesPiedDefaut, type ColonnePied, type LienPied } from "@/data/pied-de-page";

/* ⚠ CETTE LISTE ÉTAIT ÉCRITE EN DUR, et elle était déjà fausse : elle
   annonçait les Deux-Sèvres et le Maine-et-Loire, absents du flux, et
   pointait vers /annonces?dept=NN — une seule et même URL pour tout le
   stock, donc aucune page à référencer. « maison + terrain <département> »
   est pourtant la requête qui convertit sur ce métier.

   Les zones viennent maintenant du stock réel (`departementsPubliables()`),
   calculées par le layout et passées en `zones`. Un département qui se
   vide disparaît du pied de page au lieu d'y laisser un lien mort. */

/** Un lien de zone : libellé prêt à afficher, chemin déjà calculé. */
export type LienZone = LienPied;

/** Une colonne du pied de page, déjà nettoyée par le layout racine. */
export type ColonneChrome = ColonnePied;

/* Colonnes d'origine : `colonnesPiedDefaut`, dans src/data/pied-de-page.ts,
   que l'écran Menus lit aussi. Comme pour l'en-tête, elles restent le
   REPLI des colonnes éditables : rien de saisi dans /admin/menus, ou tout
   effacé, et le pied de page garde exactement ces quatre colonnes. */

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
  const cols = colonnes ?? colonnesPiedDefaut(agences);

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
