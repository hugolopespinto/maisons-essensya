import type { Metadata } from "next";
import Link from "next/link";
import FilAriane from "@/components/FilAriane";
import EtapesNav from "@/components/EtapesNav";
import EtapesParcours from "@/components/EtapesParcours";
import ReceptionChecklist from "@/components/ReceptionChecklist";
import { markdownToHtml } from "@/lib/markdown";
import { jsonLd } from "@/lib/schema";
import { resolveMetadata } from "@/lib/seo";
import { srcSet, vue } from "@/data/visuels";
import { CHAPO, CTA, ETAPES_NAV, FAQ, FRISE, FRISE_NOTE, RAIL_LEGENDES, TITRE } from "@/data/redactionnel/etapes";
import "@/styles/pages/construire.css";
import "@/styles/pages/etapes.css";

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/etapes-de-construction", METADATA_DEFAUT);
}

const METADATA_DEFAUT: Metadata = {
  title: "Les étapes de construction d'une maison neuve",
  description:
    "Du budget à la remise des clés : les étapes de la construction d'une maison neuve, avec pour chacune une durée indicative, et ce que font le constructeur et le client.",
  alternates: { canonical: "/etapes-de-construction" },
};

export default async function Page() {
  const heroImg = vue("dublin", "vue-1-exterieur");

  return (
    <main className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />

      <div className="container pe-hero">
        <div className="pe-hero__texte">
          <FilAriane items={[{ nom: "Accueil", path: "/" }, { nom: "Les étapes de construction" }]} />
          <h1>{TITRE}</h1>
          <p className="pe-hero__chapo" dangerouslySetInnerHTML={{ __html: markdownToHtml(CHAPO) }} />
          <div className="pe-chiffre"><b>12 à 18 mois</b><span>De la signature du CCMI à la remise des clés</span></div>
        </div>
        <figure className="pe-hero__vis">
          <picture>
            <source type="image/avif" srcSet={srcSet(heroImg, "avif")} sizes="(max-width:860px) 100vw, 40vw" />
            <source type="image/webp" srcSet={srcSet(heroImg, "webp")} sizes="(max-width:860px) 100vw, 40vw" />
            <img src={heroImg.src} width={heroImg.largeur} height={heroImg.hauteur} alt="Maison de plain-pied à toit de tuiles et terrasse en bois, devant des pins" />
          </picture>
        </figure>
      </div>

      <section className="pe-frise" aria-labelledby="frise-t">
        <div className="container">
          <div className="pe-frise__t">
            <h2 id="frise-t">Le calendrier indicatif, étape par étape</h2>
            <div className="pe-leg">
              <span><i className="pe-bar-min" />Durée la plus courte</span>
              <span><i className="pe-bar-max" />Durée la plus longue</span>
              <span><i style={{ width: ".65em", height: ".65em", background: "var(--framboise)", transform: "rotate(45deg)" }} />Moment clé</span>
            </div>
          </div>
          {FRISE.map((r) => (
            <a className="pe-rang" href={`#${r.id}`} key={r.id}>
              <span className="pe-rang__n"><span className="pe-rang__no">{r.numero}</span>{r.nom}</span>
              <span className="pe-rang__p">
                {r.bar.min ? <i className="pe-bar-min" style={{ position: "absolute", left: `${r.bar.min[0]}%`, width: `${r.bar.min[1]}%`, background: r.id === "ph-8" ? "var(--pierre)" : undefined }} /> : null}
                {r.bar.max ? <i className="pe-bar-max" style={{ position: "absolute", left: `${r.bar.max[0]}%`, width: `${r.bar.max[1]}%` }} /> : null}
                {r.bar.jalon !== undefined ? <i className="pe-jalon" style={{ position: "absolute", left: `${r.bar.jalon}rem` }} /> : null}
                <em style={{
                  left: r.bar.jalon !== undefined ? `${r.dureePos}rem` : `${r.dureePos}%`,
                  background: r.id === "ph-8" ? "none" : undefined,
                  color: r.id === "ph-8" ? "var(--blanc)" : undefined,
                }}>{r.duree}</em>
              </span>
            </a>
          ))}
          <div className="pe-echelle">
            <span />
            <div>
              <span style={{ left: "0" }}>0</span><span style={{ left: "20%" }}>2</span><span style={{ left: "40%" }}>4</span>
              <span style={{ left: "60%" }}>6</span><span style={{ left: "80%" }}>8</span><span style={{ left: "100%" }}>10 mois</span>
            </div>
          </div>
          <p className="pe-frise__n">{FRISE_NOTE}</p>
        </div>
      </section>

      <div className="container">
        <div className="pe-g">
          <EtapesNav nav={ETAPES_NAV} legendes={RAIL_LEGENDES} />

          <div>
            <EtapesParcours>
              <section className="ph" id="ph-1" data-n="1">
                <header className="ph__t"><div className="ph__m"><b>Étape 01</b><span className="ph__duree">1 à 3 mois</span></div><h2>Définir son projet et son budget de construction</h2></header>
                <p className="ph__c">La première étape consiste à déterminer ce que vous souhaitez construire, où et avec quel budget global. <strong>Durée indicative&nbsp;: 1 à 3 mois.</strong> Ce temps de réflexion évite les modifications plus coûteuses une fois le chantier de la maison débuté.</p>
                <div className="ph__d">
                  <p>Listez vos besoins au quotidien&nbsp;: nombre de chambres, plain-pied ou étage, garage, jardin, proximité des écoles, des transports et votre mode de vie. Ces critères orientent ensuite la recherche du terrain et le choix du plan.</p>
                  <div className="pl-deux">
                    <div className="pl-bloc"><h3>Évaluer sa capacité d&apos;emprunt et le financement</h3><p>Votre capacité d&apos;emprunt fixe le plafond du projet de construction&nbsp;: elle dépend de vos revenus, de vos charges et de votre apport. Faites une simulation auprès de plusieurs banques ou d&apos;un courtier pour avoir le choix. Les conseillers habitat de Maisons ESSENSYA peuvent aussi vous accompagner sur le sujet du financement.</p></div>
                    <div><p style={{ fontWeight: 600, marginBottom: ".5rem" }}>Plusieurs postes de dépenses sont à prévoir&nbsp;:</p>
                      <ul className="pe-postes">
                        <li>Prix du terrain et frais de notaire liés à l&apos;achat</li>
                        <li>Coût de la construction de la maison et des options</li>
                        <li>Viabilisation, raccordements aux réseaux et étude de sol</li>
                        <li>Assurances obligatoires, taxe d&apos;aménagement et frais de dossier</li>
                        <li>Aménagements extérieurs&nbsp;: clôture, allée, terrasse</li>
                      </ul>
                    </div>
                  </div>
                  <p>Renseignez-vous sur les aides possibles, par exemple le <a href="https://www.economie.gouv.fr/particuliers/emprunter-et-sassurer/pret-taux-zero-ptz-tout-ce-quil-faut-savoir" target="_blank" rel="noopener">prêt à taux zéro</a> selon votre situation et le secteur géographique, et gardez une marge pour les imprévus. Un budget trop serré est l&apos;une des premières causes de difficultés en cours de travaux.</p>
                  <div className="pl-bloc"><h3>Choisir entre constructeur, architecte ou maître d&apos;œuvre</h3><p>Le choix de l&apos;intervenant détermine votre niveau d&apos;engagement personnel et vos garanties.</p></div>
                  <div className="pl-cmp">
                    <div className="fort"><h4>Le constructeur de maison individuelle</h4>Conçoit la maison, propose un prix et un délai ferme, et prend en charge l&apos;ensemble des travaux.</div>
                    <div><h4>L&apos;architecte</h4>Conçoit la maison et peut suivre le chantier.</div>
                    <div><h4>Le maître d&apos;œuvre</h4>Coordonne les entreprises sans forcément concevoir.</div>
                  </div>
                  <p>Comparez différentes offres et demandez à voir des maisons déjà livrées.</p>
                </div>
                <div className="pe-qui"><div className="pe-qui__c"><b>Ce que fait le constructeur</b><p>Présente ses modèles, finalise le coût global et vérifie la faisabilité du projet.</p></div><div className="pe-qui__v"><b>Ce que fait le client</b><p>Définit ses besoins, obtient un accord de principe bancaire et compare les professionnels.</p></div></div>
              </section>

              <section className="ph" id="ph-2" data-n="2">
                <header className="ph__t"><div className="ph__m"><b>Étape 02</b><span className="ph__duree">2 à 5 mois</span></div><h2>La recherche et l&apos;acquisition du terrain à bâtir</h2></header>
                <p className="ph__c">Le terrain conditionne la forme de la maison, le budget des fondations et le prix final. <strong>Durée indicative&nbsp;: 2 à 5 mois</strong>, de la recherche à la signature de l&apos;acte d&apos;achat chez le notaire.</p>
                <div className="ph__d">
                  <p>Pour trouver un terrain, consultez les annonces, les agences locales, les lotisseurs et la mairie de la ville visée.</p>
                  <p className="pl-encart"><strong>Avant d&apos;acheter</strong>, faites inscrire dans le compromis des conditions suspensives&nbsp;: obtention du prêt et du permis de construire.</p>
                  <p>Maisons ESSENSYA peut également vous proposer <Link href="/annonces?type=terrain">des terrains à bâtir sélectionnés avec nos partenaires fonciers</Link>.</p>
                  <div className="pl-trois">
                    <div className="pl-bloc"><h3>Vérifier les règles d&apos;urbanisme et le PLU</h3><p>Les règles d&apos;urbanisme fixent ce que vous avez le droit de bâtir&nbsp;: hauteur, emprise au sol, distance aux limites, aspect des façades. Elles figurent dans le plan local d&apos;urbanisme (PLU), consultable à l&apos;accueil du service urbanisme de la mairie ou sur le site de la commune.</p><p>Demandez un certificat d&apos;urbanisme, gratuit, pour obtenir les informations officielles sur le terrain. Il indique les règles applicables, les taxes et l&apos;état des équipements publics. Pas de stress, toute cette partie administrative est gérée par votre conseiller habitat qui fait ces démarches et vous conseille sur les différentes possibilités.</p></div>
                    <div className="pl-bloc"><h3>Réaliser une étude de sol indispensable</h3><p>L&apos;étude de sol identifie la nature du terrain et dicte le type de fondations. Dans les zones exposées au retrait-gonflement des argiles, la loi ELAN impose au vendeur de fournir une étude géotechnique préalable, puis une étude de conception à la charge du maître d&apos;ouvrage.</p><p>Ne faites jamais l&apos;impasse sur ce document&nbsp;: un sol mal connu peut être à l&apos;origine de fissures graves des années après l&apos;achèvement.</p></div>
                    <div className="pl-bloc"><h3>Viabilisation du terrain et accès au chantier</h3><p>Viabiliser consiste à raccorder le terrain aux réseaux d&apos;eau, d&apos;électricité, d&apos;assainissement et de télécommunications. Un terrain en lotissement est souvent déjà viabilisé&nbsp;; un terrain isolé, appelé en diffus, peut demander des travaux supplémentaires et un assainissement individuel.</p><p>Un accès pour les engins et les livraisons de matériaux sera à prévoir&nbsp;: largeur du chemin, pente. Le terrassement, qui prépare la plateforme de la maison, intervient ensuite à l&apos;ouverture des travaux.</p></div>
                  </div>
                </div>
                <div className="pe-qui"><div className="pe-qui__c"><b>Ce que fait le constructeur</b><p>Analyse le terrain, adapte le plan et chiffre les surcoûts de fondations et de viabilisation.</p></div><div className="pe-qui__v"><b>Ce que fait le client</b><p>Choisit son terrain qui va accueillir sa future maison.</p></div></div>
              </section>

              <section className="ph" id="ph-3" data-n="3">
                <header className="ph__t"><div className="ph__m"><b>Étape 03</b><span className="ph__duree">1 mois d&apos;échanges</span></div><h2>Concevoir les plans</h2></header>
                <p className="ph__c">Cette étape transforme vos besoins, votre façon de vivre, en plans précis. <strong>Durée indicative&nbsp;: 1 mois d&apos;échanges</strong> pour finaliser la conception de votre maison.</p>
                <div className="ph__d">
                  <div className="pl-deux">
                    <div className="pl-bloc"><h3>Élaboration des plans de maison</h3><p>Le plan de la maison fixe l&apos;implantation, l&apos;orientation, la distribution des pièces et les surfaces. Pensez à l&apos;orientation pour profiter des apports solaires, un point qui compte pour la performance énergétique.</p></div>
                    <div className="pl-bloc"><h3>Choix des finitions</h3><p>Choisissez dès ce moment les matériaux, les menuiseries et le mode de chauffage. Un récapitulatif sera fait avant l&apos;ouverture de votre chantier en compagnie de votre conducteur de travaux.</p></div>
                  </div>
                </div>
                <div className="pe-qui"><div className="pe-qui__c"><b>Ce que fait le constructeur</b><p>Dessine les plans de la maison.</p></div><div className="pe-qui__v"><b>Ce que fait le client</b><p>Valide les plans de sa future maison.</p></div></div>
              </section>

              <section className="ph" id="ph-4" data-n="4">
                <header className="ph__t"><div className="ph__m"><b>Étape 04</b></div><h2>Le cadre juridique et contractuel</h2></header>
                <p className="ph__c">Le contrat et les assurances protègent votre argent et votre logement pendant et après les travaux.</p>
                <div className="ph__d">
                  <div className="pl-deux">
                    <div><h3>Choisir son contrat&nbsp;: CCMI, contrat d&apos;architecte ou entreprise</h3><p>Le <strong><a href="https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/le-contrat-de-construction-de-maison-individuelle-ccmi-offre-une" target="_blank" rel="noopener">contrat de construction de maison individuelle</a></strong> (CCMI), encadré par la loi de 1990, est le plus protecteur&nbsp;: prix forfaitaire, délai d&apos;exécution, pénalités de retard et garantie de livraison. Le contrat d&apos;architecte porte sur la conception et le suivi, tandis que les marchés passés directement avec des entreprises vous laissent la coordination.</p>
                      <ul className="pl-coche" style={{ marginTop: ".6rem" }}>
                        <li>Vérifiez la notice descriptive&nbsp;: elle doit détailler les travaux inclus et ceux laissés à votre charge.</li>
                        <li>Contrôlez l&apos;attestation de garantie de livraison à prix et délais convenus.</li>
                        <li>Lisez les conditions suspensives et le calendrier des appels de fonds.</li>
                      </ul>
                    </div>
                    <div className="pl-bloc"><h3>Les assurances obligatoires&nbsp;: dommages-ouvrage et garantie décennale</h3><p>Deux assurances sont obligatoires. L&apos;assurance dommages-ouvrage, souscrite par le constructeur au nom des clients avant l&apos;ouverture des travaux, préfinance les réparations sans attendre de décision de justice. La garantie décennale, due par chaque professionnel, couvre pendant dix ans les dommages qui compromettent la solidité du bâtiment ou le rendent impropre à sa destination. Ces deux assurances et 10 garanties sont incluses dans nos contrats de construction.</p></div>
                  </div>
                </div>
                <div className="pe-qui"><div className="pe-qui__c"><b>Ce que fait le constructeur</b><p>Remet le contrat, la notice descriptive et ses attestations d&apos;assurance&nbsp;; souscrit l&apos;assurance dommages-ouvrage.</p></div><div className="pe-qui__v"><b>Ce que fait le client</b><p>Relit le contrat et finalise le prêt.</p></div></div>
              </section>

              <section className="ph" id="ph-5" data-n="5">
                <header className="ph__t"><div className="ph__m"><b>Étape 05</b><span className="ph__duree">Délai légal&nbsp;: 2 mois</span></div><h2>La demande et l&apos;obtention du permis de construire</h2></header>
                <p className="ph__c">Le permis de construire est obligatoire pour toute construction de maison neuve. La demande se dépose en mairie ou en ligne. Vous recevez un récépissé qui indique la date à partir de laquelle le délai d&apos;instruction court. Le délai légal est de 2 mois d&apos;instruction en mairie pour une maison individuelle. Il peut être prolongé de 2 mois supplémentaires si l&apos;instruction estime avoir besoin de pièces complémentaires.</p>
                <div className="ph__d">
                  <p>Le dossier comprend le formulaire Cerfa, le plan de situation, le plan de masse, les plans de façades et l&apos;attestation RE2020. Une nouvelle fois nous nous occupons de toute cette partie administrative. Notre expertise nous permet de gérer et d&apos;accélérer le timing. Une fois le permis obtenu, nous l&apos;affichons sur le terrain de façon visible&nbsp;: les tiers disposent de deux mois pour former un recours. Les fiches pratiques de <a href="https://www.service-public.gouv.fr/particuliers/vosdroits/F1986" target="_blank" rel="noopener">Service Public</a> détaillent ces démarches administratives.</p>
                  <ol className="pe-suite" aria-label="Le parcours du permis">
                    <li><b>Dépôt</b>En mairie ou en ligne</li>
                    <li><b>Récépissé</b>Indique la date à partir de laquelle le délai d&apos;instruction court</li>
                    <li><b>Instruction</b>2 mois, prolongeables de 2 mois</li>
                    <li><b>Affichage</b>Sur le terrain, de façon visible</li>
                    <li><b>Recours</b>Les tiers disposent de deux mois</li>
                  </ol>
                </div>
                <div className="pe-qui"><div className="pe-qui__c"><b>Ce que fait le constructeur</b><p>Dessine l&apos;ensemble des plans du permis de construire, monte le dossier de permis, produit l&apos;attestation énergétique et affiche le permis de construire.</p></div><div className="pe-qui__v"><b>Ce que fait le client</b><p>Signe la demande de permis de construire.</p></div></div>
              </section>

              <section className="ph" id="ph-6" data-n="6">
                <header className="ph__t"><div className="ph__m"><b>Étape 06</b><span className="ph__duree">3 à 5 mois</span></div><h2>L&apos;ouverture du chantier et le gros œuvre</h2></header>
                <p className="ph__c">Le gros œuvre comprend tout ce qui assure la structure de la maison, des fondations à la toiture. <strong>Durée indicative&nbsp;: 3 à 5 mois</strong> selon la météo, la technique constructive et la taille de la construction.</p>
                <div className="ph__d">
                  <div className="pl-trois">
                    <div className="pl-bloc"><h3>La déclaration d&apos;ouverture de chantier (DOC)</h3><p>La déclaration d&apos;ouverture de chantier, réalisée par votre constructeur, s&apos;adresse à la mairie dès le premier jour des travaux. Elle fait courir la durée de validité du permis.</p></div>
                    <div className="pl-bloc"><h3>Terrassement, fondations et soubassement</h3><p>Le terrassement met de niveau la parcelle et creuse les fouilles. Les fondations sont ensuite coulées selon les préconisations de l&apos;étude de sol, puis le soubassement et la dalle sont réalisés, avec les réseaux enterrés.</p></div>
                    <div className="pl-bloc"><h3>Élévation des murs et mise hors d&apos;eau (toiture) / hors d&apos;air (menuiseries)</h3><p>Les murs sont montés, puis la charpente et la couverture posées&nbsp;: la maison est alors hors d&apos;eau. La pose des menuiseries extérieures la met hors d&apos;air, étape clé pour démarrer l&apos;intérieur.</p></div>
                  </div>
                </div>
                <div className="pe-qui"><div className="pe-qui__c"><b>Ce que fait le constructeur</b><p>Déclare l&apos;ouverture, organise les corps d&apos;état et assure la sécurité du chantier.</p></div><div className="pe-qui__v"><b>Ce que fait le client</b><p>Visite le site en compagnie du constructeur pour des raisons de sécurité, vérifie l&apos;avancement et règle les appels de fonds correspondants.</p></div></div>
              </section>

              <section className="ph" id="ph-7" data-n="7">
                <header className="ph__t"><div className="ph__m"><b>Étape 07</b><span className="ph__duree">3 à 5 mois</span></div><h2>Le second œuvre et les finitions</h2></header>
                <p className="ph__c">Le second œuvre rend la maison habitable&nbsp;: isolation, réseaux, cloisons, revêtements. <strong>Durée indicative&nbsp;: 3 à 5 mois</strong>, plus si vous gardez certains travaux de finition à votre charge.</p>
                <div className="ph__d">
                  <div className="pl-trois">
                    <div className="pl-bloc"><h3>Isolation, cloisons et menuiseries intérieures</h3><p>L&apos;isolation des murs et des combles conditionne la performance énergétique exigée par la réglementation. Les cloisons, les doublages et les portes intérieures sont posés ensuite.</p></div>
                    <div className="pl-bloc"><h3>Installation des réseaux&nbsp;: électricité, plomberie et chauffage</h3><p>L&apos;électricien et le plombier interviennent avant la fermeture des cloisons. L&apos;installation électrique doit respecter la norme NF C 15-100&nbsp;; le système de chauffage et la ventilation sont, quant à eux, dimensionnés selon l&apos;étude thermique.</p></div>
                    <div className="pl-bloc"><h3>Revêtements de sols, peintures et finitions</h3><p>Carrelage, parquet, faïence, peintures et équipements de cuisine et de salle de bains terminent les travaux.</p></div>
                  </div>
                </div>
                <div className="pe-qui"><div className="pe-qui__c"><b>Ce que fait le constructeur</b><p>Coordonne les artisans, réalise le test d&apos;étanchéité à l&apos;air et vérifie les finitions prévues.</p></div><div className="pe-qui__v"><b>Ce que fait le client</b><p>Réfléchit à sa future décoration.</p></div></div>
              </section>

              <section className="ph" id="ph-8" data-n="8">
                <header className="ph__t"><div className="ph__m"><b>Étape 08</b><span className="ph__duree">Toute la phase de travaux</span></div><h2>Le suivi de chantier&nbsp;: nos conseils pour éviter les mauvaises surprises</h2></header>
                <p className="ph__c">Suivre le chantier permet de s&apos;imprégner de sa future maison et de visualiser les différentes étapes de la construction. <strong>Durée&nbsp;: toute la phase de travaux</strong>, avec une visite possible à chaque étape facturée.</p>
                <div className="ph__d">
                  <div className="pl-deux">
                    <div><h3>Organiser des visites régulières avec le professionnel</h3><p>Fixez des rendez-vous avec votre conducteur de travaux et notez vos questions par écrit. Ensemble nous vérifions l&apos;avancée de la construction et&nbsp;:</p>
                      <ul className="pl-coche">
                        <li>Le respect des cotes et de l&apos;implantation du plan</li>
                        <li>La conformité des matériaux avec la notice descriptive</li>
                        <li>La propreté et sécurité du site</li>
                        <li>Les éventuelles réserves vues sur la construction</li>
                      </ul>
                    </div>
                    <div className="pl-bloc"><h3>Valider chaque étape lors des appels de fonds</h3><p>En CCMI, les paiements sont échelonnés selon l&apos;avancement, avec des plafonds fixés par le Code de la construction et de l&apos;habitation. Ne payez un appel de fonds qu&apos;après avoir constaté que l&apos;étape correspondante est bien réalisée.</p></div>
                  </div>
                </div>
                <div className="pe-qui"><div className="pe-qui__c"><b>Ce que fait le constructeur</b><p>Tient le planning, émet les appels de fonds et corrige les défauts repérés.</p></div><div className="pe-qui__v"><b>Ce que fait le client</b><p>Vérifie chaque étape, consigne ses remarques et paie à bon escient.</p></div></div>
              </section>

              <section className="ph" id="ph-9" data-n="9">
                <header className="ph__t"><div className="ph__m"><b>Étape 09</b><span className="ph__duree">Une demi-journée de visite</span></div><h2>La réception de la maison neuve</h2></header>
                <p className="ph__c">La réception est l&apos;acte par lequel vous acceptez la maison, avec ou sans réserves, et pouvez profiter librement de celle-ci. <strong>Durée indicative&nbsp;: une demi-journée</strong> de visite, puis le temps de lever les réserves éventuelles.</p>
                <div className="ph__d">
                  <div className="pl-deux">
                    <ReceptionChecklist />
                    <div className="pl-bloc">
                      <h3>La remise des clés et le début des garanties légales</h3>
                      <p>La signature du procès-verbal fait démarrer les garanties légales&nbsp;: parfait achèvement pendant un an, bon fonctionnement des équipements pendant deux ans, décennale pendant dix ans. Déposez ensuite en mairie la déclaration attestant l&apos;achèvement et la conformité des travaux (DAACT).</p>
                      <div className="pe-gar" role="img" aria-label="Durée des garanties à partir de la réception : parfait achèvement 1 an, bon fonctionnement des équipements 2 ans, décennale 10 ans" style={{ marginTop: ".8rem" }}>
                        <div className="pe-gar__r"><span>Parfait achèvement, 1 an</span><div className="pe-gar__p"><i style={{ width: "10%" }} /></div></div>
                        <div className="pe-gar__r"><span>Bon fonctionnement des équipements, 2 ans</span><div className="pe-gar__p"><i style={{ width: "20%" }} /></div></div>
                        <div className="pe-gar__r"><span>Décennale, 10 ans</span><div className="pe-gar__p"><i style={{ width: "100%" }} /></div></div>
                        <div className="pe-gar__e"><span>0</span><span>10 ans</span></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pe-qui"><div className="pe-qui__c"><b>Ce que fait le constructeur</b><p>Organise la visite de réception, lève les réserves et remet les clés.</p></div><div className="pe-qui__v"><b>Ce que fait le client</b><p>Inspecte, signe le procès-verbal, solde le prix et dépose la DAACT.</p></div></div>
              </section>
            </EtapesParcours>
          </div>
        </div>
      </div>

      <section className="section" style={{ background: "var(--blanc)", borderTop: "var(--line)" }}>
        <div className="container pl-faq">
          <div className="pl-tete" style={{ margin: 0 }}><span className="c-label">Questions fréquentes</span><h2>FAQ&nbsp;: vos questions sur la construction d&apos;une maison</h2></div>
          <div className="pl-faq__l">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section pl-cta">
        <div className="container">
          <span className="c-label">Vous préparez votre projet&nbsp;?</span>
          <h2 style={{ marginTop: "var(--s-2)", maxWidth: "20ch" }}>Demandez une étude personnalisée à nos conseillers habitat</h2>
          <p className="pl-lire">{CTA.texte}</p>
          <div className="pl-boutons" style={{ marginTop: "var(--s-3)" }}>
            <Link className="c-btn c-btn--solid" href="/contact">Demander une étude <span aria-hidden="true">→</span></Link>
            <Link className="c-btn c-btn--light" href="/construire/landes">Construire dans les Landes</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
