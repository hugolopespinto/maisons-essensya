"use client";
import Link from "next/link";
import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { Fleche, IconeLecture, IconePause } from "./IconesCommande";
import ImageVue, { type VueVitrine } from "./ImageVue";

/* ════════════════════════════════════════════════════════════════
   LE HÉROS DE LA GAMME — les onze façades, en fondu

   Le texte du héros (fil d'ariane, titre, prix) est rendu par la page
   serveur et passé en `children` : il est dans le HTML servi, visible au
   premier affichage, et ce composant ne fait qu'animer l'image derrière.

   ⚠ CE N'EST PAS UNE ANIMATION AU DÉFILEMENT. Le client a rejeté ce
   procédé sur l'accueil — « on dirait que le site ne fonctionne pas »
   (voir HeroAccueil). Rien ici n'attend le scroll : la première façade
   et le titre sont là d'emblée, et le diaporama avance tout seul.

   ⚠ L'HORLOGE EST L'ANIMATION CSS DU SEGMENT ACTIF, PAS UN `setInterval`.
   Le segment se remplit en `--duree` ; c'est sa fin (`animationend`) qui
   fait passer à la façade suivante. La barre et le diaporama ne peuvent
   donc pas se désynchroniser, et la pause est un simple
   `animation-play-state` : elle reprend là où elle s'était arrêtée, ce
   qu'un minuteur ne sait pas faire sans comptabilité.

   ⚠ PAUSE OBLIGATOIRE (WCAG 2.2.2). Un contenu qui défile seul plus de
   cinq secondes doit pouvoir être arrêté : c'est le premier bouton de la
   barre. Le diaporama s'arrête aussi quand le héros sort de l'écran, et
   ne démarre pas du tout sous « animations réduites » — le bouton reste
   là pour le lancer si le visiteur le veut.

   ⚠ LES FAÇADES NE SE CHARGENT PAS TOUTES D'UN COUP. Elles sont empilées
   en plein écran : `loading="lazy"` n'y peut rien, une image transparente
   posée dans la fenêtre est « visible » pour le navigateur. On ne rend
   donc que la façade affichée, la suivante une fois la page chargée, et
   chaque nouvelle suivante au fil du diaporama. Les autres attendent sur
   leur empreinte de 20 px.
   ════════════════════════════════════════════════════════════════ */

export interface DiapoHero {
  slug: string;
  nom: string;
  vue: VueVitrine;
}

/* Le point de fuite du zoom change d'une façade à l'autre : le même
   travelling onze fois de suite se remarque dès la troisième. */
const ORIGINES = ["50% 62%", "32% 55%", "68% 58%", "45% 40%", "58% 70%"];

type Etat = { actif: number; sortant: number | null; charges: number[] };
type Action = { type: "aller"; i: number; n: number } | { type: "precharger"; i: number };

function reduire(e: Etat, a: Action): Etat {
  if (a.type === "precharger") {
    return e.charges.includes(a.i) ? e : { ...e, charges: [...e.charges, a.i] };
  }
  if (a.i === e.actif) return e;
  const suivante = (a.i + 1) % a.n;
  const charges = [...new Set([...e.charges, a.i, suivante])];
  return { actif: a.i, sortant: e.actif, charges };
}

export default function HeroGamme({
  diapos,
  children,
}: {
  diapos: DiapoHero[];
  children: ReactNode;
}) {
  const n = diapos.length;
  const [{ actif, sortant, charges }, dispatch] = useReducer(reduire, {
    actif: 0,
    sortant: null,
    charges: [0],
  });

  const reduit = useMediaQuery("(prefers-reduced-motion: reduce)", false);
  /* « auto » tant que le visiteur n'a rien demandé : on lit alors la
     préférence système. Un clic sur lecture ou pause l'emporte. */
  const [choix, setChoix] = useState<"auto" | "lecture" | "pause">("auto");
  const [visible, setVisible] = useState(true);
  const [focusClavier, setFocusClavier] = useState(false);
  const voulu = choix === "lecture" || (choix === "auto" && !reduit);
  const enLecture = voulu && visible && !focusClavier;

  const racine = useRef<HTMLElement | null>(null);
  const toucher = useRef<{ x: number; y: number } | null>(null);
  /* Le visiteur a-t-il lui-même changé de façade ? Le nom n'est annoncé
     aux lecteurs d'écran que dans ce cas : annoncer chaque façade du
     défilement automatique couperait la parole toutes les six secondes. */
  const [parLeVisiteur, setParLeVisiteur] = useState(false);

  const aller = (i: number, visiteur = true) => {
    dispatch({ type: "aller", i: (i + n) % n, n });
    if (visiteur) setParLeVisiteur(true);
  };

  /* La façade suivante, une fois la page entièrement chargée : avant,
     elle disputerait la bande passante à la première, celle que Chrome
     chronomètre. */
  useEffect(() => {
    if (n < 2) return;
    const go = () => dispatch({ type: "precharger", i: 1 });
    if (document.readyState === "complete") {
      const t = window.setTimeout(go, 600);
      return () => window.clearTimeout(t);
    }
    window.addEventListener("load", go, { once: true });
    return () => window.removeEventListener("load", go);
  }, [n]);

  useEffect(() => {
    const el = racine.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.2,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const courante = diapos[actif];

  return (
    <section
      ref={racine}
      className="gm-hero u-sombre"
      data-lecture={enLecture ? "true" : "false"}
      aria-labelledby="gm-hero-titre"
    >
      <div
        className="gm-hero__media"
        role="group"
        aria-roledescription="carrousel"
        aria-label="Les façades de la gamme"
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse") toucher.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const t = toucher.current;
          toucher.current = null;
          if (!t) return;
          const dx = e.clientX - t.x;
          const dy = e.clientY - t.y;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            aller(actif + (dx < 0 ? 1 : -1));
          }
        }}
        onPointerCancel={() => {
          toucher.current = null;
        }}
      >
        {/* Clé = modèle ET vue : sur une page filtrée à un seul modèle, ce
            sont SES vues extérieures qui défilent (PageGamme), et `cle` ne
            distingue les vues qu'au sein d'un modèle (« vue-1-exterieur »
            existe chez tous). */}
        {diapos.map((d, i) => {
          const etat = i === actif ? "actif" : i === sortant ? "sortant" : "";
          return (
            <div
              key={`${d.slug}-${d.vue.cle}`}
              className="gm-hero__diapo"
              data-etat={etat}
              aria-hidden={i !== actif}
              style={
                {
                  backgroundImage: `url(${d.vue.empreinte})`,
                  "--origine": ORIGINES[i % ORIGINES.length],
                } as React.CSSProperties
              }
            >
              {charges.includes(i) ? (
                <ImageVue
                  vue={d.vue}
                  alt={`Maison Essensya modèle ${d.nom}, vue extérieure`}
                  /* Au téléphone, le cadre est plus haut que large et
                     l'image le couvre : elle s'affiche à plus de deux fois
                     la largeur de l'écran. Avec « 100vw », le navigateur
                     prenait un palier deux fois trop petit, flou. */
                  sizes="(max-width: 900px) 220vw, 100vw"
                  priorite={i === 0}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="gm-hero__contenu">
        <div className="container gm-hero__container">
          {children}

          <div
            className="gm-hero__commande"
            onFocus={(e) => setFocusClavier(e.target.matches(":focus-visible"))}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusClavier(false);
            }}
          >
            <div className="gm-hero__barre">
              {/* Une seule image : ni lecture, ni flèches, ni compteur, ni
                  segments — des commandes qui ne commandent rien. */}
              {n > 1 && (
                <div className="gm-hero__boutons">
                  <button
                    type="button"
                    className="gm-rond"
                    onClick={() => setChoix(voulu ? "pause" : "lecture")}
                    aria-label={voulu ? "Mettre le diaporama en pause" : "Lancer le diaporama"}
                  >
                    {voulu ? <IconePause /> : <IconeLecture />}
                  </button>
                  <button
                    type="button"
                    className="gm-rond"
                    onClick={() => aller(actif - 1)}
                    aria-label="Façade précédente"
                  >
                    <Fleche sens="gauche" />
                  </button>
                  <button
                    type="button"
                    className="gm-rond"
                    onClick={() => aller(actif + 1)}
                    aria-label="Façade suivante"
                  >
                    <Fleche sens="droite" />
                  </button>
                </div>
              )}

              <p className="gm-hero__legende" aria-live={parLeVisiteur && !enLecture ? "polite" : "off"}>
                {n > 1 && (
                  <span className="gm-hero__compteur">
                    <span className="u-sr-only">Façade </span>
                    {String(actif + 1).padStart(2, "0")}
                    <span aria-hidden="true"> / </span>
                    <span className="u-sr-only"> sur </span>
                    {String(n).padStart(2, "0")}
                  </span>
                )}
                <span className="gm-hero__nom" key={courante.slug}>
                  <span className="u-sr-only">Modèle </span>
                  {courante.nom}
                </span>
              </p>

              <Link href={`/maisons/${courante.slug}`} className="c-link gm-hero__fiche">
                Voir le modèle<span className="u-sr-only"> {courante.nom}</span>{" "}
                <span className="arrow" aria-hidden="true">→</span>
              </Link>
            </div>

            {n > 1 && (
              <div className="gm-segments">
                {diapos.map((d, i) => (
                  <button
                    type="button"
                    key={`${d.slug}-${d.vue.cle}`}
                    className="gm-seg"
                    data-etat={i < actif ? "fait" : i === actif ? "actif" : ""}
                    data-nom={d.nom}
                    aria-label={`Afficher l'image ${i + 1} sur ${n}, modèle ${d.nom}`}
                    aria-current={i === actif ? "true" : undefined}
                    onClick={() => aller(i)}
                    onAnimationEnd={(e) => {
                      if (e.animationName === "gm-remplir" && i === actif) aller(actif + 1, false);
                    }}
                  >
                    <span className="gm-seg__piste">
                      <span className="gm-seg__plein" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
