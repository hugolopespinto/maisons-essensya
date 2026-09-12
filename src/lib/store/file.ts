import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Content } from "./types";

/* ════════════════════════════════════════════════════════════════
   PILOTE FICHIER — un JSON sur le disque

   C'est le pilote par défaut, et le seul qui fonctionne sans aucune
   configuration : pas de base à provisionner, pas de secret à poser.
   Il sert le développement, la démonstration et un hébergement en
   conteneur avec volume persistant.

   ⚠ LIMITE, à lire avant toute mise en production :
   sur Netlify, Vercel ou toute plateforme serverless, le système de
   fichiers est en LECTURE SEULE et éphémère. `isWritable()` renverra
   faux et le back-office l'affichera — c'est le comportement voulu,
   pas une panne. Pour la production, définir SUPABASE_URL et
   SUPABASE_SERVICE_ROLE_KEY : le sélecteur (`./index`) bascule seul
   sur le pilote Supabase.

   Ce module ne connaît QUE la persistance : ni cache, ni valeurs par
   défaut, ni horodatage. Ces trois-là sont communs à tous les pilotes
   et vivent dans `./index`, sans quoi chaque pilote les réimplémenterait
   — et divergerait.

   ⚠ CE QUE CE PILOTE NE SAIT PAS FAIRE, et qu'il faut dire au client :
     · pas de journal des versions — il n'y a pas d'« avant » à
       consulter, seulement le fichier tel qu'il est ;
     · pas d'auteur : sans base, il n'y a pas de compte nommé, donc
       personne à inscrire dans `updated_by` ;
     · pas de médiathèque : les fiches `medias` se lisent et s'écrivent
       ici comme le reste, mais les FICHIERS vivent dans le bucket
       Supabase. Sans Supabase, `src/lib/medias.ts` répond « médiathèque
       indisponible » et les écrans l'affichent tel quel.
   Tous les domaines de `Content` — y compris `menus`, `reglages`,
   `pages` et `agences` — sont en revanche persistés sans rien de
   particulier : c'est un seul objet JSON écrit d'un bloc.
   ════════════════════════════════════════════════════════════════ */

const FILE = path.join(process.cwd(), "content", "content.json");

/** Nom affiché dans le back-office. */
export const nom = "fichier" as const;

/**
 * Le contenu tel qu'il est sur le disque. Partiel : un fichier écrit par
 * une version antérieure peut ignorer des clés — c'est l'appelant qui
 * complète avec les valeurs par défaut.
 */
export async function read(): Promise<Partial<Content>> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as Partial<Content>;
  } catch {
    /* Pas de fichier = pas encore de personnalisation. Cas nominal au
       premier lancement, pas une erreur. */
    return {};
  }
}

/* Le pilote écrit le fichier ENTIER à chaque fois : deux enregistrements
   simultanés (deux onglets, deux domaines) se recouvriraient, le dernier
   arrivé écrasant le premier avec un état lu avant lui. Les écritures
   sont donc sérialisées dans le processus. Ce n'est pas un verrou entre
   processus — s'il en faut un, c'est que le site tourne en plusieurs
   instances, et alors c'est Supabase qu'il faut. */
let file: Promise<unknown> = Promise.resolve();

function enFile<T>(tache: () => Promise<T>): Promise<T> {
  const suivant = file.then(tache, tache);
  /* La file ne doit pas s'arrêter sur un échec : on absorbe le rejet
     pour le maillon de chaîne, l'appelant le reçoit quand même. */
  file = suivant.catch(() => undefined);
  return suivant;
}

export async function write(data: Content): Promise<void> {
  return enFile(async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    /* Écriture atomique : un plantage en cours d'écriture ne doit pas
       laisser un JSON tronqué, qui ferait tomber toutes les pages. */
    const tmp = `${FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, FILE);
  });
}

/** Vrai si le pilote sait écrire ici — le back-office l'affiche clairement. */
export async function writable(): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    const probe = path.join(path.dirname(FILE), ".probe");
    await fs.writeFile(probe, "1", "utf8");
    await fs.unlink(probe);
    return true;
  } catch {
    return false;
  }
}
