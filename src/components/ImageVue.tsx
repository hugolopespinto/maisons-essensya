/* ════════════════════════════════════════════════════════════════
   UNE VUE DE MODÈLE, PRÊTE À ÊTRE AFFICHÉE PAR UN COMPOSANT CLIENT

   ⚠ LES SRCSET ARRIVENT TOUT FAITS, et c'est la raison d'être de ce
   type. `srcSet()` vit dans src/data/visuels.ts, qui importe le
   catalogue JSON entier — plusieurs dizaines de Ko d'empreintes et de
   chemins. L'appeler depuis un composant client ferait partir ce
   catalogue dans le bundle de toutes les pages qui le montent. La page
   serveur convertit donc chaque `Visuel` en `VueVitrine` (voir
   `versVitrine` dans src/app/maisons/page.tsx) et ce fichier n'importe
   rien d'autre que des types — un `import type` est effacé à la
   compilation, il n'emporte pas le module avec lui.
   ════════════════════════════════════════════════════════════════ */
import type { Visuel } from "@/data/visuels";

/* Le plan n'est pas une vue de la maison : `vuesDe()` l'écarte, et ce
   type le refuse. Un quatrième type ajouté au catalogue cassera le build
   sur `LIBELLE_TYPE` au lieu de tomber dans une branche par défaut. */
export type TypeVue = Exclude<Visuel["type"], "plan">;

export interface VueVitrine {
  cle: string;
  src: string;
  largeur: number;
  hauteur: number;
  /** Miniature encodée, posée en fond le temps du chargement. */
  empreinte: string;
  avif: string;
  webp: string;
  type: TypeVue;
}

export const LIBELLE_TYPE: Record<TypeVue, string> = {
  exterieur: "Vue extérieure",
  interieur: "Vue intérieure",
};

export default function ImageVue({
  vue,
  alt,
  sizes,
  priorite = false,
  paresseuse = false,
  className,
}: {
  vue: VueVitrine;
  alt: string;
  sizes: string;
  /** La seule image d'une page qui la mérite : celle que Chrome mesure. */
  priorite?: boolean;
  paresseuse?: boolean;
  className?: string;
}) {
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={vue.avif} sizes={sizes} />
      <source type="image/webp" srcSet={vue.webp} sizes={sizes} />
      <img
        src={vue.src}
        width={vue.largeur}
        height={vue.hauteur}
        alt={alt}
        loading={paresseuse ? "lazy" : undefined}
        fetchPriority={priorite ? "high" : undefined}
        decoding="async"
        /* Un glisser à la souris sur une image la « soulève » pour la
           déposer ailleurs : c'est le comportement natif, et il casse le
           défilement à la main des carrousels. */
        draggable={false}
      />
    </picture>
  );
}
