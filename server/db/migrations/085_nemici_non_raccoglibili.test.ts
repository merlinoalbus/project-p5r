// Test migrazione 085 — i nemici si rigenerano: non sono più da raccogliere
import { closeDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('toglie la collezionabilità agli spilli «Nemico» e lascia com’erano gli altri consumabili', () => {
  const db = dbDiProva();
  db.pragma(`main.user_version = ${migrations.find((m) => m.id === 85)!.id - 1}`);
  // un nemico ancora collezionabile, come lo lasciava la categoria di prima, accanto a un forziere
  db.exec("UPDATE spillo SET collezionabile = 1 WHERE tipo = 'nemico'");
  /** Esegue una query di conteggio (che restituisce la colonna `n`) e ne dà il numero. */
  const conta = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  const nemici = conta("SELECT COUNT(*) AS n FROM spillo WHERE tipo = 'nemico'");
  const forzieri = conta("SELECT COUNT(*) AS n FROM spillo WHERE tipo = 'forziere' AND collezionabile = 1");
  expect(nemici).toBeGreaterThan(0);
  runMigrations(db);
  expect(conta("SELECT COUNT(*) AS n FROM spillo WHERE tipo = 'nemico' AND collezionabile = 1")).toBe(0);
  expect(conta("SELECT COUNT(*) AS n FROM spillo WHERE tipo = 'forziere' AND collezionabile = 1")).toBe(forzieri);
});
