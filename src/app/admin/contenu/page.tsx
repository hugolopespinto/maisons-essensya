import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ESSENSYA_DATA, PLACEHOLDER } from "@/data/essensya";
import { getContent, isWritable, patchContent } from "@/lib/store";
import type { Textes } from "@/lib/store/types";
import { assertAdmin, requireAdmin } from "../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — TEXTES ET PRIX

   L'écran le plus attendu du lot, et le plus facile à sous-estimer :
   c'est ici que le client pose enfin les VRAIS chiffres. Aujourd'hui,
   tous les prix du site sortent du bloc `PLACEHOLDER` de
   src/data/essensya.ts — des valeurs calées sur la médiane du flux
   Vitahome pour rester plausibles, mais fausses. Tant qu'elles ne sont
   pas remplacées, le site annonce des prix que l'entreprise ne tient pas.

   Conséquences sur la conception de l'écran :
     · chaque champ affiche la valeur ACTUELLE du code en `placeholder`,
       donc en gris — pour distinguer d'un coup d'œil « saisi par le
       client » de « encore provisoire » ;
     · un champ laissé vide n'écrase rien : le site retombe sur le code ;
     · l'avertissement est écrit en toutes lettres, en haut de page.

   Les mutations passent par une Server Action et se terminent par
   `revalidatePath("/", "layout")`. Le nom de la maison, le téléphone et
   les prix apparaissent dans l'en-tête, le pied de page, les fiches
   produit, les annonces et les landings : revalider la seule accueil
   laisserait l'ISR servir l'ancien prix partout ailleurs, ce qui est
   exactement le bug qu'on ne veut pas voir en recette.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contenu du site",
  robots: { index: false, follow: false },
};

/* Le h1 de l'accueil est écrit en dur dans src/components/HomeHero.tsx.
   On le recopie ici UNIQUEMENT comme placeholder : c'est la valeur que le
   client voit sur son site aujourd'hui, et il doit la reconnaître. */
const HERO_ACTUEL = "La maison juste. Le prix juste.";

const NF = new Intl.NumberFormat("fr-FR");

type Ligne = NonNullable<Textes["compare"]>[number];

/** Chaîne nettoyée, ou `undefined` — jamais une chaîne vide en stockage. */
const txt = (v: FormDataEntryValue | null): string | undefined => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : undefined;
};

/**
 * Nombre saisi librement : « 99 900 », « 99900 € », « 99.900 » donnent tous
 * 99900. On refuse le reste plutôt que de publier un prix à moitié lu.
 */
const num = (v: FormDataEntryValue | null): number | undefined => {
  const s = typeof v === "string" ? v.replace(/[^\d]/g, "") : "";
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export default async function ContenuPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  /* Garde d'écran. Le layout du back-office ne protège pas : il choisit
     seulement la coquille. Le fait qu'un lien ne soit pas affiché n'a
     jamais protégé une route — l'URL se tape. */
  await requireAdmin();

  const { ok } = await searchParams;
  const content = await getContent();
  const t = content.textes;
  const inscriptible = await isWritable();

  /* Le comparatif n'a pas d'équivalent « placeholder » : c'est un tableau,
     pas un champ. On préremplit donc le formulaire avec les lignes
     actuelles du site, pour que le client les corrige au lieu de partir
     d'une page blanche. Le premier enregistrement les fait basculer dans
     le stockage, et le code n'est plus consulté. */
  const heritees = !t.compare;
  const lignes: Ligne[] = t.compare ?? ESSENSYA_DATA.compare.rows;

  async function enregistrer(formData: FormData) {
    "use server";
    /* Une Server Action est un point d'entrée HTTP public : le garde est
       DANS l'action, pas seulement sur l'écran qui l'affiche. */
    await assertAdmin();

    /* Les lignes du comparatif sont relues depuis le formulaire AVANT
       d'appliquer l'opération : ajouter, déplacer ou supprimer une ligne
       ne doit jamais faire perdre une saisie en cours. */
    const total = Number(formData.get("compareCount") ?? 0) || 0;
    const rows: Ligne[] = [];
    for (let i = 0; i < total; i += 1) {
      rows.push({
        poste: txt(formData.get(`poste_${i}`)) ?? "",
        essensya: txt(formData.get(`essensya_${i}`)) ?? "",
        classique: txt(formData.get(`classique_${i}`)) ?? "",
        gain: formData.get(`gain_${i}`) === "on",
      });
    }

    /* L'opération voyage dans le `value` du bouton cliqué : un seul
       formulaire, plusieurs boutons, aucune ligne de JavaScript. */
    const brut = formData.get("op");
    const [action, arg] = (typeof brut === "string" ? brut : "enregistrer").split(":");
    const i = Number(arg);

    if (action === "supprimer" && i >= 0 && i < rows.length) {
      rows.splice(i, 1);
    } else if (action === "monter" && i > 0 && i < rows.length) {
      [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]];
    } else if (action === "descendre" && i >= 0 && i < rows.length - 1) {
      [rows[i], rows[i + 1]] = [rows[i + 1], rows[i]];
    } else if (action === "ajouter") {
      rows.push({ poste: "", essensya: "", classique: "", gain: false });
    }

    /* À l'enregistrement, on purge les lignes sans intitulé : une ligne
       vide publiée casserait le tableau public. On ne purge PAS après
       « ajouter », sinon la ligne qu'on vient de créer disparaîtrait. */
    const propres = action === "ajouter" ? rows : rows.filter((r) => r.poste.length > 0);

    const prix = {
      maison3ch: num(formData.get("maison3ch")),
      maison2ch: num(formData.get("maison2ch")),
      total: num(formData.get("total")),
      mensualite: num(formData.get("mensualite")),
    };
    const aucunPrix = Object.values(prix).every((v) => v === undefined);

    const textes: Textes = {
      houseName: txt(formData.get("houseName")),
      tagline: txt(formData.get("tagline")),
      heroTitre: txt(formData.get("heroTitre")),
      telephone: txt(formData.get("telephone")),
      /* Aucun prix saisi : on ne pose pas d'objet vide, pour que le site
         puisse retomber franchement sur les valeurs du code. */
      ...(aucunPrix ? {} : { prix }),
      compare: propres,
    };

    await patchContent("textes", textes);

    /* Nom, téléphone et prix sont affichés dans le layout (en-tête, pied
       de page, CTA collant) et sur toutes les pages produit : on revalide
       l'arbre entier, pas seulement l'accueil. */
    revalidatePath("/", "layout");
    redirect("/admin/contenu?ok=1");
  }

  return (
    <form action={enregistrer}>
      <input type="hidden" name="compareCount" value={lignes.length} />
      {/* Soumission implicite (touche Entrée dans un champ) : sans ce
          bouton placé en tête du document, le navigateur déclencherait le
          premier bouton rencontré — ici « monter » de la première ligne. */}
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

      <div className="adm-head">
        <div>
          <span className="c-label c-label--accent">Contenu</span>
          <h1>Textes et prix</h1>
        </div>
        <button type="submit" name="op" value="enregistrer" className="c-btn c-btn--solid">
          Enregistrer
        </button>
        <p>
          Les blocs que vous ajusterez réellement : le nom de la maison, son
          accroche, le titre de l&apos;accueil, le téléphone, les quatre prix et
          le tableau comparatif. Le reste — plan, matériaux, visite — relève de
          la fiche produit et reste dans le code, où il est versionné et relu.
        </p>
      </div>

      {ok ? (
        <p className="adm-note" role="status">
          Modifications enregistrées. Les pages publiques ont été rafraîchies.
        </p>
      ) : null}

      {!inscriptible ? (
        <p className="adm-note adm-note--alerte">
          ⚠ <strong>Le stockage est en lecture seule sur cet hébergement.</strong> Vos
          modifications ne seront pas conservées. Voir la note d&apos;architecture en
          tête de <code>src/lib/store/index.ts</code>.
        </p>
      ) : null}

      <p className="adm-note adm-note--alerte">
        ⚠ <strong>Les prix affichés aujourd&apos;hui sont provisoires.</strong> Ils
        viennent du code et ont été calés sur la médiane des annonces Vitahome pour
        rester plausibles — ce ne sont pas vos tarifs. Chaque champ ci-dessous
        affiche en gris la valeur actuellement publiée : c&apos;est ce que voient
        vos visiteurs. Tant que vous ne saisissez rien, elle reste affichée. Dès
        que vous saisissez, c&apos;est votre valeur qui est publiée — et vider un
        champ revient à la valeur du code.
      </p>

      {/* ════ LA MAISON ════ */}
      <section className="adm-card">
        <h2>La maison</h2>
        <div className="adm-grid">
          <div className="adm-field">
            <label htmlFor="houseName">Nom commercial</label>
            <input
              id="houseName"
              name="houseName"
              type="text"
              defaultValue={t.houseName ?? ""}
              placeholder={PLACEHOLDER.houseName}
              autoComplete="off"
            />
            <span className="adm-field__aide">
              Le nom de la maison, repris partout sur le site.
            </span>
          </div>
          <div className="adm-field">
            <label htmlFor="telephone">Téléphone commercial</label>
            <input
              id="telephone"
              name="telephone"
              type="text"
              defaultValue={t.telephone ?? ""}
              placeholder={PLACEHOLDER.phone}
              autoComplete="off"
            />
            <span className="adm-field__aide">
              Affiché dans l&apos;en-tête, le pied de page et les fiches.
            </span>
          </div>
        </div>

        <div className="adm-grid">
          <div className="adm-field">
            <label htmlFor="heroTitre">Titre de la page d&apos;accueil</label>
            <input
              id="heroTitre"
              name="heroTitre"
              type="text"
              defaultValue={t.heroTitre ?? ""}
              placeholder={HERO_ACTUEL}
            />
            <span className="adm-field__aide">
              Le grand titre du haut de l&apos;accueil, et le seul h1 de la page.
              Court : il est composé en très grand.
            </span>
          </div>
          <div className="adm-field">
            <label htmlFor="tagline">Accroche</label>
            <textarea
              id="tagline"
              name="tagline"
              rows={3}
              defaultValue={t.tagline ?? ""}
              placeholder={ESSENSYA_DATA.house.tagline}
            />
            <span className="adm-field__aide">
              La phrase qui suit le titre. Deux lignes maximum.
            </span>
          </div>
        </div>
      </section>

      {/* ════ LES PRIX ════ */}
      <section className="adm-card">
        <h2>Les prix</h2>
        <p className="adm-field__aide">
          En euros, sans le symbole. Les espaces sont ignorés : « 99 900 » et
          « 99900 » sont équivalents.
        </p>
        <div className="adm-grid">
          <div className="adm-field">
            <label htmlFor="maison3ch">Maison 3 chambres — à partir de</label>
            <input
              id="maison3ch"
              name="maison3ch"
              type="text"
              inputMode="numeric"
              defaultValue={t.prix?.maison3ch ?? ""}
              placeholder={NF.format(PLACEHOLDER.priceFrom3ch)}
            />
            <span className="adm-field__aide">Maison seule, hors terrain.</span>
          </div>
          <div className="adm-field">
            <label htmlFor="maison2ch">Maison 2 chambres — à partir de</label>
            <input
              id="maison2ch"
              name="maison2ch"
              type="text"
              inputMode="numeric"
              defaultValue={t.prix?.maison2ch ?? ""}
              placeholder={NF.format(PLACEHOLDER.priceFrom2ch)}
            />
            <span className="adm-field__aide">
              Maison seule, hors terrain. C&apos;est le prix d&apos;appel du site.
            </span>
          </div>
          <div className="adm-field">
            <label htmlFor="total">Terrain + maison — à partir de</label>
            <input
              id="total"
              name="total"
              type="text"
              inputMode="numeric"
              defaultValue={t.prix?.total ?? ""}
              placeholder={NF.format(PLACEHOLDER.priceFromTotal)}
            />
            <span className="adm-field__aide">Le prix affiché sur l&apos;accueil.</span>
          </div>
          <div className="adm-field">
            <label htmlFor="mensualite">Mensualité indicative</label>
            <input
              id="mensualite"
              name="mensualite"
              type="text"
              inputMode="numeric"
              defaultValue={t.prix?.mensualite ?? ""}
              placeholder={NF.format(PLACEHOLDER.monthly)}
            />
            <span className="adm-field__aide">
              ⚠ Une mensualité est une publicité pour un crédit : elle impose des
              mentions légales obligatoires (TAEG, durée, coût total). À ne
              renseigner qu&apos;après validation juridique.
            </span>
          </div>
        </div>
      </section>

      {/* ════ LE COMPARATIF ════ */}
      <section className="adm-card">
        <h2>Le comparatif</h2>
        <p className="adm-field__aide">
          Le tableau « pourquoi c&apos;est moins cher ».{" "}
          {heritees
            ? "Les lignes ci-dessous sont celles affichées aujourd'hui, reprises du code : corrigez-les, le premier enregistrement vous en donne la main."
            : "Cochez « avantage » pour mettre la valeur Essensya en évidence."}{" "}
          Les flèches déplacent une ligne : l&apos;ordre du tableau est l&apos;ordre
          de lecture de l&apos;argumentaire.
        </p>

        {lignes.length === 0 ? (
          <p className="adm-empty">
            <strong>Aucune ligne</strong>
            Le tableau comparatif ne sera pas affiché sur le site.
          </p>
        ) : (
          lignes.map((r, i) => (
            <div key={`ligne-${i}`}>
              <div className="adm-grid">
                <div className="adm-field">
                  <label htmlFor={`poste_${i}`}>Poste</label>
                  <input id={`poste_${i}`} name={`poste_${i}`} type="text" defaultValue={r.poste} />
                </div>
                <div className="adm-field">
                  <label htmlFor={`essensya_${i}`}>Essensya</label>
                  <input
                    id={`essensya_${i}`}
                    name={`essensya_${i}`}
                    type="text"
                    defaultValue={r.essensya}
                  />
                </div>
                <div className="adm-field">
                  <label htmlFor={`classique_${i}`}>Constructeur classique</label>
                  <input
                    id={`classique_${i}`}
                    name={`classique_${i}`}
                    type="text"
                    defaultValue={r.classique}
                  />
                </div>
                <div className="adm-field adm-field--case">
                  <input
                    id={`gain_${i}`}
                    name={`gain_${i}`}
                    type="checkbox"
                    defaultChecked={r.gain === true}
                  />
                  <label htmlFor={`gain_${i}`}>Avantage Essensya</label>
                </div>
              </div>
              <div className="adm-actions">
                <button
                  type="submit"
                  name="op"
                  value={`monter:${i}`}
                  className="c-btn"
                  disabled={i === 0}
                >
                  <span aria-hidden="true">↑</span>
                  <span className="u-sr-only">Monter la ligne {r.poste || i + 1}</span>
                </button>
                <button
                  type="submit"
                  name="op"
                  value={`descendre:${i}`}
                  className="c-btn"
                  disabled={i === lignes.length - 1}
                >
                  <span aria-hidden="true">↓</span>
                  <span className="u-sr-only">Descendre la ligne {r.poste || i + 1}</span>
                </button>
                <button
                  type="submit"
                  name="op"
                  value={`supprimer:${i}`}
                  className="c-btn c-btn--danger"
                >
                  Supprimer<span className="u-sr-only"> la ligne {r.poste || i + 1}</span>
                </button>
              </div>
            </div>
          ))
        )}

        <div className="adm-actions">
          <button type="submit" name="op" value="ajouter" className="c-btn">
            Ajouter une ligne
          </button>
        </div>
      </section>

      <div className="adm-actions">
        <button type="submit" name="op" value="enregistrer" className="c-btn c-btn--solid">
          Enregistrer
        </button>
      </div>
    </form>
  );
}
