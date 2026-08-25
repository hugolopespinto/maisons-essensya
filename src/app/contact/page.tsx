import type { Metadata } from "next";
import Link from "next/link";
import AgencyCard from "@/components/AgencyCard";
import LeadForm from "@/components/LeadForm";
import { AGENCIES } from "@/data/essensya";
import "@/styles/pages/contact.css";
import "@/styles/pages/agences.css"; // .c-agency-card en colonne latérale

export const metadata: Metadata = {
  title: "Contact — parler de votre projet",
  description:
    "Un formulaire, pas un parcours du combattant. Une agence vous répond sous 48 h, sans engagement et sans démarchage.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>Contact</span>
          </nav>
          <h1>Parler de votre projet</h1>
          <p>
            Un formulaire, pas un parcours du combattant. Dites-nous où vous en êtes,
            une agence vous répond sous 48 h — sans engagement et sans démarchage.
          </p>
        </div>
      </section>

      <section className="ct-body" style={{ paddingTop: "var(--s-4)" }}>
        <div className="container">
          <div className="ct-form-card" data-reveal>
            <h2>Être recontacté</h2>
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
                    <option>Question sur un modèle</option>
                    <option>Question sur une annonce</option>
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
            <span
              className="c-label c-label--accent"
              style={{ display: "block", marginBottom: "var(--s-3)" }}
              data-reveal
            >
              Ou directement en agence
            </span>
            {AGENCIES.map((g) => (
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
