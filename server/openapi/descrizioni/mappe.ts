// ============================================================
// descrizioni/mappe — mappe a livelli, spilli, contenuti della guida, accesso ai luoghi, piante dei quartieri, import/export
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/** Le descrizioni delle rotte di `/api/mappe` (`routes/mappe.ts`). Mappe e spilli sono dati di gioco condivisi fra le partite. */
export const DESCRIZIONI_MAPPE: DescrizioniArea = {
  'GET /api/mappe/risolvi/:chiave': {
    sommario: 'Che cosa apre un percorso di mappa: una mappa o una sezione della guida di un Palazzo',
    descrizione: 'Se la chiave è l\'alias di una vecchia mappa d\'area con una destinazione valida, risponde con la sezione della guida dentro la mappa del suo Palazzo; altrimenti con la mappa di quella chiave (chiave pubblica o interna). La chiave è libera: un indirizzo scritto a mano che non corrisponde a nulla è un 404, non un errore di validazione.',
    risposta: '`RisoluzioneMappaDto`: `{ tipo: "mappa", mappa, casa }` (L2: `casa` è l\'unica pagina che mostra la mappa — La città, il quartiere, l\'Area con `?planimetria=` se la versione non è la predefinita, o il visore) oppure `{ tipo: "guida", area, dungeon, mappaPalazzo, nome }`',
    errori: [[404, 'mappa-non-trovata']],
  },
  'GET /api/mappe/contenuti/:chiave': {
    sommario: 'Contenuti della guida di una mappa: aree, collegamenti, punti e planimetrie di ogni area',
    descrizione: 'Per la mappa radice di un Palazzo le aree di tutto il Palazzo, altrimenti quelle legate alla mappa. Per ogni area: i collegamenti, i punti (gli elementi della guida più le voci che nessun elemento rappresenta, con i passi degli Enigmi subito sotto il loro Enigma) e le planimetrie. Con `partita` le schede portano anche lo stato di quella partita. Da L4 (§2.3), nei Palazzi i punti sono **le voci** della guida (`punto:<chiave>`, con stato nella partita, carattere, esauribilità e la «posizione da collocare» della scheda senza mappa che hanno assorbito, finché non hanno un pin): le schede senza mappa legate a una voce non compaiono più come elementi a sé, quelle senza voce stanno nelle «Schede da sistemare» della scheda del Palazzo. I dedali dei Memento restano come prima.',
    risposta: '`ContenutiMappaDto`',
    errori: [[404, 'mappa-non-trovata'], [404, 'partita-non-trovata']],
  },
  'GET /api/mappe/accesso/:tipo/:chiave': {
    sommario: '«Apri sulla mappa»: dove si trova sulle mappe un\'entità della guida',
    descrizione: 'Segue solo associazioni registrate, mai una somiglianza di nome: pin che citano l\'entità, mappe che la hanno come propria o fra le loro entità, sedi dei negozi, ingresso configurato del quartiere. Se non portano da nessuna parte si allarga al posto che l\'entità dichiara (il quartiere di un luogo o di un negozio, il Palazzo di un\'area) e la provenienza lo dice (`posto-dichiarato`). Una mappa che contiene già il pin esatto non compare una seconda volta come accesso generico. Articoli e negozi nascosti sono un 404.',
    risposta: '`AccessoMondoDto`: `esito` (`unica`, `multipla`, `assente`), destinazioni con le loro provenienze ed eventuali sezioni della guida',
    errori: [[404, 'luogo-non-trovato'], [404, 'mappa-non-trovata']],
  },
  'GET /api/mappe/albero': {
    sommario: 'Albero completo delle mappe, in forma piatta con il genitore',
    descrizione: 'Radici prima, poi per ordine e chiave. Ogni riassunto porta chiave pubblica, nome con il percorso, genitore, immagine dell\'istanza o asset predefinito, `radiceDi` (il quartiere o il Palazzo di cui la mappa è la radice, ricavato dalla chiave `citta-<q>` / `dungeon-<d>`), `versione` (etichetta e ordine dentro la stanza), presentazione e conteggi di spilli e figli. I Memento (pozzo e ingresso) non ci sono: si raggiungono dalla loro pagina. Da L3 (E2, decisione dell\'utente) ogni nodo porta `conteggiPin` `{ contenuto, passaggi, note }`: i pin suoi e di tutto quel che gli sta sotto nell\'albero, nei tre gruppi della regola unica `gruppoConteggioSpillo` (passaggi = categoria «spostamento» più le porte chiuse, note = la nota, contenuto = il resto). `numeroSpilli` resta: i pin della sola mappa, tutti. Il totale dell\'indice è in `GET /api/mappe/albero/conteggi`.',
    risposta: 'Elenco di `MappaRiassuntoDto`',
  },
  'GET /api/mappe/albero/conteggi': {
    sommario: 'Conteggi dei pin della radice dell\'indice delle Mappe, nei tre gruppi',
    descrizione: 'I pin di tutto l\'albero delle mappe (Memento esclusi, come in `GET /api/mappe/albero`) in `conteggiPin` `{ contenuto, passaggi, note }`, con la regola unica `gruppoConteggioSpillo` (E2 di L3). La somma dei tre è la somma dei `numeroSpilli` dell\'albero. È la radice dell\'indice: l\'albero è una lista piatta con più radici (Tokyo e i Palazzi), e il client non somma.',
    risposta: '`ConteggiAlberoDto`',
  },
  'GET /api/mappe/gerarchia': {
    sommario: 'La gerarchia dei luoghi: Città, quartieri, Palazzi, Memento, Aree e planimetrie, con conteggi e casa di ogni nodo',
    descrizione: 'L\'albero dell\'indice `/guida/mappe` (L11). Radici: la città (Tokyo) con i quartieri, le Aree della città da verificare e i Palazzi; il Memento (tipo `memento`) con i suoi dedali (tipo `dedalo`) e le loro aree (tipo `area-dedalo`, senza planimetrie), più le mappe dei Memento che non hanno un\'Area come foglie col visore; in fondo «Da collocare» (le planimetrie senza Area, con lo stesso contenuto di `GET /api/aree/da-collocare`). Quartiere › Area › planimetrie (versioni); Palazzo › Area › planimetrie, con le infiltrazioni che toccano ogni Area in `accanto` e quelle senza Area in `senzaArea`. Ogni nodo porta la sua `casa` (l\'unica pagina che lo mostra) e i `conteggi` calcolati dal server: ogni oggetto una volta sola, e i pin di un\'Area contano per oggetto (riferimento, poi voci collegate, poi pin) e non per versione. `totali` sono i numeri dell\'intestazione. Con `partita` quartieri e Aree del mondo dicono se sono già aperti (`disponibile`, `bloccoMotivo`): nessun nodo è nascosto. La `casa` di un dedalo è il suo menù nella scheda dei Memento (`?area=<dedalo>`), quella di un\'area del dedalo apre anche la zona (`&zona=<area>`). Iweleth compare una sola volta, come dedalo, con le sue aree; le Aree e le planimetrie del suo vecchio Palazzo stanno nel nodo «Archivio del Palazzo di Iweleth» dentro il dedalo. `conteggi` del ramo: `dedali`, `aree`, `persone` (Persona distinte), `trame`, `richieste`; `totali.dedali` e `totali.areeDedali`. I nodi `palazzo`, `dedalo` e `area-dedalo` (O9-5) portano in `immagine` la miniatura caricata dall\'utente (ambito `dungeon`, URL versionato; null senza) e in `miniatura` dove caricarla (`{ ambito: \'dungeon\', chiave }`).',
    risposta: '`GerarchiaMappeDto`',
    errori: [[404, 'partita-non-trovata']],
  },
  'GET /api/mappe/esporta': {
    sommario: 'Pacchetto JSON delle mappe da scaricare: tutte o un luogo con le sue discendenti',
    descrizione: 'Mappe, spilli (con le schermate in base64) e immagini di base dell\'istanza in base64: è lo stesso formato che `POST /api/mappe/importa` accetta. Con `radice` solo quella mappa e le sue discendenti. `asset` (e `assetOriginale`, uguale) è l\'asset dichiarato dalla mappa se esiste, altrimenti null (L1: prima `mappe/<chiave>` per convenzione). Con la radice di un Palazzo nel pacchetto (L3, O3-1) `aree` e `legami` portano tutte le sue Aree, anche quelle senza planimetrie. La risposta ha `Content-Disposition: attachment` con il nome `mappe-<radice|tutte>.json`.',
    risposta: '`EsportazioneMappeDto`',
    senzaProva: 'Troppo pesante per essere mostrato in una pagina: con le immagini in base64 l\'esportazione di tutte le mappe supera i 10 MB. Prima di esportare assegna l\'uid agli spilli che non l\'hanno ancora (`assegnaUidMancanti`). Si scarica dall\'editor delle mappe (Esporta).',
    errori: [[404, 'mappa-non-trovata']],
  },
  'POST /api/mappe/importa': {
    sommario: 'Importa un pacchetto di mappe nel formato dell\'esportazione',
    descrizione: 'Il pacchetto deve avere `versione: 1`. Le mappe si abbinano per chiave: senza `sovrascrivi` quelle già presenti si saltano, come quelle con chiave o tipo non validi (elencate in `saltate`); con `sovrascrivi` mappe e spilli esistenti si sostituiscono. Il corpo può arrivare a 512 MB (la sola rotta: l\'esportazione completa, con le immagini, ne pesa un centinaio; O3-1 di L3). Origine e ultima modifica di mappe e pin sono quelle del pacchetto (difetto NR3-2 di L3: un esporta → importa lasciava «utente» anche ai pin del seed); un pacchetto che non le porta (di prima di L3) dà righe dell\'utente. Pin, pezzi e copie che tornano con lo stesso uid riprendono il loro id; se è preso da un\'altra riga ne hanno uno nuovo, i riferimenti li seguono per uid, e `idCambiati` li elenca (`{ tipo: pin | pezzo | copia, uid, prima, dopo }`, assente se vuoto). Un\'immagine identica byte per byte a quella già salvata (di una mappa, o di un pin che torna) non si riscrive: nome del file, data, versione e miniature restano (NR3-3). I pezzi delle planimetrie (`pezzi`, 102), ognuno con le sue `copie` (103; un pezzo della 102, con la posa accanto alla zona, si legge come un pezzo con una copia), di una mappa importata sostituiscono i suoi (un reseed del seed non li tocca; un pacchetto senza il campo li lascia com\'erano); si scrivono a immagini importate: le copie che escono dall\'immagine della mappa d\'arrivo si scartano (`copieScartate`), e con loro il pezzo con la zona fuori o rimasto senza copie (`pezziScartati`); tutti, se la mappa non ha un\'immagine. Un\'immagine importata diversa da quella che la mappa aveva toglie i pezzi ritagliati dalla vecchia, con le copie (se il pacchetto non ne porta di nuovi per quella mappa), contati in `pezziEliminati` (e le copie in `copieEliminate`); una identica li lascia. Le dimensioni di una mappa con un\'immagine importata sono quelle lette dall\'intestazione dell\'immagine, che vincono su quelle dichiarate dal pacchetto; se l\'intestazione non si legge (SVG) restano quelle del pacchetto. Condizioni che citano chiavi assenti dalla guida e voci della guida non ammesse si scartano e si contano; tutto avviene in una transazione.',
    risposta: '`{ mappe, spilli, pezzi, copie, pezziScartati, copieScartate, pezziEliminati, copieEliminate, immagini, saltate, condizioniScartate, vociScartate, idCambiati?, condizioniConvertite? }` (conteggi, chiavi saltate, id cambiati; L6: riferimenti ai nodi legacy manuale letti come avvisi nei pin e nelle copie effettivamente importati, senza il contenuto delle note)',
    errori: [[400, 'pacchetto-non-valido'], [400, 'destinazione-non-valida'], [404, 'destinazione-non-trovata'], [400, 'voce-non-valida'], [400, 'pezzi-non-validi']],
  },
  'GET /api/mappe/riferimenti': {
    sommario: 'Entità collegabili a uno spillo nell\'editor, per tipo e testo',
    descrizione: 'Cerca nel nome o nella chiave (senza distinzione di maiuscole) le entità del tipo indicato: mappe, negozi, punti della guida, luoghi, Confidenti, richieste, attività (fra i luoghi di tipo attività, servizio o scuola). Per le mappe ogni parola deve comparire nel nome con il percorso o nella chiave, accenti esclusi. Per un luogo (L5) `dettaglio` è il posto, «Quartiere › Area» (il solo quartiere se è da collocare). Al più `limite` risultati (30 se non indicato).',
    risposta: 'Elenco di `{ tipo, chiave, nome, dettaglio }`',
  },
  'PUT /api/mappe/ordine': {
    sommario: 'Riscrive l\'ordine delle mappe elencate (riordino per trascinamento)',
    descrizione: 'L\'elenco è il nuovo ordine. Le chiavi si raggruppano per il loro genitore effettivo e ogni gruppo di sorelle si rinumera da 0, con le elencate in testa e le altre in coda nell\'ordine che avevano, in una transazione. Con `genitore` le chiavi devono stare nel suo sottoalbero (lui escluso); `genitore: null` ammette qualunque mappa.',
    risposta: 'Elenco di `MappaRiassuntoDto` delle mappe rinumerate',
    errori: [[404, 'mappa-non-trovata'], [400, 'mappa-fuori-dal-genitore']],
  },
  'POST /api/mappe': {
    sommario: 'Crea una mappa dall\'editor',
    descrizione: 'La chiave si ricava dal nome, preceduta da quella del genitore salvo sotto una città; deve essere valida, non riservata a una rotta di `/api/mappe` e libera (409 se esiste). Una `chiave` richiesta diversa resta come alias. Senza `asset` si usa quello predefinito `mappe/<chiave>` solo se esiste nella grafica predefinita, altrimenti nessuno (L1: niente asset per convenzione che non c\'è); un `asset` indicato si conserva com\'è. Un\'infiltrazione si lega solo a una planimetria del suo Palazzo. Nel mondo (sotto Tokyo, un quartiere o una sua discendente) una mappa `luogo` o `area` è 409 `usa-aggiungi-area` (L2): le planimetrie del mondo nascono dentro un\'Area, con `/api/aree`. Lo stesso nei Palazzi (L3, R3-26): sotto `dungeon-<k>` o una sua discendente, di qualunque tipo, è 409 `usa-aggiungi-area` (si usa «Aggiungi area» o «Aggiungi planimetria», `/api/aree/dungeon/…`); i Memento no. Con un genitore, `passaggio` crea lo spillo di passaggio nel genitore verso la nuova mappa e `ritorno` quello inverso.',
    risposta: 'La mappa creata: `MappaDto`',
    errori: [[404, 'mappa-non-trovata'], [409, 'mappa-esistente'], [409, 'usa-aggiungi-area'], [400, 'chiave-riservata'], [400, 'chiave-non-valida'], [400, 'mappa-fuori-palazzo'], [400, 'area-inesistente'], [400, 'area-di-altro-palazzo']],
  },
  'GET /api/mappe/:chiave': {
    sommario: 'Dettaglio di una mappa con percorso, figli, spilli e arrivi',
    descrizione: 'La chiave può essere pubblica o interna. Gli spilli portano i dettagli delle entità collegate e, con `partita`, lo stato di quella partita e le condizioni valutate; `arrivi` sono gli spilli di altre mappe che portano qui; `pezzi` i pezzi della planimetria (102), ognuno con le sue `copie` (103), e con `partita` ogni copia con l\'esito delle sue condizioni. L\'URL dell\'immagine dell\'istanza è versionato con la data di caricamento. Da L4 §8.11 (NR4-1) `raccolto` è il segno del pin; un pin condiviso da rigenerabili di più infiltrazioni ha il segno per infiltrazione, letto in quella di contesto (`?infiltrazione=`, altrimenti quella in corso); i pin dei Palazzi portano `contestoInfiltrazione`, `daVerificare` e `statoProprio`, e le loro voci carattere, infiltrazione, «da verificare» e `avanzamento` (k/N: fatta quando lo sono tutti i suoi pin).',
    risposta: '`MappaDto`',
    errori: [[404, 'mappa-non-trovata'], [404, 'partita-non-trovata']],
  },
  'GET /api/mappe/:chiave/guida': {
    sommario: 'Le voci della guida che stanno sulla planimetria, per il visore',
    descrizione: 'L3 «planimetria della voce» (decisione dell\'utente), sola lettura. Una voce di un Palazzo sta sulla planimetria se ha almeno un pin su di lei, oppure se non ha pin e la sua planimetria è lei: l\'aggancio fatto a mano (`PUT /api/compendio/punti/:chiave` con `planimetria`), altrimenti la planimetria 1 della sua infiltrazione (l\'iniziale della prima Area toccata, o la predefinita della prima Area del Palazzo). Una voce spostata a mano compare dove l\'ha messa l\'utente anche se la sua infiltrazione non tocca la planimetria. Un Enigma compare se ci sta almeno uno dei suoi passi, e ogni passo segue la propria regola. Le voci sono raggruppate per infiltrazione (nell\'ordine) e poi per ordine, nella forma di `PuntoInteresseDto` con `planimetria`, i pin con `uid`, `mappa` e `nome` (per centrarli) e, con `partita`, lo stato di quella partita. Il client non filtra da sé. I Memento non hanno planimetrie.',
    risposta: '`GuidaDellaPlanimetriaDto`; dopo M7 le voci includono contenuto per chiave, con nomi correnti e quantità. Il testo dettagli.contenuto resta nota della guida, senza sincronizzazione con il legame o nuove regole di stato.',
    errori: [[404, 'mappa-non-trovata'], [404, 'partita-non-trovata']],
  },
  'PUT /api/mappe/:chiave': {
    sommario: 'Aggiorna una mappa dall\'editor: i campi assenti restano',
    descrizione: 'Il genitore non può essere la mappa stessa né una sua discendente. Una mappa senza Area di tipo `luogo` o `area` non entra nel mondo (spostata sotto Tokyo o un quartiere, o resa `luogo`/`area` lì): 409 `usa-aggiungi-area`, come la creazione (FUN2-8, R2-27); le generiche del mondo restano ammesse. Da L3 (R3-26, AP3-3) una mappa senza Area, di qualunque tipo, non si sposta sotto la radice di un Palazzo né sotto una sua discendente (409 `usa-aggiungi-area`): si aggiunge dalla scheda del Palazzo; i Memento non cambiano. Spostandola, le infiltrazioni sue e delle discendenti devono restare del Palazzo di arrivo. Salvare con il nome segna il nome come rivisto; se la mappa dava il titolo alla sua area, quel titolo si fissa prima del cambio. Riga e percorsi si scrivono in una transazione e la mappa diventa dell\'utente. L3: l\'`entita` ammessa è solo di tipo `area` (un\'infiltrazione) e si lega all\'**Area** della planimetria (`infiltrazione_area`, in aggiunta alle sue; 400 `planimetria-senza-area` se non ne ha una del Palazzo); le colonne `entita_*` e `mappa_entita` non esistono più (L11, B9), e `entita: null` non stacca le infiltrazioni (si tolgono con le rotte delle Aree o con `PUT /api/mappe/:chiave/aree`).',
    risposta: 'La mappa aggiornata: `MappaDto`',
    errori: [[404, 'mappa-non-trovata'], [400, 'genitore-non-valido'], [409, 'usa-aggiungi-area'], [400, 'mappa-fuori-palazzo'], [400, 'area-inesistente'], [400, 'area-di-altro-palazzo'], [400, 'planimetria-senza-area']],
  },
  'PUT /api/mappe/:chiave/aree': {
    sommario: 'Imposta l\'insieme delle infiltrazioni che toccano una planimetria (rotta vecchia)',
    descrizione: 'Rotta di prima di L3, riscritta sul modello nuovo: le infiltrazioni di una planimetria sono quelle della sua **Area**, quindi l\'insieme passato diventa quello dell\'Area (`infiltrazione_area`, come `PUT /api/aree/dungeon/:k/:slug/infiltrazioni`), per tutte le sue versioni; voci e pin non si toccano. Le infiltrazioni devono essere del Palazzo della planimetria; la mappa d\'insieme del Palazzo non ne accetta. Per le mappe senza Area (la radice di un Palazzo, i fogli dei Memento) non c\'è niente da scrivere: 409 `mappa-senza-area` (L11, B9). Il client nuovo usa le rotte delle Aree.',
    risposta: '`{ aree }`: le infiltrazioni legate in ordine di guida, ognuna `{ chiave, nome, ordine }`',
    errori: [[404, 'mappa-non-trovata'], [409, 'mappa-senza-area'], [400, 'mappa-fuori-palazzo'], [400, 'area-inesistente'], [400, 'area-di-altro-palazzo']],
  },
  'DELETE /api/mappe/:chiave': {
    sommario: 'Elimina una mappa con i suoi spilli',
    descrizione: 'In una transazione: le schermate dei suoi pin e la sua immagine di base (se non è anche la pianta di un quartiere o di un\'infiltrazione), gli spilli in cascata e i loro stati nelle partite; le mappe figlie diventano radici. La mappa va nel cestino con tutto quel che l\'eliminazione tocca (immagini comprese), e da lì si rimette (`/api/impostazioni/cestino`). Una planimetria di un\'Area (L2): l\'unica della sua Area è 409 `ultima-planimetria` (si elimina l\'Area); quella dell\'ingresso del quartiere è 409 `planimetria-d-ingresso` senza `?conferma=1` (l\'ingresso se ne va con lei); se era la predefinita lo diventa la versione successiva, e le versioni si ricompattano.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'mappa-non-trovata'], [409, 'ultima-planimetria'], [409, 'planimetria-d-ingresso']],
  },
  'PUT /api/mappe/:chiave/presentazione': {
    sommario: 'Raggruppamento di una planimetria: area a cui appartiene ed etichetta della versione (rotta vecchia)',
    descrizione: 'Rotta di prima di L3, riscritta sul modello nuovo per una planimetria con Area: `etichetta` è l\'etichetta della sua versione (`versione_etichetta`), `gruppoNome` il nome dell\'Area (come «Modifica area»), `gruppoId` (la chiave di un\'altra planimetria, pubblica o interna; da L11 non è più l\'id di un gruppo d\'immagini) sposta la versione nell\'Area di quella, `gruppoId: null` senza nome la rende un\'Area a sé (se l\'Area ha altre versioni). Per le mappe senza Area (la radice di un Palazzo, i fogli dei Memento) 409 `mappa-senza-area`: il gruppo d\'immagini non esiste più (L11, B9). Il nome della mappa non cambia; il client nuovo usa le rotte delle Aree.',
    risposta: 'La mappa aggiornata: `MappaDto`',
    errori: [[404, 'mappa-non-trovata'], [409, 'mappa-senza-area']],
  },
  'PUT /api/mappe/:chiave/stanza': {
    sommario: 'Fa entrare una planimetria nell\'area di un\'altra, o la rende un\'area a sé (rotta vecchia)',
    descrizione: 'Rotta di prima di L3, riscritta sul modello nuovo per una planimetria con Area: con `con` = un\'altra planimetria dello stesso Palazzo o quartiere, la versione va in fondo a quelle dell\'Area di quella («Sposta la versione in un\'altra area», `PUT /api/aree/colloca`); con `con: null` diventa un\'Area a sé chiamata `nome` (o con il suo nome; se è già sola, l\'Area prende quel nome). L\'unica versione di un\'Area che entra in un\'altra fonde le due senza chiedere conferma (il gesto di questa rotta era già esplicito), e la vecchia va comunque nel cestino coi suoi legami (L3 §3.6.1). L\'Area d\'arrivo, se aveva una planimetria sola, prende il nome `nome` come correzione («Ripristina» la riporta al seed), ma mai sopra un nome dato dall\'utente, che resta. Per le mappe senza Area (la radice di un Palazzo, i fogli dei Memento) 409 `mappa-senza-area` (L11, B9). Tutto in una transazione.',
    risposta: 'La mappa aggiornata: `MappaDto`',
    errori: [[404, 'mappa-non-trovata'], [409, 'mappa-senza-area'], [400, 'stanza-non-valida'], [400, 'stanza-di-altro-luogo']],
  },
  'PUT /api/mappe/:chiave/immagine': {
    sommario: 'Carica l\'immagine di base di una mappa (corpo grezzo image/*)',
    descrizione: 'Il file va inviato come corpo grezzo con `Content-Type` immagine (PNG, JPEG, WEBP, GIF o SVG). Si salva nell\'istanza nell\'ambito «mappa» con la chiave della mappa, sostituendo la precedente; larghezza e altezza si leggono dall\'intestazione quando possibile e si scrivono insieme all\'immagine. Una mappa con dei pezzi (102, ritagli in pixel dell\'immagine di prima) risponde 409 `mappa-con-pezzi` (`details.pezzi` = quanti, `details.copie` = quante copie posate, 103): con `?eliminaPezzi=1` l\'utente conferma e i pezzi se ne vanno, con le copie, con la sostituzione, nella stessa transazione (scelta dell\'utente del 2026-10-14).',
    risposta: 'La mappa aggiornata: `MappaDto`',
    corpoBinario: 'image/*',
    errori: [[404, 'mappa-non-trovata'], [400, 'immagine-vuota'], [400, 'formato-non-ammesso'], [400, 'immagine-troppo-grande'], [409, 'mappa-con-pezzi']],
  },
  'POST /api/mappe/:chiave/spilli': {
    sommario: 'Crea uno spillo su una mappa',
    descrizione: 'La categoria del tipo decide il resto: i consumabili sono collezionabili, gli spilli di città non hanno condizioni (salvo il Confidente, dal 2026-10-04), la destinazione vale solo per gli spostamenti e il riferimento deve essere di un tipo ammesso dalla categoria ed esistere. Un riferimento «punto» diventa la voce della guida del pin, con le regole del collegamento (voce non descrittiva, del Palazzo della planimetria). Le condizioni devono citare chiavi esistenti. Lo spillo nasce dell\'utente, in una transazione.',
    risposta: 'Lo spillo creato: `SpilloDto`',
    errori: [[404, 'mappa-non-trovata'], [400, 'riferimento-non-ammesso'], [404, 'riferimento-non-trovato'], [404, 'punto-non-trovato'], [400, 'punto-descrittivo'], [400, 'cattura-nel-compendio'], [400, 'pin-fuori-dal-palazzo'], [404, 'condizione-non-trovata'], [404, 'destinazione-non-trovata']],
  },
  'POST /api/mappe/:chiave/passaggi': {
    sommario: 'Crea uno spillo di passaggio verso un\'altra mappa in un punto libero',
    descrizione: 'Lo spillo prende il nome della destinazione e un punto libero scelto dal server: vicino al centro, o in basso al centro se la destinazione è il genitore (la via del ritorno). Poi lo si trascina dove sta davvero l\'ingresso. Una mappa non può avere un passaggio verso sé stessa; 409 se ha già uno spillo verso quella destinazione.',
    risposta: 'Lo spillo creato: `SpilloDto`',
    errori: [[404, 'mappa-non-trovata'], [400, 'passaggio-non-valido'], [409, 'passaggio-esistente']],
  },
  'PUT /api/mappe/spilli/:id': {
    sommario: 'Aggiorna uno spillo: i campi assenti restano',
    descrizione: 'Senza i campi CAS resta il comportamento storico: con `mappa` lo si sposta su un\'altra mappa; una scheda della guida senza mappa non accetta coordinate, mappa né destinazione. Su una planimetria un riferimento «punto» diventa una voce in più del pin (098), e spostando il pin le sue voci devono restare del Palazzo. Cambiando tipo, un riferimento non più ammesso dalla categoria cade. Le condizioni non possono far dipendere il pin da se stesso né chiudere un giro fra pin. Uno spillo della guida modificato diventa dell\'utente. Il ramo CAS richiede `{ riferimentoLuogo, revisioneRaccordoAttesa }`, token 64hex, e accetta soltanto il campo aggiuntivo opzionale areaLuogo; qualsiasi altro campo è rifiutato (400). Prima di ogni effetto, nella transazione del PUT, ricontrolla tutte le invarianti del GET e la stessa impronta, compreso il luogo target e, nel v2, il contesto dell’Area; una fotografia diversa è 409. Solo dopo modifica i due riferimenti e updated_at del pin, se necessari, e nel v2 la sola Area del luogo. Tutti gli altri dati raw, condizioni comprese, e i legami restano identici. riferimentoLuogo o areaLuogo senza token sono rifiutati; il riferimento storico continua a chiamarsi riferimento.',
    risposta: 'Lo spillo aggiornato: `SpilloDto`, o `SchedaContenutoGuidaDto` per una scheda della guida senza mappa. Nel ramo CAS è ammesso il solo campo aggiuntivo opzionale areaLuogo: per la proposta del venditore il riferimento e la sola colonna luogo.area_chiave vengono aggiornati nella stessa transazione, dopo tutte le guardie. Uno stato già corrispondente non riscrive timestamp. Ogni numero di righe modificate inatteso annulla l’intera operazione; nessuna successiva compensazione o spostamento del pin.',
    errori: [[404, 'spillo-non-trovato'], [400, 'contenuto-non-spaziale'], [400, 'riferimento-non-ammesso'], [404, 'riferimento-non-trovato'], [400, 'pin-fuori-dal-palazzo'], [404, 'condizione-non-trovata'], [400, 'condizione-su-se-stesso'], [400, 'condizioni-in-giro'], [400, 'raccordo-corpo-non-valido'], [409, 'raccordo-precondizione-cambiata'], [409, 'raccordo-pin-non-ammesso'], [409, 'raccordo-condizioni-non-ammesse'], [409, 'raccordo-luogo-non-ammesso'], [409, 'raccordo-formato-inatteso'], [409, 'raccordo-area-incompatibile']],
  },
  'GET /api/mappe/spilli/:id/voci-collegabili': {
    sommario: 'Le voci della guida che si possono collegare a uno spillo (editor delle mappe)',
    descrizione: 'Quelle del Palazzo della planimetria dello spillo che si segnano — non descrittive, non un Enigma coi suoi passi —, tranne quelle già sue, in ordine di guida. Uno spillo fuori dai Palazzi non ne ha. Si collegano e scollegano con `PUT`/`DELETE /api/compendio/punti/:chiave/pin/:spillo` (098: un pin può avere più voci).',
    risposta: 'Elenco di `VoceCollegabileDto`',
    errori: [[404, 'spillo-non-trovato']],
  },
  'POST /api/mappe/:chiave/pezzi': {
    sommario: 'Crea un pezzo della planimetria da una zona dell\'immagine, con la sua prima copia',
    descrizione: 'I pezzi (migrazione 102, 2026-10-14) sono zone rettangolari dell\'immagine scelte nell\'editor: la zona (`sorgente`, in pixel dell\'immagine) è sempre cancellata dall\'immagine di base. Dalla 103 (2026-10-15) il pezzo è il ritaglio e si posa in una o più copie: questa rotta crea il ritaglio con la prima copia (`copia`, facoltativa), della stessa dimensione della zona, posata in `posizione` (angolo in alto a sinistra dell\'ingombro; senza, dove stava la zona), specchiata (`specchio`, prima) e ruotata (`rotazione` 0/90/180/270 in senso orario, poi), con un\'`etichetta` facoltativa. Le condizioni della copia sono quelle dei pin (anche lo stato di un altro pin o di una voce della guida): con la partita la copia si vede quando valgono. Zona e ingombro devono stare nell\'immagine, le cui dimensioni sono quelle salvate o lette dall\'immagine mostrata. Senza nome il pezzo si chiama «Pezzo N»; nasce in fondo ai pezzi della mappa.',
    risposta: 'Il pezzo creato: `PezzoMappaDto` con `copie` (senza esito delle condizioni)',
    errori: [[404, 'mappa-non-trovata'], [409, 'mappa-senza-immagine'], [400, 'pezzo-fuori-immagine'], [400, 'condizione-non-valida'], [404, 'condizione-non-trovata']],
  },
  'DELETE /api/mappe/pezzi/:id': {
    sommario: 'Elimina un pezzo della planimetria con tutte le sue copie',
    descrizione: 'Se ne vanno il ritaglio e tutte le sue copie; la sua zona torna visibile nell\'immagine di base.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'pezzo-non-trovato']],
  },
  'POST /api/mappe/pezzi/:id/copie': {
    sommario: 'Aggiunge una copia di un pezzo della planimetria',
    descrizione: 'Richiesta dell\'utente del 2026-10-15 (migrazione 103): usare un pezzo già ritagliato più volte nella mappa. La copia è un\'altra posa dello stesso ritaglio, con `etichetta`, `posizione` (senza, sulla zona d\'origine), `rotazione`, `specchio`, condizioni (quelle dei pin) e `ordine` (senza, in fondo alle copie) propri. L\'ingombro deve stare nell\'immagine. Un pezzo ha al massimo 200 copie.',
    risposta: 'La copia creata: `CopiaPezzoDto` (senza esito delle condizioni)',
    errori: [[404, 'pezzo-non-trovato'], [409, 'mappa-senza-immagine'], [400, 'pezzo-fuori-immagine'], [400, 'troppe-copie'], [400, 'condizione-non-valida'], [404, 'condizione-non-trovata']],
  },
  'PUT /api/mappe/pezzi/copie/:id': {
    sommario: 'Corregge una copia di un pezzo della planimetria',
    descrizione: 'Si cambiano solo i campi inviati: etichetta (vuota = «Nome · copia N» nella vista), posizione, rotazione, specchio, condizioni (`null` le toglie), ordine. Con `nomePezzo` (non vuoto) si rinomina anche il ritaglio, nella stessa transazione. L\'ingombro si riverifica sull\'immagine.',
    risposta: 'La copia aggiornata: `CopiaPezzoDto` (senza esito delle condizioni)',
    errori: [[404, 'copia-non-trovata'], [409, 'mappa-senza-immagine'], [400, 'pezzo-fuori-immagine'], [400, 'condizione-non-valida'], [404, 'condizione-non-trovata']],
  },
  'DELETE /api/mappe/pezzi/copie/:id': {
    sommario: 'Elimina una copia di un pezzo della planimetria',
    descrizione: 'Scelta dell\'utente del 2026-10-15: eliminata l\'ultima copia se ne va anche il pezzo, e la sua zona torna visibile nell\'immagine di base.',
    risposta: '`{ pezzoEliminato }`: vero se con la copia se n\'è andato anche il pezzo',
    errori: [[404, 'copia-non-trovata']],
  },
  'DELETE /api/mappe/spilli/:id': {
    sommario: 'Elimina uno spillo',
    descrizione: 'Rimozione recuperabile nel Cestino, con radice UID originale, schermate e stati di tutte le partite. Corpo facoltativo strict `{spilloUid,revisioneRimozioneAttesa}` ottenuto dalla precondizione: entrambi obbligatori insieme. UID, fotografia RAW ed epoca del Cestino sono riletti nella stessa transazione IMMEDIATE prima di ogni effetto. Senza corpo o con `{}` resta il contratto legacy per ID, che non può attestare l’UID visto da un client precedente. Immagini condivise con altri pin bloccano il gesto singolo. Le eliminazioni aggregate conservano il loro solo registro esterno. Nessuna generazione o correzione di UID; collisioni o fotografie divergenti bloccano il ripristino.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'spillo-non-trovato'], [409, 'rimozione-pin-conflitto'], [409, 'rimozione-pin-immagini-condivise'], [409, 'cestino-pin-registro-incoerente']],
  },
  'GET /api/mappe/spilli/:id/precondizione-rimozione': {
    sommario: 'Fotografia per la rimozione recuperabile di un pin',
    descrizione: 'Lettura transazionale e Cache-Control no-store; query vuota strict. Restituisce identità e mappa pubblica, conteggi dei contenuti coinvolti e token volatile. Il CAS include RAW, BLOB e miniature, riferimenti entranti, stati e input del riallineamento quando necessario, oltre a epoca AUTOINCREMENT e radici UID nel Cestino: DELETE seguito da restore non riabilita il token precedente. Nessun RAW personale viene esposto e nessun dato viene modificato.',
    risposta: '`PrecondizioneRimozionePinDto` (shared/rimozionePin.ts)',
    errori: [[404, 'spillo-non-trovato'], [409, 'rimozione-pin-conflitto'], [409, 'rimozione-pin-immagini-condivise']],
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
