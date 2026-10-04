// ============================================================
// Test alberoMappe — sottoalbero di una mappa e Palazzo di una planimetria, con una regola sola (R3/B13)
// ============================================================

import { closeDb, getDb, prepared } from '../../db/dbService.js';
import { palazzoDellaMappa, radiceDelPalazzo, sottoalberoMappe } from './alberoMappe.js';
import { palazzoDiOgniMappa } from '../palazziService.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

beforeAll(() => { dbDiProva(); });
afterAll(() => closeDb());

describe('alberoMappe', () => {
  it('il sottoalbero di un Palazzo contiene la radice e tutte le discendenti, e solo loro', () => {
    const radice = radiceDelPalazzo('kamoshida');
    const sotto = sottoalberoMappe([radice]);
    expect(sotto.has(radice)).toBe(true);
    // ogni mappa con il genitore nel sottoalbero è nel sottoalbero, e viceversa (a parte la radice)
    const tutte = prepared('SELECT chiave, genitore_chiave FROM mappa').all() as Array<{ chiave: string; genitore_chiave: string | null }>;
    for (const m of tutte) {
      if (m.chiave === radice) continue;
      expect(sotto.has(m.chiave), m.chiave).toBe(m.genitore_chiave !== null && sotto.has(m.genitore_chiave));
    }
    expect(sotto.size).toBeGreaterThan(1);
    expect(sottoalberoMappe(['mappa-che-non-esiste']).size).toBe(0);
  });

  it('il Palazzo di ogni mappa è lo stesso con le due strade (una mappa → tutte le mappe)', () => {
    const palazzi = palazzoDiOgniMappa();
    const tutte = (prepared('SELECT chiave FROM mappa').all() as Array<{ chiave: string }>).map((m) => m.chiave);
    for (const m of tutte) expect(palazzoDellaMappa(m), m).toBe(palazzi.get(m) ?? null);
    expect(palazzoDellaMappa(null)).toBeNull();
    expect(palazzoDellaMappa('tokyo')).toBeNull();
  });

  it('un ciclo nei genitori (dato rovinato) non fa girare le query all\'infinito', () => {
    const db = getDb();
    db.pragma('foreign_keys = OFF');
    try {
      db.exec("INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, origine, updated_at) VALUES ('ciclo-a', 'A', 'area', 'ciclo-b', 0, 'utente', 'x'), ('ciclo-b', 'B', 'area', 'ciclo-a', 0, 'utente', 'x')");
      expect([...sottoalberoMappe(['ciclo-a'])].sort()).toEqual(['ciclo-a', 'ciclo-b']);
      expect(palazzoDellaMappa('ciclo-a')).toBeNull();
    } finally {
      db.exec("DELETE FROM mappa WHERE chiave IN ('ciclo-a', 'ciclo-b')");
      db.pragma('foreign_keys = ON');
    }
  });
});
