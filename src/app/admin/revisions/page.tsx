import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getContentFrais, patchContent, storeDriver } from "@/lib/store";
import { clientSupabase } from "@/lib/store/supabase";
import type {
  Agence,
  AnnonceOverride,
  Article,
  Media,
  Menus,
  PageEditable,
  Reglages,
  SeoEntry,
  Textes,
  TrackingConfig,
} from "@/lib/store/types";
import { assertAdmin, requireAdmin } from "../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — RÉVISIONS

   La table `content_versions` se remplit à chaque écriture depuis la
   première mise en production, et personne ne pouvait la lire. C'est
   pourtant elle qui décide si le client ose toucher à son site : sans
   filet, on n'essaie pas, ou on casse et on téléphone.

   TROIS PARTIS PRIS, dans l'ordre d'importance.

   1. ON MONTRE CE QUI A CHANGÉ, PAS L'INSTANTANÉ BRUT.
      Un instantané JSON ne dit rien à personne. Or la table ne stocke
      que l'état d'AVANT chaque écriture : le « après » d'une version,
      c'est l'instantané de la version SUIVANTE du même domaine — ou,
      pour la plus récente, la valeur vivante d'aujourd'hui. La
      comparaison est donc reconstruite ici, exactement, plutôt
      qu'approchée (voir `apres()`). Un diff approximatif présenté comme
      un diff serait pire que pas de diff du tout.

   2. LA VALEUR VIVANTE EST RELUE BRUTE, PAS VIA `getContent()`.
      `getContent()` normalise — il fusionne `PAGES_DEFAUT`, complète les
      domaines absents. Comparer un instantané brut à une valeur
      normalisée inventerait des modifications que personne n'a faites.
      Le « après » du plus récent est donc relu dans les tables, tel quel.

   3. RESTAURER EST UNE ÉCRITURE COMME UNE AUTRE.
      La restauration passe par `patchContent()`, donc par le magasin,
      donc par le journal : l'état d'avant la restauration est enregistré
      au passage. On ne peut pas se piéger en restaurant — c'est la
      condition pour que le bouton soit utilisable sans appréhension.
      La restauration n'écrit JAMAIS l'instantané envoyé par le
      navigateur : l'action relit la version en base à partir de son seul
      identifiant.

   SANS SUPABASE, il n'y a pas d'historique du tout : le pilote fichier
   écrit le JSON par-dessus lui-même. L'écran le dit en toutes lettres
   plutôt que d'afficher un tableau vide, qui laisserait croire que rien
   n'a jamais été modifié.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Révisions",
  robots: { index: false, follow: false },
};

const ROUTE = "/admin/revisions";

/** Assez pour balayer une journée de travail, pas assez pour noyer. */
const PAR_PAGE = 20;

/* ──────────────────────────────────────────────────────────────────
   LIRE UNE DONNÉE DONT ON NE SAIT RIEN

   Les instantanés sont du JSONB : ce sont des lignes SQL d'une version
   antérieure du schéma, ou des domaines JSON de forme libre. Rien
   n'garantit leur forme. Tout ce qui suit lit sans jamais supposer.
   ────────────────────────────────────────────────────────────────── */

const objet = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

const chaine = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const texteOuRien = (v: unknown): string | undefined => chaine(v) || undefined;

const nombreOuRien = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

/** Postgres rend « …+00:00 », le site manipule de l'ISO en Z. */
const isoOuRien = (v: unknown): string | undefined => {
  const s = chaine(v);
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

/** Un bloc SEO vide reste `undefined` : les gabarits testent sa présence. */
function seoDe(v: unknown): { title?: string; description?: string } | undefined {
  const o = objet(v);
  const title = texteOuRien(o.title);
  const description = texteOuRien(o.description);
  if (!title && !description) return undefined;
  return { ...(title ? { title } : {}), ...(description ? { description } : {}) };
}

const fmtDateHeure = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  /* Fuseau explicite : le serveur tourne en UTC, la date lue par le
     client doit être la sienne. */
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(d);
};

/* ──────────────────────────────────────────────────────────────────
   PORTÉES

   Le journal stocke des clés techniques : `content:seo`, `article:<uuid>`.
   Personne ne doit avoir à les décoder.
   ────────────────────────────────────────────────────────────────── */

/** Les six domaines rangés en JSONB dans la table `content`. */
const DOMAINES = {
  seo: "Référencement",
  tracking: "Tracking",
  textes: "Textes du site",
  menus: "Menus",
  reglages: "Réglages du site",
  pages: "Pages",
} as const;

type Domaine = keyof typeof DOMAINES;

const estDomaine = (v: string): v is Domaine => v in DOMAINES;

const FAMILLES: Record<string, string> = {
  content: "Réglages",
  article: "Article",
  annonce: "Annonce",
  agence: "Agence",
  media: "Média",
};

/** `content:seo` → `["content", "seo"]`. Le reste peut contenir des `:`. */
function decouper(scope: string): [string, string] {
  const i = scope.indexOf(":");
  return i < 0 ? [scope, ""] : [scope.slice(0, i), scope.slice(i + 1)];
}

/**
 * Ce qu'on affiche à la place de la clé technique.
 *
 * Le nom de l'objet est tiré de l'INSTANTANÉ, pas de la base : un
 * article supprimé n'a plus de ligne, mais son titre est dans la
 * version — c'est précisément l'entrée qu'on viendra chercher.
 */
function decrire(scope: string, snapshot: unknown): { famille: string; cible: string } {
  const [famille, reste] = decouper(scope);
  const o = objet(snapshot);
  const famLisible = FAMILLES[famille] ?? famille;

  if (famille === "content") {
    return {
      famille: famLisible,
      cible: estDomaine(reste) ? DOMAINES[reste] : reste || "—",
    };
  }
  const nom =
    chaine(o.titre) ||
    chaine(o.nom) ||
    chaine(o.ref) ||
    chaine(o.slug) ||
    /* Ni titre ni nom : on montre un identifiant court plutôt qu'un uuid
       de trente-six caractères qui écraserait la colonne. */
    (reste.length > 12 ? `${reste.slice(0, 8)}…` : reste) ||
    "—";
  return { famille: famLisible, cible: nom };
}

/* ── Le filtre de portée proposé à l'écran ──
   Les six domaines sont nommés un par un : « j'ai cassé le référencement
   hier » est une recherche réelle. Les autres familles sont regroupées —
   filtrer sur un article précis se fait en lisant la colonne, pas en
   choisissant un uuid dans une liste déroulante. Le suffixe `:*` marque
   un filtre par préfixe. */
const FILTRES: { valeur: string; label: string }[] = [
  { valeur: "", label: "Toutes les portées" },
  { valeur: "content:pages", label: "Pages" },
  { valeur: "content:textes", label: "Textes du site" },
  { valeur: "content:seo", label: "Référencement" },
  { valeur: "content:tracking", label: "Tracking" },
  { valeur: "content:menus", label: "Menus" },
  { valeur: "content:reglages", label: "Réglages du site" },
  { valeur: "article:*", label: "Blog" },
  { valeur: "annonce:*", label: "Annonces" },
  { valeur: "agence:*", label: "Agences" },
  { valeur: "media:*", label: "Médiathèque" },
];

const PERIODES: { valeur: string; label: string; jours: number }[] = [
  { valeur: "", label: "Depuis le début", jours: 0 },
  { valeur: "1", label: "Dernières 24 heures", jours: 1 },
  { valeur: "7", label: "7 derniers jours", jours: 7 },
  { valeur: "30", label: "30 derniers jours", jours: 30 },
  { valeur: "90", label: "90 derniers jours", jours: 90 },
  { valeur: "365", label: "12 derniers mois", jours: 365 },
];

/* ──────────────────────────────────────────────────────────────────
   COMPARAISON DE DEUX ÉTATS

   Les deux états sont aplatis en chemins-feuilles, puis comparés clé à
   clé. Les listes sont indexées par un champ identifiant quand elles en
   ont un (`cle`, `path`, `slug`…) plutôt que par leur rang : insérer une
   entrée en tête d'une liste ne doit pas faire apparaître vingt
   modifications imaginaires.
   ────────────────────────────────────────────────────────────────── */

/** Colonnes techniques : elles bougent à chaque écriture et ne disent rien. */
const TECHNIQUES = new Set([
  "id",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
]);

/** Champs qui identifient une entrée de liste, par ordre de préférence. */
const IDENTITES = ["cle", "path", "slug", "ref", "label", "titre", "nom", "poste", "event"];

const PROFONDEUR_MAX = 6;

function etiquette(valeur: unknown, rang: number): string {
  const o = objet(valeur);
  for (const k of IDENTITES) {
    const v = chaine(o[k]);
    if (v) return v.length > 48 ? `${v.slice(0, 48)}…` : v;
  }
  return `n° ${rang + 1}`;
}

/** Quelques colonnes SQL dont le nom brut se lit mal en français. */
const LISIBLES: Record<string, string> = {
  image_alt: "texte alternatif",
  publie_le: "date de publication",
  coup_de_coeur: "coup de cœur",
  chapo: "chapô",
  masquee: "masquée",
  valeur: "texte",
  ogImage: "image de partage",
  noindex: "retirée de Google",
};

const joli = (k: string): string => LISIBLES[k] ?? k.replace(/_/g, " ");

function aplatir(
  valeur: unknown,
  prefixe: string,
  sortie: Map<string, unknown>,
  profondeur = 0,
): void {
  if (valeur === null || typeof valeur !== "object" || profondeur >= PROFONDEUR_MAX) {
    sortie.set(prefixe, valeur);
    return;
  }
  if (Array.isArray(valeur)) {
    if (valeur.length === 0) {
      sortie.set(prefixe, "[liste vide]");
      return;
    }
    valeur.forEach((el, i) => {
      const nom = etiquette(el, i);
      aplatir(el, prefixe ? `${prefixe} › ${nom}` : nom, sortie, profondeur + 1);
    });
    return;
  }
  const entrees = Object.entries(valeur as Record<string, unknown>);
  if (entrees.length === 0) {
    sortie.set(prefixe, "[vide]");
    return;
  }
  for (const [k, v] of entrees) {
    if (profondeur === 0 && TECHNIQUES.has(k)) continue;
    aplatir(v, prefixe ? `${prefixe} › ${joli(k)}` : joli(k), sortie, profondeur + 1);
  }
}

const MAX_TEXTE = 180;

function lisible(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "oui" : "non";
  if (typeof v === "number") return String(v);
  const s = typeof v === "string" ? v : JSON.stringify(v);
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return "(vide)";
  return t.length > MAX_TEXTE ? `${t.slice(0, MAX_TEXTE)}…` : t;
}

type Etat = "ajout" | "retrait" | "modif";

interface Changement {
  chemin: string;
  etat: Etat;
  avant: string;
  apres: string;
}

/**
 * Ce qui sépare l'état `avant` de l'état `apres`.
 *
 * `apres === undefined` signifie « on ne sait pas » — jamais « vide » :
 * ce cas arrive si la version suivante n'a pas pu être lue, et l'écran
 * le dit plutôt que d'annoncer une suppression générale.
 */
function comparer(avant: unknown, apres: unknown): Changement[] {
  const a = new Map<string, unknown>();
  const b = new Map<string, unknown>();
  aplatir(avant, "", a);
  aplatir(apres, "", b);

  const chemins = [...new Set([...a.keys(), ...b.keys()])].sort();
  const sortie: Changement[] = [];

  for (const chemin of chemins) {
    const x = a.get(chemin);
    const y = b.get(chemin);
    if (JSON.stringify(x ?? null) === JSON.stringify(y ?? null)) continue;
    /* Absent AVANT = la valeur est apparue ; absente APRÈS = elle a
       disparu. L'inverse se lit à l'écran comme une restauration qui
       ferait le contraire de ce qu'elle fait. */
    const etat: Etat = !a.has(chemin) ? "ajout" : !b.has(chemin) ? "retrait" : "modif";
    sortie.push({
      chemin: chemin || "valeur",
      etat,
      avant: a.has(chemin) ? lisible(x) : "—",
      apres: b.has(chemin) ? lisible(y) : "—",
    });
  }
  return sortie;
}

/* ──────────────────────────────────────────────────────────────────
   LECTURE DU JOURNAL
   ────────────────────────────────────────────────────────────────── */

interface LigneVersion {
  id: number;
  scope: string;
  snapshot: unknown;
  created_at: string;
  created_by: string | null;
}

type Apres =
  /** État suivant connu — comparaison exacte possible. */
  | { connu: true; valeur: unknown; origine: "version" | "actuel" }
  /** Illisible (table absente, base en erreur) : on ne compare pas. */
  | { connu: false };

/**
 * L'état d'APRÈS chaque version affichée.
 *
 * Pour deux versions consécutives d'une même portée, l'état d'après de
 * la plus ancienne EST l'instantané de la plus récente : la page en
 * cours suffit donc à comparer la plupart des lignes, sans une requête.
 *
 * Reste, par portée, la ligne la plus récente de la page : sa suivante
 * est soit sur la page précédente, soit inexistante — auquel cas l'état
 * d'après est la valeur vivante, relue BRUTE dans sa table (voir le
 * parti pris n° 2 en tête de fichier). C'est le seul endroit qui
 * déclenche des requêtes supplémentaires, et leur nombre est borné par
 * le nombre de portées distinctes affichées : deux ou trois en pratique,
 * vingt au pire.
 */
async function resoudreApres(lignes: LigneVersion[]): Promise<Map<number, Apres>> {
  const apres = new Map<number, Apres>();
  if (lignes.length === 0) return apres;

  /* Les lignes arrivent de la plus récente à la plus ancienne : la
     dernière vue d'une portée est toujours la plus récente des deux. */
  const plusRecenteVue = new Map<string, LigneVersion>();
  const teteDePortee = new Map<string, LigneVersion>();
  for (const l of lignes) {
    const precedente = plusRecenteVue.get(l.scope);
    if (precedente) apres.set(l.id, { connu: true, valeur: precedente.snapshot, origine: "version" });
    else teteDePortee.set(l.scope, l);
    plusRecenteVue.set(l.scope, l);
  }

  const db = clientSupabase();

  /* ── Les suivantes hors page ── */
  const orphelines: LigneVersion[] = [];
  await Promise.all(
    [...teteDePortee.values()].map(async (tete) => {
      try {
        const { data, error } = await db
          .from("content_versions")
          .select("snapshot")
          .eq("scope", tete.scope)
          .gt("id", tete.id)
          .order("id", { ascending: true })
          .limit(1);
        if (error) {
          apres.set(tete.id, { connu: false });
          return;
        }
        const suivante = (data ?? [])[0] as { snapshot: unknown } | undefined;
        if (suivante) apres.set(tete.id, { connu: true, valeur: suivante.snapshot, origine: "version" });
        else orphelines.push(tete);
      } catch {
        apres.set(tete.id, { connu: false });
      }
    }),
  );

  /* ── Les plus récentes de toutes : l'état d'après est le présent ── */
  const parFamille = new Map<string, LigneVersion[]>();
  for (const l of orphelines) {
    const [famille] = decouper(l.scope);
    parFamille.set(famille, [...(parFamille.get(famille) ?? []), l]);
  }

  const cles = (famille: string) =>
    (parFamille.get(famille) ?? []).map((l) => decouper(l.scope)[1]);

  /** Une lecture groupée par famille, pas une par ligne. */
  async function vivant(
    famille: string,
    table: string,
    colonneCle: string,
  ): Promise<void> {
    const lignesFamille = parFamille.get(famille) ?? [];
    if (lignesFamille.length === 0) return;
    try {
      const { data, error } = await db
        .from(table)
        .select("*")
        .in(colonneCle, cles(famille));
      if (error) {
        for (const l of lignesFamille) apres.set(l.id, { connu: false });
        return;
      }
      const parCle = new Map(
        ((data ?? []) as Record<string, unknown>[]).map((r) => [chaine(r[colonneCle]), r]),
      );
      for (const l of lignesFamille) {
        /* Absent = l'objet a été supprimé depuis. L'état d'après est
           donc « plus rien », et c'est une information : la version
           affichée est l'état juste avant la suppression. */
        apres.set(l.id, {
          connu: true,
          valeur: parCle.get(decouper(l.scope)[1]) ?? null,
          origine: "actuel",
        });
      }
    } catch {
      for (const l of lignesFamille) apres.set(l.id, { connu: false });
    }
  }

  await Promise.all([
    (async () => {
      const lignesContent = parFamille.get("content") ?? [];
      if (lignesContent.length === 0) return;
      try {
        const { data, error } = await db
          .from("content")
          .select("key, value")
          .in("key", cles("content"));
        if (error) {
          for (const l of lignesContent) apres.set(l.id, { connu: false });
          return;
        }
        const parCle = new Map(
          ((data ?? []) as { key: string; value: unknown }[]).map((r) => [r.key, r.value]),
        );
        for (const l of lignesContent) {
          apres.set(l.id, {
            connu: true,
            valeur: parCle.get(decouper(l.scope)[1]) ?? null,
            origine: "actuel",
          });
        }
      } catch {
        for (const l of lignesContent) apres.set(l.id, { connu: false });
      }
    })(),
    vivant("article", "articles", "id"),
    vivant("annonce", "annonce_overrides", "ref"),
    vivant("agence", "agences", "id"),
    vivant("media", "medias", "id"),
  ]);

  return apres;
}

/** `auth.users.id` → e-mail. La table est minuscule : une seule lecture. */
async function auteurs(): Promise<Map<string, string>> {
  try {
    const { data, error } = await clientSupabase().from("admins").select("user_id, email");
    if (error) return new Map();
    return new Map(
      ((data ?? []) as { user_id: string; email: string }[]).map((r) => [r.user_id, r.email]),
    );
  } catch {
    return new Map();
  }
}

/* ──────────────────────────────────────────────────────────────────
   RESTAURATION

   Elle passe par `patchContent()`, jamais par une écriture SQL directe :
   c'est ce qui garantit que l'état d'avant la restauration entre à son
   tour dans le journal, et que le cache du magasin est invalidé.
   ────────────────────────────────────────────────────────────────── */

type Resultat = { ok: true } | { ok: false; message: string };

const IMPOSSIBLE_MEDIA =
  "Ce média n'est plus dans la médiathèque. Le fichier a été supprimé du stockage : " +
  "seule sa fiche est dans le journal, elle ne suffit pas à le recréer. Il faut le téléverser à nouveau.";

async function restaurerDomaine(domaine: string, snapshot: unknown): Promise<Resultat> {
  if (!estDomaine(domaine)) {
    return { ok: false, message: `Domaine inconnu : « ${domaine} ».` };
  }
  /* `seo` et `pages` sont des listes, les quatre autres des objets. Un
     instantané de la mauvaise forme vient d'une version antérieure du
     schéma : on refuse plutôt que d'écrire une valeur que les gabarits
     ne savent pas lire. */
  const liste = Array.isArray(snapshot);
  const attenduListe = domaine === "seo" || domaine === "pages";
  if (attenduListe !== liste) {
    return {
      ok: false,
      message:
        "L'instantané n'a pas la forme attendue pour ce domaine — il vient " +
        "probablement d'une version antérieure du site.",
    };
  }

  switch (domaine) {
    case "seo":
      await patchContent("seo", snapshot as SeoEntry[]);
      break;
    case "pages":
      await patchContent("pages", snapshot as PageEditable[]);
      break;
    case "tracking": {
      const t = objet(snapshot);
      /* `conversions` est la seule clé non optionnelle du domaine : un
         instantané antérieur à son introduction ne doit pas produire un
         `undefined` que les gabarits itéreraient. */
      await patchContent("tracking", {
        ...t,
        conversions: Array.isArray(t.conversions) ? t.conversions : [],
      } as TrackingConfig);
      break;
    }
    case "textes":
      await patchContent("textes", objet(snapshot) as Textes);
      break;
    case "menus": {
      const m = objet(snapshot);
      await patchContent("menus", {
        header: Array.isArray(m.header) ? m.header : [],
        footer: Array.isArray(m.footer) ? m.footer : [],
      } as Menus);
      break;
    }
    case "reglages":
      await patchContent("reglages", objet(snapshot) as Reglages);
      break;
  }
  return { ok: true };
}

async function restaurerArticle(id: string, snapshot: unknown): Promise<Resultat> {
  const r = objet(snapshot);
  const slug = chaine(r.slug);
  if (!slug) {
    return { ok: false, message: "L'instantané ne porte pas d'adresse (slug) : rien à restaurer." };
  }
  const article: Article = {
    slug,
    titre: chaine(r.titre) || "Sans titre",
    chapo: chaine(r.chapo),
    corps: typeof r.corps === "string" ? r.corps : "",
    image: texteOuRien(r.image),
    imageAlt: texteOuRien(r.image_alt),
    publieLe: isoOuRien(r.publie_le),
    auteur: texteOuRien(r.auteur),
    /* Absent = brouillon : on ne remet jamais un article en ligne par
       défaut, la publication est une décision. */
    brouillon: r.brouillon !== false,
    seo: seoDe(r.seo),
  };

  /* L'article a pu être renommé depuis : la ligne qui porte cet
     identifiant n'a plus forcément le slug de l'instantané. On écarte
     les deux adresses pour ne pas laisser un doublon derrière soi. */
  let slugActuel = "";
  try {
    const { data } = await clientSupabase()
      .from("articles")
      .select("slug")
      .eq("id", id)
      .maybeSingle();
    slugActuel = chaine((data as { slug?: string } | null)?.slug);
  } catch {
    /* Lecture d'appoint : son échec ne doit pas empêcher la restauration. */
  }

  const actuel = await getContentFrais();
  const autres = actuel.articles.filter((a) => a.slug !== slug && a.slug !== slugActuel);
  await patchContent("articles", [...autres, article]);
  return { ok: true };
}

async function restaurerAnnonce(ref: string, snapshot: unknown): Promise<Resultat> {
  const r = objet(snapshot);
  const cle = (chaine(r.ref) || ref).trim();
  if (!cle) return { ok: false, message: "L'instantané ne porte pas de référence." };

  const override: AnnonceOverride = {
    ref: cle,
    titre: texteOuRien(r.titre),
    accroche: texteOuRien(r.accroche),
    coupDeCoeur: r.coup_de_coeur === true,
    masquee: r.masquee === true,
    seo: seoDe(r.seo),
  };
  const actuel = await getContentFrais();
  const autres = actuel.annonces.filter(
    (o) => String(o?.ref ?? "").trim().toLowerCase() !== cle.toLowerCase(),
  );
  await patchContent("annonces", [...autres, override]);
  return { ok: true };
}

async function restaurerAgence(id: string, snapshot: unknown): Promise<Resultat> {
  const r = objet(snapshot);
  const cle = chaine(r.id) || id;
  if (!cle) return { ok: false, message: "L'instantané ne porte pas d'identifiant." };

  const agence: Agence = {
    id: cle,
    nom: chaine(r.nom) || "Agence",
    zone: chaine(r.zone),
    adresse: chaine(r.adresse),
    telephone: chaine(r.telephone),
    email: chaine(r.email),
    horaires: chaine(r.horaires),
    lat: nombreOuRien(r.lat),
    lng: nombreOuRien(r.lng),
    image: texteOuRien(r.image),
    villes: Array.isArray(r.villes) ? r.villes.map(chaine).filter(Boolean) : [],
    description: chaine(r.description),
    /* Absent = active : c'est l'état par défaut d'une agence en base. */
    actif: r.actif !== false,
    ordre: nombreOuRien(r.ordre) ?? 0,
  };
  const actuel = await getContentFrais();
  const autres = actuel.agences.filter((a) => a.id !== cle);
  await patchContent(
    "agences",
    [...autres, agence].sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr")),
  );
  return { ok: true };
}

async function restaurerMedia(id: string, snapshot: unknown): Promise<Resultat> {
  const r = objet(snapshot);
  const actuel = await getContentFrais();
  const fiche = actuel.medias.find((m) => m.id === id);
  /* La médiathèque ne se restaure pas : le fichier vit dans le bucket,
     et le journal n'en garde que la fiche. Seuls le nom et le texte
     alternatif sont modifiables — donc restaurables. */
  if (!fiche) return { ok: false, message: IMPOSSIBLE_MEDIA };

  const restauree: Media = {
    ...fiche,
    alt: chaine(r.alt),
    nom: chaine(r.nom) || fiche.nom,
  };
  await patchContent(
    "medias",
    actuel.medias.map((m) => (m.id === id ? restauree : m)),
  );
  return { ok: true };
}

/** Ce qu'une portée sait faire — l'écran de confirmation s'en sert aussi. */
async function appliquer(scope: string, snapshot: unknown): Promise<Resultat> {
  const [famille, reste] = decouper(scope);
  switch (famille) {
    case "content":
      return restaurerDomaine(reste, snapshot);
    case "article":
      return restaurerArticle(reste, snapshot);
    case "annonce":
      return restaurerAnnonce(reste, snapshot);
    case "agence":
      return restaurerAgence(reste, snapshot);
    case "media":
      return restaurerMedia(reste, snapshot);
    default:
      return {
        ok: false,
        message: `Cette portée (« ${scope} ») n'est pas restaurable depuis cet écran.`,
      };
  }
}

/** Vrai si la restauration a une chance d'aboutir — pour ne pas proposer
 *  un bouton qui échouera de toute façon. */
function restaurable(scope: string): boolean {
  const [famille, reste] = decouper(scope);
  if (famille === "content") return estDomaine(reste);
  return ["article", "annonce", "agence", "media"].includes(famille);
}

/* ──────────────────────────────────────────────────────────────────
   L'ACTION

   ⚠ Point d'entrée HTTP public : le garde est ici, en première ligne.
   L'instantané n'est PAS transmis par le formulaire — seul l'identifiant
   de la version l'est, et le contenu est relu en base. Accepter un
   instantané envoyé par le navigateur reviendrait à offrir une écriture
   arbitraire dans le contenu du site à qui sait forger une requête.
   ────────────────────────────────────────────────────────────────── */
async function restaurer(formData: FormData): Promise<void> {
  "use server";
  await assertAdmin();

  const id = Number(String(formData.get("id") ?? ""));
  if (!Number.isSafeInteger(id) || id <= 0) redirect(ROUTE);
  if (storeDriver() !== "supabase") redirect(`${ROUTE}?e=pilote`);

  let issue: Resultat;
  try {
    const { data, error } = await clientSupabase()
      .from("content_versions")
      .select("id, scope, snapshot")
      .eq("id", id)
      .maybeSingle();
    const version = data as { scope: string; snapshot: unknown } | null;
    if (error || !version) {
      issue = { ok: false, message: "Cette version est introuvable dans le journal." };
    } else {
      issue = await appliquer(version.scope, version.snapshot);
    }
  } catch (e) {
    /* Une écriture refusée par la base doit se lire à l'écran, pas dans
       une page d'erreur générique. */
    issue = { ok: false, message: (e as Error).message || "Écriture refusée par la base." };
  }

  if (!issue.ok) redirect(`${ROUTE}?e=${encodeURIComponent(issue.message.slice(0, 300))}`);

  /* Une restauration peut toucher n'importe quelle page : le nom du site,
     un menu, une agence, un texte partagé par toutes les pages. Plutôt
     que de deviner, on rend la main sur l'ensemble — c'est une opération
     rare, et une page servie périmée après une restauration ferait
     croire que le bouton n'a rien fait. */
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
  redirect(`${ROUTE}?ok=1`);
}

/* ──────────────────────────────────────────────────────────────────
   PRÉSENTATION

   Le fichier de styles est partagé avec les autres écrans et n'est pas
   le mien : les quelques règles propres au journal sont posées en ligne,
   avec les variables du thème.
   ────────────────────────────────────────────────────────────────── */

const S_CHANGEMENTS: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: ".25rem",
  fontSize: "var(--fs-label)",
  lineHeight: 1.5,
};

const S_CHEMIN: React.CSSProperties = {
  fontFamily: "var(--f-mono)",
  color: "var(--pierre)",
  letterSpacing: ".02em",
};

const S_AVANT: React.CSSProperties = { color: "var(--alerte)" };
const S_APRES: React.CSSProperties = { color: "var(--anthracite)" };
const S_PAGINATION: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  flexWrap: "wrap",
  marginTop: "var(--s-3)",
};

const SIGNE: Record<Etat, string> = { ajout: "+", retrait: "−", modif: "·" };

/* La flèche et les signes ne se lisent pas à voix haute : un lecteur
   d'écran entendrait « titre plus » sans savoir ce que cela veut dire. */
const DIT: Record<Etat, string> = {
  ajout: "ajouté :",
  retrait: "retiré :",
  modif: "modifié, avant :",
};

function Changements({
  liste,
  max,
}: {
  liste: Changement[];
  max: number;
}) {
  const montres = liste.slice(0, max);
  return (
    <div style={S_CHANGEMENTS}>
      {montres.map((c) => (
        <div key={c.chemin}>
          <span style={S_CHEMIN}>{c.chemin}</span>{" "}
          <span aria-hidden="true">{SIGNE[c.etat]}</span>
          <span className="u-sr-only">{DIT[c.etat]}</span>{" "}
          {/* Toujours l'ancienne valeur à gauche, la nouvelle à droite :
              c'est la gauche que « restaurer » réécrit. */}
          {c.etat !== "ajout" ? (
            <>
              <span style={S_AVANT}>{c.avant}</span>
              {c.etat === "modif" ? (
                <>
                  <span aria-hidden="true"> → </span>
                  <span className="u-sr-only">, après : </span>
                </>
              ) : null}
            </>
          ) : null}
          {c.etat !== "retrait" ? <span style={S_APRES}>{c.apres}</span> : null}
        </div>
      ))}
      {liste.length > max ? (
        <div className="u-muted">
          et {liste.length - max} autre{liste.length - max > 1 ? "s" : ""} modification
          {liste.length - max > 1 ? "s" : ""}.
        </div>
      ) : null}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   L'ÉCRAN
   ────────────────────────────────────────────────────────────────── */

const premier = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? "";

/** Les filtres sont reconstruits, jamais recopiés : une URL ne dicte pas
 *  une requête. */
function lien(portee: string, periode: string, page: number): string {
  const p = new URLSearchParams();
  if (portee) p.set("portee", portee);
  if (periode) p.set("periode", periode);
  if (page > 1) p.set("p", String(page));
  const s = p.toString();
  return s ? `${ROUTE}?${s}` : ROUTE;
}

export default async function AdminRevisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [cle: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const porteeBrute = premier(params.portee);
  const portee = FILTRES.some((f) => f.valeur === porteeBrute) ? porteeBrute : "";
  const periodeBrute = premier(params.periode);
  const periode = PERIODES.some((p) => p.valeur === periodeBrute) ? periodeBrute : "";
  const page = Math.max(1, Math.min(9999, Number(premier(params.p)) || 1));
  const aConfirmer = Number(premier(params.restaurer)) || 0;
  const erreur = premier(params.e);
  const succes = premier(params.ok) === "1";

  const tete = (
    <div className="adm-head">
      <div>
        <span className="c-label c-label--accent">Outils</span>
        <h1>Révisions</h1>
      </div>
      <p>
        Chaque modification du site enregistre d&apos;abord l&apos;état
        précédent. Ce journal le rend consultable, et permet de revenir en
        arrière. Restaurer n&apos;efface rien : l&apos;état d&apos;avant la
        restauration est enregistré à son tour, on peut donc toujours faire
        marche arrière une fois de plus.
      </p>
    </div>
  );

  /* ════ SANS SUPABASE : il n'y a pas d'historique, on le dit ════ */
  if (storeDriver() !== "supabase") {
    return (
      <>
        {tete}
        <p className="adm-note adm-note--alerte">
          ⚠ <strong>Aucun historique n&apos;est tenu sur cette installation.</strong>{" "}
          Le contenu est enregistré dans un fichier JSON, réécrit à chaque
          modification : l&apos;état précédent n&apos;est conservé nulle part.
          Ce tableau n&apos;est pas vide parce qu&apos;il ne s&apos;est rien passé,
          il est absent parce que rien n&apos;a été noté.
        </p>
        <div className="adm-empty">
          <strong>Le filet de sécurité demande une base</strong>
          Renseignez <code>SUPABASE_URL</code> et{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>, puis jouez{" "}
          <code>supabase/schema.sql</code>. Le journal se remplit alors tout seul,
          à chaque enregistrement, sans rien changer aux autres écrans.
          <div className="adm-actions">
            <Link href="/admin" className="c-btn">
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </>
    );
  }

  /* ════ LECTURE DU JOURNAL ════ */
  const depuis =
    periode === ""
      ? null
      : new Date(
          Date.now() - (PERIODES.find((p) => p.valeur === periode)?.jours ?? 0) * 86_400_000,
        ).toISOString();

  let lignes: LigneVersion[] = [];
  let total = 0;
  let panne = "";

  try {
    const db = clientSupabase();
    let requete = db
      .from("content_versions")
      .select("id, scope, snapshot, created_at, created_by", { count: "exact" });

    if (portee.endsWith(":*")) requete = requete.like("scope", `${portee.slice(0, -1)}%`);
    else if (portee) requete = requete.eq("scope", portee);
    if (depuis) requete = requete.gte("created_at", depuis);

    const debut = (page - 1) * PAR_PAGE;
    const { data, error, count } = await requete
      /* L'identifiant est une séquence : il ordonne le journal plus
         sûrement que l'horodatage, qui peut être identique pour deux
         écritures d'un même enregistrement. */
      .order("id", { ascending: false })
      .range(debut, debut + PAR_PAGE - 1);

    if (error) panne = error.message;
    else {
      lignes = (data ?? []) as LigneVersion[];
      total = count ?? lignes.length;
    }
  } catch (e) {
    panne = (e as Error).message;
  }

  const [suivants, mails] = panne
    ? [new Map<number, Apres>(), new Map<string, string>()]
    : await Promise.all([resoudreApres(lignes), auteurs()]);

  const nomAuteur = (uid: string | null): string => {
    if (!uid) return "inconnu";
    return mails.get(uid) ?? `compte ${uid.slice(0, 8)}…`;
  };

  const changementsDe = (l: LigneVersion): Changement[] | null => {
    const a = suivants.get(l.id);
    return a && a.connu ? comparer(l.snapshot, a.valeur) : null;
  };

  const confirmee = aConfirmer ? (lignes.find((l) => l.id === aConfirmer) ?? null) : null;
  const dernierePage = Math.max(1, Math.ceil(total / PAR_PAGE));
  const debutAffiche = total === 0 ? 0 : (page - 1) * PAR_PAGE + 1;
  const finAffichee = Math.min(total, (page - 1) * PAR_PAGE + lignes.length);

  return (
    <>
      {tete}

      {succes ? (
        <p className="adm-note" role="status">
          <strong>Version restaurée.</strong> L&apos;état qui précédait cette
          restauration vient lui-même d&apos;entrer dans le journal, en haut de la
          liste. Les pages publiques ont été rafraîchies.
        </p>
      ) : null}

      {erreur ? (
        <p className="adm-note adm-note--alerte" role="alert">
          ⚠ <strong>Restauration impossible.</strong>{" "}
          {erreur === "pilote"
            ? "Cette installation ne tient pas d'historique."
            : erreur}
        </p>
      ) : null}

      {panne ? (
        <p className="adm-note adm-note--alerte" role="alert">
          ⚠ <strong>Le journal est illisible.</strong> La base a répondu :{" "}
          <code>{panne}</code>. Si la table <code>content_versions</code>{" "}
          n&apos;existe pas encore, rejouez <code>supabase/schema.sql</code>.
        </p>
      ) : null}

      {/* ════ CONFIRMATION ════
          Une page plutôt qu'un `confirm()` de navigateur : l'écran
          fonctionne sans JavaScript, on peut y montrer exactement ce qui
          sera réécrit, et « Annuler » revient à un état connu. */}
      {confirmee ? (
        <section className="adm-card">
          <h2>Restaurer cette version ?</h2>
          {(() => {
            const d = decrire(confirmee.scope, confirmee.snapshot);
            const ch = changementsDe(confirmee);
            const possible = restaurable(confirmee.scope);
            return (
              <>
                <p>
                  <strong>
                    {d.famille} — {d.cible}
                  </strong>{" "}
                  · état enregistré le {fmtDateHeure(confirmee.created_at)} par{" "}
                  {nomAuteur(confirmee.created_by)}.
                </p>
                {ch === null ? (
                  <p className="u-muted">
                    L&apos;état suivant n&apos;a pas pu être relu : la comparaison
                    n&apos;est pas affichable, mais la restauration reste possible.
                  </p>
                ) : ch.length === 0 ? (
                  <p className="u-muted">
                    Cette version est identique à l&apos;état actuel : la restaurer
                    ne changerait rien.
                  </p>
                ) : (
                  <>
                    <p>
                      Les valeurs de gauche seront réécrites à la place de celles de
                      droite :
                    </p>
                    <Changements liste={ch} max={40} />
                  </>
                )}
                <p>
                  L&apos;état actuel sera enregistré dans le journal avant
                  d&apos;être remplacé : cette restauration est elle-même
                  réversible.
                </p>
                {possible ? null : (
                  <p className="adm-note adm-note--alerte">
                    {decouper(confirmee.scope)[0] === "media"
                      ? IMPOSSIBLE_MEDIA
                      : "Cette portée n'est pas restaurable depuis cet écran."}
                  </p>
                )}
                <form action={restaurer} className="adm-actions">
                  <input type="hidden" name="id" value={confirmee.id} />
                  {possible ? (
                    <button type="submit" className="c-btn c-btn--solid">
                      Restaurer cette version
                    </button>
                  ) : null}
                  <Link href={lien(portee, periode, page)} className="c-btn">
                    Annuler
                  </Link>
                </form>
              </>
            );
          })()}
        </section>
      ) : null}

      {/* ════ FILTRES ════
          Un formulaire GET : les filtres vivent dans l'URL, donc ils sont
          rechargeables et partageables — « regarde cette journée-là » est
          une phrase qu'on prononce au téléphone. Bouton de soumission
          présent : sans JavaScript, un `select` ne déclenche rien. */}
      <form method="get" action={ROUTE} className="adm-toolbar">
        <div className="adm-field">
          <label htmlFor="portee">Portée</label>
          <select id="portee" name="portee" defaultValue={portee}>
            {FILTRES.map((f) => (
              <option key={f.valeur || "toutes"} value={f.valeur}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="adm-field">
          <label htmlFor="periode">Période</label>
          <select id="periode" name="periode" defaultValue={periode}>
            {PERIODES.map((p) => (
              <option key={p.valeur || "tout"} value={p.valeur}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="adm-actions adm-actions--serre">
          <button type="submit" className="c-btn">
            Filtrer
          </button>
          {portee || periode ? (
            <Link href={ROUTE} className="c-btn">
              Tout voir
            </Link>
          ) : null}
        </div>
      </form>

      {/* ════ LE JOURNAL ════ */}
      {!panne && lignes.length === 0 ? (
        <div className="adm-empty">
          <strong>Aucune modification à afficher</strong>
          {portee || periode
            ? "Aucune écriture ne correspond à ces filtres. Élargissez la période, ou choisissez « toutes les portées »."
            : "Le journal se remplit au premier enregistrement fait depuis le back-office. Les modifications antérieures à la mise en service de la base n'y figurent pas."}
        </div>
      ) : null}

      {lignes.length > 0 ? (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <caption className="u-sr-only">
                Journal des modifications, de la plus récente à la plus ancienne
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Portée</th>
                  <th scope="col">Par</th>
                  <th scope="col">Ce qui a changé</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => {
                  const d = decrire(l.scope, l.snapshot);
                  const ch = changementsDe(l);
                  const source = suivants.get(l.id);
                  return (
                    <tr key={l.id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {fmtDateHeure(l.created_at)}
                      </td>
                      <td>
                        {d.famille}
                        <br />
                        <strong>{d.cible}</strong>
                      </td>
                      <td>
                        {l.created_by ? (
                          <span style={{ overflowWrap: "anywhere" }}>
                            {nomAuteur(l.created_by)}
                          </span>
                        ) : (
                          <span
                            className="u-muted"
                            title="Modification faite avant les comptes nommés, ou depuis le mot de passe partagé : il n'y a personne à nommer."
                          >
                            inconnu
                          </span>
                        )}
                      </td>
                      <td>
                        {ch === null ? (
                          <span className="u-muted">Comparaison indisponible</span>
                        ) : ch.length === 0 ? (
                          <span className="u-muted">
                            Aucun écart avec l&apos;état suivant
                          </span>
                        ) : (
                          <>
                            <Changements liste={ch} max={3} />
                            {source?.connu && source.origine === "actuel" ? (
                              <div className="u-muted" style={{ marginTop: ".3rem" }}>
                                Comparé à l&apos;état actuel du site.
                              </div>
                            ) : null}
                          </>
                        )}
                      </td>
                      <td>
                        <div className="adm-actions adm-actions--serre">
                          <Link
                            href={`${lien(portee, periode, page)}${
                              lien(portee, periode, page).includes("?") ? "&" : "?"
                            }restaurer=${l.id}`}
                            className="c-btn"
                          >
                            Restaurer
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ════ PAGINATION ════
              Ce journal ne cesse de grossir : il n'est jamais chargé en
              entier, même filtré. */}
          <nav style={S_PAGINATION} aria-label="Pagination du journal">
            <span className="u-muted">
              {debutAffiche}–{finAffichee} sur {total} modification
              {total > 1 ? "s" : ""}
            </span>
            <span style={{ flex: 1 }} />
            {page > 1 ? (
              <Link href={lien(portee, periode, page - 1)} className="c-btn">
                <span aria-hidden="true">←</span> Plus récentes
              </Link>
            ) : null}
            <span className="u-muted">
              Page {page} sur {dernierePage}
            </span>
            {page < dernierePage ? (
              <Link href={lien(portee, periode, page + 1)} className="c-btn">
                Plus anciennes <span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </nav>
        </>
      ) : null}
    </>
  );
}
