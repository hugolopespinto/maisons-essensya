import {
  modeles as modelesVisuels,
  facade,
  modele as modeleVisuels,
  plan as planVisuel,
  type Visuel,
} from "./visuels";
import { texteDe } from "./textes-modeles";
import { fmtSurface } from "@/lib/format";
import type { IconName } from "@/types";

/* ════════════════════════════════════════════════════════════════
   LA GAMME — vingt modèles, et ce qu'on en sait

   Ce fichier remplace la prémisse mono-produit (« une maison, deux
   déclinaisons ») par la réalité livrée : une gamme de modèles nommés
   d'après des capitales.

   ⚠ CE QU'ON N'A PAS, ET QU'ON N'INVENTERA PAS.
   Le tableau du client (08/10) donne, pour chaque modèle, le nombre de
   chambres, la surface et la présence d'un garage. Ni prix par modèle,
   ni nombre de pièces (sauf Ankara, reçu le 17/09, et Athènes, tiré de
   son texte du 14/10). Un site de constructeur qui annonce « 92 m² » sur une maison
   dont personne ne connaît la surface expose son client bien au-delà
   du désagrément d'un chiffre faux — c'est un engagement commercial.
   Les champs sont donc OPTIONNELS, et le code doit savoir se taire
   quand ils manquent plutôt que d'afficher un tiret ou un zéro.

   Le seul prix réel est le prix d'appel : 78 000 € pour Pékin,
   maison seule, hors terrain, hors adaptation (voir `REEL` dans
   ./essensya.ts). Il vit dans `REEL` — le discours de l'accueil —
   pas dans la fiche du modèle : l'y recopier est un arbitrage
   éditorial, pas un détail technique.

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
   * `false` = « pas de garage », `undefined` = « on ne sait pas ». À
   * l'écran, les deux font disparaître la ligne : à la demande du
   * client (23/10), le garage ne se mentionne que quand il y en a un.
   * `false` reste écrit pour garder le tableau du client lisible ici.
   */
  garage?: boolean;
  /** Prix maison seule, hors terrain et hors adaptation. */
  prixDepart?: number;
  /** Une phrase : pour qui ce modèle est fait. */
  pour?: string;
  /**
   * L'adresse de la visite virtuelle du modèle (mon.plan3d.immo), telle
   * que le client l'a livrée le 24/11 dans « LES VISITES VIRTUELLES DES
   * MODÈLES ESSENSYA ». Dix-neuf modèles sur vingt : Pékin n'en a pas
   * encore. Sans adresse, la fiche n'affiche pas le bouton.
   */
  visite?: string;
}

/** Les visites virtuelles du client partagent toutes la même adresse,
 *  au dossier du projet près. */
const visite3d = (projet: string) =>
  `https://mon.plan3d.immo/3dhd/upload/${projet}/visitevirtuellehbm/`;

/* ════ LE CATALOGUE ════
   Vingt modèles, ceux que le client compte « à date » le 24/11.

   Les onze premiers portent leurs chiffres tels que le tableau du client
   du 08/10 les donne : chambres, surface habitable, garage. Sa colonne
   « Garage » porte « Oui » ou « - » : le tiret est lu comme « pas de
   garage » (`false`), qui ne s'affiche pas.

   Les neuf suivants (Oslo… Vienne) sont entrés le 24/11 avec leurs
   rendus et leurs plans. ⚠ LEURS CHIFFRES NE VIENNENT PAS DU TABLEAU,
   qui n'a été recopié que pour les onze premiers et n'est plus
   disponible : ils sont lus dans le texte que le client a livré pour
   chacun le 14/10 (src/data/textes-modeles/). Deux exceptions, PROVISOIRES :
   Panama (« près de 100 m² ») et Prague (« plus de 100 m² ») affichent
   100 m² en attendant leur surface exacte, demandée au client le 24/11.
   Le garage suit le texte et le rendu — Paris et Prague en ont un, Rome
   le cite comme option, il n'est donc pas compté.

   Monaco, vingt et unième modèle du tableau, n'est pas dans la livraison
   du 24/11 : il reste dehors, son texte attend.

   L'ordre est alphabétique et volontairement neutre, comme le tableau.
   Le jour où les prix arriveront, l'entrée de gamme devrait ouvrir la
   liste — c'est l'argument du site.

   ⚠ NE PAS COMPLÉTER CES FICHES AU JUGÉ. Les champs absents (prix,
   pièces) attendent le client. Les remplir « en attendant » ferait
   disparaître le seul signal qui dit qu'ils manquent.

   ── LES VISITES VIRTUELLES ──
   Recopiées du document Word du client (24/11), lien par lien. Chacune a
   été ouverte : le titre de la page porte bien le nom du modèle. */
const CATALOGUE: Modele[] = [
  /* Ankara : ses trois pièces viennent de sa fiche du 17/09 ; le tableau
     du 08/10 ne compte pas les pièces. */
  { slug: "ankara", nom: "Ankara", surface: 75, chambres: 2, pieces: 3, garage: true,
    visite: visite3d("202302/prj_62766/_v6/114") },
  /* Athènes : ses cinq pièces viennent de son texte du 14/10 (« ses 4
     chambres, ses 5 pièces »). Berlin écrit « 4 pièces, dont 3 chambres
     et un garage » — le garage compté comme une pièce rend le chiffre
     ambigu : il attend le client. Paris écrit la même chose. */
  { slug: "athenes", nom: "Athènes", surface: 103, chambres: 4, pieces: 5, garage: false,
    visite: visite3d("202302/prj_62368/_v4/5760603_0/106") },
  { slug: "berlin", nom: "Berlin", surface: 80, chambres: 3, garage: true,
    visite: visite3d("202302/prj_62730/_v6/114") },
  { slug: "dakar", nom: "Dakar", surface: 94, chambres: 3, garage: false,
    visite: visite3d("202302/prj_62368/_v4/5760603_1/106") },
  { slug: "dublin", nom: "Dublin", surface: 95, chambres: 3, garage: true,
    visite: visite3d("202303/prj_62906/_v4/114") },
  { slug: "hanoi", nom: "Hanoi", surface: 84, chambres: 3, garage: false,
    visite: visite3d("202302/prj_62368/_v4/5760603_2/106") },
  { slug: "jakarta", nom: "Jakarta", surface: 90, chambres: 3, garage: false,
    visite: visite3d("202404/prj_68144/_v2/114") },
  { slug: "lima", nom: "Lima", surface: 75, chambres: 3, garage: false,
    visite: visite3d("202303/prj_63124/_v4/114") },
  { slug: "lisbonne", nom: "Lisbonne", surface: 94, chambres: 3, garage: true,
    visite: visite3d("202303/prj_63130/_v3/114") },
  { slug: "londres", nom: "Londres", surface: 75, chambres: 2, garage: false,
    visite: visite3d("202404/prj_68146/_v2/114") },
  /* Oslo : « 100 m² organisés en 4 pièces » (texte du 14/10). */
  { slug: "oslo", nom: "Oslo", surface: 100, chambres: 3, pieces: 4, garage: false,
    visite: visite3d("202302/prj_62762/_v6/114") },
  /* Panama : le texte dit « de près de 100 m² ». 100 m² affichés en
     attendant la surface exacte, demandée au client (décision du 24/11). */
  { slug: "panama", nom: "Panama", surface: 100, chambres: 3, garage: false,
    visite: visite3d("202303/prj_62912/_v5/114") },
  { slug: "paris", nom: "Paris", surface: 85, chambres: 3, garage: true,
    visite: visite3d("202303/prj_62910/_v4/114") },
  /* Pékin : le modèle du prix d'appel. Six vues depuis le 24/11, dont
     quatre intérieures ; pas encore de plan ni de visite virtuelle. */
  { slug: "pekin", nom: "Pékin", surface: 50, chambres: 1, garage: false },
  /* Prague : « 5 pièces », « 4 chambres », « garage attenant ». Le texte
     dit « plus de 100 m² » : 100 m² affichés en attendant la surface
     exacte, demandée au client (décision du 24/11). */
  { slug: "prague", nom: "Prague", surface: 100, chambres: 4, pieces: 5, garage: true,
    visite: visite3d("202302/prj_62628/_v5/114") },
  { slug: "quito", nom: "Quito", surface: 85, chambres: 3, garage: false,
    visite: visite3d("202302/prj_62368/_v4/5760603_3/106") },
  /* Rome : le garage n'est cité que comme adaptation possible du plan. */
  { slug: "rome", nom: "Rome", surface: 95, chambres: 3, garage: false,
    visite: visite3d("202303/prj_63128/_v3/114") },
  { slug: "stockholm", nom: "Stockholm", surface: 86, chambres: 3, garage: false,
    visite: visite3d("202303/prj_63126/_v3/114") },
  /* Tokyo : « 66 m², répartie en 3 pièces ». */
  { slug: "tokyo", nom: "Tokyo", surface: 66, chambres: 2, pieces: 3, garage: false,
    visite: visite3d("202302/prj_62368/_v4/5760603_4/106") },
  { slug: "vienne", nom: "Vienne", surface: 93, chambres: 3, garage: false,
    visite: visite3d("202303/prj_62908/_v4/114") },
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

/** Le plan axonométrique du modèle, ou `null` — Pékin seul depuis les
 *  plans du 24/11. */
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
 *   · une surface, un prix OU le texte rédigé du modèle, sans quoi il
 *     n'y a rien à dire.
 *
 * Une galerie sans un seul chiffre est du contenu mince. Dix pages de
 * ce type publiées le même jour, toutes bâties sur le même gabarit,
 * sont le scénario que Google traite le plus sévèrement.
 *
 * ⚠ LE TEXTE COMPTE DEPUIS LE 24/11. La règle date d'avant les textes du
 * 14/10, quand une fiche sans chiffre n'était qu'une galerie. Une fiche
 * qui porte deux mille mots écrits pour une requête précise n'est pas
 * mince, même sans surface : la garder hors index jetterait exactement
 * ce pour quoi le client l'a fait rédiger. Aucun des vingt modèles n'en
 * dépend aujourd'hui ; la règle vaut pour le prochain qui arrivera avec
 * son texte mais sans ses chiffres.
 *
 * Tant que la condition n'est pas remplie, la page peut EXISTER — le
 * client doit pouvoir la regarder — mais elle sort de l'index et du
 * sitemap. Le jour où le tableau des caractéristiques arrive, elle y
 * entre sans qu'on touche à une ligne de gabarit.
 */
export const estPubliable = (m: Modele): boolean =>
  facade(m.slug) !== null &&
  (m.surface !== undefined || m.prixDepart !== undefined || texteDe(m.slug) !== null);

/** Les modèles réellement indexables : Ankara depuis le 17/09, les onze
 *  depuis le tableau du 08/10, les vingt depuis la livraison du 24/11. */
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
 * Elle s'est éteinte d'elle-même avec le tableau du 08/10, qui documente
 * les onze ; elle se rallumera pour un modèle ajouté sans ses chiffres.
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
    /* Pas de « sans garage » : on ne parle du garage que s'il existe. */
    m.garage === true ? "garage" : null,
  ].filter(Boolean) as string[];

/**
 * Les mêmes caractéristiques, en pictos : le chiffre, puis ce qu'il
 * compte — la lecture des fiches annonce. Partagé par la fiche du modèle
 * et la vitrine de /maisons, qui l'écrivaient chacune de leur côté.
 */
export const pictosModele = (m: Modele): { icon: IconName; value: string; label: string }[] =>
  [
    m.surface !== undefined
      ? { icon: "surface" as const, value: fmtSurface(m.surface), label: "Surface habitable" }
      : null,
    /* Pékin a une seule chambre : « 1 Chambres » s'affichait. */
    m.chambres !== undefined
      ? { icon: "bed" as const, value: String(m.chambres), label: m.chambres > 1 ? "Chambres" : "Chambre" }
      : null,
    m.pieces !== undefined ? { icon: "door" as const, value: String(m.pieces), label: "Pièces" } : null,
    /* « Oui », et non une surface : le client a dit que la superficie du
       garage n'avait pas d'importance. Sans garage, pas de picto du tout
       — un « Garage : Non » à côté du prix se lit comme un manque. */
    m.garage === true ? { icon: "garage" as const, value: "Oui", label: "Garage" } : null,
  ].filter((p) => p !== null);

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
