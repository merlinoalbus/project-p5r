// ============================================================
// Test 113 — la regola del boss di ogni Palazzo (L4 §8.15 punto 3)
// ============================================================

import { closeDb, prepared } from '../dbService.js';
import { migration113 } from './113_regola_del_boss.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('Iweleth segue la regola dei Memento, gli altri la voce del boss finale; il CHECK rifiuta altri valori; idempotente', () => {
  const db = dbDiProva();
  const regole = () => Object.fromEntries((prepared('SELECT chiave, regola_boss FROM dungeon ORDER BY chiave').all() as Array<{ chiave: string; regola_boss: string }>).map((r) => [r.chiave, r.regola_boss]));
  const r = regole();
  expect(r.iweleth).toBe('memento');
  expect(Object.entries(r).filter(([k]) => k !== 'iweleth').every(([, v]) => v === 'voce-finale')).toBe(true);
  expect(() => prepared("UPDATE dungeon SET regola_boss = 'altro' WHERE chiave = 'kamoshida'").run()).toThrow(/CHECK/);
  migration113.up(db);
  expect(regole()).toEqual(r);
});
