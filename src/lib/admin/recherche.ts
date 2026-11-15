import "server-only";
import { SEO_ROUTES } from "@/lib/seo";
import { getContent, PAGES_DEFAUT } from "@/lib/store";
import { GUIDE, type GuideEcran } from "./guide";

/* ════════════════════════════════════════════════════════════════
   L'INDEX DE LA RECHERCHE DU BACK-OFFICE

   Construit côté serveur, à chaque affichage d'un écran, puis confié au
   champ de recherche (src/components/admin/RechercheAdmin.tsx) qui filtre
   dans le navigateur — quelques centaines d'entrées, rien qui justifie
   un aller-retour par frappe.

   Quatre sources, pour que « simulateur », « titre de l'accueil »,
   « Hagetmau » ou « SEO contact » mènent tous quelque part :
     · le guide des écrans et de leurs champs (./guide) ;
     · les blocs de texte des pages (PAGES_DEFAUT) — la structure vit
       dans le code, donc un bloc ajouté au site devient trouvable seul ;
     · les routes de l'écran SEO ;
     · les agences et les articles, par leur nom.
   ════════════════════════════════════════════════════════════════ */

export interface EntreeRecherche {
  /** Ce qu'on cherche : le nom du champ, de la page, de l'agence. */
  titre: string;
  /** Où ça se trouve : « Réglages du site », « Pages › Accueil ». */
  ecran: string;
  /** Une ligne d'explication, affichée sous le titre. */
  detail: string;
  href: string;
  /** Mots supplémentaires qui doivent trouver l'entrée sans s'afficher. */
  mots: string;
}

/** L'ancre d'une carte de l'écran SEO — la même des deux côtés. */
export const ancreSeo = (path: string) => `seo${path.replace(/[^a-z0-9]+/gi, "-")}`;

const accessible = (g: GuideEcran, acces: { admin: boolean; comptes: boolean }) =>
  (!g.admin || acces.admin) && (!g.comptes || acces.comptes);

export async function indexRecherche(acces: {
  admin: boolean;
  comptes: boolean;
}): Promise<EntreeRecherche[]> {
  const entrees: EntreeRecherche[] = [];

  for (const g of Object.values(GUIDE) as GuideEcran[]) {
    if (!accessible(g, acces)) continue;
    entrees.push({
      titre: g.titre,
      ecran: "Écran",
      detail: g.resume,
      href: g.href,
      mots: g.motsCles ?? "",
    });
    for (const e of g.elements) {
      entrees.push({
        titre: e.nom,
        ecran: g.titre,
        detail: e.effet,
        href: e.ancre ? `${g.href}#${e.ancre}` : g.href,
        mots: e.motsCles ?? "",
      });
    }
  }

  for (const page of PAGES_DEFAUT) {
    const href = `/admin/pages/${page.cle}`;
    entrees.push({
      titre: `Page « ${page.label} »`,
      ecran: "Pages",
      detail: `Les textes modifiables de la page ${page.label}.`,
      href,
      mots: "textes page",
    });
    page.blocs.forEach((bloc, i) => {
      entrees.push({
        titre: bloc.label,
        ecran: `Pages › ${page.label}`,
        detail: bloc.aide ?? "",
        href: `${href}#val_${i}`,
        mots: "texte",
      });
    });
  }

  for (const route of SEO_ROUTES) {
    entrees.push({
      titre: `Référencement — ${route.label}`,
      ecran: "SEO",
      detail: `Titre et description affichés par Google pour ${route.path}.`,
      href: `/admin/seo#${ancreSeo(route.path)}`,
      mots: "seo google title description referencement",
    });
  }

  const { agences, articles } = await getContent();
  for (const a of agences) {
    entrees.push({
      titre: a.nom || "Agence sans nom",
      ecran: "Agences",
      detail: [a.zone, a.actif ? "" : "fermée"].filter(Boolean).join(" · "),
      href: `/admin/agences?edit=${encodeURIComponent(a.id)}`,
      mots: `agence ${a.villes.join(" ")}`,
    });
  }
  for (const a of articles) {
    entrees.push({
      titre: a.titre || "Article sans titre",
      ecran: "Blog",
      detail: a.brouillon || !a.publieLe ? "Brouillon" : "Article publié",
      href: `/admin/blog/${encodeURIComponent(a.slug)}`,
      mots: "article blog",
    });
  }

  return entrees;
}
