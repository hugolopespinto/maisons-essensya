"use client";
import { useState } from "react";

/* La coupe de terrain interactive de la page Landes (maquette approuvée,
   artefact Mg4eyRfwPAFJL8B56qJwjC, #pl-coupe) : survoler ou cliquer un
   intitulé isole sa zone sur le dessin. Fixé au clic, repris au survol. */

const ZONES = ["sol", "feu", "nappe", "assain"] as const;
type Zone = (typeof ZONES)[number];

export default function CoupeTerrain({ parts }: { parts: { titre: string; texte: string }[] }) {
  const [fixe, setFixe] = useState<Zone | null>(null);
  const [survol, setSurvol] = useState<Zone | null>(null);
  const actif = survol ?? fixe;

  return (
    <>
      <div className="coupe-cadre">
        <svg
          className="coupe"
          viewBox="190 0 1010 420"
          role="img"
          aria-label="Coupe schématique d'un terrain landais : une maison sur ses fondations, l'assainissement, la nappe phréatique et la forêt de pins"
          data-actif={actif ?? undefined}
        >
          <defs>
            <pattern id="sable" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1" fill="#C9CBCD" opacity=".45" /><circle cx="11" cy="11" r="1" fill="#C9CBCD" opacity=".3" /></pattern>
            <pattern id="eau" width="26" height="10" patternUnits="userSpaceOnUse"><path d="M0 5q6.5-5 13 0t13 0" fill="none" stroke="#A7BFAA" strokeWidth="1" opacity=".55" /></pattern>
            <pattern id="deb" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="#E3A897" strokeWidth="1" opacity=".5" /></pattern>
          </defs>
          <rect x="0" y="215" width="1200" height="205" fill="#2C2E35" opacity=".55" />
          <rect x="0" y="215" width="1200" height="205" fill="url(#sable)" />
          <line x1="0" y1="215" x2="1200" y2="215" stroke="#E5E7E8" strokeWidth="1.4" />

          <g data-z="nappe">
            <rect x="0" y="345" width="1200" height="75" fill="url(#eau)" />
            <line x1="0" y1="345" x2="1200" y2="345" stroke="#A7BFAA" strokeWidth="1.4" />
            <line x1="0" y1="300" x2="1200" y2="300" stroke="#A7BFAA" strokeWidth="1.2" strokeDasharray="6 6" />
            <text className="pet" x="770" y="293" style={{ fill: "#A7BFAA" }}>NIVEAU D&apos;HIVER, PROCHE DE LA SURFACE</text>
            <text x="770" y="385" style={{ fill: "#A7BFAA" }}>NAPPE PHRÉATIQUE</text>
          </g>

          <g data-z="sol">
            <rect x="452" y="215" width="256" height="20" fill="#C9CBCD" opacity=".25" />
            <rect x="452" y="215" width="26" height="44" fill="#C9CBCD" /><rect x="682" y="215" width="26" height="44" fill="#C9CBCD" /><rect x="567" y="215" width="26" height="44" fill="#C9CBCD" />
            <rect x="442" y="259" width="46" height="10" fill="#E5E7E8" /><rect x="672" y="259" width="46" height="10" fill="#E5E7E8" /><rect x="557" y="259" width="46" height="10" fill="#E5E7E8" />
            <text x="530" y="288">SOL SABLEUX, FONDATIONS</text>
          </g>

          <rect x="460" y="130" width="240" height="85" fill="#F2F3F3" />
          <path d="M436 132L580 86L724 132Z" fill="#C87160" />
          <rect x="560" y="164" width="30" height="51" fill="#B12D5B" />
          <rect x="484" y="156" width="52" height="34" fill="#62686D" />
          <rect x="620" y="156" width="52" height="34" fill="#62686D" />

          <g data-z="assain">
            <path d="M460 228H386" fill="none" stroke="#E3A897" strokeWidth="2" />
            <rect x="330" y="222" width="56" height="38" rx="3" fill="#E3A897" />
            <path d="M330 241H226" fill="none" stroke="#E3A897" strokeWidth="2" strokeDasharray="10 5" />
            <text x="222" y="280">ASSAINISSEMENT</text>
          </g>

          <g data-z="feu">
            <rect x="735" y="195" width="85" height="20" fill="url(#deb)" />
            <path d="M735 185v-8h85v8" fill="none" stroke="#E3A897" />
            <text className="pet" x="735" y="154" style={{ fill: "#E3A897" }}>ABORDS</text><text className="pet" x="735" y="170" style={{ fill: "#E3A897" }}>DÉBROUSSAILLÉS</text>
            <text x="870" y="60">RISQUE FEU DE FORÊT</text>
            <g fill="#77957A" stroke="none">
              <path d="M866 215h6v-110h-6z" fill="#62686D" /><ellipse cx="869" cy="100" rx="38" ry="20" />
              <path d="M952 215h6v-130h-6z" fill="#62686D" /><ellipse cx="955" cy="84" rx="44" ry="22" />
              <path d="M1040 215h6v-118h-6z" fill="#62686D" /><ellipse cx="1043" cy="93" rx="40" ry="20" />
              <path d="M1122 215h6v-134h-6z" fill="#62686D" /><ellipse cx="1125" cy="78" rx="42" ry="22" />
            </g>
          </g>
        </svg>
      </div>
      <div className="parts">
        {ZONES.map((z, i) => (
          <button
            type="button"
            key={z}
            className={`part${fixe === z ? " actif" : ""}`}
            onMouseEnter={() => setSurvol(z)}
            onMouseLeave={() => setSurvol(null)}
            onClick={() => setFixe((f) => (f === z ? null : z))}
          >
            <h3>{parts[i].titre}</h3>
            <p>{parts[i].texte}</p>
          </button>
        ))}
      </div>
    </>
  );
}
