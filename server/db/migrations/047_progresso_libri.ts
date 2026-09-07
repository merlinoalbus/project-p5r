// ============================================================
// Migrazione 047 — avanzamento dei libri, separato dal completamento
// ============================================================
//
// `lettura_partita` resta l'autorita' binaria consumata dagli sblocchi. Questa tabella conserva
// invece le sessioni gia' lette: una riga parziale non puo' quindi aprire accidentalmente un
// quartiere. Le vecchie spunte complete vengono riportate al totale noto del libro.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration047: Migration = {
  id: 47,
  name: 'progresso_libri',
  up: (db) => {
    db.exec(`
      CREATE TABLE progresso_libro_partita (
        partita_id   INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
        libro_chiave TEXT NOT NULL,
        avanzamento  INTEGER NOT NULL CHECK (avanzamento >= 1),
        updated_at   TEXT NOT NULL,
        PRIMARY KEY (partita_id, libro_chiave)
      );

      CREATE TABLE libro_posizione (
        libro_chiave TEXT NOT NULL REFERENCES libro(chiave) ON DELETE CASCADE,
        ordine       INTEGER NOT NULL,
        tipo         TEXT NOT NULL CHECK (tipo IN ('quartiere','luogo','negozio','attivita')),
        chiave       TEXT NOT NULL,
        etichetta    TEXT NOT NULL,
        PRIMARY KEY (libro_chiave, ordine)
      );
    `);
    db.prepare(`INSERT INTO progresso_libro_partita
      (partita_id, libro_chiave, avanzamento, updated_at)
      SELECT lp.partita_id, lp.chiave, MAX(COALESCE(l.sessioni, 1), 1), lp.updated_at
      FROM lettura_partita lp JOIN libro l ON l.chiave = lp.chiave
      WHERE lp.tipo = 'libro'`).run();
  },
};
