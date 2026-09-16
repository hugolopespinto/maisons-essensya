import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import MediaPicker from "@/components/admin/MediaPicker";
import { AGENCIES } from "@/data/essensya";
import { getContentFrais, isWritable, patchContent } from "@/lib/store";
import type { Agence } from "@/lib/store/types";
import { assertAdmin, requireAdmin } from "../actions";

/* ════════════════════════════════════════════════════════════════
   BACK-OFFICE — LES AGENCES

   C'est le manque le plus gênant au quotidien : ouvrir une agence,
   corriger un horaire, changer une ligne téléphonique. Jusqu'ici cela
   demandait un déploiement, parce que les deux agences sont écrites en
   dur dans `src/data/essensya.ts`.

   ── L'IDENTIFIANT EST UNE URL, PAS UN UUID ──
   `Agence.id` alimente `agencyUrl()` : c'est littéralement l'adresse
   publique `/agences/<id>`. On le dérive donc du nom, comme un slug
   d'article, plutôt que de tirer un uuid. Deux conséquences voulues :
     · l'adresse reste lisible — « constructeur maison Mont-de-Marsan » se
       joue aussi là ;
     · les deux fiches déjà en ligne (`agence-demo-1`, `agence-thouars`)
       peuvent être reprises TELLES QUELLES par le bouton de reprise,
       sans casser une seule URL ni un seul lien entrant.
   L'identifiant est figé à la création : le renommer déplacerait la page
   et laisserait une adresse morte derrière elle. Le nom affiché, lui, se
   modifie librement.

   ── UN SEUL FICHIER, TROIS ÉTATS ──
   La liste, le formulaire et la confirmation de suppression vivent sur
   la même route, distingués par l'URL (`?edit=`, `?supprimer=`). Comme
   pour le blog : l'état est rechargeable, partageable, et l'écran
   fonctionne sans JavaScript.

   ── DÉSACTIVER N'EST PAS SUPPRIMER ──
   Une agence fermée sort du site mais reste ici, avec ses communes, sa
   description et son identifiant. On peut la rouvrir, et rien n'est
   perdu. La suppression, elle, est définitive et détruit une URL
   indexée : elle passe par une confirmation qui le dit.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agences",
  robots: { index: false, follow: false },
};

/** Valeur d'`?edit` qui ouvre un formulaire vierge. */
const NOUVELLE = "nouvelle";

const VIDE: Agence = {
  id: "",
  nom: "",
  zone: "",
  adresse: "",
  telephone: "",
  email: "",
  horaires: "",
  villes: [],
  description: "",
  actif: true,
  ordre: 0,
};

const str = (v: FormDataEntryValue | null): string =>
  typeof v === "string" ? v.trim() : "";

/**
 * Coordonnée GPS saisie à la main.
 *
 * La virgule décimale est acceptée : c'est celle du clavier français, et
 * Google Maps la produit lui-même dans une locale française. Hors bornes
 * ou illisible → `undefined`, c'est-à-dire « pas de point sur la carte »
 * plutôt qu'un point au milieu de l'océan.
 */
const coord = (v: FormDataEntryValue | null, max: number): number | undefined => {
  const s = str(v).replace(",", ".");
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n) || Math.abs(n) > max) return undefined;
  return n;
};

/** Nom → identifiant d'URL. Même translittération que les slugs d'articles. */
const slugify = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "") || "agence";

/** Suffixe jusqu'à trouver une adresse libre : deux agences ne partagent jamais une URL. */
const unique = (base: string, pris: string[]): string => {
  if (pris.indexOf(base) === -1) return base;
  let n = 2;
  while (pris.indexOf(`${base}-${n}`) !== -1) n += 1;
  return `${base}-${n}`;
};

/**
 * Une commune par ligne — mais on accepte aussi la virgule et le
 * point-virgule, parce que le client collera sa liste depuis un tableur
 * ou un mail avant de découvrir la consigne.
 */
const lireVilles = (v: FormDataEntryValue | null): string[] => {
  const brut = typeof v === "string" ? v : "";
  const vues = new Set<string>();
  const villes: string[] = [];
  for (const morceau of brut.split(/[\n;,]+/)) {
    const ville = morceau.trim().replace(/\s+/g, " ");
    if (!ville) continue;
    const cle = ville.toLowerCase();
    if (vues.has(cle)) continue;
    vues.add(cle);
    villes.push(ville);
  }
  return villes;
};

/** Ordre croissant, puis nom : deux agences au même rang restent stables. */
const parOrdre = (a: Agence, b: Agence): number =>
  a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr");

/** Renumérote de 0 à n-1 après chaque écriture : les rangs ne dérivent jamais. */
const renumeroter = (liste: Agence[]): Agence[] =>
  [...liste].sort(parOrdre).map((a, i) => ({ ...a, ordre: i }));

/** Les routes publiques que toute écriture d'agence périme. */
function rafraichirLePublic(): void {
  revalidatePath("/agences");
  /* Toutes les fiches d'un coup : une réorganisation ou une désactivation
     change le bloc « les autres agences » de CHACUNE d'elles, pas
     seulement de celle qu'on vient de toucher. */
  revalidatePath("/agences/[slug]", "page");
}

export default async function AdminAgencesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; supprimer?: string; ok?: string }>;
}) {
  await requireAdmin();

  const { edit, supprimer, ok } = await searchParams;
  const content = await getContentFrais();
  const agences = renumeroter(content.agences);
  const inscriptible = await isWritable();

  /* Rien n'a jamais été saisi : le site sert encore les agences écrites
     dans le code. On le dit, et on propose de les reprendre. */
  const vierge = agences.length === 0;

  const creation = edit === NOUVELLE;
  const enEdition = edit && !creation ? (agences.find((a) => a.id === edit) ?? null) : null;
  const formulaire = creation || !!enEdition;
  const agence = enEdition ?? VIDE;

  const aSupprimer = supprimer ? (agences.find((a) => a.id === supprimer) ?? null) : null;

  /* ════ ACTIONS ════
     Chacune est un point d'entrée HTTP public : le garde est dans
     l'action, jamais dans l'écran qui l'affiche. */

  /** Reprend les agences du code dans le contenu éditable, identifiants
   *  compris — donc sans casser une seule URL déjà en ligne. */
  async function reprendreLesAgencesDuCode() {
    "use server";
    await assertAdmin();

    const actuel = await getContentFrais();
    /* Deux clics de suite, ou deux onglets ouverts : on n'écrase pas un
       travail déjà commencé. */
    if (actuel.agences.length > 0) redirect("/admin/agences");

    const reprises: Agence[] = AGENCIES.map((g, i) => ({
      id: g.id,
      nom: g.name,
      zone: g.zone,
      adresse: g.address,
      telephone: g.phone,
      email: g.email,
      horaires: g.hours,
      lat: g.lat,
      lng: g.lng,
      image: g.image,
      villes: [...g.cities],
      description: g.description,
      actif: true,
      ordre: i,
    }));

    await patchContent("agences", reprises);
    rafraichirLePublic();
    redirect("/admin/agences?ok=reprise");
  }

  async function enregistrer(formData: FormData) {
    "use server";
    await assertAdmin();

    const origine = str(formData.get("idOrigine"));
    const actuel = await getContentFrais();
    const index = origine ? actuel.agences.findIndex((a) => a.id === origine) : -1;
    /* Le formulaire dit « je modifie l'agence X », et X n'existe plus :
       un autre onglet l'a supprimée entre-temps. On ne la ressuscite pas
       en douce sous une nouvelle adresse — on renvoie à la liste, qui
       montre l'état réel. */
    if (origine && index < 0) redirect("/admin/agences");

    const nom = str(formData.get("nom"));
    /* Le champ est `required` côté navigateur ; ce garde-fou couvre les
       soumissions directes, qu'une Server Action reçoit aussi. */
    if (!nom) {
      redirect(
        `/admin/agences?edit=${encodeURIComponent(origine || NOUVELLE)}`,
      );
    }

    /* L'identifiant ne se recalcule JAMAIS en modification : il est
       l'adresse publique de la fiche. */
    const id =
      index >= 0
        ? actuel.agences[index].id
        : unique(slugify(nom), actuel.agences.map((a) => a.id));

    const suivante: Agence = {
      id,
      nom,
      zone: str(formData.get("zone")),
      adresse: str(formData.get("adresse")),
      telephone: str(formData.get("telephone")),
      email: str(formData.get("email")),
      horaires: str(formData.get("horaires")),
      lat: coord(formData.get("lat"), 90),
      lng: coord(formData.get("lng"), 180),
      image: str(formData.get("image")) || undefined,
      villes: lireVilles(formData.get("villes")),
      description: str(formData.get("description")),
      actif: formData.get("actif") === "on",
      ordre: index >= 0 ? actuel.agences[index].ordre : actuel.agences.length,
    };

    const liste = [...actuel.agences];
    if (index >= 0) liste[index] = suivante;
    else liste.push(suivante);

    await patchContent("agences", renumeroter(liste));
    rafraichirLePublic();
    redirect(`/admin/agences?ok=${index >= 0 ? "modifiee" : "creee"}`);
  }

  /** Ferme ou rouvre une agence. Rien n'est détruit. */
  async function basculerActif(formData: FormData) {
    "use server";
    await assertAdmin();

    const id = str(formData.get("id"));
    const actuel = await getContentFrais();
    /* Identifiant inconnu (double soumission, retour arrière) : on ne
       réécrit rien et on ne revalide rien pour rien. */
    if (!actuel.agences.some((a) => a.id === id)) redirect("/admin/agences");

    const liste = actuel.agences.map((a) => (a.id === id ? { ...a, actif: !a.actif } : a));
    await patchContent("agences", renumeroter(liste));
    rafraichirLePublic();
    redirect("/admin/agences?ok=visibilite");
  }

  /** Monte ou descend une agence d'un rang dans la liste publique. */
  async function deplacer(formData: FormData) {
    "use server";
    await assertAdmin();

    const id = str(formData.get("id"));
    const vers = str(formData.get("sens")) === "bas" ? 1 : -1;

    const actuel = await getContentFrais();
    const liste = renumeroter(actuel.agences);
    const i = liste.findIndex((a) => a.id === id);
    const j = i + vers;
    /* Déjà en bout de liste (ou identifiant inconnu) : on ne réécrit rien
       et on ne revalide rien pour rien. */
    if (i < 0 || j < 0 || j >= liste.length) redirect("/admin/agences");

    [liste[i], liste[j]] = [liste[j], liste[i]];

    /* ⚠ Ici on numérote sur la POSITION, sans repasser par
       `renumeroter()` : celui-ci trie d'abord sur `ordre`, or les deux
       agences viennent d'échanger de place en gardant leur rang. Le tri
       défaisait donc l'échange, et le bouton ne faisait rien. */
    await patchContent(
      "agences",
      liste.map((a, rang) => ({ ...a, ordre: rang })),
    );
    rafraichirLePublic();
    redirect("/admin/agences?ok=ordre");
  }

  async function supprimerAgence(formData: FormData) {
    "use server";
    await assertAdmin();

    const id = str(formData.get("id"));
    if (!id) redirect("/admin/agences");

    const actuel = await getContentFrais();
    const reste = actuel.agences.filter((a) => a.id !== id);
    if (reste.length !== actuel.agences.length) {
      await patchContent("agences", renumeroter(reste));
      rafraichirLePublic();
    }
    redirect("/admin/agences?ok=supprimee");
  }

  /* ════════════════════════════════════════════════════
     FORMULAIRE — création et modification
     ════════════════════════════════════════════════════ */
  if (formulaire) {
    const sansGps = agence.lat === undefined || agence.lng === undefined;

    return (
      <form action={enregistrer}>
        <input type="hidden" name="idOrigine" value={creation ? "" : agence.id} />

        <div className="adm-head">
          <div>
            <span className="c-label c-label--accent">
              <Link href="/admin/agences">Agences</Link> /{" "}
              {creation ? "Nouvelle agence" : "Édition"}
            </span>
            <h1>{creation ? "Nouvelle agence" : agence.nom || "Sans nom"}</h1>
          </div>
          <div className="adm-actions adm-actions--serre">
            {!creation && agence.actif ? (
              <a
                href={`/agences/${agence.id}`}
                className="c-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                Voir en ligne <span aria-hidden="true">↗</span>
              </a>
            ) : null}
            <Link href="/admin/agences" className="c-btn">
              Annuler
            </Link>
            <button type="submit" className="c-btn c-btn--solid">
              Enregistrer
            </button>
          </div>
        </div>

        {!inscriptible ? (
          <p className="adm-note adm-note--alerte">
            ⚠ <strong>Le stockage est en lecture seule sur cet hébergement.</strong>{" "}
            Cette agence ne sera pas conservée. Voir la note d&apos;architecture en
            tête de <code>src/lib/store/index.ts</code>.
          </p>
        ) : null}

        {/* ════ IDENTITÉ ════ */}
        <section className="adm-card">
          <h2>L&apos;agence</h2>

          <div className="adm-field">
            <label htmlFor="nom">Nom de l&apos;agence</label>
            <input
              id="nom"
              name="nom"
              type="text"
              required
              defaultValue={agence.nom}
              placeholder="Agence de Mont-de-Marsan"
            />
            <span className="adm-field__aide">
              Le titre de la fiche, et le nom affiché sur la carte de la liste.
            </span>
          </div>

          <div className="adm-field">
            <label htmlFor="zone">Secteur couvert</label>
            <input
              id="zone"
              name="zone"
              type="text"
              defaultValue={agence.zone}
              placeholder="Landes &amp; Chalosse"
            />
            <span className="adm-field__aide">
              En clair, tel qu&apos;on le dirait au téléphone. Affiché au-dessus du
              nom, dans le fil d&apos;ariane et dans le titre Google de la fiche.
            </span>
          </div>

          <div className="adm-field">
            <label htmlFor="description">Présentation</label>
            <textarea
              id="description"
              name="description"
              rows={5}
              defaultValue={agence.description}
              placeholder="Ce que cette équipe connaît de son secteur, et ce qu'elle apporte à un projet."
            />
            <span className="adm-field__aide">
              Le paragraphe d&apos;introduction de la fiche. Ses 160 premiers
              caractères servent aussi de description dans Google.
            </span>
          </div>

          <div className="adm-field">
            <label htmlFor="adresseId">Adresse de la page</label>
            <input
              id="adresseId"
              type="text"
              value={creation ? "calculée à partir du nom" : `/agences/${agence.id}`}
              readOnly
            />
            <span className="adm-field__aide">
              {creation
                ? "Elle sera dérivée du nom à l'enregistrement, puis figée."
                : "Volontairement non modifiable : la changer ferait de cette adresse une page introuvable, pour vos visiteurs comme pour Google."}
            </span>
          </div>
        </section>

        {/* ════ COORDONNÉES ════ */}
        <section className="adm-card">
          <h2>Contact</h2>
          <p className="u-muted">
            Ces quatre lignes sont reprises telles quelles dans la fiche et dans
            les données structurées lues par Google — c&apos;est ce qui fait
            apparaître l&apos;agence comme un établissement, avec son adresse et
            ses horaires.
          </p>

          <div className="adm-field">
            <label htmlFor="adresse">Adresse postale</label>
            <input
              id="adresse"
              name="adresse"
              type="text"
              defaultValue={agence.adresse}
              placeholder="12 avenue du Général de Gaulle, 40000 Mont-de-Marsan"
            />
            <span className="adm-field__aide">
              Une virgule entre la rue et la ligne « code postal + ville » : c&apos;est
              elle qui permet de découper l&apos;adresse pour Google.
            </span>
          </div>

          <div className="adm-field">
            <label htmlFor="telephone">Téléphone</label>
            <input
              id="telephone"
              name="telephone"
              type="tel"
              defaultValue={agence.telephone}
              placeholder="05 46 00 00 00"
            />
            <span className="adm-field__aide">
              Écrit par groupes de deux chiffres. Le lien d&apos;appel depuis un
              mobile est fabriqué automatiquement.
            </span>
          </div>

          <div className="adm-field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={agence.email}
              placeholder="larochelle@essensya.fr"
            />
          </div>

          <div className="adm-field">
            <label htmlFor="horaires">Horaires</label>
            <input
              id="horaires"
              name="horaires"
              type="text"
              defaultValue={agence.horaires}
              placeholder="Lun – Sam · 9h–12h / 14h–18h30"
            />
            <span className="adm-field__aide">
              Gardez la forme « Lun – Sam · 9h–12h / 14h–18h30 » : les jours et les
              créneaux y sont reconnus et transmis à Google. Un texte libre reste
              affiché correctement, mais n&apos;est plus compris par les moteurs.
            </span>
          </div>
        </section>

        {/* ════ CARTE ════ */}
        <section className="adm-card">
          <h2>Position sur la carte</h2>
          <p className="u-muted">
            Dans Google Maps, faites un clic droit sur l&apos;agence puis cliquez
            sur les deux nombres affichés en haut du menu : ils sont copiés, dans
            l&apos;ordre latitude puis longitude.
          </p>

          {sansGps ? (
            <p className="adm-note adm-note--alerte">
              ⚠ <strong>Coordonnées absentes.</strong> L&apos;agence reste
              entièrement visible sur le site, mais elle ne peut pas être placée
              sur une carte ni située par Google.
            </p>
          ) : null}

          <div className="adm-grid">
            <div className="adm-field">
              <label htmlFor="lat">Latitude</label>
              <input
                id="lat"
                name="lat"
                type="text"
                inputMode="decimal"
                defaultValue={agence.lat ?? ""}
                placeholder="46.1667"
              />
              <span className="adm-field__aide">
                Le premier des deux nombres. En France, entre 41 et 51.
              </span>
            </div>

            <div className="adm-field">
              <label htmlFor="lng">Longitude</label>
              <input
                id="lng"
                name="lng"
                type="text"
                inputMode="decimal"
                defaultValue={agence.lng ?? ""}
                placeholder="-1.15"
              />
              <span className="adm-field__aide">
                Le second. À l&apos;ouest de Paris il est négatif — gardez le signe
                moins.
              </span>
            </div>
          </div>
        </section>

        {/* ════ IMAGE ════ */}
        <section className="adm-card">
          <h2>Photo de l&apos;agence</h2>
          <MediaPicker
            name="image"
            value={agence.image}
            label={"Photo de l'agence"}
            aide="Format paysage. Elle occupe toute la largeur en haut de la fiche et illustre la carte dans la liste des agences. Sans photo, la fiche reste en ligne : elle s'affiche simplement sans bandeau."
          />
        </section>

        {/* ════ COMMUNES ════ */}
        <section className="adm-card">
          <h2>Communes couvertes</h2>

          <div className="adm-field">
            <label htmlFor="villes">Une commune par ligne</label>
            <textarea
              id="villes"
              name="villes"
              rows={8}
              defaultValue={agence.villes.join("\n")}
              placeholder={"Mont-de-Marsan\nDax\nSaint-Paul-lès-Dax"}
            />
            <span className="adm-field__aide">
              Affichées sur la fiche, et déclarées à Google comme zone desservie.
              Elles servent aussi à rattacher les terrains du secteur à cette
              agence quand le flux ne le précise pas. Une liste collée avec des
              virgules est acceptée, et les doublons sont retirés.
            </span>
          </div>
        </section>

        {/* ════ VISIBILITÉ ════ */}
        <section className="adm-card">
          <h2>Visibilité</h2>

          <div className="adm-field adm-field--case">
            <input
              id="actif"
              name="actif"
              type="checkbox"
              defaultChecked={agence.actif}
            />
            <label htmlFor="actif">Agence ouverte — visible sur le site</label>
          </div>
          <p className="u-muted">
            Décochée, l&apos;agence disparaît de la liste et sa fiche renvoie une
            page introuvable, mais rien n&apos;est perdu : elle reste ici, avec ses
            communes et son texte, prête à être rouverte.
          </p>

          <div className="adm-actions">
            <button type="submit" className="c-btn c-btn--solid">
              Enregistrer
            </button>
            <Link href="/admin/agences" className="c-btn">
              Annuler
            </Link>
          </div>
        </section>
      </form>
    );
  }

  /* ════════════════════════════════════════════════════
     LISTE
     ════════════════════════════════════════════════════ */
  const messages: Record<string, string> = {
    creee: "Agence créée. Sa fiche est en ligne.",
    modifiee: "Agence enregistrée. Les pages publiques ont été rafraîchies.",
    supprimee: "Agence supprimée.",
    visibilite: "Visibilité modifiée.",
    ordre: "Ordre modifié.",
    reprise:
      "Les agences du site ont été reprises. Vous pouvez les modifier : leurs adresses publiques n'ont pas bougé.",
  };

  return (
    <>
      <div className="adm-head">
        <div>
          <span className="c-label c-label--accent">Agences</span>
          <h1>Vos agences</h1>
        </div>
        <Link href={`/admin/agences?edit=${NOUVELLE}`} className="c-btn c-btn--solid">
          Nouvelle agence
        </Link>
        <p>
          Ouvrir une agence, corriger un horaire, changer une ligne
          téléphonique : tout se fait ici, et le site est à jour dans la foulée.
          L&apos;ordre de cette liste est celui de la page{" "}
          <Link href="/agences" className="c-link">
            Nos agences
          </Link>
          .
        </p>
      </div>

      {ok && messages[ok] ? (
        <p className="adm-note" role="status">
          {messages[ok]}
        </p>
      ) : null}

      {!inscriptible ? (
        <p className="adm-note adm-note--alerte">
          ⚠ <strong>Le stockage est en lecture seule sur cet hébergement.</strong> Vos
          modifications ne seront pas conservées. Voir la note d&apos;architecture en
          tête de <code>src/lib/store/index.ts</code>.
        </p>
      ) : null}

      {/* ════ CONFIRMATION DE SUPPRESSION ════ */}
      {aSupprimer ? (
        <section className="adm-card">
          <h2>Supprimer cette agence ?</h2>
          <p>
            <strong>{aSupprimer.nom || "Sans nom"}</strong> — {aSupprimer.zone || "secteur non précisé"},{" "}
            {aSupprimer.villes.length} commune{aSupprimer.villes.length > 1 ? "s" : ""}{" "}
            couverte{aSupprimer.villes.length > 1 ? "s" : ""}, à l&apos;adresse{" "}
            <code>/agences/{aSupprimer.id}</code>.
          </p>
          <p>
            La suppression est définitive : il n&apos;y a pas de corbeille. Son
            adresse renverra une page introuvable, y compris pour les liens déjà
            partagés et pour Google.
          </p>
          <p>
            <strong>
              Si l&apos;agence ferme simplement, désactivez-la plutôt que de la
              supprimer
            </strong>{" "}
            : elle sort du site de la même façon, mais sa fiche, ses communes et
            son texte restent récupérables.
          </p>
          <form action={supprimerAgence} className="adm-actions">
            <input type="hidden" name="id" value={aSupprimer.id} />
            <button type="submit" className="c-btn c-btn--danger">
              Supprimer définitivement
            </button>
            <Link href="/admin/agences" className="c-btn">
              Annuler
            </Link>
          </form>
        </section>
      ) : null}

      {/* ════ LISTE ════ */}
      {vierge ? (
        <div className="adm-empty">
          <strong>Les agences sont encore celles du site livré</strong>
          {AGENCIES.length} agence{AGENCIES.length > 1 ? "s" : ""} sont affichées
          en ligne, mais elles vivent dans le code : personne ne peut les modifier
          d&apos;ici. Reprenez-les pour en garder la main — leurs adresses
          publiques et leurs textes restent identiques, rien ne bouge pour vos
          visiteurs.
          <form action={reprendreLesAgencesDuCode} className="adm-actions">
            <button type="submit" className="c-btn c-btn--solid">
              Reprendre les agences du site
            </button>
            <Link href={`/admin/agences?edit=${NOUVELLE}`} className="c-btn">
              Partir d&apos;une page blanche
            </Link>
          </form>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <caption className="u-sr-only">Agences du site</caption>
            <thead>
              <tr>
                <th scope="col">Agence</th>
                <th scope="col">Contact</th>
                <th scope="col">Communes</th>
                <th scope="col">État</th>
                <th scope="col">Ordre</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agences.map((a, i) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/admin/agences?edit=${encodeURIComponent(a.id)}`}>
                      {a.nom || "Sans nom"}
                    </Link>
                    <br />
                    <span className="u-muted">{a.zone || "Secteur non précisé"}</span>
                    <br />
                    <code className="u-muted">/agences/{a.id}</code>
                  </td>
                  <td>
                    {a.telephone || <span className="u-muted">Pas de téléphone</span>}
                    <br />
                    <span className="u-muted">{a.email || "Pas d'e-mail"}</span>
                  </td>
                  <td className="num">
                    {a.villes.length}
                    {a.lat === undefined || a.lng === undefined ? (
                      <>
                        <br />
                        <span className="u-muted" title="Coordonnées GPS absentes">
                          hors carte
                        </span>
                      </>
                    ) : null}
                  </td>
                  <td>
                    <span className={`adm-badge ${a.actif ? "adm-badge--on" : "adm-badge--off"}`}>
                      {a.actif ? "En ligne" : "Fermée"}
                    </span>
                  </td>
                  <td>
                    <div className="adm-actions adm-actions--serre">
                      <form action={deplacer}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="sens" value="haut" />
                        <button
                          type="submit"
                          className="c-btn"
                          disabled={i === 0}
                          aria-label={`Monter ${a.nom || "cette agence"}`}
                        >
                          <span aria-hidden="true">↑</span>
                        </button>
                      </form>
                      <form action={deplacer}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="sens" value="bas" />
                        <button
                          type="submit"
                          className="c-btn"
                          disabled={i === agences.length - 1}
                          aria-label={`Descendre ${a.nom || "cette agence"}`}
                        >
                          <span aria-hidden="true">↓</span>
                        </button>
                      </form>
                    </div>
                  </td>
                  <td>
                    <div className="adm-actions adm-actions--serre">
                      <Link
                        href={`/admin/agences?edit=${encodeURIComponent(a.id)}`}
                        className="c-btn"
                      >
                        Modifier
                      </Link>
                      <form action={basculerActif}>
                        <input type="hidden" name="id" value={a.id} />
                        <button type="submit" className="c-btn">
                          {a.actif ? "Fermer" : "Rouvrir"}
                        </button>
                      </form>
                      {a.actif ? (
                        <a
                          href={`/agences/${a.id}`}
                          className="c-btn"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Voir <span aria-hidden="true">↗</span>
                        </a>
                      ) : null}
                      <Link
                        href={`/admin/agences?supprimer=${encodeURIComponent(a.id)}`}
                        className="c-btn c-btn--danger"
                      >
                        Supprimer
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!vierge && agences.every((a) => !a.actif) ? (
        <p className="adm-note adm-note--alerte">
          ⚠ <strong>Aucune agence n&apos;est ouverte.</strong> La page{" "}
          <Link href="/agences" className="c-link">
            Nos agences
          </Link>{" "}
          est en ligne mais ne présente plus aucune adresse, et toutes les fiches
          renvoient une page introuvable. Rouvrez-en au moins une.
        </p>
      ) : null}
    </>
  );
}
