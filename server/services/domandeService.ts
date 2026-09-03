// ============================================================
// domandeService — domande in classe ed esami con tracking per partita (Fase 6.2)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraEvento } from './storicoService.js';
import { aggiornaDote } from './partiteService.js';
import type { DomandaDto, DomandeDto, EsameDto } from '../../shared/types.js';

interface RigaDomanda { id: number; ordine: number; data: string; tipo: DomandaDto['tipo']; chi: string; domanda: string; risposte_json: string; ricompensa: string; note: string; fonte: string }

/** Confronto fra date di gioco 'MM-GG' nell'anno scolastico (aprile → marzo): aprile=0 … marzo=11. */
export function indiceGiornoScolastico(data: string): number {
  const [m, g] = data.split('-').map(Number);
  if (!Number.isInteger(m) || !Number.isInteger(g)) return -1;
  const mese = (m - 4 + 12) % 12;
  return mese * 31 + g;
}

function domandaDto(r: RigaDomanda, fatte: Set<number>): DomandaDto {
  return { id: r.id, data: r.data, tipo: r.tipo, chi: r.chi, domanda: r.domanda, risposte: JSON.parse(r.risposte_json) as DomandaDto['risposte'], ricompensa: r.ricompensa, note: r.note, fonte: r.fonte, fatta: fatte.has(r.id) };
}

function esami(): EsameDto[] {
  return (prepared('SELECT chiave, nome, date_json, data_risultati, domande_json, note FROM esame ORDER BY ordine').all() as Array<{ chiave: string; nome: string; date_json: string; data_risultati: string | null; domande_json: string; note: string }>)
    .map((e) => ({ chiave: e.chiave, nome: e.nome, date: JSON.parse(e.date_json) as string[], dataRisultati: e.data_risultati, domande: JSON.parse(e.domande_json) as EsameDto['domande'], note: e.note }));
}

/** Tutte le domande in ordine di data, con lo stato «fatta» della partita (se indicata) e le prossime rispetto alla data di gioco. */
export function domande(partitaId?: number): DomandeDto {
  let fatte = new Set<number>();
  let dataGioco: string | null = null;
  if (partitaId !== undefined) {
    const p = prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined;
    if (!p) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
    dataGioco = p.data_gioco;
    fatte = new Set((prepared('SELECT domanda_id FROM domanda_partita WHERE partita_id = ?').all(partitaId) as Array<{ domanda_id: number }>).map((r) => r.domanda_id));
  }
  const righe = prepared('SELECT * FROM domanda ORDER BY ordine').all() as RigaDomanda[];
  const tutte = righe.map((r) => domandaDto(r, fatte));
  const oggi = dataGioco ? indiceGiornoScolastico(dataGioco) : null;
  const prossime = oggi === null ? [] : tutte.filter((d) => !d.fatta && indiceGiornoScolastico(d.data) >= oggi).slice(0, 5);
  const premi = prepared("SELECT json FROM esame_premi WHERE chiave = 'premi'").get() as { json: string } | undefined;
  return { domande: tutte, esami: esami(), premi: premi ? (JSON.parse(premi.json) as DomandeDto['premi']) : null, dataGioco, prossime, fatte: fatte.size, totale: tutte.length };
}

/** Segna una domanda come fatta (o no); con `conoscenza` aggiunge una nota alla Dote Conoscenza e registra l'evento. */
export function impostaDomandaFatta(partitaId: number, domandaId: number, fatta: boolean, conoscenza: boolean): DomandeDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const d = prepared('SELECT * FROM domanda WHERE id = ?').get(domandaId) as RigaDomanda | undefined;
  if (!d) throw httpErrors.notFound('domanda-non-trovata', `La domanda ${domandaId} non esiste.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    if (fatta) {
      const info = prepared('INSERT OR IGNORE INTO domanda_partita (partita_id, domanda_id, fatta_at) VALUES (?, ?, ?)').run(partitaId, domandaId, adesso);
      if (info.changes > 0) {
        if (conoscenza) aggiornaDote(partitaId, 'conoscenza', { note: 1 });
        registraEvento(partitaId, 'domanda-risposta', `Domanda del ${d.data} (${d.chi || d.tipo}) risposta`, `${d.domanda}${conoscenza ? ' · Conoscenza +1 nota' : ''}`, { domandaId, conoscenza });
      }
    } else {
      prepared('DELETE FROM domanda_partita WHERE partita_id = ? AND domanda_id = ?').run(partitaId, domandaId);
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return domande(partitaId);
}
