// ============================================================
// Utente 049 — gli yen nati prima che si muovessero da soli (L13, decisione 18)
// ============================================================
//
// Decisione 18 dell'utente (2026-10-25): «gli yen possono anche scendere da soli (senza mai andare sotto zero) ma devono restare cmq
// possibili le azioni anche se il denaro disponibile non basta o è a 0». Il registro dei movimenti automatici (`utente.yen_automatico`, 048)
// nasce vuoto: le voci spuntate, i turni, le Richieste completate e i regali fatti PRIMA non avevano mosso niente, perché il saldo di allora
// li contava già. Togliendo uno di quei gesti non c'è niente da restituire; rimettendolo, l'app lo pagherebbe come se fosse nuovo, e il
// saldo si sposterebbe senza alcun gesto nel gioco (revisione del 25/10: tre libri −2.100, turno al Triple Seven +3.500, Richiesta +6.500).
//
// `yen_automatico_inizio`: una riga, il momento da cui gli yen si muovono da soli in questo file delle partite (il primo movimento già
// registrato, altrimenti adesso). Ciò che è nato prima di quel momento era già nel saldo.
// `yen_fuori_registro`: le cause tolte senza un movimento da restituire perché nate prima (`yenAutomaticiService.segnaYenFuoriRegistro`):
// rimettendo la stessa causa il saldo non cambia. Causa «voce» con chiave `voce:effetto` (un effetto che la voce spuntata prima aveva allora,
// anche un turno o una Richiesta), «richiesta» (completata prima), «regalo» (oggetto e momento di gioco della consegna di prima con l'acquisto).
// Quali cause si segnano lo decide `yenAutomaticiService` dal momento della causa. Le righe non si tolgono: sono la storia del saldo.
//
// Append-only, idempotente (IF NOT EXISTS, INSERT OR IGNORE), solo schema «utente»: nessuna riga esistente cambia, nessun saldo si riscrive.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente049: Migration = {
  id: 49,
  name: 'yen_fuori_registro',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 049: manca la transazione della migrazione; nessuna modifica applicata.');
    db.exec(`CREATE TABLE IF NOT EXISTS utente.yen_automatico_inizio (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      dal TEXT NOT NULL CHECK (length(dal) BETWEEN 10 AND 40)
    )`);
    // il primo movimento automatico già registrato (un file che ha avuto la 048 prima della 049), altrimenti adesso
    db.prepare('INSERT OR IGNORE INTO utente.yen_automatico_inizio (id, dal) VALUES (1, COALESCE((SELECT MIN(creato_il) FROM utente.yen_automatico), ?))')
      .run(new Date().toISOString());
    db.exec(`CREATE TABLE IF NOT EXISTS utente.yen_fuori_registro (
      partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      causa_tipo TEXT NOT NULL CHECK (causa_tipo IN ('voce', 'turno', 'richiesta', 'regalo')),
      causa_chiave TEXT NOT NULL CHECK (length(causa_chiave) BETWEEN 1 AND 400),
      motivo TEXT NOT NULL,
      creato_il TEXT NOT NULL,
      PRIMARY KEY (partita_id, causa_tipo, causa_chiave)
    )`);
  },
};
