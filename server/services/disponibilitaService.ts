// ============================================================
// disponibilitaService — quando una cosa è davvero raggiungibile nella partita
// ============================================================
//
// Un solo valutatore per tutto: spilli, articoli, negozi, attività, libri, film, luoghi. Riceve
// condizioni **strutturate** (`shared/condizioniSpillo.ts`) e lo stato della partita, e risponde
// con un semaforo per condizione — verde, rosso, o grigio quando alla partita manca il dato (il
// giorno corrente non impostato, il boss non segnato) — e con uno stato complessivo:
// «bloccato» se una condizione è rossa, «ignoto» se resta del grigio, «disponibile» altrimenti.
//
// Qui non c'è nessuna lettura di prosa. C'era — un lettore di frasi con ventidue espressioni
// regolari — ed è stato tolto l'11 settembre 2026: le frasi si convertono una volta all'ingresso
// dei dati (`shared/migraCondizioni.ts`), e ciò che non si converte non è una condizione.
//
// L6 (§2): il valutatore è uno solo, `condizioni/valutatore.ts`, per tutti i tipi (anche quelli dei requisiti dei Confidenti); qui
// restano lo stato della partita che legge e i due modi di dire l'insieme (catalogo e pin), che lo chiamano.
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { leggiFattiPesca } from './pescaLetture.js';
import { dotiSociali, ranghiConfidenti } from './partiteService.js';
import { finestreDungeon, type FinestraDungeon } from './datiGuida.js';
import { statoPartitaSemafori, type StatoPartitaSemafori } from './semaforiService.js';
import { ARCHI_STORIA, ordineGioco, dataSbloccoQuartiere, type ContatoreChiave, type NomiCondizioni } from '../../shared/condizioniSpillo.js';
import { modelloAvanzamento, statiDellaPartita, statoDelPin, vociFatte, type ModelloAvanzamento, type StatiDellaPartita } from './mappe/statiGuida.js';
import { vociPersonaCatturate } from './catturePersona.js';
import { sessioniVideogioco } from './sessioniVideogioco.js';
import { leggiAcquistiPartita, chiaviArticoliOttenuti, spesaAcquistiPerNegozio } from './acquistiService.js';
import type { StatoAcquistiDto } from '../../shared/acquisti.js';
import type { pinCitato } from './condizioni/nomiCondizioni.js';
import type { RigaInvito } from './condizioni/condizioneEffettiva.js';
import { valutaInsieme, valutaInsiemeSpillo, type RequisitoDisponibilita } from './condizioni/valutatore.js';
import type { DisponibilitaDto, SemaforoRequisitoDto } from '../../shared/types.js';

export type { RequisitoDisponibilita };

/** Testo piatto: minuscolo, senza accenti, spazi normalizzati. */
function piatto(testo: string): string {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// l'ordine del calendario di gioco (aprile → marzo) e la lettura della data di sblocco dei quartieri stanno nel modulo condiviso
export { ordineGioco, dataSbloccoQuartiere };

export interface SbloccoQuartiere { nome: string; dal: string | null }

/** Stato della partita per la disponibilità: quello dei semafori dei Confidenti più tutto ciò che le condizioni chiedono. */
export interface StatoDisponibilita extends StatoPartitaSemafori {
  partitaId?: number;
  /** Fotografia della singola richiesta, condivisa con i reader dei listini; nessuna cache globale. */
  acquisti?: StatoAcquistiDto;
  articoliOttenuti: Set<string>;
  /** «libro/chiave», «film/chiave». */
  letture: Set<string>;
  contatori: Map<ContatoreChiave, number>;
  attivitaSvolte: Map<string, number>;
  /** Yen spesi in ciascun negozio: la somma dei prezzi degli articoli segnati come acquistati. */
  spesaPerNegozio: Map<string, number>;
  puntiNegozio: Map<string, number>;
  giornoSettimana: string | null;
  /** I quartieri con il nome e la data della guida (`sblocco_data`): la data vale solo per un quartiere senza condizione salvata
   *  (L6: la condizione del quartiere è `quartiere.condizioni_json`, con gli inviti). */
  sbloccoQuartieri: Map<string, SbloccoQuartiere>;
  /** L'arco della storia in cui si trova la partita, dalla data di gioco e dalle finestre dei Palazzi. */
  arcoCorrente: string | null;
  /** Gli uid dei pin segnati nella partita (raccolto, aperto, parlato, incontrato, azionato…), anche tramite la loro voce della guida: le condizioni
   *  «Pin di una mappa». Facoltativo per chi costruisce uno stato a mano (test): senza, nessun pin è segnato. */
  spilliSegnati?: Set<string>;
  /** I pin citati dalle condizioni già letti in questa richiesta (uid → pin, null se non c'è): una mappa valuta le stesse condizioni
   *  più volte (requisiti, presenza, stato di altri pin), e prima ogni valutazione rileggeva il pin (rilievo P6 della verifica). Lo
   *  stato vive una richiesta sola, quindi i pin letti sono sempre quelli di adesso. */
  pinCitati?: Map<string, ReturnType<typeof pinCitato>>;
  /** Le voci della guida segnate nella partita (Ottenute o Esaurite; non le descrittive) e le Persona dei Memento catturate,
   *  cioè registrate nel compendio (2026-10-12): le condizioni «Voce della guida» (2026-10-11). Facoltativo per chi costruisce
   *  uno stato a mano (test): senza, nessuna voce è segnata. */
  vociSegnate?: Set<string>;
  /** Le voci citate dalle condizioni già lette in questa richiesta (chiave → voce, null se non c'è), come `pinCitati`. */
  vociCitate?: Map<string, { nome: string; tipo: string; area_dedalo_chiave: string | null; persona_dei_memento: number } | null>;
  /** L6: gli inviti dei Confidenti (`confidente_invito`), letti la prima volta che una condizione li chiede. */
  inviti?: RigaInvito[];
  /** L6: gli esiti dei posti già valutati in questa richiesta («quartiere:harajuku», «luogo:harajuku/takenoko-street») e quelli in corso
   *  (un posto che cita sé stesso per una via è grigio, non un giro senza fine). */
  esitiPosti?: Map<string, SemaforoRequisitoDto['stato']>;
  postiInCorso?: Set<string>;
}

/** Ogni quartiere con il nome e la data di sblocco (`sblocco_data`, null se non ne ha una). */
export function sbloccoQuartieri(): Map<string, SbloccoQuartiere> {
  const righe = prepared('SELECT chiave, nome, sblocco_data FROM quartiere').all() as Array<{ chiave: string; nome: string; sblocco_data: string | null }>;
  return new Map(righe.map((q) => [q.chiave, { nome: q.nome, dal: q.sblocco_data }]));
}

/** L'arco raggiunto a una data: l'ultimo Palazzo la cui finestra è già cominciata; prima del primo si è comunque nel primo. */
export function arcoAllaData(dataGioco: string | null, finestre: ReadonlyMap<string, FinestraDungeon>): string | null {
  if (!dataGioco) return null;
  const oggi = ordineGioco(dataGioco);
  let arco: string = ARCHI_STORIA[0];
  for (const d of ARCHI_STORIA) {
    const f = finestre.get(d);
    if (f && ordineGioco(f.dal) <= oggi) arco = d;
  }
  return arco;
}

/** Il giorno della settimana di una data di gioco, in minuscolo senza accenti («lunedi»), o null se il calendario non lo dice. */
function giornoDellaSettimana(data: string | null): string | null {
  if (!data) return null;
  const g = (prepared('SELECT giorno_settimana FROM giorno_calendario WHERE data = ?').get(data) as { giorno_settimana: string | null } | undefined)?.giorno_settimana ?? null;
  return g ? piatto(g) : null;
}

/** Lo stato della partita che serve al valutatore: quello dei semafori (ranghi dei Confidenti, Doti, data di gioco…) più
 *  giorno della settimana normalizzato, contatori di film, videogiochi e libri completati (avanzamento al totale delle
 *  sessioni), articoli ottenuti, letture, volte delle attività, spesa e punti per negozio, sblocco dei quartieri, arco
 *  della storia e pin segnati. La memoria dei pin citati parte vuota: lo stato vale una richiesta sola. */
export function statoDisponibilitaPartita(partitaId: number): StatoDisponibilita {
  // i ranghi soli: prima si calcolavano i Confidenti interi (semafori e regali di tutti) per leggerne il rango (rilievo P1')
  const ranghi = ranghiConfidenti(partitaId);
  const doti = new Map(dotiSociali(partitaId).map((d) => [d.chiave, d.rango]));
  const st = statoPartitaSemafori(partitaId, ranghi, doti);
  // le voci della guida gestite: le leggono le condizioni «Voce della guida» e i pin segnati tramite le loro voci (una lettura sola)
  // più le Persona dei Memento catturate, cioè registrate nel compendio (2026-10-12, scelta dell'utente: «Leggono il compendio»).
  // L4 (R4-25, §8.11): con la regola unica — una voce con pin è gestita quando lo sono tutti i suoi pin; lo stato dei pin è quello di
  // `statoDelPin` (il loro segno)
  const m = modelloAvanzamento(getDb());
  const s = statiDellaPartita(getDb(), m, partitaId);
  const gestite = vociFatte(m, s);
  for (const voce of vociPersonaCatturate(partitaId)) gestite.add(voce);
  /** Il conteggio `n` della query, che riceve come unico parametro la partita. */
  const conta = (sql: string): number => (prepared(sql).get(partitaId) as { n: number }).n;
  const contatori = new Map<ContatoreChiave, number>([
    ['videogiochi-giocati', sessioniVideogioco(partitaId).giocate.size],
    ['film-con-una-visione', conta('SELECT COUNT(*) AS n FROM progresso_film_partita p JOIN film f ON f.chiave = p.film_chiave WHERE p.partita_id = ? AND p.avanzamento >= 1')],
    ['film-completati', conta('SELECT COUNT(*) AS n FROM progresso_film_partita p JOIN film f ON f.chiave = p.film_chiave WHERE p.partita_id = ? AND p.avanzamento >= f.sessioni')],
    ['videogiochi-completati', conta("SELECT COUNT(*) AS n FROM progresso_videogioco_partita p JOIN attivita a ON a.chiave = p.videogioco_chiave WHERE p.partita_id = ? AND a.tipo = 'videogioco' AND p.avanzamento >= a.sessioni")],
    ['libri-letti', conta('SELECT COUNT(*) AS n FROM progresso_libro_partita p JOIN libro l ON l.chiave = p.libro_chiave WHERE p.partita_id = ? AND p.avanzamento >= l.sessioni')],
  ]);
  const acquisti = leggiAcquistiPartita(partitaId);
  return {
    ...st, partitaId, acquisti,
    articoliOttenuti: chiaviArticoliOttenuti(partitaId, acquisti),
    letture: new Set((prepared('SELECT tipo, chiave FROM lettura_partita WHERE partita_id = ?').all(partitaId) as Array<{ tipo: string; chiave: string }>).map((a) => a.tipo + '/' + a.chiave)),
    contatori,
    attivitaSvolte: new Map((prepared('SELECT attivita_chiave, volte FROM attivita_svolta_partita WHERE partita_id = ?').all(partitaId) as Array<{ attivita_chiave: string; volte: number }>).map((r) => [r.attivita_chiave, r.volte])),
    spesaPerNegozio: spesaAcquistiPerNegozio(partitaId, acquisti),
    puntiNegozio: new Map((prepared('SELECT negozio_chiave, punti FROM punti_negozio_partita WHERE partita_id = ?').all(partitaId) as Array<{ negozio_chiave: string; punti: number }>).map((r) => [r.negozio_chiave, r.punti])),
    giornoSettimana: giornoDellaSettimana(st.dataGioco),
    sbloccoQuartieri: sbloccoQuartieri(),
    arcoCorrente: arcoAllaData(st.dataGioco, finestreDungeon()),
    spilliSegnati: spilliSegnati(m, s),
    pinCitati: new Map(),
    vociSegnate: gestite,
    vociCitate: new Map(),
  };
}

/** Lo stesso stato a un altro giorno di gioco (l'anteprima dell'editor, `POST /api/condizioni/valuta` con `giorno`): data, giorno della
 *  settimana e arco si ricalcolano, le memorie degli esiti ripartono vuote; tutto il resto della partita resta com'è. */
export function statoAlGiorno(st: StatoDisponibilita, giorno: string): StatoDisponibilita {
  return { ...st, dataGioco: giorno, fattiPesca: st.partitaId===undefined?undefined:new Map(leggiFattiPesca(st.partitaId,{giorno,fascia:st.fasciaGioco??'giorno',ordineVisita:Number.MAX_SAFE_INTEGER}).map(f=>[f.evento,f.valore])), giornoSettimana: giornoDellaSettimana(giorno), arcoCorrente: arcoAllaData(giorno, finestreDungeon()), esitiPosti: new Map(), postiInCorso: new Set() };
}

/** I pin segnati in una partita: la stessa regola del «raccolto» che il visore mostra (`mappeService.dettagliSpillo`), cioè lo stato del
 *  pin di L4 (`statoDelPin`: dalle voci che contano, il suo segno senza, la regola di prima per i dedali). Per i pin di rigenerabili
 *  di più infiltrazioni vale l'infiltrazione in corso. */
function spilliSegnati(m: ModelloAvanzamento, s: StatiDellaPartita): Set<string> {
  const segnati = new Set<string>();
  for (const [uid, id] of m.idDelPin) if (statoDelPin(m, s, { id, uid }).fatto) segnati.add(uid);
  return segnati;
}

/** Come sotto, ma per uno spillo: **solo la presenza nasconde**.
 *
 * Un requisito che non riguarda la presenza — una dote da alzare, un Confidente da portare a un
 * rango, una porta che vuole una chiave — non deve far sparire il pin: la cosa c'è, e la guida
 * serve proprio a dire dov'è prima che tu possa usarla. Resta scritto accanto al pin, e concorre
 * al massimo a un «ignoto».
 *
 * Il rosso di una condizione di presenza invece toglie il pin, ed è quello che si vuole: se il
 * quartiere apre a giugno, in aprile quel negozio non c'è, e mostrarlo manda il giocatore a
 * cercare una cosa che non esiste ancora. La regola sta nel valutatore (`valutaInsiemeSpillo`).
 */
export function valutaRequisitiSpillo(elenco: RequisitoDisponibilita[], st: StatoDisponibilita, nomi?: NomiCondizioni): DisponibilitaDto {
  return valutaInsiemeSpillo(elenco, st, nomi);
}

/** Disponibilità complessiva: «bloccato» con almeno un rosso, «ignoto» se resta del grigio, «disponibile» altrimenti (anche senza
 *  requisiti); un avviso non conta (`valutaInsieme`). */
export function valutaRequisiti(elenco: RequisitoDisponibilita[], st: StatoDisponibilita): DisponibilitaDto {
  return valutaInsieme(elenco, st);
}
