// ============================================================
// richiesteService — Richieste dei Mementos con stato per partita e dati di Jose (Fase 7.2)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraEvento } from './storicoService.js';
import type { JoseDto, RichiestaDto, RichiesteDto, StatoRichiesta } from '../../shared/types.js';

interface RigaRichiesta { chiave: string; ordine: number; nome: string; committente: string; disponibile_dal: string; scadenza: string; area: string; area_chiave: string | null; piano: string; bersaglio_json: string; ricompense_json: string; confidente_chiave: string | null; confidente_rango: number | null; note: string; fonte: string; confidente_nome: string | null }

const SQL = 'SELECT r.*, c.nome AS confidente_nome FROM richiesta r LEFT JOIN confidente c ON c.chiave = r.confidente_chiave';

function dto(r: RigaRichiesta, stati: Map<string, StatoRichiesta>): RichiestaDto {
  return {
    chiave: r.chiave, nome: r.nome, committente: r.committente, disponibileDal: r.disponibile_dal, scadenza: r.scadenza, area: r.area, areaChiave: r.area_chiave, piano: r.piano,
    bersaglio: JSON.parse(r.bersaglio_json) as RichiestaDto['bersaglio'], ricompense: JSON.parse(r.ricompense_json) as string[],
    confidente: r.confidente_chiave ? { chiave: r.confidente_chiave, nome: r.confidente_nome ?? r.confidente_chiave, rango: r.confidente_rango } : null,
    note: r.note, fonte: r.fonte, stato: stati.get(r.chiave) ?? null,
  };
}

function statiPartita(partitaId: number | undefined): Map<string, StatoRichiesta> {
  if (partitaId === undefined) return new Map();
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  return new Map((prepared('SELECT richiesta_chiave, stato FROM richiesta_partita WHERE partita_id = ?').all(partitaId) as Array<{ richiesta_chiave: string; stato: StatoRichiesta }>).map((r) => [r.richiesta_chiave, r.stato]));
}

/** Dati della guida in JSON per chiave (es. «jose», «battaglia»). */
export function datiGuida<T>(chiave: string): T | null {
  const r = prepared('SELECT json FROM dati_guida WHERE chiave = ?').get(chiave) as { json: string } | undefined;
  return r ? (JSON.parse(r.json) as T) : null;
}

export function richieste(partitaId?: number): RichiesteDto {
  const stati = statiPartita(partitaId);
  const lista = (prepared(`${SQL} ORDER BY r.ordine`).all() as RigaRichiesta[]).map((r) => dto(r, stati));
  return { richieste: lista, jose: datiGuida<JoseDto>('jose'), completate: lista.filter((r) => r.stato === 'completata').length, totale: lista.length };
}

/** Stato di una Richiesta nella partita ('accettata', 'completata' o null per azzerare); evento al completamento. */
export function impostaStatoRichiesta(partitaId: number, chiave: string, stato: StatoRichiesta | null): RichiestaDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const r = prepared(`${SQL} WHERE r.chiave = ?`).get(chiave) as RigaRichiesta | undefined;
  if (!r) throw httpErrors.notFound('richiesta-non-trovata', `La Richiesta '${chiave}' non esiste.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    const prima = (prepared('SELECT stato FROM richiesta_partita WHERE partita_id = ? AND richiesta_chiave = ?').get(partitaId, chiave) as { stato: StatoRichiesta } | undefined)?.stato ?? null;
    if (stato === null) prepared('DELETE FROM richiesta_partita WHERE partita_id = ? AND richiesta_chiave = ?').run(partitaId, chiave);
    else prepared('INSERT INTO richiesta_partita (partita_id, richiesta_chiave, stato, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, richiesta_chiave) DO UPDATE SET stato = excluded.stato, updated_at = excluded.updated_at').run(partitaId, chiave, stato, adesso);
    if (stato === 'completata' && prima !== 'completata') {
      const b = JSON.parse(r.bersaglio_json) as { nome: string };
      registraEvento(partitaId, 'richiesta-completata', `Richiesta completata: ${r.nome}`, `${r.area}${r.piano ? ` (${r.piano})` : ''} · bersaglio ${b.nome}${r.confidente_nome ? ` · Confidente ${r.confidente_nome}` : ''}.`, { richiesta: chiave });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return dto(r, new Map(stato === null ? [] : [[chiave, stato]]));
}
