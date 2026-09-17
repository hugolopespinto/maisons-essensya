"use client";
import { useId, useState } from "react";

/* ════════════════════════════════════════════════════════════════
   UN CHAMP DE RÉFÉRENCEMENT ET SON COMPTEUR DE SIGNES

   ⚠ POURQUOI UN COMPOSANT CLIENT, ALORS QUE LE BACK-OFFICE EST RENDU
   PAR LE SERVEUR D'UN BOUT À L'AUTRE.

   Le compteur était un `<script>` inline, avec ce raisonnement en
   commentaire : « l'écran n'a besoin d'aucun état React, et le
   back-office reste entièrement rendu par le serveur ». L'intention
   était juste ; la prémisse, non — et elle produisait deux défauts que
   le navigateur a remontés.

   1. ERREUR D'HYDRATATION. Le serveur rendait `<small/>` VIDE, le script
      la remplissait avant que React n'arrive, et React trouvait un texte
      et une couleur qu'il n'avait pas rendus. Verdict de React :
      « Hydration failed […] this tree will be regenerated on the
      client » — l'écran entier était jeté puis reconstruit, à chaque
      visite.

   2. COMPTEURS MORTS À LA NAVIGATION. Un `<script>` écrit dans un
      composant React ne s'exécute QUE sur le HTML initial. Julien qui
      arrive sur Référencement depuis le menu du back-office — c'est-à-dire
      par une navigation côté client — n'avait aucun compteur, et taper
      ne changeait rien.

   L'état vit donc ici, dans le seul composant qui en a besoin. Le compte
   initial se calcule à partir des mêmes props des deux côtés : le
   serveur et le client rendent le même texte, il n'y a plus rien à
   réconcilier.

   ⚠ LE PLACEHOLDER EST COMPTÉ QUAND LE CHAMP EST VIDE, et c'est
   volontaire : un champ laissé vide part en ligne avec la valeur du
   code, rappelée en gris. C'est bien SA longueur qui compte alors, et
   le libellé le dit — sans quoi le client lirait « 0 / 60 » sous un
   titre qui en fait 52.
   ════════════════════════════════════════════════════════════════ */

export default function ChampCompte({
  nom,
  label,
  valeur,
  placeholder,
  max,
  multiligne = false,
  lignes = 3,
}: {
  nom: string;
  label: string;
  valeur: string;
  placeholder: string;
  max: number;
  multiligne?: boolean;
  lignes?: number;
}) {
  const id = useId();
  const idAide = `${id}-c`;
  const [texte, setTexte] = useState(valeur);

  /* Champ vide : c'est le défaut du code qui partira, donc lui qu'on
     mesure. `placeholder` peut être une invite (« Aucun titre par
     défaut ») quand il n'y a pas de défaut — on ne la compte pas. */
  const surDefaut = texte.length === 0 && placeholder.length > 0;
  const compte = (texte || (surDefaut ? placeholder : "")).length;
  const trop = compte > max;

  const commun = {
    id,
    name: nom,
    value: texte,
    placeholder,
    "aria-describedby": idAide,
    onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setTexte(ev.target.value),
  };

  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      {multiligne ? (
        <textarea rows={lignes} {...commun} />
      ) : (
        <input type="text" autoComplete="off" {...commun} />
      )}
      <small
        id={idAide}
        className="adm-field__aide"
        style={{ color: trop ? "var(--bois-fonce)" : "var(--pierre)" }}
      >
        {compte} / {max} signes{surDefaut ? " (défaut)" : ""}
        {trop ? " — au-delà du seuil conseillé" : ""}
      </small>
    </div>
  );
}
