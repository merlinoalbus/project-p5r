// ============================================================
// Test 104 e utente 021 — il cestino: la tabella nel file di gioco e la sua parte nel file delle partite
// ============================================================

import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migration104 } from './104_cestino.js';
import { utente021 } from '../migrazioniUtente/021_cestino_delle_partite.js';

afterEach(() => closeDb());

it('crea il cestino nel file di gioco e la parte delle partite nel loro file, con i vincoli; rieseguirle non cambia niente', () => {
  const db = initDb(':memory:');
  runMigrations(db);
  const colonne = (schema: string, tabella: string) => (db.prepare('SELECT name FROM pragma_table_info(?, ?)').all(tabella, schema) as Array<{ name: string }>).map((c) => c.name);
  expect(colonne('main', 'cestino')).toEqual(['id', 'uid', 'tipo', 'chiave', 'nome', 'contesto', 'riepilogo_json', 'registro_json', 'con_partite', 'vicini_json', 'eliminato_il']);
  expect(colonne('utente', 'cestino_partite')).toEqual(['uid', 'registro_json', 'eliminato_il']);
  // nel file giusto: il cestino non sta nelle partite, la parte delle partite non sta nel gioco
  expect(colonne('utente', 'cestino')).toEqual([]);
  expect(colonne('main', 'cestino_partite')).toEqual([]);
  const metti = db.prepare("INSERT INTO cestino (uid, tipo, chiave, nome, registro_json, eliminato_il) VALUES (?, ?, 'k', 'n', '[]', 'x')");
  for (const tipo of ['area', 'voce', 'mappa', 'area-dedalo']) metti.run(`u-${tipo}`, tipo);
  expect(() => metti.run('u-altro', 'persona')).toThrow(/CHECK/);
  expect(() => metti.run('u-area', 'area')).toThrow(/UNIQUE/);
  expect(db.prepare('SELECT riepilogo_json, contesto, con_partite FROM cestino WHERE uid = ?').get('u-area')).toEqual({ riepilogo_json: '{}', contesto: '', con_partite: 0 });
  // il runner non le riapplica, e anche rieseguite a mano (IF NOT EXISTS) lasciano tutto com'è
  runMigrations(db);
  migration104.up(db);
  utente021.up(db);
  expect(db.prepare('SELECT count(*) AS n FROM cestino').get()).toEqual({ n: 4 });
});
