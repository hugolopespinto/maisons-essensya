import Link from "next/link";
import { Icon } from "./icons";
import { srcSet, type Visuel } from "@/data/visuels";
import type { NumberedItem } from "@/types";

/* ════════════════════════════════════════════════════════════════
   BANDEAU DE POINTS FORTS — une grande photo, des blocs à cheval

   Remplace la grille de six blocs en texte seul qui vivait dans
   `.s-forts__grid`. Le client a tranché sur cette disposition après
   avoir vu trois maquettes : une seule rangée de six cartes qui
   mordent sur le bas de la photo, comme les références qu'il a
   fournies.

   ⚠ CE COMPOSANT EST PRÉVU POUR ÊTRE RÉUTILISÉ sur les pages mères,
   c'est la raison pour laquelle il prend tout par propriétés et ne
   connaît ni l'accueil ni `D.philosophy`.

   ⚠ POURQUOI `textCourt` EXISTE. À six de front dans un conteneur de
   1280, une carte fait 200 px. Les textes du client en font le double
   de ce qui rentre. Plutôt que de les écraser — ce sont ses mots, mot
   pour mot — chaque bloc porte une version courte qui s'ajoute à la
   longue. Les pages qui ont la place affichent toujours `text`.

   ⚠ AUCUN JAVASCRIPT. Le carrousel mobile est du défilement natif avec
   `scroll-snap`, repris de `.vm__nav` (visite.css) qui fait déjà ça
   dans ce dépôt. Pas de flèches : elles demanderaient un composant
   client pour une gestuelle que le doigt connaît déjà. C'est aussi le
   raisonnement du client — « l'internaute a l'habitude de ce format
   sur les réseaux sociaux, il fera défiler si l'info l'intéresse ».
   ════════════════════════════════════════════════════════════════ */

export default function BandeauForts({
  visuel,
  alt,
  surtitre,
  titre,
  items,
}: {
  visuel: Visuel;
  alt: string;
  surtitre: string;
  titre: string;
  items: NumberedItem[];
}) {
  return (
    <section className="s-forts s-bande" id="points-forts">
      <div className="container">
        <div className="c-section-head" data-reveal>
          <span className="c-label">{surtitre}</span>
          {/* Le titre vient du back-office en champ multiligne : ses
              retours doivent survivre, comme partout ailleurs sur la page. */}
          <h2 style={{ whiteSpace: "pre-line" }}>{titre}</h2>
        </div>
      </div>

      {/* La photo sort du conteneur : elle va d'un bord à l'autre, et
          c'est ce qui donne au bandeau sa présence. Les cartes, elles,
          restent dans la grille du site. */}
      <div className="s-bande__media">
        <picture>
          <source type="image/avif" srcSet={srcSet(visuel, "avif")} sizes="100vw" />
          <source type="image/webp" srcSet={srcSet(visuel, "webp")} sizes="100vw" />
          <img
            src={visuel.src}
            width={visuel.largeur}
            height={visuel.hauteur}
            alt={alt}
            loading="lazy"
            decoding="async"
          />
        </picture>
      </div>

      <div className="container">
        <ul className="s-bande__rail">
          {items.map((i) => (
            <li className="s-bande__cell" key={i.num}>
              <Carte item={i} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* Un bloc. Cliquable quand il a une destination, simple carte sinon —
   c'est la seule différence, le reste du gabarit ne bouge pas. */
function Carte({ item }: { item: NumberedItem }) {
  const contenu = (
    <>
      <div className="s-bande__tete">
        <span className="s-bande__num">{item.num}</span>
        {item.icon ? <Icon name={item.icon} /> : null}
      </div>
      <h3>{item.title}</h3>
      <p>{item.textCourt ?? item.text}</p>
      {/* Pas un lien : on est déjà DANS le lien de la carte, et deux <a>
          ne s'imbriquent pas. C'est la convention de `.g-modele__lien`
          sur les cartes de modèle. */}
      {item.href ? (
        <span className="s-bande__fleche" aria-hidden="true">
          →
        </span>
      ) : null}
    </>
  );

  /* `data-reveal` se pose sur la racine de la carte, lien compris —
     comme sur ModeleCard et AnnonceCard. */
  return item.href ? (
    <Link className="s-bande__carte" href={item.href} data-reveal>
      {contenu}
    </Link>
  ) : (
    <div className="s-bande__carte" data-reveal>
      {contenu}
    </div>
  );
}
