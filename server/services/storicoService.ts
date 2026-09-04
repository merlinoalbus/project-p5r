// ============================================================
// storicoService — registrazione e lettura degli eventi della partita (Fase 5.1)
// ============================================================

import { nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { t } from './traduzioniService.js';
import { ETICHETTE_EVENTO, TIPI_EVENTO, type TipoEvento } from '../../shared/eventi.js';
import type { EventoPartitaDto, StoricoDto } from '../../shared/types.js';

interface RigaEvento {
  id: number; partita_id: number; tipo: TipoEvento; titolo: string; dettaglio: string; dati_json: string; persona_id: number | null; created_at: string; persona_nome: string | null;
}

const SQL_EVENTO = 'SELECT e.*, p.nome AS persona_nome FROM evento_partita e LEFT JOIN persona p ON p.id = e.persona_id';

function eventoDto(r: RigaEvento): EventoPartitaDto {
  return {
    id: r.id, tipo: r.tipo, tipoNome: ETICHETTE_EVENTO[r.tipo]?.nome ?? r.tipo, gruppo: ETICHETTE_EVENTO[r.tipo]?.gruppo ?? 'partita',
    titolo: r.titolo, dettaglio: r.dettaglio, dati: JSON.parse(r.dati_json) as Record<string, unknown>,
    personaId: r.persona_id, personaNome: r.persona_nome, personaNomeIt: r.persona_nome ? t('persona', r.persona_nome) : null, createdAt: r.created_at,
  };
}

/**
 * Registra un evento. Va chiamata dentro la transazione della modifica che lo genera (stessa connessione),
 * così evento e modifica sono atomici. Non verifica l'esistenza della partita: lo fa il chiamante.
 */
export function registraEvento(partitaId: number, tipo: TipoEvento, titolo: string, dettaglio = '', dati: Record<string, unknown> = {}, personaId: number | null = null): number {
  const info = prepared('INSERT INTO evento_partita (partita_id, tipo, titolo, dettaglio, dati_json, persona_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(partitaId, tipo, titolo, dettaglio, JSON.stringify(dati), personaId, nowIso());
  return Number(info.lastInsertRowid);
}

export interface FiltroStorico {
  /** Numero massimo di eventi (default 50, massimo 200). */
  limite?: number;
  /** Solo eventi con id minore di questo (paginazione all'indietro). */
  prima?: number;
  /** Solo questi tipi. */
  tipi?: TipoEvento[];
  /** Solo eventi riferiti alla Persona. */
  personaId?: number;
}

/** Eventi della partita dal più recente, con cursore per la pagina successiva e totale del filtro. */
export function storico(partitaId: number, filtro: FiltroStorico = {}): StoricoDto {
  if (!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId)) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const limite = Math.min(200, Math.max(1, filtro.limite ?? 50));
  const condizioni = ['e.partita_id = ?'];
  const parametri: unknown[] = [partitaId];
  if (filtro.tipi && filtro.tipi.length > 0) {
    const tipi = filtro.tipi.filter((x) => (TIPI_EVENTO as readonly string[]).includes(x));
    if (tipi.length === 0) return { eventi: [], prossimo: null, totale: 0 };
    condizioni.push(`e.tipo IN (${tipi.map(() => '?').join(',')})`);
    parametri.push(...tipi);
  }
  if (filtro.personaId !== undefined) {
    condizioni.push('e.persona_id = ?');
    parametri.push(filtro.personaId);
  }
  const totale = (prepared(`SELECT COUNT(*) AS n FROM evento_partita e WHERE ${condizioni.join(' AND ')}`).get(...parametri) as { n: number }).n;
  if (filtro.prima !== undefined) {
    condizioni.push('e.id < ?');
    parametri.push(filtro.prima);
  }
  const righe = prepared(`${SQL_EVENTO} WHERE ${condizioni.join(' AND ')} ORDER BY e.id DESC LIMIT ?`).all(...parametri, limite + 1) as RigaEvento[];
  const pagina = righe.slice(0, limite);
  return { eventi: pagina.map(eventoDto), prossimo: righe.length > limite ? pagina[pagina.length - 1].id : null, totale };
}

/** Elimina una voce dello storico (correzione di un errore dell'utente). */
export function eliminaEvento(partitaId: number, eventoId: number): void {
  const info = prepared('DELETE FROM evento_partita WHERE id = ? AND partita_id = ?').run(eventoId, partitaId);
  if (info.changes === 0) throw httpErrors.notFound('evento-non-trovato', `L'evento ${eventoId} non esiste in questa partita.`);
}
