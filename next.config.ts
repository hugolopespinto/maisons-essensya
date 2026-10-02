import type { NextConfig } from "next";

/* ════════════════════════════════════════════════════════════════
   REDIRECTIONS — ce que le basculement en gamme a déplacé

   Le site a été conçu sur une maison unique et deux déclinaisons
   inventées, « 2-chambres » et « 3-chambres ». Elles avaient leurs URL,
   et ces URL figuraient au sitemap, dans le pied de page et dans
   l'écran Référencement du back-office.

   ⚠ ON NE LES LAISSE PAS TOMBER EN 404. Une adresse publiée a pu être
   partagée, mise en favori ou explorée par Google. Une redirection
   permanente transmet ce qu'elle a accumulé vers la page qui la
   remplace ; une 404 le perd et remplit la Search Console d'erreurs que
   le client verra avant nous.

   `permanent: true` = 308 : navigateurs et moteurs la retiennent. C'est
   le bon choix ici, ces pages ne reviendront pas.

   ⚠ AUCUN IMPORT DEPUIS src/ DANS CE FICHIER. Next charge sa
   configuration dans un contexte séparé, où les modules applicatifs et
   leurs imports JSON ne se résolvent pas comme dans l'application — la
   tentative a fait échouer le build avec « modeles is not a function ».
   Le garde-fou de collision entre ces slugs et ceux de la gamme vit donc
   dans src/data/gamme.ts, à côté du catalogue qu'il surveille.
   ════════════════════════════════════════════════════════════════ */
const ANCIENNES_DECLINAISONS = ["2-chambres", "3-chambres"];

/* Les quatre pages « plans de maison » par nombre de chambres. Elles
   étaient en préparation ; la navigation mène désormais au listing des
   annonces, filtré sur ce nombre de chambres (`?chambres=N`). */
const PLANS_PAR_CHAMBRES: [string, number][] = [
  ["1-chambre", 1],
  ["2-chambres", 2],
  ["3-chambres", 3],
  ["4-chambres", 4],
];

const nextConfig: NextConfig = {
  images: {
    /* ⚠ Unsplash a été retiré : les douze photos de calage ont disparu
       avec le passage aux rendus du client, et laisser le domaine
       autorisé inviterait à en réintroduire. */
    remotePatterns: [{ protocol: "https", hostname: "pro.vitahome.fr" }],
    formats: ["image/avif", "image/webp"],
  },

  async redirects() {
    return [
      ...ANCIENNES_DECLINAISONS.map((slug) => ({
        source: `/maisons/${slug}`,
        destination: "/maisons",
        permanent: true,
      })),
      /* /plans-de-maison n est pas une page : c était le dossier des
         quatre pages par nombre de chambres. Un visiteur qui raccourcit
         l URL doit arriver sur la gamme, pas sur une 404. */
      { source: "/plans-de-maison", destination: "/maisons", permanent: true },
      /* ⚠ TEMPORAIRES (307), À LA DIFFÉRENCE DES PRÉCÉDENTES. Ces adresses
         n ont jamais été indexées (noindex, hors sitemap) et elles
         pourront redevenir de vraies pages quand les plans par nombre de
         chambres seront livrés : une 308 serait retenue par les
         navigateurs, et la page revenue resterait invisible à ceux qui
         l ont déjà visitée. */
      ...PLANS_PAR_CHAMBRES.map(([slug, n]) => ({
        source: `/plans-de-maison/${slug}`,
        destination: `/annonces?chambres=${n}`,
        permanent: false,
      })),
    ];
  },
};

export default nextConfig;
