// ============================================================
// descrizioni/aree — le rotte di /api/aree: le Aree del mondo (L2, migrazione 109) e dei Palazzi (L3, migrazione 110)
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

const AREA_NON_TROVATA = [404, 'area-non-trovata'] as const;
const QUARTIERE_NON_TROVATO = [404, 'quartiere-non-trovato'] as const;
const DUNGEON_NON_TROVATO = [404, 'dungeon-non-trovato'] as const;
const IMMAGINE = [[400, 'immagine-vuota'], [400, 'formato-non-ammesso'], [400, 'immagine-troppo-grande'], [413, 'corpo-troppo-grande']] as const;

/**
 * Le descrizioni delle rotte di `server/routes/aree.ts` (servizio `areeService`). Il contenitore è nel percorso (`:contenitore/:chiave`):
 * `citta`, con la chiave di un quartiere o `tokyo` per la città (le Aree che nessuna fonte colloca, come lo staff), e da L3 `dungeon`,
 * con la chiave di un Palazzo (i Memento non hanno Aree).
 */
export const DESCRIZIONI_AREE: DescrizioniArea = {
  'GET /api/aree/da-collocare': {
    sommario: 'Le planimetrie senza un’Area',
    descrizione: 'Le planimetrie (`luogo` o `area`) figlie di Tokyo o di un quartiere e, da L3, quelle figlie della radice di un Palazzo (Memento esclusi) che non appartengono a nessuna Area: dopo le migrazioni 109 e 110 nessuna, ma una mappa importata o tolta da un’Area finisce qui, e «Colloca» la assegna. In ordine di genitore e di mappa.',
    risposta: 'Elenco di `MappaDaCollocareDto`',
  },
  'PUT /api/aree/colloca': {
    sommario: 'Assegna una planimetria a un’Area esistente o nuova (nei Palazzi anche: sposta una versione)',
    descrizione: 'Corpo `{ mappa, quartiere? | dungeon?, area?, nuova?: { nome }, etichetta? }`: `quartiere` è la chiave del quartiere o `tokyo`, `dungeon` quella di un Palazzo (uno dei due); con `area` (slug) la planimetria va in coda alle versioni di quell’Area, con `nuova` diventa la prima di un’Area nuova (dell’utente, in fondo). Nel mondo: se la planimetria non è sotto la mappa del contenitore ci si sposta, e i percorsi si ricalcolano (il vecchio resta come alias); una planimetria che ha già un’Area è un 409. Nei Palazzi (L3) la planimetria deve essere del Palazzo, e se ha già un’Area è «Sposta la versione in un’altra area» (o «Rendila un’area a sé» con `nuova`): le versioni rimaste si ricompattano, la predefinita passa alla prima se era lei, le infiltrazioni che la aprivano la seguono; l’unica versione di un’Area che entra in un’altra fonde le due Aree (L3 §3.6.1): senza `?conferma=1` è un 409 `area-si-svuota` con il riepilogo (`details`: `{ area, arrivo, legami }`, slug delle due Aree e legami a infiltrazioni della vecchia) e nulla cambia; confermato, i legami della vecchia passano alla nuova al suo posto (stesso ordine e origine, la versione spostata da aprire; dove la nuova c’era già resta com’era) e la vecchia, vuota e senza planimetria predefinita, va nel cestino come `area-fisica` («fusa in «<area d’arrivo>»») con i suoi legami: rimessa, torna vuota coi legami di prima, e la versione resta dov’è. Con più versioni nessuna conferma. L’unica versione non si rende «un’area a sé» (lo è già: 400 `gia-area-a-se`).',
    risposta: '`AreaDettaglioDto` dell’Area che la riceve',
    errori: [[404, 'mappa-non-trovata'], QUARTIERE_NON_TROVATO, DUNGEON_NON_TROVATO, AREA_NON_TROVATA, [409, 'planimetria-gia-collocata'], [409, 'area-si-svuota'], [400, 'gia-area-a-se'], [400, 'colloca-non-valido'], [400, 'planimetria-di-un-altro-palazzo'], [400, 'nome-vuoto'], [400, 'slug-riservato']],
  },
  'GET /api/aree/:contenitore/:chiave': {
    sommario: 'Le Aree di un quartiere, della città o di un Palazzo',
    descrizione: 'Le Aree del contenitore nell’ordine dell’elenco (`ordine`, poi slug), con planimetrie, pin e versioni contati: con `citta/tokyo` le Aree agganciate alla città (come lo staff, da verificare), con `citta/<quartiere>` quelle del quartiere (le stesse della scheda del quartiere), con `dungeon/<palazzo>` quelle del Palazzo con le infiltrazioni che le toccano e la raccolta (con `?partita=` i presi).',
    risposta: 'Elenco di `AreaRiassuntoDto`',
    errori: [QUARTIERE_NON_TROVATO, DUNGEON_NON_TROVATO, [404, 'partita-non-trovata']],
  },
  'POST /api/aree/:contenitore/:chiave': {
    sommario: 'Crea un’Area con la sua prima planimetria',
    descrizione: 'Il corpo è l’immagine grezza della prima planimetria (`image/*`, 8 MB); in query `nome` (1–80), `x` e `y` (0–100, insieme) del punto sull’illustrazione del contenitore (solo nel mondo), `etichetta` della versione e — nei Palazzi — `infiltrazioni` (chiavi separate da virgola) da collegare. In una transazione: l’Area (dell’utente, in fondo al contenitore, slug dal nome con `-2`, `-3`… se preso; `ordine`, `da-collocare`, `nuova` sono riservati), la planimetria sotto la mappa del contenitore con l’immagine (ruolo dedotto dalla gerarchia; nei Palazzi di tipo `area`), col punto il pin di passaggio sull’illustrazione verso la planimetria, col nome dell’Area, e i legami con le infiltrazioni. Un errore non lascia niente.',
    risposta: '`AreaDettaglioDto` (201)',
    corpoBinario: 'image/*',
    errori: [QUARTIERE_NON_TROVATO, DUNGEON_NON_TROVATO, [400, 'nome-vuoto'], [400, 'slug-riservato'], [400, 'punto-non-ammesso'], [400, 'infiltrazioni-solo-nei-palazzi'], [404, 'area-non-trovata'], [409, 'area-di-un-altro-palazzo'], ...IMMAGINE],
  },
  'PUT /api/aree/:contenitore/:chiave/:slug/infiltrazioni': {
    sommario: 'Le infiltrazioni che toccano un’Area di un Palazzo (L3)',
    descrizione: 'Corpo `{ infiltrazioni: [...] }` (chiavi): l’insieme sostituisce quello di prima; i legami nuovi vanno in fondo a ogni infiltrazione, quelli che restano non cambiano. Un gesto solo, che non sposta voci né pin; lo stesso legame si scrive anche dall’infiltrazione (`PUT /api/compendio/aree/:chiave/aree-palazzo`).',
    risposta: '`AreaDettaglioDto` dell’Area',
    errori: [DUNGEON_NON_TROVATO, AREA_NON_TROVATA, [400, 'infiltrazioni-solo-nei-palazzi'], [409, 'area-di-un-altro-palazzo']],
  },
  'PUT /api/aree/:contenitore/:chiave/ordine': {
    sommario: 'Riordina le Aree di un quartiere (o della città)',
    descrizione: 'Corpo `{ slug: [...] }` con tutti gli slug delle Aree del contenitore, ognuno una volta: l’ordine diventa 100·i.',
    risposta: 'Elenco di `AreaRiassuntoDto` nel nuovo ordine',
    errori: [QUARTIERE_NON_TROVATO, [400, 'ordine-non-valido']],
  },
  'GET /api/aree/:contenitore/:chiave/:slug': {
    sommario: 'La pagina di un’Area',
    descrizione: 'Il riassunto dell’Area (contenitore, predefinita con la sua illustrazione, conteggi, pin di passaggio sull’illustrazione del contenitore, ingresso, origine, «modificata», «da verificare», casa), le versioni nell’ordine (immagine, etichetta, pin), gli elementi segnati sulle sue planimetrie (luoghi, negozi, attività, Confidenti, col nome del catalogo) e le vicine (dove portano i suoi passaggi, una volta per destinazione, con la loro casa). Con `?partita=` la partita deve esistere.',
    risposta: '`AreaDettaglioDto`',
    errori: [QUARTIERE_NON_TROVATO, AREA_NON_TROVATA, [404, 'partita-non-trovata']],
  },
  'PUT /api/aree/:contenitore/:chiave/:slug': {
    sommario: 'Corregge un’Area: nome, planimetria predefinita, «Tieni»',
    descrizione: 'Corpo `{ nome?, predefinita?, daVerificare?: false }`. Il nome cambia ma lo slug no (l’indirizzo resta), e il nome diventa «rivisto»; la predefinita (chiave pubblica) deve essere una sua versione; `daVerificare: false` è «Tieni» per un’Area da verificare. La prima correzione di un’Area della guida ne conserva i valori, che «Ripristina» rimette.',
    risposta: '`AreaDettaglioDto`',
    errori: [QUARTIERE_NON_TROVATO, AREA_NON_TROVATA, [400, 'nome-vuoto'], [400, 'planimetria-di-altra-area']],
  },
  'DELETE /api/aree/:contenitore/:chiave/:slug': {
    sommario: 'Elimina un’Area (nel cestino), con le sue planimetrie',
    descrizione: 'Con contenuti — pin sulle sue planimetrie, passaggi che portano alle sue planimetrie (dal quartiere o da altre mappe), l’ingresso del quartiere, elementi, nei Palazzi le infiltrazioni che la toccano — chiede conferma: 409 `area-con-contenuti` con `{ planimetrie, pin, passaggi, ingresso, elementi, pinConVoci, infiltrazioni }` (le voci della guida dei pin restano nelle loro infiltrazioni). Con `?conferma=1` (o senza contenuti) va nel cestino come `area-fisica`, con le planimetrie (gli stessi passi dell’eliminazione di una mappa), i passaggi che vi portavano, l’ingresso e i legami con le infiltrazioni; da Impostazioni › Cestino si rimette com’era. Per un’Area da verificare è «Rimuovi».',
    risposta: 'Nessun contenuto (204)',
    errori: [QUARTIERE_NON_TROVATO, DUNGEON_NON_TROVATO, AREA_NON_TROVATA, [409, 'area-con-contenuti']],
  },
  'POST /api/aree/:contenitore/:chiave/:slug/ripristina': {
    sommario: 'Rimette i valori della guida di un’Area corretta',
    descrizione: 'Nome e planimetria predefinita tornano quelli della guida (la predefinita, se è ancora una sua versione), e la copia si toglie. 409 se l’Area è dell’utente o non è stata corretta.',
    risposta: '`AreaDettaglioDto`',
    senzaCorpo: true,
    errori: [QUARTIERE_NON_TROVATO, AREA_NON_TROVATA, [409, 'area-dell-utente'], [409, 'area-non-modificata']],
  },
  'POST /api/aree/:contenitore/:chiave/:slug/planimetrie': {
    sommario: 'Aggiunge una planimetria (versione) a un’Area',
    descrizione: 'Il corpo è l’immagine grezza (`image/*`, 8 MB); in query `etichetta` e `predefinita=1`. La planimetria va in coda alle versioni, sotto la mappa del contenitore, col ruolo dedotto dalla gerarchia.',
    risposta: '`AreaDettaglioDto` (201)',
    corpoBinario: 'image/*',
    errori: [QUARTIERE_NON_TROVATO, AREA_NON_TROVATA, ...IMMAGINE],
  },
  'PUT /api/aree/:contenitore/:chiave/:slug/planimetrie': {
    sommario: 'Ordine ed etichette delle versioni di un’Area',
    descrizione: 'Corpo `{ ordine?: [...], etichette?: { <chiave pubblica>: testo | null } }`: `ordine` elenca tutte le sue planimetrie, ognuna una volta; un’etichetta vuota o null la toglie.',
    risposta: '`AreaDettaglioDto`',
    errori: [QUARTIERE_NON_TROVATO, AREA_NON_TROVATA, [400, 'ordine-non-valido'], [400, 'planimetria-di-altra-area']],
  },
};
