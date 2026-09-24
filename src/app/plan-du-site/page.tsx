import type { Metadata } from "next";
import Link from "next/link";
import FilAriane from "@/components/FilAriane";
import { modelesPubliables, MODELES } from "@/data/gamme";
import { agencesPubliees } from "@/lib/agences";
import { articlesPublies } from "@/lib/blog";
import { agencyUrl, communeUrl, deptUrl } from "@/lib/format";
import { communesPubliables, departementsPubliables } from "@/lib/geo";
import { resolveMetadata } from "@/lib/seo";
import { getContent } from "@/lib/store";
import "@/styles/pages/plan.css";

/* ════════════════════════════════════════════════════════════════
   LE PLAN DU SITE — celui que lit un visiteur, pas un robot

   ⚠ IL NE DOUBLE PAS `sitemap.xml`, IL LE COMPLÈTE. Le XML s'adresse à
   Google et ne contient que ce qui est indexable. Celui-ci s'adresse à
   quelqu'un qui cherche une page et ne la trouve pas dans le menu.

   ⚠ ET IL NE RECOPIE RIEN. Chaque section se calcule depuis la même
   source que les pages elles-mêmes — la gamme, les agences publiées,
   les départements au-dessus du seuil, les articles parus. Un plan du
   site écrit à la main est un plan du site faux au bout d'un mois : il
   annonce des pages supprimées et ignore les nouvelles. Ici, une agence
   ajoutée en back-office apparaît sans que personne n'y pense.

   Les pages encore en préparation sont signalées comme telles plutôt
   que passées sous silence : un visiteur qui clique doit savoir ce
   qu'il va trouver. Elles restent en `noindex` de leur côté.
   ════════════════════════════════════════════════════════════════ */

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/plan-du-site", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Plan du site",
  description:
    "Toutes les pages du site Maisons Essensya : modèles, terrains, agences, guides et informations légales.",
  alternates: { canonical: "/plan-du-site" },
};

interface Entree {
  href: string;
  label: string;
  /** Vrai pour une page annoncée dont le contenu n'est pas encore écrit. */
  prep?: boolean;
}

export default async function PlanDuSitePage() {
  const [agences, { articles }, departements] = await Promise.all([
    agencesPubliees(),
    getContent(),
    departementsPubliables(),
  ]);

  const publiables = modelesPubliables();
  /* Les modèles non publiables ont bien une page, mais en noindex : on
     les affiche quand même, un visiteur a le droit de les atteindre. */
  const autres = MODELES.filter((m) => !publiables.some((p) => p.slug === m.slug));

  const communes = departements.flatMap((d) =>
    communesPubliables(d).map((c) => ({
      href: communeUrl(d.slug, c.slug),
      label: `${c.nom} (${d.nom})`,
    })),
  );

  const sections: { titre: string; entrees: Entree[] }[] = [
    {
      titre: "Nos Maisons",
      entrees: [
        { href: "/maisons", label: "Toute la gamme" },
        { href: "/plans-de-maison/1-chambre", label: "Maison 1 chambre", prep: true },
        { href: "/plans-de-maison/2-chambres", label: "Maison 2 chambres", prep: true },
        { href: "/plans-de-maison/3-chambres", label: "Maison 3 chambres", prep: true },
        { href: "/plans-de-maison/4-chambres", label: "Maison 4 chambres", prep: true },
        ...publiables.map((m) => ({ href: `/maisons/${m.slug}`, label: m.nom })),
        ...autres.map((m) => ({ href: `/maisons/${m.slug}`, label: m.nom })),
      ],
    },
    {
      titre: "Projets de construction",
      entrees: [
        { href: "/annonces", label: "Toutes nos annonces" },
        { href: "/annonces?type=terrain-maison", label: "Terrain + maison" },
        { href: "/annonces?type=terrain", label: "Terrain seul" },
        { href: "/construire/landes", label: "Construction de maisons dans les Landes", prep: true },
        { href: "/construire/pays-basque", label: "Construction de maisons au Pays basque", prep: true },
        { href: "/construire/gironde", label: "Construction de maisons en Gironde", prep: true },
        { href: "/terrains-constructibles/landes", label: "Terrains constructibles dans les Landes", prep: true },
        { href: "/terrains-constructibles/pays-basque", label: "Terrains constructibles au Pays basque", prep: true },
        { href: "/terrains-constructibles/gironde", label: "Terrains constructibles en Gironde", prep: true },
        { href: "/terrains", label: "Où nous construisons" },
        ...departements.map((d) => ({ href: deptUrl(d.slug), label: d.nom })),
        ...communes,
      ],
    },
    {
      titre: "Votre construction",
      entrees: [
        { href: "/concept#etapes", label: "Les étapes de construction" },
        { href: "/concept#faq", label: "Foire aux questions" },
        { href: "/guides/choisir-son-plan-de-maison", label: "Guide pour choisir votre plan de maison", prep: true },
        { href: "/guides/choisir-son-terrain", label: "Guide pour choisir votre terrain", prep: true },
      ],
    },
    {
      titre: "L'expérience ESSENSYA",
      entrees: [
        { href: "/qui-sommes-nous", label: "Qui sommes-nous", prep: true },
        { href: "/concept", label: "Le concept ESSENSYA" },
        { href: "/concept#engagements", label: "Nos engagements" },
        { href: "/realisations", label: "Nos réalisations" },
        { href: "/accompagnement", label: "L'accompagnement ESSENSYA", prep: true },
      ],
    },
    {
      titre: "Nos agences",
      entrees: [
        { href: "/agences", label: "Toutes nos agences" },
        ...agences.map((g) => ({ href: agencyUrl(g), label: g.name })),
      ],
    },
    {
      titre: "Actualités",
      entrees: [
        { href: "/blog", label: "Le journal" },
        ...articlesPublies(articles).map((a) => ({
          href: `/blog/${a.slug}`,
          label: a.titre,
        })),
      ],
    },
    {
      titre: "Informations légales",
      entrees: [
        { href: "/contact", label: "Contact" },
        { href: "/mentions-legales", label: "Mentions légales" },
        { href: "/confidentialite", label: "Politique de confidentialité" },
        { href: "/cookies", label: "Gestion des cookies" },
      ],
    },
  ];

  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <FilAriane items={[{ nom: "Accueil", path: "/" }, { nom: "Plan du site" }]} />
          <h1>Plan du site</h1>
          <p>
            Toutes les pages du site, rangées comme le menu. Celles marquées
            « en préparation » existent mais n&apos;ont pas encore leur contenu.
          </p>
        </div>
      </section>

      <section className="pl-body">
        <div className="container pl-grid">
          {sections.map((s) => (
            <div className="pl-col" key={s.titre}>
              <h2>{s.titre}</h2>
              <ul>
                {s.entrees.map((e) => (
                  <li key={e.href + e.label}>
                    <Link href={e.href}>{e.label}</Link>
                    {e.prep && <span className="pl-prep">en préparation</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
