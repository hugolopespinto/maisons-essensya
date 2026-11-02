import Link from "next/link";
import { TAUX_DEFAUT, enSaisie } from "@/lib/simulation";

/* La mention du simulateur et le lien vers la FAQ, communs à la page et
   à la fenêtre des fiches annonce : une mention recopiée à la main est
   une mention qui finit par diverger. Le taux cité vient de la même
   constante que celui du champ. */
export default function MentionSimulation() {
  return (
    <>
      {/* La première phrase est celle du client (retour du 28/10). */}
      <p className="sf-mention">
        Cette simulation est indicative et ne tient pas compte des prêts
        bonifiés dont vous pourriez profiter, comme le prêt à taux zéro, un
        prêt Action Logement ou des prêts complémentaires, qui feraient
        baisser le montant des mensualités. Non contractuelle, elle est
        calculée à taux fixe, hors assurance emprunteur et frais de garantie.
        Le taux proposé par défaut ({enSaisie(TAUX_DEFAUT)} %) est un
        exemple, pas une offre : seule celle de votre banque fait foi.
        Maisons Essensya n&apos;est ni une banque ni un courtier.
      </p>
      <p className="sf-relais">
        <Link href="/concept#faq" className="c-link">
          Apport, prêt à taux zéro : nos réponses <span className="arrow" aria-hidden="true">→</span>
        </Link>
      </p>
    </>
  );
}
