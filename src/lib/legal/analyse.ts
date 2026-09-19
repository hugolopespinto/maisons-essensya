import { NUM, PUCE } from "@/lib/markdown";
import { MOTIF_JETON } from "./jetons";

/* ════════════════════════════════════════════════════════════════
   L'ANALYSEUR DES CORPS LÉGAUX

   Il lit le même Markdown que le blog — la grammaire de blocs vient de
   `markdown.ts`, importée et non recopiée — mais il rend un ARBRE au
   lieu d'une chaîne HTML.

   ⚠ POURQUOI UN ARBRE, ET PAS `markdownToHtml`. Ces deux pages doivent
   continuer de porter trois choses qu'une chaîne HTML ne peut pas
   transporter : un bouton React qui rouvre le panneau de consentement,
   quinze mentions qui ont deux états — valeur saisie ou pavé surligné —
   et des listes de spécifications dont la mise en page a été mesurée au
   téléphone. Les rendre en JSX les garde vivantes, et surtout : aucun
   `dangerouslySetInnerHTML` de plus. React échappe, comme partout
   ailleurs sur le site. La frontière de confiance ne bouge pas d'un
   pouce, alors même qu'on ouvre ces pages à la saisie libre.

   ── DEUX AJOUTS À LA GRAMMAIRE DU BLOG ──

   · LES JETONS `{{…}}`, reconnus en ligne, au milieu d'une phrase. C'est
     indispensable : les quinze mentions ne sont PAS en fin de section,
     elles ponctuent les phrases — quatre dans la seule section
     « Assurances et garanties du constructeur ».

   · LES LIGNES DE SPÉCIFICATION `Terme :: Description`, qui rendent le
     composant SpecList. Sans elles, les trente et une lignes des six
     listes du site — les données collectées, les finalités, les huit
     droits RGPD — resteraient en code, c'est-à-dire hors de portée du
     client. C'est précisément le contenu qu'un juriste veut ajuster.

   ⚠ `::` A ÉTÉ CHOISI PARCE QU'IL NE PEUT PAS APPARAÎTRE PAR ACCIDENT
   dans une phrase française. Un simple `:` aurait transformé « Vos
   droits : » en ligne de tableau au premier passage.
   ════════════════════════════════════════════════════════════════ */

/** Une ligne « Terme :: Description ». */
const SPEC = /^(.+?)\s::\s(.*)$/;

export type Fragment =
  | { k: "texte"; v: string }
  | { k: "gras"; v: string }
  | { k: "ital"; v: string }
  | { k: "code"; v: string }
  | { k: "lien"; href: string; label: string }
  | { k: "jeton"; nom: string; arg?: string };

export type Noeud =
  | { t: "h2"; frags: Fragment[] }
  | { t: "h3"; frags: Fragment[] }
  | { t: "p"; frags: Fragment[] }
  | { t: "ul"; items: Fragment[][] }
  | { t: "ol"; items: Fragment[][] }
  | { t: "specs"; lignes: { terme: Fragment[]; valeur: Fragment[] }[] };

/* ── EN LIGNE ──
   L'ordre reproduit celui de `markdown.ts` : les jetons d'abord, parce
   qu'ils ne doivent jamais être coupés par une règle d'emphase ; puis
   les liens, dont l'URL ne doit pas être réécrite ; puis le gras avant
   l'italique, sinon `**mot**` se lirait comme deux `*`. */
const LIEN = /\[([^\]\n]*)\]\(([^)\s]+)\)/;
const GRAS = /\*\*([^\n]+?)\*\*/;
const ITAL = /(?<![*\w])\*([^*\n]+?)\*(?!\*)/;
/* Le code en ligne rend un identifiant technique en chasse fixe — c'est
   ainsi que la page d'origine affichait le domaine de notre
   sous-traitant. Sans cette règle, la transcription l'aurait aplati en
   texte ordinaire, et le client n'aurait eu aucun moyen de le rétablir. */
const CODE = /`([^`\n]+?)`/;

/** Seuls les chemins internes et les adresses http(s) sont acceptés. */
function hrefSur(href: string): string | null {
  if (/^(\/|#)/.test(href)) return href;
  if (/^https?:\/\//i.test(href)) return href;
  if (/^mailto:/i.test(href)) return href;
  return null;
}

export function fragments(texte: string): Fragment[] {
  if (!texte) return [];

  /* Les jetons découpent la chaîne avant tout le reste : une règle
     d'emphase ne doit jamais pouvoir couper `{{champ:dpo}}` en deux. */
  const parts: Fragment[] = [];
  const motif = new RegExp(MOTIF_JETON.source, "g");
  let curseur = 0;
  let m: RegExpExecArray | null;
  while ((m = motif.exec(texte))) {
    if (m.index > curseur) parts.push(...sansJeton(texte.slice(curseur, m.index)));
    parts.push({ k: "jeton", nom: m[1], ...(m[2] ? { arg: m[2] } : {}) });
    curseur = m.index + m[0].length;
  }
  if (curseur < texte.length) parts.push(...sansJeton(texte.slice(curseur)));
  return parts;
}

function sansJeton(texte: string): Fragment[] {
  const lien = LIEN.exec(texte);
  if (lien) {
    const href = hrefSur(lien[2]);
    const avant = texte.slice(0, lien.index);
    const apres = texte.slice(lien.index + lien[0].length);
    /* URL refusée : on garde le libellé en texte plutôt que de faire
       disparaître du contenu sans que l'auteur comprenne pourquoi. */
    const noeud: Fragment = href
      ? { k: "lien", href, label: lien[1] }
      : { k: "texte", v: lien[1] || lien[0] };
    return [...sansJeton(avant), noeud, ...sansJeton(apres)];
  }

  const code = CODE.exec(texte);
  if (code) {
    return [
      ...sansJeton(texte.slice(0, code.index)),
      { k: "code", v: code[1] },
      ...sansJeton(texte.slice(code.index + code[0].length)),
    ];
  }

  const gras = GRAS.exec(texte);
  if (gras) {
    return [
      ...sansJeton(texte.slice(0, gras.index)),
      { k: "gras", v: gras[1] },
      ...sansJeton(texte.slice(gras.index + gras[0].length)),
    ];
  }

  const ital = ITAL.exec(texte);
  if (ital) {
    return [
      ...sansJeton(texte.slice(0, ital.index)),
      { k: "ital", v: ital[1] },
      ...sansJeton(texte.slice(ital.index + ital[0].length)),
    ];
  }

  return texte ? [{ k: "texte", v: texte }] : [];
}

/* ── BLOCS ── */

function rendreLignes(lignes: string[], out: Noeud[]): void {
  if (lignes.length === 0) return;
  const premiere = lignes[0];

  const h3 = /^###\s+(.*)$/.exec(premiere);
  if (h3) {
    out.push({ t: "h3", frags: fragments(h3[1].trim()) });
    rendreLignes(lignes.slice(1), out);
    return;
  }
  const h2 = /^##\s+(.*)$/.exec(premiere);
  if (h2) {
    out.push({ t: "h2", frags: fragments(h2[1].trim()) });
    rendreLignes(lignes.slice(1), out);
    return;
  }

  /* Un bloc dont TOUTES les lignes portent `::` est une liste de
     spécifications. Exiger toutes les lignes évite qu'une phrase
     contenant deux-points doubles n'emporte le paragraphe entier. */
  if (SPEC.test(premiere) && lignes.every((l) => SPEC.test(l.trim()))) {
    out.push({
      t: "specs",
      lignes: lignes.map((l) => {
        const s = SPEC.exec(l.trim()) as RegExpExecArray;
        return { terme: fragments(s[1].trim()), valeur: fragments(s[2].trim()) };
      }),
    });
    return;
  }

  for (const [motif, t] of [
    [PUCE, "ul"],
    [NUM, "ol"],
  ] as const) {
    if (motif.test(premiere)) {
      const items: string[] = [];
      for (const ligne of lignes) {
        const x = motif.exec(ligne.trim());
        if (x) items.push(x[1].trim());
        /* Ligne de continuation : elle prolonge l'entrée précédente. */
        else if (items.length) items[items.length - 1] += ` ${ligne.trim()}`;
      }
      out.push({ t, items: items.map(fragments) });
      return;
    }
  }

  /* Paragraphe : les retours à la ligne simples sont conservés comme
     des espaces — un corps légal n'a pas d'usage du `<br />`, et les
     conserver ferait dépendre la mise en page de la largeur du champ
     de saisie. */
  out.push({ t: "p", frags: fragments(lignes.map((l) => l.trim()).join(" ")) });
}

/** Découpe un corps Markdown en arbre. */
export function analyserMarkdown(source: string): Noeud[] {
  if (!source) return [];
  const out: Noeud[] = [];
  for (const brut of source.replace(/\r\n?/g, "\n").split(/\n{2,}/)) {
    const bloc = brut.trim();
    if (bloc) rendreLignes(bloc.split("\n"), out);
  }
  return out;
}
