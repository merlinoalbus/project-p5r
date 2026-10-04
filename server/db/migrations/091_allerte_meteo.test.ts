// ============================================================
// Test 091 — le allerte meteo del catalogo diventano giorni e fasce
// ============================================================

import { closeDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { leggiDateAllerta } from '../../../shared/meteoPartita.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('legge le date: per tutte le fasce, «(solo di giorno)», «(sera)», «(notte)» e gli intervalli', () => {
  expect(leggiDateAllerta(['Effetto qualsiasi.', 'Date: 27/7, 29/7 (sera), 1/8 (giorno), 8/8 (notte).'])).toEqual([
    { dal: '07-27', al: '07-27', fasce: ['giorno', 'sera'] },
    { dal: '07-29', al: '07-29', fasce: ['sera'] },
    { dal: '08-01', al: '08-01', fasce: ['giorno'] },
    { dal: '08-08', al: '08-08', fasce: ['sera'] },
  ]);
  expect(leggiDateAllerta(['Date (solo di sera): 15/8, 22/8-26/8'])).toEqual([
    { dal: '08-15', al: '08-15', fasce: ['sera'] },
    { dal: '08-22', al: '08-26', fasce: ['sera'] },
  ]);
  expect(leggiDateAllerta(['Nessuna data qui'])).toEqual([]);
});

it('sul pacchetto: ogni allerta con i suoi giorni e le sue fasce, come nel catalogo', () => {
  const db = dbDiProva();
  const conta = (chiave: string, fascia: string) => (db.prepare('SELECT COUNT(*) AS n FROM allerta_meteo WHERE chiave = ? AND fascia = ?').get(chiave, fascia) as { n: number }).n;
  expect([conta('pioggia-torrenziale', 'giorno'), conta('pioggia-torrenziale', 'sera')]).toEqual([6, 8]);
  expect([conta('allerta-polline', 'giorno'), conta('allerta-polline', 'sera')]).toEqual([8, 8]);
  expect([conta('ondata-di-calore', 'giorno'), conta('ondata-di-calore', 'sera')]).toEqual([13, 0]);
  expect([conta('notte-torrida', 'giorno'), conta('notte-torrida', 'sera')]).toEqual([0, 17]);
  expect([conta('stagione-influenzale', 'giorno'), conta('ondata-di-gelo', 'sera')]).toEqual([5, 2]);
  // l'intervallo 22/8-26/8 della notte torrida è espanso giorno per giorno
  expect((db.prepare("SELECT GROUP_CONCAT(data) AS d FROM (SELECT data FROM allerta_meteo WHERE chiave = 'notte-torrida' AND data BETWEEN '08-22' AND '08-26' ORDER BY data)").get() as { d: string }).d).toBe('08-22,08-23,08-24,08-25,08-26');
  // rifatta, non duplica niente
  const prima = (db.prepare('SELECT COUNT(*) AS n FROM allerta_meteo').get() as { n: number }).n;
  db.pragma('main.user_version = 90');
  runMigrations(db);
  expect((db.prepare('SELECT COUNT(*) AS n FROM allerta_meteo').get() as { n: number }).n).toBe(prima);
});
