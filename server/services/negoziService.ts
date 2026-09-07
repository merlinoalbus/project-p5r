import { descriviRequisitoSpillo, leggiCondizioniSalvate } from '../../shared/condizioniSpillo.js';
// ============================================================
// negoziService — negozi e articoli (armi, protezioni, accessori, oggetti, regali, cibo) con ricerca e acquisti per partita (Fase 8.2)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { statoDisponibilitaPartita, valutaRequisiti, type StatoDisponibilita } from './disponibilitaService.js';
import { registraEvento } from './storicoService.js';
import type { ArticoloDto, NegozioDettaglioDto, NegozioRiassuntoDto, RicercaArticoliDto } from '../../shared/types.js';

interface RigaNegozio { condizioni_json: string | null; chiave: string; ordine: number; nome: string; luogo: string; luogo_chiave: string | null; tipo: string; gestore: string | null; confidente_chiave: string | null; orari: string | null; sblocco: string | null; note: string | null; fonte: string; confidente_nome?: string | null; quartiere_nome?: string | null; articoli?: number; verificati?: number }
interface RigaArticolo { condizioni_json: string | null; chiave: string; negozio_chiave: string; negozio_confidente?: string | null; negozio_condizioni?: string|null; ordine: number; nome: string; nome_it: string | null; categoria: string; per: string | null; prezzo: number | null; effetto: string | null; statistiche: string | null; disponibile_dal: string | null; condizione: string | null; nota: string | null; fonte: string; verificato: number; negozio_nome?: string }

const SQL_NEGOZIO = `SELECT n.*, c.nome AS confidente_nome, q.nome AS quartiere_nome,
  (SELECT COUNT(*) FROM articolo a WHERE a.negozio_chiave = n.chiave AND a.nascosto = 0) AS articoli, (SELECT COUNT(*) FROM articolo a WHERE a.negozio_chiave = n.chiave AND a.verificato = 1 AND a.nascosto = 0) AS verificati
  FROM negozio n LEFT JOIN confidente c ON c.chiave = n.confidente_chiave LEFT JOIN quartiere q ON q.chiave = n.luogo_chiave`;

function regole(json:string|null) { return leggiCondizioniSalvate(json).map(c=>({...c,testo:descriviRequisitoSpillo(c)})); }

function riassunto(r: RigaNegozio, st?: StatoDisponibilita): NegozioRiassuntoDto {
  return { condizioni:regole(r.condizioni_json), ...(st ? { disponibilita: valutaRequisiti(regole(r.condizioni_json), st) } : {}), chiave: r.chiave, nome: r.nome, luogo: r.luogo, luogoChiave: r.luogo_chiave, quartiereNome: r.quartiere_nome ?? null, tipo: r.tipo as NegozioRiassuntoDto['tipo'], gestore: r.gestore, confidente: r.confidente_chiave ? { chiave: r.confidente_chiave, nome: r.confidente_nome ?? r.confidente_chiave } : null, orari: r.orari, sblocco: r.sblocco, articoli: r.articoli ?? 0, verificati: r.verificati ?? 0 };
}

function disponibilitaArticolo(r:Pick<RigaArticolo, 'condizioni_json' | 'negozio_condizioni'>,st:StatoDisponibilita) {
  const negozio=regole(r.negozio_condizioni??null).map(c=>({...c,testo:'Negozio: '+c.testo}));
  return valutaRequisiti([...negozio,...regole(r.condizioni_json)],st);
}
function articoloDto(r: RigaArticolo, acquistati: Set<string>, st?: StatoDisponibilita): ArticoloDto {
  return { condizioni:regole(r.condizioni_json), chiave: r.chiave, negozioChiave: r.negozio_chiave, negozioNome: r.negozio_nome ?? '', nome: r.nome, nomeIt: r.nome_it, categoria: r.categoria as ArticoloDto['categoria'], per: r.per, prezzo: r.prezzo, effetto: r.effetto, statistiche: r.statistiche, disponibileDal: r.disponibile_dal, condizione: r.condizione, nota: r.nota, fonte: r.fonte, verificato: r.verificato === 1, acquistato: acquistati.has(r.chiave), ...(st ? { disponibilita: disponibilitaArticolo(r, st) } : {}) };
}

function acquistiPartita(partitaId: number | undefined): Set<string> {
  if (partitaId === undefined) return new Set();
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  return new Set((prepared('SELECT articolo_chiave FROM acquisto_partita WHERE partita_id = ?').all(partitaId) as Array<{ articolo_chiave: string }>).map((r) => r.articolo_chiave));
}

/** Negozi in ordine con conteggi canonici dell'intero catalogo.
 *
 * La disponibilita della partita descrive quando il punto e acquistabile/presente nel mondo,
 * non cancella la sua scheda editoriale. */
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
  const articoli = (prepared('SELECT a.*, n.nome AS negozio_nome, n.condizioni_json AS negozio_condizioni FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave WHERE a.nascosto = 0 AND a.negozio_chiave = ? ORDER BY a.ordine').all(chiave) as RigaArticolo[]).map((r) => articoloDto(r, acquistati, st));
  const conteggi = { articoli: n.articoli ?? 0, verificati: n.verificati ?? 0 };
  return { ...riepilogo, ...conteggi, note: n.note, fonte: n.fonte, articoliElenco: articoli, acquistati: articoli.filter((a) => a.acquistato).length };
}

/** Ricerca degli articoli in tutti i negozi per testo, categoria e destinatario (massimo 300 risultati). */
export function ricercaArticoli(filtro: { q?: string; categoria?: string; per?: string }, partitaId?: number): RicercaArticoliDto {
  const acquistati = acquistiPartita(partitaId);
  const st = partitaId === undefined ? undefined : statoDisponibilitaPartita(partitaId);
  const cond: string[] = ['a.nascosto = 0', 'n.nascosto = 0']; const par: unknown[] = [];
  if (filtro.q) { cond.push("(a.nome LIKE ? OR a.nome_it LIKE ? OR a.effetto LIKE ? OR n.nome LIKE ?)"); const like = `%${filtro.q}%`; par.push(like, like, like, like); }
  if (filtro.categoria) { cond.push('a.categoria = ?'); par.push(filtro.categoria); }
  if (filtro.per) { cond.push("(a.per = ? OR a.per = 'tutti')"); par.push(filtro.per); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const totaleCatalogo = (prepared(`SELECT COUNT(*) AS n FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave ${where}`).get(...par) as { n: number }).n;
  const righe = prepared(`SELECT a.*, n.nome AS negozio_nome, n.confidente_chiave AS negozio_confidente, n.condizioni_json AS negozio_condizioni FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave ${where} ORDER BY n.ordine, a.ordine LIMIT 300`).all(...par) as RigaArticolo[];
  // «Rango Confidente 3» senza nome è il Confidente del negozio: la ricerca deve valutarlo come la scheda
  const valutati = righe.map((r) => articoloDto(r, acquistati, st));
  return { articoli: valutati, totale: totaleCatalogo };
}

/** Segna (o toglie) un articolo come acquistato/ottenuto nella partita; evento alla prima spunta. */
export function impostaAcquisto(partitaId: number, articoloChiave: string, fatto: boolean): ArticoloDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const r = prepared('SELECT a.*, n.nome AS negozio_nome, n.condizioni_json AS negozio_condizioni FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave WHERE a.chiave = ?').get(articoloChiave) as RigaArticolo | undefined;
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
