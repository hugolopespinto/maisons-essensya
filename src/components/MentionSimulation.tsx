import Link from "next/link";
import { TAUX_DEFAUT, enSaisie } from "@/lib/simulation";

/* La mention du simulateur et le lien vers la FAQ, communs à la page et
   à la fenêtre des fiches annonce : une mention recopiée à la main est
   une mention qui finit par diverger. Le taux cité vient de la même
   constante que celui du champ. */
export default function MentionSimulation() {
  return (
    <>
      <p className="sf-mention">
        Simulation indicative et non contractuelle, à taux fixe, hors assurance
        emprunteur et frais de garantie. Le taux proposé par défaut (
        {enSaisie(TAUX_DEFAUT)} %) est un exemple, pas une offre : seule celle
        de votre banque fait foi. Maisons Essensya n&apos;est ni une banque ni un
        courtier.
      </p>
      <p className="sf-relais">
        <Link href="/concept#faq" className="c-link">
          Apport, prêt à taux zéro : nos réponses <span className="arrow" aria-hidden="true">→</span>
        </Link>
      </p>
    </>
  );
}
