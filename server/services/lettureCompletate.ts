// ============================================================
// lettureCompletate — UNA definizione di «letto/visto» (R10-20)
// ============================================================
//
// Libri e film hanno un contatore solo: l'avanzamento (`progresso_libro_partita`, `progresso_film_partita`). «Completato» non si
// scrive: si calcola dall'avanzamento — un libro è letto, un film visto, quando l'avanzamento raggiunge le sue sessioni (almeno una).
// I videogiochi seguono la stessa regola in `progresso_videogioco_partita` (le condizioni e gli esiti già la leggono così).
// Questo modulo non importa altri servizi: lo usano sia `attivitaService` sia `disponibilitaService` senza creare cicli.
// ============================================================

import { prepared } from '../db/dbService.js';

/** Una lettura è completa quando l'avanzamento raggiunge le sue sessioni (una sola, se non dichiarate). */
export const avanzamentoCompleto = (avanzamento: number, sessioni: number | null | undefined): boolean => avanzamento >= Math.max(sessioni ?? 1, 1);

/** I libri letti e i film visti della partita, come `tipo/chiave`, calcolati dall'avanzamento. */
export function lettureCompletate(partitaId: number): Set<string> {
  const righe = prepared(`
    SELECT 'libro' AS tipo, p.libro_chiave AS chiave FROM progresso_libro_partita p JOIN libro l ON l.chiave = p.libro_chiave
      WHERE p.partita_id = ? AND p.avanzamento >= MAX(COALESCE(l.sessioni, 1), 1)
    UNION ALL
    SELECT 'film', p.film_chiave FROM progresso_film_partita p JOIN film f ON f.chiave = p.film_chiave
      WHERE p.partita_id = ? AND p.avanzamento >= MAX(COALESCE(f.sessioni, 1), 1)`).all(partitaId, partitaId) as Array<{ tipo: string; chiave: string }>;
  return new Set(righe.map((r) => `${r.tipo}/${r.chiave}`));
}

/** Vero se la partita ha completato quel libro o film. */
export function letturaCompletata(partitaId: number, tipo: 'libro' | 'film', chiave: string): boolean {
  return lettureCompletate(partitaId).has(`${tipo}/${chiave}`);
}
