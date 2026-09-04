// ============================================================
// completamentoService — trofei con stato per partita; finali, Covo dei Ladri, DLC, meteo, Nuova Partita+, gestione del tempo (Fase 9.1)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraEvento } from './storicoService.js';
import { datiGuida } from './richiesteService.js';
import type { CompletamentoDto, TrofeoDto } from '../../shared/types.js';

interface RigaTrofeo { chiave: string; ordine: number; nome: string; nome_en: string | null; tipo: TrofeoDto['tipo']; descrizione: string; come: string; mancabile: number | null; quando: string | null; fonte: string; verificato: number }
type SeedCompletamento = Omit<CompletamentoDto, 'trofei' | 'ottenuti'>;

const dto = (r: RigaTrofeo, ottenuti: Set<string>): TrofeoDto => ({ chiave: r.chiave, nome: r.nome, nomeEn: r.nome_en, tipo: r.tipo, descrizione: r.descrizione, come: r.come, mancabile: r.mancabile === null ? null : r.mancabile === 1, quando: r.quando, fonte: r.fonte, verificato: r.verificato === 1, ottenuto: ottenuti.has(r.chiave) });

function ottenutiPartita(partitaId: number | undefined): Set<string> {
  if (partitaId === undefined) return new Set();
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  return new Set((prepared('SELECT trofeo_chiave FROM trofeo_partita WHERE partita_id = ?').all(partitaId) as Array<{ trofeo_chiave: string }>).map((r) => r.trofeo_chiave));
}

/** Trofei (con ottenuti nella partita) e sezioni di consultazione della guida. */
export function completamento(partitaId?: number): CompletamentoDto {
  const seed = datiGuida<SeedCompletamento>('completamento');
  if (!seed) throw httpErrors.notFound('completamento-non-disponibile', 'I dati di completamento non sono caricati.');
  const ottenuti = ottenutiPartita(partitaId);
  const trofei = (prepared('SELECT * FROM trofeo ORDER BY ordine').all() as RigaTrofeo[]).map((r) => dto(r, ottenuti));
  return { ...seed, trofei, ottenuti: trofei.filter((t) => t.ottenuto).length };
}

/** Segna (o toglie) un trofeo come ottenuto nella partita; evento alla prima spunta. */
export function impostaTrofeo(partitaId: number, chiave: string, ottenuto: boolean): TrofeoDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const r = prepared('SELECT * FROM trofeo WHERE chiave = ?').get(chiave) as RigaTrofeo | undefined;
  if (!r) throw httpErrors.notFound('trofeo-non-trovato', `Il trofeo '${chiave}' non esiste.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    const era = !!prepared('SELECT 1 FROM trofeo_partita WHERE partita_id = ? AND trofeo_chiave = ?').get(partitaId, chiave);
    if (ottenuto) prepared('INSERT INTO trofeo_partita (partita_id, trofeo_chiave, updated_at) VALUES (?, ?, ?) ON CONFLICT(partita_id, trofeo_chiave) DO UPDATE SET updated_at = excluded.updated_at').run(partitaId, chiave, adesso);
    else prepared('DELETE FROM trofeo_partita WHERE partita_id = ? AND trofeo_chiave = ?').run(partitaId, chiave);
    if (ottenuto && !era) registraEvento(partitaId, 'trofeo', `Trofeo ottenuto: ${r.nome}`, `${r.tipo.charAt(0).toUpperCase() + r.tipo.slice(1)} · ${r.descrizione}`, { trofeo: chiave });
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return dto(r, new Set(ottenuto ? [chiave] : []));
}
