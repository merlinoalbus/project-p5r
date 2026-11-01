# Roadmap — project-p5r

Cosa fa l'app oggi, per aree, e cosa resta aperto. Il dettaglio tecnico di ogni area è in [`ARCHITETTURA.md`](ARCHITETTURA.md), le
regole di comportamento in [`DECISIONI.md`](DECISIONI.md). La storia delle lavorazioni è nella cronologia di git.

Stato: tutte le aree sotto sono **in uso**. L'istanza di preparazione (scrittura dei contenuti) e l'istanza di rilascio (contenuti in
sola lettura, partite per utente) girano dallo stesso codice. Schema dei dati: 339 migrazioni di gioco (l'ultima è la 339), 63 delle partite (l'ultima è la 063).

## Compendio e skill
- Compendio delle Persona Royal (`/compendio`) con scheda di dettaglio: arcano, livello, affinità, skill per livello, statistiche,
  descrizione originale in italiano, immagine; filtri e ricerca su nome canonico e italiano.
- Elenco e scheda delle skill (`/skill`), glossario dei termini (`/compendio/glossario`).
- Persona dei membri del gruppo con le loro forme, nel compendio.
- Rese italiane modificabili da Impostazioni → Traduzioni; ogni dato correggibile ha «Modifica» e «Ripristina».

## Fusione
- Fusione diretta e inversa, ricette speciali e Demoni del Tesoro, costo di evocazione (`/fusione`).
- Alberi di fusione ricorsivi ordinati per costo, a partire da scorta, Registro e Persona catturabili.
- Eredità delle skill, ricerca per skill desiderate con propagazione a catena negli alberi.
- Bonus della Stanza di Velluto: sconti del Registro, EXP dei Confidenti, Forca, Isolamento con incensi, Gemelle, Allarme.
- Piani salvati e obiettivi per Persona.

## Partita
- Più partite, una attiva, cambio dalla barra in alto; dati della partita in una finestra (`/partita`), con il salvataggio di Persona 5 e i
  contenuti scaricabili posseduti (li leggono la Fusione e lo Scaffale con lo scatolone del Leblanc).
- Scorta e compendio personale, Persona della partita, statistiche stimate e registrate.
- Confidenti con rango, punti in note, semafori dei requisiti, inviti, relazione romantica, regali con reazione, doni ricevuti;
  scheda del Confidente (`/confidenti/:chiave`).
- Doti sociali con note e soglie, promemoria «Applica», interruttore della Fortuna.
- Denaro con i movimenti automatici delle voci e quelli a mano; oggetti ottenuti, copie, consumi e uscite.
- Progressi, trofei, storico degli eventi con la provenienza, completamento (`/guida/completamento`).
- Avanzamento automatico di fascia e giorno, meteo per fascia.

## Diario (guida giorno per giorno)
- `/guida/percorso`: le voci di ogni giorno e fascia, in ordine, con gli effetti dichiarati (Doti, Confidenti, acquisti, yen, oggetti,
  trofei, sblocchi, Persona, inviti, letture, pesca, domande, esami) e la spunta che li applica e li annulla.
- Voci con condizione «Si fa solo se», effetti con condizione «Vale solo se», voci con alternative (televendite), esiti scelti alla
  spunta, ricevute della spunta.
- Modifica completa delle voci; copia, taglio e incolla (anche fra giorni) e appunti fissi nella preparazione.
- Calendario degli eventi (`/guida/calendario`) collegato alle voci.

## Mondo, mappe e luoghi
- Mappa di viaggio di Tokyo con quartieri, Palazzi e luoghi; pagine di quartiere, Area e luogo (`/guida/citta`, `/guida/luogo/…`).
- Palazzi (`/guida/dungeon`) con Aree, planimetrie, infiltrazioni, guida delle aree collegata ai pin, stato «concluso» e «completato».
- Memento con dedali, aree, Persona, Richieste e trama.
- Visore ed editor delle mappe (`/guida/mappe`): spilli in quattro categorie, condizioni di visibilità, pezzi delle planimetrie,
  passaggi, esportazione e importazione; «Dove si trova» per ogni cosa del mondo. Una sola guida da usare in ogni visore, su ogni mappa
  con voci della guida (pulsante «Guida»).
- Luoghi della guida (`/guida/mappe`): miniature delle carte dei Palazzi, dei Memento, dei loro Dedali e delle loro aree, da inserire,
  cambiare o togliere nella preparazione (file, Ctrl+V, «Incolla dagli appunti»).
- Cestino delle eliminazioni della guida e delle mappe.

## Negozi, oggetti e attività
- Negozi con orari, sede, listini condivisi, scorta e rifornimento, sconti dal rango di un Confidente (`/guida/negozi`).
- Catalogo degli oggetti con offerte, regali, contenuti, ricette e note storiche (`/guida/oggetti`).
- Attività, lavori, libri, film, videogiochi, cruciverba, con esiti, trofei, oggetti e modificatori dei libri. Le Doti delle attività
  sono strutturate (fisse o scelte alla spunta: la Dote a caso del biliardo e di Gun About, le note delle freccette) e diventano il promemoria
  «Applica» sia alla spunta della voce sia con il + del contatore in Partita → Progressi.
- Richieste dei Memento con sblocco e scadenza (`/guida/richieste`).

## Risposte immediate
- Domande in classe, esami e quiz TV con il premio della guida (`/guida/domande`).
- Aiuto in battaglia e schede delle Ombre (`/guida/battaglia`, `/guida/ombra/:chiave`), negoziazione con le risposte Royal.
- Pesca con regole e visite della partita; Covo dei Ladri, sfide, personaggi.

## Ricerca e strumenti
- Ricerca globale su 29 tipi di cose (personaggi, tratti, cruciverba e glossario compresi), dalla barra in alto; ogni risultato porta
  all'elemento nella sua pagina.
- Impostazioni: partite, traduzioni, correzioni, Cestino, caratteri, grafica predefinita, backup dei dati di gioco («Importa»), copia
  dell'istanza, documentazione delle API, «Prepara edizione» del rilascio; «Informazioni» con le fonti dei dati, l'unico punto che le cita.
- Interfaccia per desktop, tablet e telefono; installabile come web app a schermo intero, con l'invito la prima volta che la Home si apre da telefono o tablet.

## Punti aperti

**Piano di intervento del 31 ottobre (approvato)**
- Analisi ECC dell'intera app (codice, dati su una copia, 55 rotte misurate in cinque formati) ordinata in dodici lotti: L0 base di
  misura, L1 difetti visibili mentre si gioca, L2 scritture sicure, L3 mappe al tocco, L4 navigazione verso l'elemento, L5
  prestazioni, L6 accessibilità, L7 testi che informano, L8 coerenza dei dati, L9 sicurezza delle due istanze, L10 miglioramenti che
  cambiano l'aspetto, L11 manutenibilità e documenti.
- Fatti: L0 (misure di base sulla copia), L1 (difetti visibili mentre si gioca; L1-01 e L1-02 secondo lo schizzo approvato per D2) e
  L2 (scritture sicure: niente ripetizioni automatiche delle scritture, errori in italiano, guida del giorno tenuta senza rete,
  «Applica» in un gesto unico) e L3 (mappe al tocco: doppio tocco e pinch sui pin, pagina che scorre col dito sulla mappa a vista
  intera, foglio e Guida che non coprono il pin, trascinamento senza ridisegni, Covo chiuso nell'indice prima del 5 maggio) e L4
  (navigazione verso l'elemento: rimandi all'elemento citato invece che all'elenco, ritorno fra mappe sorelle, quattro tipi nuovi nella
  ricerca, Confidenti con un indirizzo solo, Memento dai Palazzi, Ombre collegate dalla scheda Persona) e L5 (prestazioni: indici,
  cache dei dati di gioco del Diario e dei Palazzi, una voce sola alla spunta, pin letti in blocco, ETag del manifest, copie di avvio
  con un tetto in byte, letture condivise di «Da applicare», schede della Partita a richiesta, librerie in un file proprio; risposte
  campione identiche byte per byte; tempi mediani sulla copia: giorno del Diario −23/−39%, mappe −5/−34%, schede di Palazzo e Memento −2/−3%;
  avvio a freddo con «Slow 4G» −0,2 s).
- L6 (accessibilità) fatto: schede con le frecce, fuoco sopra la barra inferiore, titoli h1, nomi dei pulsanti delle partite, contrasti
  ad almeno 4,5:1 anche con i colori degli elementi (accesi col sì dell'utente), caselle nel rosso del tema, movimento ridotto, editor delle mappe da tastiera, fuoco nel popup del pin, Esc nella Guida, area di tocco
  di 44 px per pin e frecce, piastrelle del Compendio senza pulsanti dentro i link, stati «fatto» ed «esaurito» col segno C ovunque.
- L7 (testi) fatto: nel rilascio niente provenienza dei dati né note per chi li corregge, con le fonti in Impostazioni → Informazioni (D10);
  niente conteggi scritti a mano nella Home e nell'indice della Guida; l'elenco dei Confidenti col bonus degli esami letto dalla regola unica e
  i moltiplicatori (esami, invito, Persona dell'arcano, Fortuna, punti del libro) letti dalle costanti condivise, con lo stesso testo; via la
  frase falsa sui dati «ricaricati a ogni avvio» e un nome solo, «Backup dei dati di gioco»; via UID, firme, codici di risposta, ore ISO, fasi
  interne e percorsi `docs/…` (interfaccia e messaggi del server); date di gioco in un formato solo con l'articolo giusto anche per l'8 e
  l'11, titoli dello Storico compresi (quelli già scritti in «MM-GG» si rendono in lettura); gergo tolto («registro dei gesti», «non ancora
  gestito», «strutture fisse», i testi della pesca in parole da giocatore), «Dove si trova» con la frase del suo tipo; il costo della fusione
  è «evocazione dal Registro», 0 per gli ingredienti in scorta; la disponibilità dell'articolo nel visore dall'esito strutturato; «Stato in:
  …» al posto di «Stato nella …»; nel rilascio la negoziazione mostra le varianti del testo della domanda, senza le provenienze.
- Da L7, per L8 (correzioni ai dati, non fatte: servono migrazioni): nel pacchetto iniziale 308 testi liberi dei dati di gioco (fuori dalle
  colonne di fonte e d'archivio) citano allgamestaff, «da verificare», `docs/` o un file `.md`/`.json`; i più sono in `spillo.descrizione`
  (228), poi `dungeon.note` (8), `punto_interesse.descrizione` (7), `settimana_guida.incertezze` (9), `confidente_regalo.*` (7).
  Il conteggio sull'istanza va rifatto su una copia prima della migrazione.
  Le incertezze del calendario e della battaglia nel rilascio sono già nascoste; gli altri testi si vedono anche lì.
- Da L5, per L8: gli id di `partita` si riusano dopo un'eliminazione (nessun AUTOINCREMENT) e l'archivio immutabile
  `acquisto_legacy_valutazione` non ha una chiave esterna verso la partita: una partita nuova si ritrova accanto le righe d'archivio di una
  eliminata con lo stesso id.
- Decisioni dell'utente (01/11): D1 non toccare (L8-01 resta com'è); D2 procedere; D3, D4, D5, D6 sì come proposto; D7 pulsante
  «Applica» nella notifica; D8 e D9 no (nessun tracciamento del Covo; l'annullo dell'incenso resta com'è); D10 sì; D11 no; D12 sì;
  D13 no; D14 copia della produzione in sola lettura prima delle misure di L8; D15 opzione C (segno a sinistra e nome barrato in grigio); D16 non serve riconfermare;
  D17 sì; D18 procedere; D19 da motivare all'utente prima di farlo; D20 prima gli schizzi.
- L8 (coerenza dei dati), stato attuale (migrazioni 335–340):
  - Requisiti, date e livelli della guida che l'app sa usare (D4, 340): sblocco degli 8 Speciali, condizioni delle Gemelle e di Lavenza,
    rango 9 di Maruki entro il 17 novembre per tre finali (Royal, standard come negazione, negativo 3), arco dei Palazzi di 3 ricette, livello consigliato come numero (6 Battaglie Sfida,
    2 boss, Mietitore), 17 sfide del Covo che contano uno stato della partita (attività, lavori, contatori, cruciverba, timbri, yen spesi,
    Confidenti al rango massimo, Richieste, Compendio, livello di una Persona; i totali «tutti» contati nel DB); con lo stato nella partita.
    I testi della guida restano; i prezzi hanno già il loro punto unico (catalogo e listini).
  - Sfide del Covo senza conteggio perché la partita non tiene lo stato che contano (lacune aperte, elenco con i motivi nel censimento di
    L8-03): le scelte degli esiti dei turni non si registrano se non danno oggetti o trofei (Big Bang Burger, fuoricampo, miglior caffè e
    curry), i punti della pesca sono un saldo senza il guadagnato, i punti del negozio dei vestiti usati sono un saldo, le statistiche delle
    Persona sono stime salvo i valori osservati, i fiori dei Memento e le statistiche di battaglia non si tengono; Maid Café e gioco
    dell'artiglio non sono attività del DB, il Jazz Club non si conta.
  - Avvisi del giorno: un dato del giorno, modificabile dall'editor del giorno; non ripetono più le voci, la trama e i vincoli (339).
  - Livello consigliato dei Palazzi: minimo e massimo, con il confronto delle fonti nella nota storica del Palazzo (335).
  - Capienza della scorta: posti di partenza e gradini in un solo dato (336). Richieste: sblocco dalle condizioni, scadenza dalla data, dedalo
    da `area_chiave` (337). Giorno di un'infiltrazione: quello delle voci legate a lei.
  - Cattura delle Persona: una regola sola per Compendio, alberi e cicli, con tre stati (provata, esclusa per documento, da verificare; le 62
    da verificare restano catturabili, decisione di Roberto). «Dove si incontra»: un servizio solo, Ombre della guida e dedali dei Memento.
  - Effetto dei 90 tratti: un solo testo, la descrizione della guida, in Sfide, scheda Persona, skill e fusione; si corregge dalla riga delle Sfide.
  - Livello consigliato: Kamoshida 10 e Niijima 45 visibili, confermati da Roberto.
  - Forca, Isolamento, Gemelle, cicli e Aojiru leggono i numeri dalle regole condivise. «Anima da cineasta» parte acceso col libro letto ed è
    spento e disattivato senza. Le Doti da segnare hanno «Applica» nella notifica. Le attività che danno Doti (biliardo, Gun About, Takemi,
    bagno, gabbie di battuta, Big Bang Burger) hanno le Doti strutturate.
- L8, in attesa della scelta di Roberto:
  - avvisi del giorno: le 13 frasi coperte solo da trama o vincoli (#70, #140, #161, #171, #181, #196–#203), i 10 casi in dubbio e i 13
    conflitti di dati del censimento (Richiesta di Kawakami sulla voce del 19 luglio, «Impeto dell'Arcano Sup.», lettera a Kamoshida, ranghi
    senza voce di Akechi e di Igor, nome del trofeo dell'11 ottobre, data del rango 1 di Hifumi, date di Medjed, scadenza del Palazzo di
    Niijima, termine del ricatto di Kaneshiro, conto alla rovescia di Okumura, giorno delle elezioni, rango 5 di Kasumi);
  - per 19 Persona le aree dei Memento del compendio non coincidono con le Ombre della guida (la scheda le mostra tutte e due);
  - alberi di fusione: le Persona DLC dei pacchetti posseduti non sono più proposte «da catturare», ma solo se in scorta o nel Registro
    (come già facevano Compendio e cicli);
  - attività Biliardo: la guida delle sfide del Covo la dice «sbloccata al Rango 2 con Akechi», ma l'attività non ha condizioni;
  - prezzi dei consumabili diversi fra la pagina Oggetti della guida e il listino (nessuno corretto, il listino resta com'è): Dango lunare
    640 ¥ (allgamestaff, Oggetti) contro 800 ¥ (allgamestaff, elenco dei negozi, Super Muramasa); Agodashi Oden 800 ¥ (Oggetti) contro
    900 ¥ (elenco dei negozi, Triple Seven); Homunculus 120.000 ¥ (Oggetti) contro 5.000 ¥ (listino di Tanaka, samurai-gamers); per questi
    tre c'è la nota storica sulla fonte, sull'offerta e sull'oggetto. Daifuku alla fragola 29.800 ¥ (Oggetti) contro il baratto con una
    Cartolina del Mercante Sakai (allgamestaff, scambi): i 29.800 ¥ sono il prezzo del «Set della dolce delizia» delle Televendite del
    22 gennaio, che è nel listino con lo stesso prezzo.
- L8, ancora da fare: L8-01 (D1: non toccare); i gradini della capienza non hanno un editor (si correggono con una migrazione).
- L9 fatto: gli SVG caricati non eseguono script se aperti da soli (CSP `sandbox` e allegato, nell'app si vedono come prima); «Scarica da
  URL» non raggiunge la rete interna né con un IP nell'URL, né con un nome, né con un redirect (al più 5, solo http e https); i collegamenti
  alle fonti passano tutti da `urlHttp`; la CSP completa del rilascio è attiva in solo rapporto accanto a quella applicata di prima; limiti di
  memoria e di processi su ogni container, frontend del rilascio in sola lettura, guardia intera del bundle nella costruzione dell'immagine;
  lo User-Agent senza il nome utente (D17). Non fatti per D11: intestazioni nell'nginx della preparazione, limite di frequenza e tetto di
  righe nel rilascio. Da fare dopo l'osservazione nell'istanza vera: passare la CSP completa da solo rapporto ad applicata.
- L10-05, prima parte fatta (D6): «Annulla ultimo» del cassetto del Confidente letto dallo storico, resta dopo un ricaricamento. Da fare la
  seconda parte (un segno ben visibile quando l'invito ×1,2 è acceso), dopo lo schizzo approvato.
- L10-09 fatto (D18, schizzo approvato): «Registra una visita» della Pesca in tre passi (Quando, Cosa hai pescato, Riepilogo), giorno e
  fascia della partita già messi, ordine calcolato con «Cambia», domanda sul conto delle attività solo se ci sono visite contate senza
  dettaglio, pesci a contatore, il resto in «Altri dettagli», niente spunta di conferma; «Aggiungi a questa visita già segnata» è un comando
  della visita. Le frasi dell'anteprima della pesca dette dal server in parole da giocatore.
- Da applicare: le visite di pesca del Diario si registrano ancora con il modulo di prima (17 campi e spunta); usare il foglio in tre passi
  va deciso da Roberto (nel Diario la domanda sul conto andrebbe lasciata obbligatoria).
- Aperti: L8 (le voci sopra), L10 (le proposte con schizzo approvato, D20, e la seconda parte di L10-05) e L11; in sospeso D19 (motivazione data, risposta dell'utente da avere). Restano da decidere anche i ritratti tondi ritagliati (`RitrattoPersonaggio`, `SceltaQuale`) e le
  immagini a copertura nel CSS (`.illustrazione-segno__immagine`, `.carta-arcano-mini`), contro la regola «immagini mai ritagliate». Restano attenuati con l'opacità, fuori da D15, i luoghi «non ancora» di `QuartierePage`
  e le Persona in deposito (`.riga-persona--deposito`): da rivedere per il contrasto.

**Lavori aperti**
- **Vecchia lista dei contenuti della guida.** `ContenutiGuidaMappa` (con `SchedaContenutoGuida` e `GET /api/mappe/contenuti/:chiave`)
  non è più montata da nessuna pagina: la tengono in vita soltanto i suoi test (`ContenutiGuidaAccesso.test.tsx`,
  `OrganizzazioneMappe.test.tsx`, `SchedaContenutoGuida.test.tsx`), che non si cancellano senza il sì dell'utente.

**Riservato all'utente**
- Collaudo automatico completo della ricerca globale: lo esegue l'utente.
- Proposte di conversione delle voci del Diario aperte in «Da completare» (periodo dal 1° aprile al 1° giugno): 43 «da verificare» (lo yen
  dello Scaffale del 12 aprile è chiuso dalla 330, con la condizione del salvataggio di Persona 5) e 8
  «probabili», più 4 certe lasciate (le tre «Concimare la pianta…», che dipendono dal tipo di bionutrimenti usato, e lo yen del bagno
  del 26 maggio, da decidere con la sua «da verificare»). Il conteggio va riletto nella pagina prima di decidere.

**Domande all'utente sui doni dei Confidenti**
- I doni hanno la regola della guida, valutata sulla partita (`doniConfidenti.ts`, il dono vale finché la regola vale): i dolci «se
  fidanzata» (10) e i giri choco del 15 febbraio (11) dalla 329, il Rampino di Morgana dal suo passo nel Palazzo di Kamoshida dalla 332; i
  cioccolatini di Ryuji e Sojiro arrivano dall'esito di San Valentino scelto alla spunta della voce del 14 febbraio (331).
- Resta il Sacchetto di carta di Iwai: la guida lo lega alla vendita della medaglia di Kamoshida del 4 maggio (sbirciando nel sacchetto) e
  alla restituzione del 6 maggio. Sono due voci del periodo validato già spuntate: «oggetto ricevuto» e «restituito» su quelle voci
  cambierebbero le partite, quindi decide l'utente.

**Grafica**
- Caricare nell'istanza di preparazione le 4 illustrazioni delle attività nuove (`docs/grafica/asset-generati/2026-10-29/attivita/`:
  estrazione della lotteria, concimare la pianta, fabbricazione degli strumenti, fabbricazione di Kawakami) con
  `PUT /api/immagini/attivita/<chiave>`; poi la cartella si toglie dal repository.
