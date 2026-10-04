// ============================================================
// descrizioni/compendio — le rotte di `/api/compendio`: compendio Royal, guida giorno per giorno, città, negozi, Palazzi
// ============================================================
//
// L'area è in gran parte di sola lettura (Persona, skill, oggetti, Confidenti, glossario, blocchi della guida), con
// `?partita=` facoltativo dove la risposta può portare lo stato di una partita. Le scritture sono **canone**: voci della
// giornata, testi dei Palazzi (dungeon, aree, punti, pin collegati), ingresso dei quartieri e Doti a ogni incontro dei
// Confidenti finiscono nel file di gioco e valgono per tutte le partite.
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/** Errore comune: `?partita=` indica una partita che non esiste. */
const PARTITA_NON_TROVATA = [404, 'partita-non-trovata'] as const;

/** Le descrizioni delle rotte montate sotto `/api/compendio` (`server/routes/compendio.ts`). */
export const DESCRIZIONI_COMPENDIO: DescrizioniArea = {
  // ---- Compendio: arcani, glossario, regole di fusione ----
  'GET /api/compendio/arcani': {
    sommario: 'Elenco degli arcani nell\'ordine di gioco',
    descrizione: 'Gli arcani della tabella `arcana` ordinati per `ordine`, ciascuno con il numero (null dove il gioco non lo assegna) e il nome italiano preso dalle traduzioni.',
    risposta: 'Elenco di `ArcanaDto`',
  },
  'GET /api/compendio/glossario': {
    sommario: 'Glossario dei codici del compendio con la resa italiana',
    descrizione: 'Serve al frontend per tradurre i codici: arcani, elementi delle skill, elementi e sigle delle affinità, affinità, tipi di eredità, statistiche con sigla, tipi e vincoli degli oggetti, aree di Mementos e Doti sociali nell\'ordine di gioco. La sigla vuota indica che la traduzione non ne ha una.',
    risposta: '`GlossarioDto`',
  },
  'GET /api/compendio/termini': {
    sommario: 'Termini di gioco della localizzazione italiana',
    descrizione: 'Le voci dell\'ambito di traduzione `termine`, ordinate per categoria e poi per nome (confronto italiano). Categoria «altro» quando la voce non ne dichiara una; definizione e fonte sono null se mancano.',
    risposta: 'Elenco di `TermineDto`',
  },
  'GET /api/compendio/fusione/regole': {
    sommario: 'Tutte le regole di fusione in una risposta',
    descrizione: 'Ordine degli arcani, tabella arcano × arcano, ricette delle fusioni speciali (ingredienti nell\'ordine della ricetta), tesori con il modificatore di rango per ogni arcano (0 dove manca), matrice dell\'eredità (tipo × colonna, ammesso sì/no) e Persona di ciascun set DLC nell\'ordine dei set. È la base del motore di fusione lato client.',
    risposta: '`RegoleFusioneDto`',
  },

  // ---- Compendio: Persona, skill, oggetti ----
  'GET /api/compendio/persona': {
    sommario: 'Elenco delle Persona con filtri',
    descrizione: 'Filtri facoltativi: `arcana`, `livelloMin`/`livelloMax` (estremi compresi), `dlc`, `rara`, `speciale`, `skill` (nome canonico di una skill che la Persona impara) e `q`, testo cercato sul nome originale e su quello italiano con la ricerca normalizzata. Ordine: livello, ordine dell\'arcano, nome. Ogni voce porta statistiche e affinità.',
    risposta: 'Elenco di `PersonaRiassuntoDto`',
  },
  'GET /api/compendio/persona/:id': {
    sommario: 'Scheda completa di una Persona',
    descrizione: 'Riassunto più skill apprese per livello, dettaglio del tratto, ricetta speciale (se la Persona ne è il risultato) e ricette di cui è ingrediente, set DLC, carte skill ottenibili con l\'esecuzione, titolo di negoziazione, aree e piani di Mementos, oggetto e oggetto d\'allarme con nome e descrizione tradotti.',
    risposta: '`PersonaDettaglioDto`',
    errori: [[404, 'persona-non-trovata']],
  },
  'GET /api/compendio/skill': {
    sommario: 'Elenco delle skill con filtri',
    descrizione: 'Ordinate per nome. `elemento` filtra in SQL; `q` cerca poi su nome canonico, nome italiano ed effetto (originale e tradotto) con la ricerca normalizzata.',
    risposta: 'Elenco di `SkillRiassuntoDto`',
  },
  'GET /api/compendio/skill/:id': {
    sommario: 'Scheda di una skill',
    descrizione: 'Riassunto della skill con le Persona che la imparano (livello della Persona e livello di apprendimento, in ordine di livello), le Persona da cui si ottiene la carta con l\'esecuzione, la fonte della carta, la negoziazione (titolo tradotto con la Persona fra parentesi) e l\'eventuale esclusività.',
    risposta: '`SkillDettaglioDto`',
    errori: [[404, 'skill-non-trovata']],
  },
  'GET /api/compendio/oggetti': {
    sommario: 'Oggetti del compendio con le rese italiane',
    descrizione: 'Ordinati per categoria e nome, con nome, categoria, vincolo e descrizione tradotti. `categoria` filtra in SQL; `q` cerca sul nome originale e su quello italiano.',
    risposta: 'Elenco di `OggettoDto`',
  },
  'GET /api/compendio/confidenti': {
    sommario: 'Elenco dei Confidenti nell\'ordine di gioco',
    descrizione: 'Chiave, nome, arcano e ordine di ogni Confidente, con il nome italiano dell\'arcano. Lo stato nella partita non c\'è: sta nelle rotte delle partite.',
    risposta: 'Elenco di `ConfidenteDto`',
  },
  'GET /api/compendio/confidenti/:chiave': {
    sommario: 'Scheda completa di un Confidente',
    descrizione: 'Abilità per rango, dialoghi con le scelte (punti, risposte romantiche, avvisi), Dote a ogni incontro per i ranghi da 1 a 10, regali consigliati e sconsigliati, disponibilità (giorni, fasce, luogo, sblocco), note generali e fonti. Dati di gioco, senza stato di partita.',
    risposta: '`ConfidenteDettaglioDto`',
    errori: [[404, 'confidente-non-trovato']],
  },
  'PUT /api/compendio/confidenti/:chiave/doti-incontro': {
    sommario: 'Imposta la Dote data a ogni incontro, rango per rango',
    descrizione: 'Per ogni rango indicato sostituisce le voci «dote» che il rango aveva con quelle inviate (da 0 a 5 Doti, note da 1 a 3); i ranghi non inviati restano come sono. Tutto in una transazione. È un dato di gioco: vale per tutte le partite.',
    risposta: '`ConfidenteDettaglioDto` aggiornato',
    errori: [[404, 'confidente-non-trovato']],
  },

  // ---- Blocchi della guida (dati_guida) ----
  'GET /api/compendio/oggetti-guida': {
    sommario: 'Oggetti della guida: consumabili, chiave e materiali, fabbricazione, abiti, scambi',
    descrizione: 'Il blocco `oggetti-guida` della guida. Se è caricato anche il crosswalk `oggetti-crosswalk`, le voci di consumabili e oggetti chiave/materiali abbinate per nome ricevono `articolo` (la chiave dell\'articolo del catalogo) oppure, se non c\'è un articolo, `negozi`; le voci non abbinate restano invariate.',
    risposta: '`OggettiGuidaDto`',
    errori: [[404, 'oggetti-non-disponibili']],
  },
  'GET /api/compendio/personaggi': {
    sommario: 'Personaggi senza spoiler e i loro gruppi',
    descrizione: 'Il blocco `personaggi` della guida, restituito così com\'è.',
    risposta: '`PersonaggiDto`',
    errori: [[404, 'personaggi-non-disponibili']],
  },
  'GET /api/compendio/sfide': {
    sommario: 'Battaglie Sfida, boss segreti, Magnate, tratti e quiz TV',
    descrizione: 'Il blocco `sfide` della guida, restituito così com\'è.',
    risposta: '`SfideDto`',
    errori: [[404, 'sfide-non-disponibili']],
  },
  'GET /api/compendio/completamento': {
    sommario: 'Trofei e sezioni di completamento della guida',
    descrizione: 'Trofei in ordine con le sezioni di consultazione (finali, Covo dei Ladri, DLC, meteo, Nuova Partita+, differenze di Royal, gestione del tempo). Con `?partita=` ogni trofeo dice se è ottenuto e `ottenuti` li conta; senza, sono tutti non ottenuti.',
    risposta: '`CompletamentoDto`',
    errori: [[404, 'completamento-non-disponibile'], PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/battaglia': {
    sommario: 'Aiuto in battaglia e indice delle Ombre',
    descrizione: 'Le sezioni della guida alla battaglia (sistema, assalto e hold up, tecnico, staffetta, speciali, negoziazione…) e l\'indice delle Ombre di Palazzi e Dedali: ogni Ombra riceve `personaCollegata`, la Persona del compendio trovata dalla sua maschera per nome inglese o italiano normalizzato (null se l\'Ombra non ha maschera o il nome non corrisponde).',
    risposta: '`BattagliaDto`',
    errori: [[404, 'battaglia-non-disponibile']],
  },

  // ---- Guida giorno per giorno ----
  'GET /api/compendio/percorso': {
    sommario: 'Indice dei giorni della guida giorno per giorno',
    descrizione: 'Tutti i giorni in ordine, leggeri: giorno della settimana, fase, meteo, numero di avvisi, se il giorno è coperto dalla guida e quante azioni ha (contano solo le voci di genere «azione», le sole che si spuntano). Con `?partita=` anche quante azioni sono fatte e il giorno corrente della partita; senza, `fatte` è 0 e `dataCorrente` è null.',
    risposta: '`PercorsoIndiceDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/percorso/:data': {
    sommario: 'Scheda di un giorno della guida con le sue voci',
    descrizione: '`data` nel formato MM-GG. Trama, vincoli, meteo, avvisi e fonte del giorno, le voci in ordine (prima di giorno, poi di sera), giorno precedente e successivo. Con `?partita=` le voci dicono se sono fatte, e arrivano il giorno corrente e il meteo della partita per quel giorno.',
    risposta: '`PercorsoGiornoDto`',
    errori: [[404, 'giorno-non-trovato'], PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/percorso-elenchi': {
    sommario: 'Elenchi per classificare, collegare e dare effetti a un\'azione della giornata',
    descrizione: 'Gli elementi a cui un\'azione si può collegare o che un effetto può nominare: Confidenti (con l\'arcano come dettaglio), dungeon, Richieste, libri, film, videogiochi, attività (con `turni` vero per quelle contate per volte), negozi e Doti. Sono gli stessi elementi che il server accetta salvando una voce; le righe nascoste dal catalogo sono escluse.',
    risposta: '`ElenchiAzioneDto`',
  },
  'POST /api/compendio/percorso/:data/voci': {
    sommario: 'Aggiunge una voce alla giornata (canone, per tutte le partite)',
    descrizione: 'La voce entra nella fascia indicata (`giorno` se omessa) al posto `posizione` (0 = in cima; omessa o oltre l\'ultima = in fondo) e la fascia si rinumera senza buchi. Genere predefinito «azione»; tipo ed effetti contano solo per le azioni; collegamento ed effetti si verificano contro la guida (devono puntare a elementi che esistono). `?partita=` facoltativo: si controlla prima di scrivere e la risposta porta lo stato della voce in quella partita.',
    risposta: 'La voce creata, `AzionePercorsoDto`',
    errori: [[400, 'voce-vuota'], [400, 'riferimento-non-valido'], [400, 'riferimento-inesistente'], [400, 'effetto-non-valido'], [400, 'effetto-inesistente'], [404, 'giorno-non-trovato'], PARTITA_NON_TROVATA],
  },
  'PUT /api/compendio/percorso/voci/:uid': {
    sommario: 'Modifica una voce della giornata (canone, per tutte le partite)',
    descrizione: 'Si cambiano solo i campi inviati (almeno uno): testo, note (null o vuote le tolgono), genere, fascia, posto nella fascia, tipo, collegamento, rango atteso, effetti. Un collegamento o degli effetti nuovi si verificano; quelli che la voce ha già passano come sono. Cambiando fascia la voce va al posto chiesto o in fondo e la fascia vecchia si ricompatta. Un\'azione che diventa evento perde le spunte, ma se in qualche partita è spuntata con effetti la modifica si rifiuta (409). `?partita=` facoltativo, come per la creazione.',
    risposta: 'La voce aggiornata, `AzionePercorsoDto`',
    errori: [[400, 'voce-vuota'], [400, 'riferimento-non-valido'], [400, 'riferimento-inesistente'], [400, 'effetto-non-valido'], [400, 'effetto-inesistente'], [404, 'voce-non-trovata'], PARTITA_NON_TROVATA, [409, 'voce-con-effetti']],
  },
  'PUT /api/compendio/percorso/voci/:uid/sposta': {
    sommario: 'Sposta una voce della giornata di un passo nella sua fascia',
    descrizione: '`verso` -1 sposta su, +1 giù; la fascia si ricompatta prima. Ai bordi non cambia nulla e non è un errore. `?partita=` facoltativo: le voci della risposta portano lo stato in quella partita.',
    risposta: 'Tutte le voci del giorno nel nuovo ordine, elenco di `AzionePercorsoDto`',
    errori: [[404, 'voce-non-trovata'], PARTITA_NON_TROVATA],
  },
  'DELETE /api/compendio/percorso/voci/:uid': {
    sommario: 'Elimina una voce della giornata, per tutte le partite',
    descrizione: 'La voce esce dalla guida per sempre, con le sue spunte senza effetti, e la fascia si ricompatta. Se in qualche partita è spuntata con effetti l\'eliminazione si rifiuta (409) nominando le partite: va prima tolta la spunta in ciascuna, così gli effetti si annullano.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'voce-non-trovata'], [409, 'voce-con-effetti']],
  },

  // ---- Negozi e articoli ----
  'GET /api/compendio/negozi': {
    sommario: 'Elenco dei negozi',
    descrizione: 'I negozi non nascosti in ordine, con sede, quartiere, gestore, Confidente collegato, orari e conteggi degli articoli dell\'intero catalogo. Con `?partita=` ogni negozio porta anche la sua presenza valutata sugli orari al punto in cui è la partita.',
    risposta: 'Elenco di `NegozioRiassuntoDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/negozi/:chiave': {
    sommario: 'Scheda di un negozio con i suoi articoli',
    descrizione: 'Il negozio (se non nascosto) con note e articoli non nascosti nell\'ordine. Un articolo collegato a un oggetto ne legge nome, categoria, effetto, statistiche e destinatario. Con `?partita=` ogni articolo dice se è acquistato e se è disponibile (requisiti del negozio e dell\'articolo valutati sulla partita) e `acquistati` li conta.',
    risposta: '`NegozioDettaglioDto`',
    errori: [[404, 'negozio-non-trovato'], PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/articoli': {
    sommario: 'Ricerca degli articoli in tutti i negozi',
    descrizione: '`q` cerca (LIKE) su nome, nome italiano, effetto e nome del negozio; `categoria` e `categorie` (separate da virgola, le sconosciute si ignorano) si uniscono; `per` tiene gli articoli per quel destinatario e quelli per «tutti». Solo con `?partita=` valgono `stato` (acquistati / da-acquistare) e `disponibilita` (disponibili / bloccati: una condizione che la partita non sa verificare conta come bloccata). Ordine: negozio, poi articolo. Al massimo 300 risultati; `totale` è contato prima del limite.',
    risposta: '`RicercaArticoliDto`',
    errori: [PARTITA_NON_TROVATA],
  },

  // ---- Città, luoghi, attività ----
  'GET /api/compendio/luoghi': {
    sommario: 'Tutti i luoghi della città come voci da scegliere',
    descrizione: 'I luoghi non nascosti, in ordine di quartiere e poi di luogo, con tipo e quartiere: sono le opzioni per la sede di un negozio o di un\'attività.',
    risposta: 'Elenco di `LuogoOpzioneDto`',
  },
  'GET /api/compendio/citta': {
    sommario: 'Elenco dei quartieri di Tokyo',
    descrizione: 'I quartieri in ordine (escluso l\'ingresso dei Memento, che non è un quartiere) con mappa, punto d\'ingresso e conteggi dei luoghi non nascosti e verificati. Con `?partita=` ogni quartiere dice se è già nel mondo: le regole di sblocco non sono solo date, e solo l\'esito «bloccato» lo nasconde (un dubbio no), con il motivo in `bloccoMotivo`; senza partita sono tutti disponibili.',
    risposta: 'Elenco di `QuartiereRiassuntoDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/citta/:chiave': {
    sommario: 'Scheda di un quartiere con i suoi luoghi',
    descrizione: 'Il quartiere con mappa, ingresso, pianta (o il motivo per cui manca) e i luoghi non nascosti in ordine, ciascuno con Confidenti, attività, negozi, marcatore e condizioni. Con `?partita=` ogni luogo porta la disponibilità valutata sulla partita: la partita serve ai luoghi, non al quartiere.',
    risposta: '`QuartiereDettaglioDto`',
    errori: [[404, 'quartiere-non-trovato'], PARTITA_NON_TROVATA],
  },
  'PUT /api/compendio/citta/:chiave/ingresso': {
    sommario: 'Imposta il punto d\'ingresso del quartiere su una mappa',
    descrizione: 'La mappa si indica con la chiave pubblica (o un alias) e deve esistere; `x` e `y` in percentuale (0–100), `zoom` da 1 a 6 (2,5 se omesso). Sostituisce l\'ingresso che il quartiere aveva.',
    risposta: 'L\'ingresso com\'è dopo la scrittura, `IngressoQuartiereDto`',
    errori: [[404, 'quartiere-non-trovato'], [404, 'mappa-non-trovata']],
  },
  'DELETE /api/compendio/citta/:chiave/ingresso': {
    sommario: 'Toglie il punto d\'ingresso del quartiere',
    descrizione: 'Cancella l\'ingresso del quartiere; se non ne aveva uno non cambia nulla e non è un errore.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'quartiere-non-trovato']],
  },
  'GET /api/compendio/attivita': {
    sommario: 'Attività, lavori, libri e film',
    descrizione: 'Le righe non nascoste: attività del tempo libero e lavori separati, libri e film con posizioni ed effetti. Con `?partita=` arrivano letture e avanzamenti della partita, la disponibilità di ogni voce e i conteggi di libri letti e film visti.',
    risposta: '`AttivitaTutteDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/libri': {
    sommario: 'Libri con i totali di lettura',
    descrizione: 'I libri non nascosti in ordine, con posizioni e negozi dove si comprano. Con `?partita=` ogni libro porta avanzamento e disponibilità, e i totali dicono libri finiti, sessioni lette e da leggere e se vale «Lettura rapida».',
    risposta: '`LibriDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/film': {
    sommario: 'Film e DVD con i totali di visione',
    descrizione: 'I film non nascosti in ordine, con posizioni ed effetti. Con `?partita=` ogni film porta avanzamento e disponibilità; le sessioni di completamento contano ogni film fino al suo totale, mentre `visioniRegistrate` conta anche le visioni al cinema oltre il totale.',
    risposta: '`FilmDvdDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/videogiochi': {
    sommario: 'Videogiochi con i totali dei round',
    descrizione: 'Le attività di tipo videogioco non nascoste, con negozi e round totali (almeno uno). Con `?partita=` ogni videogioco porta avanzamento (limitato al totale) e disponibilità; i totali dicono iniziati, completati, round fatti e round da fare.',
    risposta: '`VideogiochiDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/cruciverba': {
    sommario: 'Cruciverba di Leblanc',
    descrizione: 'Tutti i cruciverba in ordine di calendario con indizio e risposta. Con `?partita=` ciascuno dice se è risolto, e arrivano la data di gioco e il prossimo da segnare (il primo non risolto da quel giorno in poi); senza, `prossimo` e `dataGioco` sono null.',
    risposta: '`CruciverbaTuttiDto`',
    errori: [PARTITA_NON_TROVATA],
  },

  // ---- Richieste, calendario, domande ----
  'GET /api/compendio/richieste': {
    sommario: 'Richieste dei Mementos con i dati di Jose e i dedali',
    descrizione: 'Le Richieste ordinate per dedalo (quelle senza dedalo in coda) e poi per ordine della guida, i dati di Jose e i dedali nell\'ordine di percorrenza con totale e completate. Con `?partita=` ogni Richiesta porta il suo stato (accettata, completata o null).',
    risposta: '`RichiesteDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/calendario': {
    sommario: 'Calendario di gioco con eventi e settimane della guida',
    descrizione: 'I giorni (tutti, o del solo mese `mese` nel formato MM) con meteo, tempo libero ed eventi, i riassunti delle settimane della guida e l\'elenco dei mesi. Con `?partita=` arrivano la data di gioco, il giorno corrente e le prossime sei scadenze o esami da quel giorno, con i giorni mancanti.',
    risposta: '`CalendarioDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/domande': {
    sommario: 'Domande in classe ed esami',
    descrizione: 'Tutte le domande in ordine di anno scolastico (aprile → marzo) e, a pari data, di guida; gli esami con date e domande e i premi. Con `?partita=` ogni domanda dice se è fatta e `prossime` sono le domande non fatte della prima data da oggi in poi.',
    risposta: '`DomandeDto`',
    errori: [PARTITA_NON_TROVATA],
  },

  // ---- Palazzi e Memento ----
  'GET /api/compendio/dungeon': {
    sommario: 'Elenco dei Palazzi e dei Memento',
    descrizione: 'I riassunti in ordine di gioco: date, finestra di esistenza, livello consigliato, conteggi di aree e punti, raccolta sulle planimetrie (per i Memento gli obiettivi dei dedali). Con `?partita=` anche i punti gestiti, quanto è stato raccolto e se il Palazzo è completato.',
    risposta: 'Elenco di `DungeonRiassuntoDto`',
    errori: [PARTITA_NON_TROVATA],
  },
  'GET /api/compendio/dungeon/:chiave': {
    sommario: 'Scheda completa di un Palazzo o dei Memento',
    descrizione: 'Riassunto, note e fonti, aree in ordine con le loro planimetrie e i punti della guida (marcatore e pin collegati); per i Memento il dedalo di ogni area con timbri e Richieste, per i Palazzi l\'elenco di tutte le planimetrie. Con `?partita=` arrivano lo stato dei punti e i collezionabili presi; senza, `presi` è null.',
    risposta: '`DungeonDettaglioDto`',
    errori: [[404, 'dungeon-non-trovato'], PARTITA_NON_TROVATA],
  },
  'PUT /api/compendio/dungeon/:chiave': {
    sommario: 'Corregge i testi della scheda di un Palazzo',
    descrizione: 'Si cambiano solo i campi inviati (nome, sovrano, date, livello consigliato, note); un nome vuoto lascia quello di prima. È una correzione della guida: vale per tutte le partite ed entra nel pacchetto di gioco.',
    risposta: 'La scheda aggiornata (senza stato di partita), `DungeonDettaglioDto`',
    errori: [[404, 'dungeon-non-trovato']],
  },
  'PUT /api/compendio/dungeon/:chiave/finestra': {
    sommario: 'Cambia la finestra in cui il Palazzo compare sulla mappa di Tokyo',
    descrizione: 'Scrive la voce del Palazzo in `finestre-dungeon` (dati della guida), creandola se manca: `dal` e `al` sono giorni MM-GG del calendario di gioco (aprile → marzo), `al: null` vuol dire senza fine. La stessa finestra decide anche l\'arco corrente delle condizioni. Le altre voci del blocco restano come sono.',
    risposta: 'La finestra salvata, `{ dal, al }`',
    errori: [[404, 'dungeon-non-trovato'], [400, 'data-non-valida'], [400, 'fine-prima-di-inizio']],
  },
  'PUT /api/compendio/dungeon/:chiave/atterraggi': {
    sommario: 'Sostituisce le regole di atterraggio dalla mappa di Tokyo',
    descrizione: 'Le regole si salvano tutte insieme, nell\'ordine dato, che è l\'ordine in cui si provano: vale la prima che copre il giorno della partita (senza partita o senza giorno, la prima senza date). Ogni regola vale sempre (date nulle), da `dal` in poi (`al` nullo), fra `dal` e `al` compresi, o in un giorno solo (`dal` = `al`), e porta a una planimetria di questo Palazzo, centrata sul pin `spillo` se dato. Prima di scrivere si controlla tutto: giorni esistenti, fine non prima dell\'inizio, planimetria del Palazzo (non la mappa d\'insieme), pin su quella planimetria. Un elenco vuoto toglie tutte le regole.',
    risposta: 'Le regole salvate, elenco di `AtterraggioPalazzoDto`',
    errori: [[404, 'dungeon-non-trovato'], [400, 'data-non-valida'], [400, 'fine-senza-inizio'], [400, 'fine-prima-di-inizio'], [404, 'mappa-non-trovata'], [400, 'mappa-fuori-palazzo'], [400, 'spillo-fuori-mappa'], [409, 'schema-non-aggiornato']],
  },
  'POST /api/compendio/dungeon/:chiave/aree': {
    sommario: 'Aggiunge una sezione nuova alla guida di un Palazzo',
    descrizione: 'L\'area nasce `dopo` l\'area indicata, in cima con `dopo: null`, in fondo se `dopo` manca; l\'ordine del Palazzo si ricompatta. La chiave si ricava dal nome (resa unica e nei limiti accettati dalle rotte). Con `planimetria` l\'area si aggiunge alle aree di quella planimetria, che deve essere del Palazzo. È canone: vale per tutte le partite.',
    risposta: '`{ chiave, nome, ordine }` dell\'area creata',
    errori: [[400, 'area-non-del-palazzo'], [400, 'mappa-fuori-palazzo'], [404, 'dungeon-non-trovato'], [404, 'mappa-non-trovata']],
  },
  'PUT /api/compendio/aree/:chiave': {
    sommario: 'Corregge nome e descrizione di un\'area della guida',
    descrizione: 'Si cambiano solo i campi inviati; un nome vuoto lascia quello di prima. Vale per tutte le partite.',
    risposta: 'L\'area aggiornata (senza stato di partita), `AreaDungeonDto`',
    errori: [[404, 'area-non-trovata']],
  },
  'DELETE /api/compendio/aree/:chiave': {
    sommario: 'Elimina un\'area della guida, per tutte le partite',
    descrizione: 'In una transazione se ne vanno i punti dell\'area con quel che le partite ne avevano segnato, gli spilli della guida senza mappa che le appartenevano, i timbri dei dedali, i legami con le planimetrie e i riferimenti nei testi della guida; le Richieste restano, senza area. Le aree che la seguivano salgono di un posto. Un pacchetto importato dopo la rimette.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'area-non-trovata']],
  },
  'POST /api/compendio/aree/:chiave/punti': {
    sommario: 'Aggiunge un punto alla guida di un\'area',
    descrizione: 'Il punto (nome e tipo obbligatori) nasce in fondo all\'area, o in fondo ai passi dell\'Enigma indicato in `contenitore`, salvo `ordine` esplicito. La chiave si ricava dal nome. Un passo segue le regole degli Enigmi: l\'Enigma è della stessa area, non è a sua volta un passo e non ha pin propri; l\'Enigma si riallinea in ogni partita.',
    risposta: 'Il punto creato, `PuntoInteresseDto`',
    errori: [[400, 'non-un-enigma'], [400, 'enigma-di-altra-area'], [400, 'enigma-dentro-enigma'], [404, 'area-non-trovata'], [404, 'punto-non-trovato'], [409, 'enigma-con-pin']],
  },
  'PUT /api/compendio/punti/:chiave': {
    sommario: 'Corregge un punto della guida',
    descrizione: 'Si cambiano solo i campi inviati: nome (vuoto = invariato), descrizione, tipo, esauribilità, ordine e `contenitore` (l\'Enigma di cui è un passo; null lo riporta fra le voci dell\'area). Un punto con pin non diventa descrittivo, un Enigma con passi non cambia tipo. Cambiando Enigma la voce va in fondo fra le nuove compagne e gli Enigmi toccati si riallineano in ogni partita.',
    risposta: 'Il punto aggiornato (senza stato di partita), `PuntoInteresseDto`',
    errori: [[400, 'non-un-enigma'], [400, 'enigma-di-altra-area'], [400, 'enigma-dentro-enigma'], [404, 'punto-non-trovato'], [409, 'punto-con-pin'], [409, 'enigma-con-passi'], [409, 'enigma-con-pin']],
  },
  'DELETE /api/compendio/punti/:chiave': {
    sommario: 'Elimina un punto della guida, per tutte le partite',
    descrizione: 'Se ne vanno gli stati delle partite, il marcatore e il «raccolto» degli elementi della guida senza mappa che lo citano; i pin delle planimetrie restano con il loro «raccolto» e perdono solo il collegamento. I passi di un Enigma eliminato tornano voci dell\'area, in fondo; eliminando un passo il suo Enigma si riallinea.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'punto-non-trovato']],
  },
  'PUT /api/compendio/punti/:chiave/sposta': {
    sommario: 'Sposta un punto di un posto su o giù nella guida dell\'area',
    descrizione: '`verso` -1 su, +1 giù, fra le voci accanto (quelle fuori da ogni Enigma, o i passi dello stesso Enigma); l\'ordine si ricompatta. Oltre il primo o l\'ultimo posto è un errore (409).',
    risposta: 'Il punto spostato, `PuntoInteresseDto`',
    errori: [[404, 'punto-non-trovato'], [409, 'punto-al-limite']],
  },
  'PUT /api/compendio/punti/:chiave/pin/:spillo': {
    sommario: 'Collega un pin di una planimetria a un punto della guida',
    descrizione: 'Il pin deve stare su una planimetria del Palazzo del punto ed essere libero o già di quel punto; il punto non può essere descrittivo né un Enigma con passi. Un punto può avere più pin, un pin un punto solo. Collegando, gli stati delle partite del punto e dei suoi pin si uniscono.',
    risposta: 'Il punto con i pin collegati, `PuntoInteresseDto`',
    senzaCorpo: true,
    errori: [[400, 'punto-descrittivo'], [400, 'enigma-con-passi'], [400, 'pin-fuori-dal-palazzo'], [404, 'punto-non-trovato'], [404, 'spillo-non-trovato'], [409, 'pin-gia-collegato']],
  },
  'DELETE /api/compendio/punti/:chiave/pin/:spillo': {
    sommario: 'Scollega un pin di una planimetria da un punto della guida',
    descrizione: 'Il pin deve essere collegato a quel punto. Si toglie solo il collegamento (anche quello vecchio scritto nel riferimento del pin); gli stati delle partite restano come sono, a ciascuno il suo.',
    risposta: 'Il punto con i pin che restano, `PuntoInteresseDto`',
    errori: [[404, 'punto-non-trovato'], [404, 'spillo-non-trovato'], [409, 'pin-non-collegato']],
  },
};
