import type { Metadata } from "next";
import Link from "next/link";
import CookiePrefsLink from "@/components/CookiePrefsLink";
import { SpecList } from "@/components/SpecList";
import { CONSENT_COOKIE, FINALITES } from "@/lib/consent";
import { resolveMetadata } from "@/lib/seo";

/* Le back-office peut surcharger le titre, la description, l'image de
   partage, le canonical et le noindex de cette page — écran
   Référencement. `resolveMetadata` repart TOUJOURS du défaut ci-dessous :
   une surcharge vidée rend la valeur d'origine, elle n'efface jamais
   la balise. */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/cookies", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Gestion des cookies",
  description:
    "Quels cookies nous déposons, pourquoi, combien de temps, et comment modifier votre choix à tout moment.",
  alternates: { canonical: "/cookies" },
};

/* Le tableau des cookies réellement déposés. À tenir à jour : c'est lui qui
   fait foi en cas de contrôle, et il doit décrire l'état RÉEL du site, pas
   l'état souhaité. Tant que GTM n'est pas branché en production, les lignes
   Google ne s'appliquent qu'aux visiteurs ayant accepté la mesure. */
const COOKIES: { nom: string; emetteur: string; finalite: string; duree: string }[] = [
  {
    nom: CONSENT_COOKIE,
    emetteur: "Maisons Essensya",
    finalite: "Mémorise votre choix de cookies pour ne pas vous le redemander.",
    duree: "6 mois",
  },
  {
    nom: "_ga",
    emetteur: "Google Analytics 4",
    finalite: "Distingue les visiteurs pour compter les visites uniques.",
    duree: "13 mois",
  },
  {
    nom: "_ga_<ID>",
    emetteur: "Google Analytics 4",
    finalite: "Maintient l'état de la session de mesure d'audience.",
    duree: "13 mois",
  },
];

export default function CookiesPage() {
  return (
    <main className="page">
      <section className="p-head">
        <div className="container">
          <nav className="c-breadcrumb" aria-label="Fil d'ariane">
            <Link href="/">Accueil</Link>
            <span className="sep">/</span>
            <span>Cookies</span>
          </nav>
          <h1>Gestion des cookies</h1>
          <p>
            Ce que nous déposons sur votre appareil, pourquoi, pour combien de temps
            — et comment revenir sur votre choix en un clic.
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: "var(--s-7)" }}>
        <div className="container" style={{ maxWidth: "58rem" }}>
          <div style={{ marginBottom: "var(--s-5)" }}>
            <CookiePrefsLink className="c-btn c-btn--solid">
              Modifier mes préférences <span className="arrow">→</span>
            </CookiePrefsLink>
          </div>

          <h2 style={{ fontSize: "var(--fs-h3)" }}>Le principe</h2>
          <p className="u-muted u-measure" style={{ marginTop: "var(--s-2)" }}>
            Aucun cookie de mesure ou de publicité n&apos;est déposé avant que vous
            n&apos;ayez donné votre accord. Tant que vous n&apos;avez pas choisi,
            rien ne part : l&apos;absence de choix vaut refus. Refuser est aussi
            simple qu&apos;accepter — un bouton, un clic, au même endroit.
          </p>

          <h2 style={{ fontSize: "var(--fs-h3)", marginTop: "var(--s-5)" }}>
            Les finalités
          </h2>
          <div style={{ marginTop: "var(--s-3)" }}>
            {FINALITES.map((f) => (
              <div key={f.cle} style={{ marginBottom: "var(--s-3)" }}>
                <h3 style={{ fontSize: "1rem" }}>{f.titre}</h3>
                <p
                  className="u-muted"
                  style={{ marginTop: ".5rem", fontSize: "var(--fs-small)", maxWidth: "58ch" }}
                >
                  {f.texte}
                </p>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: "var(--fs-h3)", marginTop: "var(--s-5)" }}>
            Les cookies déposés
          </h2>
          <div className="c-compare__wrap" style={{ marginTop: "var(--s-3)" }}>
            <table className="c-compare">
              <caption className="u-sr-only">
                Liste des cookies déposés, leur émetteur, leur finalité et leur durée
              </caption>
              <thead>
                <tr>
                  <th scope="col">Nom</th>
                  <th scope="col">Émetteur</th>
                  <th scope="col">Finalité</th>
                  <th scope="col">Durée</th>
                </tr>
              </thead>
              <tbody>
                {COOKIES.map((c) => (
                  <tr key={c.nom}>
                    <th scope="row">{c.nom}</th>
                    <td>{c.emetteur}</td>
                    <td>{c.finalite}</td>
                    <td>{c.duree}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: "var(--fs-h3)", marginTop: "var(--s-5)" }}>
            Vos droits
          </h2>
          <SpecList
            rows={[
              ["Retirer votre accord", "À tout moment, via « Personnaliser les cookies » en pied de page."],
              ["Durée de votre choix", "6 mois, puis la question vous est reposée."],
              ["Navigateur", "Vous pouvez aussi bloquer ou supprimer les cookies dans ses réglages."],
              ["Réclamation", "Vous pouvez saisir la CNIL (cnil.fr) si vous estimez vos droits non respectés."],
            ]}
          />

          {/* TODO conformité — à compléter avec l'entité juridique réelle
              (raison sociale, RCS, DPO ou contact RGPD) dès que le client
              la transmet. Une politique cookies sans responsable de
              traitement identifiable est incomplète. */}
          <p
            className="u-muted"
            style={{ marginTop: "var(--s-4)", fontSize: "var(--fs-small)", maxWidth: "58ch" }}
          >
            Pour toute question relative à vos données, écrivez-nous depuis la{" "}
            <Link href="/contact" className="c-link" style={{ display: "inline" }}>
              page contact
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
