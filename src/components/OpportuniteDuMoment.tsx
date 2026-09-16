"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";

/* ════════════════════════════════════════════════════════════════
   L'OPPORTUNITÉ DU MOMENT — une annonce différente à chaque visite

   ⚠ POURQUOI UN COMPOSANT CLIENT, ALORS QUE TOUT LE RESTE DE L'ACCUEIL
   EST RENDU SUR LE SERVEUR.

   La demande est « une annonce différente à chaque rafraîchissement ».
   Tirer au sort côté serveur imposerait de rendre TOUTE la page
   d'accueil à la demande : plus de pré-génération, plus de cache, un LCP
   dégradé sur la page la plus visitée du site — et cela pour animer un
   seul bloc. Le prix est sans commune mesure avec le gain.

   Le serveur rend donc toujours la PREMIÈRE annonce du lot : la page
   reste statique, et c'est cette version-là que Google indexe, stable.
   Le tirage a lieu après l'hydratation, côté visiteur. Conséquence
   assumée : un très bref instant, la première annonce est affichée avant
   d'être remplacée. Comme la carte ne change ni de taille ni de
   structure — seuls le texte et l'image changent — il n'y a pas de saut
   de mise en page, seulement un changement de contenu.

   ⚠ NI `Math.random()` AU RENDU, NI `setState` DANS UN EFFET.
   Le premier ferait diverger le HTML du serveur de celui du client :
   React signale l'erreur d'hydratation et remplace tout l'arbre. Le
   second déclenche un rendu en cascade juste après l'hydratation, ce que
   la règle `react-hooks/set-state-in-effect` interdit à raison.

   `useSyncExternalStore` existe précisément pour ce cas : il rend une
   valeur sur le serveur et une autre sur le client, sans divergence.

   Le tirage lui-même vit HORS du composant, dans une variable de module
   fixée au premier appel. Deux raisons : il reste stable d'un rendu à
   l'autre — sans quoi un simple survol changerait l'annonce — et React
   ne voit qu'une fonction qui rend toujours la même valeur pendant la
   vie de la page. Ni ref lue au rendu, ni état modifié dans un effet :
   les deux règles du React Compiler sont respectées sans exception.

   ⚠ TEXTE ET IMAGE NE SE SUPERPOSENT PLUS. L'ancienne version posait le
   titre sur la photo, et le client a relevé le problème avant nous :
   « le texte sera peu lisible et l'image également ». Deux colonnes, pas
   de voile, pas de compromis — chacun garde toute sa lisibilité.
   ════════════════════════════════════════════════════════════════ */

/* Fixé au premier appel, puis constant pour toute la durée de la page.
   Un module client n'est évalué qu'une fois par chargement : c'est
   exactement la durée de vie voulue pour « une annonce par visite ». */
let graine: number | null = null;

const tirer = (n: number): number => {
  graine ??= Math.floor(Math.random() * 1_000_003);
  return graine % n;
};

export interface OpportuniteItem {
  id: string;
  ville: string;
  titre: string;
  href: string;
  image: string;
  /** Vrai quand l'image n'est PAS celle de l'annonce : on le dit. */
  imageIllustration: boolean;
  imageAlt: string;
  specs: { label: string; valeur: string }[];
  mention: string;
}

export default function OpportuniteDuMoment({
  items,
  surtitre,
}: {
  items: OpportuniteItem[];
  surtitre: string;
}) {
  /* `false` sur le serveur et pendant l'hydratation, `true` ensuite.
     L'abonnement ne notifie jamais : la valeur ne change qu'une fois. */
  const estClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (items.length === 0) return null;

  /* Sur le serveur et à l'hydratation : toujours la première, donc un
     HTML identique des deux côtés. Après : celle du tirage. */
  const a = items[estClient ? tirer(items.length) : 0];

  return (
    <section className="s-opp" id="opportunite" aria-labelledby="opp-t">
      <div className="container s-opp__grid">
        <div className="s-opp__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.image} alt={a.imageAlt} loading="lazy" />
        </div>

        <div className="s-opp__corps">
          <span className="c-label c-label--accent">{surtitre}</span>
          <h2 id="opp-t">{a.titre}</h2>

          {a.specs.length > 0 && (
            <div className="c-plate s-opp__plate">
              {a.specs.map((s) => (
                <span className="c-plate__spec" key={s.label}>
                  {s.label} <strong>{s.valeur}</strong>
                </span>
              ))}
            </div>
          )}

          <div className="s-opp__actions">
            <Link href={a.href} className="c-btn c-btn--solid">
              Voir cette opportunité <span className="arrow">→</span>
            </Link>
            <Link href="/annonces?type=terrain-maison" className="c-btn">
              Voir toutes nos opportunités
            </Link>
          </div>

          {/* Une image qui ne montre pas le bien doit le dire. Sans cette
              ligne, un rendu de modèle posé sur une annonce laisse croire
              que c'est la maison de cette parcelle. */}
          {a.imageIllustration && (
            <p className="s-opp__note">
              Visuel d&apos;illustration : la photo de cette annonce n&apos;est pas
              encore disponible.
            </p>
          )}

          {/* La mention du flux engage le constructeur : elle suit le prix
              partout où il est affiché. */}
          {a.mention && <p className="s-opp__mention">{a.mention}</p>}
        </div>
      </div>
    </section>
  );
}
