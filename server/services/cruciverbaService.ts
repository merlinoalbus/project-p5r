// ============================================================
// cruciverbaService — cruciverba di Leblanc: date, indizi, risposte e spunta per partita (Fase 7.5)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraEvento } from './storicoService.js';
import type { CruciverbaDto, CruciverbaTuttiDto } from '../../shared/types.js';

interface Riga { data: string; ordine: number; indizio: string; risposta: string; risposta_en: string | null; fonte: string }

const dto = (r: Riga, fatti: Set<string>): CruciverbaDto => ({ giorno: r.data, indizio: r.indizio, risposta: r.risposta, rispostaEn: r.risposta_en, fonte: r.fonte, fatto: fatti.has(r.data) });

function fattiPartita(partitaId: number | undefined): Set<string> {
  if (partitaId === undefined) return new Set();
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  return new Set((prepared('SELECT data FROM cruciverba_partita WHERE partita_id = ?').all(partitaId) as Array<{ data: string }>).map((r) => r.data));
}

/** Tutti i cruciverba in ordine di calendario; con partita, quelli già risolti. */
export function cruciverba(partitaId?: number): CruciverbaTuttiDto {
  const fatti = fattiPartita(partitaId);
  const lista = (prepared('SELECT * FROM cruciverba ORDER BY ordine').all() as Riga[]).map((r) => dto(r, fatti));
  return { cruciverba: lista, risolti: lista.filter((c) => c.fatto).length, totale: lista.length };
}

/** Segna (o toglie) un cruciverba risolto nella partita; evento alla prima spunta. */
export function impostaCruciverba(partitaId: number, data: string, fatto: boolean): CruciverbaDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const r = prepared('SELECT * FROM cruciverba WHERE data = ?').get(data) as Riga | undefined;
  if (!r) throw httpErrors.notFound('cruciverba-non-trovato', `Nessun cruciverba il ${data}.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    const era = !!prepared('SELECT 1 FROM cruciverba_partita WHERE partita_id = ? AND data = ?').get(partitaId, data);
    if (fatto) prepared('INSERT INTO cruciverba_partita (partita_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(partita_id, data) DO UPDATE SET updated_at = excluded.updated_at').run(partitaId, data, adesso);
    else prepared('DELETE FROM cruciverba_partita WHERE partita_id = ? AND data = ?').run(partitaId, data);
    if (fatto && !era) registraEvento(partitaId, 'cruciverba', `Cruciverba risolto: ${r.risposta}`, `${r.indizio} · Conoscenza +1 nota.`, { data });
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return dto(r, new Set(fatto ? [data] : []));
}
