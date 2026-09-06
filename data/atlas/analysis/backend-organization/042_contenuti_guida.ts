import type { Migration } from '../migrationRunner.js';
import { riconciliaAreeGuida } from '../../services/mappe/organizzazioneMappe.js';
export const migration042: Migration = { id: 42, name: 'contenuti_guida_distinti_da_planimetrie', up(db) {
  db.exec(`CREATE TABLE guida_mappa(area_chiave TEXT PRIMARY KEY REFERENCES dungeon_area(chiave) ON DELETE CASCADE,nome TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',metadata_json TEXT NOT NULL DEFAULT '{}');
    CREATE TABLE guida_alias(chiave TEXT PRIMARY KEY,area_chiave TEXT NOT NULL REFERENCES dungeon_area(chiave) ON DELETE CASCADE);
    CREATE TABLE mappa_entita(mappa_chiave TEXT NOT NULL REFERENCES mappa(chiave) ON DELETE CASCADE,entita_tipo TEXT NOT NULL,entita_chiave TEXT NOT NULL,fonte_json TEXT NOT NULL,PRIMARY KEY(mappa_chiave,entita_tipo,entita_chiave));
    CREATE TABLE organizzazione_mappa_esito(chiave TEXT PRIMARY KEY,motivo TEXT NOT NULL);`);
  const schema = (db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='spillo'").get() as { sql: string }).sql;
  const indici = db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='spillo' AND sql IS NOT NULL").all() as Array<{ sql: string }>;
  const colonne = (db.prepare('PRAGMA table_info(spillo)').all() as Array<{ name: string }>).map(c => '"' + c.name + '"').join(',');
  const nuovo = schema.replace(/CREATE TABLE spillo/i, 'CREATE TABLE spillo_nuovo').replace(/mappa_chiave\s+TEXT NOT NULL/i, 'mappa_chiave TEXT').replace(/\)\s*$/, ",area_guida_chiave TEXT REFERENCES dungeon_area(chiave) ON DELETE RESTRICT,ruolo_guida TEXT CHECK(ruolo_guida IN ('punto','sezione')),CHECK((mappa_chiave IS NOT NULL AND area_guida_chiave IS NULL AND ruolo_guida IS NULL) OR (mappa_chiave IS NULL AND area_guida_chiave IS NOT NULL AND ruolo_guida IS NOT NULL)))");
  db.exec(nuovo);
  db.exec(`INSERT INTO spillo_nuovo(${colonne}) SELECT ${colonne} FROM spillo; DROP TABLE spillo; ALTER TABLE spillo_nuovo RENAME TO spillo;`);
  indici.forEach(i => db.exec(i.sql));
  db.exec('CREATE INDEX idx_spillo_area_guida ON spillo(area_guida_chiave)');
  riconciliaAreeGuida(db);
} };
