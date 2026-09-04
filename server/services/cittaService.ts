// ============================================================
// cittaService — quartieri di Tokyo e luoghi con ciò che offrono (Fase 8.1)
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import type { LuogoDto, QuartiereDettaglioDto, QuartiereRiassuntoDto } from '../../shared/types.js';

interface RigaQuartiere { chiave: string; ordine: number; nome: string; sblocco: string | null; descrizione: string; fonte: string }
interface RigaLuogo { chiave: string; quartiere_chiave: string; ordine: number; tipo: string; nome: string; cosa_offre: string; quando: string | null; giorni: string | null; sblocco: string | null; confidenti_json: string; attivita_json: string; negozio: string | null; piatti_json: string | null; note: string | null; fonte: string; verificato: number }

function luogoDto(r: RigaLuogo, nomiConfidenti: Map<string, string>): LuogoDto {
  const confidenti = (JSON.parse(r.confidenti_json) as string[]).map((c) => ({ chiave: c, nome: nomiConfidenti.get(c) ?? c }));
  return {
    chiave: r.chiave, ordine: r.ordine, tipo: r.tipo as LuogoDto['tipo'], nome: r.nome, cosaOffre: r.cosa_offre, quando: r.quando as LuogoDto['quando'], giorni: r.giorni, sblocco: r.sblocco,
    confidenti, attivita: JSON.parse(r.attivita_json) as string[], negozio: r.negozio, piatti: r.piatti_json ? (JSON.parse(r.piatti_json) as LuogoDto['piatti']) : null, note: r.note, fonte: r.fonte, verificato: r.verificato === 1,
  };
}

function nomiConfidenti(): Map<string, string> {
  return new Map((prepared('SELECT chiave, nome FROM confidente').all() as Array<{ chiave: string; nome: string }>).map((c) => [c.chiave, c.nome]));
}

/** Quartieri in ordine con conteggi dei luoghi. */
export function elencaQuartieri(): QuartiereRiassuntoDto[] {
  const righe = prepared(`SELECT q.*, (SELECT COUNT(*) FROM luogo l WHERE l.quartiere_chiave = q.chiave) AS luoghi, (SELECT COUNT(*) FROM luogo l WHERE l.quartiere_chiave = q.chiave AND l.verificato = 1) AS verificati
    FROM quartiere q ORDER BY q.ordine`).all() as Array<RigaQuartiere & { luoghi: number; verificati: number }>;
  return righe.map((q) => ({ chiave: q.chiave, nome: q.nome, sblocco: q.sblocco, descrizione: q.descrizione, luoghi: q.luoghi, verificati: q.verificati }));
}

/** Scheda di un quartiere con i luoghi. */
export function dettaglioQuartiere(chiave: string): QuartiereDettaglioDto {
  const q = prepared('SELECT * FROM quartiere WHERE chiave = ?').get(chiave) as RigaQuartiere | undefined;
  if (!q) throw httpErrors.notFound('quartiere-non-trovato', `Il quartiere '${chiave}' non esiste.`);
  const nomi = nomiConfidenti();
  const luoghi = (prepared('SELECT * FROM luogo WHERE quartiere_chiave = ? ORDER BY ordine').all(chiave) as RigaLuogo[]).map((r) => luogoDto(r, nomi));
  return { chiave: q.chiave, nome: q.nome, sblocco: q.sblocco, descrizione: q.descrizione, fonte: q.fonte, luoghi };
}
