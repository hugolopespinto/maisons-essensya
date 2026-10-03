"use client";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { CommuneProposee } from "@/lib/communes";

/* ════════════════════════════════════════════════════════════════
   CHAMP « SECTEUR DU PROJET », AVEC AUTO-COMPLÉTION

   Il remplace un `<datalist>`, qui avait trois défauts :
     · il ne connaissait que les communes du flux d'annonces ;
     · Firefox n'y cherche que dans le nom — taper un code postal ne
       proposait rien ;
     · sa liste ne se met pas en forme, et tranchait en blanc système
       sur le formulaire sombre de l'accueil.

   ⚠ LA SAISIE RESTE LIBRE. Une proposition aide, elle n'oblige pas :
   une commune absente de l'index, un lieu-dit, « autour de Dax » —
   tout part tel quel. Sans JavaScript, c'est un champ texte ordinaire.

   Accessibilité : motif « combobox » de l'ARIA Authoring Practices.
   Le focus reste dans le champ ; les flèches déplacent la sélection,
   Entrée choisit, Échap referme.
   ════════════════════════════════════════════════════════════════ */

/** Le temps de finir un mot avant d'interroger le serveur. */
const DELAI_MS = 150;

/* Partagé entre les instances : les formulaires d'une même page
   tapent souvent les mêmes débuts de nom. */
const cache = new Map<string, CommuneProposee[]>();

interface Props {
  id: string;
  name?: string;
  placeholder?: string;
}

export default function ChampCommune({ id, name = "zone", placeholder }: Props) {
  const listeId = useId();
  const [valeur, setValeur] = useState("");
  const [propositions, setPropositions] = useState<CommuneProposee[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const minuterie = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /* Seule la réponse à la DERNIÈRE frappe compte : une requête lente
     partie avant ne doit pas écraser la liste d'une plus récente. */
  const derniere = useRef("");

  function afficher(liste: CommuneProposee[]) {
    setPropositions(liste);
    setActif(-1);
    setOuvert(liste.length > 0);
  }

  function chercher(saisie: string) {
    clearTimeout(minuterie.current);
    const q = saisie.trim();
    derniere.current = q;
    if (q.length < 2) return afficher([]);

    const connu = cache.get(q.toLowerCase());
    if (connu) return afficher(connu);

    minuterie.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/communes?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const liste: CommuneProposee[] = await res.json();
        cache.set(q.toLowerCase(), liste);
        if (derniere.current === q) afficher(liste);
      } catch {
        /* Hors ligne, serveur muet : le champ reste un champ texte. */
      }
    }, DELAI_MS);
  }

  function choisir(c: CommuneProposee) {
    clearTimeout(minuterie.current);
    /* Une requête encore en vol rouvrirait la liste à son retour. */
    derniere.current = "";
    /* Le code part avec le nom : il distingue les homonymes — il y a
       des dizaines de Saint-Martin — et c'est par lui que le CRM
       rattache la demande à une agence. */
    setValeur(`${c.nom} (${c.code})`);
    /* Vidée aussi, pas seulement refermée : revenir dans le champ ne
       doit pas rouvrir des propositions pour une commune déjà choisie. */
    afficher([]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const n = propositions.length;
      if (!n) return;
      e.preventDefault();
      const bas = e.key === "ArrowDown";
      if (!ouvert) {
        setOuvert(true);
        return setActif(bas ? 0 : n - 1);
      }
      /* -1 est la saisie elle-même : la liste boucle en repassant par
         elle, comme celle d'un moteur de recherche. */
      setActif((i) => {
        const suivant = i + (bas ? 1 : -1);
        if (suivant >= n) return -1;
        if (suivant < -1) return n - 1;
        return suivant;
      });
    } else if (e.key === "Enter" && ouvert && actif >= 0) {
      /* Sans cela, Entrée enverrait le formulaire avec la saisie
         partielle au lieu de la commune surlignée. */
      e.preventDefault();
      choisir(propositions[actif]);
    } else if (e.key === "Escape" && ouvert) {
      e.preventDefault();
      setOuvert(false);
      setActif(-1);
    }
  }

  return (
    <div className="c-combo">
      <input
        type="text"
        id={id}
        name={name}
        value={valeur}
        onChange={(e) => {
          setValeur(e.target.value);
          chercher(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => propositions.length > 0 && setOuvert(true)}
        onBlur={() => setOuvert(false)}
        placeholder={placeholder}
        /* Le remplissage automatique du navigateur ouvrirait sa propre
           liste par-dessus la nôtre. */
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={ouvert}
        aria-controls={listeId}
        aria-activedescendant={ouvert && actif >= 0 ? `${listeId}-${actif}` : undefined}
      />
      <ul id={listeId} role="listbox" className="c-combo__list" hidden={!ouvert}>
        {propositions.map((c, i) => (
          <li
            key={`${c.nom}-${c.code}`}
            id={`${listeId}-${i}`}
            role="option"
            aria-selected={i === actif}
            className="c-combo__option"
            /* `mousedown` et pas `click` : le clic arrive APRÈS le blur
               du champ, qui a déjà refermé la liste. Empêcher l'action
               par défaut garde aussi le focus dans le champ. */
            onMouseDown={(e) => {
              e.preventDefault();
              choisir(c);
            }}
            onMouseEnter={() => setActif(i)}
          >
            <span>{c.nom}</span>
            <span className="c-combo__code">{c.code}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
