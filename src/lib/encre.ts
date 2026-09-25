/* ════════════════════════════════════════════════════════════════
   L'ENCRE — le rendu WebGL de l'arrivée sur l'accueil

   Deux programmes, un seul dessin d'encre :
   · le FILM, qui peint la vidéo du chantier avec son relief et ses
     transitions (entrée, puis chaque tour de boucle) ;
   · l'ÉCRAN DE CHARGEMENT, un aplat craie qui se dissout en tache.

   Rien ici ne touche au DOM ni au calendrier : c'est HeroFilm qui
   orchestre. Ce fichier ne fait que dessiner ce qu'on lui demande.

   ⚠ LA TACHE EST CALCULÉE, PAS FILMÉE. Le site de référence (Makhno
   Studio) utilise deux vidéos d'encre de 2,3 s. Ici un bruit fractal
   déformé produit la même forme sans un octet à télécharger, et le
   dessin change à chaque passage via `sel`.
   ════════════════════════════════════════════════════════════════ */

/** Triangle plein écran : `vUv` va de (0,0) en bas à gauche à (1,1). */
const VERT =
  "attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }";

const COMMUN = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  varying vec2 vUv;
  uniform vec2 uRes;
  float hash(vec2 p){ p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
  float bruit(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++){ v += a * bruit(p); p = p * 2.03 + vec2(11.7, 5.3); a *= 0.5; }
    return v;
  }
  /* Distance déformée aux trois points d'où part l'encre (xy + retard). */
  float champ(vec2 uv, vec3 s0, vec3 s1, vec3 s2, float sel){
    float asp = uRes.x / uRes.y;
    vec2 q = vec2(uv.x * asp, uv.y);
    vec2 w = vec2(fbm(q * 1.5 + sel), fbm(q * 1.5 + sel + 7.3)) - 0.5;
    vec2 k = q + w * 0.4;
    float d0 = length(k - vec2(s0.x * asp, s0.y)) + s0.z;
    float d1 = length(k - vec2(s1.x * asp, s1.y)) + s1.z;
    float d2 = length(k - vec2(s2.x * asp, s2.y)) + s2.z;
    float d = min(d0, min(d1, d2));
    d += (fbm(q * 3.4 + sel * 1.7) - 0.5) * 0.28;
    d += (fbm(q * 15.0 + sel * 3.1) - 0.5) * 0.05;
    return d;
  }
  /* 1 là où l'encre est passée. À p = 1, le rayon couvre la diagonale
     plus toutes les déformations : plus aucun point n'y échappe. */
  float encre(float d, float p, float retrait){
    float asp = uRes.x / uRes.y;
    float r = mix(-0.25, length(vec2(asp, 1.0)) + 0.8, p) - retrait;
    float w = 1.5 / uRes.y;
    return 1.0 - smoothstep(r - w, r + w, d);
  }
`;

/* Sortie en alpha prémultiplié : là où l'encre n'est pas passée, le
   calque vaut `uFond` à l'opacité `uFondAlpha`. À 0, on voit la photo
   du hero à travers ; à 1, un aplat anthracite — c'est ce que montre la
   sortie de l'écran de chargement, comme sur la démo validée. */
export const FRAG_FILM =
  COMMUN +
  `
  uniform sampler2D uVid;
  uniform sampler2D uPrec;
  uniform sampler2D uProf;
  uniform vec2 uTaille;
  uniform vec3 uGrille;
  uniform float uIdx;
  uniform vec2 uSouris;
  uniform float uZoom;
  uniform float uReveal;
  uniform float uFondAlpha;
  uniform float uSel;
  uniform vec3 uS0;
  uniform vec3 uS1;
  uniform vec3 uS2;
  uniform float uBoucle;
  uniform float uSelB;
  uniform vec3 uB0;
  uniform vec3 uB1;
  uniform vec3 uB2;
  uniform vec3 uFond;
  uniform vec3 uFrange;
  vec2 couvrir(vec2 uv){
    float ra = uRes.x / uRes.y; float ri = uTaille.x / uTaille.y;
    vec2 s = ra > ri ? vec2(1.0, ri / ra) : vec2(ra / ri, 1.0);
    return (uv - 0.5) * s + 0.5;
  }
  /* Carte n° k de la planche de profondeur, rangée ligne par ligne
     depuis le coin haut gauche (uGrille = colonnes, lignes, dernier n°). */
  float profCarte(float k, vec2 c){
    k = floor(k + 0.5);
    float col = mod(k, uGrille.x); float lig = floor(k / uGrille.x);
    vec2 cc = clamp(c, vec2(0.004), vec2(0.996));
    return texture2D(uProf, vec2((col + cc.x) / uGrille.x, 1.0 - (lig + 1.0 - cc.y) / uGrille.y)).r;
  }
  /* Profondeur à l'instant du film : les deux cartes qui l'encadrent, mêlées. */
  float profondeur(float idx, vec2 c){
    float k0 = floor(idx);
    return mix(profCarte(k0, c), profCarte(min(k0 + 1.0, uGrille.z), c), idx - k0);
  }
  /* Le proche (clair) glisse plus que le lointain (sombre). */
  vec2 decalage(float prof){ return uSouris * (prof - 0.35) * vec2(0.026, 0.017); }
  void main(){
    vec2 uv = (vUv - 0.5) / uZoom + 0.5;
    vec2 c = couvrir(uv);
    vec3 col = texture2D(uVid, clamp(c + decalage(profondeur(uIdx, c)), 0.001, 0.999)).rgb;
    if (uBoucle < 1.0) {
      vec3 prec = texture2D(uPrec, clamp(c + decalage(profCarte(uGrille.z, c)), 0.001, 0.999)).rgb;
      float d = champ(vUv, uB0, uB1, uB2, uSelB);
      float m = encre(d, uBoucle, 0.0);
      float coeur = encre(d, uBoucle, 0.045);
      col = mix(col, uFrange, clamp(m - coeur, 0.0, 1.0) * 0.7);
      col = mix(prec, col, m);
    }
    vec4 sortie = vec4(col, 1.0);
    if (uReveal < 1.0) {
      float d = champ(vUv, uS0, uS1, uS2, uSel);
      float m = encre(d, uReveal, 0.0);
      float coeur = encre(d, uReveal, 0.045);
      sortie = mix(vec4(uFond * uFondAlpha, uFondAlpha), sortie, m);
      sortie.rgb = mix(sortie.rgb, uFrange * sortie.a, clamp(m - coeur, 0.0, 1.0) * 0.7);
    }
    gl_FragColor = sortie;
  }
`;

export const FRAG_INTRO =
  COMMUN +
  `
  uniform float uReveal;
  uniform float uSel;
  uniform vec3 uS0;
  uniform vec3 uS1;
  uniform vec3 uS2;
  uniform vec3 uCouleur;
  uniform vec3 uFrange;
  void main(){
    float d = champ(vUv, uS0, uS1, uS2, uSel);
    float m = encre(d, uReveal, 0.0);
    float halo = clamp(encre(d, uReveal, -0.05) - m, 0.0, 1.0);
    vec3 col = mix(uCouleur, uFrange, halo);
    float a = 1.0 - m;
    gl_FragColor = vec4(col * a, a);
  }
`;

type Graine = [number, number, number];
/** D'où part l'encre, en coordonnées d'écran (0,0 en bas à gauche), avec un retard. */
export const GRAINES: Record<"entree" | "boucle" | "intro", [Graine, Graine, Graine]> = {
  /* Du bas : l'encre monte du jardin vers la maison. */
  entree: [[0.2, -0.08, 0], [0.66, -0.14, 0.1], [0.99, 0.22, 0.2]],
  /* Du haut : la nuit du dernier plan cède au ciel de la dalle. */
  boucle: [[-0.06, 1.04, 0], [0.45, 1.12, 0.1], [1.06, 0.62, 0.2]],
  /* Du bord droit, comme la vidéo d'encre du site de référence. */
  intro: [[1.06, 0.02, 0], [0.7, -0.12, 0.08], [1.1, 0.9, 0.16]],
};

/** Couleurs de la charte, en RVB 0–1 pour les shaders. */
export const TEINTES = {
  anthracite: [0.173, 0.18, 0.208] as const,
  craie: [0.949, 0.953, 0.953] as const,
  /* Liseré d'encre sur le film : un brun presque noir. */
  frangeFilm: [0.13, 0.105, 0.1] as const,
  /* Liseré sur l'aplat craie : la craie tirée vers le terracotta. */
  frangeIntro: [0.86, 0.765, 0.72] as const,
};

export interface ProgrammeGL {
  gl: WebGLRenderingContext;
  toile: HTMLCanvasElement;
  u: (nom: string) => WebGLUniformLocation | null;
}

/** `null` si WebGL manque ou si un shader ne compile pas : l'appelant se replie. */
export function creerProgramme(toile: HTMLCanvasElement, frag: string): ProgrammeGL | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = toile.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  } catch {
    return null;
  }
  if (!gl) return null;
  const g = gl;
  const compiler = (type: number, src: string) => {
    const s = g.createShader(type);
    if (!s) return null;
    g.shaderSource(s, src);
    g.compileShader(s);
    if (!g.getShaderParameter(s, g.COMPILE_STATUS)) {
      if (process.env.NODE_ENV === "development") console.warn(g.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = compiler(g.VERTEX_SHADER, VERT);
  const fs = compiler(g.FRAGMENT_SHADER, frag);
  const p = g.createProgram();
  if (!vs || !fs || !p) return null;
  g.attachShader(p, vs);
  g.attachShader(p, fs);
  g.linkProgram(p);
  if (!g.getProgramParameter(p, g.LINK_STATUS)) return null;
  g.useProgram(p);
  g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer());
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
  const a = g.getAttribLocation(p, "p");
  g.enableVertexAttribArray(a);
  g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
  /* Les images arrivent la tête en bas pour WebGL : on les retourne une
     fois pour toutes, et `vUv` garde son origine en bas à gauche. */
  g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, true);
  const cache = new Map<string, WebGLUniformLocation | null>();
  const u = (nom: string) => {
    if (!cache.has(nom)) cache.set(nom, g.getUniformLocation(p, nom));
    return cache.get(nom) ?? null;
  };
  return { gl: g, toile, u };
}

/** Texture liée une fois pour toutes à son unité, noire en attendant sa source. */
export function creerTexture(gl: WebGLRenderingContext, unite: number): WebGLTexture | null {
  const t = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unite);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  return t;
}

export function televerser(
  gl: WebGLRenderingContext,
  unite: number,
  texture: WebGLTexture | null,
  source: TexImageSource,
) {
  gl.activeTexture(gl.TEXTURE0 + unite);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
}

/** Ajuste la définition de la toile à sa taille affichée. Plafonnée : la
    tache d'encre coûte cher par pixel, et le film n'est qu'en 720p. */
export function dimensionner(p: ProgrammeGL | null, dprMax = 1.5) {
  if (!p) return;
  const r = p.toile.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, dprMax);
  const w = Math.round(r.width * dpr);
  const h = Math.round(r.height * dpr);
  if (p.toile.width !== w || p.toile.height !== h) {
    p.toile.width = w;
    p.toile.height = h;
  }
}

export function graines(p: ProgrammeGL, noms: [string, string, string], liste: [Graine, Graine, Graine]) {
  noms.forEach((n, i) => p.gl.uniform3fv(p.u(n), liste[i]));
}
