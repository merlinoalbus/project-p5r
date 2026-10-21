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
    descrizione: 'Indirizzo storico mantenuto sul contratto del catalogo unico, filtrato per categoria d’articolo. Restituisce identità canoniche con chiave, provenienza e proprietà correnti, senza un DTO o un selettore parallelo. La categoria arma comprende anche le armi da fuoco.',
    risposta: 'Elenco di `CatalogoOggettoDto`',
  },
  'GET /api/catalogo/oggetti': {
    sommario: 'Tutti gli oggetti che l\'app conosce, senza filtro di categoria',
    descrizione: 'Indirizzo storico del catalogo unico: identità visibili di ogni categoria, con nomi e proprietà canonici. La selezione e i salvataggi usano la chiave del catalogo.',
    risposta: 'Elenco di `CatalogoOggettoDto`',
  },
  'GET /api/catalogo/:tipo': {
    sommario: 'Righe di un tipo toccate dall\'utente, o le sole nascoste',
    descrizione: 'Senza query: le righe create o corrette dall\'utente e quelle nascoste, ordinate per nome (domande e cruciverba per chiave, cioè per giorno). Con `nascosti=1` (o `true`): le sole righe nascoste, per la pagina «Rimossi»; `negozio` restringe agli articoli di quel negozio e vale solo per il tipo `articolo`.',
    risposta: 'Elenco di `ElementoCatalogoDto`',
  },
  'POST /api/catalogo/:tipo': {
    sommario: 'Crea una riga del catalogo dell\'utente del tipo indicato',
    descrizione: 'Il corpo si valida con lo schema del tipo scelto da `:tipo` (400 `validation-error` con i dettagli). Il nome (la domanda per una domanda in classe, l\'indizio per il cruciverba) è obbligatorio salvo un\'offerta collegata tramite `catalogo_chiave`: nome, categoria, destinatario, effetto e statistiche arrivano allora dall\'oggetto e non vengono copiati nei campi storici dell\'offerta. La chiave nasce dal nome come `u-<slug>`, annidata sotto il negozio per gli articoli e sotto il quartiere per i luoghi, con un suffisso numerico se già presa. Negozio, quartiere, sede e Confidente citati devono esistere; le condizioni devono citare chiavi esistenti. Dopo M7 `costo_json` ammette fiori o oggetti da cedere per chiave e quantità, senza nomi copiati: uno scambio esplicito azzera il prezzo in yen a null, non a zero. Un costo null usa `prezzo`; prima di M7 un nuovo collegamento/costo strutturato risponde 409. Una riga aggiunta dall\'utente nasce verificata, salvo `verificato: false` esplicito.',
    risposta: 'La riga creata: `ElementoCatalogoDto`',
    corpo: { perParametro: 'tipo', varianti: SCHEMI_CATALOGO },
    errori: [[400, 'validation-error'], [400, 'nome-mancante'], [400, 'negozio-sconosciuto'], [400, 'quartiere-sconosciuto'], [400, 'luogo-sconosciuto'], [400, 'confidente-sconosciuto'], [400, 'oggetto-sconosciuto'], [400, 'oggetto-costo-sconosciuto'], [409, 'catalogo-non-disponibile'], [404, 'condizione-non-trovata']],
  },
  'GET /api/catalogo/:tipo/:chiave': {
    sommario: 'Una riga qualunque del catalogo, anche della guida, per il modulo di modifica',
    descrizione: 'Legge la riga con i suoi campi scrivibili e la provenienza (guida o utente, corretta, nascosta). Le chiavi di articoli e luoghi contengono «/» (`negozio/articolo`, `quartiere/luogo`) e nel percorso vanno codificate (`%2F`). Una chiave inesistente è un 404 con codice `<tipo>-non-trovato`.',
    risposta: '`ElementoCatalogoDto`',
  },
  'PUT /api/catalogo/:tipo/:chiave': {
    sommario: 'Corregge una riga del catalogo: i campi assenti restano',
    descrizione: 'Il corpo si valida con lo schema parziale del tipo scelto da `:tipo` (400 `validation-error`). Una riga della guida corretta passa all\'utente e conserva l\'originale. Riferimenti e condizioni si verificano come alla creazione; una chiave inesistente è un 404 con codice `<tipo>-non-trovato`. Per le offerte col catalogo i campi d\'identità non si riscrivono; omettere `catalogo_chiave` e `costo_json` conserva collegamento e costo. Un oggetto già collegato/nascosto resta conservabile, ma una nuova scelta deve essere disponibile. I vecchi corpi fonte/chiave sono risolti soltanto tramite quel riferimento esatto. Le offerte storiche senza catalogo restano modificabili col loro nome. Le scritture invalidano le cache dei nomi; non riscrivono acquisti o diario.',
    risposta: 'La riga aggiornata: `ElementoCatalogoDto`',
    corpo: { perParametro: 'tipo', varianti: SCHEMI_CATALOGO_PARZIALI },
    errori: [[400, 'validation-error'], [400, 'nome-mancante'], [400, 'negozio-sconosciuto'], [400, 'quartiere-sconosciuto'], [400, 'luogo-sconosciuto'], [400, 'confidente-sconosciuto'], [400, 'oggetto-sconosciuto'], [400, 'oggetto-costo-sconosciuto'], [409, 'catalogo-non-disponibile'], [409, 'videogioco-con-avanzamento'], [404, 'condizione-non-trovata']],
  },
  'PUT /api/catalogo/:tipo/:chiave/nascosta': {
    sommario: 'Nasconde o rimostra una riga del catalogo',
    descrizione: 'Serve soprattutto per le voci della guida che nel gioco non esistono: cancellarle non basterebbe, perché un aggiornamento dei dati della guida le riporterebbe. Nascondendo una riga della guida se ne conserva l\'originale. Una chiave inesistente è un 404 con codice `<tipo>-non-trovato`.',
    risposta: 'La riga aggiornata: `ElementoCatalogoDto`',
  },
  'DELETE /api/catalogo/:tipo/:chiave': {
    sommario: 'Elimina una riga creata dall\'utente o riporta com\'era una riga della guida corretta',
    descrizione: 'Una riga creata dall\'utente si elimina (gli articoli di un negozio dell\'utente se ne vanno con lui) e pin e mappe che citavano quel luogo o quel negozio perdono il collegamento. Una riga della guida corretta o nascosta torna com\'era nei dati della guida, visibile. Una riga della guida mai modificata non ha nulla da ripristinare: 400 (per toglierla dalla vista si nasconde). **L5, luoghi e negozi**: `DELETE` elimina e basta, sempre nel cestino (righe della guida e dell\'utente): senza `?conferma=1` e con contenuti risponde 409 (`luogo-con-contenuti`: pin, negozi e attività della sede; `negozio-con-acquisti`: articoli, acquisti e punti nelle partite, pin) con il riepilogo nei dettagli; con la conferma il luogo se ne va con i suoi pin (immagini e stati compresi) e negozi e attività restano senza sede, il negozio con articoli, acquisti e punti delle partite (i pin restano senza riferimento). Si rimette dal Cestino. La risposta porta anche `riepilogo`. «Ripristina» è `POST …/ripristina`.',
    risposta: '`{ esito: "eliminata" | "ripristinata", elemento }`: `elemento` è la riga ripristinata (`ElementoCatalogoDto`) o null se eliminata',
    errori: [[400, 'riga-del-seed'], [409, 'luogo-con-contenuti'], [409, 'negozio-con-acquisti'], [409, 'videogioco-con-avanzamento'], [404, 'luogo-non-trovato'], [404, 'negozio-non-trovato']],
  },
  'POST /api/catalogo/:tipo/:chiave/ripristina': {
    sommario: '«Ripristina i valori della guida» di una riga corretta (ogni tipo del catalogo)',
    descrizione: 'Rimette sulla riga i valori della guida (`seed_json`), la rende di nuovo della guida e visibile. Non elimina mai. Un\'istantanea anteriore a L5/M7 non azzera orari, Area, collegamento o costo aggiunti dopo; prima di M7 non legge né scrive le colonne nuove. Se l\'oggetto dell\'istantanea non esiste più risponde 409 prima della scrittura: va rimesso dal cestino. 400 `creata-da-te` per una riga creata dall\'utente, 400 `riga-del-seed` per una riga della guida mai corretta.',
    senzaCorpo: true,
    risposta: 'La riga ripristinata, `ElementoCatalogoDto`',
    errori: [[400, 'creata-da-te'], [400, 'riga-del-seed'], [409, 'oggetto-originale-mancante'], [409, 'videogioco-con-avanzamento']],
  },
};
