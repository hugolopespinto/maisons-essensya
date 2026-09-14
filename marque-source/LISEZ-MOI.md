# Sources de marque — Maisons Essensya

Fichiers livrés par le client, conservés **tels quels**. Rien ici n'est
servi au visiteur : ce dossier est hors de `public/`, il ne part pas dans
le déploiement. Ce sont les originaux dont dérivent les fichiers web.

## Ce qui en est tiré

| Source | Destination | Par |
|---|---|---|
| `Logo ESSENSYA Variante 1/*.png` | `public/marque/logo.{webp,png}` | en-tête (fond clair) |
| `Logo ESSENSYA - Blanc/*.png` | `public/marque/logo-blanc.{webp,png}` | pied de page (fond noir) |
| `Logo ESSENSYA complet/*.png` | `public/marque/logo-complet.{webp,png}` | réserve |
| `SIgle - Logo ESSENSYA/*.png` | `public/marque/sigle.{webp,png}` | favicon, partages |
| `Charte Essensya.pdf` | `src/styles/base.css`, bloc « COULEURS DE LA CHARTE » | palette |

## Les couleurs, relevées dans la charte

| Nom | RVB | Hexa charte |
|---|---|---|
| Vert | 111 / 150 / 119 | `#77957a` |
| Terracotta | 214 / 107 / 91 | `#c87160` |
| Violet/framboise | 193 / 23 / 91 | `#b12d5b` |
| Noir | CMJN 60/0/0/100 | `#001321` |

Deux remarques à remonter au client, sans urgence :

1. **La charte se contredit légèrement.** Ses valeurs RVB et ses codes
   hexadécimaux ne coïncident pas : 111/150/119 donne `#6F9677`, pas
   `#77957a`. L'écart est imperceptible à l'écran. Le site retient les
   hexadécimaux ; le tracé du logo, lui, est mesuré à `#6E9677`.

2. **Le vert ne peut porter aucun texte.** Il passe à 2,92:1 sur le fond
   crème et 3,30:1 en blanc dessus, là où l'accessibilité en demande
   4,5:1. Ce n'est pas un choix de développement : c'est une mesure. Le
   site l'emploie donc en aplats, filets et chiffres — « par touches »,
   exactement comme la consigne le demande — et bascule sur une version
   assombrie de la même teinte dès qu'un mot doit être lu.

   Le framboise, lui, passe à 6,18:1 en blanc dessus : il tient
   parfaitement comme fond de bouton.

## Ce qui manque encore

- **Un logo horizontal.** Les quatre variantes sont verticales. Dans une
  barre d'en-tête de 76 px, un logo empilé réduit « ESSENSYA » à une
  ligne minuscule. La variante 1 est la moins mauvaise, mais un lockup
  horizontal serait nettement meilleur.
- **Le logo en SVG.** Les `.ai` ne sont pas exploitables sur le web ; les
  PNG sont pixellisés en écran haute densité au-delà de leur taille de
  livraison.
