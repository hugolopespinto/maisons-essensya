import { HOUSE } from "@/data/essensya";

/* Ce que le prix comprend, en planche de cases numérotées — styles
   `.g-inclus` dans gamme.css. Partagée par /maisons et la fiche d'un
   modèle, qui la montraient chacune en deux colonnes « compris » /
   « non compris ». La seconde est partie à la demande du client : le
   périmètre du prix reste dit par `REEL.mentionPrix` (« hors terrain,
   hors adaptation ») à côté de chaque montant, et le dossier le détaille. */
export default function PrixCompris() {
  return (
    <ul className="g-inclus">
      {HOUSE.included.map((x, i) => (
        <li className="g-inclus__item" key={x}>
          <span className="g-inclus__num" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="g-inclus__txt">{x}</span>
        </li>
      ))}
    </ul>
  );
}
