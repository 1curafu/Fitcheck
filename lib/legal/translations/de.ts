import { OPERATOR, PRIVACY_UPDATED, TERMS_UPDATED, type LegalDocument } from "../types";

export const PRIVACY_DE: LegalDocument = {
  title: "Datenschutzerklärung",
  updated: PRIVACY_UPDATED,
  intro:
    "Weicht diese Übersetzung von der englischen Fassung ab, gilt die englische Fassung. Fitcheck fotografiert deinen Kleiderschrank und schlägt dir Outfits daraus vor. Dafür speichert es Fotos deiner Kleidung und ein wenig über dich. Hier steht genau, was, wozu, wer sonst damit zu tun hat und wie du uns zum Löschen bringst.",
  sections: [
    {
      id: "who-is-responsible",
      heading: "Wer verantwortlich ist",
      paragraphs: [
        `${OPERATOR.name}, tätig aus der Schweiz, ist Verantwortlicher für deine Daten. Für alles auf dieser Seite schreib an ${OPERATOR.email}.`,
        "Es gilt das Schweizer Datenschutzgesetz (DSG). Wenn du in der EU oder im EWR bist, gilt für dich zusätzlich die DSGVO, und jedes unten genannte Recht steht dir nach beiden zu.",
      ],
    },
    {
      id: "what-we-collect",
      heading: "Was wir erheben",
      paragraphs: ["Nur, was die App für ihre Aufgabe braucht. Nichts wird für Werbung erhoben, und nichts wird verkauft."],
      bullets: [
        "Dein Konto: deine E-Mail-Adresse und, wenn du dich mit Google anmeldest, der Name und das Profilbild, die Google weitergibt.",
        "Deine Stil-Antworten aus dem kurzen Quiz: wie du dich gern kleidest und was du lieber nicht trägst.",
        "Dein Kleiderschrank: die Fotos, die du hochlädst, die freigestellten Versionen, die wir daraus machen, und die Tags zu jedem Teil — Farbe, Stoff, Formalität und so weiter. Du kannst jeden Tag bearbeiten.",
        "Wenn ein hochgeladenes Foto dich mit dem Teil zeigt, speichern wir es so, wie du es gemacht hast. Wir behalten das Original nur, damit der Freisteller später mit besseren Werkzeugen neu erstellt werden kann; es wird nie an die KI geschickt, nie zu deiner Identifizierung verwendet und nie jemand anderem als dir gezeigt. Du kannst das Originalfoto jedes Teils mit Freisteller auf dessen Seite löschen. Der Freisteller bleibt in deinen Looks, und aus einem gelöschten Original lässt sich kein besserer Freisteller mehr machen. Für andere Teile schreib an legal@fitcheck.space, dann löschen wir es. Du kannst ein entferntes Teil auch auf seiner Seite unter „Entfernte Teile“ endgültig löschen: Seine Fotos und Details werden gelöscht, und frühere Looks behalten ihre anderen Teile.",
        "Deine Looks: die Outfits, die die App vorschlägt, die du als Favorit markierst, und die Tage, an denen du sagst, dass du eins getragen hast.",
        "Dein Standort, nur wenn du ihn angibst: eine Stadt oder Koordinaten und eine Zeitzone, damit das Wetter in deinen Looks dein Wetter ist. Du kannst ihn in den Einstellungen löschen.",
        "Wenn du Pro abonnierst: deine Stripe-Kundennummer, den Status und das Verlängerungsdatum deines Abos und wann du bestätigt hast, dass Pro sofort starten soll. Kartendaten gehen an Stripe und Link und erreichen uns nie.",
        "Technische Details, wenn etwas kaputtgeht: der Fehler, die Seite und der Browser. Nicht dein Name und nicht, was du eingegeben hast.",
      ],
    },
    {
      id: "sharing-a-look",
      heading: "Einen Look teilen",
      paragraphs: [
        "Teilen ist immer deine Entscheidung. „Bild teilen“ erstellt ein Bild auf deinem Handy; wir speichern nichts darüber. „Link erstellen“ veröffentlicht eine Momentaufnahme eines Looks: seine Bilder, seinen Namen, den Satz des Stylisten und die Namen seiner Teile (und deren Marken, nur wenn du das wählst). Alle mit dem Link sehen ihn 30 Tage lang oder bis du das Teilen beendest, im Look oder in den Einstellungen. Darauf stehen kein Name, kein Konto und nichts anderes von dir, und er wird von Suchmaschinen nicht indexiert. Wenn du dein Konto löschst, werden deine geteilten Looks sofort entfernt. Ein Bild, das du auf Instagram, TikTok oder anderswo postest, ist eine Kopie, die wir nicht löschen können. Nach einer Notfall-Wiederherstellung unserer Systeme sind geteilte Links ausgeschaltet und müssen neu geteilt werden.",
      ],
    },
    {
      id: "why-we-use-it",
      heading: "Wozu wir sie nutzen",
      paragraphs: [
        "Um den Dienst zu betreiben, für den du dich angemeldet hast — deine Kleidung taggen, Looks bauen, dir merken, was du getragen hast. Nach der DSGVO ist das die Erfüllung eines Vertrags.",
        "Um die App am Laufen zu halten und Fehler zu finden. Nach der DSGVO ist das unser berechtigtes Interesse, und es beschränkt sich auf Fehlerberichte.",
        "Um dir Pro zu verkaufen und es eingeschaltet zu lassen, solange du dafür zahlst. Wieder ein Vertrag, dazu die Buchhaltung, die das Gesetz verlangt.",
        "Sonst nichts. Kein Profiling über das Stylen deines eigenen Kleiderschranks hinaus, keine Werbung, keine Weitergabe an Datenhändler.",
      ],
    },
    {
      id: "who-else-sees-it",
      heading: "Wer sie sonst sieht",
      paragraphs: [
        "Für den Betrieb von Fitcheck nutzen wir wenige Unternehmen. Jedes erhält nur, was seine Aufgabe braucht, und ist an einen Auftragsverarbeitungsvertrag gebunden.",
      ],
      bullets: [
        "Supabase (EU, Frankfurt) — speichert dein Konto, deine Fotos und alles oben Genannte. Deine Daten liegen in der EU.",
        "Anthropic (USA) — die KI, die deine Kleidung taggt. Sie erhält das freigestellte Foto eines Kleidungsstücks, um es zu beschreiben, und kurze Textbeschreibungen von Teilen — nie Fotos —, um über Outfits nachzudenken. Anthropic trainiert seine Modelle nicht mit Daten, die über seine API gesendet werden.",
        "OpenWeather — erhält deine Koordinaten, um eine Vorhersage zu liefern. Sonst nichts.",
        "Google — nur wenn du dich mit Google anmeldest.",
        "Resend (USA) — versendet die Anmelde-E-Mail.",
        "Stripe — wickelt die Zahlung für Pro ab; zusammen mit Link die einzigen, die Kartendaten sehen.",
        "Link (Stripe) — verkauft dir Fitcheck Pro als Händler (Merchant of Record): nimmt deine Zahlung entgegen, berechnet die Mehrwertsteuer und schickt Quittungen, nach eigenen Bedingungen und eigener Datenschutzerklärung. Wenn du dein Fitcheck-Konto löschst, wird dein Abo gekündigt; Link und Stripe behalten die gesetzlich vorgeschriebenen Zahlungsbelege.",
        "Sentry (EU) — erhält Fehlerberichte, damit wir beheben können, was kaputtgegangen ist.",
        "Vercel — hostet die App und zählt Seitenaufrufe ohne Cookies und ohne auf deinem Gerät gespeicherte Kennung. Wie jeder Host sieht es auch die Anfragen deines Browsers.",
      ],
    },
    {
      id: "data-leaving-europe",
      heading: "Daten, die Europa verlassen",
      paragraphs: [
        "Anthropic, Resend, Google und Stripe haben ihren Sitz in den USA oder verarbeiten Daten dort. Übermittlungen an sie stützen sich auf das EU-US Data Privacy Framework, wo der Anbieter zertifiziert ist, und sonst auf die Standardvertragsklauseln der Europäischen Kommission, die die Schweiz mit einem eigenen Zusatz anerkennt. Wo sie es anbieten, betreuen Google und Stripe Nutzer aus der Schweiz und der EU über ihre europäischen Gesellschaften.",
      ],
    },
    {
      id: "how-long-we-keep-it",
      heading: "Wie lange wir sie behalten",
      paragraphs: [
        "So lange du ein Konto hast. Lösch dein Konto in den Einstellungen; eine erfolgreiche Löschung entfernt deine Live-Daten sofort. Um stattdessen nur das Originalfoto eines Teils zu löschen oder ein entferntes Teil endgültig zu löschen, nutz die Optionen auf der Seite des Teils. Du kannst auch an legal@fitcheck.space schreiben, wenn du Hilfe beim Löschen brauchst.",
        "Verschlüsselte Backups können gelöschte Daten höchstens 30 Tage lang enthalten, bevor sie verfallen. Fehlerberichte werden 90 Tage aufbewahrt. Gesetzlich vorgeschriebene Zahlungsbelege bewahren Link und Stripe so lange auf, wie das Steuerrecht es verlangt; unsere Kopie deines Abrechnungsstatus verschwindet mit deinem Konto.",
      ],
    },
    {
      id: "your-rights",
      heading: "Deine Rechte",
      paragraphs: [
        `Lösch dein Konto in den Einstellungen oder schreib an ${OPERATOR.email}, wenn du Hilfe brauchst. Auf andere Anfragen zu deinen Rechten antworten wir innerhalb von 30 Tagen. Du kannst:`,
      ],
      bullets: [
        "Alles einsehen, was wir über dich speichern, und eine Kopie in maschinenlesbarer Form erhalten.",
        "Falsches berichtigen — das meiste kannst du selbst in der App korrigieren.",
        "Dein Konto und alles darin löschen lassen.",
        "Jeder Verarbeitung auf Grundlage berechtigter Interessen widersprechen oder ihre Einschränkung verlangen.",
        "Dich bei einer Aufsichtsbehörde beschweren: beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten in der Schweiz oder bei der Behörde in deinem EU-Land.",
      ],
    },
    {
      id: "cookies-and-storage-on-your-device",
      heading: "Cookies und Speicher auf deinem Gerät",
      paragraphs: [
        "Fitcheck setzt nur die Cookies, die es braucht, um dich angemeldet zu halten und sich deine Sprache zu merken. Es gibt keine Werbe- oder Tracking-Cookies, deshalb siehst du einen Hinweis, statt um Einwilligung gebeten zu werden.",
        "Die App speichert außerdem ein paar kleine Einstellungen im Speicher deines Browsers — zum Beispiel, welche Versionshinweise du schon geschlossen hast. Diese verlassen dein Gerät nie.",
      ],
    },
    {
      id: "age",
      heading: "Alter",
      paragraphs: ["Fitcheck ist für Menschen ab 16 Jahren. Wenn du jünger bist, erstell bitte kein Konto."],
    },
    {
      id: "changes",
      heading: "Änderungen",
      paragraphs: [
        "Wenn sich diese Seite in einer wichtigen Weise ändert, ändert sich das Datum oben, und die App sagt es dir bei deinem nächsten Besuch. Die aktuelle Fassung steht immer unter fitcheck.space/privacy.",
      ],
    },
  ],
};

export const TERMS_DE: LegalDocument = {
  title: "Nutzungsbedingungen",
  updated: TERMS_UPDATED,
  intro:
    "Weicht diese Übersetzung von der englischen Fassung ab, gilt die englische Fassung. Dies sind die Bedingungen für die Nutzung von Fitcheck. Sie sind kurz, weil der Deal einfach ist: Du bringst deinen Kleiderschrank mit, wir schlagen vor, was du anziehst, und du behältst die Kontrolle über deine Kleidung und deine Daten.",
  sections: [
    {
      id: "who-you-are-dealing-with",
      heading: "Mit wem du es zu tun hast",
      paragraphs: [
        `Fitcheck wird betrieben von ${OPERATOR.name}, ${OPERATOR.address}. Fragen, Mitteilungen und Beschwerden gehen an ${OPERATOR.email}.`,
      ],
    },
    {
      id: "your-account",
      heading: "Dein Konto",
      paragraphs: [
        "Du musst mindestens 16 sein, um Fitcheck zu nutzen. Behalte die Kontrolle über deine Anmelde-E-Mail; für alles, was über dein Konto geschieht, bist du verantwortlich. Ein Konto pro Person.",
      ],
    },
    {
      id: "your-clothes-your-photos",
      heading: "Deine Kleidung, deine Fotos",
      paragraphs: [
        "Alles, was du hochlädst, bleibt deins. Du erlaubst uns, es zu speichern, den Hintergrund zu entfernen, es mit Tags zu beschreiben, es an die KI zu schicken, die das Beschreiben übernimmt, und es dir in Outfits wieder zu zeigen — und für nichts anderes. Diese Erlaubnis endet, wenn du das Teil oder dein Konto löschst.",
        "Lade nur Fotos hoch, die du verwenden darfst. Dein eigener Kleiderschrank ist der Sinn der Sache; Fotos anderer Leute und andere Leute sind es nicht.",
        "Du bist verantwortlich für das, was du teilst. Ein geteilter Look kann auf seiner Seite gemeldet werden, und Fitcheck kann einen geteilten Look entfernen, der gegen diese Bedingungen verstößt.",
      ],
    },
    {
      id: "what-the-suggestions-are",
      heading: "Was die Vorschläge sind",
      paragraphs: [
        "Die Looks von Fitcheck sind Vorschläge, die eine Software aus den Tags deiner Kleidung und dem Wetter erstellt. Sie sind meist gut und manchmal daneben. Sie sind kein Versprechen, dass ein Outfit zu einem Anlass, einem Dresscode oder zu dir passt. Schau in den Spiegel, bevor du das Haus verlässt.",
        "Die Tags, die die KI für ein Kleidungsstück schreibt, sind ein erster Entwurf. Du kannst jeden davon korrigieren, und die App wird besser, wenn du es tust.",
      ],
    },
    {
      id: "free-and-paid",
      heading: "Kostenlos und kostenpflichtig",
      paragraphs: [
        "Der kostenlose Plan soll wirklich nützlich sein und bleibt kostenlos. Der kostenpflichtige Plan, Fitcheck Pro, bringt Funktionen und hebt Grenzen auf; was er enthält und was er kostet, siehst du vor dem Kauf, und der Preis enthält die anfallende Mehrwertsteuer.",
        "Fitcheck Pro wird über Link verkauft, den Merchant-of-Record-Dienst von Stripe: Link ist der Verkäufer des Abos, nimmt die Zahlung entgegen, berechnet die Mehrwertsteuer und schickt dir Quittungen und Rechnungen. Pro kostet CHF 5 im Monat oder CHF 50 im Jahr; die App zeigt den Gegenwert in Euro oder Dollar, wo diese gelten, und andere Währungen werden beim Bezahlen umgerechnet. Alle Preise enthalten die Mehrwertsteuer.",
        "Pro verlängert sich automatisch, bis du kündigst. Du kannst jederzeit in der App kündigen (Profil → Abo verwalten); Pro läuft dann bis zum Ende des bezahlten Zeitraums weiter und verlängert sich nicht. Ein Wechsel zwischen monatlich und jährlich wirkt sofort, und der ungenutzte Teil des laufenden Zeitraums wird auf den neuen angerechnet. Schlägt eine Verlängerungszahlung fehl, wird sie etwa zwei Wochen lang erneut versucht, während Pro weiterläuft; schlägt sie dann immer noch fehl, endet Pro. Ein Abo pro Konto.",
        "Wenn du dein Konto in den Einstellungen löschst, wird dein Abo sofort gekündigt — bevor irgendwelche deiner Daten gelöscht werden — und verlängert sich nicht. Erstattungen richten sich nach den Regeln von Link und dem Gesetz; frag uns unter der obigen Adresse, wenn etwas schiefgelaufen ist.",
        "Wenn du Verbraucher in der EU bist, hast du normalerweise ein 14-tägiges Widerrufsrecht für einen Kauf. Weil Pro in dem Moment zu arbeiten beginnt, in dem du abonnierst, bitten wir dich, beim Bezahlen ausdrücklich zu bestätigen, dass es sofort starten soll, und zu akzeptieren, dass du dieses Recht verlierst, sobald es begonnen hat. Ohne diese Bestätigung bleibt dein 14-tägiges Recht unberührt. Die Bestätigung ist das Kontrollkästchen auf dem Upgrade-Bildschirm, und wir speichern, wann du sie gegeben hast.",
        "Wir können den Preis von Pro mit mindestens 30 Tagen Vorankündigung per E-Mail ändern. Wenn du den neuen Preis nicht willst, kündige, bevor er gilt.",
      ],
    },
    {
      id: "fair-use",
      heading: "Faire Nutzung",
      paragraphs: [
        "Versuch nicht, in die Konten anderer einzudringen, den Dienst zu überlasten, ihn zu kopieren oder damit einen konkurrierenden Dienst zu bauen. Lade nichts Rechtswidriges hoch. Wir können ein Konto, das so etwas tut, sperren oder schließen und sagen dir, warum.",
      ],
    },
    {
      id: "ending-things",
      heading: "Beenden",
      paragraphs: [
        `Du kannst dein Konto jederzeit in den Einstellungen löschen. Eine erfolgreiche Löschung entfernt deine Live-Daten sofort, während verschlüsselte Backups innerhalb von 30 Tagen verfallen; ${OPERATOR.email} bleibt erreichbar, wenn du Hilfe brauchst. Wir können den Dienst oder deinen Zugang mit 30 Tagen Vorankündigung beenden, und sofort, wenn du gegen diese Bedingungen verstößt.`,
      ],
    },
    {
      id: "what-we-are-and-are-not-responsible-for",
      heading: "Wofür wir verantwortlich sind und wofür nicht",
      paragraphs: [
        "Wir arbeiten daran, Fitcheck verfügbar, genau und sicher zu halten, stellen es aber so bereit, wie es ist. Soweit das Gesetz es erlaubt, haften wir nicht für Verluste, die daraus entstehen, dass du dich auf einen Outfit-Vorschlag verlässt, dass der Dienst nicht verfügbar ist, oder aus allem, was außerhalb unserer Kontrolle liegt. Nichts hier beschränkt die Haftung für Vorsatz, grobe Fahrlässigkeit oder alles, was wir nach dem Gesetz nicht beschränken dürfen.",
        "Wenn du Verbraucher bist, nimmt dir nichts in diesen Bedingungen Rechte, die dir das Recht deines Landes gibt und auf die du nicht verzichten kannst.",
      ],
    },
    {
      id: "law-and-disputes",
      heading: "Recht und Streitigkeiten",
      paragraphs: [
        "Es gilt Schweizer Recht, und Streitigkeiten gehen an die Gerichte am Sitz des Betreibers in der Schweiz. Wenn du Verbraucher in der EU bist, behältst du den Schutz des Rechts deines Heimatlands und kannst eine Klage vor den Gerichten deines Heimatlands erheben.",
      ],
    },
    {
      id: "changes",
      heading: "Änderungen",
      paragraphs: [
        "Wenn wir diese Bedingungen in einer wichtigen Weise ändern, ändert sich das Datum oben, und die App sagt es dir bei deinem nächsten Besuch. Wenn du Fitcheck danach weiter nutzt, akzeptierst du die Änderung. Wenn du zahlender Pro-Abonnent bist und eine Änderung für dich wesentlich schlechter ist, bitten wir dich, sie aktiv zu bestätigen, bevor sie gilt, und du kannst stattdessen kostenlos kündigen. Wenn du eine Änderung nicht akzeptierst, lösch dein Konto, und wir halten dich nicht daran fest.",
      ],
    },
  ],
};
