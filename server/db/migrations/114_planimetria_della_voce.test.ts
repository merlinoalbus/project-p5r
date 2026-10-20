// ============================================================
// Test 114 — la planimetria della voce scelta a mano (L3, «planimetria della voce»): solo la colonna, nessun valore scritto
// ============================================================

import { closeDb, prepared } from '../dbService.js';
import { migration114 } from './114_planimetria_della_voce.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('aggiunge `punto_interesse.planimetria_chiave` vuota per tutte le voci, con l’indice; eliminata la planimetria il campo torna null; idempotente', () => {
  const db = dbDiProva();
  const colonne = (prepared('PRAGMA table_info(punto_interesse)').all() as Array<{ name: string }>).map((c) => c.name);
  expect(colonne).toContain('planimetria_chiave');
  // la migrazione non aggancia niente: l'aggancio a mano è dell'utente, la planimetria 1 si calcola alla lettura
  expect(prepared('SELECT COUNT(*) FROM punto_interesse WHERE planimetria_chiave IS NOT NULL').pluck().get()).toBe(0);
  expect(prepared("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = 'idx_punto_interesse_planimetria'").get()).toBeTruthy();
  const fk = prepared('PRAGMA foreign_key_list(punto_interesse)').all() as Array<{ table: string; from: string; to: string; on_delete: string; on_update: string }>;
  expect(fk.find((f) => f.from === 'planimetria_chiave')).toMatchObject({ table: 'mappa', to: 'chiave', on_delete: 'SET NULL', on_update: 'CASCADE' });
  // una planimetria eliminata lascia la voce senza aggancio, non la voce eliminata
  const voce = prepared("SELECT p.chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE a.dungeon_chiave = 'kamoshida' ORDER BY p.chiave LIMIT 1").pluck().get() as string;
  const nowIso = new Date().toISOString();
  prepared("INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, origine, updated_at) VALUES ('test-114', 'Test 114', 'area', 'dungeon-kamoshida', 999, 'utente', ?)").run(nowIso);
  prepared('UPDATE punto_interesse SET planimetria_chiave = ? WHERE chiave = ?').run('test-114', voce);
  prepared("DELETE FROM mappa WHERE chiave = 'test-114'").run();
  expect(prepared('SELECT planimetria_chiave FROM punto_interesse WHERE chiave = ?').pluck().get(voce)).toBeNull();
  migration114.up(db);
  expect((prepared('PRAGMA table_info(punto_interesse)').all() as Array<{ name: string }>).filter((c) => c.name === 'planimetria_chiave')).toHaveLength(1);
});
