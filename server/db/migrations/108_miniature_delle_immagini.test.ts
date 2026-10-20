// ============================================================
// Test 108 — la tabella delle miniature (L1, variante «miniature»): creata vuota, misure ammesse, cascata con la sorgente
// ============================================================

import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';

afterEach(() => closeDb());

it('crea immagine_miniatura vuota; solo le misure ammesse; eliminata la sorgente, le miniature se ne vanno; le altre tabelle invariate', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 108));
  db.prepare("INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, contenuto) VALUES ('altro', 'x', 'x.png', 'image/png', 1, 'v1', x'01')").run();
  const prima = db.prepare('SELECT COUNT(*) AS n, SUM(byte) AS byte FROM immagine').get();
  runMigrations(db);
  expect(db.pragma('main.user_version', { simple: true })).toBeGreaterThanOrEqual(108);
  expect(db.prepare('SELECT COUNT(*) FROM immagine_miniatura').pluck().get()).toBe(0);
  expect(db.prepare('SELECT COUNT(*) AS n, SUM(byte) AS byte FROM immagine').get()).toEqual(prima);
  const id = db.prepare("SELECT id FROM immagine WHERE chiave = 'x'").pluck().get() as number;
  const inserisci = (l: number) => db.prepare("INSERT INTO immagine_miniatura VALUES (?, ?, 'v1', 'image/webp', 1, 1, 1, x'00', 'x')").run(id, l);
  for (const l of [160, 320, 640, 1024]) inserisci(l);
  expect(() => inserisci(300)).toThrow(/CHECK/);
  expect(() => inserisci(160)).toThrow(/UNIQUE|PRIMARY/);
  db.prepare('DELETE FROM immagine WHERE id = ?').run(id);
  expect(db.prepare('SELECT COUNT(*) FROM immagine_miniatura').pluck().get()).toBe(0);
});
