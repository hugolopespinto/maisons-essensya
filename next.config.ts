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
      /* /plans-de-maison n est pas une page : c est le dossier des quatre
         pages par nombre de chambres. Un visiteur qui raccourcit l URL
         doit arriver sur la gamme, pas sur une 404. */
      { source: "/plans-de-maison", destination: "/maisons", permanent: true },
    ];
  },
};

export default nextConfig;
