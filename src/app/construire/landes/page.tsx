import type { Metadata } from "next";
import PageRedactionnelle from "@/components/PageRedactionnelle";
import { BUDGET, CHAPO, CORPS, FAQ, SUITE, TITRE } from "@/data/redactionnel/landes";
import { resolveMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/construire/landes", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Construction de maisons dans les Landes",
  description:
    "Construire dans les Landes : les étapes, les règles locales, le budget, les styles de maisons et le rôle d'un constructeur implanté dans le département.",
  alternates: { canonical: "/construire/landes" },
};

export default function Page() {
  return (
    <PageRedactionnelle
      fil={[{ nom: "Accueil", path: "/" }, { nom: "Construire dans les Landes" }]}
      titre={TITRE}
      chapo={CHAPO}
      corps={CORPS}
      suite={SUITE}
      faq={FAQ}
      titreFaq="FAQ pour faire construire sa maison dans les Landes"
      liens={[
        { href: "/agences", label: "Prendre rendez-vous en agence" },
        { href: "/maisons", label: "Découvrir nos modèles" },
        { href: "/contact", label: "Demander une étude de faisabilité" },
        { href: "/annonces", label: "Voir nos annonces" },
      ]}
    >
      <div className="r-tableau">
        <table>
          <thead>
            <tr>
              {BUDGET[0].map((c) => (
                <th scope="col" key={c}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BUDGET.slice(1).map((l) => (
              <tr key={l[0]}>
                {l.map((c) => (
                  <td key={c}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageRedactionnelle>
  );
}
