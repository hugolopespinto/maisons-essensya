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

/* ════════════════════════════════════════════════════════════════
   EN-TÊTES DE SÉCURITÉ

   Ils vivaient dans netlify.toml, donc n'existaient que chez Netlify.
   Posés ici, ils suivent le site chez n'importe quel hébergeur — Clever
   Cloud aujourd'hui — puisque c'est le serveur Next qui les envoie.

   La CSP est calquée sur ce que le site charge RÉELLEMENT, vérifié
   source par source — une CSP recopiée d'un modèle casse soit le site,
   soit rien du tout. Directive par directive :

     default-src 'self'
         Socle : tout ce qui n'est pas listé plus bas est refusé hors
         du domaine.

     base-uri 'self' · object-src 'none' · form-action 'self'
         Trois verrous sans contrepartie : pas de <base> injecté, pas de
         plugin, et aucun formulaire ne peut POSTer ailleurs que sur le
         site — ce qui compte quand les formulaires portent des
         coordonnées.

     frame-ancestors 'self'
         Anti-clickjacking, version moderne de X-Frame-Options (conservé
         plus bas pour les navigateurs anciens).

     script-src 'self' 'unsafe-inline' + Google Tag Manager / Analytics
         ⚠ 'unsafe-inline' est un compromis assumé : Next injecte ses
         propres scripts inline, et le défaut Consent Mode v2 est un
         <script> brut dans le <head> — c'est ce qui garantit qu'il
         s'exécute avant GTM. S'en passer demande une CSP à nonce, donc
         un rendu dynamique de chaque page. Aucun 'unsafe-eval' : rien
         n'en a besoin, et c'est celui qui compte vraiment.

     style-src 'self' 'unsafe-inline'
         'unsafe-inline' couvre les style={{…}} de React. Pas de
         fonts.googleapis.com : next/font télécharge les polices au build.

     img-src
         Les images du site et les data-URI ; pro.vitahome.fr et
         annonces.vitahome.fr pour les photos du flux ; data.geopf.fr pour
         les tuiles IGN des cartes ; les pixels Google ; et LE STOCKAGE
         DE LA MÉDIATHÈQUE (Cellar), dont les adresses signées sont
         servies directement au navigateur — sans lui, toute image
         téléversée serait bloquée.

     connect-src
         Le site lui-même (/api/leads, /api/communes) et la télémétrie
         GA4, qui a plusieurs points de collecte régionaux.

     frame-src https://www.googletagmanager.com
         L'unique <iframe> du site est le <noscript> de GTM.

     media-src 'self' data: blob:
         TODO conformité — [[À COMPLÉTER : domaine d'hébergement des
         vidéos de visite]] : l'ajouter ici le jour où le client fournit
         ses vidéos, et le citer dans la politique de confidentialité.

   Volontairement PAS de report-uri / report-to : il faudrait un
   collecteur, donc un tiers de plus dans le registre des traitements.
   ════════════════════════════════════════════════════════════════ */

/* L'origine du stockage de la médiathèque, lue comme le fait
   src/lib/stockage.ts (que ce fichier ne peut pas importer, voir plus
   haut). ⚠ Évaluée AU BUILD : les variables du stockage doivent être
   définies chez l'hébergeur avant la construction. */
function origineStockage(): string {
  const brut = (process.env.S3_ENDPOINT || process.env.CELLAR_ADDON_HOST || "")
    .trim()
    .replace(/\/+$/, "");
  if (!brut) return "";
  try {
    return new URL(/^https?:\/\//i.test(brut) ? brut : `https://${brut}`).origin;
  } catch {
    return "";
  }
}

const GOOGLE_SCRIPTS = [
  "https://www.googletagmanager.com",
  "https://tagmanager.google.com",
  "https://www.google-analytics.com",
  "https://ssl.google-analytics.com",
];

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  `script-src 'self' 'unsafe-inline' ${GOOGLE_SCRIPTS.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  [
    "img-src 'self' data: blob:",
    "https://pro.vitahome.fr",
    "https://annonces.vitahome.fr",
    "https://data.geopf.fr",
    "https://www.googletagmanager.com",
    "https://tagmanager.google.com",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    origineStockage(),
  ]
    .filter(Boolean)
    .join(" "),
  [
    "connect-src 'self'",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://stats.g.doubleclick.net",
  ].join(" "),
  "frame-src https://www.googletagmanager.com",
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  /* `X-Powered-By: Next.js` n'apprend rien d'utile au visiteur, et tout
     à qui cherche une version vulnérable. */
  poweredByHeader: false,

  images: {
    /* ⚠ Unsplash a été retiré : les douze photos de calage ont disparu
       avec le passage aux rendus du client, et laisser le domaine
       autorisé inviterait à en réintroduire. */
    remotePatterns: [{ protocol: "https", hostname: "pro.vitahome.fr" }],
    formats: ["image/avif", "image/webp"],
  },

  async redirects() {
    return [
      /* Ces trois pages sont devenues des sections de /concept (retour du
         client du 01/11). */
      { source: "/qui-sommes-nous", destination: "/concept#qui-sommes-nous", permanent: true },
      { source: "/accompagnement", destination: "/concept#accompagnement", permanent: true },
      { source: "/equipes", destination: "/concept#equipes", permanent: true },
      ...ANCIENNES_DECLINAISONS.map((slug) => ({
        source: `/maisons/${slug}`,
        destination: "/maisons",
        permanent: true,
      })),
      /* /plans-de-maison n est pas une page : c est le dossier des
         quatre pages par nombre de chambres. Un visiteur qui raccourcit
         l URL doit arriver sur la gamme, pas sur une 404.

         Ces quatre pages ont redirigé un temps vers /annonces?chambres=N,
         en 307 justement pour pouvoir revenir : elles sont revenues
         (src/app/plans-de-maison/[chambres]), aucun navigateur n a
         retenu l ancienne destination. */
      { source: "/plans-de-maison", destination: "/maisons", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          /* HSTS : un an, sous-domaines compris. Volontairement SANS
             `preload` — l'inscription à la liste préchargée des
             navigateurs est quasi irréversible et engage tous les
             sous-domaines du client. À décider avec lui, pas à sa place. */
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          /* Aucune de ces API n'est utilisée par le site : on les ferme
             pour tout le monde, y compris pour un script tiers injecté. */
          {
            key: "Permissions-Policy",
            value:
              "accelerometer=(), autoplay=(self), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=(), interest-cohort=()",
          },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
      /* Une réponse de formulaire est personnelle : jamais en cache, ni
         chez un intermédiaire, et jamais indexée. */
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
