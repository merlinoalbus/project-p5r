// ============================================================
// descrizioni/condizioni — gli elenchi per l'editor delle condizioni e i progressi di una partita che le rendono vere
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/** Le descrizioni delle rotte di `/api/condizioni` (`routes/condizioni.ts`). */
export const DESCRIZIONI_CONDIZIONI: DescrizioniArea = {
  'GET /api/condizioni/censimento/fotografie-ingresso-memento': {
    sommario: 'Metadati delle fotografie del solo ingresso dei Memento (L26)',
    descrizione: 'Lettura fissa senza selettori di tabella, chiave o percorso. Confronta la riga corrente e il contesto del quartiere con il pacchetto pubblico 93 e la baseline Regia 122 precedente a 61ccb6ef. Proietta soltanto stati dei campi, formula esatta 05-09/05-07 o altra formula supportata, presenza e forma della fotografia seed e lati pertinenti dei passi D/U/I di main.cestino. Un NULL atteso è distinto da un NULL difforme e da un campo assente; le fotografie parziali non vengono completate. Chiavi interne contraddittorie, radici o passi illeggibili rendono la copertura incerta. Gli ordinali sono effimeri, non ID del cestino. Nessun valore raw, nome, nota, impronta, UID o dato di partita; nessuna mutazione, normalizzazione o approvazione della futura bonifica. Scansione senza taglio in una transazione di sole letture e Cache-Control: no-store anche prima di eventuali errori.',
    risposta: '`FotografieIngressoMementoDto` (shared/fotografieIngressoMemento.ts)',
  },
  'GET /api/condizioni/riconciliazione': {
    sommario: 'Frasi da riconciliare con condizioni, fonti e decisioni',
    descrizione: 'Censimento completo delle 201 identità storiche e delle nuove frasi correnti, comprese righe mutate, assenti e nascoste. Separa requisiti propri e fonti ereditate, proposte documentate e ricerca ancora aperta. Proietta audit123/124/130/134 e, per A12, i due esiti135 distinti con stato assente/illeggibile/leggibile, senza prima-immagini. La fonte corrente Confidente non dimostra l’applicazione della bonifica. A12 confronta una proposta vuota soltanto informativa: nessuna Applica. Il CAS include RAW canonici ordinati del Confidente, disponibilità, requisiti e guida, benefici e audit anche assenti/vuoti. Nessuna scrittura durante la lettura. Ogni riga espone improntaFonte e revisioneAttesa distinta per il controllo concorrente.',
    risposta: '`RiconciliazioneCondizioniDto` (shared/riconciliazioneCondizioni.ts)',
    errori: [[409, 'decisione-illeggibile']],
  },
  'POST /api/condizioni/riconciliazione/decisioni': {
    sommario: 'Conferma una resa, applica una proposta ammessa o conserva la frase come nota',
    descrizione: 'Corpo chiuso id/azione/revisioneAttesa. Le formule provengono esclusivamente dal manifest server. La transazione rilegge fonte, dipendenze e precedente decisione; una revisione obsoleta risponde409. La scrittura ordinaria e il record decisionale sono atomici. A12 ammette conferma della fonte corrente anche dopo la rimozione della vecchia frase soltanto sulla chiave esatta, con sbloccoSQLNULL, FKtakemi, fonte collegata e campi propri neutri. Nessuna applicazione della proposta vuota, nessuna garanzia sul calendario o beneficio8, nessuna estensione ad altre frasi mutate. Tutte le revisioni precedenti restano conservate; Mantieni nota non elimina condizioni e non chiude la ricerca fattuale. Nessun cambiamento del database alla semplice lettura.',
    risposta: '`RiconciliazioneCondizioniDto` aggiornato',
    errori: [[404, 'frase-non-trovata'], [409, 'riconciliazione-obsoleta'], [409, 'decisione-non-ammessa'], [409, 'proposta-incompleta'], [409, 'decisione-illeggibile']],
  },
  'GET /api/condizioni/censimento': {
    sommario: 'Inventario corrente di frasi, condizioni, orari e collegamenti dei luoghi',
    descrizione: 'Lettura mirata per gli inventari L5/L6, nello stesso perimetro delle API esistenti. Include le righe nascoste e distingue frasi e orari storici, condizioni proprie salvate, collegamenti strutturati e dati derivati. I JSON mantengono il valore originale e la diagnosi di lettura: un valore illeggibile non diventa una lista vuota. Il contesto di sedi e pin permette di distinguere passaggi, riferimenti indiretti validi, assenze e riferimenti orfani; null non significa automaticamente difetto. Nessuna conversione, scrittura, lettura delle partite, copia del database o immagine. Risposta coerente fra le sezioni e intestazione Cache-Control: no-store. Il risultato descrive i dati correnti; non approva le proposte né prova l’equivalenza storica delle migrazioni.',
    risposta: '`CensimentoLuoghiCondizioniDto` (shared/censimentoLuoghiCondizioni.ts)',
    errori: [[409, 'censimento-tipo-inatteso']],
  },
  'POST /api/condizioni/valuta': {
    sommario: 'Valuta condizioni sulla partita corrente o su un giorno scelto',
    descrizione: 'Valuta ogni condizione e l’insieme in AND con il valutatore unico del server. `partita` identifica la partita e `giorno`, se presente, sposta solo il giorno di valutazione senza modificare la partita; la risposta distingue vero, falso, avviso e riferimento non più valido, con il testo e ciò che manca. La variante `meteo{condizione: senza-allerta, allerta}` legge le allerte del calendario nella data e fascia correnti, senza duplicarne le date nelle condizioni; un riferimento mancante resta da verificare, non diventa disponibile.',
    risposta: '`RispostaValutaCondizioniDto`',
    errori: [[400, 'giorno-non-valido'], [404, 'partita-non-trovata']],
  },
  'GET /api/condizioni/elenchi': {
    sommario: 'Elenchi chiusi da cui l\'editor delle condizioni sceglie i valori',
    descrizione: 'Articoli (con il nome del negozio come gruppo), libri e film, arcani, Persona, abilità, Ladri giocabili, attività che si contano per volte svolte, negozi con il tipo di programma punti (`manuale`, `rango-cliente` o null), eventi di storia (con `calcolato` vero per quelli «entra in squadra», che non si segnano a mano), contatori e allerte meteo effettivamente presenti nel calendario. Righe nascoste di articoli, negozi, letture e attività escluse: nell\'editor non si scrive, si sceglie.',
    risposta: '`ElenchiRegoleDto`',
  },
  'GET /api/condizioni/spilli': {
    sommario: 'Pin delle mappe con uno stato, per la condizione «Pin di una mappa»',
    descrizione: 'Solo i pin che hanno uno stato da segnare (raccolto, aperto, parlato, incontrato, azionato…, oppure «ottenuto» per un pin collegato a una voce della guida non descrittiva). È un elenco a parte perché sono centinaia e serve solo all\'editor delle mappe. `chiave` è l\'uid del pin, `gruppo` il nome della mappa preceduto da quello del genitore.',
    risposta: 'Elenco di `PinConStatoDto`',
  },
  'GET /api/condizioni/voci': {
    sommario: 'Voci della guida dei Palazzi e dei Memento, per la condizione «Voce della guida»',
    descrizione: 'Tutte le voci che si segnano (non le descrittive «Altro»), passi degli Enigmi compresi, in ordine di guida. Come i pin serve solo all\'editor delle mappe: la condizione vale solo nei pin. `gruppo` è il posto, «Palazzo › N. Area» (o «Memento › N. Dedalo»).',
    risposta: 'Elenco di `VoceCitabileDto`',
  },
  'GET /api/condizioni/partite/:partita/progressi': {
    sommario: 'Progressi di una partita usati dalle condizioni: calcolati e da segnare a mano',
    descrizione: 'Completi anche dove non c\'è ancora una riga (valori a zero o falsi). Calcolati dalla partita: gli eventi «entra in squadra» (tre stati: in squadra, dichiarato fuori, non ancora segnato), il grado cliente dei negozi che ce l\'hanno (dalla spesa segnata, con la prossima soglia) e i contatori. Gli eventi manuali riportano i ranghi dei Confidenti che li richiedono in `serveA`. Per le nove aperture dei dedali, `avvenuto` unisce la dichiarazione manuale (`manuale`) e quelle delle visite spuntate nel Diario (`dalDiario`, `visiteDiario`); sette di queste aperture sono usate dal listino di Jose. Le aperture non sono dedotte da calendario, stato dei forzieri o percentuali del dedalo. Restano da segnare le volte svolte delle attività e i punti dei negozi con programma manuale.',
    risposta: '`ProgressiPartitaDto`',
    errori: [[404, 'partita-non-trovata']],
  },
  'PUT /api/condizioni/partite/:partita/eventi/:chiave': {
    sommario: 'Segna o toglie un evento di storia manuale nella partita',
    descrizione: 'Scrive nel registro esistente degli eventi manuali, usato anche dal «Condizione soddisfatta» dei Confidenti e dalle aperture dei dedali. Togliere una dichiarazione manuale non rimuove quelle registrate nelle visite del Diario: la risposta mostra lo stato effettivo e le sue provenienze. Evento e data di modifica della partita cambiano insieme, in una transazione. Non cambia lo stato del dedalo né registra acquisti. Un evento «entra in squadra» si calcola dalla squadra della partita (Partita → Denaro e squadra) e qui è rifiutato con 400.',
    risposta: '`ProgressiPartitaDto` aggiornato',
    errori: [[404, 'partita-non-trovata'], [404, 'evento-non-trovato'], [400, 'evento-calcolato']],
  },
  'PUT /api/condizioni/partite/:partita/attivita/:chiave': {
    sommario: 'Porta il contatore delle volte svolte di un\'attività al valore indicato',
    descrizione: 'Registra o toglie turni dell\'attività fino a `volte`; vale solo per le attività che si contano per volte svolte. Le Doti sociali non si toccano: la risposta dice in `daSegnare` che cosa danno i turni aggiunti (o davano quelli tolti), da segnare a mano.',
    risposta: '`ProgressiPartitaDto` aggiornato, con `daSegnare` (elenco di `DoteDaSegnareDto`). Una fonte Confidente rifiuta nuovi incrementi con409; riduzioni e annullamenti della storia preesistente restano possibili e usano le fotografie dei vecchi turni, senza ricalcolare premi.',
    errori: [[404, 'partita-non-trovata'], [404, 'attivita-non-trovata'], [400, 'attivita-non-conteggiabile'], [409, 'attivita-fonte-confidente']],
  },
  'PUT /api/condizioni/partite/:partita/punti-negozio/:chiave': {
    sommario: 'Imposta i punti accumulati in un negozio con programma punti manuale',
    descrizione: 'Solo per i negozi il cui programma punti si segna a mano (`calcolo: "manuale"`); il grado cliente si calcola dalla spesa e non passa da qui. Punti e data di modifica della partita si scrivono insieme, in una transazione.',
    risposta: '`ProgressiPartitaDto` aggiornato',
    errori: [[404, 'partita-non-trovata'], [404, 'negozio-non-trovato'], [400, 'negozio-senza-punti']],
  },
};
