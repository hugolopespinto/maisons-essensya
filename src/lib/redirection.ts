/* ════════════════════════════════════════════════════════════════
   REDIRECTION APRÈS FORMULAIRE — 303 vers un chemin du site

   ⚠ JAMAIS `new URL(chemin, req.url)` : derrière le proxy de Clever
   Cloud, `req.url` porte l'adresse interne du serveur. La redirection
   partait vers https://localhost:8080, et le navigateur la bloquait
   sans rien afficher (CSP `form-action 'self'`) : le bouton semblait
   ne rien faire.

   Un en-tête Location relatif laisse le navigateur le résoudre sur le
   domaine qu'il visite, quel que soit l'hébergeur.
   ════════════════════════════════════════════════════════════════ */

export const redirection303 = (chemin: string): Response =>
  new Response(null, { status: 303, headers: { Location: chemin } });
