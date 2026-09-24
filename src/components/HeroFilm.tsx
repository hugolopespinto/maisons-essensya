"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

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
   3. HORS DE L'ÉCRAN, LE FILM EST EN PAUSE. Il tourne en boucle, donc
      sans cette règle il décoderait sans fin derrière le reste de la
      page, pour personne.

   ⚠ LE FILM BOUCLE, SUR DEMANDE EXPRESSE. La première version jouait
   une seule fois par session puis s'effaçait sur le visuel : refusée
   (« ça se joue qu'une fois, c'est pas bon »). La boucle a un coût
   connu et accepté : à chaque tour, la maison finie laisse place à la
   dalle, sans transition.

   ⚠ PLACEHOLDER — CE N'EST PAS LE FILM DÉFINITIF. Le fichier monté
   aujourd'hui est la référence de 10 s fournie par le client (720p,
   24 i/s, 5 Mo) : la maison qu'on y voit n'est PAS une Essensya. Le
   film définitif doit faire 1920 de large et tenir sous 2 Mo — il sera
   rejoué en boucle, chaque octet compte à chaque visite.
   ════════════════════════════════════════════════════════════════ */

/** On saute la parcelle vide : elle ne raconte rien, et c'est le pire
    premier écran possible pour un constructeur de maisons. C'est aussi
    le point de retour de chaque boucle — `loop` natif repartirait de 0. */
const DEBUT = 2;
/** Fin de chaque tour. 2 → 10 s, les 8 secondes convenues avec le client. */
const FIN = 10;
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
  /* ⚠ NE JAMAIS SE RETIRER EN SILENCE. Ce composant rend `null` quand il
     renonce, et il ne laisse alors AUCUNE trace à l'écran : pas de
     rectangle, pas d'erreur, rien. La première revue de cette page a
     conclu à une panne du site pour cette seule raison. En
     développement, on dit donc pourquoi. */
  const refus = (motif: string) => {
    if (process.env.NODE_ENV === "development") {
      console.info(`[HeroFilm] film non joué — ${motif}`);
    }
    return false;
  };

  /* `matchMedia` peut lever dans une iframe cloisonnée. Dans le doute on
     ne joue pas — un accueil sans film reste un accueil correct,
     l'inverse est faux. */
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return refus("le système demande moins d'animations");
    if (window.innerWidth < LARGEUR_MINI)
      return refus(`fenêtre de ${window.innerWidth} px, minimum ${LARGEUR_MINI}`);
    const co = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (co?.saveData) return refus("mode économie de données");
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

/** Une lecture interrompue par une pause (sortie d'écran) rejette avec
    `AbortError` : ce n'est pas une panne, le film reprendra au retour. */
const estInterruption = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

export default function HeroFilm({ src }: { src: string }) {
  const actif = useSyncExternalStore(sAbonner, lire, lireServeur);
  const video = useRef<HTMLVideoElement>(null);
  /* `play()` n'est appelé qu'après le premier saut à DEBUT ; ce drapeau
     interdit que les sauts de boucle relancent une seconde lecture. */
  const lance = useRef(false);
  const [visible, setVisible] = useState(false);
  const [fini, setFini] = useState(false);

  /* Retour au début d'un tour. Le saut redéclenche `seeked`, mais
     `lance` est déjà levé : la lecture continue d'elle-même. */
  const reboucler = (v: HTMLVideoElement) => {
    v.currentTime = DEBUT;
    if (v.paused && lance.current) v.play().catch(() => {});
  };

  /* ⚠ FILET DE SÉCURITÉ, ET IL COUVRE UN DÉFAUT RÉEL. La chaîne
     métadonnées → saut → lecture peut s'arrêter sans rien émettre : si
     `seekable` est vide au moment du saut, la spécification HTML abandonne
     l'opération SANS déclencher `seeked`, donc `play()` n'est jamais
     appelé. Il resterait alors une <video> invisible en train de tirer
     5 Mo pour personne. Au bout de quatre secondes sans image, on se
     retire. */
  useEffect(() => {
    if (!actif || visible || fini) return;
    const t = window.setTimeout(() => {
      if (process.env.NODE_ENV === "development") {
        console.info("[HeroFilm] film abandonné — rien ne s'est affiché en 4 s");
      }
      setFini(true);
    }, 4000);
    return () => window.clearTimeout(t);
  }, [actif, visible, fini]);

  /* Garde-fou n°3 : pause dès que le hero quitte l'écran, reprise au
     retour. Avant le premier `play()`, on ne touche à rien — c'est
     `onSeeked` qui lance. */
  useEffect(() => {
    const v = video.current;
    if (!actif || fini || !v) return;
    const io = new IntersectionObserver(([e]) => {
      if (!lance.current) return;
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, [actif, fini]);

  if (!actif || fini) return null;

  return (
    <div className={`hero-fixe__film${visible ? " is-visible" : ""}`} aria-hidden="true">
      <video
        ref={video}
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
          e.currentTarget.play().catch((err) => {
            if (!estInterruption(err)) setFini(true);
          });
        }}
        /* Le fondu d'entrée n'est levé que par `playing` : tant que la
           lecture n'avance pas, l'écran reste sur l'image. C'est ce qui
           évite le rectangle noir pendant la mise en tampon. */
        onPlaying={() => setVisible(true)}
        onTimeUpdate={(e) => {
          if (e.currentTarget.currentTime >= FIN) reboucler(e.currentTarget);
        }}
        /* Le fichier peut s'achever avant qu'un `timeupdate` ne passe FIN. */
        onEnded={(e) => reboucler(e.currentTarget)}
        /* Lecture refusée, fichier absent, codec non lu : on disparaît
           sans bruit plutôt que de laisser un rectangle noir. */
        onError={() => setFini(true)}
      />
    </div>
  );
}
