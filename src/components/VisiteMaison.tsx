"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type { House } from "@/types";

/* ════ VISITE PILOTÉE AU SCROLL ════
   Stage sticky, une pièce par palier. Le scroll fait la transition ;
   il ne « joue » pas l'image.

   MOBILE COMPRIS. Le pinning y était désactivé parce qu'un stage de
   `100vh` saute sur iOS quand la barre d'adresse se rétracte. La scène
   est passée en `100svh`, ce qui supprime la cause : le mobile a donc la
   même visite que le desktop, plus le balayage au pouce et une course de
   scroll raccourcie. Seul `prefers-reduced-motion` retombe sur les
   pièces empilées — c'est aussi ce que voit un visiteur sans JavaScript.

   ⚠ SEO : composant client mais RENDU CÔTÉ SERVEUR. Chaque pièce sort en
   HTML avec son <img alt> — indexable, et présente dans Google Images.
   Ne jamais le charger en dynamic({ ssr: false }) comme AnnoncesMap :
   ici le contenu EST le référencement.                                  */

const FADE = 0.35; // longueur du fondu, en fraction de palier
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export default function VisiteMaison({ house }: { house: House }) {
  const steps = house.visite;
  const wrapRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  // SSR-safe : on suppose le mobile d'abord, le client corrige à l'hydratation.
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)", false);
  const isMobile = useMediaQuery("(max-width: 900px)", true);
  /* ⚠ LE MOBILE ÉPINGLE AUSSI, DÉSORMAIS.
     Il en était exclu à cause d'un vrai problème : une scène `100vh`
     saute sur iOS quand la barre d'adresse se rétracte. La scène est
     passée en `100svh` (voir visite.css), ce qui règle la cause — il
     n'y avait plus de raison de priver le mobile du meilleur moment du
     site, sur un métier où il fait la majorité du trafic.
     Seul `prefers-reduced-motion` désactive encore l'épinglage. */
  const pinned = !reduceMotion;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const rooms = Array.from(wrap.querySelectorAll<HTMLElement>("[data-room]"));
    const media = Array.from(wrap.querySelectorAll<HTMLElement>("[data-media]"));
    const slots = Array.from(wrap.querySelectorAll<HTMLElement>("[data-slot]"));
    const bar = wrap.querySelector<HTMLElement>("[data-prog]");
    const stage = wrap.querySelector<HTMLElement>(".vm__stage");

    /* Le mode peut changer au redimensionnement : on rend la main au CSS
       plutôt que de laisser des styles inline du mode précédent. */
    const reset = () => {
      [...rooms, ...media, ...slots].forEach((el) => {
        el.style.opacity = "";
        el.style.transform = "";
      });
      if (bar) bar.style.width = "";
    };

    /* En mode empilé la barre est masquée : `active` n'est pas affiché et
       n'a pas besoin d'être remis à zéro. Il est recalculé par la première
       frame si l'on repasse en mode épinglé au redimensionnement. */
    if (!pinned) {
      reset();
      return;
    }

    const N = steps.length;
    let ticking = false;
    let last = -1;

    const frame = () => {
      ticking = false;
      /* Hauteur de la SCÈNE, pas de la fenêtre : la scène est en `svh`
         (donc fixe) tandis que `window.innerHeight` grandit et rétrécit
         avec la barre d'adresse. Mesurer la fenêtre décalerait toute la
         progression au premier mouvement de barre sur mobile. */
      const hauteurScene = stage?.offsetHeight ?? window.innerHeight;
      const total = wrap.offsetHeight - hauteurScene;
      if (total <= 0) return;
      const p = clamp(-wrap.getBoundingClientRect().top / total, 0, 1);
      const f = p * (N - 1);

      rooms.forEach((el, k) => {
        let vis = smoothstep(k - FADE, k, f) * (1 - smoothstep(k + 1 - FADE, k + 1, f));
        if (k === 0) vis = 1 - smoothstep(1 - FADE, 1, f);
        if (k === N - 1) vis = smoothstep(N - 1 - FADE, N - 1, f);
        el.style.opacity = vis.toFixed(3);
      });

      /* Le calque se rapproche et descend pendant toute sa traversée : c'est
         ce mouvement continu qui fait lire la séquence comme un plan filmé
         plutôt que comme un diaporama. Amplitude volontairement large — la
         pièce reste à l'écran sur un palier entier, un mouvement discret ne
         se verrait pas. */
      media.forEach((el, k) => {
        const local = clamp(f - k + 0.5, 0, 1.5) / 1.5;
        el.style.transform = `scale(${(1.02 + local * 0.17).toFixed(4)}) translate3d(0,${(
          (local - 0.5) * 5.5
        ).toFixed(2)}%,0)`;
      });

      slots.forEach((el, k) => {
        let o = smoothstep(k - 0.3, k - 0.02, f) * (1 - smoothstep(k + 0.42, k + 0.7, f));
        if (k === N - 1) o = smoothstep(N - 1 - 0.3, N - 1 - 0.02, f);
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translate3d(0,${((1 - o) * 22).toFixed(1)}px,0)`;
      });

      if (bar) bar.style.width = `${(p * 100).toFixed(2)}%`;

      const a = clamp(Math.round(f), 0, N - 1);
      if (a !== last) {
        last = a;
        setActive(a);
      }
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(frame);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    frame();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      reset();
    };
  }, [pinned, steps.length]);

  /* Le menu de pièces est une vraie navigation : il déplace le scroll,
     il ne bascule pas un état caché. */
  const goTo = useCallback(
    (k: number) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      if (!pinned) {
        wrap
          .querySelector(`#visite-${steps[k].cle}`)
          ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        return;
      }
      const total = wrap.offsetHeight - (wrap.querySelector<HTMLElement>(".vm__stage")?.offsetHeight ?? window.innerHeight);
      window.scrollTo({
        top: wrap.offsetTop + (k / (steps.length - 1)) * total,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    },
    [pinned, reduceMotion, steps],
  );

  /* La piste de scroll suit le nombre de pièces : le palier reste
     constant (~108 vh) que le parcours en compte 5 ou 6. */
  /* ── BALAYAGE HORIZONTAL ──
     Le scroll vertical traverse la visite ; le pouce, lui, attend de
     pouvoir passer d'une pièce à l'autre d'un geste latéral. On ne
     capture QUE l'horizontal : un balayage plutôt vertical doit rester
     un scroll de page, sinon on confisque la navigation au visiteur. */
  const toucher = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    toucher.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const depart = toucher.current;
      toucher.current = null;
      if (!depart) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - depart.x;
      const dy = t.clientY - depart.y;
      /* 48 px de course et une dominante horizontale nette : en dessous,
         c'est une hésitation, pas une intention. */
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      const cible = dx < 0 ? active + 1 : active - 1;
      if (cible >= 0 && cible < steps.length) goTo(cible);
    },
    [active, goTo, steps.length],
  );

  return (
    <section
      className="vm"
      ref={wrapRef}
      data-mode={pinned ? "pinned" : "static"}
      /* Course de scroll : plus courte sur mobile. Six pièces à 100 svh
         chacune demanderaient six écrans de pouce pour traverser une
         seule section — on garde le dispositif, on raccourcit le geste. */
      style={
        pinned
          ? { height: `${steps.length * (isMobile ? 65 : 100) + 40}svh` }
          : undefined
      }
      aria-label={`Visite de la maison ${house.name}, pièce par pièce`}
    >
      <div className="vm__stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {steps.map((s, i) => (
          <figure className="vm__room" data-room id={`visite-${s.cle}`} key={s.cle}>
            {s.video ? (
              <video
                className="vm__media"
                data-media
                src={s.video}
                poster={s.image}
                autoPlay
                muted
                loop
                playsInline
                preload={i === 0 ? "metadata" : "none"}
                aria-label={s.alt}
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                className="vm__media"
                data-media
                src={s.image}
                alt={s.alt}
                loading={i === 0 ? "eager" : "lazy"}
              />
            )}
            <span className="vm__grade" aria-hidden="true" />
            <span className="vm__scrim" aria-hidden="true" />
            <figcaption className="vm__slot" data-slot>
              <span className="vm__step">Pièce {String(i + 1).padStart(2, "0")}</span>
              <h3 className="vm__title">{s.titre}</h3>
              <p className="vm__text">{s.texte}</p>
              <ul className="vm__specs">
                {s.specs.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </figcaption>
          </figure>
        ))}

        <div className="vm__bar">
          <span className="vm__brand">
            Visite — <b>{house.name}</b>
          </span>
          <nav className="vm__nav" aria-label="Pièces de la maison">
            {steps.map((s, k) => (
              <button
                type="button"
                key={s.cle}
                onClick={() => goTo(k)}
                className={k === active ? "on" : undefined}
                aria-current={k === active ? "true" : undefined}
              >
                {s.nav}
              </button>
            ))}
          </nav>
          <span className="vm__count">
            {String(active + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </span>
        </div>

        {/* Un geste qu'on ne devine pas est un geste qui n'existe pas :
            l'indice n'apparaît qu'au toucher, une fois, puis s'efface. */}
        <span className="vm__swipe" aria-hidden="true">
          ← Balayer →
        </span>

        <span className="vm__prog" data-prog aria-hidden="true" />
      </div>
    </section>
  );
}
