import { MENTIONS } from "@/lib/legal/jetons";
import type { BlocEditable, PageEditable } from "./types";

/* ════════════════════════════════════════════════════════════════
   LE TEXTE LIVRÉ DES DEUX PAGES LÉGALES

   Ce fichier existe pour que le client puisse réécrire l'intégralité de
   ses mentions légales et de sa politique de données sans passer par un
   développeur. Le texte ci-dessous est celui qui était écrit en dur dans
   les deux gabarits, transcrit en Markdown sans une phrase de moins :
   scripts/legal-diff.mjs compare le rendu avant et après migration et
   exige un texte strictement identique.

   ⚠ DEUX RÈGLES OPPOSÉES COHABITENT ICI, et il faut les distinguer.

   · LES CORPS (`corps.<ancre>`) ont une valeur par défaut : c'est le
     texte livré, celui qu'un juriste amendera plutôt que de repartir
     d'une page blanche. Vider un corps le fait revenir.

   · LES QUINZE MENTIONS restent VIDES, et doivent le rester. Une durée
     de conservation ou une adresse d'exercice des droits « par défaut »
     serait un mensonge par construction. Tant qu'elles sont vides, la
     page affiche à leur place un pavé qui décrit ce qui manque — c'est
     le seul moyen pour que quelqu'un finisse par les réclamer.

   ⚠ LES ANCRES NE SONT PAS ICI. Les dix-neuf identifiants de section
   vivent dans src/lib/legal/sections.ts, en code, et ne traversent
   jamais le stockage : un client qui réécrit un titre ne peut pas faire
   disparaître l'ancre vers laquelle pointe un lien.

   ⚠ LES ESPACES INSÉCABLES SONT ÉCRITS ` `, en clair. Le texte
   d'origine les posait avant chaque deux-points, comme l'exige la
   typographie française. Les écrire en caractère brut les rendrait
   invisibles dans le fichier, donc impossibles à relire.
   ════════════════════════════════════════════════════════════════ */

/** Un bloc de mention obligatoire, construit depuis la table unique. */
const mention = (cle: string): BlocEditable => ({
  cle,
  label: MENTIONS[cle].label,
  aide: MENTIONS[cle].aide,
  valeur: "",
  multiligne: true,
});

/** Un corps de section : du Markdown, avec ses jetons. */
const corps = (ancre: string, label: string, valeur: string): BlocEditable => ({
  cle: `corps.${ancre}`,
  label,
  aide:
    "Le texte complet de cette section, titre compris. Les éléments entre doubles accolades sont remplacés à l'affichage : ne les supprimez pas.",
  valeur: valeur.trim(),
  multiligne: true,
  format: "markdown",
});

const NBSP = " ";

/* ──────────────────────────────────────────────────────────────────
   MENTIONS LÉGALES
   ────────────────────────────────────────────────────────────────── */

const ML_EDITEUR = `
## Éditeur du site

Conformément à l'article 6-III de la loi du 21 juin 2004 pour la confiance dans l'économie numérique, l'éditeur du présent site est${NBSP}:

{{champ:editeur.identite}}

Nom commercial :: Maisons Essensya
Activité :: Construction de maisons individuelles
Téléphone :: {{tel}}
E-mail :: {{email}}

Le numéro de téléphone et l'adresse e-mail ci-dessus sont ceux de l'agence principale, en attendant les coordonnées institutionnelles de la société. La liste complète des établissements figure sur la page [nos agences](/agences).
`;

const ML_PUBLICATION = `
## Directeur de la publication

{{champ:editeur.directeur}}
`;

const ML_HEBERGEUR = `
## Hébergeur

Le site est hébergé par${NBSP}:

{{champ:hebergeur}}
`;

const ML_CONSTRUCTEUR = `
## Assurances et garanties du constructeur

La construction de maisons individuelles est une activité réglementée. Les informations suivantes engagent le constructeur et doivent pouvoir être vérifiées avant toute signature${NBSP}:

### Immatriculation

{{champ:rcs}}

### Assurance de responsabilité civile décennale

Elle couvre pendant dix ans, à compter de la réception des travaux, les dommages compromettant la solidité de l'ouvrage ou le rendant impropre à sa destination.

{{champ:assurance.decennale}}

### Garantie de livraison à prix et délais convenus

Obligatoire pour tout contrat de construction de maison individuelle avec fourniture de plan. Délivrée par un établissement de crédit ou une entreprise d'assurance, elle garantit l'achèvement de la maison au prix et dans les délais convenus, même en cas de défaillance du constructeur.

{{champ:garantie.livraison}}

### Autres assurances

{{champ:assurance.rcpro}}
`;

const ML_MEDIATION = `
## Médiation de la consommation

Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, tout consommateur a le droit de recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable d'un litige qui l'oppose au constructeur, après avoir tenté de le résoudre directement par une réclamation écrite.

{{champ:mediateur}}
`;

const ML_PROPRIETE = `
## Propriété intellectuelle

L'ensemble de ce site — structure, textes, plans, visuels, identité graphique, typographies et code — est protégé par le droit d'auteur et le droit des marques. Toute reproduction, représentation, adaptation ou exploitation, totale ou partielle, par quelque procédé que ce soit, est interdite sans autorisation écrite préalable de l'éditeur.

Les plans et les caractéristiques de la maison présentés sur ce site sont donnés à titre indicatif et ne valent pas document contractuel. Seuls les documents annexés au contrat de construction signé font foi.
`;

const ML_CREDITS = `
## Crédits et visuels

Les photographies actuellement affichées sont des visuels de calage et ne représentent pas les réalisations du constructeur. Elles doivent être remplacées par des prises de vue des maisons réellement livrées avant la mise en ligne.

{{champ:credits}}
`;

const ML_DONNEES = `
## Données personnelles et cookies

Le traitement des données recueillies par nos formulaires, leurs destinataires — dont notre sous-traitant Vitahome — leur durée de conservation et vos droits sont détaillés dans notre [politique de protection des données](/confidentialite). Les cookies déposés et la façon de revenir sur votre choix sont décrits sur la [page cookies](/cookies).
`;

const ML_DROIT = `
## Droit applicable

Le présent site et les mentions qui précèdent sont soumis au droit français. En cas de litige, et à défaut de résolution amiable ou de médiation, les tribunaux français sont seuls compétents.
`;

/* ──────────────────────────────────────────────────────────────────
   CONFIDENTIALITÉ
   ────────────────────────────────────────────────────────────────── */

const C_RESPONSABLE = `
## 1. Qui est responsable de vos données

Le responsable du traitement est l'entreprise qui exploite ce site et qui décide de ce qui est fait de vos données${NBSP}:

{{champ:responsable}}

En attendant, vous pouvez nous joindre par téléphone ou par écrit via la [page contact](/contact) ou l'une de nos [agences](/agences).
`;

const C_DONNEES = `
## 2. Quelles données, et par quel formulaire

Nous ne recueillons de données que lorsque vous remplissez vous-même un formulaire${NBSP}: demande de rappel en page d'accueil, page contact, page de nos modèles et fiche de chaque modèle, fiche d'une annonce de terrain, page d'agence. Il n'y a sur ce site ni compte, ni mot de passe, ni paiement en ligne.

Selon le formulaire, les champs proposés sont les suivants. Seuls le nom et le téléphone sont obligatoires — sans eux, nous ne pouvons pas vous rappeler${NBSP}:

Prénom et nom :: Obligatoire. Pour savoir à qui nous nous adressons.
Téléphone :: Obligatoire. C'est par là que l'agence vous recontacte.
E-mail :: Facultatif. Pour vous envoyer une documentation ou un plan.
Secteur du projet :: Facultatif. Commune ou code postal, pour orienter votre demande vers l'agence compétente.
Avancement du projet :: Facultatif. « Je découvre », « je cherche un terrain », « j'ai déjà un terrain », « je compare des constructeurs ».
Nature de la demande :: Facultatif. Être rappelé, prendre rendez-vous, question sur un terrain — ou le modèle qui vous intéresse.
Message libre :: Facultatif. Son contenu est celui que vous écrivez : n'y indiquez rien de sensible (santé, opinions, situation familiale détaillée).

À ces champs s'ajoutent automatiquement quelques éléments de contexte, qui servent uniquement à comprendre votre demande et à l'adresser à la bonne agence${NBSP}:

Page d'origine :: L'adresse de la page depuis laquelle vous avez envoyé le formulaire.
Annonce consultée :: Le résumé de l'annonce affichée à côté du formulaire : type de bien, commune, surfaces, prix.
Commune de l'annonce :: Son code INSEE et son identifiant dans notre outil de gestion, pour rattacher la demande au bon secteur.
Formulaire utilisé :: Un repère interne indiquant lequel des formulaires du site a été rempli.
Preuve de votre consentement :: La date et l'heure auxquelles vous avez validé le formulaire, le texte exact de la case que vous avez cochée et sa version, ainsi que votre réponse sur la prospection commerciale. C'est la trace qui nous permet de prouver que vous avez été informé avant l'envoi.

Ce site ne tient pas de base de données de son côté${NBSP}: votre demande est relayée telle quelle à l'outil de gestion commerciale décrit au point 4. Votre adresse IP est brièvement gardée en mémoire par le serveur — quelques minutes — pour limiter le nombre d'envois et écarter les robots${NBSP}; elle n'est ni transmise à qui que ce soit, ni rattachée à votre demande. En cas d'échec d'envoi, le serveur note la nature de la panne, jamais le contenu de votre formulaire.
`;

const C_FINALITES = `
## 3. Pourquoi, et sur quel fondement

Vous recontacter :: Répondre à votre demande, vous rappeler, préparer un rendez-vous et vous adresser une proposition. Fondement : votre consentement, donné en cochant la case avant l'envoi du formulaire (art. 6.1.a du RGPD).
Vous adresser nos offres :: Vous envoyer nos actualités et nos offres commerciales. C'est une case distincte, facultative, que vous cochez ou non : refuser n'empêche pas le traitement de votre demande. Fondement : votre consentement.
Protéger nos formulaires :: Limiter le nombre d'envois par visiteur et écarter les robots. Fondement : notre intérêt légitime à ne pas laisser nos formulaires servir de relais au spam.
Mesurer l'audience :: Savoir quelles pages sont consultées pour améliorer le site. Le dépôt des cookies de mesure repose sur votre consentement ; l'analyse des statistiques agrégées qui en découlent relève de notre intérêt légitime à faire fonctionner correctement notre site.
Tenir nos obligations :: Si votre projet aboutit à un contrat de construction, la conservation des pièces contractuelles et comptables répond à une obligation légale (art. 6.1.c du RGPD).

Aucune décision automatisée, aucun profilage${NBSP}: c'est une personne de l'agence qui lit votre demande et qui vous rappelle.
`;

const C_DESTINATAIRES = `
## 4. Qui reçoit vos données

**L'agence Essensya concernée.** Votre demande est traitée par les conseillers de l'agence compétente sur le secteur de votre projet.

**Vitahome, notre sous-traitant.** La gestion des demandes passe par Vitahome (\`pro.vitahome.fr\`), éditeur du logiciel de gestion commerciale utilisé par le constructeur. Les informations que vous saisissez dans le formulaire lui sont transmises dès l'envoi et y sont enregistrées. Vitahome agit sur nos seules instructions, au titre de l'article 28 du RGPD, et n'a pas le droit d'utiliser vos données pour son propre compte.

{{champ:soustraitant.vitahome}}

**Google,** uniquement si vous avez accepté la mesure d'audience, et seulement pour les statistiques de navigation. Google ne reçoit jamais le contenu de vos formulaires.

Vos données ne sont ni vendues, ni louées, ni cédées à des tiers à des fins publicitaires.

Ces destinataires-là reçoivent ce que vous écrivez dans un formulaire. D'autres sociétés, elles, ne reçoivent rien de vos formulaires mais voient votre adresse IP du seul fait que la page s'affiche${NBSP}: elles sont nommées au point suivant.
`;

const C_FOURNISSEURS = `
## 5. Fournisseurs techniques

Afficher une page de ce site, c'est aussi aller chercher des images et des cartes chez d'autres sociétés que la nôtre. C'est votre navigateur qui les contacte, directement${NBSP}: ces sociétés voient donc votre **adresse IP**, la date et l'heure, le fichier demandé — et par là, la page que vous êtes en train de consulter — ainsi que ce que tout navigateur annonce de lui-même (son nom, sa version, votre langue). Cela se produit dès l'ouverture de la page, avant toute action de votre part, et quel que soit votre choix en matière de cookies.

CARTO et OpenStreetMap :: Le fond de la carte des terrains. Les tuiles — les carrés d'image qui composent la carte — sont servies par CARTO (basemaps.cartocdn.com) à partir des données cartographiques d'OpenStreetMap. CARTO reçoit votre adresse IP ainsi que la zone et le niveau de zoom que vous regardez, donc le secteur géographique qui vous intéresse. Cela ne concerne que la page des annonces, et seulement lorsque la carte s'affiche.
Vitahome :: Les photos et les plans des terrains et des maisons proviennent de l'outil de gestion commerciale du constructeur et sont servis par ses serveurs (pro.vitahome.fr et annonces.vitahome.fr). Vitahome reçoit donc votre adresse IP et l'annonce que vous consultez, indépendamment de tout formulaire.

**Pourquoi ces appels ne vous sont pas soumis au consentement.** Ils ne déposent ni cookie, ni traceur, ni identifiant sur votre appareil, et ne servent ni à vous reconnaître, ni à vous suivre d'une page à l'autre. Ce sont des ressources nécessaires à l'affichage${NBSP}: sans elles, la carte reste vide et les pages sans images. L'accord préalable n'est exigé que pour lire ou écrire une information sur votre appareil, ce que ces requêtes ne font pas.

Nous ne le minimisons pas pour autant, et vous devez le savoir${NBSP}: votre adresse IP est une donnée personnelle, sa transmission à ces trois prestataires est réelle, automatique et hors de votre contrôle comme du nôtre une fois la page ouverte. Nous n'avons aucune maîtrise de ce que ces sociétés en consignent dans leurs propres journaux techniques, ni du temps qu'elles les conservent${NBSP}: leurs politiques de confidentialité respectives font foi. Seul un blocage côté navigateur (extension, mode de navigation renforcé) permet de l'éviter — aucun réglage de notre site n'y suffirait.

{{champ:transferts}}
`;

const C_DUREE = `
## 6. Combien de temps nous les gardons

La règle habituelle sur notre métier, et celle que recommande la CNIL, est la suivante${NBSP}: les données d'un prospect sont conservées trois ans à compter de votre dernier contact (appel, réponse à un e-mail, rendez-vous), puis supprimées ou anonymisées. Si votre projet devient un contrat, les pièces contractuelles et comptables sont conservées pendant la durée légale applicable, notamment au titre de la garantie décennale.

{{champ:conservation}}

Deux durées sont en revanche déjà fixées et vérifiables${NBSP}: votre choix en matière de cookies est conservé 6 mois, et les cookies de mesure d'audience 13 mois au maximum. Le détail figure sur la [page cookies](/cookies).
`;

const C_HEBERGEMENT = `
## 7. Où sont hébergées vos données

Le site et l'outil de gestion commerciale reposent sur des serveurs dont la localisation conditionne l'existence, ou non, d'un transfert de données en dehors de l'Union européenne.

{{champ:hebergement}}

Si vous acceptez la mesure d'audience, les données de navigation correspondantes peuvent être traitées par Google en dehors de l'Union européenne, encadrées par les clauses contractuelles types de la Commission européenne. Refuser les cookies de mesure suffit à écarter ce transfert.
`;

const C_DROITS = `
## 8. Vos droits

Le RGPD vous donne sur vos données des droits que nous devons honorer dans un délai d'un mois${NBSP}:

Accès :: Savoir si nous détenons des données sur vous et en obtenir une copie.
Rectification :: Faire corriger une information inexacte ou incomplète.
Effacement :: Demander la suppression de vos données.
Limitation :: Demander le gel de leur utilisation le temps d'une vérification.
Opposition :: Vous opposer à leur utilisation, notamment à la prospection commerciale.
Portabilité :: Récupérer les données que vous nous avez fournies, dans un format lisible.
Retrait du consentement :: Retirer votre accord à tout moment, sans avoir à vous justifier. Le retrait ne remet pas en cause ce qui a été fait avant.
Directives post mortem :: Définir le sort de vos données après votre décès (art. 85 de la loi Informatique et Libertés).

Pour exercer l'un de ces droits, écrivez-nous${NBSP}; une preuve d'identité peut vous être demandée en cas de doute raisonnable sur l'auteur de la demande.

{{champ:dpo}}

Dans l'attente, ces demandes sont reçues à l'adresse {{email}} et traitées comme telles.

Si notre réponse ne vous satisfait pas, vous pouvez adresser une réclamation à la CNIL — 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — ou en ligne sur [cnil.fr](https://www.cnil.fr).
`;

const C_COOKIES = `
## 9. Cookies

Aucun cookie de mesure ou de publicité n'est déposé avant votre accord, et refuser y est aussi simple qu'accepter. Le détail — finalités, cookies déposés, émetteurs, durées — figure sur la [page cookies](/cookies). Votre choix reste modifiable à tout moment${NBSP}:

{{cookies}}
`;

const C_MAJ = `
## 10. Mise à jour de cette page

Ce texte évoluera si nos traitements changent — nouvel outil, nouveau destinataire, nouvelle finalité. La date ci-dessous fait foi${NBSP}; en cas de changement substantiel, votre consentement vous sera redemandé.
`;

/* ────────────────────────────────────────────────────────────────── */

export const PAGES_LEGALES: PageEditable[] = [
  {
    cle: "mentions-legales",
    label: "Mentions légales",
    blocs: [
      {
        cle: "hero.titre",
        label: "Titre de la page",
        valeur: "Mentions légales",
      },
      {
        cle: "hero.chapo",
        label: "Phrase d'introduction",
        valeur:
          "Qui édite ce site, qui l'héberge, et sous quelles assurances et garanties nous construisons.",
        multiligne: true,
      },
      {
        cle: "maj",
        label: "Date de dernière mise à jour",
        aide:
          "Affichée en tête de page et en pied de page. À corriger dès que vous modifiez le texte.",
        valeur: "11 septembre 2026",
      },
      corps("editeur", "Section — Éditeur du site", ML_EDITEUR),
      corps("publication", "Section — Directeur de la publication", ML_PUBLICATION),
      corps("hebergeur", "Section — Hébergeur", ML_HEBERGEUR),
      corps("constructeur", "Section — Assurances et garanties", ML_CONSTRUCTEUR),
      corps("mediation", "Section — Médiation de la consommation", ML_MEDIATION),
      corps("propriete", "Section — Propriété intellectuelle", ML_PROPRIETE),
      corps("credits", "Section — Crédits et visuels", ML_CREDITS),
      corps("donnees", "Section — Données personnelles et cookies", ML_DONNEES),
      corps("droit", "Section — Droit applicable", ML_DROIT),
      mention("editeur.identite"),
      mention("editeur.directeur"),
      mention("hebergeur"),
      mention("rcs"),
      mention("assurance.decennale"),
      mention("garantie.livraison"),
      mention("assurance.rcpro"),
      mention("mediateur"),
      mention("credits"),
    ],
  },
  {
    cle: "confidentialite",
    label: "Confidentialité",
    blocs: [
      {
        cle: "hero.titre",
        label: "Titre de la page",
        valeur: "Protection de vos données",
      },
      {
        cle: "hero.chapo",
        label: "Phrase d'introduction",
        valeur:
          "Ce que nous recueillons quand vous remplissez un formulaire, ce que nous en faisons, à qui nous le transmettons — et ce que vous pouvez exiger de nous à tout moment.",
        multiligne: true,
      },
      {
        cle: "maj",
        label: "Date de dernière mise à jour",
        aide:
          "Affichée deux fois sur la page, qui écrit elle-même « la date ci-dessous fait foi ». À corriger dès que vous modifiez le texte : publier un texte neuf sous une date périmée est ce que cette page interdit explicitement.",
        valeur: "12 septembre 2026",
      },
      corps("responsable", "Section 1 — Responsable des données", C_RESPONSABLE),
      corps("donnees", "Section 2 — Quelles données", C_DONNEES),
      corps("finalites", "Section 3 — Pourquoi et sur quel fondement", C_FINALITES),
      corps("destinataires", "Section 4 — Qui reçoit vos données", C_DESTINATAIRES),
      corps("fournisseurs", "Section 5 — Fournisseurs techniques", C_FOURNISSEURS),
      corps("duree", "Section 6 — Durées de conservation", C_DUREE),
      corps("hebergement", "Section 7 — Hébergement", C_HEBERGEMENT),
      corps("droits", "Section 8 — Vos droits", C_DROITS),
      corps("cookies", "Section 9 — Cookies", C_COOKIES),
      corps("maj", "Section 10 — Mise à jour", C_MAJ),
      mention("responsable"),
      mention("soustraitant.vitahome"),
      mention("transferts"),
      mention("conservation"),
      mention("hebergement"),
      mention("dpo"),
    ],
  },
];
