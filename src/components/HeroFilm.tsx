"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

/* ════════════════════════════════════════════════════════════════
   FILM D'ARRIVÉE — un calque par-dessus le visuel, jamais à sa place

   ⚠ CE COMPOSANT EST STRICTEMENT ADDITIF, ET C'EST LA SEULE RAISON
   POUR LAQUELLE IL EST ACCEPTABLE ICI. `HeroAccueil` existe parce
   qu'un hero piloté au scroll avait été retiré sur ce retour client :
   « cela donne l'impression que le site ne fonctionne pas avec
   l'animation qui arrive tardivement ». Rien de ce qui suit ne doit
   ressusciter ce défaut. Les garde-fous, par ordre d'importance :

   1. LE HTML SERVI NE CHANGE PAS D'UN OCTET. Le rendu serveur et le
      premier rendu client valent tous deux `null` — c'est le rôle de
      `lireServeur()` ci-dessous. Le titre, les boutons et l'image AVIF
      en `fetchPriority="high"` sont peints et mesurés comme avant : le
      LCP est rigoureusement inchangé.
   2. RIEN N'EST TÉLÉCHARGÉ AVANT LA DÉCISION. L'élément <video> n'est
      monté qu'une fois les tests passés ; un visiteur qui les échoue
      ne paie pas le fichier.
   3. LE FILM NE BOUCLE JAMAIS. Une animation de chantier va du terrain
      nu à la maison finie : la reboucler ferait disparaître la maison
      toutes les huit secondes, ce qui est exactement l'inverse de ce
      qu'un constructeur veut montrer.

   ⚠ PLACEHOLDER — CE N'EST PAS LE FILM DÉFINITIF. Le fichier monté
   aujourd'hui est la référence de 10 s fournie par le client (720p,
   24 i/s, 5 Mo) : la maison qu'on y voit n'est PAS une Essensya et sa
   dernière image ne correspond pas au visuel hero. D'où le fondu de
   sortie, qui masque ce raccord. Sur le film définitif, la dernière
   image DOIT être le visuel hero — le fondu devient alors invisible et
   l'effet se referme proprement sur la maison.
   ════════════════════════════════════════════════════════════════ */

/** On saute la parcelle vide : elle ne raconte rien, et c'est le pire
    premier écran possible pour un constructeur de maisons. */
const DEBUT = 2;
/** Fin de lecture. 2 → 10 s, les 8 secondes convenues avec le client. */
const FIN = 10;
/** Une fois par session : au deuxième passage, le visiteur vient pour
    le site, pas pour le générique. */
const CLE = "essensya:film-chantier";
/** Sous cette largeur, le cadrage 16/9 ne donne plus rien et la data
    mobile n'a pas à payer 5 Mo pour un effet décoratif. */
const LARGEUR_MINI = 768;

/* ── La décision de jouer, prise une fois pour toutes ──────────────
   Elle est verrouillée dans ce cache de module parce que
   `useSyncExternalStore` exige un instantané stable : si la valeur
   changeait d'un rendu à l'autre, React démonterait la vidéo en pleine
   lecture. Et elle passe par ce mécanisme plutôt que par un effet
   parce qu'il s'agit précisément de lire un système extérieur à React
   — préférences système, dimensions, mode économie de données. */
let decision: boolean | null = null;

function calculer(): boolean {
  /* `matchMedia` et `sessionStorage` peuvent lever : navigation privée,
     stockage bloqué, iframe cloisonnée. Dans le doute on ne joue pas —
     un accueil sans film reste un accueil correct, l'inverse est faux. */
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (window.innerWidth < LARGEUR_MINI) return false;
    const co = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (co?.saveData) return false;
    if (sessionStorage.getItem(CLE)) return false;
  } catch {
    return false;
  }
  return true;
}

/** Rien à surveiller : la décision est figée au montage. */
const sAbonner = () => () => {};
const lire = () => (decision ??= calculer());
/** Côté serveur, toujours `false` : c'est ce qui garantit que le HTML
    envoyé est identique à celui d'avant ce composant. */
const lireServeur = () => false;

export default function HeroFilm({ src }: { src: string }) {
  const actif = useSyncExternalStore(sAbonner, lire, lireServeur);
  /* `play()` n'est appelé qu'après le saut à DEBUT ; ce drapeau interdit
     qu'un saut ultérieur relance le film. */
  const lance = useRef(false);
  const [visible, setVisible] = useState(false);
  const [fini, setFini] = useState(false);

  /* Le calque s'efface, puis se démonte : plus aucun décodeur vidéo
     actif derrière le reste de la page. */
  const terminer = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => setFini(true), 700);
  }, []);

  if (!actif || fini) return null;

  return (
    <div className={`hero-fixe__film${visible ? " is-visible" : ""}`} aria-hidden="true">
      <video
        src={src}
        muted
        playsInline
        preload="auto"
        /* Pas de `poster` : le visuel hero est déjà peint juste dessous,
           un poster serait un second téléchargement pour rien. */
        onLoadedMetadata={(e) => {
          e.currentTarget.currentTime = DEBUT;
        }}
        /* On ne lance qu'une fois le curseur réellement posé sur DEBUT :
           la première image vue est la dalle, jamais le terrain nu. */
        onSeeked={(e) => {
          if (lance.current) return;
          lance.current = true;
          e.currentTarget.play().catch(() => setFini(true));
        }}
        /* Le fondu d'entrée n'est levé que par `playing` : tant que la
           lecture n'avance pas, l'écran reste sur l'image. C'est ce qui
           évite le rectangle noir pendant la mise en tampon. */
        onPlaying={() => {
          setVisible(true);
          /* Marqué vu seulement s'il a vraiment tourné — un film avorté
             ne doit pas priver le visiteur de l'effet au rechargement. */
          try {
            sessionStorage.setItem(CLE, "1");
          } catch {
            /* stockage indisponible : le film rejouera, ce n'est pas grave */
          }
        }}
        onTimeUpdate={(e) => {
          if (e.currentTarget.currentTime >= FIN) terminer();
        }}
        onEnded={terminer}
        /* Lecture refusée, fichier absent, codec non lu : on disparaît
           sans bruit plutôt que de laisser un rectangle noir. */
        onError={() => setFini(true)}
      />
    </div>
  );
}
