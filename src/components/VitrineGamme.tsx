"use client";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Picto } from "@/components/icons";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type { IconName } from "@/types";
import { Fleche, IconeFermer, IconePleinEcran } from "./IconesCommande";
import ImageVue, { LIBELLE_TYPE, type VueVitrine } from "./ImageVue";

/* ════════════════════════════════════════════════════════════════
   LA VITRINE DE LA GAMME — chaque modèle, toutes ses vues

   Un onglet par modèle, et pour le modèle choisi un carrousel de ses
   rendus : la vue courante au centre, ses voisines qui dépassent sur les
   côtés — c'est ce qui dit, sans mode d'emploi, qu'on peut faire glisser.
   Un clic sur la vue courante l'ouvre en plein écran.

   ⚠ LE CARROUSEL EST UN DÉFILEMENT NATIF, PAS UNE PISTE TRANSLATÉE EN JS.
   `scroll-snap` fait le travail que les bibliothèques de carrousel
   réécrivent : le glissé au doigt avec son inertie, le pavé tactile, la
   molette horizontale, le recalage sur une vue. Le JavaScript ne fait que
   lire la position pour savoir quelle vue est au centre, et ajouter ce
   que le natif ne sait pas faire : les flèches, et le glissé à la souris.

   ⚠ AUCUN TEXTE NI AUCUN CHIFFRE SUR LES RENDUS. Le client a écarté les
   deux — « le texte sera peu lisible et l'image également », et pas de
   chiffres posés sur ces rendus (voir HeroAccueil). Le nom, le compteur
   et les caractéristiques vivent sous l'image, jamais dessus.

   ⚠ CE COMPOSANT SAIT SE TAIRE, COMME LA CARTE QU'IL REMPLACE. Les
   caractéristiques n'existent que pour Ankara : pour les dix autres, la
   ligne de pictos laisse place à une phrase qui dit qu'elles arrivent,
   jamais à un tiret ni à un zéro (voir src/data/gamme.ts).
   ════════════════════════════════════════════════════════════════ */

export interface ModeleVitrine {
  slug: string;
  nom: string;
  pictos: { icon: IconName; value: string; label: string }[];
  /** Le prix du modèle, déjà formaté — `null` tant qu'il n'est pas publié. */
  prix: string | null;
  vues: VueVitrine[];
  aPlan: boolean;
}

const deux = (n: number) => String(n).padStart(2, "0");

/* ──────────────────────────────────────────────────────────────────
   LA PISTE — ce que le carrousel et la visionneuse partagent

   L'index courant n'est JAMAIS posé à la main : il se lit dans la
   position de défilement. Une seule source de vérité, et le compteur ne
   peut pas annoncer une vue pendant que l'écran en montre une autre —
   y compris pendant un glissé au doigt, que le JavaScript ne pilote pas.
   ────────────────────────────────────────────────────────────────── */
function usePiste(reduit: boolean, depart = 0) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(depart);
  const image = useRef(0);

  /** La vue dont le centre est le plus proche du centre de la piste. */
  const plusProche = useCallback((): number => {
    const piste = ref.current;
    if (!piste) return 0;
    const centre = piste.scrollLeft + piste.clientWidth / 2;
    let meilleur = 0;
    let ecart = Infinity;
    Array.from(piste.children).forEach((el, i) => {
      const d = el as HTMLElement;
      const e = Math.abs(d.offsetLeft + d.offsetWidth / 2 - centre);
      if (e < ecart) {
        ecart = e;
        meilleur = i;
      }
    });
    return meilleur;
  }, []);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(image.current);
    image.current = requestAnimationFrame(() => setIndex(plusProche()));
  }, [plusProche]);

  useEffect(() => () => cancelAnimationFrame(image.current), []);

  /** Centre la vue `i`. `doux: false` pour les sauts que le visiteur ne
   *  doit pas voir passer (ouverture et fermeture de la visionneuse). */
  const aller = useCallback(
    (i: number, doux = true) => {
      const piste = ref.current;
      if (!piste) return;
      const n = piste.children.length;
      const cible = piste.children[Math.max(0, Math.min(n - 1, i))] as HTMLElement | undefined;
      if (!cible) return;
      piste.scrollTo({
        left: cible.offsetLeft - (piste.clientWidth - cible.offsetWidth) / 2,
        behavior: doux && !reduit ? "smooth" : "instant",
      });
    },
    [reduit],
  );

  return { ref, index, setIndex, onScroll, aller, plusProche };
}

/* ──────────────────────────────────────────────────────────────────
   LE GLISSÉ À LA SOURIS

   Le défilement natif suit le doigt et le pavé tactile, pas la souris :
   sur un ordinateur, sans ceci, la seule façon de faire défiler serait
   les flèches. On coupe l'aimantation le temps du geste — sinon le
   navigateur ramène la piste sur une vue à chaque pixel — puis on la
   rend une fois la piste posée sur la vue visée.

   ⚠ LE CLIC QUI SUIT UN GLISSÉ EST AVALÉ. Relâcher la souris sur l'image
   après l'avoir fait glisser produit un `click` : sans garde, chaque
   glissé ouvrirait la visionneuse.
   ────────────────────────────────────────────────────────────────── */
function useGlisse(
  piste: React.RefObject<HTMLDivElement | null>,
  plusProche: () => number,
  aller: (i: number) => void,
) {
  const geste = useRef<{ id: number; x: number; gauche: number; depart: number; bouge: boolean } | null>(null);
  const avaler = useRef(false);

  const rendreAimant = () => {
    const el = piste.current;
    if (!el) return;
    const fin = () => el.classList.remove("is-glisse");
    if ("onscrollend" in window) el.addEventListener("scrollend", fin, { once: true });
    window.setTimeout(fin, 700);
  };

  return {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || !piste.current) return;
      geste.current = {
        id: e.pointerId,
        x: e.clientX,
        gauche: piste.current.scrollLeft,
        depart: plusProche(),
        bouge: false,
      };
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const g = geste.current;
      const el = piste.current;
      if (!g || !el || e.pointerId !== g.id) return;
      const dx = e.clientX - g.x;
      if (!g.bouge) {
        if (Math.abs(dx) < 6) return;
        g.bouge = true;
        el.setPointerCapture(g.id);
        el.classList.add("is-glisse");
      }
      el.scrollTo({ left: g.gauche - dx, behavior: "instant" });
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      const g = geste.current;
      geste.current = null;
      if (!g || !g.bouge) return;
      avaler.current = true;
      window.setTimeout(() => (avaler.current = false), 0);
      const dx = e.clientX - g.x;
      const largeur = (piste.current?.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1;
      /* Un geste franc passe à la voisine même s'il n'a pas parcouru la
         moitié de la vue : c'est ce qu'on attend d'un glissé. */
      const seuil = largeur * 0.12;
      const cible = dx < -seuil ? g.depart + 1 : dx > seuil ? g.depart - 1 : g.depart;
      aller(cible);
      rendreAimant();
    },
    onPointerCancel: () => {
      if (geste.current?.bouge) rendreAimant();
      geste.current = null;
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (avaler.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
  };
}

export default function VitrineGamme({ modeles }: { modeles: ModeleVitrine[] }) {
  const reduit = useMediaQuery("(prefers-reduced-motion: reduce)", false);
  const [iModele, setIModele] = useState(0);
  const [visionneuse, setVisionneuse] = useState<number | null>(null);
  const { ref: pisteRef, index, setIndex, onScroll, aller, plusProche } = usePiste(reduit);
  const glisse = useGlisse(pisteRef, plusProche, aller);
  const onglets = useRef<(HTMLButtonElement | null)[]>([]);
  const vignettes = useRef<HTMLDivElement | null>(null);
  const diapos = useRef<(HTMLButtonElement | null)[]>([]);
  const ouvreur = useRef<HTMLElement | null>(null);

  const m = modeles[iModele];
  const n = m.vues.length;
  const iVue = Math.min(index, n - 1);

  const choisir = (i: number) => {
    if (i === iModele) return;
    setIModele(i);
    /* La piste est remontée (clé = modèle), donc ramenée au début : l'index
       doit l'être en même temps, sans attendre un défilement qui n'aura
       pas lieu. */
    setIndex(0);
  };

  /* La vignette active reste dans sa bande, sans faire bouger la page :
     `scrollIntoView` aurait aussi fait défiler la fenêtre. */
  useEffect(() => {
    const bande = vignettes.current;
    const v = bande?.children[iVue] as HTMLElement | undefined;
    if (!bande || !v) return;
    const gauche = v.offsetLeft - (bande.clientWidth - v.offsetWidth) / 2;
    bande.scrollTo({ left: gauche, behavior: reduit ? "instant" : "smooth" });
  }, [iVue, iModele, reduit]);

  /* Les flèches du clavier, sur la vue courante : la vue suivante devient
     la vue courante ET reçoit le focus — c'est le motif « tabindex
     itinérant », un seul arrêt de tabulation pour toute la piste. */
  const auClavier = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const cible = Math.max(0, Math.min(n - 1, iVue + (e.key === "ArrowRight" ? 1 : -1)));
    aller(cible);
    diapos.current[cible]?.focus({ preventScroll: true });
  };

  const ongletsAuClavier = (e: KeyboardEvent<HTMLDivElement>) => {
    const sens = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity }[e.key];
    if (sens === undefined) return;
    e.preventDefault();
    const i =
      sens === -Infinity ? 0 : sens === Infinity ? modeles.length - 1 : (iModele + sens + modeles.length) % modeles.length;
    choisir(i);
    onglets.current[i]?.focus();
  };

  const ouvrir = (i: number, depuis: HTMLElement | null) => {
    ouvreur.current = depuis;
    setVisionneuse(i);
  };

  const demanderDossier = () => {
    /* Le formulaire de fin de page a un sélecteur de modèle, non contrôlé :
       on le positionne sur celui qu'on regarde. Le visiteur arrive sur un
       formulaire déjà à moitié rempli, avec le bon modèle pour le CRM. */
    const s = document.getElementById("mf-modele");
    if (s instanceof HTMLSelectElement && [...s.options].some((o) => o.value === m.nom)) {
      s.value = m.nom;
    }
  };

  return (
    <div className="gm-vitrine">
      <div className="container">
        <div className="gm-onglets" role="tablist" aria-label="Les modèles de la gamme" onKeyDown={ongletsAuClavier}>
          {modeles.map((x, i) => (
            <button
              key={x.slug}
              ref={(el) => {
                onglets.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`gm-onglet-${x.slug}`}
              aria-selected={i === iModele}
              aria-controls="gm-scene"
              tabIndex={i === iModele ? 0 : -1}
              className="gm-onglet"
              onClick={() => choisir(i)}
            >
              <span className="gm-onglet__num" aria-hidden="true">
                {deux(i + 1)}
              </span>
              <span className="gm-onglet__nom">{x.nom}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="gm-scene" id="gm-scene" role="tabpanel" aria-labelledby={`gm-onglet-${m.slug}`}>
        <div
          className="gm-cadre"
          role="group"
          aria-roledescription="carrousel"
          aria-label={`Les vues du modèle ${m.nom}`}
          onKeyDown={auClavier}
        >
          <div
            className="gm-piste"
            ref={pisteRef}
            key={m.slug}
            onScroll={onScroll}
            {...glisse}
          >
            {m.vues.map((v, i) => {
              const courante = i === iVue;
              return (
                <button
                  type="button"
                  key={v.cle}
                  ref={(el) => {
                    diapos.current[i] = el;
                  }}
                  className="gm-diapo"
                  data-courante={courante ? "true" : "false"}
                  style={{ backgroundImage: `url(${v.empreinte})` }}
                  tabIndex={courante ? 0 : -1}
                  /* Le libellé du bouton dit ce que fait le clic ; le
                     texte alternatif, lui, reste pour l'indexation des
                     images — `aria-label` l'emporte à l'oreille. */
                  aria-label={
                    courante
                      ? `${LIBELLE_TYPE[v.type]} ${i + 1} sur ${n}, agrandir en plein écran`
                      : `Afficher la vue ${i + 1} sur ${n}`
                  }
                  onClick={(e) => (courante ? ouvrir(i, e.currentTarget) : aller(i))}
                >
                  <ImageVue
                    vue={v}
                    alt={`Maison Essensya modèle ${m.nom}, ${LIBELLE_TYPE[v.type].toLowerCase()}`}
                    sizes="(max-width: 700px) 86vw, min(76vw, 1180px)"
                    paresseuse={i > 1}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="container">
          <div className="gm-barre">
            <div className="gm-vignettes" ref={vignettes}>
              {m.vues.map((v, i) => (
                <button
                  type="button"
                  key={v.cle}
                  className="gm-vignette"
                  aria-label={`Vue ${i + 1} : ${LIBELLE_TYPE[v.type].toLowerCase()}`}
                  aria-current={i === iVue ? "true" : undefined}
                  onClick={() => aller(i)}
                >
                  <ImageVue vue={v} alt="" sizes="112px" paresseuse />
                </button>
              ))}
            </div>

            <div className="gm-barre__commandes">
              <p className="gm-compteur" aria-live="polite" aria-atomic="true">
                <span className="u-sr-only">Vue </span>
                <strong>{deux(iVue + 1)}</strong>
                <span aria-hidden="true"> / </span>
                <span className="u-sr-only"> sur </span>
                {deux(n)}
              </p>
              <button
                type="button"
                className="gm-rond"
                onClick={() => aller(iVue - 1)}
                disabled={iVue === 0}
                aria-label="Vue précédente"
              >
                <Fleche sens="gauche" />
              </button>
              <button
                type="button"
                className="gm-rond"
                onClick={() => aller(iVue + 1)}
                disabled={iVue === n - 1}
                aria-label="Vue suivante"
              >
                <Fleche sens="droite" />
              </button>
              <button
                type="button"
                className="gm-rond"
                onClick={(e) => ouvrir(iVue, e.currentTarget)}
                aria-label="Voir en plein écran"
              >
                <IconePleinEcran />
              </button>
            </div>
          </div>

          <div className="gm-fiche">
            <div className="gm-fiche__titre">
              <span className="c-label">
                Modèle <span aria-hidden="true">{deux(iModele + 1)}</span>
              </span>
              <h3 key={m.slug}>
                <span>{m.nom}</span>
              </h3>
            </div>

            <div className="gm-fiche__infos">
              {m.pictos.length > 0 ? (
                <div className="c-pictos">
                  {m.pictos.map((p) => (
                    <Picto icon={p.icon} value={p.value} label={p.label} key={p.label} />
                  ))}
                </div>
              ) : (
                <p className="gm-fiche__attente">
                  Surface, nombre de chambres et de pièces : les caractéristiques de ce
                  modèle sont en cours de publication.
                </p>
              )}
              {m.prix ? (
                <p className="gm-fiche__prix">
                  Modèle {m.nom}, à partir de <strong>{m.prix}</strong>
                  <small>Maison seule, hors terrain, hors adaptation.</small>
                </p>
              ) : null}
            </div>

            <div className="gm-fiche__actions">
              <Link href={`/maisons/${m.slug}`} className="c-btn c-btn--light">
                Voir le plan de maison {m.nom} <span className="arrow" aria-hidden="true">→</span>
              </Link>
              <a href="#dossier" className="c-link" onClick={demanderDossier}>
                Je veux des infos sur ce modèle
              </a>
              {m.aPlan ? (
                <Link href={`/maisons/${m.slug}#plan`} className="c-link">
                  Voir son plan
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {visionneuse !== null ? (
        <Visionneuse
          nom={m.nom}
          vues={m.vues}
          depart={visionneuse}
          reduit={reduit}
          onFermer={(i) => {
            setVisionneuse(null);
            aller(i, false);
            /* Le focus revient d'où il est parti — sauf si c'était une vue :
               la piste a suivi la visionneuse, et c'est la vue désormais
               au centre qui porte l'unique arrêt de tabulation. */
            const retour = diapos.current.includes(ouvreur.current as HTMLButtonElement)
              ? diapos.current[i]
              : ouvreur.current;
            retour?.focus({ preventScroll: true });
          }}
        />
      ) : null}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   LA VISIONNEUSE — une vue en plein écran, image entière

   Le carrousel recadre (16/9 sur ordinateur, 4/3 au téléphone) ; ici
   l'image est rendue en entier, `contain`, à la taille de l'écran.

   ⚠ UN <dialog> NATIF, OUVERT EN `showModal()`. C'est lui qui piège le
   focus, ferme sur Échap, rend le reste de la page inerte pour les
   lecteurs d'écran et passe au-dessus de l'en-tête fixe sans guerre de
   z-index. Le défilement de la page est bloqué en CSS (`:has()` sur
   <html>, voir vitrine.css), sans toucher au style du <body> que le menu
   mobile manipule déjà.
   ────────────────────────────────────────────────────────────────── */
function Visionneuse({
  nom,
  vues,
  depart,
  reduit,
  onFermer,
}: {
  nom: string;
  vues: VueVitrine[];
  depart: number;
  reduit: boolean;
  onFermer: (i: number) => void;
}) {
  const dialogue = useRef<HTMLDialogElement | null>(null);
  const { ref: pisteRef, index, onScroll, aller, plusProche } = usePiste(reduit, depart);
  const glisse = useGlisse(pisteRef, plusProche, aller);
  const n = vues.length;
  const i = Math.min(index, n - 1);
  /* Lue par l'écouteur de fermeture, qui ne doit pas se réabonner à
     chaque vue — la valeur du rendu courant suffit. */
  const courant = useRef(depart);
  const fermer = useRef(onFermer);

  useLayoutEffect(() => {
    courant.current = i;
    fermer.current = onFermer;
  });

  useLayoutEffect(() => {
    const d = dialogue.current;
    if (!d) return;
    d.showModal();
    /* Positionnée avant le premier affichage : la visionneuse s'ouvre
       directement sur la vue cliquée, sans défiler depuis la première. */
    aller(depart, false);
    /* ⚠ L'ÉVÉNEMENT `close` EST ASYNCHRONE, d'où le test de `open`. En
       développement, React monte, démonte et remonte chaque effet : le
       `close()` du démontage met son événement en file, et c'est
       l'écouteur du REMONTAGE qui le reçoit — la visionneuse se
       refermait aussitôt ouverte. Un dialogue rouvert entre-temps n'a
       pas à obéir à une fermeture qui ne le concerne plus. */
    const surFermeture = () => {
      if (!d.open) fermer.current(courant.current);
    };
    d.addEventListener("close", surFermeture);
    return () => {
      d.removeEventListener("close", surFermeture);
      if (d.open) d.close();
    };
    // Une seule ouverture par montage : le parent démonte la visionneuse
    // à la fermeture, et la remonte pour la suivante.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const auClavier = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      aller(i + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      aller(i - 1);
    }
  };

  return (
    <dialog
      ref={dialogue}
      className="gm-visionneuse u-sombre"
      aria-label={`Modèle ${nom}, vues en plein écran`}
      onKeyDown={auClavier}
    >
      <div className="gm-visionneuse__tete">
        <p className="gm-visionneuse__legende">
          <strong>{nom}</strong>
          <span>{LIBELLE_TYPE[vues[i].type]}</span>
        </p>
        <p className="gm-compteur" aria-live="polite" aria-atomic="true">
          <span className="u-sr-only">Vue </span>
          <strong>{deux(i + 1)}</strong>
          <span aria-hidden="true"> / </span>
          <span className="u-sr-only"> sur </span>
          {deux(n)}
        </p>
        <button
          type="button"
          className="gm-rond"
          onClick={() => dialogue.current?.close()}
          aria-label="Fermer le plein écran"
          autoFocus
        >
          <IconeFermer />
        </button>
      </div>

      <div className="gm-visionneuse__piste" ref={pisteRef} onScroll={onScroll} {...glisse}>
        {vues.map((v, k) => (
          <div className="gm-visionneuse__diapo" key={v.cle} aria-hidden={k !== i}>
            <ImageVue
              vue={v}
              alt={`Maison Essensya modèle ${nom}, ${LIBELLE_TYPE[v.type].toLowerCase()}`}
              sizes="100vw"
              paresseuse={Math.abs(k - depart) > 1}
            />
          </div>
        ))}
      </div>

      <div className="gm-visionneuse__pied">
        <button
          type="button"
          className="gm-rond gm-rond--grand"
          onClick={() => aller(i - 1)}
          disabled={i === 0}
          aria-label="Vue précédente"
        >
          <Fleche sens="gauche" />
        </button>
        <button
          type="button"
          className="gm-rond gm-rond--grand"
          onClick={() => aller(i + 1)}
          disabled={i === n - 1}
          aria-label="Vue suivante"
        >
          <Fleche sens="droite" />
        </button>
      </div>
    </dialog>
  );
}
