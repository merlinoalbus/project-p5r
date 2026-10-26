// ============================================================
// fortunaService — la Fortuna di Chihaya come stato della partita (R10-10/2)
// ============================================================
//
// Una riga per partita: la Dote scelta e il giorno di gioco in cui si è accesa. Vale solo quel giorno. Si spegne davvero quando il
// giorno cambia: `cambiaGiornoPartita` (la regola unica del cambio giorno) chiama `chiudiFortunaPerCambioGiorno`, che toglie la riga e
// lascia un evento; tornare poi a quel giorno non la riaccende. Per sicurezza `leggiFortuna` considera accesa solo una riga del
// giorno corrente. La leggono, con lo stesso ×1,5 per difetto (`moltiplicaFortuna`), le Doti, le voci del Diario e l'Aojiru; la pesca
// legge solo lo stato (accesa o no) e per la Perizia applica la propria regola (base + `bonusFortuna`, `pescaLetture`). Si accende dall'interruttore delle Doti o da una voce del Diario con l'effetto «fortuna»; ogni cambio lascia un evento.

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { eDote, nomeDote, type DoteChiave } from '../../shared/doti.js';
import type { FortunaPartitaDto } from '../../shared/fortuna.js';
import { dataLeggibile } from '../../shared/condizioniSpillo.js';
import { registraEvento } from './storicoService.js';
import { verificaPartita } from './verificaPartita.js';

interface RigaFortuna { dote: string; giorno: string | null }

/** La Fortuna di adesso: accesa solo se la riga è del giorno di gioco corrente. */
export function leggiFortuna(partitaId: number): FortunaPartitaDto {
  verificaPartita(partitaId);
  const riga = prepared('SELECT dote, giorno FROM utente.fortuna_partita WHERE partita_id = ?').get(partitaId) as RigaFortuna | undefined;
  if (!riga || !eDote(riga.dote)) return { attiva: false, dote: null, giorno: null, scaduta: false };
  const oggi = (prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null }).data_gioco;
  const attiva = riga.giorno === oggi;
  return { attiva, dote: riga.dote, giorno: riga.giorno, scaduta: !attiva };
}

/** La Fortuna è accesa proprio su questa Dote? È la domanda a cui rispondono Doti, voci, Aojiru e pesca. */
export function fortunaSu(partitaId: number, dote: string): boolean {
  const f = leggiFortuna(partitaId);
  return f.attiva && f.dote === dote;
}

/** Accende la Fortuna sulla Dote scelta per il giorno di gioco di adesso, o la spegne (`null`). */
export function impostaFortuna(partitaId: number, dote: DoteChiave | null): FortunaPartitaDto {
  verificaPartita(partitaId);
  if (dote !== null && !eDote(dote)) throw httpErrors.badRequest('dote-non-valida', 'Scegli una delle Doti sociali.');
  const prima = leggiFortuna(partitaId);
  if (dote === null ? !prima.attiva && !prima.scaduta : prima.attiva && prima.dote === dote) return prima;
  getDb().transaction(() => {
    if (dote === null) {
      prepared('DELETE FROM utente.fortuna_partita WHERE partita_id = ?').run(partitaId);
      registraEvento(partitaId, 'fortuna', 'Fortuna spenta', prima.dote ? `Era accesa su ${nomeDote(prima.dote)}.` : '', { dote: prima.dote });
    } else {
      const oggi = (prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null }).data_gioco;
      prepared('INSERT INTO utente.fortuna_partita (partita_id, dote, giorno, acceso_il) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id) DO UPDATE SET dote = excluded.dote, giorno = excluded.giorno, acceso_il = excluded.acceso_il, da_voce = NULL, prima_json = NULL')
        .run(partitaId, dote, oggi, nowIso());
      registraEvento(partitaId, 'fortuna', `Fortuna accesa su ${nomeDote(dote)}`, oggi ? `Per il resto del giorno (${dataLeggibile(oggi)}): i punti di questa Dote valgono ×1,5.` : 'I punti di questa Dote valgono ×1,5 finché non la spegni.', { dote, giorno: oggi });
    }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  })();
  return leggiFortuna(partitaId);
}

const giornoDellaPartita = (partitaId: number): string | null => (prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null }).data_gioco;

/**
 * La voce del Diario con la lettura della buona sorte (effetto «fortuna»): la spunta accende la Fortuna sulla Dote dell'effetto per il
 * giorno di adesso, ricordando la voce e lo stato di prima. Gira nella transazione della spunta (`applicaEffettiVoce`).
 */
export function accendiFortunaDaVoce(partitaId: number, voceUid: string, dote: DoteChiave): void {
  const prima = leggiFortuna(partitaId);
  const riga = prepared('SELECT da_voce, prima_json FROM utente.fortuna_partita WHERE partita_id = ?').get(partitaId) as { da_voce: string | null; prima_json: string | null } | undefined;
  // rispuntando la stessa voce lo stato «di prima» resta quello originale
  const memoria = riga?.da_voce === voceUid ? riga.prima_json : prima.attiva && prima.dote ? JSON.stringify({ dote: prima.dote, giorno: prima.giorno }) : null;
  const oggi = giornoDellaPartita(partitaId);
  prepared('INSERT INTO utente.fortuna_partita (partita_id, dote, giorno, acceso_il, da_voce, prima_json) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(partita_id) DO UPDATE SET dote = excluded.dote, giorno = excluded.giorno, acceso_il = excluded.acceso_il, da_voce = excluded.da_voce, prima_json = excluded.prima_json')
    .run(partitaId, dote, oggi, nowIso(), voceUid, memoria);
  const testo = (prepared('SELECT azione FROM main.voce_giornata WHERE uid = ?').get(voceUid) as { azione: string } | undefined)?.azione;
  registraEvento(partitaId, 'fortuna', `Fortuna accesa su ${nomeDote(dote)}`, `${testo ? `Dalla voce «${testo}». ` : ''}${oggi ? `Per il resto del giorno (${dataLeggibile(oggi)}): i punti di questa Dote valgono ×1,5.` : 'I punti di questa Dote valgono ×1,5 finché non la spegni.'}`, { dote, giorno: oggi, voce: voceUid });
}

/** 2026-10-26 (le ricevute della spunta): la Fortuna che la spunta di questa voce ha acceso ed è ancora in vigore (la riga è della voce: si
 *  toglie col cambio di giorno o con un'altra accensione), cioè quella che togliere la spunta spegne. Sola lettura. */
export function fortunaAccesaDallaVoce(partitaId: number, voceUid: string): { dote: DoteChiave; accesoIl: string } | null {
  const riga = prepared('SELECT dote, giorno, acceso_il FROM utente.fortuna_partita WHERE partita_id = ? AND da_voce = ?').get(partitaId, voceUid) as { dote: string; giorno: string | null; acceso_il: string } | undefined;
  // come `leggiFortuna`, per sicurezza: è in vigore solo la riga del giorno di gioco corrente (una scaduta non si dice «per il resto del giorno»)
  return riga && eDote(riga.dote) && riga.giorno === giornoDellaPartita(partitaId) ? { dote: riga.dote, accesoIl: riga.acceso_il } : null;
}

/** Togliendo la spunta della voce che l'aveva accesa, la Fortuna torna com'era (accesa su un'altra Dote lo stesso giorno, oppure spenta). */
export function spegniFortunaDaVoce(partitaId: number, voceUid: string): void {
  const riga = prepared('SELECT dote, prima_json FROM utente.fortuna_partita WHERE partita_id = ? AND da_voce = ?').get(partitaId, voceUid) as { dote: string; prima_json: string | null } | undefined;
  if (!riga) return;
  let prima: { dote?: unknown; giorno?: unknown } | null;
  try { prima = riga.prima_json ? JSON.parse(riga.prima_json) as { dote?: unknown; giorno?: unknown } : null; } catch { prima = null; }
  const oggi = giornoDellaPartita(partitaId);
  if (prima && eDote(prima.dote) && (prima.giorno ?? null) === oggi) {
    prepared('UPDATE utente.fortuna_partita SET dote = ?, giorno = ?, da_voce = NULL, prima_json = NULL WHERE partita_id = ?').run(prima.dote, oggi, partitaId);
    registraEvento(partitaId, 'fortuna', `Fortuna di nuovo su ${nomeDote(prima.dote)}`, 'Tolta la spunta della voce che l’aveva accesa su un’altra Dote.', { dote: prima.dote, giorno: oggi, voce: voceUid });
  } else {
    prepared('DELETE FROM utente.fortuna_partita WHERE partita_id = ?').run(partitaId);
    registraEvento(partitaId, 'fortuna', 'Fortuna spenta', `Tolta la spunta della voce che l’aveva accesa su ${nomeDote(riga.dote)}.`, { dote: riga.dote, voce: voceUid });
  }
}

/** Il giorno di gioco è cambiato: la Fortuna accesa finisce (la riga si toglie, con un evento). Chiamata da `cambiaGiornoPartita`. */
export function chiudiFortunaPerCambioGiorno(partitaId: number): void {
  const riga = prepared('SELECT dote FROM utente.fortuna_partita WHERE partita_id = ?').get(partitaId) as { dote: string } | undefined;
  if (!riga) return;
  prepared('DELETE FROM utente.fortuna_partita WHERE partita_id = ?').run(partitaId);
  registraEvento(partitaId, 'fortuna', 'Fortuna finita', `Era accesa su ${eDote(riga.dote) ? nomeDote(riga.dote) : riga.dote}: con il nuovo giorno non vale più.`, { dote: riga.dote });
}
