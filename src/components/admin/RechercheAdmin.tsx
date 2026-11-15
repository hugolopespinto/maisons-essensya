"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { EntreeRecherche } from "@/lib/admin/recherche";

/* ════ LA RECHERCHE DU BACK-OFFICE ════
   « simulateur » → le champ du taux, dans Réglages. L'index arrive tout
   fait du serveur (src/lib/admin/recherche.ts) ; ici on ne fait que
   filtrer, au fil de la frappe.

   Recherche insensible aux accents et à la casse, mot par mot : tous les
   mots tapés doivent se retrouver dans l'entrée, peu importe l'ordre.

   ⚠ NAVIGATION PAR `location.assign`, pas par le routeur de Next. Les
   résultats mènent souvent à un champ précis (`#tauxSimulateur`) : la
   page doit défiler jusqu'à lui et le surligner (`:target`, admin.css).
   Le routeur change l'URL par `pushState`, que `:target` ignore — le
   champ ne serait pas mis en évidence. Un chargement complet d'un écran
   d'administration ne coûte rien de perceptible. */

const MAX = 8;

const normaliser = (s: string) =>
  s.normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase();

interface Indexee extends EntreeRecherche {
  _titre: string;
  _tout: string;
}

export default function RechercheAdmin({ entrees }: { entrees: EntreeRecherche[] }) {
  const [q, setQ] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const champ = useRef<HTMLInputElement>(null);
  const id = useId();
  const idListe = `${id}-liste`;

  const index = useMemo<Indexee[]>(
    () =>
      entrees.map((e) => ({
        ...e,
        _titre: normaliser(e.titre),
        _tout: normaliser(`${e.titre} ${e.ecran} ${e.mots} ${e.detail}`),
      })),
    [entrees],
  );

  const resultats = useMemo(() => {
    const mots = normaliser(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (mots.length === 0) return [];
    return index
      .filter((e) => mots.every((m) => e._tout.includes(m)))
      .map((e) => ({
        e,
        score: mots.reduce(
          (s, m) => s + (e._titre.startsWith(m) ? 4 : e._titre.includes(m) ? 3 : 1),
          0,
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX)
      .map((r) => r.e);
  }, [q, index]);

  /* Ctrl+K (⌘K sur Mac) : le raccourci que proposent la plupart des outils. */
  useEffect(() => {
    const raccourci = (ev: KeyboardEvent) => {
      if (ev.key.toLowerCase() === "k" && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        champ.current?.focus();
        champ.current?.select();
      }
    };
    window.addEventListener("keydown", raccourci);
    return () => window.removeEventListener("keydown", raccourci);
  }, []);

  const aller = (e: EntreeRecherche) => {
    setOuvert(false);
    window.location.assign(e.href);
  };

  const visible = ouvert && q.trim().length > 0;

  return (
    <div className="adm-recherche" role="search">
      <label htmlFor={id} className="u-sr-only">
        Rechercher dans le back-office
      </label>
      <input
        ref={champ}
        id={id}
        type="search"
        role="combobox"
        aria-expanded={visible}
        aria-controls={idListe}
        aria-autocomplete="list"
        aria-activedescendant={visible && resultats[actif] ? `${id}-${actif}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder="Rechercher : simulateur, logo, téléphone…"
        value={q}
        onChange={(ev) => {
          setQ(ev.target.value);
          setActif(0);
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        onBlur={() => setOuvert(false)}
        onKeyDown={(ev) => {
          if (ev.key === "ArrowDown" && resultats.length) {
            ev.preventDefault();
            setOuvert(true);
            setActif((i) => (i + 1) % resultats.length);
          } else if (ev.key === "ArrowUp" && resultats.length) {
            ev.preventDefault();
            setActif((i) => (i - 1 + resultats.length) % resultats.length);
          } else if (ev.key === "Enter" && visible && resultats[actif]) {
            ev.preventDefault();
            aller(resultats[actif]);
          } else if (ev.key === "Escape") {
            if (q) setQ("");
            else champ.current?.blur();
          }
        }}
      />
      <kbd className="adm-recherche__kbd" aria-hidden="true">
        Ctrl K
      </kbd>

      {visible && (
        <div className="adm-recherche__panneau">
          {resultats.length === 0 ? (
            <p className="adm-recherche__vide">
              Aucun résultat pour « {q.trim()} ». Essayez un mot plus simple :
              « prix », « menu », « photo », « agence »…
            </p>
          ) : (
            <ul id={idListe} role="listbox" aria-label="Résultats">
              {resultats.map((e, i) => (
                <li
                  key={`${e.href}-${e.titre}`}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={i === actif}
                  className="adm-recherche__option"
                  /* `mousedown` et non `click` : le clic ferait d'abord perdre
                     le focus au champ, qui refermerait la liste avant que le
                     choix ne soit enregistré. */
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    aller(e);
                  }}
                  onMouseEnter={() => setActif(i)}
                >
                  <span className="adm-recherche__ecran">{e.ecran}</span>
                  <span className="adm-recherche__titre">{e.titre}</span>
                  {e.detail && <span className="adm-recherche__detail">{e.detail}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
