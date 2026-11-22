"use client";
import { useEffect, useRef } from "react";

/* Le rail collant de /etapes-de-construction (maquette approuvée, artefact
   Mg4eyRfwPAFJL8B56qJwjC, #etapes) : la maison se construit au fil de la
   lecture, et le rail (ou la barre mobile) suit l'étape la plus visible.

   Les neuf sections .ph sont rendues par le Server Component parent : ce
   composant les retrouve par id plutôt que de les recevoir en props, pour
   rester léger et laisser leur texte au rendu serveur. */

const COUCHES: { de: number; a: number; contenu: React.ReactNode }[] = [
  {
    de: 2,
    a: 9,
    contenu: (
      <g stroke="#62686D" strokeWidth="1.5">
        <path d="M40 150v-14M240 150v-14" />
        <path d="M40 136l6 3-6 3M240 136l6 3-6 3" fill="#B12D5B" stroke="none" />
      </g>
    ),
  },
  {
    de: 1,
    a: 5,
    contenu: (
      <g fill="none" stroke="#62686D" strokeWidth="1.3" strokeDasharray="5 4">
        <path d="M70 150V92H210V150" />
        <path d="M58 92L140 62L222 92Z" />
      </g>
    ),
  },
  {
    de: 3,
    a: 4,
    contenu: (
      <g fill="none" stroke="#566D58">
        <path d="M70 166H210M70 161v10M210 161v10" />
        <path d="M246 92V150M241 92h10M241 150h10" />
        <path d="M112 92V150M168 92V150" strokeDasharray="2 3" />
      </g>
    ),
  },
  {
    de: 4,
    a: 4,
    contenu: (
      <g>
        <rect x="222" y="14" width="40" height="50" fill="#FFFFFF" stroke="#2C2E35" />
        <path d="M229 26h26M229 34h26M229 42h16" stroke="#B3B7BA" />
        <circle cx="250" cy="54" r="6" fill="#B12D5B" />
      </g>
    ),
  },
  {
    de: 5,
    a: 5,
    contenu: (
      <g>
        <path d="M244 150V96" stroke="#62686D" strokeWidth="2" />
        <rect x="224" y="66" width="40" height="30" fill="#FFFFFF" stroke="#2C2E35" />
        <path d="M231 76h26M231 85h26" stroke="#B3B7BA" />
      </g>
    ),
  },
  {
    de: 6,
    a: 9,
    contenu: (
      <g>
        <rect x="64" y="150" width="152" height="10" fill="#B3B7BA" />
        <rect x="70" y="92" width="140" height="58" fill="#E5E7E8" stroke="#62686D" />
        <path d="M58 92L140 62L222 92Z" fill="#7C838A" />
        <rect x="86" y="108" width="28" height="22" fill="#62686D" /><rect x="166" y="108" width="28" height="22" fill="#62686D" /><rect x="130" y="112" width="20" height="38" fill="#62686D" />
      </g>
    ),
  },
  {
    de: 7,
    a: 8,
    contenu: (
      <g fill="none" strokeWidth="1.6">
        <path d="M78 142V100H202V142" stroke="#C87160" />
        <path d="M122 92V150M158 92V150" stroke="#2C2E35" />
        <path d="M98 142V118M186 142V118" stroke="#566D58" />
      </g>
    ),
  },
  {
    de: 8,
    a: 8,
    contenu: (
      <g fill="#B12D5B">
        <circle cx="234" cy="124" r="5" /><path d="M228 150v-14q0-6 6-6t6 6v14z" />
      </g>
    ),
  },
  {
    de: 9,
    a: 9,
    contenu: (
      <g>
        <path d="M14 150H266V160H14Z" fill="#E4EAE5" />
        <rect x="64" y="150" width="152" height="4" fill="#B3B7BA" />
        <rect x="70" y="92" width="140" height="58" fill="#FFFFFF" stroke="#62686D" />
        <path d="M58 92L140 62L222 92Z" fill="#C87160" />
        <rect x="86" y="108" width="28" height="22" fill="#2C2E35" /><rect x="166" y="108" width="28" height="22" fill="#2C2E35" /><rect x="130" y="112" width="20" height="38" fill="#B12D5B" />
        <path d="M242 150V110" stroke="#62686D" strokeWidth="3" /><ellipse cx="242" cy="102" rx="17" ry="11" fill="#77957A" />
      </g>
    ),
  },
];

export default function EtapesNav({ nav, legendes }: { nav: string[]; legendes: string[] }) {
  const legRef = useRef<HTMLParagraphElement>(null);
  const linksRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const layersRef = useRef<(SVGGElement | null)[]>([]);
  const mobileTxtRef = useRef<HTMLParagraphElement>(null);
  const mobileBarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".ph"));
    if (sections.length === 0) return;

    function etape(s: HTMLElement) {
      const n = Number(s.dataset.n);
      layersRef.current.forEach((c, i) => {
        if (!c) return;
        const { de, a } = COUCHES[i];
        c.style.opacity = n >= de && n <= a ? "1" : "0";
      });
      if (legRef.current) legRef.current.textContent = legendes[n - 1] ?? "";
      linksRef.current.forEach((a, i) => a?.classList.toggle("actif", i === n - 1));
      if (mobileTxtRef.current) mobileTxtRef.current.textContent = `Étape ${n} sur 9 : ${nav[n - 1]?.toLowerCase() ?? ""}`;
      if (mobileBarRef.current) mobileBarRef.current.style.width = `${(n / 9) * 100}%`;
    }

    function suivre() {
      const repere = window.innerHeight * 0.45;
      let active = sections[0];
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.height && r.top <= repere) active = s;
      }
      etape(active);
    }

    window.addEventListener("scroll", suivre, { passive: true });
    window.addEventListener("resize", suivre);
    suivre();
    return () => {
      window.removeEventListener("scroll", suivre);
      window.removeEventListener("resize", suivre);
    };
  }, [nav, legendes]);

  return (
    <>
      <aside className="pe-rail" aria-label="Avancement du guide">
        <div className="pe-rail__dessin">
          <svg viewBox="0 0 280 190" role="img" aria-label="Dessin de la maison, qui se construit à mesure de la lecture">
            <line x1="14" y1="150" x2="266" y2="150" stroke="#2C2E35" strokeWidth="1.5" />
            {COUCHES.map((c, i) => (
              <g key={i} className="pe-c-h" ref={(el) => { layersRef.current[i] = el; }} style={{ opacity: i === 0 ? 1 : 0 }}>
                {c.contenu}
              </g>
            ))}
          </svg>
          <p className="pe-rail__leg" ref={legRef}>{legendes[0]}</p>
        </div>
        <nav className="pe-rail__l" aria-label="Les neuf étapes">
          {nav.map((n, i) => (
            <a
              href={`#ph-${i + 1}`}
              key={n}
              className={i === 0 ? "actif" : undefined}
              ref={(el) => { linksRef.current[i] = el; }}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>{n}
            </a>
          ))}
        </nav>
      </aside>
      <div className="pe-mobile">
        <p ref={mobileTxtRef}>Étape 1 sur 9&nbsp;: projet et budget</p>
        <div className="pe-mobile__j"><i ref={mobileBarRef} style={{ width: "11.112%" }} /></div>
      </div>
    </>
  );
}
