import type { Metadata } from "next";
import Link from "next/link";
import AgencyCard, { telHref } from "@/components/AgencyCard";
import LeadForm from "@/components/LeadForm";
import { PLACEHOLDER, PRICE_FROM } from "@/data/essensya";
import { lecteurBlocs } from "@/lib/blocs";
import { agencesPubliees } from "@/lib/agences";
import { fmtPrice, telephonePublie } from "@/lib/format";
import { getContent } from "@/lib/store";
import "@/styles/pages/contact.css";
import { resolveMetadata } from "@/lib/seo";
import "@/styles/pages/agences.css"; // .c-agency-card en colonne latérale

/* Le back-office peut surcharger le titre, la description, l'image de
   partage, le canonical et le noindex de cette page — écran
   Référencement. `resolveMetadata` repart TOUJOURS du défaut ci-dessous :
   une surcharge vidée rend la valeur d'origine, elle n'efface jamais
   la balise. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/contact", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Contact — parler de votre projet",
  description:
    "Un formulaire, pas un parcours du combattant. Une agence vous répond sous 48 h, sans engagement et sans démarchage.",
  alternates: { canonical: "/contact" },
};

/* Le consentement RGPD n'est plus posé page par page : il vit dans
   <LeadForm>, qui le rend sur les huit formulaires du site. Une case
   recopiée à la main est une case qu'on finit par oublier. */


export default async function ContactPage() {
  const [{ pages, reglages, textes }, agences] = await Promise.all([
    getContent(),
    agencesPubliees(),
  ]);
  /* Le numéro saisi en Réglages, pas celui de la maquette. */
  const telephone = telephonePublie(reglages, textes, PLACEHOLDER.phone);
  const bloc = lecteurBlocs(pages, "contact");
  const chapo = bloc("hero.chapo");

  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>Contact</span>
          </nav>
          <h1>{bloc("hero.titre") || "Parler de votre projet"}</h1>
          {/* Chapô laissé vide dans le back-office : on garde la phrase
              d'origine, qui affiche le prix de départ à jour. La figer dans
              le contenu la ferait mentir au premier changement de tarif. */}
          {chapo ? (
            <p style={{ whiteSpace: "pre-line" }}>{chapo}</p>
          ) : (
            <p>
              Une gamme de modèles optimisés, à partir de {fmtPrice(PRICE_FROM)} hors
              terrain. Dites-nous où vous en êtes : une agence vous répond sous 48 h,
              sans engagement et sans démarchage.
            </p>
          )}
        </div>
      </section>

      <section className="ct-body" style={{ paddingTop: "var(--s-4)" }}>
        <div className="container">
          <div className="ct-form-card" data-reveal>
            <h2>{bloc("formulaire.titre") || "Être recontacté"}</h2>
            <LeadForm
              originKey="contact"
              gtmEvent="lead_contact_request"
              dark
              submitLabel="Envoyer"
              successMessage="Merci — nous revenons vers vous sous 48 h."
            >
              <div className="c-form__row">
                <div className="c-field">
                  <label htmlFor="cf-name">Prénom &amp; nom</label>
                  <input type="text" id="cf-name" name="name" required />
                </div>
                <div className="c-field">
                  <label htmlFor="cf-phone">Téléphone</label>
                  <input type="tel" id="cf-phone" name="phone" required />
                </div>
              </div>
              <div className="c-form__row">
                <div className="c-field">
                  <label htmlFor="cf-email">E-mail</label>
                  <input type="email" id="cf-email" name="email" />
                </div>
                <div className="c-field">
                  <label htmlFor="cf-reason">Votre demande</label>
                  <select id="cf-reason" name="reason" defaultValue="Être rappelé">
                    <option>Être rappelé</option>
                    <option>Prendre rendez-vous en agence</option>
                    <option>Question sur la maison</option>
                    <option>Question sur un terrain</option>
                    <option>Autre</option>
                  </select>
                </div>
              </div>
              <div className="c-field">
                <label htmlFor="cf-msg">Votre message (facultatif)</label>
                <textarea id="cf-msg" name="message" rows={4} />
              </div>
            </LeadForm>
          </div>

          <aside className="ct-aside">
            {/* Sur ce métier, une bonne moitié des prospects préfère
                appeler que remplir un champ : le numéro passe devant. */}
            <a
              className="c-price-xl"
              href={telHref(telephone)}
              style={{ fontSize: "clamp(1.7rem,4.6vw,2.6rem)" }}
              data-reveal
            >
              <span className="from">Ou appelez-nous</span>
              {telephone}
              <small>{agences[0]?.hours ?? ""} · appel non surtaxé</small>
            </a>

            <span
              className="c-label c-label--accent"
              style={{ display: "block", margin: "var(--s-5) 0 var(--s-3)" }}
              data-reveal
            >
              Ou directement en agence
            </span>
            {/* Les agences réellement publiées : le client en ouvre ou en
                ferme une depuis le back-office, cette liste suit. */}
            {agences.map((g) => (
              <AgencyCard agency={g} key={g.id} />
            ))}
            <p className="ct-direct" data-reveal>
              Une question rapide ? Écrivez-nous à{" "}
              <a href="mailto:contact@essensya.fr">contact@essensya.fr</a>
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
