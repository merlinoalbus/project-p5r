// ============================================================
// piazzamentoEsamiService — dove ci si è piazzati agli esami, per partita (R9-08, G-016c / G-020)
// ============================================================
//
// Il moltiplicatore dell'esame sui punti dei sette Confidenti dipende dal piazzamento all'ultimo esame di cui sono usciti i risultati
// («primo» ×1,5, «primi 10» ×1,2, «altro» nessuno) e vale fino ai risultati dell'esame successivo. Il piazzamento si salva per partita ed esame in
// `utente.esame_piazzamento_partita` (migrazione utente 040); il calcolo dei punti lo legge da `piazzamentoCorrente`, non dal client.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { ordineGioco } from '../../shared/condizioniSpillo.js';
import type { PiazzamentoEsame } from '../../shared/puntiConfidenti.js';

export interface PiazzamentoEsameDto { esame: string; nome: string; dataRisultati: string | null; piazzamento: PiazzamentoEsame | null }

interface RigaEsame { chiave: string; nome: string; ordine: number; data_risultati: string | null }

/** I quattro esami con il piazzamento segnato nella partita (null dove non è stato segnato). */
export function piazzamentiDellaPartita(partitaId: number): PiazzamentoEsameDto[] {
  verificaPartita(partitaId);
  const segnati = new Map((prepared('SELECT esame_chiave, piazzamento FROM esame_piazzamento_partita WHERE partita_id = ?').all(partitaId) as Array<{ esame_chiave: string; piazzamento: PiazzamentoEsame }>)
    .map((r) => [r.esame_chiave, r.piazzamento]));
  return (prepared('SELECT chiave, nome, ordine, data_risultati FROM esame ORDER BY ordine').all() as RigaEsame[])
    .map((e) => ({ esame: e.chiave, nome: e.nome, dataRisultati: e.data_risultati, piazzamento: segnati.get(e.chiave) ?? null }));
}

/**
 * Il piazzamento che vale adesso nella partita: quello dell'ultimo esame i cui risultati sono già usciti alla data di gioco. Se per quell'esame
 * non è stato segnato niente, nessuno (non vale quello dell'esame precedente); senza data di gioco, nessuno.
 */
export function piazzamentoCorrente(partitaId: number): PiazzamentoEsame | null {
  const p = prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined;
  if (!p?.data_gioco) return null;
  const oggi = ordineGioco(p.data_gioco);
  const usciti = (prepared('SELECT chiave, nome, ordine, data_risultati FROM esame ORDER BY ordine').all() as RigaEsame[])
    .filter((e) => e.data_risultati !== null && ordineGioco(e.data_risultati) <= oggi);
  const ultimo = usciti[usciti.length - 1];
  if (!ultimo) return null;
  const r = prepared('SELECT piazzamento FROM esame_piazzamento_partita WHERE partita_id = ? AND esame_chiave = ?').get(partitaId, ultimo.chiave) as { piazzamento: PiazzamentoEsame } | undefined;
  return r?.piazzamento ?? null;
}

/** Segna (o, con null, toglie) il piazzamento di un esame nella partita. */
export function impostaPiazzamentoEsame(partitaId: number, esameChiave: string, piazzamento: PiazzamentoEsame | null): PiazzamentoEsameDto[] {
  verificaPartita(partitaId);
  if (!prepared('SELECT 1 FROM esame WHERE chiave = ?').get(esameChiave)) throw httpErrors.notFound('esame-non-trovato', `L’esame ${esameChiave} non esiste.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    if (piazzamento === null) prepared('DELETE FROM esame_piazzamento_partita WHERE partita_id = ? AND esame_chiave = ?').run(partitaId, esameChiave);
    else prepared(`INSERT INTO esame_piazzamento_partita (partita_id, esame_chiave, piazzamento, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(partita_id, esame_chiave) DO UPDATE SET piazzamento = excluded.piazzamento, updated_at = excluded.updated_at`).run(partitaId, esameChiave, piazzamento, adesso);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return piazzamentiDellaPartita(partitaId);
}
