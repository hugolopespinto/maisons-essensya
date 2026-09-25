"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { LARGEUR_MINI_FILM, type FilmAccueil } from "@/data/film-accueil";
import {
  FRAG_FILM,
  FRAG_INTRO,
  GRAINES,
  TEINTES,
  creerProgramme,
  creerTexture,
  dimensionner,
  graines,
  televerser,
} from "@/lib/encre";

/* ════════════════════════════════════════════════════════════════
   FILM D'ARRIVÉE — le film du chantier, à l'encre, avec son relief

   Deux arrivées possibles, décidées avant le premier affichage par le
   script du <head> (voir IntroAccueil) :

   · AVEC ÉCRAN DE CHARGEMENT — la première arrivée de la visite. Le
     compteur suit le téléchargement du film ; à 100 %, l'écran se
     dissout en tache d'encre, le film apparaît, l'en-tête et le titre
     montent. C'est l'option B de la démo, retenue par le client.
   · SANS ATTENTE — tous les retours suivants. Le texte est là dès la
     première image ; le film se pose sur la photo en tache d'encre dès
     qu'il est prêt (l'option A de la démo).

   Puis, dans les deux cas : le film boucle de `debut` à `fin`, chaque
   tour est enchaîné par une tache d'encre au lieu d'une coupe franche,
   et l'image suit la souris en relief grâce à la planche de profondeur.

   ⚠ LA PHOTO RESTE DESSOUS ET RESTE LE LCP. Ce composant ne remplace
   rien : il peint un calque TRANSPARENT tant que le film n'est pas là.
   Si WebGL manque, on retombe sur l'ancien fondu vidéo ; si le film
   échoue, il reste la photo. Un accueil sans film est un accueil
   correct, l'inverse est faux.

   ⚠ LE FILM EST TÉLÉCHARGÉ EN ENTIER AVANT D'ÊTRE LU. C'est ce qui
   donne un vrai pourcentage à l'écran de chargement, et ce qui règle
   un défaut réel de la version précédente : lue en flux, la vidéo
   pouvait refuser le saut à `debut` (`seekable` vide) SANS émettre
   `seeked`, et rester invisible en tirant 5 Mo pour personne.

   ⚠ HORS DE L'ÉCRAN, TOUT S'ARRÊTE : la vidéo est mise en pause et la
   boucle d'affichage suspendue.
   ════════════════════════════════════════════════════════════════ */

declare global {
  interface Window {
    /** Posé par le script du <head> quand l'écran de chargement doit passer. */
    __introAccueil?: { t0: number; pilote: boolean; fini: boolean };
  }
}

/* ── La décision de jouer, prise une fois pour toutes ──────────────
   Verrouillée dans ce cache de module parce que `useSyncExternalStore`
   exige un instantané stable. Mêmes critères que le script du <head>,
   qui doit décider pareil sans pouvoir importer ce fichier. */
let decision: boolean | null = null;

const journal = (motif: string) => {
  /* ⚠ NE JAMAIS SE RETIRER EN SILENCE. Sans film, ce composant ne laisse
     aucune trace à l'écran ; une revue précédente a conclu à une panne
     pour cette seule raison. En développement, on dit donc pourquoi. */
  if (process.env.NODE_ENV === "development") console.info(`[HeroFilm] ${motif}`);
};

function calculer(): boolean {
  /* `matchMedia` peut lever dans une iframe cloisonnée : dans le doute,
     on ne joue pas. */
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      journal("film non joué — le système demande moins d'animations");
      return false;
    }
    if (window.innerWidth < LARGEUR_MINI_FILM) {
      journal(`film non joué — fenêtre de ${window.innerWidth} px, minimum ${LARGEUR_MINI_FILM}`);
      return false;
    }
    const co = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (co?.saveData) {
      journal("film non joué — mode économie de données");
      return false;
    }
  } catch {
    return false;
  }
  return true;
}

const sAbonner = () => () => {};
const lire = () => (decision ??= calculer());
/** Côté serveur, toujours `false` : le HTML servi ne contient pas ce calque. */
const lireServeur = () => false;

/* ── Le téléchargement, mis en cache pour la durée de la page ──────
   Revenir sur l'accueil par un lien interne ne retélécharge rien. */
const films = new Map<string, Promise<string>>();

function telecharger(url: string, progres: (fraction: number | null) => void): Promise<string> {
  const connu = films.get(url);
  if (connu) {
    progres(1);
    return connu;
  }
  const promesse = (async () => {
    /* Même mode et mêmes identifiants que le <link rel=preload> posé par
       le script du <head> : c'est ce qui permet de réutiliser sa réponse. */
    const r = await fetch(url, { mode: "cors", credentials: "same-origin" });
    if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
    const total = Number(r.headers.get("content-length")) || 0;
    const lecteur = r.body.getReader();
    const morceaux: Uint8Array[] = [];
    let recu = 0;
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      morceaux.push(value);
      recu += value.length;
      progres(total ? recu / total : null);
    }
    const blob = new Blob(morceaux as BlobPart[], { type: r.headers.get("content-type") || "video/mp4" });
    return URL.createObjectURL(blob);
  })();
  films.set(url, promesse);
  promesse.catch(() => films.delete(url));
  return promesse;
}

/* ── Le calendrier ──────────────────────────────────────────────── */
type Pas = {
  a: number;
  d: number;
  e: (p: number) => number;
  f: (p: number) => void;
  fin?: () => void;
  fait?: boolean;
};

const E = {
  lin: (p: number) => p,
  sortie: (p: number) => 1 - Math.pow(1 - p, 3),
  entreeSortie: (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
};

/** L'écran de chargement, en secondes depuis la lecture du HTML. */
const CHARGEMENT = {
  /** Même instantané, le compteur prend ce temps pour monter : sans ce
      plancher, un film en cache ferait clignoter l'écran. */
  min: 1.6,
  /** Au-delà, on n'attend plus le film : la page s'ouvre sur la photo. */
  max: 8,
};
/** La sortie de l'écran, en secondes depuis la fin du chargement. Mêmes
    valeurs que la démo montrée au client. */
const SORTIE = {
  centre: 0.45,
  dissolDebut: 0.05,
  dissolDuree: 1.5,
  filmDebut: 0.25,
  filmDuree: 1.9,
  zoomDuree: 3,
  enteteDebut: 0.6,
  enteteDuree: 0.7,
  accrocheDebut: 0.65,
  titreDebut: 0.75,
  motEcart: 0.04,
  motDuree: 0.85,
  actionsDebut: 1.3,
  actionsDuree: 0.8,
};
/** L'arrivée sans attente. */
const ARRIVEE = { zoomDuree: 2.6, encreDebut: 0.15, encreDuree: 1.9 };
/** Durée de la tache d'encre entre deux tours de boucle. */
const BOUCLE = 1.4;
/** Le film avance de 2,5 % au survol des boutons, comme chez Makhno. */
const ZOOM_SURVOL = 1.025;
/** Marge permanente, pour que le relief n'aille jamais chercher hors de l'image. */
const MARGE_ZOOM = 1.04;

const estInterruption = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

function poser(el: HTMLElement | null | undefined, decalage: number, opacite: number) {
  if (!el) return;
  el.style.transform = `translateY(${decalage}px)`;
  el.style.opacity = String(opacite);
}

/* ════════════════════════════════════════════════════════════════
   LE MOTEUR — impératif, monté une fois, démonté proprement.
   Renvoie sa fonction de nettoyage.
   ════════════════════════════════════════════════════════════════ */
function demarrer(conteneur: HTMLDivElement, toile: HTMLCanvasElement, film: FilmAccueil): () => void {
  const racine = document.documentElement;
  const hero = conteneur.closest<HTMLElement>(".hero-fixe");
  const introEl = document.getElementById("intro-accueil");
  const drapeau = window.__introAccueil;
  const avecIntro = !!(introEl && drapeau && !drapeau.fini && racine.hasAttribute("data-intro-accueil"));
  if (avecIntro && drapeau) drapeau.pilote = true;

  const glf = creerProgramme(toile, FRAG_FILM);
  const toileIntro = introEl?.querySelector("canvas") ?? null;
  const gli = avecIntro && toileIntro ? creerProgramme(toileIntro, FRAG_INTRO) : null;
  if (!glf) journal("WebGL indisponible — repli sur le fondu vidéo");

  /* La vidéo n'est qu'une source de texture : détachée du document, elle
     n'a ni boîte ni calque. Sans WebGL, elle redevient visible et reprend
     l'ancien fondu (voir `.hero-fixe__film video` dans accueil.css). */
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  if (!glf) conteneur.appendChild(video);

  const texVid = glf ? creerTexture(glf.gl, 0) : null;
  const texPrec = glf ? creerTexture(glf.gl, 1) : null;
  const texProf = glf ? creerTexture(glf.gl, 2) : null;

  /* Ce qu'on anime autour du film : l'en-tête vit dans le layout, le
     texte dans HeroAccueil. On les retrouve par le DOM plutôt que par des
     props : ce sont des composants serveur, sans état à partager. */
  const entete = document.querySelector<HTMLElement>(".site-header");
  const accroche = hero?.querySelector<HTMLElement>(".hero-fixe__texte .c-label");
  const titre = hero?.querySelector<HTMLElement>("h1");
  const mots = titre ? Array.from(titre.querySelectorAll<HTMLElement>(".mot > span")) : [];
  const actions = hero?.querySelector<HTMLElement>(".hero-fixe__actions");
  const boutons = actions ? Array.from(actions.querySelectorAll<HTMLElement>(".c-btn")) : [];
  const centre = introEl?.querySelector<HTMLElement>(".intro-accueil__centre");
  const pct = introEl?.querySelector<HTMLElement>(".intro-accueil__pct");
  const passer = introEl?.querySelector<HTMLButtonElement>(".intro-accueil__passer");

  const s = {
    reveal: 0,
    fondAlpha: 0,
    revealIntro: 0,
    zoomIntro: 1,
    zoomSurvol: 1,
    zoomCible: 1,
    boucle: 1,
    boucleEnAttente: false,
    boucleT0: 0,
    attenteT0: 0,
    sel: Math.random() * 20,
    selB: 0,
    souris: { x: 0, y: 0 },
    cible: { x: 0, y: 0 },
  };
  let vivant = true;
  let phase: "chargement" | "sortie" | "libre" = avecIntro ? "chargement" : "libre";
  let arrivee: "attente" | "faite" = "attente";
  let progres: number | null = 0;
  let filmPret = false;
  let filmEchec = false;
  let profPret = !glf;
  let premierSaut = true;
  let aTeleverser = true;
  let affiche = 0;

  /* ── Calendrier : des pas datés depuis le montage ── */
  const t0 = performance.now();
  let pas: Pas[] = [];
  const ajouter = (liste: Pas[]) => {
    const maintenant = (performance.now() - t0) / 1000;
    for (const p of liste) pas.push({ ...p, a: p.a + maintenant });
  };
  const toutFinir = () => {
    /* Copie : un `fin` peut en ajouter d'autres. */
    for (const p of [...pas]) {
      if (p.fait) continue;
      p.fait = true;
      p.f(1);
      p.fin?.();
    }
  };

  /* ── L'arrivée sans attente : le film se pose sur la photo ── */
  function arriveeLibre() {
    if (arrivee === "faite") return;
    arrivee = "faite";
    s.fondAlpha = 0;
    s.reveal = 0;
    s.zoomIntro = 1.07;
    ajouter([
      { a: 0, d: ARRIVEE.zoomDuree, e: E.sortie, f: (p) => (s.zoomIntro = 1.07 - 0.07 * p) },
      { a: ARRIVEE.encreDebut, d: ARRIVEE.encreDuree, e: E.entreeSortie, f: (p) => (s.reveal = p) },
    ]);
    if (!glf) video.classList.add("is-visible");
  }

  /* ── La fin de l'écran de chargement ── */
  function terminerIntro() {
    if (phase === "libre") return;
    phase = "libre";
    if (drapeau) drapeau.fini = true;
    /* Le drapeau d'abord, les styles en ligne ensuite, dans la même tâche :
       aucune image n'est peinte entre les deux, donc aucun clignotement. */
    racine.removeAttribute("data-intro-accueil");
    for (const el of [entete, accroche, actions, centre, introEl, ...mots]) {
      if (!el) continue;
      el.style.removeProperty("opacity");
      el.style.removeProperty("transform");
      el.style.removeProperty("visibility");
    }
    introEl?.classList.remove("gl-prend");
    document.removeEventListener("keydown", surTouche);
    if (filmPret && !filmEchec) arriveeLibre();
  }

  function sortieIntro() {
    if (phase !== "chargement") return;
    phase = "sortie";
    const avecFilm = filmPret && profPret && !filmEchec;
    if (!avecFilm) journal("film pas prêt à temps — l'accueil s'ouvre sur la photo");
    const S = SORTIE;
    const liste: Pas[] = [
      { a: 0, d: S.centre, e: E.sortie, f: (p) => centre && (centre.style.opacity = String(1 - p)) },
      {
        a: S.dissolDebut,
        d: S.dissolDuree,
        e: E.entreeSortie,
        f: (p) => {
          if (gli) {
            s.revealIntro = p;
            introEl?.classList.add("gl-prend");
          } else if (introEl) introEl.style.opacity = String(1 - p);
        },
        fin: () => introEl && (introEl.style.visibility = "hidden"),
      },
      { a: S.enteteDebut, d: S.enteteDuree, e: E.sortie, f: (p) => entete && (entete.style.opacity = String(p)) },
      { a: S.accrocheDebut, d: 0.8, e: E.sortie, f: (p) => poser(accroche, (1 - p) * 14, p) },
      { a: S.actionsDebut, d: S.actionsDuree, e: E.sortie, f: (p) => poser(actions, (1 - p) * 18, p) },
      ...mots.map<Pas>((m, i) => ({
        a: S.titreDebut + i * S.motEcart,
        d: S.motDuree,
        e: E.sortie,
        f: (p) => (m.style.transform = `translateY(${(1 - p) * 110}%)`),
      })),
    ];
    /* Le nettoyage attend que l'écran soit parti et le texte monté — le
       titre est saisi au back-office, son nombre de mots varie. */
    const fin = Math.max(...liste.map((p) => p.a + p.d));
    liste.push({ a: fin, d: 0.001, e: E.lin, f: () => {}, fin: terminerIntro });
    if (avecFilm) {
      /* Comme sur la démo : l'écran s'ouvre sur un aplat anthracite, et le
         film y arrive à l'encre, en reculant légèrement. */
      arrivee = "faite";
      s.fondAlpha = 1;
      s.reveal = 0;
      s.zoomIntro = 1.12;
      liste.push(
        { a: S.filmDebut, d: S.filmDuree, e: E.entreeSortie, f: (p) => (s.reveal = p) },
        { a: S.dissolDebut, d: S.zoomDuree, e: E.sortie, f: (p) => (s.zoomIntro = 1.12 - 0.12 * p) },
      );
    }
    ajouter(liste);
  }

  function passerIntro() {
    if (phase === "libre") return;
    sortieIntro();
    toutFinir();
  }
  function surTouche(e: KeyboardEvent) {
    /* Tab aussi : un visiteur au clavier veut atteindre la page, pas
       parcourir des liens masqués sous l'écran. */
    if (e.key === "Escape" || e.key === "Tab") passerIntro();
  }

  /* Pendant le chargement : le compteur ne dépasse jamais ni le vrai
     téléchargement, ni le plancher de temps. Sans taille connue, il
     avance seul en ralentissant, sans jamais atteindre 100 % tant que
     le film n'est pas là. */
  function majChargement(now: number, dt: number) {
    const t = (now - (drapeau?.t0 ?? t0)) / 1000;
    const plafond = E.sortie(Math.min(1, t / CHARGEMENT.min));
    const reel =
      filmEchec || (filmPret && profPret)
        ? 1
        : progres !== null
          ? 0.95 * progres
          : Math.min(0.9, 1 - Math.exp(-t / 2.5));
    const cible = Math.min(plafond, reel);
    affiche += (cible - affiche) * (1 - Math.pow(0.8, dt * 60));
    if (cible >= 1 && affiche > 0.995) affiche = 1;
    if (pct) pct.textContent = `${Math.floor(affiche * 100)} %`;
    if (affiche >= 1 || t >= CHARGEMENT.max) sortieIntro();
  }

  /* ── Le film ── */
  function surFilmPret() {
    if (filmPret) return;
    filmPret = true;
    if (phase === "libre") arriveeLibre();
    /* En chargement : le compteur s'en charge. En sortie sans film : il
       arrivera à l'encre une fois l'écran parti (`terminerIntro`). */
  }
  function abandonFilm(motif: string) {
    if (filmEchec) return;
    filmEchec = true;
    journal(`film abandonné — ${motif}`);
  }

  telecharger(film.src, (f) => (progres = f))
    .then((url) => {
      if (vivant) video.src = url;
    })
    .catch((e) => abandonFilm(`téléchargement impossible (${e instanceof Error ? e.message : e})`));

  const surMeta = () => {
    video.currentTime = film.debut;
  };
  const surSaut = () => {
    aTeleverser = true;
    if (premierSaut) {
      premierSaut = false;
      video.play().catch((e) => {
        if (!estInterruption(e)) abandonFilm("lecture refusée par le navigateur");
      });
      return;
    }
    if (s.boucleEnAttente) {
      s.boucleEnAttente = false;
      s.boucleT0 = performance.now();
    }
  };
  const surLecture = () => {
    /* Le visiteur a pu faire défiler pendant le téléchargement : pas de
       lecture pour personne, l'observateur la relancera au retour. */
    if (!visible && phase === "libre") video.pause();
    surFilmPret();
  };
  const surErreur = () => abandonFilm("fichier illisible");
  video.addEventListener("loadedmetadata", surMeta);
  video.addEventListener("seeked", surSaut);
  video.addEventListener("playing", surLecture);
  video.addEventListener("error", surErreur);

  /* Fin d'un tour : on fige la dernière image, on revient à `debut`, et
     l'encre enchaîne la maison finie sur la dalle. */
  function boucler() {
    if (glf && video.readyState >= 2) {
      televerser(glf.gl, 1, texPrec, video);
      s.boucle = 0;
      s.boucleEnAttente = true;
      s.attenteT0 = performance.now();
      s.selB = Math.random() * 20;
    }
    video.currentTime = film.debut;
    if (video.paused) video.play().catch(() => {});
  }

  if (glf) {
    const planche = new Image();
    planche.decoding = "async";
    planche.onload = () => {
      if (!vivant) return;
      televerser(glf.gl, 2, texProf, planche);
      profPret = true;
    };
    /* Sans planche, le film reste plat : ce n'est pas une raison d'attendre. */
    planche.onerror = () => {
      journal("planche de profondeur introuvable — film sans relief");
      profPret = true;
    };
    planche.src = film.profondeur.src;
  }

  /* ── Dessin ── */
  const P = film.profondeur;
  function dessinerFilm() {
    if (!glf) return;
    const { gl, u, toile: t } = glf;
    gl.viewport(0, 0, t.width, t.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!filmPret && s.fondAlpha === 0) return;
    gl.uniform2f(u("uRes"), t.width, t.height);
    gl.uniform2f(u("uTaille"), film.largeur, film.hauteur);
    gl.uniform3f(u("uGrille"), P.colonnes, P.lignes, P.nombre - 1);
    gl.uniform1f(u("uIdx"), Math.min(P.nombre - 1, Math.max(0, ((video.currentTime || 0) - film.debut) / P.pas)));
    gl.uniform2f(u("uSouris"), s.souris.x, s.souris.y);
    gl.uniform1f(u("uZoom"), MARGE_ZOOM * s.zoomIntro * s.zoomSurvol);
    gl.uniform1f(u("uReveal"), filmPret ? s.reveal : 0);
    gl.uniform1f(u("uFondAlpha"), s.fondAlpha);
    gl.uniform1f(u("uSel"), s.sel);
    graines(glf, ["uS0", "uS1", "uS2"], GRAINES.entree);
    gl.uniform1f(u("uBoucle"), s.boucle);
    gl.uniform1f(u("uSelB"), s.selB);
    graines(glf, ["uB0", "uB1", "uB2"], GRAINES.boucle);
    gl.uniform3fv(u("uFond"), TEINTES.anthracite);
    gl.uniform3fv(u("uFrange"), TEINTES.frangeFilm);
    gl.uniform1i(u("uVid"), 0);
    gl.uniform1i(u("uPrec"), 1);
    gl.uniform1i(u("uProf"), 2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function dessinerIntro() {
    if (!gli) return;
    const { gl, u, toile: t } = gli;
    gl.viewport(0, 0, t.width, t.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u("uRes"), t.width, t.height);
    gl.uniform1f(u("uSel"), s.sel + 3.7);
    graines(gli, ["uS0", "uS1", "uS2"], GRAINES.intro);
    gl.uniform1f(u("uReveal"), s.revealIntro);
    gl.uniform3fv(u("uCouleur"), TEINTES.craie);
    gl.uniform3fv(u("uFrange"), TEINTES.frangeIntro);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ── Boucle d'affichage ── */
  const tactile = window.matchMedia("(hover: none)").matches;
  let raf = 0;
  let visible = true;
  let dernier = 0;

  function image(now: number) {
    raf = 0;
    const dt = dernier ? Math.min(0.05, (now - dernier) / 1000) : 1 / 60;
    dernier = now;

    const t = (now - t0) / 1000;
    for (const p of pas) {
      if (p.fait || t < p.a) continue;
      const k = Math.min(1, (t - p.a) / p.d);
      p.f(p.e(k));
      if (k >= 1) {
        p.fait = true;
        p.fin?.();
      }
    }
    pas = pas.filter((p) => !p.fait);
    if (phase === "chargement") majChargement(now, dt);

    /* Tour de boucle : détection, attente du saut (1,5 s au plus), encre. */
    if (
      filmPret &&
      !s.boucleEnAttente &&
      !video.seeking &&
      video.duration &&
      (video.ended || video.currentTime >= Math.min(film.fin, video.duration - 0.05))
    )
      boucler();
    if (s.boucleEnAttente && now - s.attenteT0 > 1500) {
      s.boucleEnAttente = false;
      s.boucleT0 = now;
    }
    if (s.boucleT0) {
      const k = Math.min(1, (now - s.boucleT0) / 1000 / BOUCLE);
      s.boucle = E.entreeSortie(k);
      if (k >= 1) {
        s.boucle = 1;
        s.boucleT0 = 0;
      }
    }

    /* Sur écran tactile, pas de souris : l'image dérive doucement seule. */
    if (tactile) {
      s.cible.x = Math.sin(now / 2200) * 0.7;
      s.cible.y = Math.cos(now / 3000) * 0.35;
    }
    const kS = 1 - Math.pow(0.94, dt * 60);
    s.souris.x += (s.cible.x - s.souris.x) * kS;
    s.souris.y += (s.cible.y - s.souris.y) * kS;
    s.zoomSurvol += (s.zoomCible - s.zoomSurvol) * (1 - Math.pow(0.95, dt * 60));

    if (glf && video.readyState >= 2 && (aTeleverser || !video.paused)) {
      televerser(glf.gl, 0, texVid, video);
      aTeleverser = false;
    }
    dessinerFilm();
    if (phase !== "libre") dessinerIntro();

    /* Pendant l'écran de chargement, on dessine même si le hero est
       caché derrière : c'est l'écran qui est à l'écran. */
    if (visible || phase !== "libre") raf = requestAnimationFrame(image);
  }
  const relancer = () => {
    if (!raf && vivant) {
      dernier = 0;
      raf = requestAnimationFrame(image);
    }
  };

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (filmPret && !filmEchec) {
      if (visible) video.play().catch(() => {});
      else video.pause();
    }
    if (visible) relancer();
  });
  if (hero) io.observe(hero);

  const redimensionner = () => {
    dimensionner(glf);
    dimensionner(gli);
  };
  const ro = new ResizeObserver(redimensionner);
  ro.observe(conteneur);
  window.addEventListener("resize", redimensionner);
  redimensionner();

  /* ── Souris, survol, écran de chargement ── */
  const surMouvement = (e: PointerEvent) => {
    if (e.pointerType === "touch" || !hero) return;
    const r = hero.getBoundingClientRect();
    s.cible.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    s.cible.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const surSortie = () => {
    s.cible.x = 0;
    s.cible.y = 0;
  };
  const surEntreeBouton = () => (s.zoomCible = ZOOM_SURVOL);
  const surSortieBouton = () => (s.zoomCible = 1);
  hero?.addEventListener("pointermove", surMouvement);
  hero?.addEventListener("pointerleave", surSortie);
  for (const b of boutons) {
    b.addEventListener("pointerenter", surEntreeBouton);
    b.addEventListener("pointerleave", surSortieBouton);
  }
  if (avecIntro) {
    passer?.addEventListener("click", passerIntro);
    document.addEventListener("keydown", surTouche);
  }

  relancer();

  return () => {
    vivant = false;
    if (raf) cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    window.removeEventListener("resize", redimensionner);
    hero?.removeEventListener("pointermove", surMouvement);
    hero?.removeEventListener("pointerleave", surSortie);
    for (const b of boutons) {
      b.removeEventListener("pointerenter", surEntreeBouton);
      b.removeEventListener("pointerleave", surSortieBouton);
    }
    passer?.removeEventListener("click", passerIntro);
    document.removeEventListener("keydown", surTouche);
    video.removeEventListener("loadedmetadata", surMeta);
    video.removeEventListener("seeked", surSaut);
    video.removeEventListener("playing", surLecture);
    video.removeEventListener("error", surErreur);
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
    if (phase === "chargement" && drapeau) {
      /* Démontage pendant le chargement : en développement, c'est le double
         montage de React ; le moteur suivant reprend l'écran là où il en
         est. Sinon, le script du <head> rend la main à son délai. */
      drapeau.pilote = false;
    } else if (phase === "sortie") {
      /* Navigation interne en pleine sortie : l'en-tête, lui, reste. */
      toutFinir();
    }
    /* Pas de `loseContext()` ici : en développement, le double montage
       réutilise la même toile, et un contexte perdu la laisserait noire. */
  };
}

export default function HeroFilm({ film }: { film: FilmAccueil }) {
  const actif = useSyncExternalStore(sAbonner, lire, lireServeur);
  const conteneur = useRef<HTMLDivElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);

  /* En développement, le double montage de React remet <html> à ses seuls
     attributs JSX et efface le drapeau du script : on le repose avant la
     peinture tant que l'écran n'est pas terminé. Sans effet en production. */
  useLayoutEffect(() => {
    const d = window.__introAccueil;
    if (d && !d.fini) document.documentElement.setAttribute("data-intro-accueil", "");
  }, []);

  useEffect(() => {
    if (!actif) {
      /* Le script du <head> et ce composant décident sur les mêmes critères ;
         s'ils divergent malgré tout, on ne laisse pas l'écran en place. */
      const d = window.__introAccueil;
      if (lire() === false && d && !d.fini) {
        d.fini = true;
        document.documentElement.removeAttribute("data-intro-accueil");
      }
      return;
    }
    if (!conteneur.current || !toile.current) return;
    return demarrer(conteneur.current, toile.current, film);
  }, [actif, film]);

  if (!actif) return null;

  return (
    <div ref={conteneur} className="hero-fixe__film" aria-hidden="true">
      <canvas ref={toile} />
    </div>
  );
}
