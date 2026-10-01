// ============================================================
// La voce della guida di un pin: la regola unica di lettura (migrazione 094, 2026-10-01)
// ============================================================
//
// Senza dipendenze, perché la leggono tutti — guida, mappe, Palazzi —, anche chi è letto dalle regole del collegamento
// (`collegamentiGuida.ts`): così nessun modulo si richiama in cerchio.
// ============================================================

/**
 * La voce della guida di un pin, in SQL (su `spillo`, senza alias): il campo suo (094) o, per gli elementi della guida senza
 * mappa che non l'hanno (lo strato di prima, lasciato com'è), il riferimento «punto». È la regola unica: ogni lettore la usa.
 */
export const VOCE_DEL_PIN = "COALESCE(voce_chiave, CASE WHEN riferimento_tipo = 'punto' THEN riferimento_chiave END)";

/** La stessa regola su una riga già letta. */
export function voceDelPin(r: { voce_chiave?: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null }): string | null {
  return r.voce_chiave ?? (r.riferimento_tipo === 'punto' ? r.riferimento_chiave : null);
}
