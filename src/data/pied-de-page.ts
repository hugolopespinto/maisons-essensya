/* ════════════════════════════════════════════════════════════════
   LES COLONNES DU PIED DE PAGE — la source unique

   Le pendant de `navigation.ts` pour le pied de page. Le composant
   Footer les publie tant que rien n'a été enregistré dans /admin/menus,
   et l'écran Menus s'ouvre dessus.

   ⚠ L'ÉCRAN MENUS EN GARDAIT UNE COPIE À LA MAIN, RESTÉE À L'ANCIEN PIED
   DE PAGE (« La maison », « Terrains », « Où nous construisons »,
   « Essensya ») quand celui-ci est passé au brief du 22/09. Or l'en-tête
   et le pied de page s'y enregistrent d'un même formulaire : le premier
   clic sur « Enregistrer » — même pour un seul sous-lien de la barre —
   aurait remplacé, sans prévenir, le pied de page du brief par l'ancien.
   ════════════════════════════════════════════════════════════════ */

/** Un lien du pied de page : libellé prêt à afficher, chemin déjà calculé. */
export interface LienPied {
  href: string;
  label: string;
}

/** Une colonne du pied de page. */
export interface ColonnePied {
  titre: string;
  liens: LienPied[];
}

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
   basculeront sans changer d'URL le jour où leur contenu arrivera.

   `agences` : les agences publiées, dans l'ordre du back-office — le
   layout racine et l'écran Menus les lisent tous deux avec
   `agencesPubliees()`. */
export const colonnesPiedDefaut = (agences: LienPied[]): ColonnePied[] => [
  {
    /* « Nos Maisons », avec la majuscule du brief. */
    titre: "Nos Maisons",
    /* Le brief remplace les noms de modèles par un découpage selon le
       nombre de chambres. Ces liens mènent, comme ceux du menu « Plans de
       maisons », aux modèles de la gamme qui ont ce nombre de chambres —
       la même destination, d'où qu'on clique (voir src/lib/plans.ts).

       Une page sans aucun modèle à ce nombre de chambres reste en ligne,
       hors index, et dit ce qui manque. */
    liens: [
      { href: "/plans-de-maison/1-chambre", label: "Maison 1 chambre" },
      { href: "/plans-de-maison/2-chambres", label: "Maison 2 chambres" },
      { href: "/plans-de-maison/3-chambres", label: "Maison 3 chambres" },
      { href: "/plans-de-maison/4-chambres", label: "Maison 4 chambres" },
    ],
  },
  {
    titre: "Projets de construction",
    /* Les six entrées géographiques du brief, tranché le 10/11 : elles
       mènent directement au listing /annonces, département déjà posé
       dans le filtre (`dept`, voir src/lib/annonces/criteres.ts), plutôt
       qu'à une page éditoriale par territoire. « Construction de
       maisons » pose aussi `type=terrain-maison`, « Terrains
       constructibles » `type=terrain` : sans ce second filtre, les deux
       entrées d'un même département pointeraient vers la même URL.

       Codes INSEE : 40 Landes, 33 Gironde, 64 Pyrénées-Atlantiques (le
       Pays basque n'a pas son propre code département — même
       correspondance que dans src/app/agences/[slug]/page.tsx). Un
       département absent du catalogue courant n'est pas une erreur : le
       filtre est simplement ignoré (`lireCriteres`), et le listing
       s'affiche sans lui.

       /construire/[dept] reste au menu de tête et à /plan-du-site ;
       /terrains-constructibles/[dept] reste à /plan-du-site : aucune des
       deux ne devient une page orpheline en quittant le pied de page. */
    liens: [
      { href: "/annonces?type=terrain-maison&dept=40", label: "Construction de maisons dans les Landes" },
      { href: "/annonces?type=terrain-maison&dept=64", label: "Construction de maisons au Pays basque" },
      { href: "/annonces?type=terrain-maison&dept=33", label: "Construction de maisons en Gironde" },
      { href: "/annonces?type=terrain&dept=40", label: "Terrains constructibles dans les Landes" },
      { href: "/annonces?type=terrain&dept=64", label: "Terrains constructibles au Pays basque" },
      { href: "/annonces?type=terrain&dept=33", label: "Terrains constructibles en Gironde" },
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
      { href: "/concept#qui-sommes-nous", label: "Qui sommes-nous" },
      { href: "/concept#concept", label: "Le concept ESSENSYA" },
      { href: "/concept#engagements", label: "Nos engagements" },
      { href: "/concept#accompagnement", label: "L'accompagnement ESSENSYA" },
      { href: "/guides/choisir-son-plan-de-maison", label: "Guide pour choisir votre plan de maison" },
      { href: "/guides/choisir-son-terrain", label: "Guide pour choisir votre terrain" },
      { href: "/contact", label: "Contact" },
    ],
  },
];
