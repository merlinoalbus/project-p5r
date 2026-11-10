// ============================================================
// descrizioni/catalogo — le righe della guida aggiunte, corrette o nascoste dall'utente, e gli oggetti già noti da agganciare
// ============================================================

import { SCHEMI_CATALOGO, SCHEMI_CATALOGO_PARZIALI } from '../../schemas/catalogo.js';
import type { DescrizioniArea } from '../tipi.js';

const CONFLITTI_FONTE_CONFIDENTE = [[409, 'confidente-attivita-mancante'], [409, 'attivita-confidente-conflitto'], [409, 'attivita-confidente-storia']] as const;

/** Le descrizioni delle rotte di `/api/catalogo` (`routes/catalogo.ts`); il corpo di creazione e modifica dipende da `:tipo`. */
export const DESCRIZIONI_CATALOGO: DescrizioniArea = {
  'GET /api/catalogo': {
    sommario: 'Quante righe del catalogo l\'utente ha aggiunto, corretto o nascosto, per tipo',
    descrizione: 'Per ognuno degli otto tipi (negozio, articolo, libro, film, attività, luogo, domanda, cruciverba): righe create dall\'utente, righe della guida corrette, righe nascoste e totale della tabella. È il riepilogo della sezione «Catalogo» delle Impostazioni.',
    risposta: '`RiepilogoCatalogoDto`',
  },
  'GET /api/catalogo/posto/:quartiere/:luogo': {
    sommario: 'Il posto per la sua finestra di modifica: il luogo, i suoi punti vendita e le loro offerte',
    descrizione: 'L3: il luogo e i punti vendita visibili con sede nel luogo (nell\'ordine), ognuno con le offerte visibili, come elementi del catalogo con i campi dei moduli. `conAcquisti` dice se un\'offerta ha acquisti nelle partite o risultati collegati: togliendola dall\'editor si nasconde invece di andare nel cestino. `regolaComune` (L4-01) dice se l\'offerta segue la regola comune del genere del suo punto vendita; `regole` sono le regole comuni per genere, con la frase e quante offerte le seguono.',
    risposta: '`PostoDto`',
    errori: [[404, 'luogo-non-trovato']],
  },
  'PUT /api/catalogo/posto/:quartiere/:luogo': {
    sommario: 'Salva il posto in una transazione: punti vendita, offerte, offerte tolte e luogo',
    descrizione: 'L3: ogni parte passa dallo schema del suo tipo (completo per una riga nuova, parziale per una esistente) e dalle regole delle scritture del catalogo, nella stessa transazione: prima i punti vendita (un punto vendita nuovo nasce con la sede nel luogo, uno esistente deve già averla), le offerte tolte e le offerte, poi il luogo; un errore annulla tutto. Un\'offerta tolta va nel cestino se è dell\'utente, mai corretta e senza acquisti né risultati, altrimenti si nasconde. `regole` (L4-01, una per genere di punto vendita, con i soli campi cambiati fra pezzi, rifornimento e condizioni) cambiano per prime le regole comuni e riscrivono tutte le offerte che le seguono, in ogni luogo (le righe della guida diventano «corrette», con la fotografia), poi il segno si ricalcola per ogni offerta del genere; un\'offerta nuova di un genere con la regola prende dalla regola i campi che non dice, e un\'offerta che li cambia diventa un\'eccezione. «Duplica» è una creazione: la sorgente non cambia; `copiaDa` di un\'offerta nuova indica l\'offerta d\'origine, i cui contenuti (i set) passano alla copia.',
    risposta: '`PostoSalvatoDto`: il posto riletto e le chiavi dei punti vendita creati, nell\'ordine della richiesta.',
    errori: [[400, 'validation-error'], [404, 'luogo-non-trovato'], [404, 'negozio-non-trovato'], [404, 'articolo-non-trovato'], [400, 'punto-vendita-di-altro-luogo'],
      [400, 'offerta-di-altro-punto-vendita'], [400, 'offerta-tolta-e-salvata'], [404, 'regola-non-trovata'], [400, 'regola-non-valida'], [400, 'offerta-da-copiare-sconosciuta'], [400, 'punto-vendita-senza-dati'], [400, 'nome-mancante'], [400, 'oggetto-sconosciuto'], [400, 'effetto-nell-oggetto'],
      [409, 'luogo-senza-punto-vendita'], [409, 'sede-con-pin-in-altra-area'], [409, 'offerta-con-risultati']],
  },
  'GET /api/catalogo/:tipo': {
    sommario: 'Righe di un tipo toccate dall\'utente, o le sole nascoste',
    descrizione: 'Senza query: le righe create o corrette dall\'utente e quelle nascoste, ordinate per nome (domande e cruciverba per chiave, cioè per giorno). Con `nascosti=1` (o `true`): le sole righe nascoste, per la pagina «Rimossi»; `negozio` restringe agli articoli di quel negozio e vale solo per il tipo `articolo`.',
    risposta: 'Elenco di `ElementoCatalogoDto`',
  },
  'POST /api/catalogo/:tipo': {
    sommario: 'Crea una riga del catalogo dell\'utente del tipo indicato',
    descrizione: 'Il corpo si valida con lo schema del tipo scelto da `:tipo` (400 `validation-error` con i dettagli). Il nome (la domanda per una domanda in classe, l\'indizio per il cruciverba) è obbligatorio salvo un\'offerta collegata tramite `catalogo_chiave`: nome, categoria, destinatario, effetto e statistiche arrivano allora dall\'oggetto e non vengono copiati nei campi storici dell\'offerta. Con il catalogo l\'effetto e le statistiche vivono solo nell\'oggetto (Ondata 5, lotto F, decisione 21): `effetto`, `effetto_json` o `statistiche` non vuoti nel corpo di un\'offerta rispondono 400 `effetto-nell-oggetto` (si scrivono con `PUT /api/catalogo-oggetti/:categoria/:slug`); null o vuoti passano. La chiave nasce dal nome come `u-<slug>`, annidata sotto il negozio per gli articoli e sotto il quartiere per i luoghi, con un suffisso numerico se già presa. Negozio, quartiere, sede e Confidente citati devono esistere; le condizioni devono citare chiavi esistenti. Dopo M7 `costo_json` ammette fiori, monete del Casinò (`monete`) o punti negozio (`punti`) con il loro importo, oppure oggetti da cedere per chiave e quantità, senza nomi copiati (Ondata 5, lotto E); `prezzo_per_fascia_json` (`{ "sera": 500 }`) è il prezzo in yen di una fascia quando è diverso da `prezzo`: uno scambio esplicito azzera il prezzo in yen a null, non a zero. Un costo null usa `prezzo`; prima di M7 un nuovo collegamento/costo strutturato risponde 409. Una riga aggiunta dall\'utente nasce verificata, salvo `verificato: false` esplicito.',
    risposta: 'La riga creata: `ElementoCatalogoDto`. Se la formula è omessa, la conversione della prosa deve essere completa: altrimenti 409 `condizioni-da-definire`, senza INSERT né identità orfane. Un array vuoto inviato esplicitamente vale come scelta di nessuna condizione propria; NULL non costituisce tale scelta. I dettagli del conflitto contengono operazione, campi e motivo classificato, senza testo o fotografia della fonte.',
    corpo: { perParametro: 'tipo', varianti: SCHEMI_CATALOGO },
    errori: [[400, 'validation-error'], [400, 'nome-mancante'], [400, 'negozio-sconosciuto'], [400, 'quartiere-sconosciuto'], [400, 'luogo-sconosciuto'],
      [400, 'confidente-sconosciuto'], [400, 'oggetto-sconosciuto'], [400, 'oggetto-costo-sconosciuto'], [400, 'effetto-nell-oggetto'],
      [409, 'catalogo-non-disponibile'], [409, 'condizioni-da-definire'], [400, 'domanda-fuori-dagli-esami'], [404, 'condizione-non-trovata'],
      [400, 'punto-vendita-senza-sede'], ...CONFLITTI_FONTE_CONFIDENTE],
  },
  'GET /api/catalogo/:tipo/:chiave': {
    sommario: 'Una riga qualunque del catalogo, anche della guida, per il modulo di modifica',
    descrizione: 'Legge la riga con i suoi campi scrivibili e la provenienza (guida o utente, corretta, nascosta). Le chiavi di articoli e luoghi contengono «/» (`negozio/articolo`, `quartiere/luogo`) e nel percorso vanno codificate (`%2F`). Una chiave inesistente è un 404 con codice `<tipo>-non-trovato`.',
    risposta: '`ElementoCatalogoDto`',
  },
  'PUT /api/catalogo/:tipo/:chiave': {
    sommario: 'Corregge una riga del catalogo: i campi assenti restano',
    descrizione: 'Il corpo si valida con lo schema parziale del tipo scelto da `:tipo` (400 `validation-error`). Una riga della guida corretta passa all\'utente e conserva l\'originale. Riferimenti e condizioni si verificano come alla creazione; una chiave inesistente è un 404 con codice `<tipo>-non-trovato`. Per le offerte col catalogo i campi d\'identità non si riscrivono, e `effetto`, `effetto_json` o `statistiche` non vuoti rispondono 400 `effetto-nell-oggetto` (vivono solo nell\'oggetto del catalogo); omettere `catalogo_chiave` e `costo_json` conserva collegamento e costo. Un oggetto già collegato/nascosto resta conservabile, ma una nuova scelta deve essere disponibile. I vecchi corpi fonte/chiave sono risolti soltanto tramite quel riferimento esatto. Le offerte storiche senza catalogo restano modificabili col loro nome. Le scritture invalidano le cache dei nomi; non riscrivono acquisti o diario. **Domande d\'esame** (tipo `esame-medio`/`esame-finale`, R11-15/7): la data deve cadere in uno dei giorni degli esami (400 `domanda-fuori-dagli-esami`) e la correzione non può lasciare un esame senza domande (409 `esame-senza-domande`); le domande in classe e i quiz in TV non hanno questi vincoli.',
    risposta: 'La riga aggiornata: `ElementoCatalogoDto`. Per attività confidente_chiave nullable collega una fonte esplicita per chiave. Omissione conserva il FK; null lo rimuove senza riattivare vecchi effetti. La riga completa viene validata nella TX: campi autonomi incompatibili o storia generica in una partita producono409, senza azzeramenti impliciti. Il RAW legacy delle Doti già collegato e invariato non viene convertito in effetti. dati._fonteConfidente espone la guida corrente in sola lettura.',
    corpo: { perParametro: 'tipo', varianti: SCHEMI_CATALOGO_PARZIALI },
    errori: [[400, 'validation-error'], [400, 'nome-mancante'], [400, 'negozio-sconosciuto'], [400, 'quartiere-sconosciuto'], [400, 'luogo-sconosciuto'],
      [400, 'confidente-sconosciuto'], [400, 'oggetto-sconosciuto'], [400, 'oggetto-costo-sconosciuto'], [400, 'effetto-nell-oggetto'],
      [409, 'catalogo-non-disponibile'], [409, 'videogioco-con-avanzamento'], [400, 'domanda-fuori-dagli-esami'], [409, 'esame-senza-domande'],
      [404, 'condizione-non-trovata'], [400, 'punto-vendita-senza-sede'], [409, 'sede-con-pin-in-altra-area'], [409, 'luogo-senza-punto-vendita'], ...CONFLITTI_FONTE_CONFIDENTE],
  },
  'PUT /api/catalogo/:tipo/:chiave/nascosta': {
    sommario: 'Nasconde o rimostra una riga del catalogo',
    descrizione: 'Serve soprattutto per le voci della guida che nel gioco non esistono: cancellarle non basterebbe, perché un aggiornamento dei dati della guida le riporterebbe. Nascondendo una riga della guida se ne conserva l\'originale. Una chiave inesistente è un 404 con codice `<tipo>-non-trovato`.',
    risposta: 'La riga aggiornata: `ElementoCatalogoDto`',
    errori: [[409, 'luogo-senza-punto-vendita']],
  },
  'DELETE /api/catalogo/:tipo/:chiave': {
    sommario: 'Elimina una riga creata dall\'utente (nel Cestino)',
    descrizione: 'Una riga creata dall\'utente si elimina nel Cestino (gli articoli di un negozio dell\'utente se ne vanno con lui) e pin e mappe che citavano quel luogo o quel negozio perdono il collegamento. Fuori da luoghi e negozi, una riga della guida, corretta o no, non si elimina: 400 `riga-della-guida` (per toglierla dalla vista si nasconde); non c\'è un ritorno ai valori della guida. **L5, luoghi e negozi**: `DELETE` elimina e basta, sempre nel cestino (righe della guida e dell\'utente): un luogo con punti vendita risponde 409 `luogo-con-punti-vendita` finché non sono spostati o eliminati, e l\'ultimo punto vendita visibile di un luogo che vende 409 `luogo-senza-punto-vendita`, salvo una riga «In attesa: motivo» nelle note del luogo; senza `?conferma=1` e con contenuti risponde 409 (`luogo-con-contenuti`: pin e attività della sede; `negozio-con-acquisti`: articoli, acquisti e punti nelle partite, pin) con il riepilogo nei dettagli; con la conferma il luogo se ne va con i suoi pin (immagini e stati compresi) e le attività restano senza sede, il negozio con articoli, acquisti e punti delle partite (i pin restano senza riferimento). Si rimette dal Cestino. La risposta porta anche `riepilogo`.',
    risposta: '`{ esito: "eliminata", elemento: null }` (per luoghi e negozi anche `riepilogo`).',
    errori: [[400, 'riga-della-guida'], [409, 'luogo-con-contenuti'], [409, 'negozio-con-acquisti'], [409, 'luogo-con-punti-vendita'], [409, 'luogo-senza-punto-vendita'], [404, 'luogo-non-trovato'], [404, 'negozio-non-trovato']],
  },
};
