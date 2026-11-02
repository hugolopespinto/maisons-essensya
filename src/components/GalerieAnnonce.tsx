"use client";
import { useRef, useState } from "react";

/* ════════════════════════════════════════════════════════════════
   LA GALERIE D'UNE FICHE ANNONCE

   Le client voulait qu'on puisse voir toutes les photos, et hésitait entre
   deux exemples : de petites photos à côté de la grande, ou un bouton.
   Les petites photos montrent d'emblée qu'il y en a d'autres : c'est ce
   qui est fait ici, et un clic les ouvre en grand.

   ⚠ `<dialog>` NATIF, ouvert par `showModal()` : Échap, le piège du focus
   et son retour sur la vignette cliquée sont fournis par le navigateur.

   Le visuel principal arrive en `children` : il reste rendu sur le serveur,
   avec sa transition depuis le listing. Sans photo (`principale` à null),
   c'est le tracé de la parcelle, qui n'a rien à agrandir.
   ════════════════════════════════════════════════════════════════ */

/* Une grande vignette et six petites, comme dans l'exemple du client. */
const VIGNETTES = 7;

export default function GalerieAnnonce({
  principale,
  autres,
  titre,
  children,
}: {
  principale: string | null;
  autres: string[];
  titre: string;
  children: React.ReactNode;
}) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const [rang, setRang] = useState(0);
  const photos = principale ? [principale, ...autres] : autres;
  const decalage = principale ? 1 : 0;
  const visibles = autres.slice(0, VIGNETTES);
  const cachees = autres.length - visibles.length;

  const ouvrir = (i: number) => {
    setRang(i);
    dialogue.current?.showModal();
  };
  const aller = (pas: number) => setRang((r) => (r + pas + photos.length) % photos.length);

  return (
    <section className="a-gallery">
      <div className={`container${autres.length ? "" : " is-solo"}`}>
        {principale ? (
          <button
            type="button"
            className="a-gallery__ouvrir"
            onClick={() => ouvrir(0)}
            aria-label={`Agrandir la photo 1 sur ${photos.length}`}
          >
            {children}
          </button>
        ) : (
          children
        )}
        {visibles.length > 0 && (
          <div className={`a-gallery__side${visibles.length < 3 ? " is-peu" : ""}`}>
            {visibles.map((src, i) => {
              const derniere = i === visibles.length - 1 && cachees > 0;
              return (
                <button
                  type="button"
                  className="a-gallery__vignette"
                  key={src}
                  onClick={() => ouvrir(i + decalage)}
                  aria-label={`Agrandir la photo ${i + decalage + 1} sur ${photos.length}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" decoding="async" />
                  {derniere ? <span aria-hidden="true">+{cachees}</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <dialog
        ref={dialogue}
        className="a-visionneuse"
        aria-label={`Photos — ${titre}`}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") aller(-1);
          else if (e.key === "ArrowRight") aller(1);
        }}
        /* Un clic sur le fond, hors de la photo et des boutons, referme. */
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogue.current?.close();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[rang]} alt={`${titre} — photo ${rang + 1} sur ${photos.length}`} />
        <p aria-live="polite">
          {rang + 1} / {photos.length}
        </p>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="a-visionneuse__pas a-visionneuse__pas--avant"
              onClick={() => aller(-1)}
              aria-label="Photo précédente"
            >
              ←
            </button>
            <button
              type="button"
              className="a-visionneuse__pas a-visionneuse__pas--apres"
              onClick={() => aller(1)}
              aria-label="Photo suivante"
            >
              →
            </button>
          </>
        )}
        <button
          type="button"
          className="a-visionneuse__fermer"
          onClick={() => dialogue.current?.close()}
          aria-label="Fermer"
        >
          ×
        </button>
      </dialog>
    </section>
  );
}
