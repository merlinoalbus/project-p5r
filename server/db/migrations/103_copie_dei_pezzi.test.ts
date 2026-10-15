// ============================================================
// Test 103 — le copie dei pezzi: ogni pezzo della 102 diventa un ritaglio con la sua posa come prima copia, senza perdere niente
// ============================================================

import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';

afterEach(() => closeDb());

it('ogni pezzo diventa un ritaglio con una copia (posa e condizioni di prima); id e uid restano; la cascata vale ancora; le chiavi esterne reggono', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 103));
  db.prepare("INSERT INTO mappa (chiave, nome, tipo, updated_at) VALUES ('pianta', 'Pianta', 'area', 'x'), ('altra', 'Altra', 'area', 'x')").run();
  const pezzo = db.prepare(`INSERT INTO pezzo_mappa (id, uid, mappa_chiave, nome, sorgente_x, sorgente_y, larghezza, altezza, x, y, rotazione, specchio_orizzontale, specchio_verticale, condizioni_json, ordine, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  pezzo.run(7, 'a'.repeat(32), 'pianta', 'Muro', 10, 20, 30, 40, 500, 600, 90, 1, 0, '[{"tipo":"fascia","fascia":"sera"}]', 2, '2026-10-14T10:00:00.000Z');
  pezzo.run(9, 'b'.repeat(32), 'pianta', 'Passerella', 0, 0, 5, 5, 0, 0, 0, 0, 1, null, 0, '2026-10-14T11:00:00.000Z');
  pezzo.run(12, 'c'.repeat(32), 'altra', 'Porta', 1, 1, 2, 2, 3, 3, 270, 0, 0, null, 0, '2026-10-14T12:00:00.000Z');
  // un pezzo eliminato con l'id più alto: il contatore di AUTOINCREMENT resta a 20 e l'id non deve tornare
  pezzo.run(20, 'f'.repeat(32), 'altra', 'Eliminato', 0, 0, 1, 1, 0, 0, 0, 0, 0, null, 1, 'x');
  db.prepare('DELETE FROM pezzo_mappa WHERE id = 20').run();
  runMigrations(db);
  expect(db.pragma('user_version', { simple: true })).toBe(migrations[migrations.length - 1].id);
  // il ritaglio: niente più colonne della posa, id, uid, zona, ordine e data come prima
  const colonne = (db.prepare('PRAGMA table_info(pezzo_mappa)').all() as Array<{ name: string }>).map((c) => c.name);
  expect(colonne).toEqual(['id', 'uid', 'mappa_chiave', 'nome', 'sorgente_x', 'sorgente_y', 'larghezza', 'altezza', 'ordine', 'updated_at']);
  expect(db.prepare('SELECT * FROM pezzo_mappa ORDER BY id').all()).toEqual([
    { id: 7, uid: 'a'.repeat(32), mappa_chiave: 'pianta', nome: 'Muro', sorgente_x: 10, sorgente_y: 20, larghezza: 30, altezza: 40, ordine: 2, updated_at: '2026-10-14T10:00:00.000Z' },
    { id: 9, uid: 'b'.repeat(32), mappa_chiave: 'pianta', nome: 'Passerella', sorgente_x: 0, sorgente_y: 0, larghezza: 5, altezza: 5, ordine: 0, updated_at: '2026-10-14T11:00:00.000Z' },
    { id: 12, uid: 'c'.repeat(32), mappa_chiave: 'altra', nome: 'Porta', sorgente_x: 1, sorgente_y: 1, larghezza: 2, altezza: 2, ordine: 0, updated_at: '2026-10-14T12:00:00.000Z' },
  ]);
  // una copia per pezzo, con la posa e le condizioni che il pezzo aveva
  const copie = db.prepare('SELECT pezzo_id, etichetta, x, y, rotazione, specchio_orizzontale, specchio_verticale, condizioni_json, ordine, updated_at FROM copia_pezzo ORDER BY pezzo_id').all();
  expect(copie).toEqual([
    { pezzo_id: 7, etichetta: '', x: 500, y: 600, rotazione: 90, specchio_orizzontale: 1, specchio_verticale: 0, condizioni_json: '[{"tipo":"fascia","fascia":"sera"}]', ordine: 0, updated_at: '2026-10-14T10:00:00.000Z' },
    { pezzo_id: 9, etichetta: '', x: 0, y: 0, rotazione: 0, specchio_orizzontale: 0, specchio_verticale: 1, condizioni_json: null, ordine: 0, updated_at: '2026-10-14T11:00:00.000Z' },
    { pezzo_id: 12, etichetta: '', x: 3, y: 3, rotazione: 270, specchio_orizzontale: 0, specchio_verticale: 0, condizioni_json: null, ordine: 0, updated_at: '2026-10-14T12:00:00.000Z' },
  ]);
  const uid = db.prepare('SELECT uid FROM copia_pezzo').pluck().all() as string[];
  expect(uid.every((u) => /^[0-9a-f]{32}$/.test(u))).toBe(true);
  expect(new Set(uid).size).toBe(3);
  // la copia punta al ritaglio ricostruito (stesso nome di tabella), e le chiavi esterne reggono
  expect(db.pragma('foreign_key_check')).toEqual([]);
  expect((db.prepare('PRAGMA foreign_key_list(copia_pezzo)').all() as Array<{ table: string; on_delete: string }>).map((f) => [f.table, f.on_delete])).toEqual([['pezzo_mappa', 'CASCADE']]);
  expect((db.prepare('PRAGMA foreign_key_list(pezzo_mappa)').all() as Array<{ table: string; on_delete: string }>).map((f) => [f.table, f.on_delete])).toEqual([['mappa', 'CASCADE']]);
  // il contatore degli id è passato alla tabella ricostruita: il prossimo pezzo è il 21, non il 13
  expect(db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'pezzo_mappa'").pluck().get()).toBe(20);
  expect(Number(db.prepare("INSERT INTO pezzo_mappa (uid, mappa_chiave, nome, sorgente_x, sorgente_y, larghezza, altezza, updated_at) VALUES (?, 'altra', 'Nuovo', 0, 0, 1, 1, 'x')").run('9'.repeat(32)).lastInsertRowid)).toBe(21);
  db.prepare('DELETE FROM pezzo_mappa WHERE id = 21').run();
  // eliminando la mappa se ne vanno ritagli e copie (in cascata)
  db.prepare("DELETE FROM mappa WHERE chiave = 'pianta'").run();
  expect(db.prepare('SELECT id FROM pezzo_mappa').pluck().all()).toEqual([12]);
  expect(db.prepare('SELECT pezzo_id FROM copia_pezzo').pluck().all()).toEqual([12]);
  // l'indice dei ritagli c'è ancora, quello delle copie anche
  expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name IN ('idx_pezzo_mappa_mappa', 'idx_copia_pezzo_pezzo') ORDER BY name").pluck().all()).toEqual(['idx_copia_pezzo_pezzo', 'idx_pezzo_mappa_mappa']);
});

it('ripetuta su uno schema già convertito non cambia niente', () => {
  const db = initDb(':memory:');
  runMigrations(db);
  db.prepare("INSERT INTO mappa (chiave, nome, tipo, updated_at) VALUES ('pianta', 'Pianta', 'area', 'x')").run();
  db.prepare("INSERT INTO pezzo_mappa (id, uid, mappa_chiave, nome, sorgente_x, sorgente_y, larghezza, altezza, updated_at) VALUES (1, ?, 'pianta', 'Muro', 0, 0, 5, 5, 'x')").run('d'.repeat(32));
  db.prepare("INSERT INTO copia_pezzo (uid, pezzo_id, x, y, updated_at) VALUES (?, 1, 4, 4, 'x')").run('e'.repeat(32));
  const m103 = migrations.find((m) => m.id === 103)!;
  m103.up(db);
  expect(db.prepare('SELECT COUNT(*) FROM pezzo_mappa').pluck().get()).toBe(1);
  expect(db.prepare('SELECT uid, x, y FROM copia_pezzo').all()).toEqual([{ uid: 'e'.repeat(32), x: 4, y: 4 }]);
});
