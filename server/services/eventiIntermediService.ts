// ============================================================
// eventiIntermediService — gli eventi intermedi dei Confidenti (7.5, 8.5, 6.5): quali ci sono e quali la partita ha fatto
// ============================================================
//
// Un evento intermedio è un dialogo della guida con un rango non intero (`confidente_dialogo.rango` = intero + 0,5: Takemi 7.5, Kawakami 8.5,
// Mishima 6.5…); la regola pura sta in `shared/eventiIntermedi.ts`. Il rango del Confidente resta intero ovunque: qui si legge e si scrive solo
// se l'evento è stato fatto nella partita (`utente.evento_intermedio_partita`), un solo stato con due modi di segnarlo:
//   - dal pannello del Confidente (Partita → Confidenti, «Evento 7.5 fatto»), origine 'pagina', annullabile da lì;
//   - dalla spunta della voce del Diario con l'effetto «eventoConfidente» (`effettiDiStatoService`), origine 'diario' con la voce: togliendo la
//     spunta se ne va solo se è ancora di quella voce (o passa alla voce erede); una riga che c'è già non si duplica.
// Lo leggono la condizione `confidente` con un rango x.5 (`condizioni/valutatore.ts`: la Richiesta che l'evento sblocca), i semafori, la pioggia
// del prossimo passo (`disponibilitaStrutturataService`) e il DTO del Confidente (`partiteService.confidentiDto`).
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraCacheDiGioco } from './cacheDiGioco.js';
import { verificaPartita } from './verificaPartita.js';
import { registraEvento } from './storicoService.js';
import { t } from './traduzioniService.js';
import { chiaveEventoIntermedio, eRangoIntermedio, etichettaEventoIntermedio, leggiChiaveEventoIntermedio, rangoIntermedioDopo, rangoPrimaDellEvento } from '../../shared/eventiIntermedi.js';
import type { EventoIntermedioPartitaDto } from '../../shared/types.js';

/** Gli eventi intermedi di ogni Confidente dai dialoghi della guida (ranghi in ordine), letti una volta e svuotati quando il DB di gioco cambia. */
let eventiPerConfidente: Map<string, number[]> | null = null;
registraCacheDiGioco(() => { eventiPerConfidente = null; });

/** Tutti gli eventi intermedi della guida, per Confidente. */
export function tuttiGliEventiIntermedi(): ReadonlyMap<string, readonly number[]> {
  if (!eventiPerConfidente) {
    const m = new Map<string, number[]>();
    const righe = prepared('SELECT DISTINCT confidente_chiave AS c, rango FROM main.confidente_dialogo WHERE rango IS NOT NULL AND rango <> CAST(rango AS INTEGER) ORDER BY confidente_chiave, rango')
      .all() as Array<{ c: string; rango: number }>;
    for (const r of righe) {
      if (!eRangoIntermedio(r.rango)) continue;
      const l = m.get(r.c) ?? [];
      l.push(r.rango);
      m.set(r.c, l);
    }
    eventiPerConfidente = m;
  }
  return eventiPerConfidente;
}

/** Il Confidente ha questo evento intermedio fra i suoi dialoghi? */
export const eEventoIntermedio = (confidente: string, rango: number): boolean => eRangoIntermedio(rango) && (tuttiGliEventiIntermedi().get(confidente)?.includes(rango) ?? false);

/** L'evento intermedio fra il rango intero dato e il successivo (7 → 7.5), se il Confidente ne ha uno; null altrimenti. */
export function eventoIntermedioDopo(confidente: string, rango: number): number | null {
  const x = rangoIntermedioDopo(rango);
  return eEventoIntermedio(confidente, x) ? x : null;
}

/** Rifiuta (400 `evento-intermedio-inesistente`) un rango x.5 che non è un evento intermedio del Confidente. Un rango intero passa. */
export function richiediEventoIntermedio(confidente: string, rango: number): void {
  if (Number.isInteger(rango)) return;
  if (!eEventoIntermedio(confidente, rango)) {
    throw httpErrors.badRequest('evento-intermedio-inesistente', `${t('confidente', confidente)} non ha un evento ${eRangoIntermedio(rango) ? etichettaEventoIntermedio(rango) : rango} nei dialoghi della guida: un rango non intero vale solo per un evento intermedio.`);
  }
}

interface RigaEvento { confidente_chiave: string; rango: number; origine: 'pagina' | 'diario'; voce_uid: string | null }

/** Gli eventi intermedi fatti nella partita, per chiave («takemi:7.5»): con l'origine e la voce del Diario che li ha segnati. */
export function eventiIntermediFatti(partitaId: number): Map<string, { origine: 'pagina' | 'diario'; voceUid: string | null }> {
  const righe = prepared('SELECT confidente_chiave, rango, origine, voce_uid FROM utente.evento_intermedio_partita WHERE partita_id = ?').all(partitaId) as RigaEvento[];
  return new Map(righe.map((r) => [chiaveEventoIntermedio(r.confidente_chiave, r.rango), { origine: r.origine, voceUid: r.voce_uid }]));
}

/**
 * Gli eventi fatti secondo uno stato di valutazione: quelli che porta (`StatoPartitaSemafori.eventiIntermediFatti`) o, se non li porta, letti dalla
 * sua partita e ricordati nello stato; nessuno senza partita.
 */
export function eventiFattiDelloStato(st: { eventiIntermediFatti?: ReadonlySet<string>; partitaId?: number }): ReadonlySet<string> {
  if (!st.eventiIntermediFatti) st.eventiIntermediFatti = st.partitaId === undefined ? new Set<string>() : new Set(eventiIntermediFatti(st.partitaId).keys());
  return st.eventiIntermediFatti;
}

/** La riga dell'evento nella partita, o undefined se non è fatto. */
function rigaEvento(partitaId: number, confidente: string, rango: number): RigaEvento | undefined {
  return prepared('SELECT confidente_chiave, rango, origine, voce_uid FROM utente.evento_intermedio_partita WHERE partita_id = ? AND confidente_chiave = ? AND rango = ?')
    .get(partitaId, confidente, rango) as RigaEvento | undefined;
}

/** L'evento intermedio è fatto nella partita? */
export const eventoIntermedioFatto = (partitaId: number, confidente: string, rango: number): boolean => !!rigaEvento(partitaId, confidente, rango);

/** Il campo `eventoIntermedio` del DTO del Confidente: l'evento fra il rango attuale e il successivo, con lo stato nella partita; null senza. */
export function eventoIntermedioDelConfidente(confidente: string, rango: number, fatti: ReadonlyMap<string, { origine: 'pagina' | 'diario'; voceUid: string | null }>): EventoIntermedioPartitaDto | null {
  const x = eventoIntermedioDopo(confidente, rango);
  if (x === null) return null;
  const f = fatti.get(chiaveEventoIntermedio(confidente, x));
  return { rango: x, etichetta: etichettaEventoIntermedio(x), fatto: !!f, origine: f?.origine ?? null, voceUid: f?.voceUid ?? null };
}

/** Il nome del Confidente, o 404 se non c'è. */
function nomeConfidente(confidente: string): string {
  const r = prepared('SELECT nome FROM main.confidente WHERE chiave = ?').get(confidente) as { nome: string } | undefined;
  if (!r) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${confidente}' non esiste.`);
  return r.nome;
}

/** Il rango del Confidente nella partita (0 se non incontrato). */
const rangoNellaPartita = (partitaId: number, confidente: string): number =>
  (prepared('SELECT rango FROM utente.confidente_partita WHERE partita_id = ? AND confidente_chiave = ?').get(partitaId, confidente) as { rango: number } | undefined)?.rango ?? 0;

/**
 * «Evento 7.5 fatto» dal pannello del Confidente: verifica partita (404), Confidente (404), che l'evento sia uno dei suoi dialoghi (400) e che il
 * rango della partita sia almeno quello da cui si fa (409: il 7.5 non si fa al rango 6). Già fatto (dal pannello o da una voce): non si tocca.
 * Registra l'evento nello storico (`confidente-evento`).
 */
export function segnaEventoIntermedio(partitaId: number, confidente: string, rango: number): void {
  verificaPartita(partitaId);
  const nome = nomeConfidente(confidente);
  if (!eEventoIntermedio(confidente, rango)) throw httpErrors.badRequest('evento-intermedio-inesistente', `${nome} non ha un evento ${eRangoIntermedio(rango) ? etichettaEventoIntermedio(rango) : rango} nei dialoghi della guida.`);
  const etichetta = etichettaEventoIntermedio(rango);
  const attuale = rangoNellaPartita(partitaId, confidente);
  if (attuale < rangoPrimaDellEvento(rango)) throw httpErrors.conflict('evento-intermedio-presto', `${nome}: l’evento ${etichetta} si fa dal rango ${rangoPrimaDellEvento(rango)}, ora è al rango ${attuale}.`);
  if (rigaEvento(partitaId, confidente, rango)) return;
  getDb().transaction(() => {
    prepared("INSERT INTO utente.evento_intermedio_partita (partita_id, confidente_chiave, rango, origine, voce_uid, created_at) VALUES (?, ?, ?, 'pagina', NULL, ?)").run(partitaId, confidente, rango, nowIso());
    registraEvento(partitaId, 'confidente-evento', `${nome}: evento ${etichetta} fatto`, 'Segnato dalla pagina Confidenti.', { chiave: chiaveEventoIntermedio(confidente, rango), confidente, rango }, null, null);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  })();
}

/**
 * Toglie «Evento 7.5 fatto» dal pannello: solo una riga segnata dal pannello. Una segnata dalla spunta di una voce del Diario si toglie togliendo
 * quella spunta (409 `evento-intermedio-dal-diario`). Non fatto: niente da togliere. L'evento dello storico segnato dal pannello se ne va con lei.
 */
export function togliEventoIntermedio(partitaId: number, confidente: string, rango: number): void {
  verificaPartita(partitaId);
  const nome = nomeConfidente(confidente);
  if (!eEventoIntermedio(confidente, rango)) throw httpErrors.badRequest('evento-intermedio-inesistente', `${nome} non ha un evento ${eRangoIntermedio(rango) ? etichettaEventoIntermedio(rango) : rango} nei dialoghi della guida.`);
  const r = rigaEvento(partitaId, confidente, rango);
  if (!r) return;
  if (r.origine === 'diario') {
    throw httpErrors.conflict('evento-intermedio-dal-diario', `${nome}: l’evento ${etichettaEventoIntermedio(rango)} l’ha segnato la spunta di una voce del Diario: per toglierlo togli la spunta di quella voce.`, { voceUid: r.voce_uid });
  }
  getDb().transaction(() => {
    prepared("DELETE FROM utente.evento_intermedio_partita WHERE partita_id = ? AND confidente_chiave = ? AND rango = ? AND origine = 'pagina'").run(partitaId, confidente, rango);
    prepared("DELETE FROM utente.evento_partita WHERE partita_id = ? AND tipo = 'confidente-evento' AND voce_uid IS NULL AND json_extract(dati_json, '$.chiave') = ?").run(partitaId, chiaveEventoIntermedio(confidente, rango));
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  })();
}

/** La spunta di una voce segna l'evento (dentro la sua transazione): la riga nasce con la voce; se c'è già (dal pannello o da un'altra voce) resta com'è. */
export function scriviEventoDaVoce(partitaId: number, confidente: string, rango: number, voceUid: string): void {
  const scritta = prepared("INSERT OR IGNORE INTO utente.evento_intermedio_partita (partita_id, confidente_chiave, rango, origine, voce_uid, created_at) VALUES (?, ?, ?, 'diario', ?, ?)")
    .run(partitaId, confidente, rango, voceUid, nowIso()).changes > 0;
  // l'evento dello storico è della voce: togliendo la spunta se ne va con lei (`revocaEventiDellaVoce`, o passa all'erede)
  if (scritta) registraEvento(partitaId, 'confidente-evento', `${nomeConfidente(confidente)}: evento ${etichettaEventoIntermedio(rango)} fatto`, 'Dalla spunta della voce del Diario.',
    { chiave: chiaveEventoIntermedio(confidente, rango), confidente, rango }, null, voceUid);
}

/** Togliendo la spunta: la riga se ne va solo se l'aveva scritta quella voce (una segnata dal pannello o da un'altra voce resta). */
export function togliEventoDaVoce(partitaId: number, confidente: string, rango: number, voceUid: string): void {
  prepared("DELETE FROM utente.evento_intermedio_partita WHERE partita_id = ? AND confidente_chiave = ? AND rango = ? AND origine = 'diario' AND voce_uid = ?").run(partitaId, confidente, rango, voceUid);
}

/** La voce che toglie la spunta passa la riga che aveva scritto alla voce erede, che rivendica lo stesso evento. */
export function passaEventoAllErede(partitaId: number, chiave: string, voceUid: string, erede: string): void {
  const e = leggiChiaveEventoIntermedio(chiave);
  if (!e) return;
  prepared("UPDATE utente.evento_intermedio_partita SET voce_uid = ? WHERE partita_id = ? AND confidente_chiave = ? AND rango = ? AND origine = 'diario' AND voce_uid = ?")
    .run(erede, partitaId, e.confidente, e.rango, voceUid);
}
