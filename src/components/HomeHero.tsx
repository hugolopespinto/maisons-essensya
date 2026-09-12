"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { fmtPrice, fmtSurface, houseUrl } from "@/lib/format";
import type { House, HouseVersion } from "@/types";
import Plate from "./Plate";

/* ════ HERO PILOTÉ AU SCROLL ════
   Desktop : section de 320vh, stage sticky, la marque s'efface et le
   discours entre par paliers.
   Mobile / reduced-motion : pas de pinning (conflit barre d'adresse) —
   parallaxe douce en rAF, ou image figée.

   Le scénario tient en quatre temps : la maison, LE PRIX, ce qu'il
   comprend, la visite. Le prix est en deuxième position et en très
   grand — c'est l'argument n°1, il ne peut pas arriver au milieu d'une
   énumération de caractéristiques.                                    */
const THRESHOLDS = [0.45, 0.56, 0.68, 0.8];

/* Les prestations qui rendent le prix crédible. Quatre, pas dix : au-delà
   on ne les lit plus, et une liste exhaustive vit sur la fiche maison. */
const PREUVES = ["Cuisine aménagée", "Pompe à chaleur", "Garage intégré", "Garanties CCMI"];

export default function HomeHero({
  house,
  version,
}: {
  house: House;
  version: HouseVersion;
}) {
  const wrapRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(-1);

  // SSR-safe : on suppose le mobile d'abord, le client corrige à l'hydratation.
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)", false);
  const isMobile = useMediaQuery("(max-width: 768px)", true);
  const staticMode = reduceMotion || isMobile;

  useEffect(() => {
    const isStatic = staticMode;

    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;

    if (isStatic) {
      if (reduceMotion) return;
      const stage = wrap.querySelector<HTMLElement>(".hero-scroll__stage");
      let tick = false;
      const parallax = () => {
        tick = false;
        const h = stage?.offsetHeight || window.innerHeight;
        const p = Math.min(1, Math.max(0, window.scrollY / h));
        img.style.transform = `scale(${(1.06 + p * 0.12).toFixed(4)}) translateY(${(
          p * 7
        ).toFixed(2)}%)`;
      };
      const onScroll = () => {
        if (!tick) {
          tick = true;
          requestAnimationFrame(parallax);
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      parallax();
      return () => window.removeEventListener("scroll", onScroll);
    }

    let ticking = false;
    const tickFn = () => {
      ticking = false;
      const rect = wrap.getBoundingClientRect();
      const total = wrap.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -rect.top / total));
      img.style.transform = `scale(${(1.18 - p * 0.18).toFixed(4)})`;

      const brand = brandRef.current;
      if (brand) {
        const fade = Math.min(1, Math.max(0, (p - 0.28) / 0.17));
        brand.style.opacity = (1 - fade).toFixed(3);
        brand.style.transform = `translateY(${(-40 * fade).toFixed(1)}px)`;
        brand.style.visibility = fade >= 1 ? "hidden" : "visible";
      }

      let active = -1;
      THRESHOLDS.forEach((t, i) => {
        if (p >= t) active = i;
      });
      setStep(active);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(tickFn);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    tickFn();
    return () => window.removeEventListener("scroll", onScroll);
  }, [staticMode, reduceMotion]);

  const on = (i: number) => (step >= i ? " is-on" : "");

  return (
    <>
      <section
        ref={wrapRef}
        className={`hero-scroll${staticMode ? " is-static" : ""}`}
        aria-label={`La maison ${house.name}`}
      >
        <div className="hero-scroll__stage">
          <div className="hero-scroll__bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={house.heroImage} alt={house.alt} fetchPriority="high" />
          </div>

          <div className="container hero-brand" ref={brandRef}>
            <span className="c-label">Constructeur nouvelle génération</span>
            <h1>La maison juste. Le prix juste.</h1>
            <div className="hero-brand__scroll">Défiler pour découvrir</div>
          </div>

          <div className="hero-model" aria-hidden={step < 0}>
            <div className="container">
              <div className={`hero-model__item${on(0)}`}>
                <span className="c-label" style={{ color: "var(--sable)" }}>
                  La maison {house.name}
                </span>
                <div className="hero-model__name">
                  {fmtSurface(version.surface)} de plain-pied
                </div>
              </div>
              <div className="hero-model__specs">
                {/* Le prix occupe toute la largeur et écrase le reste :
                    c'est lui qu'on doit retenir de ce hero. */}
                <div
                  className={`hero-model__spec hero-model__spec--xl hero-model__item${on(1)}`}
                >
                  <b>{fmtPrice(version.priceFrom)}</b>
                  <span>À partir de — maison seule, hors terrain</span>
                </div>
                <div className={`hero-model__spec hero-model__item${on(2)}`}>
                  <b>Tout compris</b>
                  <span>{PREUVES.join(" · ")}</span>
                </div>
              </div>
              <div className={`hero-model__item${on(3)}`}>
                <Link href={houseUrl()} className="c-btn c-btn--light">
                  Visiter la maison <span className="arrow">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* En mode statique, le hero animé ne raconte rien : la plaque prend
          le relais pour que le prix reste visible dès le premier écran. */}
      <div className="hero-static-plate">
        <div className="container">
          <div className="c-plate" data-reveal>
            <Plate version={version} />
          </div>
        </div>
      </div>
    </>
  );
}
