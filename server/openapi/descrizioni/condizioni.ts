// ============================================================
// descrizioni/condizioni — gli elenchi per l'editor delle condizioni e i progressi di una partita che le rendono vere
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/** Le descrizioni delle rotte di `/api/condizioni` (`routes/condizioni.ts`). */
export const DESCRIZIONI_CONDIZIONI: DescrizioniArea = {
  'GET /api/condizioni/elenchi': {
    sommario: 'Elenchi chiusi da cui l\'editor delle condizioni sceglie i valori',
    descrizione: 'Articoli (con il nome del negozio come gruppo), libri e film, arcani, Persona, abilità, Ladri giocabili, attività che si contano per volte svolte, negozi con il tipo di programma punti (`manuale`, `rango-cliente` o null), eventi di storia (con `calcolato` vero per quelli «entra in squadra», che non si segnano a mano) e contatori. Righe nascoste di articoli, negozi, letture e attività escluse: nell\'editor non si scrive, si sceglie.',
    risposta: '`ElenchiRegoleDto`',
  },
  'GET /api/condizioni/spilli': {
    sommario: 'Pin delle mappe con uno stato, per la condizione «Pin di una mappa»',
    descrizione: 'Solo i pin che hanno uno stato da segnare (raccolto, aperto, parlato, incontrato, azionato…, oppure «ottenuto» per un pin collegato a una voce della guida non descrittiva). È un elenco a parte perché sono centinaia e serve solo all\'editor delle mappe. `chiave` è l\'uid del pin, `gruppo` il nome della mappa preceduto da quello del genitore.',
    risposta: 'Elenco di `PinConStatoDto`',
  },
  'GET /api/condizioni/partite/:partita/progressi': {
    sommario: 'Progressi di una partita usati dalle condizioni: calcolati e da segnare a mano',
    descrizione: 'Completi anche dove non c\'è ancora una riga (valori a zero o falsi). Calcolati dalla partita: gli eventi «entra in squadra» (tre stati: in squadra, dichiarato fuori, non ancora segnato), il grado cliente dei negozi che ce l\'hanno (dalla spesa segnata, con la prossima soglia) e i contatori. Da segnare: gli eventi manuali (con i ranghi dei Confidenti che li richiedono in `serveA`), le volte svolte delle attività contate per volte, i punti dei negozi con programma manuale.',
    risposta: '`ProgressiPartitaDto`',
    errori: [[404, 'partita-non-trovata']],
  },
  'PUT /api/condizioni/partite/:partita/eventi/:chiave': {
    sommario: 'Segna o toglie un evento di storia manuale nella partita',
    descrizione: 'Scrive lo stesso dato del «Condizione soddisfatta» dei Confidenti; evento e data di modifica della partita cambiano insieme, in una transazione. Un evento «entra in squadra» si calcola dalla squadra della partita (Partita → Denaro e squadra) e qui è rifiutato con 400.',
    risposta: '`ProgressiPartitaDto` aggiornato',
    errori: [[404, 'partita-non-trovata'], [404, 'evento-non-trovato'], [400, 'evento-calcolato']],
  },
  'PUT /api/condizioni/partite/:partita/attivita/:chiave': {
    sommario: 'Porta il contatore delle volte svolte di un\'attività al valore indicato',
    descrizione: 'Registra o toglie turni dell\'attività fino a `volte`; vale solo per le attività che si contano per volte svolte. Le Doti sociali non si toccano: la risposta dice in `daSegnare` che cosa danno i turni aggiunti (o davano quelli tolti), da segnare a mano.',
    risposta: '`ProgressiPartitaDto` aggiornato, con `daSegnare` (elenco di `DoteDaSegnareDto`)',
    errori: [[404, 'partita-non-trovata'], [404, 'attivita-non-trovata'], [400, 'attivita-non-conteggiabile']],
  },
  'PUT /api/condizioni/partite/:partita/punti-negozio/:chiave': {
    sommario: 'Imposta i punti accumulati in un negozio con programma punti manuale',
    descrizione: 'Solo per i negozi il cui programma punti si segna a mano (`calcolo: "manuale"`); il grado cliente si calcola dalla spesa e non passa da qui. Punti e data di modifica della partita si scrivono insieme, in una transazione.',
    risposta: '`ProgressiPartitaDto` aggiornato',
    errori: [[404, 'partita-non-trovata'], [404, 'negozio-non-trovato'], [400, 'negozio-senza-punti']],
  },
};
