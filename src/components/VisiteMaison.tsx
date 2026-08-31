"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type { Model } from "@/types";

/* ════ VISITE PILOTÉE AU SCROLL ════
   Desktop : piste de (N+0,4)×100vh, stage sticky, une pièce par palier.
   Le scroll fait la transition ; il ne « joue » pas l'image.

   Mobile / reduced-motion : pas de pinning — même raison que HomeHero,
   la barre d'adresse iOS fait sauter un stage sticky de 100vh. Les pièces
   s'empilent alors en cartes, chacune lisible seule.

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

export default function VisiteMaison({ model }: { model: Model }) {
  const steps = model.visite;
  const wrapRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  // SSR-safe : on suppose le mobile d'abord, le client corrige à l'hydratation.
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)", false);
  const isMobile = useMediaQuery("(max-width: 900px)", true);
  const pinned = !(reduceMotion || isMobile);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const rooms = Array.from(wrap.querySelectorAll<HTMLElement>("[data-room]"));
    const media = Array.from(wrap.querySelectorAll<HTMLElement>("[data-media]"));
    const slots = Array.from(wrap.querySelectorAll<HTMLElement>("[data-slot]"));
    const bar = wrap.querySelector<HTMLElement>("[data-prog]");

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
      const total = wrap.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const p = clamp(-wrap.getBoundingClientRect().top / total, 0, 1);
      const f = p * (N - 1);

      rooms.forEach((el, k) => {
        let vis = smoothstep(k - FADE, k, f) * (1 - smoothstep(k + 1 - FADE, k + 1, f));
        if (k === 0) vis = 1 - smoothstep(1 - FADE, 1, f);
        if (k === N - 1) vis = smoothstep(N - 1 - FADE, N - 1, f);
        el.style.opacity = vis.toFixed(3);
      });

      media.forEach((el, k) => {
        const local = clamp(f - k + 0.5, 0, 1.5) / 1.5;
        el.style.transform = `scale(${(1.03 + local * 0.11).toFixed(4)}) translate3d(0,${(
          (local - 0.5) * 3.2
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
      const total = wrap.offsetHeight - window.innerHeight;
      window.scrollTo({
        top: wrap.offsetTop + (k / (steps.length - 1)) * total,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    },
    [pinned, reduceMotion, steps],
  );

  return (
    <section
      className="vm"
      ref={wrapRef}
      data-mode={pinned ? "pinned" : "static"}
      style={pinned ? { height: `${steps.length * 100 + 40}vh` } : undefined}
      aria-label={`Visite du modèle ${model.name}, pièce par pièce`}
    >
      <div className="vm__stage">
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
            Visite — <b>{model.name}</b>
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

        <span className="vm__prog" data-prog aria-hidden="true" />
      </div>
    </section>
  );
}
