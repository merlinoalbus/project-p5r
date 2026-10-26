// ============================================================
// trofeiDegliEsitiService — il trofeo che un esito fa ottenere, segnato registrando il turno e tolto togliendolo (Ondata 5, lotto G)
// ============================================================
//
// Decisione 21 dell'utente (26 ottobre): «lotteria con esito "vinto/non vinto" alla spunta e trofeo, yen della vincita a mano». L'esito lo
// dichiara l'attività (`attivita.esiti_json`, campo `trofeo` di `shared/esitiAttivita.ts`: un solo punto); chi registra il turno (la spunta
// della voce del Diario o il + del contatore, tutte e due passano da `attivitaService.registraTurno`) sceglie l'esito, e se l'esito dice un
// trofeo questo si segna con lo stesso setter della pagina Trofei (`impostaTrofeo`). Il «prima» sta in `utente.trofeo_esito_turno`
// (utente 053), una riga per turno:
//   - `gia` = 1: il trofeo c'era già quando il turno l'ha chiesto (segnato a mano, da una voce o da un altro turno): togliendo il turno resta;
//   - `gia` = 0: l'ha segnato questo turno (con l'evento dello storico `evento_id`): togliendo il turno il trofeo torna non ottenuto e l'evento
//     se ne va, a meno che un altro lo rivendichi ancora (un altro turno con un esito che dà lo stesso trofeo, o una voce spuntata con l'effetto
//     «trofeo», `utente.effetto_stato_voce`): allora il segno passa a lui, come fa l'annullo delle voci (`effettiDiStatoService.decidiAnnullo`).
// La regola vale anche al contrario: una voce che toglie la spunta di un effetto «trofeo» lascia il trofeo al turno che lo rivendica
// (`cediTrofeoAUnTurno`). Nessuno yen si muove da qui (gli importi delle vincite non sono nella guida: si scrivono a mano, decisione 18).
// ============================================================

import { prepared } from '../db/dbService.js';
import { impostaTrofeo } from './completamentoService.js';
import { esitiDellAttivita } from './esitiAttivitaService.js';

const TABELLA = 'trofeo_esito_turno';

/** La tabella c'è? (Uno schema di prima della utente 053 non ha trofei dagli esiti: niente da segnare né da togliere.) */
const conTabella = (): boolean => !!prepared("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(TABELLA);

interface RigaTrofeoTurno { attivita_chiave: string; ordine: number; trofeo_chiave: string; gia: number; evento_id: number | null }

/** Il trofeo che l'esito `esito` dell'attività fa ottenere, o null (nessun esito con quella chiave, o un esito senza trofeo). */
export function trofeoDellEsito(attivita: string, esito: string): string | null {
  return esitiDellAttivita(attivita)?.esiti?.esiti.find((e) => e.chiave === esito)?.trofeo ?? null;
}

/**
 * Registrando il turno `ordine` dell'attività con l'esito `esito`: se l'esito dice un trofeo lo segna (se non c'era già) e ricorda il «prima».
 * Va chiamata dentro la transazione del turno. Un trofeo tolto dall'elenco non si segna (nessuna riga).
 */
export function segnaTrofeoDelTurno(p: number, attivita: string, ordine: number, esito: string | null | undefined): void {
  if (!esito || !conTabella()) return;
  // una riga rimasta da un turno con lo stesso numero, tolto per un'altra strada, si chiude prima con la regola di sempre
  togliTrofeoDelTurno(p, attivita, ordine);
  const trofeo = trofeoDellEsito(attivita, esito);
  if (!trofeo || !prepared('SELECT 1 FROM trofeo WHERE chiave = ?').get(trofeo)) return;
  const gia = !!prepared('SELECT 1 FROM trofeo_partita WHERE partita_id = ? AND trofeo_chiave = ?').get(p, trofeo);
  let eventoId: number | null = null;
  if (!gia) {
    const ultimo = prepared('SELECT COALESCE(MAX(id), 0) FROM evento_partita WHERE partita_id = ?').pluck().get(p) as number;
    impostaTrofeo(p, trofeo, true);
    eventoId = (prepared("SELECT id FROM evento_partita WHERE partita_id = ? AND id > ? AND tipo = 'trofeo' AND json_extract(dati_json, '$.trofeo') = ? ORDER BY id DESC LIMIT 1")
      .pluck().get(p, ultimo, trofeo) as number | undefined) ?? null;
  }
  prepared(`INSERT INTO utente.${TABELLA} (partita_id, attivita_chiave, ordine, trofeo_chiave, gia, evento_id, creato_il) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(p, attivita, ordine, trofeo, gia ? 1 : 0, eventoId, new Date().toISOString());
}

/**
 * Togliendo il turno `ordine` dell'attività: il trofeo che aveva segnato torna com'era (l'unica regola dell'annullo, vedi l'intestazione).
 * Va chiamata dentro la transazione del turno. Senza riga (un turno senza trofeo, o di prima della utente 053) non fa niente.
 */
export function togliTrofeoDelTurno(p: number, attivita: string, ordine: number): void {
  if (!conTabella()) return;
  const r = prepared(`SELECT attivita_chiave, ordine, trofeo_chiave, gia, evento_id FROM utente.${TABELLA} WHERE partita_id = ? AND attivita_chiave = ? AND ordine = ?`)
    .get(p, attivita, ordine) as RigaTrofeoTurno | undefined;
  if (!r) return;
  prepared(`DELETE FROM utente.${TABELLA} WHERE partita_id = ? AND attivita_chiave = ? AND ordine = ?`).run(p, attivita, ordine);
  if (r.gia === 1) return;
  // un altro turno lo rivendica: il segno (e l'evento) passa a lui
  const altro = prepared(`SELECT attivita_chiave, ordine FROM utente.${TABELLA} WHERE partita_id = ? AND trofeo_chiave = ? ORDER BY creato_il, rowid LIMIT 1`)
    .get(p, r.trofeo_chiave) as { attivita_chiave: string; ordine: number } | undefined;
  if (altro) {
    prepared(`UPDATE utente.${TABELLA} SET gia = 0, evento_id = ? WHERE partita_id = ? AND attivita_chiave = ? AND ordine = ?`).run(r.evento_id, p, altro.attivita_chiave, altro.ordine);
    return;
  }
  // una voce spuntata con l'effetto «trofeo» lo rivendica: il «prima» diventa «non c'era» e l'evento passa alla voce (lo revoca la sua spunta tolta)
  const voce = prepared("SELECT voce_uid, effetto_uid FROM utente.effetto_stato_voce WHERE partita_id = ? AND tipo = 'trofeo' AND chiave = ? ORDER BY applicato_il, rowid LIMIT 1")
    .get(p, r.trofeo_chiave) as { voce_uid: string; effetto_uid: string } | undefined;
  if (voce) {
    prepared('UPDATE utente.effetto_stato_voce SET prima_json = ? WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').run(JSON.stringify({ gia: false }), p, voce.voce_uid, voce.effetto_uid);
    if (r.evento_id !== null) prepared("UPDATE evento_partita SET voce_uid = ? WHERE id = ? AND partita_id = ? AND tipo = 'trofeo'").run(voce.voce_uid, r.evento_id, p);
    return;
  }
  // nessun altro: il trofeo torna non ottenuto (un trofeo tolto dall'elenco non ferma l'annullo del turno) e l'evento della sua nascita se ne va
  if (prepared('SELECT 1 FROM trofeo WHERE chiave = ?').get(r.trofeo_chiave)) impostaTrofeo(p, r.trofeo_chiave, false);
  else prepared('DELETE FROM trofeo_partita WHERE partita_id = ? AND trofeo_chiave = ?').run(p, r.trofeo_chiave);
  if (r.evento_id !== null) prepared("DELETE FROM evento_partita WHERE id = ? AND partita_id = ? AND tipo = 'trofeo'").run(r.evento_id, p);
}

/**
 * Togliendo la spunta di una voce con l'effetto «trofeo» (nessun'altra voce lo rivendica): se un turno con un esito che dà lo stesso trofeo
 * lo rivendica, il trofeo resta e (se la voce l'aveva segnato, `cedi`) il segno passa al turno, con l'evento staccato dalla voce perché la
 * sua spunta tolta non lo revochi. Vero se un turno lo rivendica (allora chi chiama non riporta indietro il trofeo).
 */
export function cediTrofeoAUnTurno(p: number, trofeo: string, voceUid: string, cedi: boolean): boolean {
  if (!conTabella()) return false;
  const t = prepared(`SELECT attivita_chiave, ordine FROM utente.${TABELLA} WHERE partita_id = ? AND trofeo_chiave = ? ORDER BY creato_il, rowid LIMIT 1`)
    .get(p, trofeo) as { attivita_chiave: string; ordine: number } | undefined;
  if (!t) return false;
  if (cedi) {
    const evento = prepared("SELECT id FROM evento_partita WHERE partita_id = ? AND voce_uid = ? AND tipo = 'trofeo' AND json_extract(dati_json, '$.trofeo') = ? ORDER BY id DESC LIMIT 1")
      .pluck().get(p, voceUid, trofeo) as number | undefined;
    if (evento !== undefined) prepared('UPDATE evento_partita SET voce_uid = NULL WHERE id = ?').run(evento);
    prepared(`UPDATE utente.${TABELLA} SET gia = 0, evento_id = ? WHERE partita_id = ? AND attivita_chiave = ? AND ordine = ?`).run(evento ?? null, p, t.attivita_chiave, t.ordine);
  }
  return true;
}
