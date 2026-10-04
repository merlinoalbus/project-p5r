// ============================================================
// La voce della guida di un pin: la regola unica di lettura (migrazione 094, 2026-10-01)
// ============================================================
//
// Senza dipendenze da altri servizi, perché la leggono tutti — guida, mappe, Palazzi —, anche chi è letto dalle regole del
// collegamento (`collegamentiGuida.ts`): così nessun modulo si richiama in cerchio (importa solo il DB e i condivisi).
// ============================================================

import { prepared } from '../../db/dbService.js';
import { TIPO_PUNTO_DESCRITTIVO } from '../../../shared/spilli.js';

/**
 * La voce della guida di un pin, in SQL (su `spillo`, senza alias): il campo suo (094) o, per gli elementi della guida senza
 * mappa che non l'hanno (lo strato di prima, lasciato com'è), il riferimento «punto». È la regola unica: ogni lettore la usa.
 */
export const VOCE_DEL_PIN = "COALESCE(voce_chiave, CASE WHEN riferimento_tipo = 'punto' THEN riferimento_chiave END)";

/**
 * Le voci della guida **gestite** in una partita, in SQL con un parametro (`partita_id`): quelle con uno stato in `punto_partita`,
 * tranne le voci descrittive («Altro»), che uno stato non lo hanno. È la regola unica con cui una voce segnata segna i pin che la
 * citano: la usano il visore e le condizioni (`spilliSegnati`), la raccolta dei Palazzi (`raccoltaMappe`) e il loro completamento
 * (`palazziCompletati`). Prima le ultime due contavano anche uno stato rimasto su una voce descrittiva.
 */
export const VOCI_GESTITE_SQL = `SELECT pp.punto_chiave FROM punto_partita pp JOIN punto_interesse pi ON pi.chiave = pp.punto_chiave
  WHERE pp.partita_id = ? AND pi.tipo <> '${TIPO_PUNTO_DESCRITTIVO}'`;

/** `VOCI_GESTITE_SQL` letta: l'insieme delle chiavi delle voci gestite nella partita. */
export function vociGestite(partitaId: number): Set<string> {
  return new Set((prepared(VOCI_GESTITE_SQL).all(partitaId) as Array<{ punto_chiave: string }>).map((r) => r.punto_chiave));
}

/** La stessa regola su una riga già letta. */
export function voceDelPin(r: { voce_chiave?: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null }): string | null {
  return r.voce_chiave ?? (r.riferimento_tipo === 'punto' ? r.riferimento_chiave : null);
}
