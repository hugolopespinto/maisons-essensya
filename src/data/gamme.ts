import {
  modeles as modelesVisuels,
  facade,
  modele as modeleVisuels,
  plan as planVisuel,
  type Visuel,
} from "./visuels";
import { fmtSurface } from "@/lib/format";

/* ════════════════════════════════════════════════════════════════
   LA GAMME — onze modèles, et ce qu'on en sait

   Ce fichier remplace la prémisse mono-produit (« une maison, deux
   déclinaisons ») par la réalité livrée : une gamme de modèles nommés
   d'après des capitales.

   ⚠ CE QU'ON N'A PAS, ET QU'ON N'INVENTERA PAS.
   Un seul modèle est renseigné — Ankara, reçu le 17/09 — et il n'a même
   pas de prix. Les dix autres n'ont ni surface, ni nombre de chambres,
   ni prix. Un site de constructeur qui annonce
   « 92 m² » sur une maison dont personne ne connaît la surface expose
   son client bien au-delà du désagrément d'un chiffre faux — c'est un
   engagement commercial. Les champs sont donc OPTIONNELS, et le code
   doit savoir se taire quand ils manquent plutôt que d'afficher un
   tiret ou un zéro.

   Le seul chiffre réel est le prix d'appel : 78 000 € pour Pékin,
   maison seule, hors terrain, hors adaptation (voir `REEL` dans
   ./essensya.ts).

   Pékin a reçu ses visuels le 17/09 : quatre vues extérieures, dont une
   retouchée à l'IA. Le modèle qui portait le prix d'appel sans avoir
   une seule image entre donc dans les grilles, et `/maisons/pekin`
   cesse de rendre 404.

   ⚠ IL RESTE HORS DE L'INDEX pour autant. `estPubliable()` exige une
   image ET un chiffre ; Pékin a les images, mais son `prixDepart` est
   vide. Les 78 000 € vivent dans `REEL` — le discours de l'accueil —
   pas dans la fiche du modèle. Les y recopier publierait la page :
   c'est un arbitrage éditorial, pas un détail technique, car elle
   n'aurait toujours ni surface, ni nombre de chambres, ni plan.

   ── LE SEUIL DE PUBLICATION ──
   Même discipline que les pages de zone (src/lib/geo.ts) : on ne
   publie pas une page qui n'a rien à dire. Une fiche de modèle sans
   surface ni prix, c'est une galerie d'images sans texte — exactement
   ce que Google appelle du contenu mince, et il ne se contente pas de
   l'ignorer, il dévalue le site qui en produit dix d'un coup. Voir
   `estPubliable()`.
   ════════════════════════════════════════════════════════════════ */

export interface Modele {
  /** Segment d'URL : « lisbonne ». Aussi la clé du catalogue de visuels. */
  slug: string;
  /** Nom commercial tel que le client l'écrit : « Lisbonne », « Athènes ». */
  nom: string;

  /* ── Caractéristiques ──
     Toutes optionnelles, et c'est le cœur du fichier. `undefined` ne
     veut pas dire « zéro », il veut dire « on ne sait pas encore ».
     Les gabarits testent la présence, jamais la valeur. */

  /** Surface habitable, en m². */
  surface?: number;
  chambres?: number;
  /** Nombre de pièces principales. */
  pieces?: number;
  /**
   * Y a-t-il un garage — et rien de plus.
   *
   * Le champ était `garageSurface?: number`. Le client a tranché en
   * livrant les chiffres d'Ankara : « indiquer s'il y a un garage ou
   * pas, sa superficie n'est pas importante ». Demander une surface
   * qu'il ne communiquera pas revenait à garantir que la ligne reste
   * vide sur les onze fiches.
   *
   * `false` et `undefined` ne disent PAS la même chose : `false` =
   * « pas de garage », information utile à afficher ; `undefined` =
   * « on ne sait pas », et la ligne disparaît.
   */
  garage?: boolean;
  /** Prix maison seule, hors terrain et hors adaptation. */
  prixDepart?: number;
  /** Une phrase : pour qui ce modèle est fait. */
  pour?: string;
}

/* ════ LE CATALOGUE ════
   Les onze modèles livrés avec leurs rendus.

   L'ordre est alphabétique et volontairement neutre : nous n'avons
   aucune donnée pour décider lequel mettre en avant. Le jour où les
   prix arriveront, l'entrée de gamme devrait ouvrir la liste — c'est
   l'argument du site.

   ⚠ NE PAS COMPLÉTER CES FICHES AU JUGÉ. Les champs vides attendent un
   tableau du client. Les remplir « en attendant » ferait disparaître le
   seul signal qui dit qu'ils manquent. */
const CATALOGUE: Modele[] = [
  /* Ankara : le SEUL modèle renseigné à ce jour, reçu le 17/09. Il n'a
     pas de prix — le client ne l'a pas communiqué — mais sa surface
     suffit à `estPubliable()`, ce qui en fait la première fiche
     indexable du site. Les dix autres attendent leur tableau. */
  { slug: "ankara", nom: "Ankara", surface: 75, chambres: 2, pieces: 3, garage: true },
  { slug: "athenes", nom: "Athènes" },
  { slug: "berlin", nom: "Berlin" },
  { slug: "dakar", nom: "Dakar" },
  { slug: "dublin", nom: "Dublin" },
  { slug: "hanoi", nom: "Hanoi" },
  { slug: "jakarta", nom: "Jakarta" },
  { slug: "lima", nom: "Lima" },
  { slug: "lisbonne", nom: "Lisbonne" },
  { slug: "londres", nom: "Londres" },
  /* Pékin : le modèle du prix d'appel. Quatre vues extérieures, aucune
     intérieure — le seul du catalogue dans ce cas. */
  { slug: "pekin", nom: "Pékin" },
];

/** Tous les modèles de la gamme, y compris ceux sans visuel. */
export const MODELES: readonly Modele[] = CATALOGUE;

export const modeleParSlug = (slug: string): Modele | null =>
  CATALOGUE.find((m) => m.slug === slug) ?? null;

/**
 * La façade d'un modèle, ou `null` s'il n'a pas de visuel.
 *
 * `null` reste une réponse valide : les appelants doivent l'écarter,
 * pas afficher un cadre vide. Depuis les visuels de Pékin, plus aucun
 * modèle du catalogue n'est dans ce cas — le prochain ajouté le sera,
 * et la garde doit rester.
 */
export const facadeDe = (m: Modele): Visuel | null => facade(m.slug);

/**
 * Les vues de la maison, dans l'ordre livré. Vide si aucun visuel.
 *
 * ⚠ LE PLAN EN EST EXCLU. Il vit dans le même catalogue, mais une
 * axonométrie glissée au milieu des rendus se lit comme une photo de la
 * maison — et surtout, elle mérite sa propre place sur la fiche : c'est
 * ce que les visiteurs regardent en premier.
 */
export const vuesDe = (m: Modele): Visuel[] =>
  (modeleVisuels(m.slug)?.vues ?? []).filter((v) => v.type !== "plan");

/** Le plan axonométrique du modèle, ou `null` — neuf sur onze aujourd'hui. */
export const planDe = (m: Modele): Visuel | null => planVisuel(m.slug);

/**
 * Les modèles montrables : ceux qui ont au moins une image.
 *
 * C'est le filtre des grilles et des listes. Il ne dit rien de la
 * qualité de la fiche — seulement qu'on a de quoi la représenter.
 */
export const modelesAvecVisuels = (): Modele[] =>
  CATALOGUE.filter((m) => facade(m.slug) !== null);

/**
 * Un modèle mérite-t-il sa page indexable ?
 *
 * Deux conditions, et les deux comptent :
 *   · des images, sans quoi il n'y a rien à montrer ;
 *   · au moins une surface OU un prix, sans quoi il n'y a rien à dire.
 *
 * Une galerie sans un seul chiffre est du contenu mince. Dix pages de
 * ce type publiées le même jour, toutes bâties sur le même gabarit,
 * sont le scénario que Google traite le plus sévèrement.
 *
 * Tant que la condition n'est pas remplie, la page peut EXISTER — le
 * client doit pouvoir la regarder — mais elle sort de l'index et du
 * sitemap. Le jour où le tableau des caractéristiques arrive, elle y
 * entre sans qu'on touche à une ligne de gabarit.
 */
export const estPubliable = (m: Modele): boolean =>
  facade(m.slug) !== null && (m.surface !== undefined || m.prixDepart !== undefined);

/** Les modèles réellement indexables. Ankara est le premier, depuis le 17/09. */
export const modelesPubliables = (): Modele[] => CATALOGUE.filter(estPubliable);

/**
 * Reste-t-il des modèles montrables sans un seul chiffre ?
 *
 * ⚠ CE N'EST PAS « AUCUN MODÈLE N'EST DOCUMENTÉ ». La fonction testait
 * `modelesPubliables().length === 0`, ce qui était équivalent tant que
 * les onze fiches étaient logées à la même enseigne. La surface d'Ankara
 * a rompu l'équivalence : la bascule serait passée à `false`, effaçant
 * de /maisons la phrase « les caractéristiques arrivent » AU MOMENT
 * PRÉCIS où elle devient vraie pour les dix autres. Une grille de onze
 * cartes dont une seule porte des chiffres, sans rien pour l'expliquer,
 * c'est l'effet « site inachevé » que cette phrase existe pour éviter.
 *
 * Elle s'éteindra d'elle-même le jour où les onze seront documentés.
 */
export const gammeIncomplete = (): boolean =>
  modelesPubliables().length < modelesAvecVisuels().length;

/* ──────────────────────────────────────────────────────────────────
   CE QU'ON SAIT DIRE D'UN MODÈLE, ET EN UN SEUL ENDROIT

   Trois pages composaient chacune leur version de la même phrase : la
   fiche (title et description), l'écran Référencement du back-office
   (le défaut affiché en gris au client) et la carte de la grille. Elles
   avaient déjà divergé — le back-office promettait « La maison Ankara,
   en images » là où la page servait ses 75 m².

   ⚠ LE PRIX DE GAMME EST PASSÉ EN PARAMÈTRE, il n'est pas importé.
   `essensya.ts` importe `MODELES` d'ici : lire `PRICE_FROM` depuis ce
   fichier fermerait le cycle, et un `const` lu pendant l'initialisation
   croisée des deux modules vaut `undefined` sans prévenir.
   ────────────────────────────────────────────────────────────────── */

/** Les caractéristiques connues, prêtes à énumérer. Vide si on ne sait rien. */
export const specsModele = (m: Modele): string[] =>
  [
    m.surface !== undefined ? fmtSurface(m.surface) : null,
    /* Le pluriel se calcule. Le gabarit écrivait « ${m.chambres} chambres »
       en dur : le premier T2 du catalogue aurait affiché « 1 chambres »
       dans un résultat Google. */
    m.chambres !== undefined
      ? `${m.chambres} chambre${m.chambres > 1 ? "s" : ""}`
      : null,
    m.pieces !== undefined ? `${m.pieces} pièces` : null,
    m.garage === true ? "garage" : m.garage === false ? "sans garage" : null,
  ].filter(Boolean) as string[];

/** Le titre de la fiche, avec ce qu'on sait — et rien de plus. */
export const titreModele = (m: Modele): string => {
  const s = specsModele(m).slice(0, 2).join(", ");
  return s ? `Maison ${m.nom} : ${s}` : `Maison ${m.nom}`;
};

/**
 * La description servie à Google.
 *
 * ⚠ « DANS UNE GAMME À PARTIR DE », jamais « à partir de » tout court.
 * La branche avec caractéristiques collait le prix d'appel au nom du
 * modèle : « La maison Ankara : 75 m², 2 chambres […] à partir de
 * 78 000 € ». À l'écran, la mention qui nomme Pékin rattrapait
 * l'ambiguïté ; dans un résultat de recherche, rien ne la rattrape. Ce
 * texte était invisible tant que la fiche portait `noindex` — il devient
 * la vitrine du premier modèle indexé.
 */
export const descriptionModele = (m: Modele, prixGamme: string): string => {
  const s = specsModele(m);
  const queue = `Un plan optimisé jusqu'au dernier mètre carré, dans une gamme à partir de ${prixGamme} hors terrain.`;
  return s.length > 0
    ? `Maison ${m.nom} : ${s.join(", ")}. ${queue}`
    : `La maison ${m.nom}, en images. ${queue}`;
};

/**
 * Les modèles mis en avant hors contexte — le pied de page.
 *
 * Les publiables d'abord : ce sont les seules fiches qui peuvent
 * recevoir du jus utilement. Le pied de page listait `MODELES.slice(0, 3)`,
 * soit Ankara, Athènes et Berlin sur toutes les pages du site.
 */
export const modelesEnAvant = (n: number): Modele[] => [
  ...modelesPubliables(),
  ...modelesAvecVisuels().filter((x) => !estPubliable(x)),
].slice(0, n);

/**
 * Les modèles voisins d'une fiche, pour le maillage interne.
 *
 * ⚠ CE N'ÉTAIT PAS UN `slice(0, 3)`. Les trois premiers de l'ordre
 * alphabétique, c'est Ankara, Athènes et Berlin depuis les onze fiches —
 * et Lisbonne, Londres et Pékin sans un seul lien entrant. Pékin est le
 * modèle qui porte le prix d'appel du site.
 *
 * Les publiables d'abord, puis l'anneau à partir du modèle courant, pour
 * qu'aucun ne reste orphelin. L'ordre est déterministe, donc stable en
 * rendu statique, et la règle tient toute seule au douzième modèle.
 */
export const voisinsDe = (m: Modele, n: number): Modele[] => {
  const tous = modelesAvecVisuels();
  const i = tous.findIndex((x) => x.slug === m.slug);
  const anneau = [...tous.slice(i + 1), ...tous.slice(0, i)];
  return [
    ...anneau.filter(estPubliable),
    ...anneau.filter((x) => !estPubliable(x)),
  ].slice(0, n);
};

/* ⚠ GARDE-FOU DE COHÉRENCE.
   Le catalogue ci-dessus est écrit à la main ; les visuels viennent d'un
   script. Les deux peuvent diverger — un modèle renommé dans un dossier,
   un dossier ajouté sans entrée ici. On le signale au build plutôt que
   de le découvrir sur une page vide.

   On n'échoue PAS : un modèle livré en avance, sans entrée au
   catalogue, ne doit pas empêcher le site de se construire. On avertit,
   ce qui est visible dans le journal de déploiement. */
const slugsVisuels = new Set(modelesVisuels().map((x) => x.cle));
const slugsCatalogue = new Set(CATALOGUE.map((m) => m.slug));
const orphelins = [...slugsVisuels].filter((s) => !slugsCatalogue.has(s));
if (orphelins.length > 0) {
  console.warn(
    `[gamme] visuels sans entrée au catalogue : ${orphelins.join(", ")}. ` +
      `Ajoutez-les dans src/data/gamme.ts, sinon ils ne s'afficheront nulle part.`,
  );
}

/* ⚠ COLLISION AVEC LES ANCIENNES DÉCLINAISONS.
   « /maisons/2-chambres » et « /maisons/3-chambres » sont redirigés en
   permanence vers /maisons (voir `redirects()` dans next.config.ts).
   Si un modèle de la gamme portait un jour l'un de ces slugs, la
   redirection l'éclipserait POUR TOUJOURS : sa fiche deviendrait
   inaccessible, sans qu'aucun test ne le signale — une redirection ne
   casse rien, elle détourne.

   On échoue donc au chargement du module, c'est-à-dire au build. Une
   page inaccessible en silence coûte bien plus qu'un build rouge. */
const REDIRIGES = ["2-chambres", "3-chambres"];
const collisions = CATALOGUE.filter((m) => REDIRIGES.includes(m.slug));
if (collisions.length > 0) {
  throw new Error(
    `[gamme] Un modèle porte le slug d'une ancienne déclinaison redirigée : ` +
      `${collisions.map((m) => m.slug).join(", ")}. Sa fiche serait inaccessible. ` +
      `Renommez le modèle, ou retirez la redirection de next.config.ts.`,
  );
}
