import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import Analytics, { ConsentDefaultScript, GtmNoScript } from "@/components/Analytics";
import CookieBanner from "@/components/CookieBanner";
import Footer, { type ColonneChrome } from "@/components/Footer";
import Header, { CoquillePublique, type LienChrome } from "@/components/Header";
import Reveal from "@/components/Reveal";
import StickyCta from "@/components/StickyCta";
import { AGENCIES, HOUSE, PLACEHOLDER, PRICE_FROM } from "@/data/essensya";
import { deptUrl, fmtPrice } from "@/lib/format";
import { departementsPubliables } from "@/lib/geo";
import { agencesPubliees } from "@/lib/agences";
import { resoudreMedia } from "@/lib/medias";
import { resolveMetadata } from "@/lib/seo";
import { getContent } from "@/lib/store";
import type { ColonneFooter, LienMenu } from "@/lib/store/types";
import { SITE_URL } from "@/lib/site-url";
import "@/styles/base.css";
import "@/styles/sections.css";
import "@/styles/cookies.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});
const instrument = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});



/* ════════════════════════════════════════════════════════════════
   SUBSTITUTION — la règle unique du recâblage

   Partout ci-dessous, la saisie du back-office remplace le défaut du
   code UNIQUEMENT si elle est renseignée. Conséquence voulue : le client
   peut effacer un champ pour revenir au texte d'origine, jamais pour
   obtenir un trou. C'est le seul endroit où cette règle est écrite ; le
   reste du fichier se contente d'appeler `ou()`.
   ════════════════════════════════════════════════════════════════ */
const ou = (saisi: string | undefined, defaut: string): string => {
  const v = saisi?.trim();
  return v ? v : defaut;
};

/** Valeur saisie, ou rien du tout : pour ce qui n'a pas de défaut à
 *  afficher (l'adresse et les horaires n'existent pas dans le gabarit
 *  d'aujourd'hui — vide, on n'ajoute donc aucune ligne). */
const saisi = (v: string | undefined): string | undefined => {
  const s = v?.trim();
  return s ? s : undefined;
};

/* ──────────────────────────────────────────────────────────────────
   CE QUE LE SITE AFFICHE SANS BACK-OFFICE

   Le bloc-marque du site s'écrit aujourd'hui « ESSENSYA » surmontant un
   petit « MAISONS » : deux valeurs distinctes, que les Réglages pilotent
   séparément (nom du site / baseline). `NOM_DEFAUT`, lui, est le nom
   complet de l'entreprise — celui des métadonnées et des données
   structurées, où « Essensya » seul ne voudrait rien dire.
   ────────────────────────────────────────────────────────────────── */
const MARQUE_DEFAUT = "Essensya";
const BASELINE_DEFAUT = "Maisons";
const NOM_DEFAUT = "Maisons Essensya";

/** Ordre d'affichage des réseaux, et libellé lisible de chacun. Il suit
 *  celui de l'écran Réglages, pour que le client retrouve le sien. */
const RESEAUX = [
  ["instagram", "Instagram"],
  ["linkedin", "LinkedIn"],
  ["facebook", "Facebook"],
  ["pinterest", "Pinterest"],
] as const;

/* Format international : un `tel:` sans espaces se compose sans erreur,
   y compris depuis un mobile en itinérance. Le libellé affiché, lui,
   reste en groupes de deux chiffres — c'est ce qu'on lit à voix haute.
   Calculé ici une fois et passé en prop : l'en-tête et le pied de page
   ne peuvent plus afficher deux numéros différents. */
const telHref = (numero: string): string =>
  `tel:+33${numero.replace(/\D/g, "").replace(/^0/, "")}`;

/* ──────────────────────────────────────────────────────────────────
   MENUS — repli sur les liens du code

   Une liste vide (aucune saisie, ou toutes les lignes incomplètes) rend
   `undefined` : le composant garde alors ses liens d'origine. Sans ce
   repli, la première ouverture de /admin/menus décapiterait le site.
   ────────────────────────────────────────────────────────────────── */
function liensMenu(liens: LienMenu[]): LienChrome[] | undefined {
  const propres = liens
    .filter((l) => l.label.trim() && l.href.trim())
    .sort((a, b) => a.ordre - b.ordre)
    .map((l) => ({ label: l.label.trim(), href: l.href.trim() }));
  return propres.length ? propres : undefined;
}

function colonnesFooter(colonnes: ColonneFooter[]): ColonneChrome[] | undefined {
  const propres = colonnes
    .map((c) => ({ titre: c.titre.trim(), liens: liensMenu(c.liens), ordre: c.ordre }))
    /* Une colonne sans titre ou sans lien n'a rien à montrer : on ne
       laisse pas un `<h4>` vide ouvrir une colonne de grille. */
    .filter((c): c is { titre: string; liens: LienChrome[]; ordre: number } =>
      Boolean(c.titre && c.liens),
    )
    .sort((a, b) => a.ordre - b.ordre)
    .map(({ titre, liens }) => ({ titre, liens }));
  return propres.length ? propres : undefined;
}

/* Le titre et la description sont ce qui s'affiche en résultat de
   recherche : sur un produit dont le prix EST l'argument, le prix doit y
   être. Le pluriel « des maisons » a disparu — il promettait un catalogue
   que le site n'a pas. */
const DESCRIPTION_DEFAUT =
  `Une gamme de maisons individuelles optimisées jusqu'au dernier mètre carré. ` +
  `À partir de ${fmtPrice(PRICE_FROM)} hors terrain, hors adaptation. ` +
  `Prix annoncé avant le premier rendez-vous, figé au contrat CCMI.`;

/* Le back-office peut surcharger le title, la description, l'image de
   partage et le canonical de la racine — sans jamais pouvoir les vider :
   `resolveMetadata` repart toujours du défaut construit ci-dessous, qui
   reste la valeur de référence, versionnée et relue.

   Deux niveaux se superposent, et l'ordre compte :
     · les Réglages donnent l'identité GÉNÉRALE — nom du site, favicon,
       image de partage par défaut ;
     · l'écran Référencement donne le réglage de CETTE page, et gagne.
   C'est exactement ce que l'écran Réglages promet au client à propos de
   l'image de partage.

   ⚠ Ce qui est posé ici est HÉRITÉ par toute page qui ne définit pas le
   champ elle-même. Une case « noindex » cochée sur « / » retire donc de
   l'index les pages sans réglage propre — l'écran SEO du back-office le
   dit explicitement à cet endroit.

   Les autres pages gardent pour l'instant leurs `metadata` statiques ;
   la marche à suivre pour les brancher une à une est écrite en fin de
   `src/lib/seo.ts`. */
export async function generateMetadata(): Promise<Metadata> {
  const { reglages } = await getContent();
  const nomSite = ou(reglages.nomSite, NOM_DEFAUT);
  const [favicon, ogImage] = await Promise.all([
    resoudreMedia(reglages.favicon),
    resoudreMedia(reglages.ogImage),
  ]);

  const defaut: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${nomSite} — constructeur au prix juste dans les Landes`,
      template: `%s — ${nomSite}`,
    },
    description: DESCRIPTION_DEFAUT,
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: nomSite,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    /* Sans favicon téléversé, on ne pose rien : Next continue de servir
       l'icône du dossier `app`. Poser `icons: {}` la ferait disparaître. */
    ...(favicon ? { icons: { icon: favicon } } : {}),
  };

  return resolveMetadata("/", defaut);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* Un seul accès au contenu par rendu. L'identifiant GTM saisi en
     back-office ne sert que de repli : si NEXT_PUBLIC_GTM_ID est définie,
     c'est elle qui gagne. `Analytics` est un composant client et ne peut
     pas lire le contenu lui-même — d'où le passage par une prop. */
  const { tracking, reglages, textes, menus } = await getContent();

  /* Les zones du pied de page suivent le stock. Elles vivaient écrites en
     dur dans Footer.tsx, et la liste était déjà fausse : deux
     départements annoncés n'existent pas dans le flux. Calculées ici, la
     colonne ne peut plus promettre une page qui rend 404. */
  const zones = (await departementsPubliables()).map((d) => ({
    href: deptUrl(d.slug),
    label: `${d.nom} (${d.code})`,
  }));

  /* Identité et coordonnées résolues UNE fois, puis passées à l'en-tête
     et au pied de page. Header est un composant client : il ne peut pas
     lire le contenu ni signer une URL de média, d'où les props. Les
     résoudre ici garantit aussi que les deux affichent le même numéro. */
  const marque = ou(reglages.nomSite, MARQUE_DEFAUT);
  const nomSite = ou(reglages.nomSite, NOM_DEFAUT);
  const baseline = ou(reglages.baseline, BASELINE_DEFAUT);
  /* Deux écrans peuvent porter le numéro : Réglages (coordonnées
     générales) et Contenu (`textes.telephone`). Le plus spécifique
     gagne, et `PLACEHOLDER` reste le dernier recours. */
  const telephone = ou(reglages.telephone, ou(textes.telephone, PLACEHOLDER.phone));
  /* Les agences publiées, lues une fois : elles alimentent le JSON-LD
     du site et l'adresse de repli. La constante ne sert plus que de
     dernier recours, quand aucune agence n'a été saisie. */
  const agences = await agencesPubliees();
  const email = ou(reglages.email, agences[0]?.email ?? AGENCIES[0].email);
  const adresse = saisi(reglages.adresse);
  const horaires = saisi(reglages.horaires);
  /* ⚠ LE LOGO OFFICIEL EST EMBARQUÉ, pas seulement téléversable.
     Il vit dans `public/marque/`, converti depuis les fichiers de la
     charte. Le laisser au seul bon vouloir des Réglages livrerait un
     site sans logo tant que personne ne se connecte au back-office —
     et c'est précisément l'état dans lequel il était.

     Deux fichiers, parce qu'il y a deux fonds : l'en-tête est clair, le
     pied de page est noir. Un logo noir sur fond noir est un logo
     absent. Les Réglages, eux, restent prioritaires : un client qui
     téléverse son logo le voit aux deux endroits.

     La variante 1 en en-tête (maison + ESSENSYA) plutôt que le logo
     complet : la barre fait 76 px, et le logo complet y réduirait
     « Constructeur de maisons » à une ligne illisible. */
  const logoTeleverse = await resoudreMedia(reglages.logo);
  const logo = logoTeleverse ?? "/marque/logo.webp";
  const logoPied = logoTeleverse ?? "/marque/logo-blanc.webp";

  const reseaux = RESEAUX.map(([cle, label]) => ({
    label,
    href: saisi(reglages.reseaux?.[cle]) ?? "",
  })).filter((r) => r.href);

  /* JSON-LD — aucune donnée structurée n'existait sur le site, alors que
     Google réserve aux `HomeAndConstructionBusiness` le panneau local, le
     numéro cliquable et la zone d'intervention. `areaServed` reprend les
     zones réelles des agences, pas une liste de villes inventée.

     ⚠ Les horaires saisis en Réglages n'y figurent PAS : `openingHours`
     attend une syntaxe normalisée (« Mo-Sa 09:00-18:30 »), pas la phrase
     que le client écrit pour ses visiteurs. Mieux vaut pas d'horaires
     qu'une donnée structurée invalide. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: nomSite,
    url: SITE_URL,
    telephone,
    email,
    description: HOUSE.philosophy,
    ...(saisi(reglages.baseline) ? { slogan: saisi(reglages.baseline) } : {}),
    ...(logo ? { logo } : {}),
    ...(adresse
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: adresse,
            addressCountry: "FR",
          },
        }
      : {}),
    /* `sameAs` est ce qui rattache le site aux comptes officiels de
       l'entreprise : c'est la contrepartie SEO des liens du pied de page. */
    ...(reseaux.length ? { sameAs: reseaux.map((r) => r.href) } : {}),
    /* ⚠ LES AGENCES PUBLIÉES, PAS LA CONSTANTE. Ce bloc déclare à
       Google les implantations de l'entreprise : le panneau local, la
       zone d'intervention, les numéros. Lu sur la constante, il aurait
       annoncé l'agence de démonstration pendant que le site en affichait
       cinq autres. */
    areaServed: agences.map((g) => ({
      "@type": "AdministrativeArea",
      name: g.zone,
    })),
    location: agences.map((g) => ({
      "@type": "LocalBusiness",
      name: g.name,
      telephone: g.phone,
      email: g.email,
      address: { "@type": "PostalAddress", streetAddress: g.address, addressCountry: "FR" },
      /* Sans coordonnées saisies, pas de bloc `geo` : mieux vaut aucune
         position qu'un repère au large du golfe de Guinée. */
      ...(g.geo ? { geo: { "@type": "GeoCoordinates", latitude: g.geo.lat, longitude: g.geo.lng } } : {}),
    })),
  };

  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${instrument.variable} ${plexMono.variable}`}
    >
      <head>
        {/* Doit rester le tout premier script du document, et rester
            inconditionnel : il pose le Consent Mode en « denied » AVANT
            que GTM ne puisse déposer quoi que ce soit. Le conteneur, lui,
            n'est chargé qu'après accord (mode « basic », voir Analytics) ;
            ce script garantit que même dans ce cas il démarre en refus. */}
        <ConsentDefaultScript />
      </head>
      <body>
        {/* Rendu seulement si la mesure a été acceptée — sans quoi aucune
            requête ne part vers googletagmanager.com. */}
        <GtmNoScript gtmId={tracking.gtmId} />
        {/* RGAA 12.7 : premier élément focusable du document, avant le
            header fixe — sans lui, une navigation au clavier retraverse
            les six liens du menu sur chaque page. Hors coquille publique :
            il sert aussi bien le back-office, dont le contenu est logé
            dans le même `#main`. */}
        <a href="#main" className="skip-link">
          Aller au contenu
        </a>
        {/* ⚠ Le chrome du site ne doit PAS entourer /admin/*. Voir la note
            de `CoquillePublique` (src/components/Header.tsx) pour le
            pourquoi de ce filtre plutôt que d'un `headers()`. */}
        <CoquillePublique>
          <Header
            marque={marque}
            baseline={baseline}
            logo={logo}
            logoClair={logoPied}
            telephone={telephone}
            telHref={telHref(telephone)}
            liens={liensMenu(menus.header)}
          />
        </CoquillePublique>
        {/* La cible du lien d'évitement est portée ici plutôt que sur le
            <main> de chaque page : elle existe ainsi sur toutes les routes,
            y compris les erreurs. `tabIndex={-1}` rend le saut effectif
            (un conteneur non focusable ne reçoit pas le focus). */}
        <div id="main" tabIndex={-1}>
          {children}
        </div>
        <CoquillePublique>
          <StickyCta />
          <Footer
            marque={marque}
            nomSite={nomSite}
            baseline={baseline}
            logo={logoPied}
            telephone={telephone}
            telHref={telHref(telephone)}
            email={email}
            adresse={adresse}
            horaires={horaires}
            reseaux={reseaux}
            colonnes={colonnesFooter(menus.footer)}
            zones={zones}
          />
          {/* Placé dans la coquille publique : un bandeau de consentement
              monté sur un écran d'administration n'a aucun sens, et il se
              superposait au bas des formulaires. */}
          <CookieBanner />
        </CoquillePublique>
        <Reveal />
        {/* Après le bandeau : c'est le choix fait dans CookieBanner qui
            déclenche, via l'événement `essensya:consent`, le chargement du
            conteneur — sans rechargement de page. */}
        <Analytics gtmId={tracking.gtmId} />
        <script
          type="application/ld+json"
          // `<` : neutralise toute injection de balise via les données.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
