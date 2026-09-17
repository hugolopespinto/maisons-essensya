import { resolveMetadata } from "@/lib/seo";
import ACompleter from "@/components/ACompleter";
import { lecteurBlocs } from "@/lib/blocs";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import CookiePrefsLink from "@/components/CookiePrefsLink";
import { SpecList } from "@/components/SpecList";
import { AGENCIES } from "@/data/essensya";
import { getContent } from "@/lib/store";

/* ════════════════════════════════════════════════════════════════
   POLITIQUE DE PROTECTION DES DONNÉES

   ⚠ TODO conformité — BLOQUANT AVANT MISE EN LIGNE.
   Cette page décrit le traitement RÉEL tel qu'il est codé
   (src/app/api/leads/route.ts + src/lib/vitahome/prospects.ts) : ne la
   modifier qu'en même temps que ce code, sinon elle devient fausse — et
   une politique fausse est plus risquée qu'une politique absente.

   Les marqueurs `[[À COMPLÉTER : …]]` attendent des informations que
   seul le client détient (entité juridique, durées retenues, hébergeur,
   contact RGPD). Rien n'y est inventé volontairement : un SIREN ou un
   nom de DPO fictifs exposeraient le constructeur bien plus qu'un trou
   assumé. Chercher « À COMPLÉTER » dans le dépôt pour la liste complète.
   ════════════════════════════════════════════════════════════════ */

/* Le back-office peut surcharger le titre, la description, l'image de
   partage, le canonical et le noindex de cette page — écran Référencement.
   `resolveMetadata` repart TOUJOURS du défaut ci-dessous : une surcharge
   vidée rend la valeur d'origine, elle n'efface jamais la balise. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/confidentialite", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Protection de vos données",
  description:
    "Quelles données nos formulaires recueillent, pourquoi, à qui elles sont transmises, combien de temps elles sont conservées et comment exercer vos droits.",
  alternates: { canonical: "/confidentialite" },
};

/** Date de dernière révision du texte. À bouger à chaque modification. */
const MAJ = "12 septembre 2026";

/* Même arbitrage que dans le pied de page : pas d'adresse « contact@ »
   inventée tant que le client n'en a pas ouvert une. */
const EMAIL_PROVISOIRE = AGENCIES[0].email;

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} style={{ fontSize: "var(--fs-h3)", marginTop: "var(--s-5)" }}>
      {children}
    </h2>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <p className="u-muted u-measure" style={{ marginTop: "var(--s-2)" }}>
      {children}
    </p>
  );
}


export default async function ConfidentialitePage() {
  /* Les six mentions du RGPD viennent de « Pages → Confidentialité ».
     Aucune n'a de valeur par défaut dans le code : inventer une durée de
     conservation ou une adresse d'exercice des droits serait pire que le
     trou, qui, lui, se voit. */
  const { pages } = await getContent();
  const t = lecteurBlocs(pages, "confidentialite");
  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>Confidentialité</span>
          </nav>
          <h1>Protection de vos données</h1>
          <p>
            Ce que nous recueillons quand vous remplissez un formulaire, ce que
            nous en faisons, à qui nous le transmettons — et ce que vous pouvez
            exiger de nous à tout moment.
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: "var(--s-7)" }}>
        <div className="container" style={{ maxWidth: "58rem" }}>
          <p className="c-label">Dernière mise à jour · {MAJ}</p>

          <H2 id="responsable">1. Qui est responsable de vos données</H2>
          <P>
            Le responsable du traitement est l&apos;entreprise qui exploite ce
            site et qui décide de ce qui est fait de vos données&nbsp;:
          </P>
          <p style={{ marginTop: "var(--s-2)" }}>
            {/* TODO conformité — sans cette identité, la page n'est pas
                valable : le RGPD (art. 13) impose l'identité et les
                coordonnées du responsable du traitement. */}
            <ACompleter texte="[[À COMPLÉTER : raison sociale, forme juridique, adresse du siège, SIREN / RCS]]" valeur={t("responsable")} />
          </p>
          <P>
            En attendant, vous pouvez nous joindre par téléphone ou par écrit
            via la{" "}
            <Link href="/contact" className="c-link" style={{ display: "inline" }}>
              page contact
            </Link>{" "}
            ou l&apos;une de nos{" "}
            <Link href="/agences" className="c-link" style={{ display: "inline" }}>
              agences
            </Link>
            .
          </P>

          <H2 id="donnees">2. Quelles données, et par quel formulaire</H2>
          <P>
            Nous ne recueillons de données que lorsque vous remplissez
            vous-même un formulaire&nbsp;: demande de rappel en page
            d&apos;accueil, page contact, page de nos modèles et fiche de
            chaque modèle, fiche d&apos;une annonce de terrain, page
            d&apos;agence. Il n&apos;y a sur ce site ni compte, ni mot de
            passe, ni paiement en ligne.
          </P>
          <P>
            Selon le formulaire, les champs proposés sont les suivants. Seuls
            le nom et le téléphone sont obligatoires — sans eux, nous ne
            pouvons pas vous rappeler&nbsp;:
          </P>
          <SpecList
            rows={[
              ["Prénom et nom", "Obligatoire. Pour savoir à qui nous nous adressons."],
              ["Téléphone", "Obligatoire. C'est par là que l'agence vous recontacte."],
              ["E-mail", "Facultatif. Pour vous envoyer une documentation ou un plan."],
              [
                "Secteur du projet",
                "Facultatif. Commune ou code postal, pour orienter votre demande vers l'agence compétente.",
              ],
              [
                "Avancement du projet",
                "Facultatif. « Je découvre », « je cherche un terrain », « j'ai déjà un terrain », « je compare des constructeurs ».",
              ],
              [
                "Nature de la demande",
                "Facultatif. Être rappelé, prendre rendez-vous, question sur un terrain — ou le modèle qui vous intéresse.",
              ],
              [
                "Message libre",
                "Facultatif. Son contenu est celui que vous écrivez : n'y indiquez rien de sensible (santé, opinions, situation familiale détaillée).",
              ],
            ]}
          />
          <P>
            À ces champs s&apos;ajoutent automatiquement quelques éléments de
            contexte, qui servent uniquement à comprendre votre demande et à
            l&apos;adresser à la bonne agence&nbsp;:
          </P>
          <SpecList
            rows={[
              [
                "Page d'origine",
                "L'adresse de la page depuis laquelle vous avez envoyé le formulaire.",
              ],
              [
                "Annonce consultée",
                "Le résumé de l'annonce affichée à côté du formulaire : type de bien, commune, surfaces, prix.",
              ],
              [
                "Commune de l'annonce",
                "Son code INSEE et son identifiant dans notre outil de gestion, pour rattacher la demande au bon secteur.",
              ],
              [
                "Formulaire utilisé",
                "Un repère interne indiquant lequel des formulaires du site a été rempli.",
              ],
              [
                "Preuve de votre consentement",
                "La date et l'heure auxquelles vous avez validé le formulaire, le texte exact de la case que vous avez cochée et sa version, ainsi que votre réponse sur la prospection commerciale. C'est la trace qui nous permet de prouver que vous avez été informé avant l'envoi.",
              ],
            ]}
          />
          <P>
            Ce site ne tient pas de base de données de son côté&nbsp;: votre
            demande est relayée telle quelle à l&apos;outil de gestion
            commerciale décrit au point 4. Votre adresse IP est brièvement
            gardée en mémoire par le serveur — quelques minutes — pour limiter
            le nombre d&apos;envois et écarter les robots&nbsp;; elle
            n&apos;est ni transmise à qui que ce soit, ni rattachée à votre
            demande. En cas d&apos;échec d&apos;envoi, le serveur note la
            nature de la panne, jamais le contenu de votre formulaire.
          </P>

          <H2 id="finalites">3. Pourquoi, et sur quel fondement</H2>
          <SpecList
            rows={[
              [
                "Vous recontacter",
                "Répondre à votre demande, vous rappeler, préparer un rendez-vous et vous adresser une proposition. Fondement : votre consentement, donné en cochant la case avant l'envoi du formulaire (art. 6.1.a du RGPD).",
              ],
              [
                "Vous adresser nos offres",
                "Vous envoyer nos actualités et nos offres commerciales. C'est une case distincte, facultative, que vous cochez ou non : refuser n'empêche pas le traitement de votre demande. Fondement : votre consentement.",
              ],
              [
                "Protéger nos formulaires",
                "Limiter le nombre d'envois par visiteur et écarter les robots. Fondement : notre intérêt légitime à ne pas laisser nos formulaires servir de relais au spam.",
              ],
              [
                "Mesurer l'audience",
                "Savoir quelles pages sont consultées pour améliorer le site. Le dépôt des cookies de mesure repose sur votre consentement ; l'analyse des statistiques agrégées qui en découlent relève de notre intérêt légitime à faire fonctionner correctement notre site.",
              ],
              [
                "Tenir nos obligations",
                "Si votre projet aboutit à un contrat de construction, la conservation des pièces contractuelles et comptables répond à une obligation légale (art. 6.1.c du RGPD).",
              ],
            ]}
          />
          <P>
            Aucune décision automatisée, aucun profilage&nbsp;: c&apos;est une
            personne de l&apos;agence qui lit votre demande et qui vous
            rappelle.
          </P>

          <H2 id="destinataires">4. Qui reçoit vos données</H2>
          <P>
            <strong>L&apos;agence Essensya concernée.</strong> Votre demande est
            traitée par les conseillers de l&apos;agence compétente sur le
            secteur de votre projet.
          </P>
          <P>
            <strong>Vitahome, notre sous-traitant.</strong> La gestion des
            demandes passe par Vitahome (
            <span style={{ fontFamily: "var(--f-mono)" }}>pro.vitahome.fr</span>
            ), éditeur du logiciel de gestion commerciale utilisé par le
            constructeur. Les informations que vous saisissez dans le
            formulaire lui sont transmises dès l&apos;envoi et y sont
            enregistrées. Vitahome agit sur nos seules instructions, au titre
            de l&apos;article 28 du RGPD, et n&apos;a pas le droit
            d&apos;utiliser vos données pour son propre compte.
          </P>
          <p style={{ marginTop: "var(--s-2)" }}>
            {/* TODO conformité — le contrat de sous-traitance art. 28 doit
                exister par écrit. Demander sa référence et sa date. */}
            <ACompleter texte="[[À COMPLÉTER : référence et date du contrat de sous-traitance signé avec Vitahome (art. 28 RGPD)]]" valeur={t("soustraitant.vitahome")} />
          </p>
          <P>
            <strong>Google,</strong> uniquement si vous avez accepté la mesure
            d&apos;audience, et seulement pour les statistiques de navigation.
            Google ne reçoit jamais le contenu de vos formulaires.
          </P>
          <P>
            Vos données ne sont ni vendues, ni louées, ni cédées à des tiers à
            des fins publicitaires.
          </P>
          <P>
            Ces destinataires-là reçoivent ce que vous écrivez dans un
            formulaire. D&apos;autres sociétés, elles, ne reçoivent rien de vos
            formulaires mais voient votre adresse IP du seul fait que la page
            s&apos;affiche&nbsp;: elles sont nommées au point suivant.
          </P>

          {/* ⚠ Section ajoutée après audit : le site appelle trois familles de
              domaines tiers sans consentement (cf. la directive img-src de la
              CSP dans netlify.toml, qui en est la liste faisant foi). Les
              taire serait une omission au sens de l'art. 13 du RGPD.
              Toute nouvelle ressource externe doit être ajoutée ICI en même
              temps que dans la CSP — sinon ce texte devient faux. */}
          <H2 id="fournisseurs">5. Fournisseurs techniques</H2>
          <P>
            Afficher une page de ce site, c&apos;est aussi aller chercher des
            images et des cartes chez d&apos;autres sociétés que la nôtre.
            C&apos;est votre navigateur qui les contacte, directement&nbsp;:
            ces sociétés voient donc votre <strong>adresse IP</strong>, la date
            et l&apos;heure, le fichier demandé — et par là, la page que vous
            êtes en train de consulter — ainsi que ce que tout navigateur
            annonce de lui-même (son nom, sa version, votre langue). Cela se
            produit dès l&apos;ouverture de la page, avant toute action de votre
            part, et quel que soit votre choix en matière de cookies.
          </P>
          <SpecList
            rows={[
              [
                "CARTO et OpenStreetMap",
                "Le fond de la carte des terrains. Les tuiles — les carrés d'image qui composent la carte — sont servies par CARTO (basemaps.cartocdn.com) à partir des données cartographiques d'OpenStreetMap. CARTO reçoit votre adresse IP ainsi que la zone et le niveau de zoom que vous regardez, donc le secteur géographique qui vous intéresse. Cela ne concerne que la page des annonces, et seulement lorsque la carte s'affiche.",
              ],
              /* ⚠ LA LIGNE « Unsplash » A ÉTÉ RETIRÉE, ET C'EST UNE
                 OBLIGATION, PAS UN NETTOYAGE.

                 Elle annonçait un transfert de données vers
                 images.unsplash.com « dès l'ouverture de la page ». Ce
                 transfert n'a plus lieu : les visuels du constructeur
                 sont désormais servis par le site lui-même. Déclarer un
                 destinataire qui ne reçoit rien décrédibilise le reste
                 de la page — et c'est le reste qui protège.

                 La règle que pose l'en-tête de ce fichier vaut dans les
                 deux sens : cette page décrit le traitement RÉEL, elle
                 se modifie en même temps que le code, jamais après. */
              [
                "Vitahome",
                "Les photos et les plans des terrains et des maisons proviennent de l'outil de gestion commerciale du constructeur et sont servis par ses serveurs (pro.vitahome.fr et annonces.vitahome.fr). Vitahome reçoit donc votre adresse IP et l'annonce que vous consultez, indépendamment de tout formulaire.",
              ],
            ]}
          />
          <P>
            <strong>
              Pourquoi ces appels ne vous sont pas soumis au consentement.
            </strong>{" "}
            Ils ne déposent ni cookie, ni traceur, ni identifiant sur votre
            appareil, et ne servent ni à vous reconnaître, ni à vous suivre
            d&apos;une page à l&apos;autre. Ce sont des ressources nécessaires à
            l&apos;affichage&nbsp;: sans elles, la carte reste vide et les pages
            sans images. L&apos;accord préalable n&apos;est exigé que pour lire
            ou écrire une information sur votre appareil, ce que ces requêtes ne
            font pas.
          </P>
          <P>
            Nous ne le minimisons pas pour autant, et vous devez le
            savoir&nbsp;: votre adresse IP est une donnée personnelle, sa
            transmission à ces trois prestataires est réelle, automatique et
            hors de votre contrôle comme du nôtre une fois la page ouverte. Nous
            n&apos;avons aucune maîtrise de ce que ces sociétés en consignent
            dans leurs propres journaux techniques, ni du temps qu&apos;elles
            les conservent&nbsp;: leurs politiques de confidentialité
            respectives font foi. Seul un blocage côté navigateur (extension,
            mode de navigation renforcé) permet de l&apos;éviter — aucun réglage
            de notre site n&apos;y suffirait.
          </P>
          <p style={{ marginTop: "var(--s-2)" }}>
            {/* TODO conformité — art. 13.1.f : CARTO est une société
                américaine. Il faut vérifier depuis quels pays ces ressources
                sont réellement servies avant d'affirmer, ou de nier,
                l'existence d'un transfert. Ne rien écrire tant que ce n'est
                pas vérifié.

                Unsplash a quitté cette liste avec les photos qu'il servait :
                les visuels viennent maintenant du constructeur et sont servis
                par le site. Un destinataire de moins à documenter. */}
            <ACompleter texte="[[À COMPLÉTER : pays depuis lesquels CARTO et Vitahome servent ces ressources, et garantie applicable en cas de transfert hors UE]]" valeur={t("transferts")} />
          </p>

          <H2 id="duree">6. Combien de temps nous les gardons</H2>
          <P>
            La règle habituelle sur notre métier, et celle que recommande la
            CNIL, est la suivante&nbsp;: les données d&apos;un prospect sont
            conservées trois ans à compter de votre dernier contact (appel,
            réponse à un e-mail, rendez-vous), puis supprimées ou anonymisées.
            Si votre projet devient un contrat, les pièces contractuelles et
            comptables sont conservées pendant la durée légale applicable,
            notamment au titre de la garantie décennale.
          </P>
          <p style={{ marginTop: "var(--s-2)" }}>
            {/* TODO conformité — le client doit confirmer ou corriger ces
                durées, et elles doivent correspondre à ce qui est réellement
                purgé dans Vitahome, pas à une intention. */}
            <ACompleter texte="[[À COMPLÉTER : durée retenue pour les prospects (usuellement 3 ans après le dernier contact) et durée de conservation des dossiers contractuels]]" valeur={t("conservation")} />
          </p>
          <P>
            Deux durées sont en revanche déjà fixées et vérifiables&nbsp;: votre
            choix en matière de cookies est conservé 6 mois, et les cookies de
            mesure d&apos;audience 13 mois au maximum. Le détail figure sur la{" "}
            <Link href="/cookies" className="c-link" style={{ display: "inline" }}>
              page cookies
            </Link>
            .
          </P>

          <H2 id="hebergement">7. Où sont hébergées vos données</H2>
          <P>
            Le site et l&apos;outil de gestion commerciale reposent sur des
            serveurs dont la localisation conditionne l&apos;existence, ou non,
            d&apos;un transfert de données en dehors de l&apos;Union
            européenne.
          </P>
          <p style={{ marginTop: "var(--s-2)" }}>
            {/* TODO conformité — art. 13.1.f du RGPD : s'il y a transfert hors
                UE, il faut nommer le pays ET la garantie (décision
                d'adéquation ou clauses contractuelles types). Vérifier aussi
                où Vitahome héberge ses serveurs. */}
            <ACompleter texte="[[À COMPLÉTER : hébergeur du site, pays d'hébergement, localisation des serveurs Vitahome, et existence éventuelle d'un transfert hors UE avec la garantie applicable]]" valeur={t("hebergement")} />
          </p>
          <P>
            Si vous acceptez la mesure d&apos;audience, les données de
            navigation correspondantes peuvent être traitées par Google en
            dehors de l&apos;Union européenne, encadrées par les clauses
            contractuelles types de la Commission européenne. Refuser les
            cookies de mesure suffit à écarter ce transfert.
          </P>

          <H2 id="droits">8. Vos droits</H2>
          <P>
            Le RGPD vous donne sur vos données des droits que nous devons
            honorer dans un délai d&apos;un mois&nbsp;:
          </P>
          <SpecList
            rows={[
              ["Accès", "Savoir si nous détenons des données sur vous et en obtenir une copie."],
              ["Rectification", "Faire corriger une information inexacte ou incomplète."],
              ["Effacement", "Demander la suppression de vos données."],
              ["Limitation", "Demander le gel de leur utilisation le temps d'une vérification."],
              [
                "Opposition",
                "Vous opposer à leur utilisation, notamment à la prospection commerciale.",
              ],
              [
                "Portabilité",
                "Récupérer les données que vous nous avez fournies, dans un format lisible.",
              ],
              [
                "Retrait du consentement",
                "Retirer votre accord à tout moment, sans avoir à vous justifier. Le retrait ne remet pas en cause ce qui a été fait avant.",
              ],
              [
                "Directives post mortem",
                "Définir le sort de vos données après votre décès (art. 85 de la loi Informatique et Libertés).",
              ],
            ]}
          />
          <P>
            Pour exercer l&apos;un de ces droits, écrivez-nous&nbsp;; une
            preuve d&apos;identité peut vous être demandée en cas de doute
            raisonnable sur l&apos;auteur de la demande.
          </P>
          <p style={{ marginTop: "var(--s-2)" }}>
            {/* TODO conformité — une adresse dédiée (ex. rgpd@…) est attendue ;
                à défaut, celle de l'agence principale est affichée pour ne pas
                laisser le visiteur sans recours. Vérifier également si la
                désignation d'un DPO est obligatoire pour cette structure. */}
            <ACompleter texte="[[À COMPLÉTER : adresse e-mail de contact RGPD / DPO, adresse postale du responsable de traitement, et désignation ou non d'un délégué à la protection des données]]" valeur={t("dpo")} />
          </p>
          <P>
            Dans l&apos;attente, ces demandes sont reçues à l&apos;adresse{" "}
            <a
              href={`mailto:${EMAIL_PROVISOIRE}`}
              className="c-link"
              style={{ display: "inline" }}
            >
              {EMAIL_PROVISOIRE}
            </a>{" "}
            et traitées comme telles.
          </P>
          <P>
            Si notre réponse ne vous satisfait pas, vous pouvez adresser une
            réclamation à la CNIL — 3 place de Fontenoy, TSA 80715, 75334 Paris
            Cedex 07 — ou en ligne sur{" "}
            <a
              href="https://www.cnil.fr"
              className="c-link"
              style={{ display: "inline" }}
              target="_blank"
              rel="noopener noreferrer"
            >
              cnil.fr
            </a>
            .
          </P>

          <H2 id="cookies">9. Cookies</H2>
          <P>
            Aucun cookie de mesure ou de publicité n&apos;est déposé avant votre
            accord, et refuser y est aussi simple qu&apos;accepter. Le détail —
            finalités, cookies déposés, émetteurs, durées — figure sur la{" "}
            <Link href="/cookies" className="c-link" style={{ display: "inline" }}>
              page cookies
            </Link>
            . Votre choix reste modifiable à tout moment&nbsp;:
          </P>
          <div style={{ marginTop: "var(--s-3)" }}>
            <CookiePrefsLink className="c-btn c-btn--solid">
              Modifier mes préférences <span className="arrow">→</span>
            </CookiePrefsLink>
          </div>

          <H2 id="maj">10. Mise à jour de cette page</H2>
          <P>
            Ce texte évoluera si nos traitements changent — nouvel outil,
            nouveau destinataire, nouvelle finalité. La date ci-dessous fait
            foi&nbsp;; en cas de changement substantiel, votre consentement
            vous sera redemandé.
          </P>
          <p className="c-label c-label--accent" style={{ marginTop: "var(--s-3)" }}>
            Version du {MAJ}
          </p>
        </div>
      </section>
    </main>
  );
}
