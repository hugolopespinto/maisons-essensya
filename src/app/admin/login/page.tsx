import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authDriver, isAdminEnabled, isAuthenticated } from "@/lib/admin/auth";

/* ════════════════════════════════════════════════════════════════
   ÉCRAN DE CONNEXION

   Composant serveur pur, sans `useActionState` : le retour d'erreur passe
   par la query string (`?e=1`) que pose `login()`. Le formulaire
   fonctionne donc sans JavaScript, et les identifiants n'apparaissent
   jamais dans un état React sérialisé vers le client.

   Deux formulaires pour une seule action : e-mail + mot de passe quand
   Supabase pilote l'authentification, mot de passe seul sinon. C'est le
   SEUL endroit du back-office qui sait quel pilote tourne — partout
   ailleurs, `requireAdmin()` suffit.

   Le message d'échec est unique, identique dans tous les cas — voir le
   commentaire de `login()` dans ../actions.ts.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  /* Next 16 : `searchParams` est une Promise. */
  searchParams: Promise<{ e?: string }>;
}) {
  /* Déjà connecté : on ne réaffiche pas un formulaire inutile. */
  if (await isAuthenticated()) redirect("/admin");

  const { e } = await searchParams;
  const erreur = e === "1";
  const comptesNommes = authDriver() === "supabase";

  /* ── Back-office non configuré ──────────────────────────────────
     Sans Supabase NI mot de passe partagé, aucune session ne peut être
     créée : afficher un formulaire qui ne peut pas aboutir ferait perdre
     un quart d'heure à quelqu'un. On dit ce qui manque et où le mettre. */
  if (!isAdminEnabled()) {
    return (
      <section className="adm-card" aria-labelledby="adm-login-t">
        <h1 id="adm-login-t" style={{ fontSize: "1.3rem" }}>
          Back-office non configuré
        </h1>
        <p>
          L&apos;administration n&apos;est pas activée : le serveur ne dispose
          d&apos;aucun moyen d&apos;authentifier qui que ce soit.
        </p>
        <div className="adm-note adm-note--alerte">
          <strong>Comptes nommés (recommandé)</strong>
          <code style={{ display: "block", marginTop: ".5rem" }}>
            SUPABASE_URL=…
            <br />
            SUPABASE_SERVICE_ROLE_KEY=…
          </code>
          <span className="u-muted">
            {" "}
            Chaque personne a son e-mail et son mot de passe, et doit figurer
            dans la table <code>admins</code> : être authentifié ne suffit pas.
            Schéma à exécuter : <code>supabase/schema.sql</code>.
          </span>
        </div>
        <div className="adm-note" style={{ marginTop: ".75rem" }}>
          <strong>Ou mot de passe partagé (recette uniquement)</strong>
          <code style={{ display: "block", marginTop: ".5rem" }}>
            ADMIN_PASSWORD=…
          </code>
          <span className="u-muted">
            {" "}
            8 caractères minimum. Pratique pour une démonstration, mais
            personne ne sait plus qui a modifié quoi.
          </span>
        </div>
        <p className="u-muted" style={{ marginTop: "1rem" }}>
          En local, dans <code>.env.local</code> ; en production, dans les
          variables d&apos;environnement de l&apos;hébergeur, puis redéployer.
          Voir <code>.env.example</code> pour la liste complète des variables et
          leur effet.
        </p>
        <div className="adm-actions">
          <Link className="c-btn" href="/">
            Retour au site
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="adm-card" aria-labelledby="adm-login-t">
      <p className="c-label">Maisons Essensya</p>
      <h1 id="adm-login-t" style={{ fontSize: "1.5rem", margin: ".4rem 0 1rem" }}>
        Administration
      </h1>

      {/* POST classique vers un point d'entrée HTTP, et non une Server
          Action : les gestionnaires de mots de passe ne proposent
          d'enregistrer qu'après une navigation de DOCUMENT, ce qu'une
          Server Action ne produit pas (elle redirige côté client). Voir
          src/app/api/admin/login/route.ts. */}
      <form action="/api/admin/login" method="post">
        {comptesNommes ? (
          <div className="adm-field">
            <label htmlFor="email">Adresse e-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              /* `inputMode` + pas de correction automatique : sur mobile,
                 une majuscule ajoutée d'office fait échouer la saisie. */
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              autoFocus
              aria-describedby={erreur ? "adm-login-err" : undefined}
            />
          </div>
        ) : null}

        <div className="adm-field">
          <label htmlFor="motdepasse">Mot de passe</label>
          <input
            id="motdepasse"
            name="motdepasse"
            type="password"
            /* Un gestionnaire de mots de passe doit pouvoir enregistrer
               celui-ci : sans ce `autoComplete`, il ne le propose pas. */
            autoComplete="current-password"
            required
            autoFocus={!comptesNommes}
            aria-describedby={erreur ? "adm-login-err" : undefined}
          />
        </div>

        {/* `aria-live` : sur un rechargement de page le lecteur d'écran ne
            repart pas forcément du début du document. Le message doit
            s'annoncer de lui-même. */}
        <p
          id="adm-login-err"
          role="status"
          aria-live="polite"
          style={{ minHeight: "1.2rem", marginTop: ".75rem" }}
        >
          {erreur ? (
            <span className="adm-badge adm-badge--off">Connexion refusée</span>
          ) : null}
        </p>

        <div className="adm-actions">
          <button className="c-btn c-btn--solid" type="submit">
            Se connecter
          </button>
        </div>
      </form>

      <p className="u-muted" style={{ marginTop: "1.25rem", fontSize: ".8rem" }}>
        {comptesNommes ? (
          <>
            Comptes nommés (Supabase), session de 8 heures, cookie strictement
            serveur. Mot de passe oublié : demander une réinitialisation à un
            administrateur.
          </>
        ) : (
          <>
            Session de 8 heures, cookie strictement serveur. Mot de passe
            partagé : à remplacer par des comptes nommés avant une exploitation
            réelle.
          </>
        )}
      </p>
    </section>
  );
}
