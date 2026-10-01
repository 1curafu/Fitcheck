import { OPERATOR, PRIVACY_UPDATED, TERMS_UPDATED, type LegalDocument } from "../types";

export const PRIVACY_NL: LegalDocument = {
  title: "Privacybeleid",
  updated: PRIVACY_UPDATED,
  intro:
    "Als deze vertaling afwijkt van de Engelse versie, geldt de Engelse versie. Fitcheck fotografeert je kledingkast en stelt er outfits uit voor. Daarvoor bewaart het foto's van je kleding en een beetje informatie over jou. Op deze pagina staat precies wat, waarom, wie er verder bij kan en hoe je ons alles laat verwijderen.",
  sections: [
    {
      id: "who-is-responsible",
      heading: "Wie verantwoordelijk is",
      paragraphs: [
        `${OPERATOR.name}, werkzaam vanuit Zwitserland, is de verwerkingsverantwoordelijke voor je gegevens. Voor alles op deze pagina kun je schrijven naar ${OPERATOR.email}.`,
        "De Zwitserse wet op de gegevensbescherming (DSG) is van toepassing. Ben je in de EU of de EER, dan geldt voor jou ook de AVG, en elk recht hieronder heb je onder beide.",
      ],
    },
    {
      id: "what-we-collect",
      heading: "Wat we verzamelen",
      paragraphs: ["Alleen wat de app nodig heeft om zijn werk te doen. Er wordt niets verzameld voor reclame, en er wordt niets verkocht."],
      bullets: [
        "Je account: je e-mailadres en, als je inlogt met Google, de naam en profielfoto die Google deelt.",
        "Je antwoorden op de korte stijlquiz: hoe je je graag kleedt en wat je liever niet draagt.",
        "Je kledingkast: de foto's die je uploadt, de uitgesneden versies die wij ervan maken en de tags die elk stuk beschrijven — kleur, stof, formaliteit enzovoort. Je kunt elke tag aanpassen.",
        "Als een foto die je uploadt jou laat zien terwijl je het stuk draagt, bewaren we die foto zoals je hem hebt gemaakt. We houden het origineel alleen zodat de uitsnede later met betere tools opnieuw kan worden gemaakt; het wordt nooit naar de AI gestuurd, nooit gebruikt om je te identificeren en nooit aan iemand anders dan jou getoond. Je kunt de originele foto van elk stuk met een uitsnede wissen via de pagina van dat stuk. De uitsnede blijft in je looks, en met een gewist origineel kan geen betere uitsnede meer worden gemaakt. Voor andere stukken schrijf je naar legal@fitcheck.space en verwijderen wij hem. Je kunt ook een verwijderd stuk definitief verwijderen via de pagina ervan in Verwijderde stukken: de foto's en gegevens worden verwijderd, en eerdere looks houden hun andere stukken.",
        "Je looks: de outfits die de app voorstelt, de outfits die je als favoriet markeert en de dagen waarop je aangeeft er een te hebben gedragen.",
        "Je locatie, alleen als je die opgeeft: een stad of coördinaten en een tijdzone, zodat het weer in je looks jouw weer is. Je kunt hem wissen in Instellingen.",
        "Als je Pro neemt: je Stripe-klant-ID, de status en verlengdatum van je abonnement en wanneer je bevestigde dat Pro direct moest starten. Kaartgegevens gaan naar Stripe en Link en bereiken ons nooit.",
        "Technische details als er iets misgaat: de fout, de pagina en de browser. Niet je naam en niet wat je hebt getypt.",
      ],
    },
    {
      id: "sharing-a-look",
      heading: "Een look delen",
      paragraphs: [
        "Delen is altijd jouw keuze. Afbeelding delen maakt een afbeelding op je telefoon; wij bewaren daar niets van. Link maken publiceert een momentopname van één look: de afbeeldingen, de naam, de zin van de stylist en de namen van de stukken (en hun merken, alleen als je dat kiest). Iedereen met de link kan hem 30 dagen zien, of tot je stopt met delen, vanuit de look of vanuit Instellingen. Er staat geen naam, geen account en verder niets van jou op, en hij wordt niet geïndexeerd door zoekmachines. Als je je account verwijdert, worden je gedeelde looks meteen verwijderd. Een afbeelding die je op Instagram, TikTok of ergens anders plaatst, is een kopie die wij niet kunnen verwijderen. Na een noodherstel van onze systemen worden gedeelde links uitgezet en moeten ze opnieuw worden gedeeld.",
      ],
    },
    {
      id: "contacting-support",
      heading: "Contact met support",
      paragraphs: [
        "Als je contact opneemt met support@fitcheck.space, gebruiken we je antwoordadres, gekozen onderwerp en bericht om je te helpen. Het formulier voegt je garderobe, account of locatie niet toe. Het opgegeven adres is een antwoordadres en bewijst niet dat het account van jou is.",
        "Resend bezorgt berichten in onze supportmailbox. Cloudflare Turnstile controleert browsersignalen op spam; we sturen je bericht of antwoordadres er niet naartoe. De app voegt je IP-adres niet toe aan de servercontrole, maar de widget kan het verwerken. Cloudflare is verwerker voor websitebeveiliging en verwerkingsverantwoordelijke bij het verbeteren van botdetectie.",
        "We verwijderen afgesloten correspondentie en de prullenbak van de mailbox binnen 90 dagen na het laatste antwoord. Accountverwijdering verwijdert supportmails niet automatisch. Schrijf naar legal@fitcheck.space om verwijdering te vragen. Bezorgingslogboeken van providers volgen hun eigen bewaarbeleid.",
      ],
    },
    {
      id: "why-we-use-it",
      heading: "Waarvoor we ze gebruiken",
      paragraphs: [
        "Om supportvragen te beantwoorden en het formulier tegen spam te beschermen. Volgens de AVG is dit ons gerechtvaardigd belang om mensen te helpen en de dienst veilig te houden.",
        "Om de dienst te leveren waarvoor je je hebt aangemeld — je kleding taggen, looks samenstellen, onthouden wat je hebt gedragen. Onder de AVG is dat de uitvoering van een overeenkomst.",
        "Om de app draaiende te houden en fouten te vinden. Onder de AVG is dat ons gerechtvaardigd belang, en het blijft beperkt tot foutrapporten.",
        "Om je Pro te verkopen en het aan te laten staan zolang je betaalt. Weer een overeenkomst, plus de boekhouding die de wet vereist.",
        "Verder niets. Geen profilering buiten het stylen van je eigen kledingkast, geen reclame, geen delen met databrokers.",
      ],
    },
    {
      id: "who-else-sees-it",
      heading: "Wie ze verder ziet",
      paragraphs: [
        "We gebruiken een klein aantal bedrijven om Fitcheck te laten draaien. Elk bedrijf krijgt alleen wat zijn taak vereist en is gebonden aan een verwerkersovereenkomst.",
      ],
      bullets: [
        "Supabase (EU, Frankfurt) — bewaart je account, je foto's en alles hierboven. Je gegevens blijven in de EU.",
        "Anthropic (VS) — de AI die je kleding tagt. Het krijgt de uitgesneden foto van een kledingstuk om het te beschrijven, en korte tekstbeschrijvingen van stukken — nooit foto's — om over outfits na te denken. Anthropic traint zijn modellen niet met gegevens die via zijn API worden verstuurd.",
        "OpenWeather — krijgt je coördinaten om een verwachting terug te geven. Verder niets.",
        "Google — alleen als je ervoor kiest in te loggen met Google.",
        "Resend (VS) — verstuurt aanmeldmails en bezorgt supportberichten met je antwoordadres, onderwerp en bericht in onze mailbox.",
        "Cloudflare Turnstile — ontvangt beveiligingssignalen van de browser op de supportpagina om spam te controleren; we sturen je bericht of antwoordadres er niet naartoe.",
        "Stripe — verwerkt de betaling voor Pro; samen met Link de enigen die kaartgegevens zien.",
        "Link (Stripe) — verkoopt je Fitcheck Pro als officiële verkoper (merchant of record): ontvangt je betaling, rekent btw en stuurt bonnen, onder eigen voorwaarden en een eigen privacybeleid. Als je je Fitcheck-account verwijdert, wordt je abonnement opgezegd; Link en Stripe bewaren de betaalgegevens die de wet vereist.",
        "Sentry (EU) — krijgt foutrapporten, zodat we kunnen repareren wat kapot ging.",
        "Vercel — host de app en telt paginaweergaven zonder cookies of een op je apparaat opgeslagen ID. Zoals elke host ziet het ook de verzoeken van je browser.",
      ],
    },
    {
      id: "data-leaving-europe",
      heading: "Gegevens die Europa verlaten",
      paragraphs: [
        "Anthropic, Resend, Cloudflare, Google en Stripe zijn gevestigd in de Verenigde Staten of verwerken daar gegevens. Doorgifte aan hen berust op het EU-VS Data Privacy Framework waar de aanbieder gecertificeerd is, en anders op de standaardcontractbepalingen van de Europese Commissie, die Zwitserland met een eigen aanvulling erkent. Waar ze dat aanbieden, bedienen Google en Stripe gebruikers in Zwitserland en de EU via hun Europese vestigingen.",
      ],
    },
    {
      id: "how-long-we-keep-it",
      heading: "Hoe lang we ze bewaren",
      paragraphs: [
        "Zolang je een account hebt. Verwijder je account in Instellingen; een geslaagde verwijdering haalt je actuele gegevens direct weg. Wil je alleen de originele foto van één stuk wissen, of een verwijderd stuk definitief verwijderen, gebruik dan de opties op de pagina van dat stuk. Je kunt ook schrijven naar legal@fitcheck.space als je hulp nodig hebt bij het verwijderen.",
        "Versleutelde back-ups kunnen verwijderde gegevens hoogstens 30 dagen bewaren voordat ze verlopen. Foutrapporten worden 90 dagen bewaard. Wettelijk verplichte betaalgegevens worden door Link en Stripe bewaard zolang de belastingwet dat vereist; onze kopie van je factuurstatus verdwijnt met je account.",
      ],
    },
    {
      id: "your-rights",
      heading: "Je rechten",
      paragraphs: [
        `Verwijder je account in Instellingen, of schrijf naar ${OPERATOR.email} als je hulp nodig hebt. Andere verzoeken over je rechten beantwoorden we binnen 30 dagen. Je kunt:`,
      ],
      bullets: [
        "Alles inzien wat we over je bewaren en een kopie krijgen in een machineleesbare vorm.",
        "Onjuiste gegevens laten corrigeren — het meeste kun je zelf aanpassen in de app.",
        "Je account en alles erin laten verwijderen.",
        "Bezwaar maken tegen verwerking op basis van gerechtvaardigd belang, of ons vragen die te beperken.",
        "Een klacht indienen bij een toezichthouder: de Federale Toezichthouder voor gegevensbescherming en openbaarheid in Zwitserland, of de autoriteit in je EU-land.",
      ],
    },
    {
      id: "cookies-and-storage-on-your-device",
      heading: "Cookies en opslag op je apparaat",
      paragraphs: [
        "Fitcheck plaatst alleen de cookies die nodig zijn om je ingelogd te houden en je taal te onthouden. Er zijn geen reclame- of trackingcookies, daarom zie je een melding in plaats van een vraag om toestemming.",
        "De app bewaart ook een paar kleine voorkeuren in de opslag van je browser — bijvoorbeeld welke releasenotes je al hebt gesloten. Die verlaten je apparaat nooit.",
      ],
    },
    {
      id: "age",
      heading: "Leeftijd",
      paragraphs: ["Fitcheck is voor mensen van 16 jaar en ouder. Ben je jonger, maak dan geen account aan."],
    },
    {
      id: "changes",
      heading: "Wijzigingen",
      paragraphs: [
        "Als deze pagina op een belangrijke manier verandert, verschuift de datum bovenaan en laat de app het je bij je volgende bezoek weten. De actuele versie staat altijd op fitcheck.space/privacy.",
      ],
    },
  ],
};

export const TERMS_NL: LegalDocument = {
  title: "Gebruiksvoorwaarden",
  updated: TERMS_UPDATED,
  intro:
    "Als deze vertaling afwijkt van de Engelse versie, geldt de Engelse versie. Dit zijn de voorwaarden voor het gebruik van Fitcheck. Ze zijn kort omdat de afspraak eenvoudig is: jij brengt je kledingkast mee, wij stellen voor wat je aantrekt, en jij houdt de regie over je eigen kleding en je eigen gegevens.",
  sections: [
    {
      id: "who-you-are-dealing-with",
      heading: "Met wie je te maken hebt",
      paragraphs: [
        `Fitcheck wordt beheerd door ${OPERATOR.name}, ${OPERATOR.address}. Vragen, mededelingen en klachten gaan naar ${OPERATOR.email}.`,
      ],
    },
    {
      id: "your-account",
      heading: "Je account",
      paragraphs: [
        "Je moet minstens 16 zijn om Fitcheck te gebruiken. Houd je inlogmail onder controle; voor alles wat vanuit je account gebeurt, ben jij verantwoordelijk. Eén account per persoon.",
      ],
    },
    {
      id: "your-clothes-your-photos",
      heading: "Je kleding, je foto's",
      paragraphs: [
        "Alles wat je uploadt, blijft van jou. Je geeft ons toestemming om het te bewaren, de achtergrond eruit te halen, het met tags te beschrijven, het naar de AI te sturen die het beschrijft en het je in outfits terug te laten zien — en voor niets anders. Die toestemming eindigt wanneer je het stuk of je account verwijdert.",
        "Upload alleen foto's die je mag gebruiken. Het gaat om je eigen kledingkast; foto's van anderen, en andere mensen, niet.",
        "Je bent verantwoordelijk voor wat je deelt. Een gedeelde look kan vanaf de pagina worden gemeld, en Fitcheck kan een gedeelde look verwijderen die deze voorwaarden schendt.",
      ],
    },
    {
      id: "what-the-suggestions-are",
      heading: "Wat de voorstellen zijn",
      paragraphs: [
        "De looks van Fitcheck zijn voorstellen die software maakt op basis van de tags van je kleding en het weer. Meestal zijn ze goed en soms zitten ze ernaast. Ze zijn geen belofte dat een outfit bij een gelegenheid, een dresscode of bij jou past. Kijk in de spiegel voordat je de deur uitgaat.",
        "De tags die de AI voor een kledingstuk schrijft, zijn een eerste versie. Je kunt ze allemaal corrigeren, en de app wordt beter als je dat doet.",
      ],
    },
    {
      id: "free-and-paid",
      heading: "Gratis en betaald",
      paragraphs: [
        "Het gratis abonnement is bedoeld om echt nuttig te zijn en blijft gratis. Het betaalde abonnement, Fitcheck Pro, voegt functies toe en heft grenzen op; wat erin zit en wat het kost, zie je vóór de aankoop, en de prijs is inclusief eventuele btw.",
        "Fitcheck Pro wordt verkocht via Link, de merchant-of-record-dienst van Stripe: Link is de verkoper van het abonnement, ontvangt de betaling, rekent de btw en stuurt je bonnen en facturen. Pro kost CHF 5 per maand of CHF 50 per jaar; de app toont de tegenwaarde in euro of dollar waar die gelden, en andere valuta worden bij het afrekenen omgerekend. Alle prijzen zijn inclusief btw.",
        "Pro wordt automatisch verlengd tot je opzegt. Je kunt op elk moment opzeggen in de app (Profiel → Abonnement beheren); Pro loopt dan door tot het einde van de betaalde periode en wordt niet verlengd. Wisselen tussen maandelijks en jaarlijks gaat direct in, en het ongebruikte deel van de huidige periode wordt verrekend met de nieuwe. Mislukt een verlengingsbetaling, dan wordt die ongeveer twee weken opnieuw geprobeerd terwijl Pro blijft werken; mislukt hij dan nog steeds, dan eindigt Pro. Eén abonnement per account.",
        "Als je je account in Instellingen verwijdert, wordt je abonnement direct opgezegd — voordat er gegevens van je worden verwijderd — en het wordt niet verlengd. Terugbetalingen volgen de regels van Link en de wet; vraag het ons via het adres hierboven als er iets misging.",
        "Ben je consument in de EU, dan heb je normaal gesproken 14 dagen herroepingsrecht bij een aankoop. Omdat Pro werkt vanaf het moment dat je je abonneert, vragen we je bij het afrekenen uitdrukkelijk te bevestigen dat het direct moet starten en te aanvaarden dat je dat recht verliest zodra het begonnen is. Zonder die bevestiging blijft je herroepingsrecht van 14 dagen intact. De bevestiging is het vinkje op het upgradescherm, en we leggen vast wanneer je het gaf.",
        "We kunnen de prijs van Pro wijzigen met minstens 30 dagen vooraankondiging per e-mail. Wil je de nieuwe prijs niet, zeg dan op voordat die ingaat.",
      ],
    },
    {
      id: "fair-use",
      heading: "Eerlijk gebruik",
      paragraphs: [
        "Probeer niet in te breken in de accounts van anderen, de dienst te overbelasten, hem te kopiëren of er een concurrerende dienst mee te bouwen. Upload niets onwettigs. We kunnen een account dat dit doet opschorten of sluiten, en vertellen je waarom.",
      ],
    },
    {
      id: "ending-things",
      heading: "Stoppen",
      paragraphs: [
        `Je kunt je account wanneer je wilt verwijderen in Instellingen. Een geslaagde verwijdering haalt je actuele gegevens direct weg, terwijl versleutelde back-ups binnen 30 dagen verlopen; ${OPERATOR.email} blijft bereikbaar als je hulp nodig hebt. Wij kunnen de dienst of je toegang beëindigen met 30 dagen vooraankondiging, en direct als je deze voorwaarden schendt.`,
      ],
    },
    {
      id: "what-we-are-and-are-not-responsible-for",
      heading: "Waarvoor we wel en niet aansprakelijk zijn",
      paragraphs: [
        "We werken eraan Fitcheck beschikbaar, nauwkeurig en veilig te houden, maar we bieden het aan zoals het is. Voor zover de wet het toestaat, zijn we niet aansprakelijk voor verlies doordat je op een outfitvoorstel vertrouwde, doordat de dienst niet beschikbaar was of door iets buiten onze macht. Niets hier beperkt de aansprakelijkheid voor opzet, grove nalatigheid of iets wat we volgens de wet niet mogen beperken.",
        "Ben je consument, dan ontneemt niets in deze voorwaarden je de rechten die het recht van je eigen land je geeft en waarvan je geen afstand kunt doen.",
      ],
    },
    {
      id: "law-and-disputes",
      heading: "Recht en geschillen",
      paragraphs: [
        "Zwitsers recht is van toepassing, en geschillen gaan naar de rechter op de vestigingsplaats van de beheerder in Zwitserland. Ben je consument in de EU, dan houd je de bescherming van het recht van je eigen land en kun je een zaak aanspannen bij de rechter in je eigen land.",
      ],
    },
    {
      id: "changes",
      heading: "Wijzigingen",
      paragraphs: [
        "Als we deze voorwaarden op een belangrijke manier wijzigen, verschuift de datum bovenaan en laat de app het je bij je volgende bezoek weten. Als je Fitcheck daarna blijft gebruiken, aanvaard je de wijziging. Ben je betalend Pro-abonnee en is een wijziging wezenlijk nadeliger voor je, dan vragen we je die actief te bevestigen voordat hij geldt, en kun je in plaats daarvan kosteloos opzeggen. Aanvaard je een wijziging niet, verwijder dan je account en we houden je er niet aan.",
      ],
    },
  ],
};
