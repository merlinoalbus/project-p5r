// ============================================================
// Migrazione 044 — lo stemma di un Palazzo non è una mappa
// ============================================================
//
// La 043 ammetteva tre ruoli per l'immagine di una mappa. Mancava il caso degli stemmi dei
// Palazzi: `palazzi/<chiave>` non è una pianta e non è nemmeno la mappa disegnata di un
// quartiere, è il segno che identifica il luogo. Trattarlo come un'illustrazione consultabile
// farebbe aprire un visore su uno stemma.
//
// SQLite non sa modificare un vincolo CHECK: la tabella va ricostruita. Si conserva lo schema
// esistente cambiando il solo vincolo, si copiano tutte le righe e si rimettono gli indici.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const VECCHIO = "CHECK (ruolo_immagine IN ('planimetria-nativa', 'illustrazione-editoriale', 'nessuna'))";
const NUOVO = "CHECK (ruolo_immagine IN ('planimetria-nativa', 'illustrazione-editoriale', 'emblema', 'nessuna'))";

export const migration044: Migration = {
  id: 44,
  name: 'ruolo_emblema',
  up: (db) => {
    const schema = (db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='mappa'").get() as { sql: string }).sql;
    if (schema.includes("'emblema'")) return;
    if (!schema.includes(VECCHIO)) throw new Error('Vincolo del ruolo dell’immagine inatteso: ricostruzione annullata.');
    const indici = (db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='mappa' AND sql IS NOT NULL").all() as Array<{ sql: string }>);
    const colonne = (db.prepare('PRAGMA table_info(mappa)').all() as Array<{ name: string }>).map((c) => `"${c.name}"`).join(',');
    db.exec(schema.replace(VECCHIO, NUOVO).replace(/CREATE TABLE "?mappa"?/i, 'CREATE TABLE mappa_nuova'));
    db.exec(`INSERT INTO mappa_nuova(${colonne}) SELECT ${colonne} FROM mappa;`);
    db.exec('PRAGMA legacy_alter_table = ON; DROP TABLE mappa; ALTER TABLE mappa_nuova RENAME TO mappa; PRAGMA legacy_alter_table = OFF;');
    indici.forEach((i) => db.exec(i.sql));
    db.exec("UPDATE mappa SET ruolo_immagine = 'emblema' WHERE asset LIKE 'palazzi/%'");
    const violazioni = db.pragma('foreign_key_check') as unknown[];
    if (violazioni.length) throw new Error('Ricostruzione della tabella delle mappe annullata: vincoli referenziali non soddisfatti.');
  },
};
