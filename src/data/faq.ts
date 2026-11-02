import { HOUSE, PRICE_FROM, REEL } from "@/data/essensya";
import { MODELES } from "@/data/gamme";
import { fmtPrice } from "@/lib/format";

/* ════ FAQ ════
   Sur /faq au complet, en extrait sur /concept. On y répond aux objections
   avant qu'elles n'arrivent au téléphone — et c'est le principal gisement de
   requêtes longue traîne du métier. Les réponses sont écrites en dur sauf les
   prix et les libellés produit, qui viennent des données pour ne jamais
   diverger de la fiche maison. */
export const FAQ: { q: string; a: string }[] = [
  {
    q: "Pourquoi vos maisons coûtent-elles moins cher ?",
    a: `Parce qu'un plan dessiné jusqu'au bout revient moins cher qu'un catalogue de trente plans étudiés à moitié. Nos ${MODELES.length} modèles sont optimisés poste par poste, matériau par matériau : pas de dégagement inutile, pas de recoin qui ne sert à rien. L'étude de chacun est faite, chiffrée et amortie sur toutes les maisons construites — ce que nous ne dépensons pas en complexité, nous le rendons sur le prix.`,
  },
  {
    q: "« Moins cher », est-ce que ça veut dire moins bien construit ?",
    a: "Non, et c'est vérifiable poste par poste. Conformité RE 2020, système de chauffage performant, salle de bain équipée, garantie décennale et assurance dommages-ouvrage : ce sont les mêmes exigences et les mêmes garanties que chez un constructeur bien plus cher. Ce qui baisse, c'est le coût de la complexité — l'étude refaite à chaque client, les options à arbitrer, les avenants en cours de chantier. Pas le coût du mur.",
  },
  {
    q: "Puis-je personnaliser ma maison ?",
    a: "Oui, sur une base tenue. Les grands arbitrages — volumes, organisation du plan, équipements — sont déjà faits : c'est ce qui permet d'annoncer le prix avant le premier rendez-vous. La personnalisation porte sur ce qui ne rouvre ni l'étude ni le permis. Un plan entièrement sur mesure relève d'un architecte, qui le fera mieux que nous — et plus cher.",
  },
  {
    q: "Que comprend exactement le prix annoncé ?",
    a: `${fmtPrice(PRICE_FROM)}, c'est le prix d'entrée de gamme : ${REEL.mentionPrix} Sont compris : ${HOUSE.included.join(" · ")}. Ne sont pas compris : ${HOUSE.excluded.join(" · ")}.`,
  },
  {
    q: "Que couvre le contrat CCMI ?",
    a: "Le contrat de construction de maison individuelle est le cadre le plus protecteur du droit français. Il fige le prix et les délais, et il ouvre la garantie de livraison à prix et délais convenus, la garantie de parfait achèvement (1 an), la garantie biennale (2 ans), la garantie décennale (10 ans) et l'assurance dommages-ouvrage. Le prix ne peut pas bouger en cours de chantier, sauf si c'est vous qui demandez une modification.",
  },
  {
    q: "Et si mon terrain est en pente ou de forme irrégulière ?",
    a: "L'étude de sol et l'adaptation au terrain ne sont PAS comprises dans le prix affiché. Une pente marquée, un sol argileux ou un accès difficile demandent des fondations spécifiques : ce surcoût existe chez tous les constructeurs, et nous le chiffrons avant la signature, pas après. Nos agences repèrent les parcelles réellement compatibles avec nos modèles — et quand un terrain ne convient pas, nous vous le disons.",
  },
  {
    q: "Combien de temps entre le premier rendez-vous et les clés ?",
    a: "Le chiffrage complet est remis sous 48 h, puisqu'il n'y a rien à étudier de nouveau. Il faut ensuite compter l'instruction du permis de construire — deux mois pour une maison individuelle, trois en secteur protégé — puis le chantier. Les délais exacts sont écrits dans le CCMI, qui les garantit : un retard vous est dû, il n'est pas subi.",
  },
  {
    q: "Faut-il un apport pour faire construire ?",
    a: "Pas systématiquement. Les banques demandent le plus souvent de quoi couvrir les frais de notaire et de garantie, et certains prêts aidés — le prêt à taux zéro en tête, sous conditions de ressources et de zone — permettent de financer un premier achat avec un apport limité. Nous ne sommes ni banque ni courtier : nous vous remettons un chiffrage complet et daté, c'est exactement la pièce que votre banque réclamera.",
  },
];
