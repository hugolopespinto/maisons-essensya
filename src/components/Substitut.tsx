import type { Annonce } from "@/types";

/* ════════════════════════════════════════════════════════════════
   SUBSTITUT GRAPHIQUE — quand l'annonce n'a pas de photo

   Ce n'est pas un placeholder d'attente : c'est le cas NOMINAL.
   Sur le flux réel, 90 terrains sur 100 n'ont aucun média et les
   maisons n'ont pas de galerie. Mettre une photo de stock reviendrait
   à illustrer 9 annonces sur 10 avec une prairie générique.

   On dessine donc ce qu'on sait vraiment : la parcelle à l'échelle,
   cotée, avec l'emprise de la maison quand il y en a une. C'est plus
   informatif qu'une photo, c'est unique par annonce, ça pèse 2 Ko, et
   ça parle la même langue que le reste de la DA — filets 1px, chiffres
   en mono, capitales espacées.
   ════════════════════════════════════════════════════════════════ */

/** Hash déterministe : la même annonce donne toujours le même tracé. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const W = 320;
const H = 200;

interface Props {
  annonce: Annonce;
  /** Le ratio du conteneur — le tracé s'y adapte. */
  className?: string;
}

export default function Substitut({ annonce: a, className = "" }: Props) {
  const seed = hash(a.id);
  const rnd = (n: number, span: number) => ((seed >> (n * 3)) % (span * 2 + 1)) - span;

  const surface = a.landSurface ?? 500;
  /* Proportion de la parcelle : plutôt en longueur, comme un lot réel.
     On la fait varier de ±0,35 pour que deux annonces voisines diffèrent. */
  const ratio = 1.45 + rnd(1, 35) / 100;
  const frontage = Math.sqrt(surface / ratio);
  const depth = frontage * ratio;

  /* Mise à l'échelle dans le cadre, marges comprises. */
  const pad = 46;
  const scale = Math.min((W - pad * 2) / depth, (H - pad * 2) / frontage);
  const pw = depth * scale;
  const ph = frontage * scale;
  const x = (W - pw) / 2;
  const y = (H - ph) / 2;

  /* Terrain « en pente » ou « irrégulier » → le quadrilatère se déforme. */
  const irregulier = /irr[ée]gulier|triangul|pente/i.test(
    `${a.landConfiguration ?? ""} ${a.landType ?? ""}`,
  );
  const sk = irregulier ? Math.max(6, pw * 0.09) : 0;
  const d1 = irregulier ? rnd(2, 5) : 0;
  const d2 = irregulier ? rnd(3, 5) : 0;

  const pts = [
    [x, y + d1],
    [x + pw - sk, y + d2],
    [x + pw, y + ph],
    [x + sk * 0.4, y + ph - d1],
  ] as const;
  const poly = pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");

  /* Emprise de la maison, à l'échelle réelle de la parcelle. */
  const isTM = a.type === "terrain-maison";
  const hs = a.houseSurface ?? 0;
  const hRatio = 1.6;
  const hFront = hs ? Math.sqrt(hs / hRatio) : 0;
  const hDepth = hFront * hRatio;
  const hw = hDepth * scale;
  const hh = hFront * scale;
  const hx = x + pw * 0.5 - hw / 2 + rnd(4, 6);
  const hy = y + ph * 0.52 - hh / 2;

  const gridId = `g-${a.id.slice(-6)}`;
  const label = isTM ? "Maison + terrain" : "Terrain à bâtir";
  const alt = isTM
    ? `Schéma coté : parcelle de ${Math.round(surface)} m² à ${a.city} avec l'emprise de la maison de ${Math.round(hs)} m²`
    : `Schéma coté : parcelle de ${Math.round(surface)} m² à ${a.city}`;

  return (
    <svg
      className={`c-sub ${className}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={alt}
    >
      <defs>
        <pattern id={gridId} width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0v16" fill="none" stroke="var(--beton)" strokeWidth=".5" opacity=".55" />
        </pattern>
      </defs>

      <rect width={W} height={H} fill="var(--craie)" />
      <rect className="c-sub__grille" width={W} height={H} fill={`url(#${gridId})`} />

      {/* La parcelle, en DEUX éléments : le remplissage apparaît, le
          contour se DESSINE. `pathLength="1"` normalise la longueur du
          tracé à 1, ce qui permet d'animer `stroke-dashoffset` de 1 à 0
          sans avoir à calculer le périmètre réel du quadrilatère — qui
          change à chaque annonce. */}
      <polygon className="c-sub__fill" points={poly} fill="var(--sable)" />
      <polygon
        className="c-sub__trace"
        points={poly}
        fill="none"
        stroke="var(--pierre)"
        strokeWidth="1.25"
        pathLength="1"
      />

      {/* L'emprise bâtie */}
      {isTM && hs > 0 && (
        <>
          <rect
            x={hx}
            y={hy}
            width={hw}
            height={hh}
            fill="var(--anthracite)"
            stroke="var(--anthracite)"
            strokeWidth="1"
            className="c-sub__bati"
          />
          <text
            x={hx + hw / 2}
            y={hy + hh / 2 + 3.5}
            textAnchor="middle"
            className="c-sub__inner"
          >
            {Math.round(hs)} m²
          </text>
        </>
      )}

      {/* Cote de façade (verticale, à gauche) */}
      <g className="c-sub__cote c-sub__cote--v">
        <line x1={x - 14} y1={y} x2={x - 14} y2={y + ph} />
        <line x1={x - 18} y1={y} x2={x - 10} y2={y} />
        <line x1={x - 18} y1={y + ph} x2={x - 10} y2={y + ph} />
        <text x={x - 21} y={y + ph / 2 + 3} textAnchor="end" className="c-sub__dim">
          {Math.round(frontage)} m
        </text>
      </g>

      {/* Cote de profondeur (horizontale, en bas) */}
      <g className="c-sub__cote c-sub__cote--h">
        <line x1={x} y1={y + ph + 14} x2={x + pw} y2={y + ph + 14} />
        <line x1={x} y1={y + ph + 10} x2={x} y2={y + ph + 18} />
        <line x1={x + pw} y1={y + ph + 10} x2={x + pw} y2={y + ph + 18} />
        <text x={x + pw / 2} y={y + ph + 29} textAnchor="middle" className="c-sub__dim">
          {Math.round(depth)} m
        </text>
      </g>

      {/* Surface de parcelle, en haut à droite */}
      <text x={W - 14} y={22} textAnchor="end" className="c-sub__surface c-sub__tard">
        {Math.round(surface)} m²
      </text>
      <text x={14} y={22} className="c-sub__label c-sub__tard">
        {label}
      </text>

      {/* Nord — un repère de plan, pas une décoration */}
      <g className="c-sub__nord c-sub__tard" transform={`translate(${W - 22} ${H - 18})`}>
        <path d="M0 -9 L3.4 4 L0 1.4 L-3.4 4 Z" />
        <text y="-13" textAnchor="middle">N</text>
      </g>
    </svg>
  );
}

/**
 * Média d'annonce : la photo si elle existe, le tracé coté sinon.
 * Un seul point d'entrée pour que personne n'ait à se demander
 * quoi afficher quand `image` est `null`.
 */
export function AnnonceMedia({
  annonce,
  className = "",
  eager = false,
}: {
  annonce: Annonce;
  className?: string;
  eager?: boolean;
}) {
  if (!annonce.image) return <Substitut annonce={annonce} className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={annonce.image}
      alt={annonce.title ?? `Annonce à ${annonce.city}`}
      className={className}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
