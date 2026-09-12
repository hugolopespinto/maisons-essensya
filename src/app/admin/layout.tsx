import type { Metadata } from "next";
import Link from "next/link";
import { authDriver, currentAdmin } from "@/lib/admin/auth";
import { logout } from "./actions";
import "@/styles/admin.css";

/* ════════════════════════════════════════════════════════════════
   COQUILLE DU BACK-OFFICE

   ⚠ CE LAYOUT NE PROTÈGE PAS, ET C'EST DÉLIBÉRÉ.

   Un layout qui redirigerait vers /admin/login s'appliquerait AUSSI à
   /admin/login — qui est son enfant : le visiteur non authentifié serait
   renvoyé vers une page qui le renvoie vers elle-même, indéfiniment. Les
   contournements habituels (tester le pathname) ne sont pas disponibles
   ici : un layout serveur ne connaît pas l'URL courante.

   Le partage retenu est donc :
     · le LAYOUT décide de la COQUILLE — navigation complète si la session
       est valide, coquille nue sinon (login, écran de configuration) ;
     · chaque PAGE décide de l'ACCÈS, en appelant `requireAdmin()` — ou
       `requireRole("admin")` — de `./actions` en première ligne ;
     · chaque ACTION d'écriture décide du sien, avec `assertAdmin()` /
       `assertRole()`.

   Masquer un lien n'a jamais protégé une route : la navigation absente
   ci-dessous est un confort d'affichage, pas une barrière.
   ════════════════════════════════════════════════════════════════ */

/* Le back-office lit une session en cookie et l'état réel du serveur :
   rien ici n'est prérendable, et une page d'administration mise en cache
   afficherait des chiffres faux. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s — Administration" },
  /* Ceinture et bretelles avec /admin dans robots.txt : le fichier se
     négocie avec les robots, la balise s'impose à eux. */
  robots: { index: false, follow: false },
};

/* ════════ NAVIGATION ════════
   Treize écrans. Une liste plate de treize entrées ne se lit pas : on
   cherche « Menus » quelque part entre « Blog » et « Révisions », et on
   finit par ouvrir trois écrans au hasard. Les familles ci-dessous
   reprennent la logique que le client connaît de WordPress — ce qu'on
   écrit, ce qui habille le site, ce qui le fait trouver, et les outils —
   sans en copier les intitulés : « Apparence » y désigne des thèmes, ici
   ça n'aurait aucun sens.

   L'ordre à l'intérieur d'une famille va du quotidien à l'exceptionnel :
   on modifie une page toutes les semaines, un menu deux fois par an.

   ⚠ Deux entrées ne s'affichent pas toujours :
     · « Utilisateurs » n'a de sens qu'avec des comptes nommés — en mode
       mot de passe partagé il n'y a qu'un identifiant, donc aucun compte
       à gérer, et un écran vide poserait plus de questions qu'il n'en
       résout ;
     · « Tracking » et « Utilisateurs » sont réservés au rôle `admin`
       (voir `./actions.ts`) : inutile d'afficher à un éditeur un lien qui
       le renverrait aussitôt au tableau de bord.

   ⚠ Masquer un lien n'est PAS une autorisation. Les deux filtres
   ci-dessous ne servent qu'à ne pas proposer une porte fermée ; c'est
   `requireRole("admin")` en tête de l'écran correspondant qui garde
   l'URL, et `assertRole("admin")` qui garde son action. */

type Entree = {
  href: string;
  label: string;
  /** Réservé au rôle `admin`. */
  admin?: true;
  /** N'a de sens qu'avec des comptes nommés (pilote Supabase). */
  comptes?: true;
};

type Famille = { cle: string; titre?: string; entrees: Entree[] };

const FAMILLES: Famille[] = [
  {
    cle: "accueil",
    entrees: [{ href: "/admin", label: "Tableau de bord" }],
  },
  {
    cle: "contenu",
    titre: "Contenu",
    entrees: [
      { href: "/admin/pages", label: "Pages" },
      { href: "/admin/contenu", label: "Textes du site" },
      { href: "/admin/blog", label: "Blog" },
      { href: "/admin/annonces", label: "Annonces" },
      { href: "/admin/agences", label: "Agences" },
      { href: "/admin/medias", label: "Médiathèque" },
    ],
  },
  {
    cle: "apparence",
    titre: "Apparence",
    entrees: [
      { href: "/admin/menus", label: "Menus" },
      { href: "/admin/reglages", label: "Réglages du site" },
    ],
  },
  {
    cle: "mesure",
    titre: "Référencement et mesure",
    entrees: [
      { href: "/admin/seo", label: "SEO" },
      { href: "/admin/tracking", label: "Tracking", admin: true },
    ],
  },
  {
    cle: "outils",
    titre: "Outils",
    entrees: [
      { href: "/admin/revisions", label: "Révisions" },
      {
        href: "/admin/utilisateurs",
        label: "Utilisateurs",
        admin: true,
        comptes: true,
      },
    ],
  },
];

/* Le fichier de styles ne connaît pas les familles — il a été écrit pour
   une liste plate. Plutôt que d'y toucher depuis ici (il est partagé avec
   les autres écrans), les trois règles nécessaires sont posées en ligne :
   elles reprennent exactement les variables du thème. */
const STYLE_TITRE: React.CSSProperties = {
  display: "block",
  padding: "0 .6rem .3rem",
  fontFamily: "var(--f-mono)",
  fontSize: "var(--fs-label)",
  letterSpacing: ".18em",
  textTransform: "uppercase",
  color: "var(--pierre)",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* `currentAdmin()` plutôt que `isAuthenticated()` : la coquille a besoin
     du rôle pour décider ce qu'elle montre. Même lecture de cookie, même
     coût — aucun appel réseau. */
  const admin = await currentAdmin();
  const comptesNommes = authDriver() === "supabase";

  /* Coquille nue : ni navigation ni déconnexion tant qu'il n'y a pas de
     session. Rien à naviguer, et surtout rien à laisser deviner de la
     structure du back-office à un visiteur non authentifié. */
  if (!admin) return <div className="adm adm--nu">{children}</div>;

  const visibles = FAMILLES.map((f) => ({
    ...f,
    entrees: f.entrees.filter(
      (e) =>
        (!e.admin || admin.role === "admin") && (!e.comptes || comptesNommes),
    ),
  })).filter((f) => f.entrees.length > 0);

  return (
    <div className="adm">
      <nav className="adm__nav" aria-label="Navigation du back-office">
        <div className="adm__brand">
          <span className="adm__brand-name">Maisons Essensya</span>
          <span className="adm__brand-sub">Administration</span>
        </div>

        {visibles.map((f) => (
          <div key={f.cle}>
            {f.titre && (
              <span id={`nav-${f.cle}`} style={STYLE_TITRE}>
                {f.titre}
              </span>
            )}
            <ul
              className="adm__links"
              {...(f.titre ? { "aria-labelledby": `nav-${f.cle}` } : {})}
            >
              {f.entrees.map((e) => (
                <li key={e.href}>
                  <Link className="adm__link" href={e.href}>
                    {e.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="adm__foot">
          {/* Qui est connecté : en mode mot de passe partagé l'e-mail est
              vide — il n'y a personne à nommer, et c'est exactement ce que
              les comptes nommés apportent. On le dit plutôt que de laisser
              un blanc. */}
          <span
            className="adm__link adm__link--out"
            style={{ cursor: "default", overflowWrap: "anywhere" }}
            title={admin.email || "Mot de passe partagé"}
          >
            {admin.email || "Accès partagé"}
            {admin.role === "admin" && comptesNommes ? (
              <span className="adm-badge adm-badge--on">admin</span>
            ) : null}
          </span>

          {/* Nouvel onglet : on ne veut pas qu'un aller-retour sur le site
              public fasse perdre le contexte d'une saisie en cours. */}
          <a
            className="adm__link adm__link--out"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Voir le site <span aria-hidden="true">↗</span>
          </a>
          <form action={logout}>
            <button className="adm__link adm__link--out" type="submit">
              Déconnexion
            </button>
          </form>
        </div>
      </nav>

      <main className="adm__main">{children}</main>
    </div>
  );
}
