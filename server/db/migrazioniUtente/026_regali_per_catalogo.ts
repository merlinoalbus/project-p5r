// L7: il nome storico e la data di consegna non cambiano. Nessun vincolo fra i due file SQLite.
import type { Migration } from '../migrationRunner.js';

export const utente026: Migration = {
  id: 26, name: 'regali_per_catalogo',
  up(db) {
    const colonne = db.prepare('PRAGMA utente.table_info(regalo_partita)').all() as Array<{ name: string }>;
    if (!colonne.some((c) => c.name === 'catalogo_chiave')) db.exec('ALTER TABLE utente.regalo_partita ADD COLUMN catalogo_chiave TEXT');
    db.exec('CREATE INDEX IF NOT EXISTS utente.idx_regalo_catalogo ON regalo_partita(partita_id,confidente_chiave,catalogo_chiave)');
    // Il runner applica prima le migrazioni di gioco. Se il catalogo manca, conservare le consegne per nome senza inventare puntatori.
    const catalogo = db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'catalogo_oggetto'").get();
    if (!catalogo) return;
    const corrispondenze = db.prepare(`SELECT DISTINCT g.catalogo_chiave FROM main.confidente_regalo g
      WHERE g.confidente_chiave = ? AND g.nome = ? AND g.catalogo_chiave IS NOT NULL`);
    for (const r of db.prepare('SELECT partita_id,confidente_chiave,regalo FROM utente.regalo_partita WHERE catalogo_chiave IS NULL').all() as Array<{ partita_id: number; confidente_chiave: string; regalo: string }>) {
      const candidati = corrispondenze.all(r.confidente_chiave, r.regalo) as Array<{ catalogo_chiave: string }>;
      if (candidati.length === 1) db.prepare(`UPDATE utente.regalo_partita SET catalogo_chiave = ?
        WHERE partita_id = ? AND confidente_chiave = ? AND regalo = ? AND catalogo_chiave IS NULL`)
        .run(candidati[0].catalogo_chiave, r.partita_id, r.confidente_chiave, r.regalo);
    }
  },
};
