/* ════════════════════════════════════════════════════════════════
   LA NAVIGATION PRINCIPALE — l'arborescence du client, niveau 1 et 2

   Relevée sur le schéma d'arborescence livré par le client : les cases
   VERTES sont les six rubriques de la barre, les cases FRAMBOISE les
   liens qui s'ouvrent sous chacune d'elles au survol. Les niveaux plus
   profonds du schéma (les modèles Pékin, Ankara, Tokyo ; les villes ;
   les FAQ et les guides détaillés ; les agences une à une) ne sont PAS
   dans la barre : ce sont des pages qu'on atteint depuis leur rubrique.

   Ce fichier est la source UNIQUE du menu par défaut. L'en-tête le
   publie tant que rien n'a été saisi dans /admin/menus, et l'écran
   Menus s'ouvre dessus — les deux ne peuvent donc plus diverger, comme
   le faisaient les deux copies écrites à la main qui l'ont précédé.

   ⚠ DEUX RUBRIQUES N'ONT PAS D'ADRESSE, et c'est voulu : « Votre
   construction » et « L'expérience ESSENSYA » sont des titres sur le
   schéma, pas des pages. Sans `href`, leur libellé ne fait qu'ouvrir le
   sous-menu. « Plans de maisons » et « Projets de construction » mènent
   en plus à la page qui les rassemble déjà : la gamme et les annonces.

   ⚠ TROIS LIENS VISENT UNE SECTION ET NON UNE PAGE : les étapes, la FAQ
   et les engagements vivent aujourd'hui sur /concept. Le schéma leur
   donne des pages propres (la FAQ s'y divise même en trois) ; le jour
   où elles existent, seul le `href` change ici.
   ════════════════════════════════════════════════════════════════ */

/** Un lien de sous-menu. */
export interface LienNav {
  label: string;
  href: string;
}

/** Une rubrique de la barre : un lien, un sous-menu, ou les deux. */
export interface EntreeNav {
  label: string;
  /** Absent : la rubrique n'a pas de page à elle, son libellé ne fait
   *  qu'ouvrir le sous-menu. */
  href?: string;
  enfants?: LienNav[];
}

export const NAVIGATION: EntreeNav[] = [
  {
    label: "Plans de maisons",
    /* /plans-de-maison redirige lui-même vers la gamme (next.config.ts) :
       on vise directement la destination, sans détour par un 308. */
    href: "/maisons",
    /* Le listing des annonces, filtré sur le nombre EXACT de chambres :
       c'est la page où l'on filtre les maisons. Les anciennes adresses
       /plans-de-maison/N-chambres y redirigent (next.config.ts). */
    enfants: [
      { label: "Plans maison 1 chambre", href: "/annonces?chambres=1" },
      { label: "Plans maison 2 chambres", href: "/annonces?chambres=2" },
      { label: "Plans maison 3 chambres", href: "/annonces?chambres=3" },
      { label: "Plans maison 4 chambres", href: "/annonces?chambres=4" },
    ],
  },
  {
    label: "Projets de construction",
    href: "/annonces",
    /* Le schéma demande sur ces deux pages un sélecteur « terrain ou
       projet maison · département · ville » : c'est exactement celui de
       /annonces, pré-réglé ici par le paramètre `type`. */
    enfants: [
      { label: "Projets de maisons", href: "/annonces?type=terrain-maison" },
      { label: "Terrains constructibles", href: "/annonces?type=terrain" },
    ],
  },
  {
    label: "Votre construction",
    enfants: [
      { label: "Construire dans les Landes", href: "/construire/landes" },
      { label: "Construire au Pays basque", href: "/construire/pays-basque" },
      { label: "Construire en Gironde", href: "/construire/gironde" },
      { label: "Les étapes de construction", href: "/concept#etapes" },
      { label: "Nos guides de construction", href: "/guides" },
      { label: "Foire aux questions", href: "/concept#faq" },
      { label: "Simulateur de financement", href: "/simulateur-de-financement" },
    ],
  },
  {
    label: "L'expérience ESSENSYA",
    enfants: [
      { label: "Qui sommes-nous", href: "/qui-sommes-nous" },
      { label: "Le concept ESSENSYA", href: "/concept" },
      { label: "Nos engagements", href: "/concept#engagements" },
      { label: "Nos garanties", href: "/garanties" },
      { label: "Nos équipes", href: "/equipes" },
      { label: "Parrainage", href: "/parrainage" },
      { label: "Avis clients", href: "/avis-clients" },
      { label: "Nos réalisations", href: "/realisations" },
      { label: "L'accompagnement ESSENSYA", href: "/accompagnement" },
    ],
  },
  /* Pas de sous-menu : sur le schéma, les agences et les actualités
     descendent directement vers des pages, sans case framboise. */
  { label: "Nos agences", href: "/agences" },
  { label: "Actualités", href: "/blog" },
];
