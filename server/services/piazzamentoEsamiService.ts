// ============================================================
// piazzamentoEsamiService — dove ci si è piazzati agli esami, per partita (R9-08, G-016c / G-020)
// ============================================================
//
// Il moltiplicatore dell'esame sui punti dei sette Confidenti dipende dal piazzamento all'ultimo esame di cui sono usciti i risultati
// («primo» ×1,5, «primi 10» ×1,2, «sopra la media» e «altro» nessuno) e vale fino ai risultati dell'esame successivo. Il piazzamento si salva per
// partita ed esame in `utente.esame_piazzamento_partita` (migrazioni utente 040 e 057); il calcolo dei punti lo legge da `piazzamentoCorrente`, non
// dal client. L13 (ondata 7, O7-2): la stessa riga la scrive anche la spunta della voce con l'effetto «esame» (con il «prima» nella ricevuta),
// che dà le Doti del premio del piazzamento (`esame.premi_json`, `premiDellEsame`).
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { ordineGioco } from '../../shared/condizioniSpillo.js';
import { leggiPremiEsame, leggiRequisitoConoscenza, type PiazzamentoEsame, type PiazzamentoEsameDto, type PremioPiazzamentoEsame, type RequisitoConoscenzaEsame } from '../../shared/puntiConfidenti.js';
import { eDote } from '../../shared/doti.js';
import { impostaTrofeo } from './completamentoService.js';

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
  return esameCorrente(partitaId)?.piazzamento ?? null;
}

/** L'esame che vale adesso (l'ultimo con i risultati già usciti alla data di gioco) col piazzamento segnato; null prima del primo esame o senza data di gioco. */
export function esameCorrente(partitaId: number): PiazzamentoEsameDto | null {
  const p = prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined;
  if (!p?.data_gioco) return null;
  const oggi = ordineGioco(p.data_gioco);
  const usciti = (prepared('SELECT chiave, nome, ordine, data_risultati FROM esame ORDER BY ordine').all() as RigaEsame[])
    .filter((e) => e.data_risultati !== null && ordineGioco(e.data_risultati) <= oggi);
  const ultimo = usciti[usciti.length - 1];
  if (!ultimo) return null;
  const r = prepared('SELECT piazzamento FROM esame_piazzamento_partita WHERE partita_id = ? AND esame_chiave = ?').get(partitaId, ultimo.chiave) as { piazzamento: PiazzamentoEsame } | undefined;
  return { esame: ultimo.chiave, nome: ultimo.nome, dataRisultati: ultimo.data_risultati, piazzamento: r?.piazzamento ?? null };
}

/**
 * L13 (ondata 7, O7-2): un esame con i suoi premi per piazzamento (`esame.premi_json`, la fonte unica) e il requisito di Conoscenza per il primo
 * posto; null se l'esame non c'è. `SELECT *`: su uno schema di prima della 311 le colonne non ci sono e l'esame non dichiara premi.
 */
export function premiDellEsame(chiave: string): { chiave: string; nome: string; premi: PremioPiazzamentoEsame[]; requisito: RequisitoConoscenzaEsame | null } | null {
  const r = prepared('SELECT * FROM esame WHERE chiave = ?').get(chiave) as { chiave: string; nome: string; premi_json?: string | null; requisito_conoscenza?: string | null } | undefined;
  return r ? { chiave: r.chiave, nome: r.nome, premi: leggiPremiEsame(r.premi_json, eDote) ?? [], requisito: leggiRequisitoConoscenza(r.requisito_conoscenza) } : null;
}

/** Il premio di quel piazzamento all'esame (nessuno: Doti vuote, nessun trofeo). */
export function premioDelPiazzamento(premi: readonly PremioPiazzamentoEsame[], piazzamento: PiazzamentoEsame): PremioPiazzamentoEsame {
  return premi.find((p) => p.piazzamento === piazzamento) ?? { piazzamento, doti: [] };
}

/** Il piazzamento segnato nella partita per quell'esame (null se nessuno). */
export function piazzamentoDellEsame(partitaId: number, esameChiave: string): PiazzamentoEsame | null {
  const r = prepared('SELECT piazzamento FROM esame_piazzamento_partita WHERE partita_id = ? AND esame_chiave = ?').get(partitaId, esameChiave) as { piazzamento: PiazzamentoEsame } | undefined;
  return r?.piazzamento ?? null;
}

/** Scrive (o, con null, toglie) la riga del piazzamento: l'unica scrittura, per Partita e per la spunta della voce. Nella transazione di chi chiama. */
function scriviPiazzamento(partitaId: number, esameChiave: string, piazzamento: PiazzamentoEsame | null): void {
  const adesso = nowIso();
  if (piazzamento === null) prepared('DELETE FROM esame_piazzamento_partita WHERE partita_id = ? AND esame_chiave = ?').run(partitaId, esameChiave);
  else prepared(`INSERT INTO esame_piazzamento_partita (partita_id, esame_chiave, piazzamento, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(partita_id, esame_chiave) DO UPDATE SET piazzamento = excluded.piazzamento, updated_at = excluded.updated_at`).run(partitaId, esameChiave, piazzamento, adesso);
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
}

/** Il trofeo è rivendicato da qualcos'altro nella partita (un effetto «trofeo» di una voce spuntata, un turno con un esito che lo dà)? */
function trofeoRivendicatoAltrove(partitaId: number, trofeo: string): boolean {
  const esiste = (t: string) => !!prepared("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(t);
  if (esiste('effetto_stato_voce') && prepared("SELECT 1 FROM utente.effetto_stato_voce WHERE partita_id = ? AND tipo = 'trofeo' AND chiave = ?").get(partitaId, trofeo)) return true;
  return esiste('trofeo_esito_turno') && !!prepared('SELECT 1 FROM utente.trofeo_esito_turno WHERE partita_id = ? AND trofeo_chiave = ?').get(partitaId, trofeo);
}

/**
 * L13 (ondata 7, O7-2): la spunta di una voce con l'effetto «esame» segna il piazzamento scelto (la stessa riga di Partita) e, per il primo
 * posto con il trofeo nel premio, il trofeo se la partita non l'ha già. Restituisce il «prima» (per la ricevuta) e il trofeo segnato da qui
 * (null se c'era già o se il premio non ne dà). Le Doti del premio le dice la ricevuta: si applicano con «Applica», come le altre della voce.
 */
export function segnaPiazzamentoDallaSpunta(partitaId: number, esameChiave: string, piazzamento: PiazzamentoEsame): { prima: PiazzamentoEsame | null; trofeo: { chiave: string; nome: string } | null } {
  const esame = premiDellEsame(esameChiave);
  if (!esame) throw httpErrors.badRequest('effetto-inesistente', 'L’esame della voce non esiste più nella guida: correggi gli effetti della voce.');
  const prima = piazzamentoDellEsame(partitaId, esameChiave);
  scriviPiazzamento(partitaId, esameChiave, piazzamento);
  const premio = premioDelPiazzamento(esame.premi, piazzamento);
  let trofeo: { chiave: string; nome: string } | null = null;
  if (premio.trofeo && !prepared('SELECT 1 FROM trofeo_partita WHERE partita_id = ? AND trofeo_chiave = ?').get(partitaId, premio.trofeo)) {
    const t = impostaTrofeo(partitaId, premio.trofeo, true);
    trofeo = { chiave: t.chiave, nome: t.nome };
  }
  return { prima, trofeo };
}

/**
 * Togliendo la spunta: il piazzamento torna quello di prima, ma solo se nella partita c'è ancora quello che la spunta aveva segnato (un
 * piazzamento cambiato dopo da Partita è una scelta di chi gioca e resta). Il trofeo segnato da quella spunta se ne va, se c'è ancora e
 * nessun altro lo rivendica (un'altra voce spuntata con il trofeo, un turno con un esito che lo dà).
 */
export function annullaPiazzamentoDallaSpunta(partitaId: number, x: { esame: string; piazzamento: PiazzamentoEsame; prima: PiazzamentoEsame | null; trofeo?: { chiave: string } }): void {
  if (piazzamentoDellEsame(partitaId, x.esame) === x.piazzamento) scriviPiazzamento(partitaId, x.esame, x.prima);
  if (x.trofeo && trofeoSiToglie(partitaId, x.trofeo.chiave)) impostaTrofeo(partitaId, x.trofeo.chiave, false);
}

/** Il trofeo segnato dalla spunta di un esame se ne va togliendola? Sì se è ancora nella guida e nella partita e nessun altro lo rivendica.
 *  Una regola sola: l'annullo e la finestra «Applicato dalla spunta». */
export function trofeoSiToglie(partitaId: number, trofeo: string): boolean {
  return !!prepared('SELECT 1 FROM trofeo WHERE chiave = ?').get(trofeo) && !!prepared('SELECT 1 FROM trofeo_partita WHERE partita_id = ? AND trofeo_chiave = ?').get(partitaId, trofeo)
    && !trofeoRivendicatoAltrove(partitaId, trofeo);
}

/** Segna (o, con null, toglie) il piazzamento di un esame nella partita. */
export function impostaPiazzamentoEsame(partitaId: number, esameChiave: string, piazzamento: PiazzamentoEsame | null): PiazzamentoEsameDto[] {
  verificaPartita(partitaId);
  if (!prepared('SELECT 1 FROM esame WHERE chiave = ?').get(esameChiave)) throw httpErrors.notFound('esame-non-trovato', `L’esame ${esameChiave} non esiste.`);
  getDb().transaction(() => scriviPiazzamento(partitaId, esameChiave, piazzamento))();
  return piazzamentiDellaPartita(partitaId);
}
