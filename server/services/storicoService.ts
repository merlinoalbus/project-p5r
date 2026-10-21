// ============================================================
// storicoService — registrazione e lettura degli eventi della partita (Fase 5.1)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { t } from './traduzioniService.js';
import { ETICHETTE_EVENTO, TIPI_EVENTO, type TipoEvento } from '../../shared/eventi.js';
import type { EventoPartitaDto, StoricoDto } from '../../shared/types.js';

interface RigaEvento {
  id: number; partita_id: number; tipo: TipoEvento; titolo: string; dettaglio: string; dati_json: string; persona_id: number | null; created_at: string; persona_nome: string | null;
}

const SQL_EVENTO = 'SELECT e.*, p.nome AS persona_nome FROM evento_partita e LEFT JOIN persona p ON p.id = e.persona_id';

/** Un evento come DTO: nome e gruppo del tipo dalle etichette (il tipo stesso e «partita» se il tipo non è noto), dati dal
 *  JSON, Persona collegata con il nome tradotto. */
function eventoDto(r: RigaEvento): EventoPartitaDto {
  const dati = JSON.parse(r.dati_json) as Record<string, unknown>;
  const riferimenti = dati && typeof dati === 'object' && !Array.isArray(dati) ? dati : {};
  const uid = (x: unknown): string | null => typeof x === 'string' && /^[0-9a-f]{32}$/.test(x) ? x : null;
  const acquistoId = uid(riferimenti.acquistoId), fonteId = uid(riferimenti.provenienzaId);
  const acquistoRegistrato = acquistoId ? { id: acquistoId, fonteId, operazioneId: uid(riferimenti.operazioneId),
    presente: !!prepared('SELECT 1 FROM utente.acquisto_registrato WHERE partita_id=? AND id=?').get(r.partita_id, acquistoId),
    fontePresente: fonteId === null ? null : !!prepared('SELECT 1 FROM utente.acquisto_provenienza WHERE partita_id=? AND acquisto_id=? AND id=?').get(r.partita_id, acquistoId, fonteId) } : undefined;
  return {
    id: r.id, tipo: r.tipo, tipoNome: ETICHETTE_EVENTO[r.tipo]?.nome ?? r.tipo, gruppo: ETICHETTE_EVENTO[r.tipo]?.gruppo ?? 'partita',
    titolo: r.titolo, dettaglio: r.dettaglio, dati, ...(acquistoRegistrato ? { acquistoRegistrato } : {}),
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

type AzioneEventoAcquistoV1 = 'registra' | 'annulla-fonte' | 'rimuovi-legacy';
const oggetto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const eUid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{32}$/.test(v);
const conflittoEvento = () => httpErrors.conflict('evento-acquisto-incoerente', 'L’evento, la fonte e la ricevuta di acquisto non coincidono: intera operazione annullata, dati conservati.');
function oggettoEvento(raw: string): Record<string, unknown> {
  let v: unknown;
  try { v = JSON.parse(raw) as unknown; } catch { throw conflittoEvento(); }
  if (!oggetto(v)) throw conflittoEvento();
  return v;
}

/** Il marker appartiene soltanto ai nuovi eventi I71: nessun evento storico viene riclassificato. */
export function azioneEventoAcquistoV1(raw: unknown): AzioneEventoAcquistoV1 | null {
  if (typeof raw !== 'string') return null;
  let v: unknown;
  try { v = JSON.parse(raw) as unknown; } catch { return null; }
  if (!oggetto(v) || !Object.hasOwn(v, 'acquistoV1')) return null;
  const m = v.acquistoV1;
  if (!oggetto(m) || Object.keys(m).length !== 2 || m.formato !== 1 || typeof m.azione !== 'string'
    || !['registra', 'annulla-fonte', 'rimuovi-legacy'].includes(m.azione)) throw conflittoEvento();
  return m.azione as AzioneEventoAcquistoV1;
}

/** Toglie soltanto gli eventi della fonte posseduta, nella stessa TX; il cestino fotografa i DELETE. */
export function annullaEventiFonteAcquistoNellaTransazione(partitaId: number, provenienzaId: string): void {
  const db = getDb();
  if (!db.inTransaction) throw new Error('L’annullamento degli eventi di acquisto richiede la transazione della fonte.');
  if (!Number.isSafeInteger(partitaId) || partitaId < 1 || !eUid(provenienzaId)) throw conflittoEvento();
  const f = db.prepare(`SELECT f.*, a.articolo_chiave AS acquisto_articolo FROM utente.acquisto_provenienza f
    JOIN utente.acquisto_registrato a ON a.partita_id=f.partita_id AND a.id=f.acquisto_id
    WHERE f.partita_id=? AND f.id=?`).get(partitaId, provenienzaId) as {
      acquisto_id: string; tipo: string; voce_uid: string | null; effetto_uid: string | null; fonte_json: string; acquisto_articolo: string;
    } | undefined;
  if (!f || !eUid(f.acquisto_id) || !['manuale', 'diario'].includes(f.tipo)) throw conflittoEvento();
  const fonte = oggettoEvento(f.fonte_json);
  const coincideFonte = (v: unknown): boolean => oggetto(v) && (f.tipo === 'manuale'
    ? Object.keys(v).length === 1 && v.tipo === 'manuale' && f.voce_uid === null && f.effetto_uid === null
    : Object.keys(v).length === 3 && v.tipo === 'diario' && eUid(f.voce_uid) && eUid(f.effetto_uid)
      && v.voceUid === f.voce_uid && v.effettoUid === f.effetto_uid);
  if (!coincideFonte(fonte)) throw conflittoEvento();
  const eventi = db.prepare(`SELECT id, dati_json FROM utente.evento_partita WHERE partita_id=? AND tipo='acquisto'
    AND CASE WHEN json_valid(dati_json) THEN json_type(dati_json,'$.acquistoV1') IS NOT NULL
      AND json_extract(dati_json,'$.provenienzaId')=? ELSE 0 END`).all(partitaId, provenienzaId) as Array<{ id: number; dati_json: string }>;
  for (const e of eventi) {
    if (azioneEventoAcquistoV1(e.dati_json) !== 'registra') continue;
    const d = oggettoEvento(e.dati_json);
    if (!eUid(d.operazioneId) || d.acquistoId !== f.acquisto_id || d.provenienzaId !== provenienzaId
      || Object.keys(d).some(k => !['operazioneId', 'acquistoId', 'provenienzaId', 'voceUid', 'effettoUid', 'acquistoV1'].includes(k))
      || (f.tipo === 'diario' ? d.voceUid !== f.voce_uid || d.effettoUid !== f.effetto_uid : 'voceUid' in d || 'effettoUid' in d)) throw conflittoEvento();
    const op = db.prepare('SELECT azione,payload_json,ricevuta_json FROM utente.acquisto_operazione WHERE partita_id=? AND operazione_id=?')
      .get(partitaId, d.operazioneId) as { azione: string; payload_json: string; ricevuta_json: string } | undefined;
    if (!op || op.azione !== 'registra') throw conflittoEvento();
    const richiesta = oggettoEvento(op.payload_json), ricevuta = oggettoEvento(op.ricevuta_json);
    const scelta = richiesta.scelta;
    if (!oggetto(scelta) || !(scelta.tipo === 'nuova' && Object.keys(scelta).length === 1
      || scelta.tipo === 'collega' && Object.keys(scelta).length === 2 && scelta.acquistoId === f.acquisto_id)) throw conflittoEvento();
    if (!coincideFonte(richiesta.fonte) || richiesta.operazioneId !== d.operazioneId || richiesta.articolo !== f.acquisto_articolo
      || Object.keys(ricevuta).length !== 7 || Object.keys(ricevuta).some(k => !['operazioneId', 'esito', 'partitaId', 'acquistoId', 'provenienzaId', 'articolo', 'creataIl'].includes(k))
      || ricevuta.operazioneId !== d.operazioneId || ricevuta.partitaId !== partitaId || ricevuta.acquistoId !== f.acquisto_id
      || ricevuta.provenienzaId !== provenienzaId || ricevuta.articolo !== f.acquisto_articolo || typeof ricevuta.creataIl !== 'string' || !ricevuta.creataIl.length
      || typeof ricevuta.esito !== 'string' || !['registrata', 'fonte-collegata', 'gia-collegata'].includes(ricevuta.esito)) throw conflittoEvento();
    if (db.prepare('DELETE FROM utente.evento_partita WHERE id=? AND partita_id=? AND dati_json IS ?').run(e.id, partitaId, e.dati_json).changes !== 1) throw conflittoEvento();
  }
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
  verificaPartita(partitaId);
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

/** Elimina più voci dello storico in una transazione; restituisce quante ne ha trovate ed eliminate. */
export function eliminaEventi(partitaId: number, ids: number[]): number {
  const unici = [...new Set(ids)];
  let eliminati = 0;
  const db = getDb();
  db.transaction(() => {
    for (const id of unici) eliminati += prepared('DELETE FROM evento_partita WHERE id = ? AND partita_id = ?').run(id, partitaId).changes;
  })();
  return eliminati;
}

/** Elimina una voce dello storico della partita (correzione di un errore dell'utente); 404 se non c'era. */
export function eliminaEvento(partitaId: number, eventoId: number): void {
  const info = prepared('DELETE FROM evento_partita WHERE id = ? AND partita_id = ?').run(eventoId, partitaId);
  if (info.changes === 0) throw httpErrors.notFound('evento-non-trovato', `L'evento ${eventoId} non esiste in questa partita.`);
}
