import Link from "next/link";
import type { ReactNode } from "react";
import ACompleter from "@/components/ACompleter";
import CookiePrefsLink from "@/components/CookiePrefsLink";
import { analyserMarkdown, type Fragment, type Noeud } from "@/lib/legal/analyse";
import { MENTIONS } from "@/lib/legal/jetons";

/* ════════════════════════════════════════════════════════════════
   LE RENDU D'UN CORPS LÉGAL

   Il reproduit, à l'identique, le balisage que les deux pages
   écrivaient en dur : `<h2>` à `--fs-h3`, paragraphes en
   `u-muted u-measure`, listes de spécifications en `.c-specs`. Le
   témoin (scripts/legal-diff.mjs) compare l'avant et l'après et exige
   un texte strictement identique ; la charpente n'a droit qu'aux écarts
   qu'on sait expliquer.

   ⚠ PAS UN SEUL `dangerouslySetInnerHTML`. C'est le point qui décide de
   tout : on ouvre deux pages à la saisie libre sans déplacer d'un pouce
   la frontière de confiance. React échappe ce qu'il rend, comme partout
   ailleurs sur le site. Un rendu en chaîne HTML aurait obligé à faire
   confiance au convertisseur sur les deux pages où une injection coûte
   le plus cher.

   ⚠ L'ANCRE EST POSÉE SUR LE PREMIER `<h2>`, pas sur un conteneur. Les
   dix-neuf identifiants existants vivent sur les `<h2>` — c'est là que
   pointent les liens, et c'est ce que le relevé de structure enregistre.
   Elle vient du code, jamais du texte saisi : un client qui réécrit un
   titre ne peut pas faire disparaître une ancre.
   ════════════════════════════════════════════════════════════════ */

export interface ContexteLegal {
  /** Les quinze mentions, telles que saisies dans le back-office. */
  valeurs: (cle: string) => string;
  /** Le téléphone publiable, résolu depuis les Réglages. */
  tel: string;
  /** L'adresse de contact publiable, même origine. */
  email: string;
  /** La date de dernière mise à jour affichée sur la page. */
  date: string;
}

/** Un jeton que le code ne connaît pas : on le montre au lieu de le taire. */
function JetonInconnu({ brut }: { brut: string }) {
  return (
    <mark
      style={{
        background: "var(--alerte-fond)",
        color: "var(--alerte)",
        fontFamily: "var(--f-mono)",
        fontSize: "var(--fs-small)",
        padding: ".1em .4em",
        borderRadius: "var(--radius)",
      }}
    >
      {brut}
    </mark>
  );
}

function rendreFragment(f: Fragment, ctx: ContexteLegal, cle: number): ReactNode {
  switch (f.k) {
    case "texte":
      return <span key={cle}>{f.v}</span>;
    case "gras":
      return <strong key={cle}>{f.v}</strong>;
    case "ital":
      return <em key={cle}>{f.v}</em>;
    case "code":
      return (
        <span key={cle} style={{ fontFamily: "var(--f-mono)" }}>
          {f.v}
        </span>
      );
    case "lien": {
      /* Un chemin interne passe par `next/link` — la navigation reste
         instantanée, comme avant la migration. Une adresse externe garde
         `noopener noreferrer`, comme le lien CNIL qu'elle remplace. */
      if (f.href.startsWith("/") || f.href.startsWith("#")) {
        return (
          <Link key={cle} href={f.href} className="c-link">
            {f.label}
          </Link>
        );
      }
      const externe = /^https?:/i.test(f.href);
      return (
        <a
          key={cle}
          href={f.href}
          className="c-link"
          {...(externe ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {f.label}
        </a>
      );
    }
    case "jeton": {
      if (f.nom === "champ" && f.arg && f.arg in MENTIONS) {
        /* Le texte du pavé porte déjà ses doubles crochets : il a été
           repris mot pour mot des pages d'origine, où ils faisaient
           partie de la chaîne. Les rajouter ici les doublerait. */
        return <ACompleter key={cle} texte={MENTIONS[f.arg].pave} valeur={ctx.valeurs(f.arg)} />;
      }
      /* Le bouton exact de la page d'origine, libellé compris. C'est le
         seul point d'accès permanent au retrait du consentement : la
         CNIL impose qu'il soit aussi simple à trouver que l'acceptation
         l'a été. Un client qui réécrit ce paragraphe ne peut pas le
         supprimer — la validation du back-office refuse l'enregistrement
         d'un corps qui a perdu ce jeton. */
      if (f.nom === "cookies")
        return (
          <CookiePrefsLink key={cle} className="c-btn c-btn--solid">
            Modifier mes préférences <span className="arrow">→</span>
          </CookiePrefsLink>
        );
      if (f.nom === "tel") return <span key={cle}>{ctx.tel}</span>;
      /* L'adresse est cliquable des deux côtés où elle apparaît : dans la
         fiche d'identité de l'éditeur, et au point « Vos droits », où
         c'est par elle que s'exerce une demande d'effacement. La rendre
         en texte simple ferait perdre un clic à quelqu'un qui exerce un
         droit. */
      if (f.nom === "email")
        return (
          <a key={cle} href={`mailto:${ctx.email}`} className="c-link" style={{ display: "inline" }}>
            {ctx.email}
          </a>
        );
      if (f.nom === "date") return <span key={cle}>{ctx.date}</span>;
      /* Jeton mal orthographié : visible, jamais silencieux. Une mention
         légale qui disparaîtrait parce qu'un `s` manque serait le pire
         des deux maux. La validation du back-office refuse d'ailleurs
         l'enregistrement — ceci n'est que le dernier filet. */
      return <JetonInconnu key={cle} brut={`{{${f.nom}${f.arg ? ":" + f.arg : ""}}}`} />;
    }
  }
}

const rendre = (frags: Fragment[], ctx: ContexteLegal) =>
  frags.map((f, i) => rendreFragment(f, ctx, i));

export default function ProseLegale({
  md,
  ctx,
  ancre,
}: {
  md: string;
  ctx: ContexteLegal;
  /** Posée sur le premier `<h2>` du corps. Vient du code, jamais du texte. */
  ancre?: string;
}) {
  const noeuds: Noeud[] = analyserMarkdown(md);
  /* ⚠ CALCULÉ AVANT LA BOUCLE, pas au fil du rendu. Un drapeau modifié
     pendant un `map` est un effet de bord dans le rendu, que le React
     Compiler refuse — à raison : le résultat dépendrait de l'ordre
     d'évaluation. L'indice, lui, est une donnée. */
  const indexPremierH2 = noeuds.findIndex((n) => n.t === "h2");

  return (
    <>
      {noeuds.map((n, i) => {
        switch (n.t) {
          case "h2": {
            const id = i === indexPremierH2 ? ancre : undefined;
            return (
              <h2 key={i} id={id} style={{ fontSize: "var(--fs-h3)", marginTop: "var(--s-5)" }}>
                {rendre(n.frags, ctx)}
              </h2>
            );
          }
          case "h3":
            return (
              <h3 key={i} style={{ fontSize: "1rem", marginTop: "var(--s-4)" }}>
                {rendre(n.frags, ctx)}
              </h3>
            );
          case "p": {
            /* ⚠ UN PARAGRAPHE QUI NE PORTE QU'UNE MENTION N'EST PAS DE LA
               PROSE. Le code d'origine le rendait sans `u-muted` ni
               `u-measure` : le pavé surligné doit ressortir, pas se fondre
               dans le gris du commentaire, et il n'a pas de largeur de
               lecture à respecter. Reproduire cette exception est ce qui
               permet au témoin de ne montrer aucun écart de rendu. */
            const seuleMention =
              n.frags.length === 1 && n.frags[0].k === "jeton" && n.frags[0].nom === "champ";
            return (
              <p
                key={i}
                className={seuleMention ? undefined : "u-muted u-measure"}
                style={{ marginTop: "var(--s-2)" }}
              >
                {rendre(n.frags, ctx)}
              </p>
            );
          }
          case "ul":
            return (
              <ul key={i} className="u-muted u-measure" style={{ marginTop: "var(--s-2)" }}>
                {n.items.map((it, j) => (
                  <li key={j}>{rendre(it, ctx)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="u-muted u-measure" style={{ marginTop: "var(--s-2)" }}>
                {n.items.map((it, j) => (
                  <li key={j}>{rendre(it, ctx)}</li>
                ))}
              </ol>
            );
          case "specs":
            /* Le balisage exact de `SpecList` : c'est lui que cible la
               règle mobile de base.css, écrite après avoir mesuré ces
               lignes à 360 px sur /confidentialite. */
            return (
              <ul key={i} className="c-specs" style={{ marginTop: "var(--s-3)" }}>
                {n.lignes.map((l, j) => (
                  <li key={j}>
                    <span>{rendre(l.terme, ctx)}</span>
                    <span>{rendre(l.valeur, ctx)}</span>
                  </li>
                ))}
              </ul>
            );
        }
      })}
    </>
  );
}
