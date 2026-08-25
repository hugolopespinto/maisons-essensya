import Link from "next/link";

const COLS = [
  {
    title: "Maisons",
    links: [
      { href: "/maisons", label: "Tous les modèles" },
      { href: "/maisons", label: "Trouver ma maison" },
      { href: "/concept", label: "Nos maisons catalogues" },
    ],
  },
  {
    title: "Projets",
    links: [
      { href: "/annonces?type=terrain", label: "Terrains" },
      { href: "/annonces?type=terrain-maison", label: "Terrain + maison" },
      { href: "/concept", label: "Comment ça marche" },
      { href: "/contact", label: "Demander un rappel" },
    ],
  },
  {
    title: "Essensya",
    links: [
      { href: "/concept", label: "Notre concept" },
      { href: "/concept#engagements", label: "Nos engagements" },
      { href: "/agences", label: "Nos agences" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Informations",
    links: [
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/confidentialite", label: "Politique de confidentialité" },
      { href: "/cookies", label: "Gestion des cookies" },
      { href: "/styleguide", label: "Design system" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="site-footer" id="siteFooter">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link className="logo" href="/">
              Essensya<small>Maisons</small>
            </Link>
            <p>
              Constructeur de maisons individuelles nouvelle génération. Des modèles
              catalogues conçus intelligemment, pour une maîtrise totale du produit et
              du prix.
            </p>
          </div>
          {COLS.map((col) => (
            <div className="footer-col" key={col.title}>
              <h4>{col.title}</h4>
              {col.links.map((l, i) => (
                <Link key={`${l.href}-${i}`} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="footer-legal">
          <span>© 2026 Maisons Essensya — Constructeur de maisons individuelles</span>
          <nav>
            <a href="#">Instagram</a>
            <a href="#">LinkedIn</a>
            <a href="#">Pinterest</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
