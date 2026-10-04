// ============================================================
// descrizioni/catalogo — le righe della guida aggiunte, corrette o nascoste dall'utente, e gli oggetti già noti da agganciare
// ============================================================

import { SCHEMI_CATALOGO, SCHEMI_CATALOGO_PARZIALI } from '../../schemas/catalogo.js';
import type { DescrizioniArea } from '../tipi.js';

/** Le descrizioni delle rotte di `/api/catalogo` (`routes/catalogo.ts`); il corpo di creazione e modifica dipende da `:tipo`. */
export const DESCRIZIONI_CATALOGO: DescrizioniArea = {
  'GET /api/catalogo': {
    sommario: 'Quante righe del catalogo l\'utente ha aggiunto, corretto o nascosto, per tipo',
    descrizione: 'Per ognuno degli otto tipi (negozio, articolo, libro, film, attività, luogo, domanda, cruciverba): righe create dall\'utente, righe della guida corrette, righe nascoste e totale della tabella. È il riepilogo della sezione «Catalogo» delle Impostazioni.',
    risposta: '`RiepilogoCatalogoDto`',
  },
  'GET /api/catalogo/oggetti-di/:categoria': {
    sommario: 'Oggetti già noti all\'app di una categoria d\'articolo, da agganciare a un negozio',
    descrizione: 'Equipaggiamento, oggetti della guida, libri, film e videogiochi filtrati per categoria d\'articolo. Una categoria che nessun archivio copre (regalo, materiale, cibo, altro) dà un elenco vuoto, non un errore: lì l\'articolo si scrive a mano.',
    risposta: 'Elenco di `OggettoSelezionabileDto`',
  },
  'GET /api/catalogo/oggetti': {
    sommario: 'Tutti gli oggetti che l\'app conosce, senza filtro di categoria',
    descrizione: 'Equipaggiamento, oggetti della guida, libri, film e videogiochi (righe nascoste escluse) in un elenco solo, ordinato per il nome italiano quando c\'è. Chi mette un articolo in vendita cerca la cosa, non la categoria: la categoria arriva con l\'oggetto scelto.',
    risposta: 'Elenco di `OggettoSelezionabileDto`',
  },
  'GET /api/catalogo/:tipo': {
    sommario: 'Righe di un tipo toccate dall\'utente, o le sole nascoste',
    descrizione: 'Senza query: le righe create o corrette dall\'utente e quelle nascoste, ordinate per nome (domande e cruciverba per chiave, cioè per giorno). Con `nascosti=1` (o `true`): le sole righe nascoste, per la pagina «Rimossi»; `negozio` restringe agli articoli di quel negozio e vale solo per il tipo `articolo`.',
    risposta: 'Elenco di `ElementoCatalogoDto`',
  },
  'POST /api/catalogo/:tipo': {
    sommario: 'Crea una riga del catalogo dell\'utente del tipo indicato',
    descrizione: 'Il corpo si valida con lo schema del tipo scelto da `:tipo` (400 `validation-error` con i dettagli). Il nome (la domanda per una domanda in classe, l\'indizio per il cruciverba) è obbligatorio; la chiave nasce dal nome come `u-<slug>`, annidata sotto il negozio per gli articoli e sotto il quartiere per i luoghi, con un suffisso numerico se già presa: non collide mai con le chiavi della guida. Negozio, quartiere, sede e Confidente citati devono esistere; le condizioni devono citare chiavi esistenti. Una riga aggiunta dall\'utente nasce verificata, salvo `verificato: false` esplicito; per i tipi che hanno condizioni, senza condizioni dichiarate si ricavano dai campi in prosa (es. lo sblocco di un\'attività).',
    risposta: 'La riga creata: `ElementoCatalogoDto`',
    corpo: { perParametro: 'tipo', varianti: SCHEMI_CATALOGO },
    errori: [[400, 'validation-error'], [400, 'nome-mancante'], [400, 'negozio-sconosciuto'], [400, 'quartiere-sconosciuto'], [400, 'luogo-sconosciuto'], [400, 'confidente-sconosciuto'], [404, 'condizione-non-trovata']],
  },
  'GET /api/catalogo/:tipo/:chiave': {
    sommario: 'Una riga qualunque del catalogo, anche della guida, per il modulo di modifica',
    descrizione: 'Legge la riga con i suoi campi scrivibili e la provenienza (guida o utente, corretta, nascosta). Le chiavi di articoli e luoghi contengono «/» (`negozio/articolo`, `quartiere/luogo`) e nel percorso vanno codificate (`%2F`). Una chiave inesistente è un 404 con codice `<tipo>-non-trovato`.',
    risposta: '`ElementoCatalogoDto`',
  },
  'PUT /api/catalogo/:tipo/:chiave': {
    sommario: 'Corregge una riga del catalogo: i campi assenti restano',
    descrizione: 'Il corpo si valida con lo schema parziale del tipo scelto da `:tipo` (400 `validation-error`). Una riga della guida corretta passa all\'utente e conserva l\'originale, così «Ripristina» la riporta com\'era e un aggiornamento dei dati della guida non la sovrascrive. Riferimenti e condizioni si verificano come alla creazione; una chiave inesistente è un 404 con codice `<tipo>-non-trovato`.',
    risposta: 'La riga aggiornata: `ElementoCatalogoDto`',
    corpo: { perParametro: 'tipo', varianti: SCHEMI_CATALOGO_PARZIALI },
    errori: [[400, 'validation-error'], [400, 'negozio-sconosciuto'], [400, 'quartiere-sconosciuto'], [400, 'luogo-sconosciuto'], [400, 'confidente-sconosciuto'], [404, 'condizione-non-trovata']],
  },
  'PUT /api/catalogo/:tipo/:chiave/nascosta': {
    sommario: 'Nasconde o rimostra una riga del catalogo',
    descrizione: 'Serve soprattutto per le voci della guida che nel gioco non esistono: cancellarle non basterebbe, perché un aggiornamento dei dati della guida le riporterebbe. Nascondendo una riga della guida se ne conserva l\'originale. Una chiave inesistente è un 404 con codice `<tipo>-non-trovato`.',
    risposta: 'La riga aggiornata: `ElementoCatalogoDto`',
  },
  'DELETE /api/catalogo/:tipo/:chiave': {
    sommario: 'Elimina una riga creata dall\'utente o riporta com\'era una riga della guida corretta',
    descrizione: 'Una riga creata dall\'utente si elimina (gli articoli di un negozio dell\'utente se ne vanno con lui) e pin e mappe che citavano quel luogo o quel negozio perdono il collegamento. Una riga della guida corretta o nascosta torna com\'era nei dati della guida, visibile. Una riga della guida mai modificata non ha nulla da ripristinare: 400 (per toglierla dalla vista si nasconde).',
    risposta: '`{ esito: "eliminata" | "ripristinata", elemento }`: `elemento` è la riga ripristinata (`ElementoCatalogoDto`) o null se eliminata',
    errori: [[400, 'riga-del-seed']],
  },
};
