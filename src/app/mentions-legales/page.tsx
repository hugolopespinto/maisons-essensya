import { resolveMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SpecList } from "@/components/SpecList";
import { AGENCIES, PLACEHOLDER } from "@/data/essensya";
import { telephonePublie } from "@/lib/format";
import { getContent } from "@/lib/store";

/* ════════════════════════════════════════════════════════════════
   MENTIONS LÉGALES

   ⚠ TODO conformité — CETTE PAGE EST BLOQUANTE POUR LA MISE EN LIGNE.

   Un constructeur de maisons individuelles n'est pas un éditeur de site
   ordinaire. Au-delà des mentions imposées à tout site par la LCEN
   (art. 6-III — éditeur identifiable, directeur de publication,
   hébergeur), il exerce une activité réglementée par le contrat de
   construction de maison individuelle (CCMI, loi du 19 décembre 1990,
   art. L.231-1 et suivants du Code de la construction et de
   l'habitation) et doit pouvoir justifier publiquement :
     · son immatriculation au RCS ;
     · son assurance de responsabilité civile décennale — assureur,
       numéro de contrat et couverture géographique (art. L.241-1 du
       Code des assurances, dont la mention est obligatoire sur les
       documents commerciaux depuis la loi du 6 août 2015) ;
     · sa garantie de livraison à prix et délais convenus, délivrée par
       un établissement de crédit ou une entreprise d'assurance — sans
       elle, un CCMI ne peut pas être signé ;
     · le médiateur de la consommation dont il relève (art. L.616-1 du
       Code de la consommation), à afficher sur son site.

   Aucune de ces informations n'est inventée ici. Les marqueurs
   `[[À COMPLÉTER : …]]` doivent tous être levés avant publication : un
   faux numéro RCS ou un assureur approximatif sur un site de
   constructeur est une faute bien plus grave qu'un champ vide.
   ════════════════════════════════════════════════════════════════ */

/* Le back-office peut surcharger le titre, la description, l'image de
   partage, le canonical et le noindex de cette page — écran Référencement.
   `resolveMetadata` repart TOUJOURS du défaut ci-dessous : une surcharge
   vidée rend la valeur d'origine, elle n'efface jamais la balise. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/mentions-legales", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Mentions légales",
  description:
    "Éditeur du site, directeur de la publication, hébergeur, assurances et garanties du constructeur, propriété intellectuelle et médiation de la consommation.",
  alternates: { canonical: "/mentions-legales" },
};

/** Date de dernière révision du texte. À bouger à chaque modification. */
const MAJ = "11 septembre 2026";

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

/** Trou assumé, rendu visible à l'écran : personne ne met en ligne sans le voir. */
function ACompleter({ texte }: { texte: string }) {
  return (
    <mark
      style={{
        display: "inline-block",
        background: "var(--bois-clair)",
        color: "var(--bois-fonce)",
        fontFamily: "var(--f-mono)",
        fontSize: "var(--fs-small)",
        padding: ".2em .55em",
        borderRadius: "var(--radius)",
      }}
    >
      {texte}
    </mark>
  );
}

export default async function MentionsLegalesPage() {
  /* ⚠ LE TÉLÉPHONE DES MENTIONS LÉGALES EST UNE OBLIGATION, pas un
     ornement : l'article 6-III de la LCEN impose les coordonnées
     permettant de contacter l'éditeur. Cette page affichait le numéro de
     démonstration en dur, sans jamais lire celui que le client saisit
     dans Réglages. */
  const { reglages, textes } = await getContent();
  const telephone = telephonePublie(reglages, textes, PLACEHOLDER.phone);
  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>Mentions légales</span>
          </nav>
          <h1>Mentions légales</h1>
          <p>
            Qui édite ce site, qui l&apos;héberge, et sous quelles assurances et
            garanties nous construisons.
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: "var(--s-7)" }}>
        <div className="container" style={{ maxWidth: "58rem" }}>
          <p className="c-label">Dernière mise à jour · {MAJ}</p>

          <H2 id="editeur">Éditeur du site</H2>
          <P>
            Conformément à l&apos;article 6-III de la loi du 21 juin 2004 pour
            la confiance dans l&apos;économie numérique, l&apos;éditeur du
            présent site est&nbsp;:
          </P>
          <p style={{ marginTop: "var(--s-2)" }}>
            {/* TODO conformité — bloquant. L'éditeur doit être identifiable :
                dénomination, forme, capital, siège, immatriculation, TVA. */}
            <ACompleter texte="[[À COMPLÉTER : dénomination sociale, forme juridique, montant du capital social, adresse du siège social, numéro SIREN, ville d'immatriculation au RCS, numéro de TVA intracommunautaire]]" />
          </p>
          <SpecList
            rows={[
              ["Nom commercial", "Maisons Essensya"],
              ["Activité", "Construction de maisons individuelles"],
              ["Téléphone", telephone],
              [
                "E-mail",
                <a
                  key="mail"
                  href={`mailto:${EMAIL_PROVISOIRE}`}
                  className="c-link"
                  style={{ display: "inline" }}
                >
                  {EMAIL_PROVISOIRE}
                </a>,
              ],
            ]}
          />
          <P>
            Le numéro de téléphone et l&apos;adresse e-mail ci-dessus sont ceux
            de l&apos;agence principale, en attendant les coordonnées
            institutionnelles de la société. La liste complète des
            établissements figure sur la page{" "}
            <Link href="/agences" className="c-link" style={{ display: "inline" }}>
              nos agences
            </Link>
            .
          </P>

          <H2 id="publication">Directeur de la publication</H2>
          <p style={{ marginTop: "var(--s-2)" }}>
            {/* TODO conformité — il s'agit en principe du représentant légal
                de la société éditrice. */}
            <ACompleter texte="[[À COMPLÉTER : nom, prénom et qualité du directeur de la publication (en principe le représentant légal)]]" />
          </p>

          <H2 id="hebergeur">Hébergeur</H2>
          <P>
            Le site est hébergé par&nbsp;:
          </P>
          <p style={{ marginTop: "var(--s-2)" }}>
            {/* TODO conformité — la LCEN impose le nom, la dénomination, ainsi
                que l'adresse et le téléphone de l'hébergeur. Doit correspondre
                à l'hébergeur réel retenu à la mise en production, et rester
                cohérent avec le point 6 de /confidentialite. */}
            <ACompleter texte="[[À COMPLÉTER : dénomination sociale de l'hébergeur, adresse postale, numéro de téléphone, pays d'hébergement des serveurs]]" />
          </p>

          <H2 id="constructeur">
            Assurances et garanties du constructeur
          </H2>
          <P>
            La construction de maisons individuelles est une activité
            réglementée. Les informations suivantes engagent le constructeur et
            doivent pouvoir être vérifiées avant toute signature&nbsp;:
          </P>
          <div style={{ marginTop: "var(--s-3)" }}>
            <h3 style={{ fontSize: "1rem" }}>Immatriculation</h3>
            <p style={{ marginTop: ".5rem" }}>
              {/* TODO conformité — bloquant : le RCS doit figurer sur tous les
                  documents commerciaux, site inclus. */}
              <ACompleter texte="[[À COMPLÉTER : numéro RCS et ville du greffe]]" />
            </p>
          </div>
          <div style={{ marginTop: "var(--s-3)" }}>
            <h3 style={{ fontSize: "1rem" }}>
              Assurance de responsabilité civile décennale
            </h3>
            <p className="u-muted" style={{ marginTop: ".5rem", maxWidth: "58ch" }}>
              Elle couvre pendant dix ans, à compter de la réception des
              travaux, les dommages compromettant la solidité de
              l&apos;ouvrage ou le rendant impropre à sa destination.
            </p>
            <p style={{ marginTop: ".75rem" }}>
              {/* TODO conformité — bloquant : art. L.241-1 du Code des
                  assurances. Nom de l'assureur, n° de contrat et couverture
                  géographique sont obligatoires sur les documents
                  commerciaux. */}
              <ACompleter texte="[[À COMPLÉTER : nom et adresse de l'assureur décennale, numéro de contrat, couverture géographique du contrat]]" />
            </p>
          </div>
          <div style={{ marginTop: "var(--s-3)" }}>
            <h3 style={{ fontSize: "1rem" }}>
              Garantie de livraison à prix et délais convenus
            </h3>
            <p className="u-muted" style={{ marginTop: ".5rem", maxWidth: "58ch" }}>
              Obligatoire pour tout contrat de construction de maison
              individuelle avec fourniture de plan. Délivrée par un
              établissement de crédit ou une entreprise d&apos;assurance, elle
              garantit l&apos;achèvement de la maison au prix et dans les délais
              convenus, même en cas de défaillance du constructeur.
            </p>
            <p style={{ marginTop: ".75rem" }}>
              {/* TODO conformité — bloquant : sans garant nommé, la promesse
                  « prix figé au contrat » faite ailleurs sur le site n'est pas
                  adossée. */}
              <ACompleter texte="[[À COMPLÉTER : nom et adresse de l'établissement garant de livraison, référence de la garantie]]" />
            </p>
          </div>
          <div style={{ marginTop: "var(--s-3)" }}>
            <h3 style={{ fontSize: "1rem" }}>Autres assurances</h3>
            <p style={{ marginTop: ".5rem" }}>
              {/* TODO conformité — à préciser : RC professionnelle, et le cas
                  échéant l'assurance dommages-ouvrage souscrite par le maître
                  d'ouvrage. */}
              <ACompleter texte="[[À COMPLÉTER : assurance de responsabilité civile professionnelle (assureur, n° de contrat) et modalités de l'assurance dommages-ouvrage]]" />
            </p>
          </div>

          <H2 id="mediation">Médiation de la consommation</H2>
          <P>
            Conformément aux articles L.616-1 et R.616-1 du Code de la
            consommation, tout consommateur a le droit de recourir gratuitement
            à un médiateur de la consommation en vue de la résolution amiable
            d&apos;un litige qui l&apos;oppose au constructeur, après avoir
            tenté de le résoudre directement par une réclamation écrite.
          </P>
          <p style={{ marginTop: "var(--s-2)" }}>
            {/* TODO conformité — bloquant : l'adhésion à un médiateur agréé est
                obligatoire, et ses coordonnées doivent figurer sur le site. */}
            <ACompleter texte="[[À COMPLÉTER : nom du médiateur de la consommation dont relève l'entreprise, adresse postale et adresse du site de saisine]]" />
          </p>

          <H2 id="propriete">Propriété intellectuelle</H2>
          <P>
            L&apos;ensemble de ce site — structure, textes, plans, visuels,
            identité graphique, typographies et code — est protégé par le droit
            d&apos;auteur et le droit des marques. Toute reproduction,
            représentation, adaptation ou exploitation, totale ou partielle, par
            quelque procédé que ce soit, est interdite sans autorisation écrite
            préalable de l&apos;éditeur.
          </P>
          <P>
            Les plans et les caractéristiques de la maison présentés sur ce site
            sont donnés à titre indicatif et ne valent pas document contractuel.
            Seuls les documents annexés au contrat de construction signé font
            foi.
          </P>

          <H2 id="credits">Crédits et visuels</H2>
          <P>
            Les photographies actuellement affichées sont des visuels de calage
            et ne représentent pas les réalisations du constructeur. Elles
            doivent être remplacées par des prises de vue des maisons
            réellement livrées avant la mise en ligne.
          </P>
          <p style={{ marginTop: "var(--s-2)" }}>
            {/* Les visuels de démonstration Unsplash ont été purgés : le
                site montre désormais les rendus du constructeur. Le risque
                visé ici — présenter des maisons d'architecte sans rapport
                avec le produit — est levé.

                ⚠ Reste à trancher la nature de ces images : ce sont des
                RENDUS 3D, pas des photographies de maisons livrées. Le texte
                ci-dessus le dit déjà ; il faudra le maintenir tant que le
                constructeur n'aura pas fourni de vraies prises de vue. */}
            <ACompleter texte="[[À COMPLÉTER : crédits photographiques définitifs (auteur, licence) et crédits de conception / réalisation du site]]" />
          </p>

          <H2 id="donnees">Données personnelles et cookies</H2>
          <P>
            Le traitement des données recueillies par nos formulaires, leurs
            destinataires — dont notre sous-traitant Vitahome — leur durée de
            conservation et vos droits sont détaillés dans notre{" "}
            <Link
              href="/confidentialite"
              className="c-link"
              style={{ display: "inline" }}
            >
              politique de protection des données
            </Link>
            . Les cookies déposés et la façon de revenir sur votre choix sont
            décrits sur la{" "}
            <Link href="/cookies" className="c-link" style={{ display: "inline" }}>
              page cookies
            </Link>
            .
          </P>

          <H2 id="droit">Droit applicable</H2>
          <P>
            Le présent site et les mentions qui précèdent sont soumis au droit
            français. En cas de litige, et à défaut de résolution amiable ou de
            médiation, les tribunaux français sont seuls compétents.
          </P>

          <p className="c-label c-label--accent" style={{ marginTop: "var(--s-5)" }}>
            Version du {MAJ}
          </p>
        </div>
      </section>
    </main>
  );
}
