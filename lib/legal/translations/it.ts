import { OPERATOR, PRIVACY_UPDATED, TERMS_UPDATED, type LegalDocument } from "../types";

export const PRIVACY_IT: LegalDocument = {
  title: "Informativa sulla privacy",
  updated: PRIVACY_UPDATED,
  intro:
    "Se questa traduzione differisce dalla versione inglese, prevale la versione inglese. Fitcheck fotografa il tuo guardaroba e ti propone outfit a partire da esso. Per questo conserva le foto dei tuoi vestiti e qualche informazione su di te. Questa pagina dice esattamente cosa, perché, chi altro ci mette mano e come farci cancellare tutto.",
  sections: [
    {
      id: "who-is-responsible",
      heading: "Chi è responsabile",
      paragraphs: [
        `${OPERATOR.name}, che opera dalla Svizzera, è il titolare del trattamento dei tuoi dati. Per qualsiasi cosa riguardi questa pagina, scrivi a ${OPERATOR.email}.`,
        "Si applica la legge svizzera sulla protezione dei dati (LPD). Se ti trovi nell’UE o nel SEE, ti si applica anche il GDPR, e ogni diritto elencato qui sotto ti spetta in base a entrambi.",
      ],
    },
    {
      id: "what-we-collect",
      heading: "Cosa raccogliamo",
      paragraphs: ["Solo ciò che serve all’app per fare il suo lavoro. Nulla viene raccolto per la pubblicità e nulla viene venduto."],
      bullets: [
        "Il tuo account: il tuo indirizzo email e, se accedi con Google, il nome e l’immagine del profilo che Google condivide.",
        "Le tue risposte al breve quiz di stile: come ti piace vestirti e cosa preferisci non indossare.",
        "Il tuo guardaroba: le foto che carichi, le versioni ritagliate che ne ricaviamo e i tag che descrivono ogni capo — colore, tessuto, formalità e così via. Puoi modificare ogni tag.",
        "Se una foto che carichi ti ritrae mentre indossi il capo, la conserviamo così come l’hai scattata. Teniamo l’originale solo per poter rifare il ritaglio con strumenti migliori in futuro; non viene mai inviato all’IA, mai usato per identificarti e mai mostrato a nessuno tranne te. Puoi cancellare la foto originale di qualsiasi capo che abbia un ritaglio, dalla sua pagina. Il ritaglio resta nei tuoi look, e un originale cancellato non può più servire a rifare un ritaglio migliore. Per gli altri capi, scrivi a legal@fitcheck.space e la elimineremo. Puoi anche eliminare per sempre un capo rimosso dalla sua pagina in Capi rimossi: le sue foto e i suoi dettagli vengono eliminati, e i look passati mantengono gli altri capi.",
        "I tuoi look: gli outfit che l’app propone, quelli che salvi tra i preferiti e i giorni in cui dici di averne indossato uno.",
        "La tua posizione, solo se la fornisci: una città o delle coordinate e un fuso orario, perché il meteo dei tuoi look sia il tuo. Puoi cancellarla nelle Impostazioni.",
        "Se ti abboni a Pro: il tuo ID cliente Stripe, lo stato e la data di rinnovo dell’abbonamento e quando hai confermato che Pro doveva partire subito. I dati della carta vanno a Stripe e Link e non arrivano mai a noi.",
        "Dettagli tecnici quando qualcosa si rompe: l’errore, la pagina e il browser. Non il tuo nome, né ciò che hai digitato.",
      ],
    },
    {
      id: "sharing-a-look",
      heading: "Condividere un look",
      paragraphs: [
        "Condividere è sempre una tua scelta. Condividi immagine crea un’immagine sul tuo telefono; non ne conserviamo nulla. Crea link pubblica un’istantanea di un look: le sue immagini, il suo nome, la frase dello stylist e i nomi dei suoi capi (e le loro marche, solo se lo scegli). Chiunque abbia il link può vederlo per 30 giorni, o finché non smetti di condividerlo, dal look o dalle Impostazioni. Non c’è nessun nome, nessun account e nient’altro di tuo, e non viene indicizzato dai motori di ricerca. Eliminare l’account rimuove subito i tuoi look condivisi. Un’immagine che pubblichi su Instagram, TikTok o altrove è una copia che non possiamo eliminare. Dopo un ripristino di emergenza dei nostri sistemi, i link condivisi vengono disattivati e vanno condivisi di nuovo.",
      ],
    },
    {
      id: "contacting-support",
      heading: "Contattare l’assistenza",
      paragraphs: [
        "Se contatti support@fitcheck.space, usiamo il tuo indirizzo di risposta, l’argomento scelto e il messaggio per aiutarti. Il modulo non allega il tuo guardaroba, account o posizione. L’indirizzo fornito serve per rispondere e non prova la titolarità dell’account.",
        "Resend consegna i messaggi alla nostra casella di assistenza: Namecheap inoltra le e-mail per support@fitcheck.space a una casella Gmail gestita da Google. Cloudflare Turnstile verifica i segnali del browser contro lo spam; non gli inviamo il messaggio o l’indirizzo di risposta. L’app non aggiunge l’indirizzo IP alla verifica sul server, ma il widget può trattarlo. Cloudflare è responsabile del trattamento per la sicurezza del sito e titolare quando migliora il rilevamento dei bot.",
        "Eliminiamo le conversazioni chiuse e il cestino della casella entro 90 giorni dall’ultima risposta. L’eliminazione dell’account non rimuove automaticamente le e-mail di assistenza. Scrivi a legal@fitcheck.space per chiederne la cancellazione. I registri di consegna dei fornitori seguono le loro regole di conservazione.",
      ],
    },
    {
      id: "why-we-use-it",
      heading: "Perché li usiamo",
      paragraphs: [
        "Per rispondere alle richieste di assistenza e proteggere il modulo dallo spam. Secondo il GDPR è il nostro legittimo interesse ad aiutare le persone e mantenere sicuro il servizio.",
        "Per far funzionare il servizio a cui ti sei iscritto — taggare i tuoi vestiti, comporre look, ricordare cosa hai indossato. Ai sensi del GDPR si tratta dell’esecuzione di un contratto.",
        "Per mantenere l’app funzionante e trovare i bug. Ai sensi del GDPR è un nostro legittimo interesse, limitato ai rapporti di errore.",
        "Per venderti Pro e tenerlo attivo finché paghi. Di nuovo un contratto, più la contabilità richiesta dalla legge.",
        "Nient’altro. Nessuna profilazione oltre allo styling del tuo guardaroba, nessuna pubblicità, nessuna cessione a intermediari di dati.",
      ],
    },
    {
      id: "who-else-sees-it",
      heading: "Chi altro li vede",
      paragraphs: [
        "Per far funzionare Fitcheck ci affidiamo a poche aziende. Ognuna riceve solo ciò che serve al suo compito ed è vincolata da un accordo sul trattamento dei dati.",
      ],
      bullets: [
        "Supabase (UE, Francoforte) — conserva il tuo account, le tue foto e tutto quanto sopra. I tuoi dati restano nell’UE.",
        "Anthropic (USA) — l’IA che tagga i tuoi vestiti. Riceve la foto ritagliata di un capo per descriverlo e brevi descrizioni testuali dei capi — mai foto — per ragionare sugli outfit. Anthropic non addestra i suoi modelli sui dati inviati tramite la sua API.",
        "OpenWeather — riceve le tue coordinate per restituire una previsione. Nient’altro.",
        "Google — l’accesso con Google, se lo scegli, e Gmail, che ospita la nostra casella di assistenza e conserva i messaggi che ci invii.",
        "Resend (USA) — invia e-mail di accesso e consegna alla nostra casella i messaggi di assistenza, con il tuo indirizzo di risposta, l’argomento e il messaggio.",
        "Namecheap (USA) — inoltra le e-mail inviate a support@fitcheck.space, compresi il tuo indirizzo di risposta e il messaggio, a quella casella Gmail.",
        "Cloudflare Turnstile — riceve segnali di sicurezza del browser sulla pagina di assistenza per verificare lo spam; non gli inviamo il messaggio o l’indirizzo di risposta.",
        "Stripe — gestisce il pagamento di Pro; con Link, gli unici a vedere i dati della carta.",
        "Link (Stripe) — ti vende Fitcheck Pro come venditore ufficiale (merchant of record): incassa il pagamento, applica l’IVA e invia le ricevute, secondo i propri termini e la propria informativa sulla privacy. Eliminare l’account Fitcheck annulla l’abbonamento; Link e Stripe conservano i dati di pagamento richiesti dalla legge.",
        "Sentry (UE) — riceve i rapporti di errore, così possiamo sistemare ciò che si è rotto.",
        "Vercel — ospita l’app e conta le visualizzazioni di pagina senza cookie né identificativi salvati sul tuo dispositivo. Come ogni hosting, vede anche le richieste del tuo browser.",
      ],
    },
    {
      id: "data-leaving-europe",
      heading: "Dati fuori dall’Europa",
      paragraphs: [
        "Anthropic, Resend, Cloudflare, Namecheap, Google e Stripe hanno sede negli Stati Uniti o vi trattano dati. I trasferimenti verso di loro si basano sul Data Privacy Framework UE-USA quando il fornitore è certificato, e altrimenti sulle clausole contrattuali tipo della Commissione europea, che la Svizzera riconosce con un proprio allegato. Dove lo offrono, Google e Stripe servono gli utenti svizzeri e dell’UE tramite le loro società europee.",
      ],
    },
    {
      id: "how-long-we-keep-it",
      heading: "Per quanto tempo li conserviamo",
      paragraphs: [
        "Finché hai un account. Elimina l’account nelle Impostazioni; un’eliminazione riuscita rimuove subito i tuoi dati attivi. Per cancellare invece solo la foto originale di un capo, o eliminare per sempre un capo rimosso, usa le opzioni nella pagina di quel capo. Puoi anche scrivere a legal@fitcheck.space se ti serve aiuto con l’eliminazione.",
        "I backup cifrati possono conservare dati eliminati per non più di 30 giorni prima di scadere. I rapporti di errore vengono conservati per 90 giorni. I dati di pagamento richiesti dalla legge sono conservati da Link e Stripe per il tempo previsto dalla normativa fiscale; la nostra copia dello stato di fatturazione sparisce con il tuo account.",
      ],
    },
    {
      id: "your-rights",
      heading: "I tuoi diritti",
      paragraphs: [
        `Elimina l’account nelle Impostazioni o scrivi a ${OPERATOR.email} se ti serve aiuto. Rispondiamo alle altre richieste sui diritti entro 30 giorni. Puoi:`,
      ],
      bullets: [
        "Vedere tutto ciò che conserviamo su di te e riceverne una copia in formato leggibile da una macchina.",
        "Correggere ciò che è sbagliato — la maggior parte si corregge direttamente nell’app.",
        "Far eliminare il tuo account e tutto ciò che contiene.",
        "Opporti a qualsiasi trattamento basato sul legittimo interesse, o chiederci di limitarlo.",
        "Presentare reclamo a un’autorità di controllo: l’Incaricato federale della protezione dei dati e della trasparenza in Svizzera, o l’autorità del tuo Paese UE.",
      ],
    },
    {
      id: "cookies-and-storage-on-your-device",
      heading: "Cookie e memoria sul tuo dispositivo",
      paragraphs: [
        "Fitcheck imposta solo i cookie necessari per mantenere l’accesso e ricordare la tua lingua. Non ci sono cookie pubblicitari o di tracciamento, ed è per questo che vedi un avviso invece di una richiesta di consenso.",
        "L’app conserva anche alcune piccole preferenze nella memoria del browser — per esempio, quali note di versione hai già chiuso. Non lasciano mai il tuo dispositivo.",
      ],
    },
    {
      id: "age",
      heading: "Età",
      paragraphs: ["Fitcheck è per persone dai 16 anni in su. Se sei più giovane, per favore non creare un account."],
    },
    {
      id: "changes",
      heading: "Modifiche",
      paragraphs: [
        "Quando questa pagina cambia in modo rilevante, la data in alto si aggiorna e l’app te lo dice alla visita successiva. La versione attuale è sempre su fitcheck.space/privacy.",
      ],
    },
  ],
};

export const TERMS_IT: LegalDocument = {
  title: "Termini di servizio",
  updated: TERMS_UPDATED,
  intro:
    "Se questa traduzione differisce dalla versione inglese, prevale la versione inglese. Questi sono i termini per usare Fitcheck. Sono brevi perché l’accordo è semplice: tu porti il tuo guardaroba, noi ti suggeriamo cosa indossare, e tu resti padrone dei tuoi vestiti e dei tuoi dati.",
  sections: [
    {
      id: "who-you-are-dealing-with",
      heading: "Con chi hai a che fare",
      paragraphs: [
        `Fitcheck è gestito da ${OPERATOR.name}, ${OPERATOR.address}. Domande, comunicazioni e reclami vanno a ${OPERATOR.email}.`,
      ],
    },
    {
      id: "your-account",
      heading: "Il tuo account",
      paragraphs: [
        "Devi avere almeno 16 anni per usare Fitcheck. Tieni sotto controllo la tua email di accesso; di tutto ciò che avviene dal tuo account rispondi tu. Un account per persona.",
      ],
    },
    {
      id: "your-clothes-your-photos",
      heading: "I tuoi vestiti, le tue foto",
      paragraphs: [
        "Tutto ciò che carichi resta tuo. Ci dai il permesso di conservarlo, rimuoverne lo sfondo, descriverlo con dei tag, inviarlo all’IA che si occupa della descrizione e mostrartelo negli outfit — e per nient’altro. Questo permesso termina quando elimini il capo o il tuo account.",
        "Carica solo foto che hai il diritto di usare. Il senso è il tuo guardaroba; le foto altrui, e le altre persone, no.",
        "Sei responsabile di ciò che condividi. Un look condiviso può essere segnalato dalla sua pagina, e Fitcheck può rimuovere un look condiviso che viola questi termini.",
      ],
    },
    {
      id: "what-the-suggestions-are",
      heading: "Cosa sono i suggerimenti",
      paragraphs: [
        "I look di Fitcheck sono suggerimenti generati da un software a partire dai tag dei tuoi vestiti e dal meteo. Di solito sono buoni e a volte sbagliati. Non sono una promessa che un outfit sia adatto a un’occasione, a un dress code o a te. Guardati allo specchio prima di uscire di casa.",
        "I tag che l’IA scrive per un capo sono una prima bozza. Puoi correggerli tutti, e l’app migliora quando lo fai.",
      ],
    },
    {
      id: "free-and-paid",
      heading: "Gratis e a pagamento",
      paragraphs: [
        "Il piano gratuito vuole essere davvero utile e resta gratuito. Il piano a pagamento, Fitcheck Pro, aggiunge funzioni e toglie limiti; cosa include e quanto costa ti vengono mostrati prima dell’acquisto, e il prezzo comprende l’eventuale IVA applicabile.",
        "Fitcheck Pro è venduto tramite Link, il servizio di venditore ufficiale (merchant of record) di Stripe: Link è il venditore dell’abbonamento, incassa il pagamento, applica l’IVA e ti invia ricevute e fatture. Pro costa CHF 5 al mese o CHF 50 all’anno; l’app mostra l’equivalente in euro o dollari dove si applicano, e le altre valute vengono convertite al pagamento. Tutti i prezzi includono l’IVA.",
        "Pro si rinnova automaticamente finché non lo disdici. Puoi disdirlo in qualsiasi momento nell’app (Profilo → Gestisci abbonamento); Pro continua fino alla fine del periodo pagato e non si rinnova. Il passaggio tra mensile e annuale ha effetto subito, e la parte non usata del periodo in corso viene accreditata sul nuovo. Se un pagamento di rinnovo non va a buon fine, viene ritentato per circa due settimane mentre Pro continua a funzionare; se fallisce ancora, Pro termina. Un abbonamento per account.",
        "Eliminare l’account nelle Impostazioni annulla subito l’abbonamento — prima che vengano eliminati i tuoi dati — e non si rinnova. I rimborsi seguono le regole di Link e la legge; scrivici all’indirizzo sopra se qualcosa è andato storto.",
        "Se sei un consumatore nell’UE, normalmente hai un diritto di recesso di 14 giorni da un acquisto. Poiché Pro inizia a funzionare nel momento in cui ti abboni, ti chiediamo di confermare espressamente al pagamento che vuoi farlo partire subito e di accettare di perdere quel diritto una volta iniziato. Senza questa conferma, il tuo diritto di 14 giorni resta intatto. La conferma è la casella di spunta nella schermata di passaggio a Pro, e registriamo quando l’hai data.",
        "Possiamo cambiare il prezzo di Pro con almeno 30 giorni di preavviso via email. Se non vuoi il nuovo prezzo, disdici prima che entri in vigore.",
      ],
    },
    {
      id: "fair-use",
      heading: "Uso corretto",
      paragraphs: [
        "Non tentare di entrare negli account altrui, sovraccaricare il servizio, copiarlo o usarlo per costruirne uno concorrente. Non caricare nulla di illecito. Possiamo sospendere o chiudere un account che fa queste cose, e ti diremo perché.",
      ],
    },
    {
      id: "ending-things",
      heading: "Chiudere",
      paragraphs: [
        `Puoi eliminare il tuo account quando vuoi nelle Impostazioni. Un’eliminazione riuscita rimuove subito i tuoi dati attivi, mentre i backup cifrati scadono entro 30 giorni; ${OPERATOR.email} resta disponibile se ti serve aiuto. Possiamo terminare il servizio o il tuo accesso con 30 giorni di preavviso, e immediatamente se violi questi termini.`,
      ],
    },
    {
      id: "what-we-are-and-are-not-responsible-for",
      heading: "Di cosa rispondiamo e di cosa no",
      paragraphs: [
        "Lavoriamo per mantenere Fitcheck disponibile, accurato e sicuro, ma lo forniamo così com’è. Nei limiti consentiti dalla legge, non rispondiamo di perdite derivanti dall’aver fatto affidamento su un suggerimento di outfit, dall’indisponibilità del servizio o da qualsiasi cosa fuori dal nostro controllo. Nulla qui limita la responsabilità per dolo, colpa grave o qualsiasi cosa che la legge non ci consente di limitare.",
        "Se sei un consumatore, nulla in questi termini ti toglie i diritti che la legge del tuo Paese ti riconosce e a cui non puoi rinunciare.",
      ],
    },
    {
      id: "law-and-disputes",
      heading: "Legge e controversie",
      paragraphs: [
        "Si applica il diritto svizzero, e le controversie sono di competenza dei tribunali della sede del gestore in Svizzera. Se sei un consumatore nell’UE, mantieni le tutele della legge del tuo Paese e puoi agire davanti ai tribunali del tuo Paese.",
      ],
    },
    {
      id: "changes",
      heading: "Modifiche",
      paragraphs: [
        "Se modifichiamo questi termini in modo rilevante, la data in alto si aggiorna e l’app te lo dice alla visita successiva. Continuare a usare Fitcheck dopo significa accettare la modifica. Se sei un abbonato Pro pagante e una modifica è sostanzialmente peggiore per te, ti chiederemo di confermarla attivamente prima che si applichi, e potrai invece disdire senza costi. Se non accetti una modifica, elimina il tuo account e non ti vincoleremo.",
      ],
    },
  ],
};
