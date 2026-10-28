import type { Metadata } from "next";
import Link from "next/link";
import { emailDuLien } from "@/lib/admin/comptes";

/* ════════════════════════════════════════════════════════════════
   LIEN D'ACCÈS — choisir son mot de passe

   L'écran où arrive une personne invitée, ou qui a oublié son mot de
   passe : un administrateur lui a transmis un lien à usage unique
   (écran Utilisateurs). Elle y choisit son mot de passe, et entre dans
   le back-office dans la foulée.

   ⚠ HORS DE TOUTE SESSION, PAR CONSTRUCTION : la personne n'a pas
   encore de mot de passe. Le jeton du lien EST l'autorisation. Il est
   vérifié deux fois — ici pour afficher le formulaire, puis au POST
   (src/app/api/admin/acces/route.ts) où il est consommé : c'est la
   seconde vérification qui compte, celle-ci n'évite qu'un formulaire
   qui ne pourrait pas aboutir.

   Même motif que l'écran de connexion : composant serveur pur, POST
   classique, erreurs dans la query string. Fonctionne sans JavaScript.
   ════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choisir un mot de passe",
  robots: { index: false, follow: false },
  /* L'adresse porte le jeton : aucun lien sortant de cette page ne doit
     l'emporter dans son en-tête Referer. */
  referrer: "no-referrer",
};

const ERREURS: Record<string, string> = {
  different: "Les deux saisies ne sont pas identiques. Rien n'a été enregistré.",
  base: "La base n'a pas répondu. Rien n'a été enregistré : réessayez dans un instant.",
};

export default async function AccesPage({
  searchParams,
}: {
  searchParams: Promise<{ jeton?: string; e?: string; motif?: string }>;
}) {
  const { jeton = "", e = "", motif = "" } = await searchParams;
  const email = await emailDuLien(jeton);

  if (!email) {
    return (
      <section className="adm-card" aria-labelledby="adm-acces-t">
        <p className="c-label">Maisons Essensya</p>
        <h1 id="adm-acces-t" style={{ fontSize: "1.3rem", margin: ".4rem 0 1rem" }}>
          Ce lien n&apos;est plus valable
        </h1>
        <p>
          Un lien d&apos;accès ne sert qu&apos;une fois, et pendant 72&nbsp;heures. Celui-ci a
          déjà été utilisé, a expiré, ou a été remplacé par un lien plus récent.
        </p>
        <p className="u-muted">
          Demandez-en un nouveau à un administrateur du site&nbsp;: il le génère en un clic depuis
          l&apos;écran «&nbsp;Utilisateurs&nbsp;». Si vous avez déjà choisi votre mot de passe,
          connectez-vous simplement.
        </p>
        <div className="adm-actions">
          <Link className="c-btn c-btn--solid" href="/admin/login">
            Se connecter
          </Link>
        </div>
      </section>
    );
  }

  /* `motif` est le texte de refus de la règle de mot de passe, produit
     par le serveur. Il est borné : il arrive par l'URL. */
  const erreur = e === "faible" ? motif.slice(0, 300) : (ERREURS[e] ?? "");

  return (
    <section className="adm-card" aria-labelledby="adm-acces-t">
      <p className="c-label">Maisons Essensya</p>
      <h1 id="adm-acces-t" style={{ fontSize: "1.5rem", margin: ".4rem 0 1rem" }}>
        Choisir votre mot de passe
      </h1>

      {erreur ? (
        <p className="adm-alerte" role="alert" style={{ marginBottom: "1rem" }}>
          {erreur}
        </p>
      ) : null}

      <form action="/api/admin/acces" method="post">
        <input type="hidden" name="jeton" value={jeton} />

        {/* L'identifiant, affiché et transmis : c'est lui que le
            gestionnaire de mots de passe associera au mot de passe
            choisi. En lecture seule — le lien désigne un compte, on ne
            change pas de compte en chemin. */}
        <div className="adm-field">
          <label htmlFor="email">Adresse e-mail</label>
          <input id="email" name="email" type="email" value={email} readOnly autoComplete="username" />
        </div>

        <div className="adm-field">
          <label htmlFor="motdepasse">Nouveau mot de passe</label>
          <input
            id="motdepasse"
            name="motdepasse"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={200}
            required
            autoFocus
            aria-describedby="adm-acces-regle"
          />
          <small id="adm-acces-regle" className="adm-field__aide">
            Au moins 14 caractères — une phrase fait très bien l&apos;affaire — ou au moins 12
            caractères mêlant majuscules, minuscules, chiffres et caractères spéciaux.
          </small>
        </div>

        <div className="adm-field">
          <label htmlFor="confirmation">Le même, une seconde fois</label>
          <input
            id="confirmation"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            maxLength={200}
            required
          />
        </div>

        <div className="adm-actions">
          <button className="c-btn c-btn--solid" type="submit">
            Enregistrer et entrer
          </button>
        </div>
      </form>

      <p className="u-muted" style={{ marginTop: "1.25rem", fontSize: ".8rem" }}>
        Ce lien ne fonctionne qu&apos;une fois. Votre mot de passe n&apos;est jamais conservé en
        clair&nbsp;: personne, pas même un administrateur, ne peut le lire.
      </p>
    </section>
  );
}
