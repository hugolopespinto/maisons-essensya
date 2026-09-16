import type { Metadata } from "next";
import Link from "next/link";
import { authDriver, isAdminEnabled } from "@/lib/admin/auth";
import { cleAnonManquante } from "@/lib/admin/supabase-auth";
import { dept } from "@/lib/format";
import { getContentFrais, isWritable, storeDriver } from "@/lib/store";
import { getAnnonces } from "@/lib/vitahome/annonces";
import { hasLiveFeed } from "@/lib/vitahome/config";
import { requireAdmin } from "./actions";

/* ════════════════════════════════════════════════════════════════
   TABLEAU DE BORD

   C'est le premier écran que le client ouvrira, et il n'a qu'une
   obligation : dire la vérité sur ce qui est branché.

   ⚠ AUCUN CHIFFRE DE FRÉQUENTATION N'EST AFFICHÉ ICI, et ce n'est pas
   un oubli. Les visites vivent dans GA4 ; sans identifiant de propriété
   NI compte de service autorisé, le serveur ne peut rien interroger.
   Un graphique de démonstration serait la pire option possible : le
   client prendrait des courbes inventées pour son audience réelle et
   fonderait des décisions dessus. On affiche donc un état « à connecter »
   qui dit exactement ce qu'il manque.

   Tout le reste de l'écran est, à l'inverse, mesuré pour de vrai : ce
   sont des données que le serveur détient au moment du rendu.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tableau de bord",
  robots: { index: false, follow: false },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const GTM_ENV = process.env.NEXT_PUBLIC_GTM_ID ?? "";
/* Le tableau de bord GA4 interroge l'API Data côté serveur : il lui faut
   une propriété ET une identité autorisée dessus. Les trois variables
   sont documentées dans .env.example. */
const GA4_PROPERTY_ENV = process.env.GA4_PROPERTY_ID ?? "";
const GA4_SA_EMAIL = process.env.GA4_SERVICE_ACCOUNT_EMAIL ?? "";
const GA4_SA_KEY = process.env.GA4_SERVICE_ACCOUNT_KEY ?? "";

const NF = new Intl.NumberFormat("fr-FR");

const fmtDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  /* Fuseau explicite : le serveur peut tourner en UTC, la date affichée
     doit être celle du client, pas celle de l'hébergeur. */
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(d);
};

/**
 * Une URL de production plausible : https, pas localhost, pas une IP.
 * Même critère que src/app/robots.ts — une URL de dev laissée en place
 * casse les canoniques, l'Open Graph et le sitemap d'un seul coup.
 */
const urlDeProduction = (url: string): boolean => {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:") return false;
    return !/^(localhost$|127\.|0\.0\.0\.0$|\[|\d+\.\d+\.\d+\.\d+$)/.test(hostname);
  } catch {
    return false;
  }
};

interface Verif {
  cle: string;
  libelle: string;
  ok: boolean;
  valeur: string;
  /** Ce qu'il faut faire quand ce n'est pas au vert. */
  quoiFaire: string;
}

export default async function AdminDashboard() {
  await requireAdmin();

  const contenu = await getContentFrais();

  /* Le flux Vitahome est un appel réseau : il ne doit jamais emporter le
     tableau de bord, qui est précisément l'écran où l'on vient constater
     qu'il est tombé. */
  let annonces: Awaited<ReturnType<typeof getAnnonces>> = [];
  let fluxEnErreur = false;
  try {
    annonces = await getAnnonces();
  } catch {
    fluxEnErreur = true;
  }

  const ecriture = await isWritable();

  /* ── Quels pilotes tournent réellement ──
     Deux sélecteurs, deux questions distinctes : OÙ le contenu est écrit
     (`storeDriver()`) et QUI décide des accès (`authDriver()`). Le client
     ne peut pas les deviner, et la réponse change tout : le pilote
     fichier ne sait pas écrire en serverless, et le mot de passe partagé
     ne dit jamais qui a modifié quoi. */
  const pilote = storeDriver();
  const piloteAuth = authDriver();
  const enProduction = process.env.NODE_ENV === "production";
  /* Le cas qui piège : disque en lecture seule chez l'hébergeur, ou
     éphémère — la saisie semble passer et disparaît au déploiement. */
  const fichierEnProd = pilote === "fichier" && enProduction;

  /* ── Chiffres réellement disponibles ── */
  const nbTerrains = annonces.filter((a) => a.type === "terrain").length;
  const nbTM = annonces.filter((a) => a.type === "terrain-maison").length;
  const departements = new Set(annonces.map(dept).filter(Boolean));

  const publies = contenu.articles.filter((a) => !a.brouillon && a.publieLe).length;
  const brouillons = contenu.articles.length - publies;

  const enrichies = contenu.annonces.length;
  const masquees = contenu.annonces.filter((o) => o.masquee).length;
  const coupsDeCoeur = contenu.annonces.filter((o) => o.coupDeCoeur).length;

  const majLe = fmtDate(contenu.majLe);

  /* ── Ce qu'il faut pour brancher la fréquentation ── */
  /* Ici la saisie du back-office prime, et l'environnement sert de repli :
     la propriété GA4 est une donnée éditoriale, pas un réglage d'infra. */
  const ga4Property = contenu.tracking.ga4PropertyId || GA4_PROPERTY_ENV;
  const gtmId = GTM_ENV || contenu.tracking.gtmId || "";
  const ga4Pret = Boolean(ga4Property && GA4_SA_EMAIL && GA4_SA_KEY);

  /* ── Diagnostic de configuration ──
     Chaque ligne répond à une question que le client posera de toute
     façon, et évite l'aller-retour correspondant. */
  const verifs: Verif[] = [
    {
      cle: "vitahome",
      libelle: "Flux Vitahome",
      ok: hasLiveFeed() && !fluxEnErreur && annonces.length > 0,
      valeur: fluxEnErreur
        ? "Flux injoignable"
        : hasLiveFeed()
          ? `Flux live — ${NF.format(annonces.length)} parcelles`
          : `Jeu de démonstration — ${NF.format(annonces.length)} parcelles`,
      quoiFaire: hasLiveFeed()
        ? "Le token est défini mais le flux ne renvoie rien d'exploitable. Vérifier VITAHOME_TOKEN et l'accès aux packs d'annonces."
        : "Renseigner VITAHOME_TOKEN pour publier le catalogue réel. Sans lui, le site affiche des annonces de démonstration — à ne jamais laisser en production.",
    },
    {
      cle: "site-url",
      libelle: "URL publique du site",
      ok: urlDeProduction(SITE_URL),
      valeur: SITE_URL || "non définie",
      quoiFaire:
        "Renseigner NEXT_PUBLIC_SITE_URL avec l'adresse https définitive. Tant qu'elle est absente ou en localhost, les URLs canoniques, les images de partage et le sitemap pointent au mauvais endroit, et robots.txt interdit l'indexation par précaution.",
    },
    {
      cle: "gtm",
      libelle: "Google Tag Manager",
      ok: Boolean(gtmId),
      valeur: gtmId
        ? `${gtmId}${GTM_ENV ? " (variable d'environnement)" : " (back-office)"}`
        : "non configuré",
      quoiFaire:
        "Saisir l'identifiant GTM-XXXXXXX dans l'écran Tracking, ou le fixer dans NEXT_PUBLIC_GTM_ID. Sans conteneur, aucune mesure n'est collectée — le bandeau cookies, lui, reste correct.",
    },
    {
      cle: "ga4",
      libelle: "Fréquentation GA4",
      ok: ga4Pret,
      valeur: ga4Pret ? `Propriété ${ga4Property}` : "à connecter",
      quoiFaire:
        "Il faut l'identifiant de propriété GA4 (écran Tracking) ET un compte de service Google autorisé en lecture sur cette propriété (GA4_SERVICE_ACCOUNT_EMAIL, GA4_SERVICE_ACCOUNT_KEY).",
    },
    {
      cle: "stockage",
      libelle: "Stockage du contenu",
      ok: ecriture && !fichierEnProd,
      valeur:
        pilote === "supabase"
          ? `Base Supabase — ${ecriture ? "accessible en écriture" : "écriture refusée"}`
          : `Fichier JSON local — ${ecriture ? "accessible en écriture" : "lecture seule"}`,
      quoiFaire:
        pilote === "supabase"
          ? "La base répond mais refuse l'écriture : vérifier SUPABASE_SERVICE_ROLE_KEY (c'est la seule clé qui passe le RLS) et que le schéma supabase/schema.sql a bien été exécuté sur ce projet."
          : "Le pilote actuel écrit un fichier JSON (content/content.json). Sur Netlify, Vercel ou tout hébergement serverless, le disque est en LECTURE SEULE et éphémère : toute modification faite ici échouera, ou disparaîtra au déploiement suivant. Renseigner SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY pour basculer sur la base managée — le back-office, lui, ne bouge pas.",
    },
    {
      cle: "admin",
      libelle: "Accès au back-office",
      ok: isAdminEnabled(),
      valeur:
        piloteAuth === "supabase"
          ? "Comptes nommés (Supabase Auth)"
          : isAdminEnabled()
            ? "Mot de passe partagé"
            : "aucun moyen d'authentification",
      quoiFaire:
        "Définir ADMIN_PASSWORD (8 caractères minimum) et, de préférence, ADMIN_SESSION_SECRET — ou, mieux, passer aux comptes nommés (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY). Sans l'un ou l'autre, le back-office refuse toute connexion.",
    },
  ];

  /* Configuration Supabase à moitié faite : la base est là, les comptes
     nommés non. Le back-office continue de fonctionner (mot de passe
     partagé) mais plus personne n'est identifié — ça ne peut pas rester
     silencieux. */
  if (cleAnonManquante()) {
    verifs.push({
      cle: "supabase-anon",
      libelle: "Comptes nommés Supabase",
      ok: false,
      valeur: "SUPABASE_ANON_KEY manquante",
      quoiFaire:
        "La base Supabase est configurée, mais la connexion par e-mail réclame la clé anonyme du projet (Settings → API → clé `anon`). Tant qu'elle manque, l'authentification retombe sur le mot de passe partagé : plus de comptes individuels, plus de rôles, et aucune trace de qui modifie quoi. Cette clé est publique par nature — c'est la clé de service, elle, qui ne doit jamais sortir du serveur.",
    });
  }

  const aCorriger = verifs.filter((v) => !v.ok);

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="c-label">Back-office</p>
          <h1>Tableau de bord</h1>
        </div>
        <p style={{ flexBasis: "auto" }}>
          {majLe ? (
            <>
              Dernière modification&nbsp;: <strong>{majLe}</strong>
            </>
          ) : (
            "Aucune modification enregistrée pour l'instant."
          )}
        </p>
      </div>

      {aCorriger.length > 0 && (
        <div className="adm-note adm-note--alerte" style={{ marginBottom: "1.5rem" }}>
          <strong>
            {aCorriger.length === 1
              ? "1 point de configuration à régler"
              : `${aCorriger.length} points de configuration à régler`}
          </strong>{" "}
          — {aCorriger.map((v) => v.libelle).join(", ")}. Le détail figure dans
          le diagnostic, en bas de cet écran.
        </div>
      )}

      {/* ════ FRÉQUENTATION ════ */}
      <section className="adm-card" aria-labelledby="adm-freq">
        <h2 id="adm-freq">Fréquentation</h2>
        {ga4Pret ? (
          <>
            <p>
              La propriété <strong>{ga4Property}</strong> et le compte de service
              sont configurés.
            </p>
            <div className="adm-note">
              L&apos;affichage des sessions, des pages vues et des sources de
              trafic reste à brancher sur l&apos;API GA4 Data. Les identifiants
              nécessaires, eux, sont en place : il ne manque que la requête.
            </div>
          </>
        ) : (
          <div className="adm-empty">
            <strong>À connecter</strong>
            <p style={{ maxWidth: "42em", margin: "0 auto" }}>
              Les chiffres de visite appartiennent à Google Analytics. Tant que
              le serveur n&apos;a pas le droit de les lire, cet écran
              n&apos;affiche rien — plutôt qu&apos;une courbe inventée, qui
              serait pire que pas de courbe du tout.
            </p>
            <ul
              style={{
                margin: "1.25rem auto 0",
                maxWidth: "34em",
                textAlign: "left",
              }}
            >
              <li className="adm-row">
                <span>Identifiant de propriété</span>
                <span>
                  {ga4Property ? (
                    <span className="adm-badge adm-badge--on">{ga4Property}</span>
                  ) : (
                    <span className="adm-badge adm-badge--off">manquant</span>
                  )}
                </span>
              </li>
              <li className="adm-row">
                <span>Compte de service</span>
                <span>
                  {GA4_SA_EMAIL ? (
                    <span className="adm-badge adm-badge--on">défini</span>
                  ) : (
                    <span className="adm-badge adm-badge--off">manquant</span>
                  )}
                </span>
              </li>
              <li className="adm-row">
                <span>Clé privée du compte</span>
                <span>
                  {GA4_SA_KEY ? (
                    <span className="adm-badge adm-badge--on">définie</span>
                  ) : (
                    <span className="adm-badge adm-badge--off">manquante</span>
                  )}
                </span>
              </li>
            </ul>
            <p style={{ marginTop: "1.25rem" }}>
              Le compte de service doit ensuite être ajouté en <em>lecteur</em>{" "}
              sur la propriété GA4, côté Google.
            </p>
            <div className="adm-actions adm-actions--serre" style={{ justifyContent: "center" }}>
              <Link className="c-btn" href="/admin/tracking">
                Écran Tracking
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ════ ÉTAT DU SITE ════ */}
      <h2 style={{ fontSize: "1rem", margin: "2rem 0 .75rem" }}>État du site</h2>

      <div className="adm-grid">
        <div className="adm-stat">
          <strong>{NF.format(annonces.length)}</strong>
          <small>Parcelles au flux</small>
        </div>
        <div className="adm-stat">
          <strong>{NF.format(nbTM)}</strong>
          <small>Terrain + maison</small>
        </div>
        <div className="adm-stat">
          <strong>{NF.format(nbTerrains)}</strong>
          <small>Terrains seuls</small>
        </div>
        <div className="adm-stat">
          <strong>{NF.format(departements.size)}</strong>
          <small>Départements couverts</small>
        </div>
      </div>

      <div className="adm-grid" style={{ marginTop: "1rem" }}>
        <div className="adm-stat">
          <strong>{NF.format(publies)}</strong>
          <small>Articles publiés</small>
        </div>
        <div className="adm-stat">
          <strong>{NF.format(brouillons)}</strong>
          <small>Brouillons</small>
        </div>
        <div className="adm-stat">
          <strong>{NF.format(enrichies)}</strong>
          <small>Annonces enrichies</small>
        </div>
        <div className="adm-stat">
          <strong>{NF.format(coupsDeCoeur)}</strong>
          <small>Coups de cœur</small>
        </div>
      </div>

      <section className="adm-card" style={{ marginTop: "1rem" }} aria-labelledby="adm-detail">
        <h2 id="adm-detail">Détail</h2>
        <div className="adm-row">
          <span>Source des annonces</span>
          <span>{hasLiveFeed() ? "Flux Vitahome (live)" : "Jeu de démonstration"}</span>
        </div>
        <div className="adm-row">
          <span>Annonces masquées</span>
          <span>{NF.format(masquees)}</span>
        </div>
        <div className="adm-row">
          <span>Pages avec SEO personnalisé</span>
          <span>{NF.format(contenu.seo.length)}</span>
        </div>
        <div className="adm-row">
          <span>Conversions suivies</span>
          <span>
            {NF.format(contenu.tracking.conversions.filter((c) => c.actif).length)}
            {" / "}
            {NF.format(contenu.tracking.conversions.length)}
          </span>
        </div>
        <div className="adm-row">
          <span>Dernière modification</span>
          <span>{majLe ?? "jamais"}</span>
        </div>
        <div className="adm-row">
          <span>Où sont enregistrées les modifications</span>
          <span>
            {pilote === "supabase"
              ? "Base Supabase (Postgres)"
              : "Fichier content/content.json"}
          </span>
        </div>
        <div className="adm-row">
          <span>Connexion au back-office</span>
          <span>
            {piloteAuth === "supabase"
              ? "Comptes nommés, avec rôles"
              : "Mot de passe partagé"}
          </span>
        </div>
        <div className="adm-note" style={{ marginTop: "1rem" }}>
          Les annonces viennent du CRM Vitahome et ne sont pas modifiables : le
          back-office les <strong>enrichit</strong> (titre, accroche, coup de
          cœur, masquage, SEO) sans jamais réécrire la donnée source. C&apos;est
          ce qui garantit que le site et le CRM ne divergent pas au prochain
          import.
        </div>
      </section>

      {/* ════ DIAGNOSTIC ════ */}
      <h2 style={{ fontSize: "1rem", margin: "2rem 0 .75rem" }}>
        Diagnostic de configuration
      </h2>

      <section className="adm-card" aria-labelledby="adm-diag">
        <h2 id="adm-diag" className="u-sr-only">
          Vérifications
        </h2>
        <table className="adm-table">
          <caption className="u-sr-only">
            État de chaque élément de configuration du site et de son
            back-office.
          </caption>
          <thead>
            <tr>
              <th scope="col">Vérification</th>
              <th scope="col">État</th>
              <th scope="col">Valeur</th>
            </tr>
          </thead>
          <tbody>
            {verifs.map((v) => (
              <tr key={v.cle}>
                <th scope="row" style={{ fontWeight: 500 }}>
                  {v.libelle}
                </th>
                <td>
                  <span className={`adm-badge adm-badge--${v.ok ? "on" : "off"}`}>
                    {v.ok ? "OK" : "À faire"}
                  </span>
                </td>
                <td>
                  {v.valeur}
                  {!v.ok && (
                    <p className="u-muted" style={{ marginTop: ".4rem" }}>
                      {v.quoiFaire}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {!ecriture && (
        <div className="adm-note adm-note--alerte" style={{ marginTop: "1rem" }}>
          <strong>Aucune modification ne pourra être enregistrée.</strong> Le
          stockage est en lecture seule. Sur un hébergement serverless
          (Netlify, Vercel), c&apos;est le comportement normal et définitif :
          il faut renseigner <code>SUPABASE_URL</code> et{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> pour que le contenu parte dans
          la base, avant de confier le back-office au client.
        </div>
      )}

      {/* Le cas vraiment traître : l'écriture « marche » (le disque de
          l'instance accepte le fichier) mais ne survit pas au déploiement
          suivant. Le client croit avoir enregistré, et retrouve ses
          anciens textes une semaine plus tard sans comprendre. */}
      {fichierEnProd && ecriture && (
        <div className="adm-note adm-note--alerte" style={{ marginTop: "1rem" }}>
          <strong>
            Le contenu est enregistré dans un fichier, sur le serveur qui répond
            en ce moment.
          </strong>{" "}
          En production, ce fichier n&apos;est partagé par aucune autre
          instance et disparaît au déploiement suivant : une modification
          faite ici peut sembler enregistrée, puis revenir à son ancienne
          valeur. Renseigner <code>SUPABASE_URL</code> et{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> bascule le stockage sur la
          base, sans rien changer aux écrans.
        </div>
      )}

      <div className="adm-actions">
        <Link className="c-btn c-btn--solid" href="/admin/contenu">
          Modifier les textes
        </Link>
        <Link className="c-btn" href="/admin/seo">
          Ajuster le SEO
        </Link>
        <Link className="c-btn" href="/admin/blog">
          Écrire un article
        </Link>
      </div>
    </>
  );
}
