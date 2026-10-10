// ============================================================
// descrizioni/mappe — mappe a livelli, spilli, contenuti della guida, accesso ai luoghi, piante dei quartieri, import/export
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/** Le descrizioni delle rotte di `/api/mappe` (`routes/mappe.ts`). Mappe e spilli sono dati di gioco condivisi fra le partite. */
export const DESCRIZIONI_MAPPE: DescrizioniArea = {
  'GET /api/mappe/risolvi/:chiave': {
    sommario: 'Che cosa apre un percorso di mappa: una mappa o una sezione della guida di un Palazzo',
    descrizione: 'Se la chiave è l\'alias di una vecchia mappa d\'area con una destinazione valida, risponde con la sezione della guida dentro la mappa del suo Palazzo; altrimenti con la mappa di quella chiave (chiave pubblica o interna). La chiave è libera: un indirizzo scritto a mano che non corrisponde a nulla è un 404, non un errore di validazione.',
    risposta: '`RisoluzioneMappaDto`: `{ tipo: "mappa", mappa }` oppure `{ tipo: "guida", area, dungeon, mappaPalazzo, nome }`',
    errori: [[404, 'mappa-non-trovata']],
  },
  'GET /api/mappe/contenuti/:chiave': {
    sommario: 'Contenuti della guida di una mappa: aree, collegamenti, punti e planimetrie di ogni area',
    descrizione: 'Per la mappa radice di un Palazzo le aree di tutto il Palazzo, altrimenti quelle legate alla mappa. Per ogni area: i collegamenti, i punti (gli elementi della guida più le voci che nessun elemento rappresenta, con i passi degli Enigmi subito sotto il loro Enigma) e le planimetrie. Con `partita` le schede portano anche lo stato di quella partita.',
    risposta: '`ContenutiMappaDto`',
    errori: [[404, 'mappa-non-trovata'], [404, 'partita-non-trovata']],
  },
  'GET /api/mappe/accesso/:tipo/:chiave': {
    sommario: '«Apri sulla mappa»: dove si trova sulle mappe un\'entità della guida',
    descrizione: 'Segue solo associazioni registrate, mai una somiglianza di nome: pin che citano l\'entità, mappe che la hanno come propria o fra le loro entità, sedi dei negozi, ingresso configurato del quartiere. Se non portano da nessuna parte si allarga al posto che l\'entità dichiara (il quartiere di un luogo o di un negozio, il Palazzo di un\'area) e la provenienza lo dice (`posto-dichiarato`). Una mappa che contiene già il pin esatto non compare una seconda volta come accesso generico. Articoli e negozi nascosti sono un 404.',
    risposta: '`AccessoMondoDto`: `esito` (`unica`, `multipla`, `assente`), destinazioni con le loro provenienze ed eventuali sezioni della guida',
    errori: [[404, 'luogo-non-trovato'], [404, 'mappa-non-trovata']],
  },
  'POST /api/mappe/piante-citta/:quartiere/scarica': {
    sommario: 'Scarica nell\'istanza la mappa di un quartiere dall\'indirizzo registrato nei dati di gioco',
    descrizione: 'Legge l\'indirizzo della pianta del quartiere, scarica l\'immagine e la salva nell\'ambito «mappa» con la chiave `citta-<quartiere>` (sostituendo quella che c\'era). 404 se per il quartiere non è registrata nessuna pianta; 400 se lo scarico fallisce o il file supera il limite.',
    risposta: '`{ quartiere, mime, byte, fonte, url }`',
    senzaCorpo: true,
    errori: [[404, 'pianta-non-disponibile'], [400, 'download-fallito'], [400, 'immagine-troppo-grande'], [400, 'formato-non-ammesso']],
  },
  'GET /api/mappe/albero': {
    sommario: 'Albero completo delle mappe, in forma piatta con il genitore',
    descrizione: 'Radici prima, poi per ordine e chiave. Ogni riassunto porta chiave pubblica, nome con il percorso, genitore, immagine dell\'istanza o asset predefinito, entità legata, presentazione e conteggi di spilli e figli. I Memento (pozzo e ingresso) non ci sono: si raggiungono dalla loro pagina.',
    risposta: 'Elenco di `MappaRiassuntoDto`',
  },
  'GET /api/mappe/esporta': {
    sommario: 'Pacchetto JSON delle mappe da scaricare: tutte o un luogo con le sue discendenti',
    descrizione: 'Mappe, spilli (con le schermate in base64) e immagini di base dell\'istanza in base64: è lo stesso formato che `POST /api/mappe/importa` accetta. Con `radice` solo quella mappa e le sue discendenti. La risposta ha `Content-Disposition: attachment` con il nome `mappe-<radice|tutte>.json`.',
    risposta: '`EsportazioneMappeDto`',
    senzaProva: 'Troppo pesante per essere mostrato in una pagina: con le immagini in base64 l\'esportazione di tutte le mappe supera i 10 MB. Prima di esportare assegna l\'uid agli spilli che non l\'hanno ancora (`assegnaUidMancanti`). Si scarica dall\'editor delle mappe (Esporta).',
    errori: [[404, 'mappa-non-trovata']],
  },
  'POST /api/mappe/importa': {
    sommario: 'Importa un pacchetto di mappe nel formato dell\'esportazione',
    descrizione: 'Il pacchetto deve avere `versione: 1`. Le mappe si abbinano per chiave: senza `sovrascrivi` quelle già presenti si saltano, come quelle con chiave o tipo non validi (elencate in `saltate`); con `sovrascrivi` mappe e spilli esistenti si sostituiscono. Le righe importate sono dell\'utente. Condizioni che citano chiavi assenti dalla guida e voci della guida non ammesse si scartano e si contano; tutto avviene in una transazione.',
    risposta: '`{ mappe, spilli, immagini, saltate, condizioniScartate, vociScartate }` (conteggi e chiavi saltate)',
    errori: [[400, 'pacchetto-non-valido'], [400, 'destinazione-non-valida'], [404, 'destinazione-non-trovata'], [400, 'voce-non-valida']],
  },
  'GET /api/mappe/riferimenti': {
    sommario: 'Entità collegabili a uno spillo nell\'editor, per tipo e testo',
    descrizione: 'Cerca nel nome o nella chiave (senza distinzione di maiuscole) le entità del tipo indicato: mappe, negozi, punti della guida, luoghi, Confidenti, richieste, attività (fra i luoghi di tipo attività, servizio o scuola). Per le mappe ogni parola deve comparire nel nome con il percorso o nella chiave, accenti esclusi. Al più `limite` risultati (30 se non indicato).',
    risposta: 'Elenco di `{ tipo, chiave, nome, dettaglio }`',
  },
  'GET /api/mappe/entita/:tipo/:chiave': {
    sommario: 'La mappa collegata a un\'entità della guida (quartiere, area, Palazzo…)',
    descrizione: 'Cerca la mappa che ha l\'entità come propria o fra le entità legate. Risponde solo se la mappa è esattamente una: nessuna o più d\'una sono un 404.',
    risposta: '`MappaRiassuntoDto`',
    errori: [[404, 'mappa-non-trovata']],
  },
  'PUT /api/mappe/ordine': {
    sommario: 'Riscrive l\'ordine delle mappe elencate (riordino per trascinamento)',
    descrizione: 'L\'elenco è il nuovo ordine. Le chiavi si raggruppano per il loro genitore effettivo e ogni gruppo di sorelle si rinumera da 0, con le elencate in testa e le altre in coda nell\'ordine che avevano, in una transazione. Con `genitore` le chiavi devono stare nel suo sottoalbero (lui escluso); `genitore: null` ammette qualunque mappa.',
    risposta: 'Elenco di `MappaRiassuntoDto` delle mappe rinumerate',
    errori: [[404, 'mappa-non-trovata'], [400, 'mappa-fuori-dal-genitore']],
  },
  'POST /api/mappe': {
    sommario: 'Crea una mappa dall\'editor',
    descrizione: 'La chiave si ricava dal nome, preceduta da quella del genitore salvo sotto una città; deve essere valida, non riservata a una rotta di `/api/mappe` e libera (409 se esiste). Una `chiave` richiesta diversa resta come alias. Senza `asset` si usa quello predefinito `mappe/<chiave>`. Un\'area della guida si lega solo a una planimetria del suo Palazzo. Con un genitore, `passaggio` crea lo spillo di passaggio nel genitore verso la nuova mappa e `ritorno` quello inverso.',
    risposta: 'La mappa creata: `MappaDto`',
    errori: [[404, 'mappa-non-trovata'], [409, 'mappa-esistente'], [400, 'chiave-riservata'], [400, 'chiave-non-valida'], [400, 'mappa-fuori-palazzo'], [400, 'area-inesistente'], [400, 'area-di-altro-palazzo']],
  },
  'GET /api/mappe/:chiave': {
    sommario: 'Dettaglio di una mappa con percorso, figli, spilli e arrivi',
    descrizione: 'La chiave può essere pubblica o interna. Gli spilli portano i dettagli delle entità collegate e, con `partita`, lo stato di quella partita e le condizioni valutate; `arrivi` sono gli spilli di altre mappe che portano qui. L\'URL dell\'immagine dell\'istanza è versionato con la data di caricamento.',
    risposta: '`MappaDto`',
    errori: [[404, 'mappa-non-trovata'], [404, 'partita-non-trovata']],
  },
  'PUT /api/mappe/:chiave': {
    sommario: 'Aggiorna una mappa dall\'editor: i campi assenti restano',
    descrizione: 'Il genitore non può essere la mappa stessa né una sua discendente. Spostandola, le aree della guida sue e delle discendenti devono restare del Palazzo di arrivo. Salvare con il nome segna il nome come rivisto; se la mappa dava il titolo alla sua stanza, quel titolo si fissa prima del cambio. Riga, legame con l\'entità e percorsi si scrivono in una transazione e la mappa diventa dell\'utente.',
    risposta: 'La mappa aggiornata: `MappaDto`',
    errori: [[404, 'mappa-non-trovata'], [400, 'genitore-non-valido'], [400, 'mappa-fuori-palazzo'], [400, 'area-inesistente'], [400, 'area-di-altro-palazzo']],
  },
  'PUT /api/mappe/:chiave/aree': {
    sommario: 'Imposta l\'insieme delle aree della guida contenute in una planimetria',
    descrizione: 'Si passa l\'insieme completo: le aree tolte si staccano, quelle nuove si aggiungono e restano anche sulle altre planimetrie che le avevano (un\'area può stare su più planimetrie, dal 2026-10-04). Le aree devono essere del Palazzo della planimetria; la mappa d\'insieme del Palazzo non ne accetta. Gli altri legami della mappa restano; la mappa diventa dell\'utente.',
    risposta: '`{ aree }`: le aree legate in ordine di guida, ognuna `{ chiave, nome, ordine }`',
    errori: [[404, 'mappa-non-trovata'], [400, 'mappa-fuori-palazzo'], [400, 'area-inesistente'], [400, 'area-di-altro-palazzo']],
  },
  'DELETE /api/mappe/:chiave': {
    sommario: 'Elimina una mappa con i suoi spilli',
    descrizione: 'In una transazione: le schermate dei suoi pin e la sua immagine di base (se non è anche la pianta di un quartiere o di un\'area), gli spilli in cascata e i loro stati nelle partite; le mappe figlie diventano radici.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'mappa-non-trovata']],
  },
  'PUT /api/mappe/:chiave/presentazione': {
    sommario: 'Raggruppamento di una planimetria: stanza a cui appartiene ed etichetta della versione',
    descrizione: '`gruppoId` sposta la mappa nella stanza indicata, `gruppoNome` dà o cambia il nome della stanza (scritto su tutte le sue tavole e segnato come scelto da una persona), `etichetta` dice che cosa mostra questa versione. `gruppoId: null` senza nome fa uscire la mappa dal raggruppamento. Il nome della mappa non cambia.',
    risposta: 'La mappa aggiornata: `MappaDto`',
    errori: [[404, 'mappa-non-trovata'], [400, 'presentazione-non-disponibile']],
  },
  'PUT /api/mappe/:chiave/stanza': {
    sommario: 'Fa entrare una planimetria nella stanza di un\'altra, o la rende una stanza a sé',
    descrizione: 'Con `con` = un\'altra planimetria dello stesso luogo, questa entra in fondo alle versioni della sua stanza (che nasce con il nome `nome` se non c\'era) e nell\'ordine del luogo si sposta subito dopo l\'ultima versione. Con `con: null` diventa una stanza a sé chiamata `nome` (o con il suo nome). L\'etichetta resta; tutto in una transazione.',
    risposta: 'La mappa aggiornata: `MappaDto`',
    errori: [[404, 'mappa-non-trovata'], [400, 'stanza-non-valida'], [400, 'stanza-di-altro-luogo'], [400, 'presentazione-non-disponibile']],
  },
  'PUT /api/mappe/:chiave/immagine': {
    sommario: 'Carica l\'immagine di base di una mappa (corpo grezzo image/*)',
    descrizione: 'Il file va inviato come corpo grezzo con `Content-Type` immagine (PNG, JPEG, WEBP, GIF o SVG). Si salva nell\'istanza nell\'ambito «mappa» con la chiave della mappa, sostituendo la precedente; larghezza e altezza si leggono dall\'intestazione quando possibile e si scrivono insieme all\'immagine.',
    risposta: 'La mappa aggiornata: `MappaDto`',
    corpoBinario: 'image/*',
    errori: [[404, 'mappa-non-trovata'], [400, 'immagine-vuota'], [400, 'formato-non-ammesso'], [400, 'immagine-troppo-grande']],
  },
  'POST /api/mappe/:chiave/spilli': {
    sommario: 'Crea uno spillo su una mappa',
    descrizione: 'La categoria del tipo decide il resto: i consumabili sono collezionabili, gli spilli di città non hanno condizioni (salvo il Confidente, dal 2026-10-04), la destinazione vale solo per gli spostamenti e il riferimento deve essere di un tipo ammesso dalla categoria ed esistere. Un riferimento «punto» diventa la voce della guida del pin, con le regole del collegamento (voce non descrittiva, del Palazzo della planimetria). Le condizioni devono citare chiavi esistenti. Lo spillo nasce dell\'utente, in una transazione.',
    risposta: 'Lo spillo creato: `SpilloDto`',
    errori: [[404, 'mappa-non-trovata'], [400, 'riferimento-non-ammesso'], [404, 'riferimento-non-trovato'], [404, 'punto-non-trovato'], [400, 'punto-descrittivo'], [400, 'pin-fuori-dal-palazzo'], [404, 'condizione-non-trovata'], [404, 'destinazione-non-trovata']],
  },
  'POST /api/mappe/:chiave/passaggi': {
    sommario: 'Crea uno spillo di passaggio verso un\'altra mappa in un punto libero',
    descrizione: 'Lo spillo prende il nome della destinazione e un punto libero scelto dal server: vicino al centro, o in basso al centro se la destinazione è il genitore (la via del ritorno). Poi lo si trascina dove sta davvero l\'ingresso. Una mappa non può avere un passaggio verso sé stessa; 409 se ha già uno spillo verso quella destinazione.',
    risposta: 'Lo spillo creato: `SpilloDto`',
    errori: [[404, 'mappa-non-trovata'], [400, 'passaggio-non-valido'], [409, 'passaggio-esistente']],
  },
  'PUT /api/mappe/spilli/:id': {
    sommario: 'Aggiorna uno spillo: i campi assenti restano',
    descrizione: 'Con `mappa` lo si sposta su un\'altra mappa; una scheda della guida senza mappa non accetta coordinate, mappa né destinazione. Su una planimetria un riferimento «punto» diventa una voce in più del pin (098), e spostando il pin le sue voci devono restare del Palazzo. Cambiando tipo, un riferimento non più ammesso dalla categoria cade. Le condizioni non possono far dipendere il pin da se stesso né chiudere un giro fra pin. Uno spillo della guida modificato diventa dell\'utente.',
    risposta: 'Lo spillo aggiornato: `SpilloDto`, o `SchedaContenutoGuidaDto` per una scheda della guida senza mappa',
    errori: [[404, 'spillo-non-trovato'], [400, 'contenuto-non-spaziale'], [400, 'riferimento-non-ammesso'], [404, 'riferimento-non-trovato'], [400, 'pin-fuori-dal-palazzo'], [404, 'condizione-non-trovata'], [400, 'condizione-su-se-stesso'], [400, 'condizioni-in-giro']],
  },
  'GET /api/mappe/spilli/:id/voci-collegabili': {
    sommario: 'Le voci della guida che si possono collegare a uno spillo (editor delle mappe)',
    descrizione: 'Quelle del Palazzo della planimetria dello spillo che si segnano — non descrittive, non un Enigma coi suoi passi —, tranne quelle già sue, in ordine di guida. Uno spillo fuori dai Palazzi non ne ha. Si collegano e scollegano con `PUT`/`DELETE /api/compendio/punti/:chiave/pin/:spillo` (098: un pin può avere più voci).',
    risposta: 'Elenco di `VoceCollegabileDto`',
    errori: [[404, 'spillo-non-trovato']],
  },
  'DELETE /api/mappe/spilli/:id': {
    sommario: 'Elimina uno spillo',
    descrizione: 'In una transazione: le sue schermate caricate, lo spillo e i suoi stati («raccolto» e simili) in tutte le partite.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'spillo-non-trovato']],
  },
  'POST /api/mappe/spilli/:id/immagini': {
    sommario: 'Aggiunge una schermata di riferimento a uno spillo (corpo grezzo image/*)',
    descrizione: 'Il file va inviato come corpo grezzo con `Content-Type` immagine; la didascalia (facoltativa, al più 300 caratteri) passa nella query. La schermata va in fondo alle altre; file e riga che lo lega al pin nascono insieme, in una transazione.',
    risposta: 'Lo spillo aggiornato: `SpilloDto` o `SchedaContenutoGuidaDto`',
    corpoBinario: 'image/*',
    errori: [[404, 'spillo-non-trovato'], [400, 'immagine-vuota'], [400, 'formato-non-ammesso'], [400, 'immagine-troppo-grande']],
  },
  'PUT /api/mappe/spilli/immagini/:id': {
    sommario: 'Cambia didascalia e ordine di una schermata di uno spillo',
    descrizione: '`:id` è l\'identificatore della schermata, non dello spillo. I campi assenti restano; la didascalia si tronca a 300 caratteri.',
    risposta: 'Lo spillo della schermata, aggiornato: `SpilloDto` o `SchedaContenutoGuidaDto`',
    errori: [[404, 'immagine-non-trovata']],
  },
  'DELETE /api/mappe/spilli/immagini/:id': {
    sommario: 'Toglie una schermata da uno spillo',
    descrizione: '`:id` è l\'identificatore della schermata. Riga e file caricato si tolgono insieme, in una transazione.',
    risposta: 'Lo spillo della schermata, aggiornato: `SpilloDto` o `SchedaContenutoGuidaDto`',
    errori: [[404, 'immagine-non-trovata']],
  },
};
