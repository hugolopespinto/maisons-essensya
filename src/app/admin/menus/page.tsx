import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AGENCIES, ESSENSYA_DATA, VERSIONS } from "@/data/essensya";
import { articlesPublies } from "@/lib/blog";
import { agencyUrl, deptUrl, houseUrl, landingUrl, versionUrl } from "@/lib/format";
import { departementsPubliables } from "@/lib/geo";
import { getContent, isWritable, patchContent } from "@/lib/store";
import type { ColonneFooter, LienMenu, Menus } from "@/lib/store/types";
import { assertAdmin, requireAdmin } from "../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — MENUS

   L'équivalent de « Apparence → Menus » : la navigation de l'en-tête et
   les colonnes du pied de page. Trois partis pris méritent d'être écrits.

   1. PAS DE GLISSER-DÉPOSER. Des boutons « monter » / « descendre »
      suffisent à réordonner, fonctionnent au clavier, s'annoncent au
      lecteur d'écran et ne dépendent d'aucune bibliothèque. Un tableau
      accessible vaut mieux qu'un glisser-déposer inaccessible — et sur
      un menu de cinq entrées modifié deux fois par an, la différence de
      confort est nulle.

   2. UN SEUL FORMULAIRE, PLUSIEURS BOUTONS. Chaque bouton porte son
      opération dans son `value` (`h.monter:2`, `l.suppr:1:3`…), et
      l'action RELIT l'intégralité des champs avant de l'appliquer :
      déplacer une ligne ne fait jamais perdre une saisie en cours dans
      une autre. Zéro ligne de JavaScript, le formulaire fonctionne même
      script désactivé.

   3. ON AVERTIT, ON N'INTERDIT PAS. Le `href` reste libre : le client
      voudra un jour pointer vers une prise de rendez-vous externe, un
      PDF ou un `tel:`. En revanche chaque adresse interne est confrontée
      aux routes réellement servies par `src/app/` — un lien mort est la
      première avarie d'un site repris en main par son propriétaire, et
      il ne se voit pas depuis le back-office tant que personne ne l'a
      cliqué.

   ⚠ CE QUI N'EST PAS ENCORE BRANCHÉ : `src/components/Header.tsx` et
   `src/components/Footer.tsx` ont toujours leurs liens écrits en dur.
   Cet écran ÉCRIT la donnée (`Content.menus`) ; il reste à la faire lire
   par ces deux composants. Le bandeau d'avertissement en tête de page le
   dit au client — il est à retirer le jour du branchement.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Menus",
  robots: { index: false, follow: false },
};

/* ──────────────────────────────────────────────────────────────────
   LES ROUTES DU SITE

   Relevées dans `src/app/`. Elles servent deux fois : en suggestions
   (le `<datalist>` du champ adresse) et en vérification (un lien interne
   qui n'y figure pas est signalé). Les routes dynamiques sont dépliées
   depuis leurs sources réelles — `generateStaticParams()` fait la même
   chose avec les mêmes données.

   ⚠ Cette liste est écrite à la main : une page ajoutée à `src/app/`
   doit y être ajoutée, faute de quoi le back-office signalera à tort un
   lien mort. Le coût est assumé — lire l'arborescence du système de
   fichiers à l'exécution ne fonctionne pas sur un hébergement
   serverless, où les fichiers sources du build ne sont plus là.
   ────────────────────────────────────────────────────────────────── */
type Suggestion = { href: string; label: string };

const PAGES_FIXES: Suggestion[] = [
  { href: "/", label: "Accueil" },
  { href: "/maisons", label: "La maison" },
  { href: "/concept", label: "Notre concept" },
  { href: "/annonces", label: "Terrains & opportunités" },
  { href: "/terrains", label: "Où nous construisons" },
  { href: "/realisations", label: "Réalisations" },
  { href: "/agences", label: "Nos agences" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cookies", label: "Gestion des cookies" },
];

/* Route réelle, mais réservée à l'équipe technique : on ne la propose
   pas au client, on se contente de ne pas la signaler comme morte. */
const ROUTES_TECHNIQUES = ["/styleguide"];

/** "/maisons/" et "/maisons" désignent la même route. */
function normaliseChemin(p: string): string {
  const sans = p.trim().replace(/\/+$/, "");
  return sans === "" ? "/" : sans;
}

/* ──────────────────────────────────────────────────────────────────
   LES MENUS ACTUELLEMENT PUBLIÉS

   Recopiés de `src/components/Header.tsx` et `src/components/Footer.tsx`
   — rien d'inventé : c'est mot pour mot ce que le visiteur voit
   aujourd'hui. Tant que rien n'a été enregistré, le formulaire s'ouvre
   sur ces liens-là. Le client remet donc en forme un menu qu'il
   reconnaît, au lieu de reconstruire de mémoire une navigation depuis
   une page blanche — et sans risque d'en perdre une entrée au passage.

   Le premier enregistrement fait basculer la donnée dans le stockage ;
   ces constantes ne sont alors plus consultées.
   ────────────────────────────────────────────────────────────────── */
const lien = (id: string, label: string, href: string, ordre: number): LienMenu => ({
  id,
  label,
  href,
  ordre,
});

const HEADER_ACTUEL: LienMenu[] = [
  lien("h-maison", "La maison", houseUrl(), 0),
  lien("h-annonces", "Terrains & opportunités", "/annonces", 1),
  lien("h-concept", "Notre concept", "/concept", 2),
  lien("h-agences", "Nos agences", "/agences", 3),
];

const colonne = (
  id: string,
  titre: string,
  liens: [string, string][],
  ordre: number,
): ColonneFooter => ({
  id,
  titre,
  liens: liens.map(([label, href], i) => lien(`${id}-${i}`, label, href, i)),
  ordre,
});

/**
 * Les vraies zones, posées dans la colonne « Où nous construisons » du
 * pied de page par défaut. Elle est livrée VIDE dans `FOOTER_ACTUEL` :
 * son contenu dépend du stock, et le back-office doit montrer au client
 * ce que le site affiche réellement, pas une liste figée qui l'a déjà
 * trahi une fois.
 */
function avecZones(
  colonnes: ColonneFooter[],
  zones: { nom: string; code: string; slug: string }[],
): ColonneFooter[] {
  return colonnes.map((c) =>
    c.id === "f-depts"
      ? {
          ...c,
          liens: zones.map((z, i) =>
            lien(`f-depts-${i}`, `${z.nom} (${z.code})`, deptUrl(z.slug), i),
          ),
        }
      : c,
  );
}

const FOOTER_ACTUEL: ColonneFooter[] = [
  colonne(
    "f-maison",
    "La maison",
    [
      ["La maison", houseUrl()],
      ...VERSIONS.map((v): [string, string] => [`Version ${v.label}`, versionUrl(v)]),
      ["Ce qui est compris", `${houseUrl()}#prix`],
    ],
    0,
  ),
  colonne(
    "f-terrains",
    "Terrains",
    [
      ["Tous nos terrains", "/annonces"],
      ["Terrain seul", "/annonces?type=terrain"],
      ["Terrain + maison", "/annonces?type=terrain-maison"],
      ["Demander un rappel", "/contact"],
    ],
    1,
  ),
  /* Les zones réelles sont injectées à l'affichage : voir `avecZones()`.
     Écrites en dur ici, elles annonçaient deux départements absents du
     flux et pointaient vers /annonces?dept=NN, qui est /annonces. */
  colonne("f-depts", "Où nous construisons", [], 2),
  colonne(
    "f-essensya",
    "Essensya",
    [
      ["Notre concept", "/concept"],
      ["Nos engagements", "/concept#engagements"],
      ["Nos réalisations", "/realisations"],
      ["Nos agences", "/agences"],
      ["Contact", "/contact"],
    ],
    3,
  ),
];

/* ──────────────────────────────────────────────────────────────────
   DIAGNOSTIC D'UNE ADRESSE
   ────────────────────────────────────────────────────────────────── */
type Etat = { niveau: "ok" | "info" | "alerte"; message: string };

function analyser(l: LienMenu, connues: Set<string>, brouillons: Set<string>): Etat {
  const label = l.label.trim();
  const href = l.href.trim();

  if (!label && !href) {
    return { niveau: "info", message: "Ligne vide : elle sera ignorée à l'enregistrement." };
  }
  if (!label) {
    return {
      niveau: "alerte",
      message: "Libellé manquant : sans texte, le lien ne peut pas être affiché.",
    };
  }
  if (!href) {
    return { niveau: "alerte", message: "Adresse manquante : ce lien ne mène nulle part." };
  }
  if (/^http:\/\//i.test(href)) {
    return {
      niveau: "alerte",
      message: "Adresse non sécurisée (http://). Vérifiez si le site existe en https://.",
    };
  }
  if (/^https:\/\//i.test(href)) {
    return { niveau: "info", message: "Lien externe : il emmène le visiteur hors du site." };
  }
  if (/^(mailto|tel):/i.test(href)) {
    return { niveau: "info", message: "Lien de contact (e-mail ou téléphone)." };
  }
  if (href.startsWith("#")) {
    return {
      niveau: "info",
      message: "Ancre : elle ne fonctionne que sur la page où le menu est affiché.",
    };
  }
  if (!href.startsWith("/")) {
    return {
      niveau: "alerte",
      message:
        "Adresse incomplète : une page du site commence par « / », un site externe par « https:// ».",
    };
  }

  /* Le paramètre et l'ancre ne changent pas la page visée : /annonces et
     /annonces?dept=17 sont la même route. */
  const chemin = normaliseChemin(href.split("#")[0].split("?")[0]);

  if (connues.has(chemin)) return { niveau: "ok", message: "" };
  if (chemin.startsWith("/annonces/")) {
    return {
      niveau: "info",
      message:
        "Fiche d'annonce : elle vient du flux Vitahome et disparaîtra quand le bien sera vendu.",
    };
  }
  if (brouillons.has(chemin)) {
    return {
      niveau: "alerte",
      message: "Cet article est en brouillon : la page n'existe pas encore sur le site public.",
    };
  }
  return {
    niveau: "alerte",
    message: "Cette page n'existe pas sur le site : le lien mènera à une page « introuvable ».",
  };
}

/* ──────────────────────────────────────────────────────────────────
   LECTURE DU FORMULAIRE
   ────────────────────────────────────────────────────────────────── */
const txt = (v: FormDataEntryValue | null): string =>
  typeof v === "string" ? v.trim().slice(0, 300) : "";

/** Identifiant conservé s'il est plausible, régénéré sinon : il vient du
 *  client, il ne doit ni être vide ni servir à autre chose qu'à nommer
 *  une ligne. */
const idDe = (v: FormDataEntryValue | null): string => {
  const s = typeof v === "string" ? v.trim() : "";
  return /^[A-Za-z0-9_-]{1,64}$/.test(s) ? s : randomUUID();
};

/** Garde-fou de boucle : une valeur venue du client ne dimensionne rien
 *  sans plafond. */
const compte = (v: FormDataEntryValue | null, max: number): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : 0;
};

const MAX_LIENS = 60;
const MAX_COLONNES = 12;

const videLien = (): LienMenu => ({ id: randomUUID(), label: "", href: "", ordre: 0 });

/** Renumérote après coup : `ordre` est l'index, toujours. Le stockage ne
 *  contient jamais deux liens de même rang. */
const ranger = (liens: LienMenu[]): LienMenu[] => liens.map((l, i) => ({ ...l, ordre: i }));

export default async function MenusPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  /* Garde d'écran : le layout ne protège pas, il ne choisit que la
     coquille. Un lien masqué n'a jamais fermé une URL. */
  await requireAdmin();

  const { ok } = await searchParams;
  const content = await getContent();
  const inscriptible = await isWritable();

  /* Rien d'enregistré = le site publie encore ses liens codés en dur :
     on ouvre le formulaire dessus plutôt que sur du vide. */
  const heriteEntete = content.menus.header.length === 0;
  const heritePied = content.menus.footer.length === 0;
  const header = heriteEntete ? HEADER_ACTUEL : content.menus.header;
  const zones = await departementsPubliables();
  const footer = heritePied ? avecZones(FOOTER_ACTUEL, zones) : content.menus.footer;

  /* ════ Routes connues et suggestions ════ */
  /* Le filtre partagé, pas une quatrième copie approximative : celle-ci
     oubliait le slug, donc proposait un lien « /blog/ » sans article. */
  const enLigne = articlesPublies(content.articles);
  const brouillons = new Set(
    content.articles.filter((a) => a.brouillon || !a.publieLe).map((a) => `/blog/${a.slug}`),
  );

  /* Les agences viennent du contenu éditable dès qu'il en contient, sinon
     des données livrées — qui alimentent encore les pages publiques. Une
     agence désactivée n'est plus servie : la proposer serait fabriquer un
     lien mort. */
  const agences =
    content.agences.length > 0
      ? content.agences.filter((a) => a.actif).map((a) => ({ id: a.id, nom: a.nom }))
      : AGENCIES.map((a) => ({ id: a.id, nom: a.name }));

  const suggestions: Suggestion[] = [
    ...PAGES_FIXES,
    ...VERSIONS.map((v) => ({ href: versionUrl(v), label: `La maison — ${v.label}` })),
    ...agences.map((a) => ({ href: agencyUrl(a), label: `Agence ${a.nom}` })),
    ...enLigne.map((a) => ({ href: `/blog/${a.slug}`, label: `Article — ${a.titre}` })),
    /* Sans elles, le vérificateur signalerait comme lien mort une page de
       zone parfaitement valide — et le client corrigerait un lien juste. */
    ...zones.map((z) => ({ href: deptUrl(z.slug), label: `Terrains — ${z.nom}` })),
    ...Object.keys(ESSENSYA_DATA.landings).map((slug) => ({
      href: landingUrl(slug),
      label: `Page de campagne — ${slug}`,
    })),
  ];

  const connues = new Set([
    ...suggestions.map((s) => normaliseChemin(s.href)),
    ...ROUTES_TECHNIQUES,
  ]);

  const etatEntete = header.map((l) => analyser(l, connues, brouillons));
  const etatPied = footer.map((c) => c.liens.map((l) => analyser(l, connues, brouillons)));
  const alertes =
    etatEntete.filter((e) => e.niveau === "alerte").length +
    etatPied.flat().filter((e) => e.niveau === "alerte").length;

  /* ════════ ACTION ════════ */
  async function enregistrer(formData: FormData) {
    "use server";
    /* Une Server Action est un point d'entrée HTTP public : le garde est
       ICI, pas sur l'écran qui affiche le formulaire. */
    await assertAdmin();

    /* On relit TOUT avant d'appliquer l'opération : un clic sur « monter »
       ne doit pas effacer un libellé tapé trois champs plus bas. */
    const lireLien = (pre: string): LienMenu => ({
      id: idDe(formData.get(`${pre}_id`)),
      label: txt(formData.get(`${pre}_label`)),
      href: txt(formData.get(`${pre}_href`)),
      ordre: 0,
    });

    const entete: LienMenu[] = [];
    const nbEntete = compte(formData.get("hCount"), MAX_LIENS);
    for (let i = 0; i < nbEntete; i += 1) entete.push(lireLien(`h_${i}`));

    const colonnes: ColonneFooter[] = [];
    const nbColonnes = compte(formData.get("cCount"), MAX_COLONNES);
    for (let i = 0; i < nbColonnes; i += 1) {
      const liens: LienMenu[] = [];
      const nbLiens = compte(formData.get(`c_${i}_n`), MAX_LIENS);
      for (let j = 0; j < nbLiens; j += 1) liens.push(lireLien(`c_${i}_l_${j}`));
      colonnes.push({
        id: idDe(formData.get(`c_${i}_id`)),
        titre: txt(formData.get(`c_${i}_titre`)),
        liens,
        ordre: 0,
      });
    }

    /* L'opération voyage dans le `value` du bouton cliqué : un seul
       formulaire, une quinzaine de boutons, aucun JavaScript. */
    const brut = formData.get("op");
    const [op, a, b] = (typeof brut === "string" ? brut : "enregistrer").split(":");
    const i = Number(a);
    const j = Number(b);
    const col = colonnes[i];

    const echanger = <T,>(liste: T[], de: number, vers: number) => {
      if (de < 0 || vers < 0 || de >= liste.length || vers >= liste.length) return;
      [liste[de], liste[vers]] = [liste[vers], liste[de]];
    };

    if (op === "h.ajouter") entete.push(videLien());
    else if (op === "h.monter") echanger(entete, i, i - 1);
    else if (op === "h.descendre") echanger(entete, i, i + 1);
    else if (op === "h.suppr" && i >= 0 && i < entete.length) entete.splice(i, 1);
    else if (op === "c.ajouter") {
      colonnes.push({ id: randomUUID(), titre: "", liens: [videLien()], ordre: 0 });
    } else if (op === "c.monter") echanger(colonnes, i, i - 1);
    else if (op === "c.descendre") echanger(colonnes, i, i + 1);
    else if (op === "c.suppr" && col) colonnes.splice(i, 1);
    else if (op === "l.ajouter" && col) col.liens.push(videLien());
    else if (op === "l.monter" && col) echanger(col.liens, j, j - 1);
    else if (op === "l.descendre" && col) echanger(col.liens, j, j + 1);
    else if (op === "l.suppr" && col && j >= 0 && j < col.liens.length) col.liens.splice(j, 1);

    /* Purge au seul enregistrement — jamais après « ajouter », sinon la
       ligne qu'on vient de créer disparaîtrait aussitôt. On ne jette que
       le VRAIMENT vide : une ligne à moitié saisie est signalée à
       l'écran, elle n'est pas supprimée dans le dos du client. */
    const propre = op === "enregistrer";
    const utiles = (liens: LienMenu[]) =>
      propre ? liens.filter((l) => l.label !== "" || l.href !== "") : liens;

    const menus: Menus = {
      header: ranger(utiles(entete)),
      footer: colonnes
        .map((c) => ({ ...c, liens: ranger(utiles(c.liens)) }))
        .filter((c) => !propre || c.titre !== "" || c.liens.length > 0)
        .map((c, k) => ({ ...c, ordre: k })),
    };

    await patchContent("menus", menus);

    /* En-tête et pied de page sont rendus par le layout racine : toutes
       les pages publiques changent d'un coup. Revalider la seule accueil
       laisserait l'ISR servir l'ancien menu partout ailleurs. */
    revalidatePath("/", "layout");

    /* On revient à la section travaillée : après avoir ajouté un lien
       dans la troisième colonne du pied de page, se retrouver en haut de
       l'écran est une petite punition à chaque clic. */
    const ancre = op.startsWith("h.") ? "#entete" : propre ? "" : "#pied";
    redirect(`/admin/menus${propre ? "?ok=1" : ""}${ancre}`);
  }

  /* ════════ FRAGMENTS D'INTERFACE ════════
     Fonctions locales, pas composants : elles ne portent aucun état, et
     les déclarer ici leur donne accès aux diagnostics calculés plus haut
     sans les faire voyager en props à travers tout l'écran. */

  const diagnostic = (etat: Etat, id: string) =>
    etat.niveau === "ok" ? null : (
      <span className="adm-field__aide" id={id}>
        {etat.niveau === "alerte" ? (
          <>
            <span className="adm-badge adm-badge--off">À vérifier</span>{" "}
          </>
        ) : null}
        {etat.message}
      </span>
    );

  /** Une ligne de lien : libellé, adresse, diagnostic, déplacements.
   *  `pre` préfixe les noms de champs, les `op*` portent l'opération. */
  const ligneLien = (o: {
    l: LienMenu;
    etat: Etat;
    pre: string;
    opMonter: string;
    opDescendre: string;
    opSuppr: string;
    premier: boolean;
    dernier: boolean;
  }) => {
    const nom = o.l.label.trim() || o.l.href.trim() || "sans titre";
    return (
      <div key={o.l.id}>
        <input type="hidden" name={`${o.pre}_id`} value={o.l.id} />
        <div className="adm-grid">
          <div className="adm-field">
            <label htmlFor={`${o.pre}_label`}>Libellé</label>
            <input
              id={`${o.pre}_label`}
              name={`${o.pre}_label`}
              type="text"
              defaultValue={o.l.label}
              autoComplete="off"
              maxLength={300}
            />
          </div>
          <div className="adm-field">
            <label htmlFor={`${o.pre}_href`}>Adresse</label>
            <input
              id={`${o.pre}_href`}
              name={`${o.pre}_href`}
              type="text"
              defaultValue={o.l.href}
              list="routes-site"
              autoComplete="off"
              maxLength={300}
              aria-describedby={o.etat.niveau === "ok" ? undefined : `${o.pre}_etat`}
            />
            {diagnostic(o.etat, `${o.pre}_etat`)}
          </div>
        </div>
        <div className="adm-actions adm-actions--serre">
          <button
            type="submit"
            name="op"
            value={o.opMonter}
            className="c-btn"
            disabled={o.premier}
          >
            <span aria-hidden="true">↑</span>
            <span className="u-sr-only">Monter le lien {nom}</span>
          </button>
          <button
            type="submit"
            name="op"
            value={o.opDescendre}
            className="c-btn"
            disabled={o.dernier}
          >
            <span aria-hidden="true">↓</span>
            <span className="u-sr-only">Descendre le lien {nom}</span>
          </button>
          {/* Vérifier d'un clic où mène vraiment le lien — dans un nouvel
              onglet, pour ne pas perdre la saisie en cours. Sans
              préchargement : inutile de tirer une page qu'on n'ouvrira
              peut-être pas, et catastrophique si l'adresse est fausse. */}
          {o.l.href.trim() ? (
            <Link
              className="c-btn"
              href={o.l.href.trim()}
              target="_blank"
              rel="noopener noreferrer"
              prefetch={false}
            >
              Ouvrir <span aria-hidden="true">↗</span>
              <span className="u-sr-only"> le lien {nom} dans un nouvel onglet</span>
            </Link>
          ) : null}
          <button type="submit" name="op" value={o.opSuppr} className="c-btn c-btn--danger">
            Supprimer<span className="u-sr-only"> le lien {nom}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <form action={enregistrer}>
      {/* Les compteurs disent à l'action combien de champs relire. */}
      <input type="hidden" name="hCount" value={header.length} />
      <input type="hidden" name="cCount" value={footer.length} />

      {/* Soumission implicite (touche Entrée dans un champ) : sans ce
          bouton placé en tête du document, le navigateur déclencherait le
          premier bouton rencontré — ici « monter » du premier lien. */}
      <button
        type="submit"
        name="op"
        value="enregistrer"
        className="u-sr-only"
        tabIndex={-1}
        aria-hidden="true"
      >
        Enregistrer
      </button>

      {/* Suggestions communes à tous les champs d'adresse. La liste
          propose, elle n'impose pas : le champ reste libre. */}
      <datalist id="routes-site">
        {suggestions.map((s) => (
          <option key={s.href} value={s.href}>
            {s.label}
          </option>
        ))}
      </datalist>

      <div className="adm-head">
        <div>
          <span className="c-label c-label--accent">Apparence</span>
          <h1>Menus</h1>
        </div>
        <button type="submit" name="op" value="enregistrer" className="c-btn c-btn--solid">
          Enregistrer
        </button>
        <p>
          La navigation du haut de page et les colonnes du pied de page. Les flèches
          déplacent un lien : l&apos;ordre affiché ici est l&apos;ordre affiché sur le
          site. Commencez à taper une adresse pour voir la liste des pages existantes,
          ou saisissez librement une adresse extérieure au site.
        </p>
      </div>

      {ok ? (
        <p className="adm-note" role="status">
          Menus enregistrés. Les pages publiques ont été rafraîchies.
        </p>
      ) : null}

      {!inscriptible ? (
        <p className="adm-note adm-note--alerte">
          ⚠ <strong>Le stockage est en lecture seule sur cet hébergement.</strong> Vos
          modifications ne seront pas conservées. Voir la note d&apos;architecture en
          tête de <code>src/lib/store/index.ts</code>.
        </p>
      ) : null}

      {/* L'avertissement « ces menus ne pilotent pas encore le site » a été
          retiré : ils le pilotent depuis le recâblage. Il reste une chose
          que le client doit savoir, et qui n'est pas évidente — un menu
          saisi REMPLACE la navigation d'origine, il ne s'y ajoute pas. */}
      <p className="adm-note">
        <strong>Un menu enregistré remplace entièrement celui d&apos;origine.</strong>{" "}
        Si vous n&apos;ajoutez qu&apos;une seule entrée à l&apos;en-tête, elle sera la
        seule affichée — pensez à reprendre les liens que vous voulez garder.
        À l&apos;inverse, un menu <strong>entièrement vide</strong> rend au site sa
        navigation d&apos;origine : c&apos;est la façon de revenir en arrière.
      </p>

      {alertes > 0 ? (
        <p className="adm-note adm-note--alerte">
          ⚠{" "}
          <strong>
            {alertes === 1
              ? "Un lien est à vérifier"
              : `${alertes} liens sont à vérifier`}
          </strong>{" "}
          : leur adresse est incomplète, ou elle pointe vers une page qui n&apos;existe
          pas sur le site. Ils sont signalés ci-dessous.
        </p>
      ) : null}

      {/* ════ EN-TÊTE ════ */}
      <section className="adm-card" id="entete">
        <h2>Menu d&apos;en-tête</h2>
        <p className="adm-field__aide">
          Les liens affichés en haut de chaque page, de gauche à droite — et dans le
          même ordre dans le menu mobile. Quatre à six entrées : au-delà, la barre se
          replie et plus personne ne les voit.
          {heriteEntete
            ? " Les liens ci-dessous sont ceux affichés aujourd'hui, repris du code : corrigez-les, le premier enregistrement vous en donne la main."
            : ""}
        </p>
        <p className="adm-field__aide">
          Le bouton « Contact » et le numéro de téléphone du bandeau ne font pas partie
          de ce menu : ils restent affichés quoi qu&apos;il contienne.
        </p>

        {header.length === 0 ? (
          <p className="adm-empty">
            <strong>Aucun lien</strong>
            La barre de navigation ne proposerait plus que le bouton « Contact ».
          </p>
        ) : (
          header.map((l, i) =>
            ligneLien({
              l,
              etat: etatEntete[i],
              pre: `h_${i}`,
              opMonter: `h.monter:${i}`,
              opDescendre: `h.descendre:${i}`,
              opSuppr: `h.suppr:${i}`,
              premier: i === 0,
              dernier: i === header.length - 1,
            }),
          )
        )}

        <div className="adm-actions">
          <button type="submit" name="op" value="h.ajouter" className="c-btn">
            Ajouter un lien
          </button>
        </div>
      </section>

      {/* ════ PIED DE PAGE ════ */}
      <section className="adm-card" id="pied">
        <h2>Pied de page</h2>
        <p className="adm-field__aide">
          Le pied de page est organisé en colonnes : un titre, puis ses liens. C&apos;est
          le maillage interne du site — il est lu sur chaque page, et c&apos;est par là
          que se trouvent les pages qui ne figurent dans aucun menu principal.
          {heritePied
            ? " Les colonnes ci-dessous sont celles affichées aujourd'hui, reprises du code : corrigez-les, le premier enregistrement vous en donne la main."
            : ""}
        </p>
        <p className="adm-field__aide">
          Les mentions légales, la confidentialité et la gestion des cookies restent
          affichées tout en bas : elles sont obligatoires et ne dépendent pas de ces
          colonnes.
        </p>
      </section>

      {footer.length === 0 ? (
        <section className="adm-card">
          <p className="adm-empty">
            <strong>Aucune colonne</strong>
            Le pied de page n&apos;afficherait que les coordonnées et les mentions
            obligatoires.
          </p>
        </section>
      ) : null}

      {footer.map((c, i) => (
        <section className="adm-card" key={c.id}>
          <input type="hidden" name={`c_${i}_id`} value={c.id} />
          <input type="hidden" name={`c_${i}_n`} value={c.liens.length} />

          <h3>Colonne {i + 1}</h3>
          <div className="adm-grid">
            <div className="adm-field">
              <label htmlFor={`c_${i}_titre`}>Titre de la colonne</label>
              <input
                id={`c_${i}_titre`}
                name={`c_${i}_titre`}
                type="text"
                defaultValue={c.titre}
                autoComplete="off"
                maxLength={300}
              />
              <span className="adm-field__aide">
                Affiché en tête de colonne. Une colonne sans titre ni lien est supprimée
                à l&apos;enregistrement.
              </span>
            </div>
          </div>

          {c.liens.length === 0 ? (
            <p className="adm-empty">
              <strong>Aucun lien dans cette colonne</strong>
              Elle n&apos;afficherait que son titre.
            </p>
          ) : (
            c.liens.map((l, j) =>
              ligneLien({
                l,
                etat: etatPied[i][j],
                pre: `c_${i}_l_${j}`,
                opMonter: `l.monter:${i}:${j}`,
                opDescendre: `l.descendre:${i}:${j}`,
                opSuppr: `l.suppr:${i}:${j}`,
                premier: j === 0,
                dernier: j === c.liens.length - 1,
              }),
            )
          )}

          <div className="adm-actions">
            <button type="submit" name="op" value={`l.ajouter:${i}`} className="c-btn">
              Ajouter un lien
              <span className="u-sr-only"> à la colonne {c.titre || i + 1}</span>
            </button>
            <button
              type="submit"
              name="op"
              value={`c.monter:${i}`}
              className="c-btn"
              disabled={i === 0}
            >
              <span aria-hidden="true">↑</span>
              <span className="u-sr-only">
                Déplacer la colonne {c.titre || i + 1} vers la gauche
              </span>
            </button>
            <button
              type="submit"
              name="op"
              value={`c.descendre:${i}`}
              className="c-btn"
              disabled={i === footer.length - 1}
            >
              <span aria-hidden="true">↓</span>
              <span className="u-sr-only">
                Déplacer la colonne {c.titre || i + 1} vers la droite
              </span>
            </button>
            <button type="submit" name="op" value={`c.suppr:${i}`} className="c-btn c-btn--danger">
              Supprimer la colonne<span className="u-sr-only"> {c.titre || i + 1}</span>
            </button>
          </div>
        </section>
      ))}

      <div className="adm-actions">
        <button type="submit" name="op" value="c.ajouter" className="c-btn">
          Ajouter une colonne
        </button>
        <button type="submit" name="op" value="enregistrer" className="c-btn c-btn--solid">
          Enregistrer
        </button>
      </div>
    </form>
  );
}
