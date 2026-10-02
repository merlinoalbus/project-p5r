// ============================================================
// Test 095 — l'Enigma contiene i suoi passi
// ============================================================

import { closeDb, getDb, initDb, prepared } from '../dbService.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { migration095 } from './095_passi_degli_enigmi.js';

afterEach(() => closeDb());

it('la colonna c’è, nessuna voce è un passo; ripetuta non cambia niente; tolto l’Enigma, il passo resta voce dell’area', () => {
  initDb(':memory:');
  caricaPacchetto(getDb());
  expect(prepared("SELECT name FROM pragma_table_info('punto_interesse')").pluck().all()).toContain('contenitore_chiave');
  expect(prepared('SELECT COUNT(*) FROM punto_interesse WHERE contenitore_chiave IS NOT NULL').pluck().get()).toBe(0);
  const prima = prepared('SELECT chiave, ordine, contenitore_chiave FROM punto_interesse ORDER BY chiave').all();
  migration095.up(getDb());
  expect(prepared('SELECT chiave, ordine, contenitore_chiave FROM punto_interesse ORDER BY chiave').all()).toEqual(prima);
  // ON DELETE SET NULL: il vincolo stesso libera il passo
  const [enigma, passo] = prepared('SELECT chiave FROM punto_interesse ORDER BY chiave LIMIT 2').pluck().all() as string[];
  prepared('UPDATE punto_interesse SET contenitore_chiave = ? WHERE chiave = ?').run(enigma, passo);
  prepared('DELETE FROM punto_partita WHERE punto_chiave = ?').run(enigma);
  prepared('DELETE FROM marcatore_mappa WHERE punto_chiave = ?').run(enigma);
  prepared('UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE riferimento_tipo = ? AND riferimento_chiave = ?').run('punto', enigma);
  prepared('DELETE FROM punto_interesse WHERE chiave = ?').run(enigma);
  expect(prepared('SELECT contenitore_chiave FROM punto_interesse WHERE chiave = ?').pluck().get(passo)).toBeNull();
});
