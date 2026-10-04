// ============================================================
// descrizioni/partite — le rotte di /api/partite: partite multiple e tracking della partita (Doti, squadra, Confidenti,
// giornata, compendio, scorta, obiettivi, piani, cicli, Stanza di Velluto, storico)
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/** La partita che non esiste: il 404 comune a quasi tutte le rotte dell'area (`verificaPartita`). */
const PARTITA = [404, 'partita-non-trovata'] as const;

/** Le descrizioni delle rotte montate da `server/routes/partite.ts` sotto `/api/partite`. */
export const DESCRIZIONI_PARTITE: DescrizioniArea = {
  // ---- Partite ----
  'GET /api/partite': {
    sommario: 'Elenco delle partite',
    descrizione: 'Tutte le partite salvate: prima quella attiva, poi le altre dalla modificata più di recente. Ogni partita porta anche il meteo del momento (`meteoOra`), calcolato sul giorno e sulla fascia correnti.',
    risposta: 'Elenco di `PartitaDto`',
  },
  'GET /api/partite/attiva': {
    sommario: 'La partita attiva',
    descrizione: 'La partita segnata come attiva, quella su cui lavora l\'app. Non averne nessuna non è un errore: la risposta è `null`.',
    risposta: '`PartitaDto` della partita attiva, oppure `null`',
  },
  'POST /api/partite': {
    sommario: 'Crea una partita',
    descrizione: 'Crea la partita in una transazione. Diventa l\'attiva (togliendo il segno alle altre) se è la prima o se il corpo chiede `attiva: true`. I campi assenti prendono i valori predefiniti: protagonista al livello 1, giorno corrente il primo del percorso della guida, fascia «giorno», difficoltà normale, nessun DLC. Nascono anche le righe delle Doti sociali a zero e dei Confidenti non sbloccati, e l\'evento `partita-creata` nello storico.',
    risposta: '`PartitaDto` della partita creata',
  },
  'GET /api/partite/:id': {
    sommario: 'Una partita',
    descrizione: 'La partita indicata, con il meteo del momento (`meteoOra`).',
    risposta: '`PartitaDto`',
    errori: [PARTITA],
  },
  'PUT /api/partite/:id': {
    sommario: 'Aggiorna i dati di una partita',
    descrizione: 'Aggiorna in una transazione solo i campi presenti (nome, note, livello del protagonista, giorno e fascia correnti, difficoltà, Nuova Partita+, DLC posseduti, Allarme delle fusioni); gli altri restano. Un cambio di livello del protagonista si ricopia sulla riga di Joker nella squadra e va nello storico (`livello-protagonista`); anche l\'inizio e la fine dell\'Allarme vanno nello storico (`allarme`). Non rende attiva la partita: per quello c\'è `POST /api/partite/{id}/attiva`.',
    risposta: '`PartitaDto` aggiornata',
    errori: [PARTITA],
  },
  'POST /api/partite/:id/attiva': {
    sommario: 'Rende attiva una partita',
    descrizione: 'Toglie il segno alla partita che era attiva e lo mette a questa, in una transazione (ne aggiorna anche la data di modifica). Ripeterla sull\'attiva non cambia nulla. Non scrive nello storico.',
    risposta: '`PartitaDto` della partita resa attiva',
    senzaCorpo: true,
    errori: [PARTITA],
  },
  'DELETE /api/partite/:id': {
    sommario: 'Elimina una partita',
    descrizione: 'Cancella la partita e, a cascata, tutto il suo avanzamento nel file delle partite (Doti, Confidenti, scorta, storico…). Se era l\'attiva, diventa attiva la modificata più di recente fra quelle che restano. Non si può annullare.',
    risposta: 'Nessun contenuto (204)',
    errori: [PARTITA],
  },

  // ---- Doti sociali ----
  'GET /api/partite/:id/doti': {
    sommario: 'Le Doti sociali della partita',
    descrizione: 'Le Doti sociali nell\'ordine del gioco: punti (0 se mai segnati), rango raggiunto con il nome italiano, soglia del rango successivo e punti mancanti, e tutti i ranghi con le soglie.',
    risposta: 'Elenco di `DoteSocialePartitaDto`',
    errori: [PARTITA],
  },
  'PATCH /api/partite/:id/doti/:chiave': {
    sommario: 'Segna i punti di una Dote sociale',
    descrizione: 'Imposta i punti (`punti`), li incrementa (`delta`) o aggiunge le `note` viste nel gioco, convertite in punti come nel gioco (con `libro`, `fortuna` e `cinema` per gli scalini maggiorati); `punti` vince su `note`, che vince su `delta`. I punti non scendono mai sotto zero. È l\'unico modo in cui i punti delle Doti cambiano: spunte, letture, incontri, domande e cruciverba dicono che cosa il gioco dà ma non le toccano. Un cambio di rango va nello storico (`dote-rango`).',
    risposta: '`DoteSocialePartitaDto` della Dote aggiornata',
    errori: [PARTITA, [404, 'dote-non-trovata']],
  },

  // ---- Denaro del gruppo e livelli dei Ladri ----
  'GET /api/partite/:id/squadra': {
    sommario: 'Denaro del gruppo e livelli dei Ladri',
    descrizione: 'I yen del gruppo e lo stato di ogni Ladro giocabile (l\'elenco viene dai personaggi della guida). Il livello di Joker è sempre quello del protagonista della partita. Un membro mai segnato ha `segnato: false` (livello 1, esperienza 0, fuori dal gruppo), che è diverso da uno segnato a quei valori.',
    risposta: '`SquadraPartitaDto`',
    errori: [PARTITA],
  },
  'PATCH /api/partite/:id/squadra/yen': {
    sommario: 'Cambia i yen del gruppo',
    descrizione: 'Imposta il valore assoluto (`yen`) o somma una differenza (`delta`); il totale non scende sotto zero. Se il totale cambia, nello storico va un evento `denaro` con la differenza (entrata o spesa), non con il totale.',
    risposta: '`SquadraPartitaDto` aggiornata',
    errori: [PARTITA],
  },
  'PATCH /api/partite/:id/squadra/:chiave': {
    sommario: 'Livello, esperienza e presenza nel gruppo di un Ladro',
    descrizione: 'Scrive livello (assoluto o con `deltaLivello`, sempre fra 1 e 99), esperienza (mai sotto zero) e appartenenza al gruppo; i campi assenti restano. La riga del membro nasce alla prima scrittura. Per Joker il livello è quello del protagonista: scriverlo qui aggiorna anche la partita. Un cambio di livello (o il primo livello segnato) e l\'entrata o l\'uscita dal gruppo vanno nello storico (`squadra`). La chiave `yen` non arriva qui: è della rotta del denaro.',
    risposta: '`SquadraPartitaDto` aggiornata',
    errori: [PARTITA, [404, 'membro-non-trovato']],
  },

  // ---- Confidenti ----
  'GET /api/partite/:id/confidenti': {
    sommario: 'I Confidenti della partita',
    descrizione: 'Tutti i Confidenti nell\'ordine del gioco con lo stato nella partita: sblocco, rango, punti verso il rango successivo e mancanti, regali consegnati, se c\'è in scorta una Persona dello stesso arcano, semafori dei requisiti dei ranghi successivi e, se il prossimo rango è bloccato, i motivi.',
    risposta: 'Elenco di `ConfidentePartitaDto`',
    errori: [PARTITA],
  },
  'PUT /api/partite/:id/confidenti/:chiave': {
    sommario: 'Aggiorna un Confidente dalla pagina Confidenti',
    descrizione: 'Scrive rango, sblocco, punti e note (i campi assenti restano). Un rango sopra 0 vale sblocco; salire di rango (o sbloccare) richiede i semafori pronti per ogni rango attraversato, altrimenti 409, salvo `forza`, che passa e lascia traccia nello storico. I punti si impostano o si sommano (incremento esplicito più quelli calcolati da note di risposta, regalo, uscita e moltiplicatori); al cambio di rango ripartono da zero. Registra anche gli incontri: il passaggio a ogni rango raggiunto, una risposta o un\'uscita nel momento della giornata della partita (una volta per momento); scendere di rango toglie i passaggi registrati dalla pagina. Le Doti non si toccano: la risposta dice in `doteIncontro` quelle da segnare (o togliere) a mano. Sblocco e cambi di rango vanno nello storico.',
    risposta: '`ConfidentePartitaDto` aggiornato, con `doteIncontro` (elenco di `DoteDaSegnareDto`)',
    errori: [PARTITA, [404, 'confidente-non-trovato'], [409, 'confidente-bloccato']],
  },
  'PUT /api/partite/:id/confidenti/:chiave/requisiti': {
    sommario: 'Conferma a mano un requisito di rango di un Confidente',
    descrizione: 'Conferma (o revoca) un requisito che l\'app non sa verificare, indicato da rango e indice. Un requisito di tipo evento non ha una conferma sua: segna l\'evento di storia della partita, lo stesso di Partita → Progressi. Le avvertenze da controllare nel gioco non si confermano (400). Non scrive nello storico.',
    risposta: '`ConfidentePartitaDto` con i semafori ricalcolati',
    errori: [PARTITA, [404, 'requisito-non-trovato'], [400, 'requisito-non-confermabile'], [404, 'evento-non-trovato'], [404, 'confidente-non-trovato']],
  },
  'PUT /api/partite/:id/confidenti/:chiave/regali': {
    sommario: 'Segna un regalo consegnato a un Confidente',
    descrizione: 'Segna (o toglie) il regalo, indicato per nome, come consegnato al Confidente nella partita. Segnarlo due volte non crea doppioni. Non tocca i punti del Confidente e non scrive nello storico.',
    risposta: '`ConfidentePartitaDto` aggiornato',
    errori: [PARTITA, [404, 'confidente-non-trovato'], [400, 'regalo-vuoto']],
  },

  // ---- Trofei, giornata, meteo e attività ----
  'PUT /api/partite/:id/trofei': {
    sommario: 'Segna un trofeo ottenuto',
    descrizione: 'Segna (o toglie) il trofeo come ottenuto nella partita. L\'evento `trofeo` va nello storico solo alla prima spunta: ripeterla non lo duplica, toglierla non lo cancella.',
    risposta: '`TrofeoDto` con lo stato nella partita',
    errori: [PARTITA, [404, 'trofeo-non-trovato']],
  },
  'PUT /api/partite/:id/percorso': {
    sommario: 'Spunta o toglie un\'azione della giornata',
    descrizione: 'Spunta (o toglie) un\'azione della guida giorno per giorno, indicata dal suo `uid`. Alla spunta applica ciò che l\'azione produce (letture, turni, punti del Confidente con `noteRisposta`) e lo registra nello storico (`percorso`); una seconda spunta non riapplica nulla. Togliere la spunta annulla gli effetti registrati (le letture restano: si disfano dalla loro pagina). Eventi, scadenze e promemoria non si spuntano (400). Se la spunta completa tutte le azioni del giorno corrente della partita, la partita passa al giorno dopo, di giorno, con un evento nello storico; togliere una spunta non torna indietro.',
    risposta: '`AzionePercorsoDto` della voce; con `giornoAvanzato` (`GiornoAvanzatoDto`) quando la partita è passata al giorno dopo',
    errori: [PARTITA, [404, 'voce-non-trovata'], [400, 'voce-non-spuntabile']],
  },
  'PUT /api/partite/:id/giorno': {
    sommario: 'Imposta il giorno corrente della partita',
    descrizione: 'Sposta la partita a un giorno del percorso della guida. Un giorno diverso dal corrente comincia di mattina (la fascia torna «giorno»); rimarcare lo stesso giorno non tocca la fascia. Non scrive nello storico.',
    risposta: '`GiornoCorrenteDto`: il giorno corrente e la `PartitaDto` aggiornata',
    errori: [PARTITA, [404, 'giorno-non-trovato']],
  },
  'GET /api/partite/:id/meteo/:data': {
    sommario: 'Il meteo di un giorno nella partita',
    descrizione: 'Il meteo del giorno fascia per fascia (giorno e sera): quello segnato nella partita, altrimenti la pioggia torrenziale delle allerte del gioco, altrimenti quello della guida; con l\'origine, le allerte della fascia e il testo della guida. Una data senza dati risponde con le fasce vuote.',
    risposta: '`MeteoGiornoDto`',
    errori: [PARTITA],
  },
  'PUT /api/partite/:id/meteo/:data': {
    sommario: 'Segna il meteo di un giorno nella partita',
    descrizione: 'Per ogni fascia indicata un meteo, o `null` per tornare a quello della guida; una fascia assente resta com\'è. Con entrambe le fasce tornate alla guida la riga si cancella. La data dev\'essere del calendario di gioco. Restituisce anche la partita, perché il suo `meteoOra` cambia le condizioni di mappe, negozi e disponibilità.',
    risposta: '`{ meteo, partita }`: il `MeteoGiornoDto` del giorno e la `PartitaDto` aggiornata',
    errori: [PARTITA, [404, 'giorno-non-trovato']],
  },
  'PUT /api/partite/:id/acquisti': {
    sommario: 'Segna un articolo acquistato o ottenuto',
    descrizione: 'Segna (o toglie) l\'articolo di un negozio come acquistato nella partita. Segnare un articolo non disponibile nella partita (condizioni di sblocco non soddisfatte) risponde 409; togliere il segno è sempre possibile. L\'evento `acquisto` va nello storico solo alla prima spunta.',
    risposta: '`ArticoloDto` con stato e disponibilità nella partita',
    errori: [PARTITA, [404, 'articolo-non-trovato'], [409, 'articolo-non-disponibile']],
  },
  'PUT /api/partite/:id/cruciverba': {
    sommario: 'Segna un cruciverba di Leblanc risolto',
    descrizione: 'Segna (o toglie) il cruciverba del giorno indicato come risolto. Alla prima spunta l\'evento `cruciverba` va nello storico e la risposta dice in `daSegnare` la nota di Conoscenza che il gioco dà: le Doti si segnano a mano e qui non si toccano, né risolvendo né togliendo la spunta.',
    risposta: '`CruciverbaDto`; alla prima spunta con `daSegnare` (elenco di `DoteDaSegnareDto`)',
    errori: [PARTITA, [404, 'cruciverba-non-trovato']],
  },
  'PUT /api/partite/:id/letture': {
    sommario: 'Avanza o completa un libro, un film o un videogioco',
    descrizione: 'Imposta l\'avanzamento (sessioni lette, visioni, sessioni di gioco) oppure `fatto` (vero = al totale, falso = a zero). L\'avanzamento è un intero fra 0 e il totale; al cinema non c\'è tetto e ogni visione conta. Raggiunto il totale la lettura è completata: evento `lettura` nello storico la prima volta e registro delle Doti che il conseguimento dà; tornare sotto il totale le toglie dal registro. Un elemento non ancora disponibile nella partita non si avanza (409). Le Doti non si toccano: la risposta dice in `daSegnare` che cosa segnare (o togliere) a mano.',
    risposta: '`LibroDto`, `FilmDto` o `VideogiocoDto` secondo il tipo, con `daSegnare` (elenco di `DoteDaSegnareDto`) quando il registro cambia',
    errori: [PARTITA, [404, 'lettura-non-trovata'], [400, 'avanzamento-non-valido'], [409, 'lettura-non-disponibile']],
  },
  'PUT /api/partite/:id/richieste': {
    sommario: 'Stato di una Richiesta dei Memento',
    descrizione: 'Imposta lo stato della Richiesta nella partita: `accettata`, `completata` o `null` per azzerarlo. Passare a «completata» da un altro stato registra l\'evento `richiesta-completata` nello storico.',
    risposta: '`RichiestaDto` con lo stato nella partita',
    errori: [PARTITA, [404, 'richiesta-non-trovata']],
  },
  'PUT /api/partite/:id/timbri': {
    sommario: 'Timbri raccolti in un dedalo dei Memento',
    descrizione: 'Imposta quanti timbri la partita ha raccolto nel dedalo (0 azzera); il valore si ferma al totale dichiarato dalla guida. Vale solo per i dedali dei Memento di cui la guida dichiara i timbri (400 altrimenti). Raggiungere il totale salendo registra l\'evento `timbri-dedalo` nello storico, ogni volta che accade.',
    risposta: '`TimbriDedaloDto`',
    errori: [PARTITA, [404, 'area-non-trovata'], [400, 'non-un-dedalo'], [400, 'timbri-non-validi'], [400, 'timbri-non-dichiarati']],
  },
  'PUT /api/partite/:id/punti': {
    sommario: 'Stato di un punto d\'interesse di un Palazzo',
    descrizione: 'Imposta lo stato del punto nella partita: `ottenuto`, `esaurito` o `null` per azzerarlo. Lo stato del punto è quello dei suoi pin sulle mappe: segnarlo li raccoglie, riaprirlo li riapre. Un Enigma con i suoi passi segna o riapre i passi, e un passo porta con sé il suo Enigma. Una voce descrittiva della guida si legge e non si segna (400; azzerarla resta possibile). Un nuovo stato va nello storico (`punto-dungeon`).',
    risposta: '`PuntoInteresseDto` con lo stato nella partita',
    errori: [PARTITA, [404, 'punto-non-trovato'], [400, 'punto-descrittivo']],
  },
  'PUT /api/partite/:id/domande/:domandaId': {
    sommario: 'Segna una domanda in classe o d\'esame come risposta',
    descrizione: 'Segna (o toglie) la domanda come fatta nella partita. Alla prima spunta l\'evento `domanda-risposta` va nello storico; con `conoscenza: true` la risposta vale una nota di Conoscenza, che la risposta dice in `daSegnare`: le Doti si segnano a mano e qui non si toccano.',
    risposta: '`DomandeDto` con tutte le domande e le prossime; alla prima spunta con `conoscenza` anche `daSegnare` (elenco di `DoteDaSegnareDto`)',
    errori: [PARTITA, [404, 'domanda-non-trovata']],
  },

  // ---- Compendio personale e suggerimenti ----
  'GET /api/partite/:id/compendio': {
    sommario: 'Il compendio personale della partita',
    descrizione: 'Le Persona registrate nel compendio della partita, per livello e nome: livello registrato, bonus, valori reali osservati, skill, tratto e carica dell\'istantanea.',
    risposta: 'Elenco di `CompendioPartitaDto`',
    errori: [PARTITA],
  },
  'PUT /api/partite/:id/compendio/:personaId': {
    sommario: 'Registra o toglie a mano una Persona dal compendio',
    descrizione: 'Con `registrata: false` cancella la riga del compendio. Con `registrata: true` scrive solo il livello registrato: una riga nuova nasce senza bonus né skill, una riga esistente tiene il resto dell\'istantanea. La prima registrazione va nello storico (`compendio-registrata`).',
    risposta: 'Il compendio aggiornato: elenco di `CompendioPartitaDto`',
    errori: [PARTITA, [404, 'persona-non-trovata']],
  },
  'GET /api/partite/:id/suggerimenti': {
    sommario: 'Che cosa evidenziare per le azioni ancora da fare oggi',
    descrizione: 'Dalle azioni non ancora spuntate del giorno corrente della partita (escluse quelle bloccate dai requisiti) raccoglie le chiavi da evidenziare nell\'app — Confidenti, personaggi, Palazzi e aree, libri, film, articoli e negozi, attività, Richieste, luoghi e quartieri, Doti, mappe e spilli — con il motivo di ognuna. Senza giorno corrente, o con un giorno fuori dal percorso, gli elenchi sono vuoti.',
    risposta: '`SuggerimentiOggiDto`',
    errori: [PARTITA],
  },
  'PUT /api/partite/:id/spilli/:spilloId': {
    sommario: 'Segna uno spillo di una mappa come raccolto',
    descrizione: 'Segna (o toglie) lo stato «raccolto» dello spillo nella partita. Si segnano solo i pin che hanno uno stato (consumabili, boss, meccanismi, nemici, porte, pin collegati a una voce non descrittiva della guida): per gli altri 400; togliere il segno è sempre possibile. Un pin collegato a un punto della guida segna il punto quando tutti i suoi pin sono raccolti e lo riapre quando se ne toglie uno. Il Tesoro o il boss raccolti non segnano più da soli il boss finale della guida (dal 2026-10-04).',
    risposta: '`SpilloDto`, o `SchedaContenutoGuidaDto` per un contenuto della guida senza posto sulla mappa',
    errori: [PARTITA, [404, 'spillo-non-trovato'], [400, 'spillo-senza-stato']],
  },

  // ---- Persona possedute ----
  'GET /api/partite/:id/persona': {
    sommario: 'La scorta di Persona della partita',
    descrizione: 'Le Persona possedute: prima quelle in squadra, poi per livello decrescente e nome. Ognuna con skill per slot, statistiche stimate al livello (dai valori reali registrati o dalla base del dataset) più i bonus, origine della stima, tratto e flag.',
    risposta: 'Elenco di `PersonaPossedutaDto`',
    errori: [PARTITA],
  },
  'POST /api/partite/:id/persona': {
    sommario: 'Aggiunge una Persona alla scorta',
    descrizione: 'Una sola per Persona (409 se c\'è già). Con `daRegistro` i valori non indicati vengono dall\'istantanea del compendio (400 se la Persona non è registrata); altrimenti dal livello base, senza bonus e con le ultime 8 skill apprese fino al livello. Le skill (al massimo 8, senza ripetizioni, esistenti) e il tratto si verificano. In una transazione: la riga, gli slot, l\'evento `persona-aggiunta` e, se non è un\'evocazione dal Registro, la registrazione nel compendio (come nel gioco); poi si riverifica l\'obiettivo aperto della Persona, che può diventare raggiunto.',
    risposta: '`PersonaPossedutaDto` della Persona aggiunta',
    errori: [PARTITA, [404, 'persona-non-trovata'], [409, 'persona-gia-posseduta'], [400, 'troppe-skill'], [400, 'skill-duplicata'], [404, 'skill-non-trovata'], [400, 'tratto-non-valido'], [400, 'non-registrata']],
  },
  'PUT /api/partite/:id/persona/:possedutaId': {
    sommario: 'Aggiorna una Persona della scorta',
    descrizione: 'I campi assenti restano. Registrare i valori reali osservati azzera i bonus, salvo bonus espliciti; le skill indicate sostituiscono tutti gli slot. Livello, skill, valori reali e bonus cambiati vanno nello storico (`persona-livello`, `persona-skill`, `persona-statistiche`). Il compendio non segue: l\'istantanea si aggiorna solo con «Registra». Poi si riverifica l\'obiettivo aperto della Persona.',
    risposta: '`PersonaPossedutaDto` aggiornata',
    errori: [PARTITA, [404, 'posseduta-non-trovata'], [400, 'troppe-skill'], [400, 'skill-duplicata'], [404, 'skill-non-trovata'], [400, 'tratto-non-valido']],
  },
  'DELETE /api/partite/:id/persona/:possedutaId': {
    sommario: 'Toglie una Persona dalla scorta',
    descrizione: 'Cancella l\'esemplare con le sue skill e registra nello storico `persona-rimossa` con il livello che aveva. Il compendio resta com\'è.',
    risposta: 'Nessun contenuto (204)',
    errori: [PARTITA, [404, 'posseduta-non-trovata']],
  },
  'POST /api/partite/:id/persona/:possedutaId/registra': {
    sommario: 'Registra nel compendio l\'istantanea di una Persona della scorta',
    descrizione: 'Scrive (o sostituisce) nel compendio della partita l\'istantanea dell\'esemplare: livello, bonus, valori reali, skill, tratto e carica. Ogni registrazione va nello storico (`compendio-registrata`, «registrata» la prima volta, «aggiornata» le successive).',
    risposta: 'Il compendio aggiornato: elenco di `CompendioPartitaDto`',
    senzaCorpo: true,
    errori: [PARTITA, [404, 'posseduta-non-trovata']],
  },

  // ---- Obiettivi ----
  'GET /api/partite/:id/obiettivi': {
    sommario: 'Gli obiettivi della partita',
    descrizione: 'Le Persona da ottenere con skill desiderate e livello minimo, con l\'avanzamento rispetto alla scorta (Persona posseduta, livello, skill mancanti) e il numero di piani salvati collegati. Senza filtro: prima gli aperti, poi i raggiunti, poi gli annullati, per priorità e data; con `stato` solo quelli, per priorità.',
    risposta: 'Elenco di `ObiettivoDto`',
    errori: [PARTITA],
  },
  'POST /api/partite/:id/obiettivi': {
    sommario: 'Crea un obiettivo per una Persona',
    descrizione: 'Crea un obiettivo aperto (priorità predefinita 1); per una Persona ce n\'è al più uno aperto (409). Le skill desiderate sono al massimo 8, senza ripetizioni, esistenti e non tratti. La creazione va nello storico (`obiettivo-creato`) e l\'obiettivo si verifica subito contro la scorta: se la Persona posseduta lo soddisfa già, nasce raggiunto (con l\'evento `obiettivo-raggiunto`).',
    risposta: '`ObiettivoDto` creato',
    errori: [PARTITA, [404, 'persona-non-trovata'], [409, 'obiettivo-gia-aperto'], [400, 'troppe-skill'], [400, 'skill-duplicata'], [404, 'skill-non-trovata'], [400, 'skill-tratto']],
  },
  'PUT /api/partite/:id/obiettivi/:obiettivoId': {
    sommario: 'Modifica un obiettivo',
    descrizione: 'I campi assenti restano. Riaprire un obiettivo è vietato se la Persona ne ha già un altro aperto (409). Segnarlo raggiunto a mano conserva la data del primo raggiungimento e va nello storico (`obiettivo-raggiunto`); uscire da «raggiunto» ne azzera la data; se resta aperto si riverifica contro la scorta.',
    risposta: '`ObiettivoDto` aggiornato',
    errori: [PARTITA, [404, 'obiettivo-non-trovato'], [409, 'obiettivo-gia-aperto'], [400, 'troppe-skill'], [400, 'skill-duplicata'], [404, 'skill-non-trovata'], [400, 'skill-tratto']],
  },
  'DELETE /api/partite/:id/obiettivi/:obiettivoId': {
    sommario: 'Elimina un obiettivo',
    descrizione: 'Cancella l\'obiettivo della partita. Non scrive nello storico.',
    risposta: 'Nessun contenuto (204)',
    errori: [PARTITA, [404, 'obiettivo-non-trovato']],
  },

  // ---- Piani salvati ----
  'GET /api/partite/:id/piani': {
    sommario: 'I piani di fusione salvati della partita',
    descrizione: 'I piani salvati (di un solo obiettivo con `obiettivo`), dal più recente, con l\'avanzamento ricalcolato sulla scorta attuale: foglie possedute, fusioni già fatte, passi eseguibili adesso, completamento.',
    risposta: 'Elenco di `PianoSalvatoDto`',
    errori: [PARTITA],
  },
  'POST /api/partite/:id/piani': {
    sommario: 'Salva un piano di fusione',
    descrizione: 'Salva il piano calcolato dal client dopo averlo verificato: la radice è la Persona indicata, l\'albero è ben formato (modi ammessi, almeno due ingredienti per fusione, al più 8 livelli, Persona esistenti), l\'obiettivo collegato è della partita e della stessa Persona, le skill esistono. Il costo si salva arrotondato e mai negativo; il salvataggio va nello storico (`piano-salvato`).',
    risposta: '`PianoSalvatoDto` salvato',
    errori: [PARTITA, [404, 'persona-non-trovata'], [400, 'piano-non-valido'], [404, 'obiettivo-non-trovato'], [400, 'obiettivo-incoerente'], [404, 'skill-non-trovata']],
  },
  'PUT /api/partite/:id/piani/:pianoId': {
    sommario: 'Modifica nome, note o obiettivo di un piano salvato',
    descrizione: 'I campi assenti restano; `obiettivoId: null` scollega l\'obiettivo. Il piano in sé non si tocca. Non scrive nello storico.',
    risposta: '`PianoSalvatoDto` aggiornato',
    errori: [PARTITA, [404, 'piano-non-trovato'], [404, 'obiettivo-non-trovato'], [400, 'obiettivo-incoerente']],
  },
  'DELETE /api/partite/:id/piani/:pianoId': {
    sommario: 'Elimina un piano salvato',
    descrizione: 'Cancella il piano della partita. Non scrive nello storico.',
    risposta: 'Nessun contenuto (204)',
    errori: [PARTITA, [404, 'piano-non-trovato']],
  },

  // ---- Cicli di fusione salvati ----
  'GET /api/partite/:id/cicli': {
    sommario: 'I cicli di fusione salvati della partita',
    descrizione: 'I cicli salvati, dal più recente, con gli anelli, l\'anello corrente, le iterazioni e l\'avanzamento: quali esemplari della scorta fanno da ingrediente e da partner, se il partner è nel compendio, se l\'anello è eseguibile.',
    risposta: 'Elenco di `CicloSalvatoDto`',
    errori: [PARTITA],
  },
  'POST /api/partite/:id/cicli': {
    sommario: 'Salva un ciclo di fusione',
    descrizione: 'Ricalcola e valida gli anelli nella partita: da 2 a 5, ognuno una fusione che produce davvero il risultato indicato, ognuno parte dal risultato del precedente e l\'ultimo rigenera la Persona di partenza. Il modo del partner (registro, scorta, cattura) e il costo (somma dei partner da evocare dal registro, con lo sconto della partita) li calcola il server. Il nome predefinito è «Ciclo per <Persona>»; il salvataggio va nello storico (`ciclo-salvato`).',
    risposta: '`CicloSalvatoDto` salvato',
    errori: [PARTITA, [400, 'ciclo-non-valido'], [404, 'persona-non-trovata']],
  },
  'PUT /api/partite/:id/cicli/:cicloId': {
    sommario: 'Modifica nome, note, anello corrente o iterazioni di un ciclo',
    descrizione: 'I campi assenti restano; l\'anello corrente va da 0 all\'ultimo anello (400). Gli anelli non si toccano. Non scrive nello storico.',
    risposta: '`CicloSalvatoDto` aggiornato',
    errori: [PARTITA, [404, 'ciclo-non-trovato'], [400, 'anello-non-valido']],
  },
  'POST /api/partite/:id/cicli/:cicloId/avanza': {
    sommario: 'Segna eseguito l\'anello corrente di un ciclo',
    descrizione: 'Passa all\'anello successivo; tornando al primo conta un\'iterazione. Va nello storico (`ciclo-anello`, o `ciclo-iterazione` quando l\'iterazione si chiude). Non modifica la scorta: la fusione vera si esegue con `POST /api/partite/{id}/velluto/fusione`.',
    risposta: '`CicloSalvatoDto` aggiornato',
    senzaCorpo: true,
    errori: [PARTITA, [404, 'ciclo-non-trovato']],
  },
  'DELETE /api/partite/:id/cicli/:cicloId': {
    sommario: 'Elimina un ciclo salvato',
    descrizione: 'Cancella il ciclo della partita. Non scrive nello storico.',
    risposta: 'Nessun contenuto (204)',
    errori: [PARTITA, [404, 'ciclo-non-trovato']],
  },

  // ---- Operazioni della Stanza di Velluto dalla scorta ----
  'POST /api/partite/:id/velluto/fusione/anteprima': {
    sommario: 'Anteprima di una fusione fra esemplari della scorta',
    descrizione: 'Non modifica nulla. Con due esemplari usa la tabella delle fusioni (e controlla `risultatoId`, se indicato); con tre o più serve `risultatoId` e gli esemplari devono essere esattamente gli ingredienti della sua ricetta speciale. Calcola risultato, tipo di fusione, livello suggerito (base più il bonus minimo dei Confidenti), skill candidate con l\'ereditabilità, slot scelti (tutti con l\'Allarme), tratti, skill innate, punti e rischio dell\'Allarme.',
    risposta: '`AnteprimaFusioneDto`',
    errori: [PARTITA, [404, 'posseduta-non-trovata'], [400, 'ingredienti-duplicati'], [400, 'fusione-impossibile'], [400, 'risultato-incoerente'], [400, 'risultato-richiesto'], [400, 'ingredienti-incoerenti'], [404, 'persona-non-trovata']],
  },
  'POST /api/partite/:id/velluto/fusione': {
    sommario: 'Esegue una fusione dalla scorta',
    descrizione: 'Con le stesse verifiche dell\'anteprima, in una transazione: toglie gli ingredienti dalla scorta e aggiunge il risultato, con le skill ereditate scelte (fra le candidate ereditabili, al massimo gli slot scelti) più le innate più recenti fino a 8, al livello indicato (mai sotto la base; predefinito quello suggerito); durante l\'Allarme il risultato è carico. Se la Persona risultato è già in scorta la fusione si annulla (409). Nello storico vanno l\'aggiunta del risultato (con la registrazione nel compendio) e l\'evento `fusione-eseguita`; poi si riverifica l\'obiettivo del risultato.',
    risposta: '`EsitoFusioneScortaDto`: il risultato, gli esemplari rimossi e l\'anteprima usata',
    errori: [PARTITA, [404, 'posseduta-non-trovata'], [400, 'fusione-impossibile'], [400, 'risultato-incoerente'], [400, 'risultato-richiesto'], [400, 'ingredienti-incoerenti'], [400, 'skill-duplicata'], [400, 'troppe-skill'], [400, 'skill-non-candidata'], [400, 'skill-non-ereditabile'], [400, 'tratto-non-valido'], [409, 'persona-gia-posseduta']],
  },
  'POST /api/partite/:id/velluto/forca': {
    sommario: 'Esegue la Forca: sacrifica un esemplare per un altro',
    descrizione: 'Toglie il sacrificio dalla scorta e aggiorna il ricevente: livello raggiunto (osservato nel gioco, mai più basso; predefinito invariato), skill trasferite dal sacrificio (una, fino a tre con l\'Allarme) e dimenticate, punti statistica sommati ai bonus. Con l\'incidente dell\'Allarme niente skill né livelli. Gli 8 slot non si superano (400). L\'evento `forca` registra il moltiplicatore di EXP e i suoi fattori; poi si riverifica l\'obiettivo del ricevente.',
    risposta: '`EsitoForcaDto`',
    errori: [PARTITA, [400, 'forca-stesso-esemplare'], [404, 'posseduta-non-trovata'], [400, 'incidente-senza-skill'], [400, 'troppe-skill'], [400, 'skill-non-del-sacrificio'], [400, 'skill-non-del-ricevente'], [400, 'incidente-senza-livelli']],
  },
  'POST /api/partite/:id/velluto/isolamento': {
    sommario: 'Registra un ciclo di isolamento di una Persona',
    descrizione: 'Somma ai bonus delle statistiche scelte i punti dell\'incenso (tante statistiche quante ne richiede l\'incenso; doppi con l\'Allarme) e fa apprendere la skill di resistenza: quella indicata, o quella calcolata da prima debolezza e livello; `null` = nessuna. Se gli 8 slot sono pieni va indicata la skill da dimenticare (400). L\'evento `isolamento` va nello storico; poi si riverifica l\'obiettivo della Persona.',
    risposta: '`EsitoIsolamentoDto`',
    errori: [PARTITA, [404, 'posseduta-non-trovata'], [400, 'incenso-non-valido'], [400, 'statistiche-incenso'], [400, 'statistica-non-valida'], [404, 'skill-non-trovata'], [400, 'skill-non-del-ricevente'], [400, 'troppe-skill']],
  },
  'GET /api/partite/:id/velluto/isolamento/:possedutaId': {
    sommario: 'La skill di resistenza che un esemplare imparerebbe in isolamento',
    descrizione: 'Dal livello dell\'esemplare il grado della skill (tier), dalle sue debolezze l\'elemento: la prima debolezza per cui il dataset ha la skill di quel grado. Se non ce n\'è nessuna, la skill è `null`. Un esemplare che non è nella scorta della partita (anche per una partita inesistente) risponde 404 `posseduta-non-trovata`.',
    risposta: '`{ elemento, elementoNome, tier, skill }`, con `skill` un `SkillRiassuntoDto` o `null`',
    errori: [[404, 'posseduta-non-trovata']],
  },

  // ---- Storico ----
  'GET /api/partite/:id/storico': {
    sommario: 'Lo storico degli eventi della partita',
    descrizione: 'Gli eventi dal più recente, a pagine: `limite` (predefinito 50, massimo 200), `prima` (solo eventi con id minore: il cursore della pagina successiva), `tipi` (separati da virgola; quelli sconosciuti si ignorano, e se lo sono tutti la risposta è vuota), `persona` (solo eventi riferiti a quella Persona). Il totale conta gli eventi del filtro, senza il cursore.',
    risposta: '`StoricoDto`: eventi (`EventoPartitaDto`), cursore `prossimo` (null all\'ultima pagina) e totale',
    errori: [PARTITA],
  },
  'POST /api/partite/:id/storico/elimina': {
    sommario: 'Elimina più voci dello storico',
    descrizione: 'Cancella in una transazione le voci indicate (fino a 500, i doppioni contano una volta) che appartengono alla partita; gli id che non ci sono si ignorano. Non controlla che la partita esista: per una partita inesistente non elimina nulla. Toglie solo la voce: la modifica che l\'aveva generata resta.',
    risposta: '`{ eliminati }`: quante voci sono state trovate ed eliminate',
  },
  'DELETE /api/partite/:id/storico/:eventoId': {
    sommario: 'Elimina una voce dello storico',
    descrizione: 'Cancella la voce (per correggere un errore): toglie solo la voce, non la modifica che l\'aveva generata. Una voce che non è della partita (o una partita inesistente) risponde 404 `evento-non-trovato`.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'evento-non-trovato']],
  },
};
