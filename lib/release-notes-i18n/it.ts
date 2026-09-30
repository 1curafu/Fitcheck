import type { LocalizedNote } from "@/lib/release-notes";

/** Keyed by version; one entry for every RELEASE_NOTES version, same line counts. */
export const IT_NOTES: Record<string, LocalizedNote> = {
  "0.6.0": {
    headline: "Le tue risposte di stile ora danno forma ai look.",
    added: ["Ciò che vuoi evitare resta fuori da ogni look e da ogni viaggio", "Cambia le risposte di stile quando vuoi: Impostazioni, Profilo di stile", "I nuovi capi vengono ritagliati e nei look appaiono più grandi"],
    fixed: ["Cambiando le occasioni, i look di oggi si aggiornano subito"],
  },
  "0.5.1": {
    headline: "Piccole correzioni e miglioramenti.",
    added: [],
    fixed: ["Qualche piccola correzione perché tutto funzioni bene"],
  },
  "0.5.0": {
    headline: "Fitcheck ora parla dieci lingue.",
    added: ["Usa Fitcheck in italiano, inglese, tedesco, francese e altre lingue", "Scegli la lingua da un piccolo menu nella pagina iniziale o nelle Impostazioni", "Look, meteo e dettagli dei capi appaiono nella tua lingua", "I look passati appaiono nella tua lingua; l’originale resta salvato"],
    fixed: ["Il testo di benvenuto non tocca più i pulsanti di accesso", "I nomi lunghi delle occasioni restano su una riga"],
  },
  "0.4.1": {
    headline: "Condividere un look è più semplice, e i capi rimossi possono sparire.",
    added: ["Crea link ora copia il link per te", "Elimina per sempre un capo rimosso dalla sua pagina"],
    fixed: ["Copia ora mostra Copiato direttamente sul pulsante", "Mostra le marche spiega quando i tuoi capi non hanno ancora una marca"],
  },
  "0.4.0": {
    headline: "Condividi i tuoi look, aggiungi capi in blocco e riporta indietro i capi.",
    added: [
      "Condividi un look come storia, post o link",
      "Aggiungi più capi alla volta dalle tue foto",
      "Rimetti un capo rimosso da Capi rimossi",
      "Cancella la foto originale di un capo; il ritaglio resta nei tuoi look",
    ],
    fixed: ["Ora nel tuo armadio si possono aggiungere solo foto"],
  },
  "0.3.9": {
    headline: "I rimborsi di Pro ora sono gestiti in modo pulito dall’inizio alla fine.",
    added: ["Un abbonamento Pro rimborsato ora termina subito — senza altri addebiti"],
    fixed: ["Un rimborso non lascia più un abbonamento attivo"],
  },
  "0.3.8": {
    headline: "Fitcheck Pro è arrivato — tutte le funzioni, al mese o all’anno.",
    added: ["Passa a Pro al mese o all’anno, gestiscilo o disdici quando vuoi"],
    fixed: ["Le impostazioni del tuo account sono ancora più protette"],
  },
  "0.3.7": {
    headline: "Lavoro silenzioso dietro le quinte per tenere al sicuro i tuoi dati.",
    added: ["Ogni aggiornamento ora verifica che le modifiche al database siano arrivate"],
    fixed: ["Una modifica al database non può più sparire senza che ce ne accorgiamo"],
  },
  "0.3.6": {
    headline: "Rimuovere un capo ora ti dice esattamente cosa succede.",
    added: ["Rimuovere un capo chiede prima conferma e spiega cosa resta e cosa no"],
    fixed: ["L’avviso sui cookie non copre più il pulsante Indietro"],
  },
  "0.3.5": {
    headline: "L’eliminazione dell’account è più affidabile dietro le quinte.",
    added: ["Se l’eliminazione del tuo account non riesce, lo sappiamo subito"],
    fixed: ["Un’eliminazione non riuscita ora ci dice esattamente quale passaggio correggere"],
  },
  "0.3.4": {
    headline: "I tuoi backup ora riportano tutto — foto comprese.",
    added: ["Il ripristino da backup ora è testato dall’inizio alla fine"],
    fixed: ["Un backup ripristinato ora ridà accesso alle tue foto", "Le nuove iscrizioni funzionano subito dopo un ripristino"],
  },
  "0.3.3": {
    headline: "Eliminare l’account ora non lascia nulla dietro.",
    added: ["L’eliminazione dell’account ricontrolla che non resti nessuna foto"],
    fixed: [
      "Una foto caricata da un altro dispositivo durante l’eliminazione sparisce",
      "Un backup ripristinato non conserva più le foto di un account eliminato",
    ],
  },
  "0.3.2": {
    headline: "Il tuo account, la tua scelta — l’eliminazione è nelle Impostazioni.",
    added: [
      "Elimina il tuo account e i dati attivi direttamente dalle Impostazioni",
      "Fitcheck ora conserva backup cifrati nel caso qualcosa vada storto",
    ],
    fixed: ["Un backup ripristinato non può più riportare in vita un account eliminato"],
  },
  "0.3.1": {
    headline: "Ritagli più puliti, e Ruota dove puoi vederlo.",
    added: ["Il pulsante Ruota ora sta sulla foto, così la vedi girare"],
    fixed: [
      "Gli spazi tra manica e corpo non escono più come macchie bianche",
      "Scatta di nuovo non sembra più un pulsante per ruotare",
      "Questa scheda compare dopo un aggiornamento anche nell’app sulla home",
    ],
  },
  "0.3.0": {
    headline: "Aggiungere vestiti è più veloce, e arrivano dritti.",
    added: [
      "La rimozione dello sfondo richiede meno di un secondo — e scarica 5× meno",
      "Foto di lato? La raddrizziamo per te — e c’è un pulsante Ruota",
      "Privacy e termini scritti in modo chiaro, collegati dove servono",
    ],
    fixed: ["I capi bianchi su sfondi chiari non perdono più i bordi", "Orli dei pantaloni e polsini mantengono la forma nel ritaglio"],
  },
  "0.2.0": {
    headline: "I tuoi look sono appena diventati più intelligenti.",
    added: [
      "Abiti e tute — un capo intero ora è un look completo",
      "Borse, orologi e un secondo accessorio possono entrare in un look",
      "Gli outfit bilanciano tessuto con tessuto: lino con lana, seta con pelle",
      "Le scarpe sono giudicate in base a ciò con cui le indossi, non da sole",
    ],
    fixed: [
      "Un abito non riceve più sneaker quando chiedeva qualcosa di più elegante",
      "Sneaker con abiti sartoriali solo dove funziona davvero",
      "Una borsa o un orologio che riprende un colore finalmente viene notato",
      "Due maglie pesanti insieme non passano più per una buona idea",
    ],
  },
};
