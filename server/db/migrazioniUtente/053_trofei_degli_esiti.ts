// ============================================================
// Utente 053 — il trofeo segnato da un turno con il suo esito (Ondata 5, Lotto G; decisione 21 dell'utente)
// ============================================================
//
// Decisione 21 (26 ottobre): «lotteria con esito "vinto/non vinto" alla spunta e trofeo, yen della vincita a mano». Un esito dell'attività
// può dire il trofeo che fa ottenere (`shared/esitiAttivita.ts`, campo `trofeo`); registrando il turno con quell'esito il trofeo si segna, e
// togliendo il turno torna com'era (`server/services/trofeiDegliEsitiService.ts`). Questa tabella è il «prima», una riga per turno:
// `gia` = 1 il trofeo c'era già (togliendo il turno resta), 0 l'ha segnato il turno, con l'evento dello storico che ha scritto (`evento_id`).
//
// Solo lo schema, vuoto: nessun turno di prima dichiarava un trofeo (gli esiti con trofeo nascono con la gioco 280), quindi non c'è niente da
// ricostruire. Nessun'altra tabella cambia. Append-only e idempotente (IF NOT EXISTS). Audit in `main.dati_guida.audit-utente-053-trofei-esiti`.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const AUDIT = 'audit-utente-053-trofei-esiti';

export const utente053: Migration = {
  id: 53,
  name: 'trofei_degli_esiti',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 053: manca la transazione della migrazione; nessuna modifica applicata.');
    const esisteva = !!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'trofeo_esito_turno'").get();
    db.exec(`CREATE TABLE IF NOT EXISTS utente.trofeo_esito_turno (
      partita_id      INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      attivita_chiave TEXT NOT NULL CHECK (length(attivita_chiave) BETWEEN 1 AND 200),
      ordine          INTEGER NOT NULL CHECK (ordine >= 1),
      trofeo_chiave   TEXT NOT NULL CHECK (length(trofeo_chiave) BETWEEN 1 AND 100),
      gia             INTEGER NOT NULL CHECK (gia IN (0, 1)),
      evento_id       INTEGER,
      creato_il       TEXT NOT NULL,
      PRIMARY KEY (partita_id, attivita_chiave, ordine)
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS utente.trofeo_esito_turno_trofeo ON trofeo_esito_turno (partita_id, trofeo_chiave)');
    if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'dati_guida'").get()) {
      db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)')
        .run(AUDIT, JSON.stringify({ data: '2026-10-26', tabella: 'utente.trofeo_esito_turno', creata: !esisteva, righe: 0 }));
    }
  },
};
