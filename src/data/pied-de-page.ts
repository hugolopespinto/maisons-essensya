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
       maisons », au listing des annonces filtré sur ce nombre de chambres
       — la même destination, d'où qu'on clique.

       ⚠ Les pages /plans-de-maison/N-chambres qu'ils visaient étaient
       restées vides (sur les onze modèles de `gamme.ts`, seul Ankara a
       son nombre de chambres). Elles redirigent désormais vers ce même
       listing, en temporaire : elles pourront revenir quand les plans par
       nombre de chambres seront livrés. */
    liens: [
      { href: "/annonces?chambres=1", label: "Maison 1 chambre" },
      { href: "/annonces?chambres=2", label: "Maison 2 chambres" },
      { href: "/annonces?chambres=3", label: "Maison 3 chambres" },
      { href: "/annonces?chambres=4", label: "Maison 4 chambres" },
    ],
  },
  {
    titre: "Projets de construction",
    /* Les six entrées géographiques du brief. ⚠ Le flux Vitahome ne sert
       aujourd'hui ni les Landes, ni la Gironde, ni le Pays basque — il
       rend la Charente-Maritime, la Vendée et l'Eure-et-Loir. Ces pages
       annoncent donc un territoire, pas un stock, tant qu'un flux pour
       ces départements n'est pas branché. */
    liens: [
      { href: "/construire/landes", label: "Construction de maisons dans les Landes" },
      { href: "/construire/pays-basque", label: "Construction de maisons au Pays basque" },
      { href: "/construire/gironde", label: "Construction de maisons en Gironde" },
      { href: "/terrains-constructibles/landes", label: "Terrains constructibles dans les Landes" },
      { href: "/terrains-constructibles/pays-basque", label: "Terrains constructibles au Pays basque" },
      { href: "/terrains-constructibles/gironde", label: "Terrains constructibles en Gironde" },
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
      { href: "/qui-sommes-nous", label: "Qui sommes-nous" },
      { href: "/concept", label: "Le concept ESSENSYA" },
      { href: "/accompagnement", label: "L'accompagnement ESSENSYA" },
      { href: "/concept#engagements", label: "Nos engagements" },
      { href: "/guides/choisir-son-plan-de-maison", label: "Guide pour choisir votre plan de maison" },
      { href: "/guides/choisir-son-terrain", label: "Guide pour choisir votre terrain" },
      { href: "/contact", label: "Contact" },
    ],
  },
];
