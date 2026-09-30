import type { LocalizedNote } from "@/lib/release-notes";

/** Keyed by version; one entry for every RELEASE_NOTES version, same line counts. */
export const NL_NOTES: Record<string, LocalizedNote> = {
  "0.5.1": {
    headline: "Kleine correcties en verbeteringen.",
    added: [],
    fixed: ["Een paar kleine correcties zodat alles soepel werkt"],
  },
  "0.5.0": {
    headline: "Fitcheck spreekt nu tien talen.",
    added: ["Gebruik Fitcheck in het Nederlands, Engels, Duits, Frans en meer", "Kies je taal in een klein menu op de welkomstpagina of in Instellingen", "Je looks, het weer en details van je stukken verschijnen in je taal", "Eerdere looks verschijnen in je taal; het origineel blijft bewaard"],
    fixed: ["De welkomsttekst drukt niet meer tegen de inlogknoppen", "Lange namen van gelegenheden blijven op één regel"],
  },
  "0.4.1": {
    headline: "Een look delen gaat soepeler, en verwijderde stukken kunnen voorgoed weg.",
    added: ["Link maken kopieert de link nu voor je", "Verwijder een verwijderd stuk definitief via de pagina ervan"],
    fixed: ["Kopiëren toont nu Gekopieerd op de knop zelf", "Merken tonen legt uit wanneer je stukken nog geen merk hebben"],
  },
  "0.4.0": {
    headline: "Deel je looks, voeg stukken in één keer toe en haal stukken terug.",
    added: [
      "Deel een look als story, post of link",
      "Voeg meerdere stukken tegelijk toe vanuit je foto's",
      "Zet een verwijderd stuk terug via Verwijderde stukken",
      "Wis de originele foto van een stuk; de uitsnede blijft in je looks",
    ],
    fixed: ["Je kunt nu alleen nog foto's aan je kast toevoegen"],
  },
  "0.3.9": {
    headline: "Terugbetalingen voor Pro worden nu van begin tot eind netjes afgehandeld.",
    added: ["Een terugbetaald Pro-abonnement stopt nu meteen — zonder verdere afschrijvingen"],
    fixed: ["Na een terugbetaling loopt er geen abonnement meer door"],
  },
  "0.3.8": {
    headline: "Fitcheck Pro is er — alle functies, per maand of per jaar.",
    added: ["Neem Pro per maand of per jaar, en beheer of zeg het op wanneer je wilt"],
    fixed: ["Je accountinstellingen zijn nu nog beter beschermd"],
  },
  "0.3.7": {
    headline: "Stil werk achter de schermen om je gegevens veilig te houden.",
    added: ["Elke update controleert nu of de databasewijzigingen echt zijn aangekomen"],
    fixed: ["Een databasewijziging kan niet meer ongemerkt verloren gaan"],
  },
  "0.3.6": {
    headline: "Een stuk verwijderen vertelt je nu precies wat er gebeurt.",
    added: ["Verwijderen vraagt eerst en legt uit wat blijft en wat niet"],
    fixed: ["De cookiemelding bedekt de terugknop niet meer"],
  },
  "0.3.5": {
    headline: "Je account verwijderen is achter de schermen betrouwbaarder.",
    added: ["Als het verwijderen van je account ooit mislukt, weten we het meteen"],
    fixed: ["Een mislukte verwijdering vertelt ons nu precies welke stap te repareren"],
  },
  "0.3.4": {
    headline: "Je back-ups brengen nu alles terug — foto's inbegrepen.",
    added: ["Herstellen vanuit een back-up wordt nu van begin tot eind getest"],
    fixed: ["Een herstelde back-up geeft weer toegang tot je foto's", "Nieuwe aanmeldingen werken direct na een herstel"],
  },
  "0.3.3": {
    headline: "Je account verwijderen laat nu niets meer achter.",
    added: ["Accountverwijdering controleert dubbel dat er geen foto achterblijft"],
    fixed: [
      "Een foto die tijdens het verwijderen via een ander apparaat uploadt, gaat mee",
      "Een herstelde back-up bewaart geen foto's van een verwijderd account meer",
    ],
  },
  "0.3.2": {
    headline: "Jouw account, jouw keuze — verwijderen kan nu in Instellingen.",
    added: [
      "Verwijder je account en actuele gegevens direct in Instellingen",
      "Fitcheck bewaart nu versleutelde back-ups voor als er iets misgaat",
    ],
    fixed: ["Een herstelde back-up kan geen verwijderd account meer terugbrengen"],
  },
  "0.3.1": {
    headline: "Schonere uitsneden, en Draaien waar je het ziet.",
    added: ["De knop Draaien staat nu op de foto, zodat je hem ziet draaien"],
    fixed: [
      "Openingen tussen mouw en lijf worden geen witte vlekken meer",
      "Opnieuw maken lijkt niet meer op een draaiknop",
      "Deze kaart verschijnt na een update ook in de app op je beginscherm",
    ],
  },
  "0.3.0": {
    headline: "Kleding toevoegen gaat sneller, en ze staat meteen goed.",
    added: [
      "Achtergrond weghalen duurt nu minder dan een seconde — en downloadt 5× minder",
      "Scheef gefotografeerd? We zetten het recht — en er is een knop Draaien",
      "Privacy en voorwaarden in heldere taal, gelinkt waar het ertoe doet",
    ],
    fixed: ["Witte kleding op een lichte ondergrond verliest haar randen niet meer", "Broekzomen en manchetten houden hun vorm in de uitsnede"],
  },
  "0.2.0": {
    headline: "Je looks zijn slimmer geworden.",
    added: [
      "Jurken en jumpsuits — een eendelig stuk is nu een complete look",
      "Tassen, horloges en een tweede accessoire kunnen in een look",
      "Outfits wegen stof tegen stof af: linnen met wol, zijde met leer",
      "Schoenen worden beoordeeld op waarmee je ze draagt, niet op zichzelf",
    ],
    fixed: [
      "Een jurk krijgt geen sneakers meer als hij om iets netters vroeg",
      "Sneakers bij een pak alleen waar dat echt werkt",
      "Een tas of horloge dat een kleur terugbrengt, valt eindelijk op",
      "Twee dikke breisels samen gelden niet meer als goed idee",
    ],
  },
};
