import type { LocalizedNote } from "@/lib/release-notes";

/** Keyed by version; one entry for every RELEASE_NOTES version, same line counts. */
export const DE_NOTES: Record<string, LocalizedNote> = {
  "0.5.0": {
    headline: "Fitcheck spricht jetzt zehn Sprachen.",
    added: ["Nutz Fitcheck auf Deutsch, Englisch, Französisch, Italienisch und mehr", "Wähl deine Sprache im kleinen Menü auf der Startseite oder in Einstellungen", "Looks, Wetter und Details deiner Teile erscheinen in deiner Sprache", "Frühere Looks erscheinen in deiner Sprache; das Original bleibt erhalten"],
    fixed: ["Der Begrüßungstext rückt nicht mehr an die Anmelde-Buttons", "Lange Anlassnamen bleiben in einer Zeile"],
  },
  "0.4.1": {
    headline: "Looks teilen geht leichter, und entfernte Teile können endgültig weg.",
    added: ["„Link erstellen“ kopiert den Link jetzt gleich für dich", "Lösch ein entferntes Teil endgültig auf seiner Seite"],
    fixed: ["„Kopieren“ zeigt jetzt direkt auf dem Button „Kopiert“", "„Marken zeigen“ erklärt, wenn deine Teile noch keine Marke haben"],
  },
  "0.4.0": {
    headline: "Teil deine Looks, füg Teile gesammelt hinzu und hol Teile zurück.",
    added: [
      "Teil einen Look als Story, als Post oder als Link",
      "Füg mehrere Teile auf einmal aus deinen Fotos hinzu",
      "Leg ein entferntes Teil unter „Entfernte Teile“ zurück",
      "Lösch das Originalfoto eines Teils; sein Freisteller bleibt in deinen Looks",
    ],
    fixed: ["In deinen Schrank können jetzt nur noch Fotos"],
  },
  "0.3.9": {
    headline: "Erstattungen für Pro laufen jetzt sauber von Anfang bis Ende.",
    added: ["Ein erstattetes Pro-Abo endet jetzt sofort — ohne weitere Abbuchungen"],
    fixed: ["Nach einer Erstattung läuft kein Abo mehr weiter"],
  },
  "0.3.8": {
    headline: "Fitcheck Pro ist da — alle Funktionen, monatlich oder jährlich.",
    added: ["Hol dir Pro monatlich oder jährlich und verwalte oder kündige es jederzeit"],
    fixed: ["Deine Kontoeinstellungen sind jetzt noch besser geschützt"],
  },
  "0.3.7": {
    headline: "Stille Arbeit im Hintergrund, damit deine Daten sicher bleiben.",
    added: ["Jedes Update prüft jetzt, ob seine Datenbankänderungen wirklich ankamen"],
    fixed: ["Eine Datenbankänderung kann nicht mehr unbemerkt verloren gehen"],
  },
  "0.3.6": {
    headline: "Beim Entfernen eines Teils erfährst du jetzt genau, was passiert.",
    added: ["Entfernen fragt erst nach und erklärt, was bleibt und was nicht"],
    fixed: ["Der Cookie-Hinweis verdeckt nicht mehr den Zurück-Button"],
  },
  "0.3.5": {
    headline: "Das Löschen von Konten ist im Hintergrund zuverlässiger.",
    added: ["Falls das Löschen deines Kontos scheitert, erfahren wir es sofort"],
    fixed: ["Ein gescheitertes Löschen zeigt uns jetzt genau, welcher Schritt hakt"],
  },
  "0.3.4": {
    headline: "Deine Backups bringen jetzt alles zurück — auch die Fotos.",
    added: ["Die Wiederherstellung aus einem Backup wird jetzt komplett getestet"],
    fixed: ["Ein wiederhergestelltes Backup gibt dir wieder Zugriff auf deine Fotos", "Neue Anmeldungen klappen direkt nach einer Wiederherstellung"],
  },
  "0.3.3": {
    headline: "Wenn du dein Konto löschst, bleibt jetzt nichts zurück.",
    added: ["Beim Löschen des Kontos wird doppelt geprüft, dass kein Foto übrig bleibt"],
    fixed: [
      "Ein Foto, das beim Löschen auf einem anderen Gerät hochlädt, wird mit entfernt",
      "Ein wiederhergestelltes Backup behält keine Fotos gelöschter Konten mehr",
    ],
  },
  "0.3.2": {
    headline: "Dein Konto, deine Entscheidung — Löschen geht jetzt in den Einstellungen.",
    added: [
      "Lösch dein Konto und deine Live-Daten direkt in den Einstellungen",
      "Fitcheck hält jetzt verschlüsselte Backups für den Notfall bereit",
    ],
    fixed: ["Ein wiederhergestelltes Backup bringt kein gelöschtes Konto zurück"],
  },
  "0.3.1": {
    headline: "Sauberere Freisteller und „Drehen“ da, wo du es siehst.",
    added: ["Der Drehen-Button sitzt jetzt auf dem Foto, damit du es drehen siehst"],
    fixed: [
      "Lücken zwischen Ärmel und Körper werden nicht mehr zu weißen Flecken",
      "„Neu aufnehmen“ sieht nicht mehr wie ein Drehen-Button aus",
      "Diese Karte erscheint nach einem Update auch in der Homescreen-App",
    ],
  },
  "0.3.0": {
    headline: "Kleidung hinzufügen geht schneller, und sie steht richtig herum.",
    added: [
      "Freistellen dauert jetzt unter einer Sekunde — bei 5× weniger Download",
      "Seitlich fotografiert? Wir drehen es aufrecht — und es gibt einen Drehen-Button",
      "Datenschutz und Bedingungen, klar formuliert und dort verlinkt, wo sie zählen",
    ],
    fixed: ["Weiße Kleidung auf hellem Grund verliert nicht mehr ihre Kanten", "Hosensäume und Hemdmanschetten behalten im Freisteller ihre Form"],
  },
  "0.2.0": {
    headline: "Deine Looks sind gerade klüger geworden.",
    added: [
      "Kleider und Jumpsuits — ein Einteiler ist jetzt ein ganzer Look",
      "Taschen, Uhren und ein zweites Accessoire können zum Look gehören",
      "Outfits wägen Stoff gegen Stoff ab: Leinen mit Wolle, Seide mit Leder",
      "Schuhe werden danach bewertet, womit du sie trägst, nicht für sich allein",
    ],
    fixed: [
      "Ein Kleid bekommt keine Turnschuhe mehr, wenn es etwas Eleganteres braucht",
      "Sneaker zum Anzug nur dort, wo das wirklich funktioniert",
      "Eine Tasche oder Uhr, die eine Farbe aufgreift, wird endlich bemerkt",
      "Zwei schwere Strickteile zusammen gelten nicht mehr als gute Idee",
    ],
  },
};
