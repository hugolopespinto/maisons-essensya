"use client";
import Link from "next/link";
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import SpecList from "@/components/SpecList";
import { fmtPrice } from "@/lib/format";
import {
  DUREE_DEFAUT,
  TAUX_DEFAUT,
  TAUX_MAX_CURSEUR,
  apportSuggere,
  calculer,
  enSaisie,
  lire,
} from "@/lib/simulation";

/* ════════════════════════════════════════════════════════════════
   SIMULATEUR DE PRÊT — le calcul, chez le visiteur

   Quatre saisies, demandées par le client le 23/10 : le montant du
   projet, l'apport, le taux et la durée. Le montant emprunté s'en
   déduit (projet − apport) : demander à la fois « le prêt » et
   « l'apport » laisserait l'apport sans effet sur le calcul.

   PRÉ-REMPLI depuis le 24/10, à la demande du client : le prix du bien
   quand le simulateur s'ouvre depuis une fiche, un taux de 3 % réglé
   au curseur (0 à 5 %), 20 ans, et un apport de 10 % du projet arrondi
   à 5 000 €. Le calcul vit dans src/lib/simulation.ts.

   ⚠ LE TAUX PAR DÉFAUT EST UN EXEMPLE. Jusqu'au 24/10, le site n'en
   proposait aucun : une mensualité calculée sur un taux que NOUS
   affichons se rapproche d'une publicité pour un crédit, avec ses
   mentions obligatoires (voir l'aide du champ « Mensualité indicative »
   du back-office). Le client a demandé ce taux ; l'aide du champ et la
   mention le présentent comme un exemple, et la validation juridique
   reste à faire avant d'indexer la page.
   ════════════════════════════════════════════════════════════════ */

/**
 * `intro` : le chapô de la page, rendu par le serveur et posé en tête de
 * la colonne des champs. Il passe à la ligne dans cette colonne, ce qui
 * laisse la carte de l'estimation remonter à sa hauteur : tout tient
 * dans le premier écran, sans défiler (demande du client, 24/10).
 *
 * `pied` : la mention légale et le lien vers la FAQ, sous les champs, à
 * côté de la carte — ils occupaient seuls une rangée sous l'outil. Sur
 * mobile, ils repassent après l'estimation (zones de grille, voir
 * simulateur.css) : l'ordre du DOM est déjà celui de la lecture.
 *
 * `montantInitial` : le prix du bien, quand le simulateur s'ouvre depuis
 * une fiche ou avec `?montant=` dans l'adresse.
 */
export default function SimulateurPret({
  intro,
  pied,
  montantInitial,
}: {
  intro?: ReactNode;
  pied?: ReactNode;
  montantInitial?: number;
}) {
  const id = useId();
  const [projet, setProjet] = useState(montantInitial ? enSaisie(montantInitial) : "");
  /* `null` tant que le visiteur n'a pas touché à l'apport : il suit
     alors le montant du projet (10 %, arrondi). Dès la première saisie,
     c'est la sienne qui compte, même vide. */
  const [apportSaisi, setApportSaisi] = useState<string | null>(null);
  const [taux, setTaux] = useState(enSaisie(TAUX_DEFAUT));
  const [duree, setDuree] = useState(String(DUREE_DEFAUT));

  const p = lire(projet);
  const apport = apportSaisi ?? (p ? enSaisie(apportSuggere(p)) : "");
  const r = calculer(projet, apport, taux, duree);
  const annees = lire(duree);
  const curseur = Math.min(lire(taux) ?? 0, TAUX_MAX_CURSEUR);

  return (
    <div className="sf-grille">
      <div className="sf-saisie">
        {intro}
        {/* Pas d'envoi : le calcul suit la saisie. Le <form> garde Entrée
            inoffensive et regroupe les champs pour les lecteurs d'écran. */}
        <form className="sf-form" onSubmit={(e) => e.preventDefault()} aria-label="Votre projet">
          <div className="c-field">
            <label htmlFor={`${id}-projet`}>Montant total du projet</label>
            <div className="sf-unite">
              <input
                id={`${id}-projet`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={projet}
                onChange={(e) => setProjet(e.target.value)}
                aria-describedby={`${id}-projet-aide`}
              />
              <span aria-hidden="true">€</span>
            </div>
            <span className="sf-aide" id={`${id}-projet-aide`}>
              Maison, terrain et frais compris.
            </span>
          </div>

          <div className="c-field">
            <label htmlFor={`${id}-apport`}>Apport</label>
            <div className="sf-unite">
              <input
                id={`${id}-apport`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={apport}
                onChange={(e) => setApportSaisi(e.target.value)}
                placeholder="0"
                aria-describedby={`${id}-apport-aide`}
              />
              <span aria-hidden="true">€</span>
            </div>
            <span className="sf-aide" id={`${id}-apport-aide`}>
              Proposé à 10 % du projet.
            </span>
          </div>

          <div className="c-field">
            <label htmlFor={`${id}-taux`}>Taux du crédit</label>
            {/* Le curseur règle le taux de 0 à 5 % ; le champ à côté en
                donne la valeur exacte et accepte un taux plus fin ou plus
                élevé. Les deux écrivent le même état. */}
            <div className="sf-taux">
              <input
                type="range"
                min={0}
                max={TAUX_MAX_CURSEUR}
                step={0.05}
                value={curseur}
                onChange={(e) => setTaux(enSaisie(Number(e.target.value)))}
                aria-label="Taux du crédit, de 0 à 5 %"
                aria-valuetext={`${taux} %`}
                style={{ "--p": `${(curseur / TAUX_MAX_CURSEUR) * 100}%` } as CSSProperties}
              />
              <div className="sf-unite">
                <input
                  id={`${id}-taux`}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={taux}
                  onChange={(e) => setTaux(e.target.value)}
                  aria-describedby={`${id}-taux-aide`}
                />
                <span aria-hidden="true">%</span>
              </div>
            </div>
            <span className="sf-aide" id={`${id}-taux-aide`}>
              Un exemple : réglez-le sur celui de votre banque.
            </span>
          </div>

          <div className="c-field">
            <label htmlFor={`${id}-duree`}>Durée du crédit</label>
            <div className="sf-unite">
              {/* Texte comme les trois autres, pas `type="number"` : ses
                  flèches natives venaient buter contre l'unité « ans ». Les
                  bornes 1 à 30 sont tenues par `calculer`. */}
              <input
                id={`${id}-duree`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={duree}
                onChange={(e) => setDuree(e.target.value)}
              />
              <span aria-hidden="true">ans</span>
            </div>
          </div>
        </form>
      </div>

      <div className="sf-resultat u-sombre" aria-live="polite">
        <span className="c-label c-label--accent">Votre estimation</span>
        {r.ok ? (
          <>
            <p className="c-price-xl sf-mensualite">
              <span className="from">Mensualité hors assurance</span>
              {fmtPrice(r.mensualite)}
              <small>par mois, pendant {annees} ans</small>
            </p>
            <SpecList
              dark
              rows={[
                ["Montant emprunté", fmtPrice(r.emprunt)],
                ["Nombre de mensualités", String(r.mois)],
                ["Total des intérêts", fmtPrice(r.interets)],
                ["Total remboursé", fmtPrice(r.emprunt + r.interets)],
              ]}
            />
          </>
        ) : (
          <>
            {r.emprunt !== undefined && (
              <SpecList dark rows={[["Montant emprunté", fmtPrice(r.emprunt)]]} />
            )}
            <p className="sf-attente">{r.message}</p>
          </>
        )}
        <Link href="/contact" className="c-btn c-btn--solid">
          Faire étudier mon financement <span className="arrow" aria-hidden="true">→</span>
        </Link>
      </div>

      {pied && <div className="sf-pied">{pied}</div>}
    </div>
  );
}
