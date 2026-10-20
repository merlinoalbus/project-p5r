// ============================================================
// 117 — la frase «Pin nativo del gioco.» tolta anche in testa alle descrizioni che continuano (ordine dell'utente, 2026-10-20)
// ============================================================
//
// L'utente: «puoi rimuovere la scritta "Pin nativo del gioco"». La 116 ha svuotato le descrizioni che erano solo la frase; qui si toglie la
// frase dall'inizio delle descrizioni che proseguono con altro testo («Pin nativo del gioco. Tipo nativo 28…»), tenendo il resto senza lo
// spazio iniziale. Si scrive direttamente nel DB, l'unica fonte dei dati (il pacchetto di gioco è superato). Idempotente: una descrizione
// già ripulita non comincia più con la frase.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { FRASE_PIN_NATIVO } from './116_frase_pin_nativo.js';

export const migration117: Migration = {
  id: 117,
  name: 'frase_pin_nativo_in_testa',
  up(db) {
    if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'spillo'").get()) return;
    const lunghezza = FRASE_PIN_NATIVO.length;
    const toccate = db.prepare(
      `UPDATE spillo SET descrizione = ltrim(substr(descrizione, ${lunghezza + 1}))
       WHERE substr(descrizione, 1, ${lunghezza}) = ? AND descrizione <> ?`,
    ).run(FRASE_PIN_NATIVO, FRASE_PIN_NATIVO).changes;
    logger.info({ toccate }, 'migrazione 117: tolta la frase «Pin nativo del gioco.» in testa alle descrizioni dei pin');
  },
};
