// ============================================================
// appuntiFissiService — gli appunti fissi del Diario: elenco, aggiunta, modifica, eliminazione, riordino (2026-10-31, C7)
// ============================================================
//
// Richiesta dell'utente: «una sorta di clipboard su finestra fluttuante dove possa io inserire e mantenere salvati delle voci che tendono a
// ripetersi nel diario», proposta approvata «Sì, sul server». Gli appunti stanno in `utente.appunto_fisso` (migrazione utente 058) e non sono
// di una partita. L'ordine è un numero da 0 senza buchi: un appunto nuovo va in fondo, l'eliminazione ricompatta, il riordino riceve l'elenco
// INTERO degli id (così un elenco cambiato nel frattempo da un altro dispositivo non si riordina alla cieca: 409 `ordine-cambiato`).
// Ogni scrittura è una transazione. Il testo si conserva com'è (anche gli spazi: il blocco delle voci del Diario va tenuto intatto); il
// titolo si ripulisce ai capi (lo schema zod).
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { LIMITE_APPUNTI, type AppuntoFissoDto, type ModificaAppuntoFisso, type NuovoAppuntoFisso } from '../../shared/appuntiFissi.js';

interface RigaAppunto { id: number; titolo: string; testo: string; ordine: number; creato_il: string; aggiornato_il: string }

const dto = (r: RigaAppunto): AppuntoFissoDto => ({ id: r.id, titolo: r.titolo, testo: r.testo, ordine: r.ordine, creatoIl: r.creato_il, aggiornatoIl: r.aggiornato_il });

const SQL_ELENCO = 'SELECT id, titolo, testo, ordine, creato_il, aggiornato_il FROM utente.appunto_fisso ORDER BY ordine, id';

/** L'appunto `id`, o 404 `appunto-non-trovato`. */
function riga(id: number): RigaAppunto {
  const r = prepared('SELECT id, titolo, testo, ordine, creato_il, aggiornato_il FROM utente.appunto_fisso WHERE id = ?').get(id) as RigaAppunto | undefined;
  if (!r) throw httpErrors.notFound('appunto-non-trovato', `L'appunto fisso ${id} non esiste (forse è stato eliminato da un altro dispositivo).`);
  return r;
}

/** Rimette l'ordine da 0 senza buchi, nell'ordine di adesso (dopo un'eliminazione). */
function compatta(): void {
  const ids = prepared('SELECT id FROM utente.appunto_fisso ORDER BY ordine, id').pluck().all() as number[];
  const aggiorna = prepared('UPDATE utente.appunto_fisso SET ordine = ? WHERE id = ? AND ordine <> ?');
  ids.forEach((id, i) => aggiorna.run(i, id, i));
}

/** Tutti gli appunti, nel loro ordine. */
export function elencoAppuntiFissi(): AppuntoFissoDto[] {
  return (prepared(SQL_ELENCO).all() as RigaAppunto[]).map(dto);
}

/** Un appunto nuovo, in fondo all'elenco. 409 `troppi-appunti` oltre il limite. */
export function creaAppuntoFisso(d: NuovoAppuntoFisso): AppuntoFissoDto {
  return getDb().transaction(() => {
    const n = prepared('SELECT COUNT(*) FROM utente.appunto_fisso').pluck().get() as number;
    if (n >= LIMITE_APPUNTI) throw httpErrors.conflict('troppi-appunti', `Si possono tenere al massimo ${LIMITE_APPUNTI} appunti fissi: eliminane qualcuno prima di aggiungerne altri.`);
    const ora = nowIso();
    const esito = prepared('INSERT INTO utente.appunto_fisso (titolo, testo, ordine, creato_il, aggiornato_il) VALUES (?, ?, ?, ?, ?)').run(d.titolo, d.testo, n, ora, ora);
    return dto(riga(Number(esito.lastInsertRowid)));
  })();
}

/** Cambia titolo e/o testo di un appunto (404 se non c'è). */
export function modificaAppuntoFisso(id: number, d: ModificaAppuntoFisso): AppuntoFissoDto {
  return getDb().transaction(() => {
    const r = riga(id);
    const titolo = d.titolo ?? r.titolo, testo = d.testo ?? r.testo;
    if (titolo !== r.titolo || testo !== r.testo) prepared('UPDATE utente.appunto_fisso SET titolo = ?, testo = ?, aggiornato_il = ? WHERE id = ?').run(titolo, testo, nowIso(), id);
    return dto(riga(id));
  })();
}

/** Elimina un appunto (404 se non c'è) e ricompatta l'ordine. */
export function eliminaAppuntoFisso(id: number): void {
  getDb().transaction(() => {
    riga(id);
    prepared('DELETE FROM utente.appunto_fisso WHERE id = ?').run(id);
    compatta();
  })();
}

/**
 * Il nuovo ordine dell'elenco: `ids` deve contenere tutti gli appunti, ognuno una volta. Un id ripetuto è 400 `ordine-non-valido`; un elenco
 * che non coincide con quello di adesso (un appunto aggiunto o eliminato altrove) è 409 `ordine-cambiato`: chi riordina rilegge e riprova.
 */
export function riordinaAppuntiFissi(ids: readonly number[]): AppuntoFissoDto[] {
  if (new Set(ids).size !== ids.length) throw httpErrors.badRequest('ordine-non-valido', 'Nel nuovo ordine un appunto compare più di una volta.');
  return getDb().transaction(() => {
    const attuali = new Set(prepared('SELECT id FROM utente.appunto_fisso').pluck().all() as number[]);
    if (attuali.size !== ids.length || ids.some((id) => !attuali.has(id))) {
      throw httpErrors.conflict('ordine-cambiato', 'Nel frattempo l’elenco degli appunti fissi è cambiato (forse da un altro dispositivo): l’ho riletto, riprova a spostare.');
    }
    const aggiorna = prepared('UPDATE utente.appunto_fisso SET ordine = ? WHERE id = ? AND ordine <> ?');
    ids.forEach((id, i) => aggiorna.run(i, id, i));
    return elencoAppuntiFissi();
  })();
}
