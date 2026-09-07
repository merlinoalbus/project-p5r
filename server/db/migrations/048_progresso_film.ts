// ============================================================
// Migrazione 048 — avanzamento di film e DVD
// ============================================================
//
// Per film e libri `lettura_partita` significa «completato». Il progresso è l'autorità per
// distinguere un DVD iniziato da uno completato e per contare le rivisioni al cinema.
// ============================================================

import type Database from 'better-sqlite3';
import type { Migration } from '../migrationRunner.js';

const ALIAS_FILM = [
  ['cinema-tanktop-millionaire', 'cinema-le-sedici-domande'],
  ['cinema-love-possibly', 'cinema-l-amore-chissa'],
] as const;

function unisciAlias(db: Database.Database, alias: string, canonica: string): void {
  db.prepare(`
    INSERT INTO lettura_partita (partita_id, tipo, chiave, updated_at)
    SELECT partita_id, 'film', ?, MAX(updated_at)
    FROM lettura_partita
    WHERE tipo = 'film' AND chiave IN (?, ?)
    GROUP BY partita_id
    ON CONFLICT(partita_id, tipo, chiave) DO UPDATE SET
      updated_at = MAX(lettura_partita.updated_at, excluded.updated_at)
  `).run(canonica, alias, canonica);
  db.prepare("DELETE FROM lettura_partita WHERE tipo = 'film' AND chiave = ?").run(alias);
}

export const migration048: Migration = {
  id: 48,
  name: 'progresso_film',
  up: (db) => {
    for (const [alias, canonica] of ALIAS_FILM) unisciAlias(db, alias, canonica);

    db.exec(`
      ALTER TABLE film ADD COLUMN sessioni INTEGER NOT NULL DEFAULT 1 CHECK (sessioni >= 1);
      UPDATE film SET sessioni = 2 WHERE dove = 'dvd';

      CREATE TABLE progresso_film_partita (
        partita_id  INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
        film_chiave TEXT NOT NULL REFERENCES film(chiave) ON DELETE CASCADE,
        avanzamento INTEGER NOT NULL CHECK (avanzamento >= 1),
        updated_at  TEXT NOT NULL,
        PRIMARY KEY (partita_id, film_chiave)
      );

      CREATE TABLE film_posizione (
        film_chiave TEXT NOT NULL REFERENCES film(chiave) ON DELETE CASCADE,
        ordine      INTEGER NOT NULL,
        tipo        TEXT NOT NULL CHECK (tipo IN ('quartiere','luogo','negozio','attivita')),
        chiave      TEXT NOT NULL,
        etichetta   TEXT NOT NULL,
        ruolo       TEXT NOT NULL CHECK (ruolo IN ('cinema','noleggio','visione')),
        PRIMARY KEY (film_chiave, ordine)
      );
    `);

    db.prepare(`
      INSERT INTO progresso_film_partita (partita_id, film_chiave, avanzamento, updated_at)
      SELECT lp.partita_id, lp.chiave, MAX(f.sessioni, 1), lp.updated_at
      FROM lettura_partita lp JOIN film f ON f.chiave = lp.chiave
      WHERE lp.tipo = 'film'
    `).run();

    // I database già esistenti devono ricevere subito la condizione strutturata. Sul database
    // nuovo la stessa regola viene materializzata dal parser del seed, di proprietà Lotto A.
    db.prepare(`UPDATE articolo SET condizioni_json = ?
      WHERE chiave = 'hinokuniya/anima-da-cineasta' AND origine = 'seed'`).run(JSON.stringify([
      { tipo: 'stato', chiave: 'visione-film-dvd-completata', confronto: 'almeno', valore: 1 },
    ]));
  },
};
