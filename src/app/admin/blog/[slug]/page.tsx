import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import MediaPicker from "@/components/admin/MediaPicker";
import { markdownToHtml, markdownToText } from "@/lib/markdown";
import { resoudreMedia } from "@/lib/medias";
import { getContent, patchContent } from "@/lib/store";
import type { Article } from "@/lib/store/types";
import { assertAdmin, requireAdmin } from "../../actions";
import "@/styles/pages/blog.css";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — ÉDITION D'UN ARTICLE

   Une seule route pour la création et la modification : le slug réservé
   « nouveau » ouvre un formulaire vide. Deux écrans quasi identiques
   finissent toujours par diverger ; un seul, jamais.

   ── L'APERÇU, ET POURQUOI IL EST ICI ──
   `?apercu=1` rend l'article avec exactement le balisage et la feuille de
   style de la page publique (src/styles/pages/blog.css). Ce n'est pas un
   pis-aller : l'alternative a été examinée et écartée.

     Faire servir les brouillons par /blog/[slug] à un visiteur
     authentifié obligerait cette page publique à lire un cookie ou un
     paramètre d'URL. En App Router, l'un comme l'autre basculent la
     route ENTIÈRE en rendu dynamique : on perdrait la génération
     statique de tous les articles, pour tous les visiteurs, afin
     d'offrir un aperçu à une personne. Et un brouillon rendu sur une
     URL publique finit toujours par fuiter — ce que la règle interdit.

   L'aperçu vit donc dans le back-office, qui est déjà authentifié, déjà
   `force-dynamic` et déjà `noindex`.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Article",
  robots: { index: false, follow: false },
};

/** Slug réservé qui ouvre le formulaire de création. */
const NOUVEAU = "nouveau";

const VIDE: Article = { slug: "", titre: "", chapo: "", corps: "", brouillon: true };

const str = (v: FormDataEntryValue | null): string => (typeof v === "string" ? v.trim() : "");
const opt = (v: FormDataEntryValue | null): string | undefined => str(v) || undefined;

/**
 * Titre → slug. Sans accent, sans ponctuation, sans capitale.
 *
 * `normalize("NFD")` décompose « é » en « e » suivi d'un accent combinant,
 * que la plage U+0300–U+036F supprime ensuite : c'est la façon courte et
 * fiable de translittérer le français sans table de correspondance.
 */
const slugify = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "") || "article";

/** Suffixe le slug jusqu'à ce qu'il soit libre : deux articles ne partagent jamais une URL. */
const unique = (base: string, pris: string[]): string => {
  if (pris.indexOf(base) === -1) return base;
  let n = 2;
  while (pris.indexOf(`${base}-${n}`) !== -1) n += 1;
  return `${base}-${n}`;
};

/** Date du jour au format « AAAA-MM-JJ », dans le fuseau du serveur. */
const aujourdhui = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const fmtDate = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

export default async function EditionArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ apercu?: string; ok?: string; renomme?: string }>;
}) {
  await requireAdmin();

  const { slug } = await params;
  const { apercu, ok, renomme } = await searchParams;
  const creation = slug === NOUVEAU;

  const content = await getContent();
  const article = creation ? VIDE : (content.articles.find((a) => a.slug === slug) ?? null);
  /* Slug inconnu en modification : 404 franc. Basculer silencieusement en
     création laisserait croire que l'article existe encore. */
  if (!article) notFound();

  const publie = !article.brouillon && !!article.publieLe;

  /* ════ SERVER ACTION ════ */
  async function enregistrer(formData: FormData) {
    "use server";
    await assertAdmin();

    const origine = str(formData.get("slugOrigine"));
    const actuel = await getContent();
    const index = origine ? actuel.articles.findIndex((a) => a.slug === origine) : -1;

    const titre = str(formData.get("titre"));
    /* Le champ est `required` côté navigateur ; ce garde-fou couvre les
       soumissions directes, qu'une Server Action reçoit aussi. */
    if (!titre) {
      redirect(origine ? `/admin/blog/${encodeURIComponent(origine)}` : `/admin/blog/${NOUVEAU}`);
    }

    const brouillon = formData.get("brouillon") === "on";
    let publieLe = str(formData.get("publieLe"));
    /* « Un article non daté n'est pas publié » (contrat du type `Article`).
       Décocher « brouillon » sans avoir posé de date est donc une intention
       claire : on date d'aujourd'hui plutôt que de publier dans le vide. */
    if (!brouillon && !publieLe) publieLe = aujourdhui();

    /* Le slug saisi, sinon dérivé du titre. Il doit rester unique parmi LES
       AUTRES articles : se comparer à soi-même renommerait l'article à
       chaque enregistrement (mon-article, -2, -3…). */
    const autres = actuel.articles.filter((_, i) => i !== index).map((a) => a.slug);
    const souhaite = slugify(str(formData.get("slug")) || titre);
    const finalSlug = unique(souhaite, autres);

    const suivant: Article = {
      slug: finalSlug,
      titre,
      chapo: str(formData.get("chapo")),
      /* Le corps n'est PAS `trim()`é ligne à ligne : l'indentation et les
         lignes vides portent la structure Markdown. */
      corps: typeof formData.get("corps") === "string" ? String(formData.get("corps")) : "",
      image: opt(formData.get("image")),
      imageAlt: opt(formData.get("imageAlt")),
      auteur: opt(formData.get("auteur")),
      publieLe: publieLe || undefined,
      brouillon,
      seo: {
        title: opt(formData.get("seoTitle")),
        description: opt(formData.get("seoDescription")),
      },
    };

    const articles = [...actuel.articles];
    if (index >= 0) articles[index] = suivant;
    else articles.push(suivant);
    await patchContent("articles", articles);

    /* La liste change dans tous les cas, l'article aussi. Un renommage
       laisse en plus une ancienne URL en cache : on la revalide pour
       qu'elle passe en 404 au lieu de servir le même article à deux
       adresses — du contenu dupliqué, et une pénalité SEO gratuite. */
    revalidatePath("/blog");
    revalidatePath(`/blog/${finalSlug}`);
    if (origine && origine !== finalSlug) revalidatePath(`/blog/${origine}`);

    const q = finalSlug !== souhaite ? "?ok=1&renomme=1" : "?ok=1";
    redirect(`/admin/blog/${encodeURIComponent(finalSlug)}${q}`);
  }

  /* ════ APERÇU ════
     Même balisage que src/app/blog/[slug]/page.tsx, en plus court : ni
     JSON-LD (on ne met pas un brouillon dans un graphe de données
     structurées), ni articles liés. Ce qui compte est de voir la
     typographie réelle et la mise en forme du Markdown. */
  if (apercu) {
    /* La vignette n'est plus forcément une URL : depuis la médiathèque,
       c'est un identifiant de média. On le résout ici, sinon l'aperçu
       montrerait une image cassée là où le site public en affiche une. */
    const imageApercu = await resoudreMedia(article.image);
    return (
      <>
        <div className="bl-preview">
          <span>
            Aperçu — {publie ? "article en ligne" : "brouillon, invisible du site"}
          </span>
          <Link href={`/admin/blog/${encodeURIComponent(article.slug || NOUVEAU)}`}>
            Retour à l&apos;édition
          </Link>
        </div>
        <article className="bl-article">
          <div className="container">
            <header className="bl-article__head">
              <h1>{article.titre || "Sans titre"}</h1>
              {article.chapo ? <p className="bl-article__chapo">{article.chapo}</p> : null}
              <div className="bl-meta">
                {article.publieLe ? <span>{fmtDate(article.publieLe)}</span> : null}
                {article.auteur ? <span>{article.auteur}</span> : null}
              </div>
            </header>
            {imageApercu ? (
              <figure className="bl-article__media">
                {/* URL signée, temporaire et hors des domaines déclarés :
                    next/image ne peut pas l'optimiser. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageApercu} alt={article.imageAlt ?? ""} />
              </figure>
            ) : null}
            {article.corps.trim() ? (
              <div
                className="bl-prose"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(article.corps) }}
              />
            ) : (
              <p className="bl-prose u-muted">L&apos;article n&apos;a pas encore de corps.</p>
            )}
          </div>
        </article>
      </>
    );
  }

  /* ════ FORMULAIRE ════ */
  return (
    <form action={enregistrer}>
      <input type="hidden" name="slugOrigine" value={creation ? "" : article.slug} />

      <div className="adm-head">
        <div>
          <span className="c-label c-label--accent">
            <Link href="/admin/blog">Blog</Link> / {creation ? "Nouvel article" : "Édition"}
          </span>
          <h1>{creation ? "Nouvel article" : article.titre || "Sans titre"}</h1>
        </div>
        <div className="adm-actions adm-actions--serre">
          {!creation ? (
            <Link
              href={`/admin/blog/${encodeURIComponent(article.slug)}?apercu=1`}
              className="c-btn"
            >
              Aperçu
            </Link>
          ) : null}
          {publie ? (
            <a
              href={`/blog/${article.slug}`}
              className="c-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              Voir en ligne <span aria-hidden="true">↗</span>
            </a>
          ) : null}
          <button type="submit" className="c-btn c-btn--solid">
            Enregistrer
          </button>
        </div>
      </div>

      {ok ? (
        <p className="adm-note" role="status">
          Article enregistré.
          {renomme
            ? " Son adresse a été ajustée : un autre article utilisait déjà celle-ci."
            : ""}
        </p>
      ) : null}

      {/* ════ ÉDITORIAL ════ */}
      <section className="adm-card">
        <h2>L&apos;article</h2>

        <div className="adm-field">
          <label htmlFor="titre">Titre</label>
          <input
            id="titre"
            name="titre"
            type="text"
            required
            defaultValue={article.titre}
            placeholder="Combien coûte un terrain viabilisé en Charente-Maritime ?"
          />
          <span className="adm-field__aide">
            C&apos;est le h1 de la page et le titre affiché dans Google. Une vraie
            question, formulée comme on la tape, vaut mieux qu&apos;un titre malin.
          </span>
        </div>

        <div className="adm-field">
          <label htmlFor="slug">Adresse de la page</label>
          <input
            id="slug"
            name="slug"
            type="text"
            defaultValue={article.slug}
            placeholder={article.titre ? slugify(article.titre) : "derivee-du-titre"}
          />
          <span className="adm-field__aide">
            <code>/blog/{article.slug || "…"}</code> — laissez vide pour la dériver
            du titre. Une fois l&apos;article en ligne, évitez de la changer :
            l&apos;ancienne adresse renverra une page introuvable, pour vos visiteurs
            comme pour Google.
          </span>
        </div>

        <div className="adm-field">
          <label htmlFor="chapo">Chapô</label>
          <textarea
            id="chapo"
            name="chapo"
            rows={3}
            defaultValue={article.chapo}
            placeholder="Deux ou trois phrases qui résument l'article."
          />
          <span className="adm-field__aide">
            Affiché sous le titre et sur la carte de la liste. Sert aussi de
            description dans Google si le bloc « Référencement » est vide.
          </span>
        </div>

        <div className="adm-field">
          <label htmlFor="corps">Corps de l&apos;article</label>
          <textarea
            id="corps"
            name="corps"
            rows={22}
            defaultValue={article.corps}
            placeholder={
              "## Un sous-titre\n\nUn paragraphe, avec du **gras**, de l'*italique*\net un [lien](/maisons).\n\n- un point\n- un autre point"
            }
          />
          <span className="adm-field__aide">
            Mise en forme simplifiée : <code>##</code> pour un sous-titre,{" "}
            <code>###</code> pour un niveau en dessous, <code>**gras**</code>,{" "}
            <code>*italique*</code>, un tiret en début de ligne pour une puce,{" "}
            <code>[texte](adresse)</code> pour un lien. Une ligne vide sépare deux
            paragraphes. Le HTML n&apos;est pas interprété : une balise collée ici
            s&apos;affichera telle quelle, en toutes lettres.
          </span>
        </div>
      </section>

      {/* ════ PUBLICATION ════ */}
      <section className="adm-card">
        <h2>Publication</h2>
        <div className="adm-grid">
          <div className="adm-field">
            <label htmlFor="publieLe">Date de publication</label>
            <input
              id="publieLe"
              name="publieLe"
              type="date"
              defaultValue={(article.publieLe ?? "").slice(0, 10)}
            />
            <span className="adm-field__aide">
              Elle date et trie l&apos;article ; elle ne le programme pas. Une date
              future ne retarde pas la mise en ligne — c&apos;est la case ci-contre
              qui décide, et elle seule. Laissée vide sur un article publié, la
              date du jour est posée.
            </span>
          </div>
          <div className="adm-field">
            <div className="adm-field adm-field--case">
              <input
                id="brouillon"
                name="brouillon"
                type="checkbox"
                defaultChecked={article.brouillon}
              />
              <label htmlFor="brouillon">Garder en brouillon</label>
            </div>
            <span className="adm-field__aide">
              Tant que la case est cochée, l&apos;article est invisible du site :
              absent de la liste, et son adresse renvoie une page introuvable. Vous
              pouvez tout de même le relire avec « Aperçu ».
            </span>
          </div>
          <div className="adm-field">
            <label htmlFor="auteur">Auteur</label>
            <input
              id="auteur"
              name="auteur"
              type="text"
              defaultValue={article.auteur ?? ""}
              placeholder="Maisons Essensya"
            />
            <span className="adm-field__aide">
              Facultatif. Vide, l&apos;article est signé par l&apos;entreprise.
            </span>
          </div>
        </div>
      </section>

      {/* ════ IMAGE ════ */}
      <section className="adm-card">
        <h2>Image</h2>
        <div className="adm-grid">
          {/* Le champ soumis reste `image`, au même nom et au même format :
              l'action lit toujours `formData.get("image")`, et une adresse
              externe collée à la main reste acceptée par le sélecteur. */}
          <MediaPicker
            name="image"
            value={article.image}
            label={"Image de l'article"}
            aide="Facultative : sans image, la carte affiche une plaque typographique plutôt qu'une photo d'illustration sans rapport avec le sujet. Format paysage, 1600 px de large environ."
          />
          <div className="adm-field">
            <label htmlFor="imageAlt">Description de l&apos;image</label>
            <input
              id="imageAlt"
              name="imageAlt"
              type="text"
              defaultValue={article.imageAlt ?? ""}
              placeholder="Terrain viabilisé en lotissement"
            />
            <span className="adm-field__aide">
              Lue par les lecteurs d&apos;écran et par Google. Décrivez ce que
              l&apos;on voit, pas ce que l&apos;article raconte.
            </span>
          </div>
        </div>
      </section>

      {/* ════ SEO ════ */}
      <section className="adm-card">
        <h2>Référencement</h2>
        <p className="adm-field__aide">
          À ne remplir que si le titre et le chapô ne conviennent pas tels quels
          dans les résultats de recherche. Laissés vides, ils sont repris
          automatiquement — ce qui est le cas le plus fréquent.
        </p>
        <div className="adm-field">
          <label htmlFor="seoTitle">Titre dans Google</label>
          <input
            id="seoTitle"
            name="seoTitle"
            type="text"
            defaultValue={article.seo?.title ?? ""}
            placeholder={article.titre || "Reprend le titre de l'article"}
          />
          <span className="adm-field__aide">Environ 60 caractères avant la coupe.</span>
        </div>
        <div className="adm-field">
          <label htmlFor="seoDescription">Description dans Google</label>
          <textarea
            id="seoDescription"
            name="seoDescription"
            rows={3}
            defaultValue={article.seo?.description ?? ""}
            placeholder={article.chapo || markdownToText(article.corps, 155) || "Reprend le chapô"}
          />
          <span className="adm-field__aide">Environ 155 caractères avant la coupe.</span>
        </div>
      </section>

      <div className="adm-actions">
        <button type="submit" className="c-btn c-btn--solid">
          Enregistrer
        </button>
        <Link href="/admin/blog" className="c-btn">
          Retour à la liste
        </Link>
      </div>
    </form>
  );
}
