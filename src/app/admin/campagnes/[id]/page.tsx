import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import GuideEcran from "@/components/admin/GuideEcran";
import MediaPicker from "@/components/admin/MediaPicker";
import PageCampagneVue from "@/components/PageCampagneVue";
import {
  CHAMPS_FORMULAIRE,
  FORMULAIRE_DEFAUT,
  TYPES_BLOC,
  blocVide,
  estEnLigne,
  slugLibre,
  slugifier,
  typeBloc,
  utiliseChamp,
} from "@/lib/campagnes";
import { landingUrl } from "@/lib/format";
import { SITE_URL } from "@/lib/site-url";
import { getContentFrais, isWritable, patchContent } from "@/lib/store";
import type { BlocCampagne, PageCampagne, TypeBlocCampagne } from "@/lib/store/types";
import { assertAdmin, requireAdmin } from "../../actions";
import "@/styles/prose.css";
import "@/styles/pages/gamme.css";
import "@/styles/pages/landing.css";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — ÉDITION D'UNE PAGE DE CAMPAGNE

   Une seule route pour créer et modifier : l'identifiant réservé
   « nouvelle » ouvre une page vide. Même choix que le blog.

   ── UN SEUL FORMULAIRE, PLUSIEURS BOUTONS ──
   Même mécanique que l'écran Menus : chaque bouton porte son opération
   dans son `value` (`ajouter:texte`, `monter:2`, `suppr:0`…), et
   l'action RELIT TOUS LES CHAMPS avant de l'appliquer. Ajouter un bloc
   ne fait donc jamais perdre une phrase tapée dans un autre, et l'écran
   fonctionne sans JavaScript. Contrepartie assumée : chaque opération
   ENREGISTRE la page — sur une page en ligne, la modification est
   aussitôt visible. L'écran le dit en tête.

   ── L'APERÇU ──
   `?apercu=1` rend la page avec le composant même de la page publique
   (src/components/PageCampagneVue.tsx), formulaires inertes. Il vit ici,
   authentifié, pour la même raison que l'aperçu du blog : servir les
   brouillons sur /lp/ obligerait la route publique à lire un cookie, et
   la ferait passer entière en rendu dynamique.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Page de campagne",
  robots: { index: false, follow: false },
};

/** Identifiant réservé qui ouvre le formulaire de création. */
const NOUVELLE = "nouvelle";

/** Plafond de relecture : un compteur forgé ne doit pas faire lire mille champs. */
const MAX_BLOCS = 40;

const FONDS = ["clair", "sable", "sombre"] as const;
const LIBELLE_FOND: Record<(typeof FONDS)[number], string> = {
  clair: "Clair",
  sable: "Gris clair",
  sombre: "Sombre",
};

/* L'introduction d'une carte, collée sinon au libellé du premier champ. */
const INTRO: React.CSSProperties = { margin: ".4rem 0 var(--s-2)" };

const VIDE: PageCampagne = {
  id: "",
  slug: "",
  nom: "",
  publiee: false,
  titre: "",
  points: [],
  formulaireEnTete: true,
  /* La commune est cochée d'emblée : c'est elle qui permet d'adresser la
     demande à la bonne agence. */
  formulaire: { champs: ["zone"] },
  blocs: [],
};

const txt = (v: FormDataEntryValue | null): string => (typeof v === "string" ? v.trim() : "");
const opt = (v: FormDataEntryValue | null): string | undefined => txt(v) || undefined;
const compte = (v: FormDataEntryValue | null, max: number): number => {
  const n = Number(txt(v));
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : 0;
};

const fmtDate = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Paris",
      }).format(d);
};

/** Relit un bloc du formulaire. Seuls les champs de son type sont gardés. */
function lireBloc(fd: FormData, i: number): BlocCampagne | null {
  const p = `b_${i}_`;
  const def = typeBloc(txt(fd.get(`${p}type`)));
  if (!def) return null;
  const t = def.type;
  const bloc: BlocCampagne = { id: txt(fd.get(`${p}id`)) || randomUUID(), type: t };
  if (utiliseChamp(t, "surtitre")) bloc.surtitre = opt(fd.get(`${p}surtitre`));
  if (utiliseChamp(t, "titre")) bloc.titre = opt(fd.get(`${p}titre`));
  if (utiliseChamp(t, "texte")) bloc.texte = opt(fd.get(`${p}texte`));
  if (utiliseChamp(t, "image")) {
    bloc.image = opt(fd.get(`${p}image`));
    bloc.imageAlt = opt(fd.get(`${p}imageAlt`));
  }
  if (utiliseChamp(t, "legende")) bloc.legende = opt(fd.get(`${p}legende`));
  if (utiliseChamp(t, "imageAGauche")) bloc.imageAGauche = fd.get(`${p}imageAGauche`) === "on";
  if (utiliseChamp(t, "fond")) {
    const f = txt(fd.get(`${p}fond`));
    bloc.fond = (FONDS as readonly string[]).includes(f) ? (f as BlocCampagne["fond"]) : "clair";
  }
  return bloc;
}

export default async function EditionCampagnePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ apercu?: string; ok?: string; renomme?: string; avert?: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const { apercu, ok, renomme, avert } = await searchParams;
  const creation = id === NOUVELLE;

  const [content, ecriture] = await Promise.all([getContentFrais(), isWritable()]);
  const page = creation ? VIDE : (content.campagnes.find((p) => p.id === id) ?? null);
  /* Identifiant inconnu : 404 franc. Basculer en création laisserait
     croire que la page existe encore. */
  if (!page) notFound();

  const enLigne = !creation && estEnLigne(page);

  /* ════ SERVER ACTION ════ */
  async function enregistrer(formData: FormData) {
    "use server";
    /* Point d'entrée HTTP public : le garde est ICI. */
    await assertAdmin();

    /* Relecture fraîche au moment d'écrire : la liste est renvoyée
       entière, une lecture périmée effacerait la page qu'un collègue
       vient de créer (voir `getContentFrais`). */
    const actuelles = (await getContentFrais()).campagnes;
    const origine = txt(formData.get("id"));
    const index = origine ? actuelles.findIndex((p) => p.id === origine) : -1;
    const ancienne = index >= 0 ? actuelles[index] : null;
    const idFinal = ancienne?.id ?? randomUUID();

    /* ── Les blocs, relus en entier avant l'opération ── */
    const blocs: BlocCampagne[] = [];
    const nb = compte(formData.get("bCount"), MAX_BLOCS);
    for (let i = 0; i < nb; i += 1) {
      const b = lireBloc(formData, i);
      if (b) blocs.push(b);
    }

    const brut = formData.get("op");
    const [op, arg] = (typeof brut === "string" ? brut : "enregistrer").split(":");
    const i = Number(arg);
    const echanger = (de: number, vers: number) => {
      if (de < 0 || vers < 0 || de >= blocs.length || vers >= blocs.length) return;
      [blocs[de], blocs[vers]] = [blocs[vers], blocs[de]];
    };

    /* L'ancre où revenir : le bloc touché, pour ne pas remonter en haut
       d'une page de vingt écrans après chaque clic. */
    let ancre = "";
    if (op === "ajouter" && typeBloc(arg) && blocs.length < MAX_BLOCS) {
      const neuf = blocVide(arg as TypeBlocCampagne, randomUUID());
      blocs.push(neuf);
      ancre = `bloc-${neuf.id}`;
    } else if (op === "monter") {
      echanger(i, i - 1);
      ancre = blocs[i - 1] ? `bloc-${blocs[i - 1].id}` : "blocs";
    } else if (op === "descendre") {
      echanger(i, i + 1);
      ancre = blocs[i + 1] ? `bloc-${blocs[i + 1].id}` : "blocs";
    } else if (op === "suppr" && i >= 0 && i < blocs.length) {
      blocs.splice(i, 1);
      ancre = "blocs";
    }

    /* ── L'adresse ── unique parmi les AUTRES pages du back-office. Les
       pages du code n'y figurent pas : prendre leur adresse est
       justement la façon de les remplacer. */
    const titre = txt(formData.get("titre"));
    const nom = txt(formData.get("nom")) || titre || "Page sans nom";
    const souhaite = slugifier(txt(formData.get("slug")) || nom) || "campagne";
    const autres = actuelles.filter((p) => p.id !== idFinal).map((p) => p.slug);
    const slug = slugLibre(souhaite, autres);

    /* Pas de mise en ligne sans titre : le visiteur arriverait sur un
       formulaire sans promesse. On garde tout le reste, et on le dit. */
    let publiee = formData.get("publiee") === "on";
    const sansTitre = publiee && !titre;
    if (sansTitre) publiee = false;

    const suivante: PageCampagne = {
      id: idFinal,
      slug,
      nom,
      publiee,
      surtitre: opt(formData.get("surtitre")),
      titre,
      sousTitre: opt(formData.get("sousTitre")),
      chiffre: opt(formData.get("chiffre")),
      chiffreNote: opt(formData.get("chiffreNote")),
      points: txt(formData.get("points"))
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      image: opt(formData.get("image")),
      imageAlt: opt(formData.get("imageAlt")),
      formulaireEnTete: formData.get("formulaireEnTete") === "on",
      formulaire: {
        titre: opt(formData.get("f_titre")),
        texte: opt(formData.get("f_texte")),
        champs: CHAMPS_FORMULAIRE.filter((c) => formData.get(`f_${c.champ}`) === "on").map(
          (c) => c.champ,
        ),
        bouton: opt(formData.get("f_bouton")),
        confirmation: opt(formData.get("f_confirmation")),
      },
      blocs,
      seo: {
        title: opt(formData.get("seoTitle")),
        description: opt(formData.get("seoDescription")),
      },
      majLe: new Date().toISOString(),
    };

    const liste = [...actuelles];
    if (index >= 0) liste[index] = suivante;
    else liste.push(suivante);
    await patchContent("campagnes", liste);

    revalidatePath(landingUrl(slug));
    /* Un renommage laisse l'ancienne adresse en cache : on la revalide
       pour qu'elle rende une page introuvable — ou la page du code
       qu'elle avait remplacée. */
    if (ancienne && ancienne.slug !== slug) revalidatePath(landingUrl(ancienne.slug));

    const q = new URLSearchParams();
    if (op === "apercu") q.set("apercu", "1");
    else if (!ancre) q.set("ok", "1");
    if (slug !== souhaite) q.set("renomme", "1");
    if (sansTitre) q.set("avert", "titre");
    const chaine = q.toString();
    redirect(
      `/admin/campagnes/${idFinal}${chaine ? `?${chaine}` : ""}${ancre ? `#${ancre}` : ""}`,
    );
  }

  /* ════ APERÇU ════ */
  if (apercu && !creation) {
    return (
      <>
        <div className="adm-note" role="status" style={{ marginBottom: "var(--s-3)" }}>
          <strong>Aperçu</strong> —{" "}
          {enLigne ? (
            <>
              page en ligne à l&apos;adresse <code>{landingUrl(page.slug)}</code>.
            </>
          ) : (
            "page hors ligne : invisible du public tant qu'elle n'est pas publiée."
          )}{" "}
          Les formulaires sont désactivés ici : un essai depuis l&apos;aperçu
          n&apos;enverra rien à l&apos;agence.{" "}
          <Link href={`/admin/campagnes/${page.id}`}>Retour à l&apos;édition</Link>
        </div>
        {page.titre.trim() ? (
          <PageCampagneVue page={page} apercu />
        ) : (
          <p className="adm-empty">
            <strong>Pas encore de titre</strong>
            Donnez un titre à l&apos;en-tête pour voir la page.
          </p>
        )}
      </>
    );
  }

  /* ════ FORMULAIRE ════ */
  const adresse = page.slug ? `${SITE_URL}${landingUrl(page.slug)}` : "";
  const f = page.formulaire;

  return (
    <form action={enregistrer}>
      <input type="hidden" name="id" value={page.id} />
      <input type="hidden" name="bCount" value={page.blocs.length} />

      {/* Touche Entrée dans un champ : sans ce bouton en tête, le
          navigateur déclencherait le premier bouton du document — ici
          « monter » du premier bloc. */}
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
          <span className="c-label c-label--accent">
            <Link href="/admin/campagnes">Pages de campagne</Link> /{" "}
            {creation ? "Nouvelle page" : "Édition"}
          </span>
          <h1>{creation ? "Nouvelle page de campagne" : page.nom || "Page sans nom"}</h1>
        </div>
        <div className="adm-actions adm-actions--serre">
          {enLigne ? (
            <a
              href={landingUrl(page.slug)}
              className="c-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              Voir en ligne <span aria-hidden="true">↗</span>
            </a>
          ) : null}
          <button type="submit" name="op" value="apercu" className="c-btn">
            Enregistrer et prévisualiser
          </button>
          <button type="submit" name="op" value="enregistrer" className="c-btn c-btn--solid">
            Enregistrer
          </button>
        </div>
      </div>

      <GuideEcran cle="campagnes" />

      {!ecriture ? (
        <p className="adm-note adm-note--alerte">
          ⚠ <strong>Le stockage est en lecture seule sur cet hébergement.</strong> Vos
          modifications ne seront pas conservées.
        </p>
      ) : null}
      {ok ? (
        <p className="adm-note" role="status">
          Page enregistrée{page.majLe ? ` le ${fmtDate(page.majLe)}` : ""}.
          {enLigne ? " Elle est en ligne : la modification est déjà visible." : ""}
        </p>
      ) : null}
      {renomme ? (
        <p className="adm-note" role="status">
          L&apos;adresse a été ajustée en <code>{landingUrl(page.slug)}</code> : une autre
          page de campagne utilisait déjà celle demandée.
        </p>
      ) : null}
      {avert === "titre" ? (
        <p className="adm-note adm-note--alerte" role="status">
          La page n&apos;a pas été mise en ligne : il lui manque un titre. Tout le reste
          est enregistré.
        </p>
      ) : null}
      {enLigne ? (
        <p className="adm-note">
          Cette page est <strong>en ligne</strong> : chaque bouton de cet écran — y
          compris « Ajouter un bloc », « ↑ » ou « Retirer » — enregistre la page, et
          le changement est aussitôt visible des visiteurs.
        </p>
      ) : null}

      {/* ════ LA CAMPAGNE ════ */}
      <section className="adm-card">
        <h2>La campagne</h2>
        <div className="adm-grid">
          <div className="adm-field">
            <label htmlFor="nom">Nom de la campagne</label>
            <input
              id="nom"
              name="nom"
              type="text"
              defaultValue={page.nom}
              placeholder="Meta — Tartas, prix de lancement, novembre"
            />
            <span className="adm-field__aide">
              Pour vous : jamais affiché au visiteur. Il est transmis à l&apos;agence
              avec chaque demande reçue par cette page, pour savoir quelle annonce a
              fait venir le prospect.
            </span>
          </div>
          <div className="adm-field">
            <label htmlFor="slug">Adresse de la page</label>
            <input
              id="slug"
              name="slug"
              type="text"
              defaultValue={page.slug}
              placeholder={page.nom ? slugifier(page.nom) : "derivee-du-nom"}
            />
            <span className="adm-field__aide">
              {adresse ? (
                <>
                  <code>{adresse}</code> — l&apos;adresse à coller dans l&apos;annonce.
                  Les paramètres de suivi de la plateforme (utm…) peuvent y être
                  ajoutés : ils partent au CRM avec la demande.{" "}
                </>
              ) : (
                <>
                  <code>/lp/…</code> — laissez vide pour la dériver du nom.{" "}
                </>
              )}
              Une fois l&apos;annonce diffusée, ne la changez plus : l&apos;ancienne
              adresse renverrait une page introuvable.
            </span>
          </div>
        </div>
        <div className="adm-field" style={{ marginTop: "var(--s-3)" }}>
          <div className="adm-field adm-field--case">
            <input id="publiee" name="publiee" type="checkbox" defaultChecked={page.publiee} />
            <label htmlFor="publiee">Page en ligne</label>
          </div>
          <span className="adm-field__aide">
            Décochée, l&apos;adresse renvoie une page introuvable — à faire quand la
            campagne s&apos;arrête, plutôt que de supprimer la page. Il faut un titre
            pour la mettre en ligne.
          </span>
        </div>
      </section>

      {/* ════ L'EN-TÊTE ════ */}
      <section className="adm-card">
        <h2>L&apos;en-tête</h2>
        <p className="adm-field__aide" style={INTRO}>
          Le premier écran, celui que voit la personne qui vient de cliquer sur
          l&apos;annonce. Il doit reprendre mot pour mot la promesse de l&apos;annonce :
          c&apos;est ce qui lui confirme qu&apos;elle est au bon endroit.
        </p>
        <div className="adm-grid">
          <div className="adm-field">
            <label htmlFor="surtitre">Pastille au-dessus du titre</label>
            <input
              id="surtitre"
              name="surtitre"
              type="text"
              defaultValue={page.surtitre ?? ""}
              placeholder="Prix de lancement"
            />
            <span className="adm-field__aide">Facultative. Vide, pas de pastille.</span>
          </div>
          <div className="adm-field">
            <label htmlFor="titre">Titre *</label>
            <input
              id="titre"
              name="titre"
              type="text"
              defaultValue={page.titre}
              placeholder="Votre maison neuve à Tartas"
            />
            <span className="adm-field__aide">Le grand titre de la page (H1).</span>
          </div>
        </div>
        <div className="adm-field" style={{ marginTop: "var(--s-3)" }}>
          <label htmlFor="sousTitre">Accroche</label>
          <textarea
            id="sousTitre"
            name="sousTitre"
            rows={3}
            defaultValue={page.sousTitre ?? ""}
            placeholder="Une ou deux phrases sous le titre."
          />
        </div>
        <div className="adm-grid" style={{ marginTop: "var(--s-3)" }}>
          <div className="adm-field">
            <label htmlFor="chiffre">Chiffre mis en avant</label>
            <input
              id="chiffre"
              name="chiffre"
              type="text"
              defaultValue={page.chiffre ?? ""}
              placeholder="78 000 €"
            />
            <span className="adm-field__aide">
              Facultatif. ⚠ Texte libre : il ne suit pas les changements de prix du
              site. À vérifier à chaque changement de tarif, comme l&apos;annonce
              elle-même.
            </span>
          </div>
          <div className="adm-field">
            <label htmlFor="chiffreNote">Précision sous le chiffre</label>
            <input
              id="chiffreNote"
              name="chiffreNote"
              type="text"
              defaultValue={page.chiffreNote ?? ""}
              placeholder="Maison seule, hors terrain"
            />
            <span className="adm-field__aide">
              Ce que le chiffre comprend ou non. Sous un prix, elle n&apos;est pas
              facultative.
            </span>
          </div>
        </div>
        <div className="adm-field" style={{ marginTop: "var(--s-3)" }}>
          <label htmlFor="points">Points forts</label>
          <textarea
            id="points"
            name="points"
            rows={4}
            defaultValue={page.points.join("\n")}
            placeholder={"Terrain déjà sélectionné par l'agence\nToutes les garanties du CCMI"}
          />
          <span className="adm-field__aide">
            Un point par ligne, affichés en liste sous le titre. Vide, pas de liste.
          </span>
        </div>
        <div className="adm-grid" style={{ marginTop: "var(--s-3)" }}>
          <MediaPicker
            name="image"
            value={page.image ?? ""}
            label="Image de fond"
            aide="Assombrie derrière le titre. Format paysage, 1600 px de large au moins. Sans image, le fond est uni."
          />
          <div className="adm-field">
            <label htmlFor="imageAlt">Description de l&apos;image</label>
            <input
              id="imageAlt"
              name="imageAlt"
              type="text"
              defaultValue={page.imageAlt ?? ""}
              placeholder="Maison plain-pied, façade enduit clair"
            />
            <span className="adm-field__aide">
              Lue par les lecteurs d&apos;écran. Décrivez ce que l&apos;on voit.
            </span>
          </div>
        </div>
        <div className="adm-field adm-field--case" style={{ marginTop: "var(--s-3)" }}>
          <input
            id="formulaireEnTete"
            name="formulaireEnTete"
            type="checkbox"
            defaultChecked={page.formulaireEnTete}
          />
          <label htmlFor="formulaireEnTete">Afficher le formulaire à côté du titre</label>
        </div>
      </section>

      {/* ════ LE FORMULAIRE ════ */}
      <section className="adm-card">
        <h2>Le formulaire</h2>
        <p className="adm-field__aide" style={INTRO}>
          Le même partout où il apparaît : à côté du titre si la case est cochée
          ci-dessus, et dans chaque bloc « Formulaire ». Nom, téléphone, e-mail et les
          cases de consentement sont toujours présents — ils ne se retirent pas.
        </p>
        <div className="adm-grid">
          <div className="adm-field">
            <label htmlFor="f_titre">Titre du formulaire</label>
            <input
              id="f_titre"
              name="f_titre"
              type="text"
              defaultValue={f.titre ?? ""}
              placeholder={FORMULAIRE_DEFAUT.titre}
            />
          </div>
          <div className="adm-field">
            <label htmlFor="f_bouton">Texte du bouton</label>
            <input
              id="f_bouton"
              name="f_bouton"
              type="text"
              defaultValue={f.bouton ?? ""}
              placeholder={FORMULAIRE_DEFAUT.bouton}
            />
          </div>
        </div>
        <div className="adm-field" style={{ marginTop: "var(--s-3)" }}>
          <label htmlFor="f_texte">Texte sous le titre</label>
          <textarea
            id="f_texte"
            name="f_texte"
            rows={2}
            defaultValue={f.texte ?? ""}
            placeholder="Ce que la personne recevra, et sous quel délai."
          />
        </div>
        <div className="adm-field" style={{ marginTop: "var(--s-3)" }}>
          <span className="adm-field__label">Champs en plus</span>
          {CHAMPS_FORMULAIRE.map((c) => (
            <div key={c.champ}>
              <div className="adm-field adm-field--case">
                <input
                  id={`f_${c.champ}`}
                  name={`f_${c.champ}`}
                  type="checkbox"
                  defaultChecked={f.champs.includes(c.champ)}
                />
                <label htmlFor={`f_${c.champ}`}>{c.label}</label>
              </div>
              <span className="adm-field__aide">{c.aide}</span>
            </div>
          ))}
        </div>
        <div className="adm-field" style={{ marginTop: "var(--s-3)" }}>
          <label htmlFor="f_confirmation">Message après l&apos;envoi</label>
          <input
            id="f_confirmation"
            name="f_confirmation"
            type="text"
            defaultValue={f.confirmation ?? ""}
            placeholder={FORMULAIRE_DEFAUT.confirmation}
          />
          <span className="adm-field__aide">
            Ne promettez que ce que l&apos;agence tient : un délai de rappel écrit ici
            engage.
          </span>
        </div>
      </section>

      {/* ════ LES BLOCS ════ */}
      <section className="adm-card" id="blocs">
        <h2>Les blocs, sous l&apos;en-tête</h2>
        <p className="adm-field__aide" style={INTRO}>
          Ils s&apos;affichent dans cet ordre, de haut en bas. Un bloc laissé vide
          n&apos;apparaît pas sur la page.
        </p>

        {page.blocs.length === 0 ? (
          <div className="adm-empty" style={{ marginTop: "var(--s-3)" }}>
            <strong>Aucun bloc</strong>
            La page se limite à l&apos;en-tête. Ajoutez un argument, une photo ou le
            formulaire repris en bas de page.
          </div>
        ) : null}

        {page.blocs.map((b, i) => {
          const def = typeBloc(b.type);
          if (!def) return null;
          const p = `b_${i}_`;
          return (
            <div
              key={b.id}
              id={`bloc-${b.id}`}
              className="adm-card"
              style={{ marginTop: "var(--s-3)", background: "var(--craie)" }}
            >
              <input type="hidden" name={`${p}id`} value={b.id} />
              <input type="hidden" name={`${p}type`} value={b.type} />
              <div className="adm-toolbar">
                <div>
                  <span className="c-label">Bloc {i + 1}</span>{" "}
                  <strong>{def.label}</strong>
                </div>
                <div className="adm-actions adm-actions--serre" style={{ marginTop: 0 }}>
                  <button
                    type="submit"
                    name="op"
                    value={`monter:${i}`}
                    className="c-btn"
                    disabled={i === 0}
                    aria-label={`Monter le bloc ${i + 1}`}
                  >
                    ↑
                  </button>
                  <button
                    type="submit"
                    name="op"
                    value={`descendre:${i}`}
                    className="c-btn"
                    disabled={i === page.blocs.length - 1}
                    aria-label={`Descendre le bloc ${i + 1}`}
                  >
                    ↓
                  </button>
                  <button
                    type="submit"
                    name="op"
                    value={`suppr:${i}`}
                    className="c-btn c-btn--danger"
                  >
                    Retirer
                  </button>
                </div>
              </div>
              <p className="adm-field__aide" style={INTRO}>{def.aide}</p>

              {utiliseChamp(b.type, "surtitre") || utiliseChamp(b.type, "titre") ? (
                <div className="adm-grid" style={{ marginTop: "var(--s-2)" }}>
                  {utiliseChamp(b.type, "surtitre") ? (
                    <div className="adm-field">
                      <label htmlFor={`${p}surtitre`}>Petit titre</label>
                      <input
                        id={`${p}surtitre`}
                        name={`${p}surtitre`}
                        type="text"
                        defaultValue={b.surtitre ?? ""}
                      />
                    </div>
                  ) : null}
                  {utiliseChamp(b.type, "titre") ? (
                    <div className="adm-field">
                      <label htmlFor={`${p}titre`}>Titre</label>
                      <input
                        id={`${p}titre`}
                        name={`${p}titre`}
                        type="text"
                        defaultValue={b.titre ?? ""}
                        placeholder={
                          b.type === "formulaire"
                            ? f.titre || FORMULAIRE_DEFAUT.titre
                            : b.type === "compris"
                              ? "Ce que le prix comprend"
                              : ""
                        }
                      />
                      {b.type === "formulaire" ? (
                        <span className="adm-field__aide">
                          Vide, reprend le titre du formulaire.
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {utiliseChamp(b.type, "texte") ? (
                <div className="adm-field" style={{ marginTop: "var(--s-2)" }}>
                  <label htmlFor={`${p}texte`}>Texte</label>
                  <textarea
                    id={`${p}texte`}
                    name={`${p}texte`}
                    rows={b.type === "formulaire" ? 2 : 7}
                    defaultValue={b.texte ?? ""}
                    placeholder={b.type === "formulaire" ? f.texte || "" : ""}
                  />
                  <span className="adm-field__aide">
                    {b.type === "formulaire" ? (
                      "Vide, reprend le texte du formulaire."
                    ) : (
                      <>
                        Une ligne vide entre deux paragraphes, <code>**gras**</code>, un
                        tiret en début de ligne pour une puce,{" "}
                        <code>[texte](/maisons)</code> pour un lien. Le HTML n&apos;est
                        pas interprété.
                      </>
                    )}
                  </span>
                </div>
              ) : null}

              {utiliseChamp(b.type, "image") ? (
                <div className="adm-grid" style={{ marginTop: "var(--s-2)" }}>
                  <MediaPicker
                    name={`${p}image`}
                    value={b.image ?? ""}
                    label="Image"
                    aide={
                      b.type === "image"
                        ? "Sur toute la largeur de la page : format paysage."
                        : "À côté du texte, recadrée en 4:3."
                    }
                  />
                  <div className="adm-field">
                    <label htmlFor={`${p}imageAlt`}>Description de l&apos;image</label>
                    <input
                      id={`${p}imageAlt`}
                      name={`${p}imageAlt`}
                      type="text"
                      defaultValue={b.imageAlt ?? ""}
                    />
                    <span className="adm-field__aide">
                      Lue par les lecteurs d&apos;écran. Décrivez ce que l&apos;on voit.
                    </span>
                  </div>
                </div>
              ) : null}

              {utiliseChamp(b.type, "legende") ? (
                <div className="adm-field" style={{ marginTop: "var(--s-2)" }}>
                  <label htmlFor={`${p}legende`}>Légende</label>
                  <input
                    id={`${p}legende`}
                    name={`${p}legende`}
                    type="text"
                    defaultValue={b.legende ?? ""}
                  />
                  <span className="adm-field__aide">
                    Facultative, affichée sous l&apos;image. Une image de synthèse se
                    dit : « Image non contractuelle ».
                  </span>
                </div>
              ) : null}

              {utiliseChamp(b.type, "imageAGauche") || utiliseChamp(b.type, "fond") ? (
                <div className="adm-grid" style={{ marginTop: "var(--s-2)" }}>
                  {utiliseChamp(b.type, "fond") ? (
                    <div className="adm-field">
                      <label htmlFor={`${p}fond`}>Fond</label>
                      <select id={`${p}fond`} name={`${p}fond`} defaultValue={b.fond ?? "clair"}>
                        {FONDS.map((x) => (
                          <option key={x} value={x}>
                            {LIBELLE_FOND[x]}
                          </option>
                        ))}
                      </select>
                      <span className="adm-field__aide">
                        Alterner les fonds sépare visuellement deux blocs qui se suivent.
                      </span>
                    </div>
                  ) : null}
                  {utiliseChamp(b.type, "imageAGauche") ? (
                    <div className="adm-field adm-field--case">
                      <input
                        id={`${p}imageAGauche`}
                        name={`${p}imageAGauche`}
                        type="checkbox"
                        defaultChecked={b.imageAGauche ?? false}
                      />
                      <label htmlFor={`${p}imageAGauche`}>Image à gauche du texte</label>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        <div style={{ marginTop: "var(--s-3)" }}>
          <span className="adm-field__label">Ajouter un bloc</span>
          <div className="adm-actions adm-actions--serre">
            {TYPES_BLOC.map((t) => (
              <button
                key={t.type}
                type="submit"
                name="op"
                value={`ajouter:${t.type}`}
                className="c-btn"
                title={t.aide}
                disabled={page.blocs.length >= MAX_BLOCS}
              >
                + {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ════ PARTAGE ════ */}
      <section className="adm-card">
        <h2>Onglet et partage</h2>
        <p className="adm-field__aide" style={INTRO}>
          La page n&apos;est jamais proposée à Google : ces deux champs servent au
          titre de l&apos;onglet et à l&apos;aperçu quand le lien est partagé (messagerie,
          réseaux). Vides, ils reprennent le titre et l&apos;accroche.
        </p>
        <div className="adm-field">
          <label htmlFor="seoTitle">Titre de l&apos;onglet</label>
          <input
            id="seoTitle"
            name="seoTitle"
            type="text"
            defaultValue={page.seo?.title ?? ""}
            placeholder={page.titre || "Reprend le titre"}
          />
        </div>
        <div className="adm-field" style={{ marginTop: "var(--s-2)" }}>
          <label htmlFor="seoDescription">Description de partage</label>
          <textarea
            id="seoDescription"
            name="seoDescription"
            rows={2}
            defaultValue={page.seo?.description ?? ""}
            placeholder={page.sousTitre || "Reprend l'accroche"}
          />
        </div>
      </section>

      <div className="adm-actions">
        <button type="submit" name="op" value="enregistrer" className="c-btn c-btn--solid">
          Enregistrer
        </button>
        <button type="submit" name="op" value="apercu" className="c-btn">
          Enregistrer et prévisualiser
        </button>
        <Link href="/admin/campagnes" className="c-btn">
          Retour à la liste
        </Link>
      </div>
    </form>
  );
}
