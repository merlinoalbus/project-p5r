import { descriviRequisitoSpillo, leggiCondizioniSalvate, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
// ============================================================
// negoziService — negozi e articoli (armi, protezioni, accessori, oggetti, regali, cibo) con ricerca e acquisti per partita (Fase 8.2)
// ============================================================
//
// Dalla voce 4 del piano «struttura, non frasi» (2026-09-12) la disponibilità di un negozio è
// **solo i suoi orari** (`orari_json`, migrazione 069): un negozio che non è ancora aperto non è
// un posto che non c'è, e le condizioni di sblocco vivono sugli articoli (070). Il negozio ha una
// sede fra i luoghi della città (072) e, se ce l'ha, un programma punti dichiarato (076).
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { statoDisponibilitaPartita, valutaRequisiti, type StatoDisponibilita } from './disponibilitaService.js';
import { registraEvento } from './storicoService.js';
import { risolviOggettoCollegato } from './oggettiSelezionabili.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { descriviOrari, leggiOrari, orariComeCondizioni, type OrariNegozio } from '../../shared/orariNegozio.js';
import type { ArticoloDto, NegozioDettaglioDto, NegozioRiassuntoDto, RicercaArticoliDto } from '../../shared/types.js';

interface RigaNegozio { condizioni_json: string | null; orari_json: string | null; sede_chiave: string | null; sede_nome?: string | null; programma_punti_json: string | null; chiave: string; ordine: number; nome: string; luogo: string; luogo_chiave: string | null; tipo: string; gestore: string | null; confidente_chiave: string | null; orari: string | null; sblocco: string | null; note: string | null; fonte: string; confidente_nome?: string | null; quartiere_nome?: string | null; articoli?: number; verificati?: number }
interface RigaArticolo { condizioni_json: string | null; oggetto_fonte: string | null; oggetto_chiave: string | null; quantita: number | null; chiave: string; negozio_chiave: string; negozio_confidente?: string | null; negozio_orari?: string | null; ordine: number; nome: string; nome_it: string | null; categoria: string; per: string | null; prezzo: number | null; effetto: string | null; statistiche: string | null; disponibile_dal: string | null; condizione: string | null; nota: string | null; fonte: string; verificato: number; negozio_nome?: string }

const SQL_NEGOZIO = `SELECT n.*, c.nome AS confidente_nome, q.nome AS quartiere_nome, l.nome AS sede_nome,
  (SELECT COUNT(*) FROM articolo a WHERE a.negozio_chiave = n.chiave AND a.nascosto = 0) AS articoli, (SELECT COUNT(*) FROM articolo a WHERE a.negozio_chiave = n.chiave AND a.verificato = 1 AND a.nascosto = 0) AS verificati
  FROM negozio n LEFT JOIN confidente c ON c.chiave = n.confidente_chiave LEFT JOIN quartiere q ON q.chiave = n.luogo_chiave LEFT JOIN luogo l ON l.chiave = n.sede_chiave`;
const SQL_ARTICOLO = 'SELECT a.*, n.nome AS negozio_nome, n.confidente_chiave AS negozio_confidente, n.orari_json AS negozio_orari FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave';

// Il testo di una condizione si genera con i nomi della Guida, non con le chiavi: «Articolo ottenuto: Laptop rotto», non «yumenoshima/laptop-rotto».
function regole(json: string | null) { const nomi = nomiCondizioniMemo(); return leggiCondizioniSalvate(json).map((c) => ({ ...c, testo: descriviRequisitoSpillo(c, nomi) })); }
/** La presenza del negozio: i suoi orari, come condizioni che il valutatore sa leggere. */
function regoleOrari(orari: OrariNegozio) { return orariComeCondizioni(orari).map((c: RequisitoSpillo) => ({ ...c, testo: descriviRequisitoSpillo(c) })); }

/** Il programma punti di un negozio, dal JSON della riga (migrazione 076); null se assente o malformato. */
export function leggiProgrammaPunti(json: string | null): NegozioRiassuntoDto['programmaPunti'] {
  if (!json) return null;
  try {
    const p = JSON.parse(json) as { nome?: unknown; unita?: unknown; calcolo?: unknown };
    if (typeof p.nome !== 'string' || typeof p.unita !== 'string' || (p.calcolo !== 'manuale' && p.calcolo !== 'rango-cliente')) return null;
    return { nome: p.nome, unita: p.unita, calcolo: p.calcolo };
  } catch { return null; }
}

function riassunto(r: RigaNegozio, st?: StatoDisponibilita): NegozioRiassuntoDto {
  const orari = leggiOrari(r.orari_json);
  const condizioni = regoleOrari(orari);
  return {
    condizioni, ...(st ? { disponibilita: valutaRequisiti(condizioni, st) } : {}),
    chiave: r.chiave, nome: r.nome, luogo: r.luogo, luogoChiave: r.luogo_chiave, quartiereNome: r.quartiere_nome ?? null, tipo: r.tipo as NegozioRiassuntoDto['tipo'], gestore: r.gestore,
    confidente: r.confidente_chiave ? { chiave: r.confidente_chiave, nome: r.confidente_nome ?? r.confidente_chiave } : null,
    orari: r.orari, orariStrutturati: orari, orariTesto: descriviOrari(orari), sblocco: r.sblocco,
    sedeChiave: r.sede_chiave, sedeNome: r.sede_chiave ? (r.sede_nome ?? null) : null, programmaPunti: leggiProgrammaPunti(r.programma_punti_json),
    articoli: r.articoli ?? 0, verificati: r.verificati ?? 0,
  };
}

/** La disponibilita' di un articolo tiene conto anche di quella del negozio — a bottega chiusa non
 *  si compra niente — ma le due cose restano **distinguibili**: la presenza del negozio sono i suoi
 *  orari (marcati `daNegozio`), il resto è dell'articolo (compreso lo sblocco che era del negozio). */
function disponibilitaArticolo(r: Pick<RigaArticolo, 'condizioni_json' | 'negozio_orari'>, st: StatoDisponibilita) {
  const negozio = regoleOrari(leggiOrari(r.negozio_orari ?? null)).map((c) => ({ ...c, testo: 'Negozio: ' + c.testo }));
  const esito = valutaRequisiti([...negozio, ...regole(r.condizioni_json)], st);
  return { ...esito, requisiti: esito.requisiti.map((q, i) => (i < negozio.length ? { ...q, daNegozio: true } : q)) };
}
/** La riga del negozio, con quel che descrive l'oggetto **letto dall'oggetto**, non copiato.
 *
 * Un articolo collegato non ha una descrizione propria: nome, effetto, statistiche e «per chi»
 * vengono dall'oggetto a ogni lettura. Se il collegamento punta a qualcosa che non c'e' piu' si
 * torna a quel che la riga ha di suo, invece di mostrare una scheda vuota. */
function articoloDto(r: RigaArticolo, acquistati: Set<string>, st?: StatoDisponibilita): ArticoloDto {
  const collegato = risolviOggettoCollegato(r.oggetto_fonte, r.oggetto_chiave);
  return { condizioni: regole(r.condizioni_json), chiave: r.chiave, negozioChiave: r.negozio_chiave, negozioNome: r.negozio_nome ?? '',
    nome: collegato?.nome ?? r.nome, nomeIt: collegato?.nomeIt ?? r.nome_it,
    categoria: (collegato?.categoria ?? r.categoria) as ArticoloDto['categoria'],
    per: collegato?.per ?? r.per, prezzo: r.prezzo,
    effetto: collegato?.effetto ?? r.effetto, statistiche: collegato?.statistiche ?? r.statistiche,
    quantita: r.quantita, oggettoFonte: r.oggetto_fonte, oggettoChiave: r.oggetto_chiave,
    disponibileDal: r.disponibile_dal, condizione: r.condizione, nota: r.nota, fonte: r.fonte, verificato: r.verificato === 1, acquistato: acquistati.has(r.chiave), ...(st ? { disponibilita: disponibilitaArticolo(r, st) } : {}) };
}

function acquistiPartita(partitaId: number | undefined): Set<string> {
  if (partitaId === undefined) return new Set();
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  return new Set((prepared('SELECT articolo_chiave FROM acquisto_partita WHERE partita_id = ?').all(partitaId) as Array<{ articolo_chiave: string }>).map((r) => r.articolo_chiave));
}

/** Negozi in ordine con conteggi canonici dell'intero catalogo; con la partita, la presenza dagli orari. */
export function elencaNegozi(partitaId?: number): NegozioRiassuntoDto[] {
  const st = partitaId === undefined ? undefined : statoDisponibilitaPartita(partitaId);
  return (prepared(`${SQL_NEGOZIO} WHERE n.nascosto = 0 ORDER BY n.ordine`).all() as RigaNegozio[])
    .map((r) => riassunto(r, st));
}

/** Scheda di un negozio con gli articoli (acquistati nella partita, se indicata). */
export function dettaglioNegozio(chiave: string, partitaId?: number): NegozioDettaglioDto {
  const n = prepared(`${SQL_NEGOZIO} WHERE n.nascosto = 0 AND n.chiave = ?`).get(chiave) as RigaNegozio | undefined;
  if (!n) throw httpErrors.notFound('negozio-non-trovato', `Il negozio '${chiave}' non esiste.`);
  const acquistati = acquistiPartita(partitaId);
  const st = partitaId === undefined ? undefined : statoDisponibilitaPartita(partitaId);
  const riepilogo = riassunto(n, st);
  const articoli = (prepared(`${SQL_ARTICOLO} WHERE a.nascosto = 0 AND a.negozio_chiave = ? ORDER BY a.ordine`).all(chiave) as RigaArticolo[]).map((r) => articoloDto(r, acquistati, st));
  const conteggi = { articoli: n.articoli ?? 0, verificati: n.verificati ?? 0 };
  return { ...riepilogo, ...conteggi, note: n.note, fonte: n.fonte, articoliElenco: articoli, acquistati: articoli.filter((a) => a.acquistato).length };
}

export interface FiltroArticoli {
  q?: string;
  /** Una categoria sola (compatibilità) oppure più categorie insieme. */
  categoria?: string;
  categorie?: string[];
  per?: string;
  /** Con la partita: solo gli articoli già acquistati, o solo quelli ancora da acquistare. */
  stato?: 'acquistati' | 'da-acquistare';
  /** Con la partita: solo gli articoli disponibili adesso, o solo quelli bloccati. */
  disponibilita?: 'disponibili' | 'bloccati';
}

/** Ricerca degli articoli in tutti i negozi per testo, categorie e destinatario; con la partita anche per stato d'acquisto e disponibilità (massimo 300 risultati, totale calcolato prima del limite). */
export function ricercaArticoli(filtro: FiltroArticoli, partitaId?: number): RicercaArticoliDto {
  const acquistati = acquistiPartita(partitaId);
  const st = partitaId === undefined ? undefined : statoDisponibilitaPartita(partitaId);
  const cond: string[] = ['a.nascosto = 0', 'n.nascosto = 0']; const par: unknown[] = [];
  if (filtro.q) { cond.push('(a.nome LIKE ? OR a.nome_it LIKE ? OR a.effetto LIKE ? OR n.nome LIKE ?)'); const like = `%${filtro.q}%`; par.push(like, like, like, like); }
  const categorie = [...new Set([...(filtro.categorie ?? []), ...(filtro.categoria ? [filtro.categoria] : [])])];
  if (categorie.length) { cond.push(`a.categoria IN (${categorie.map(() => '?').join(',')})`); par.push(...categorie); }
  if (filtro.per) { cond.push("(a.per = ? OR a.per = 'tutti')"); par.push(filtro.per); }
  const righe = prepared(`${SQL_ARTICOLO} WHERE ${cond.join(' AND ')} ORDER BY n.ordine, a.ordine`).all(...par) as RigaArticolo[];
  // «Rango Confidente 3» senza nome è il Confidente del negozio: la ricerca deve valutarlo come la scheda.
  // Stato e disponibilità si filtrano dopo la valutazione: sono fatti della partita, non colonne.
  let valutati = righe.map((r) => articoloDto(r, acquistati, st));
  if (partitaId !== undefined && filtro.stato) valutati = valutati.filter((a) => (filtro.stato === 'acquistati' ? a.acquistato : !a.acquistato));
  if (partitaId !== undefined && filtro.disponibilita) valutati = valutati.filter((a) => (filtro.disponibilita === 'bloccati' ? a.disponibilita?.stato === 'bloccato' : a.disponibilita?.stato !== 'bloccato'));
  return { articoli: valutati.slice(0, 300), totale: valutati.length };
}

/** Segna (o toglie) un articolo come acquistato/ottenuto nella partita; evento alla prima spunta. */
export function impostaAcquisto(partitaId: number, articoloChiave: string, fatto: boolean): ArticoloDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const r = prepared(`${SQL_ARTICOLO} WHERE a.chiave = ?`).get(articoloChiave) as RigaArticolo | undefined;
  if (!r) throw httpErrors.notFound('articolo-non-trovato', `L'articolo '${articoloChiave}' non esiste.`);
  const st = statoDisponibilitaPartita(partitaId);
  if (fatto && disponibilitaArticolo(r, st).stato === 'bloccato') throw httpErrors.conflict('articolo-non-disponibile', `L'articolo '${articoloChiave}' non e disponibile nella partita corrente.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    const era = !!prepared('SELECT 1 FROM acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').get(partitaId, articoloChiave);
    if (fatto) prepared('INSERT INTO acquisto_partita (partita_id, articolo_chiave, updated_at) VALUES (?, ?, ?) ON CONFLICT(partita_id, articolo_chiave) DO UPDATE SET updated_at = excluded.updated_at').run(partitaId, articoloChiave, adesso);
    else prepared('DELETE FROM acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').run(partitaId, articoloChiave);
    if (fatto && !era) registraEvento(partitaId, 'acquisto', `Acquistato: ${r.nome_it ?? r.nome}`, `${r.negozio_nome ?? r.negozio_chiave}${r.prezzo !== null ? ` · ${r.prezzo.toLocaleString('it-IT')} ¥` : ''}${r.per ? ` · per ${r.per}` : ''}.`, { articolo: articoloChiave });
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return articoloDto(r, new Set(fatto ? [articoloChiave] : []), st);
}
