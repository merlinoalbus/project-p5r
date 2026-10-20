// ============================================================
// Test migrazione 111 — il carattere delle voci (L4 «Avanzamento unico», lotti/L4/modifiche.md §2.1, piano dei test §6.1 punto 9)
// ============================================================

import { closeDb, getDb, prepared } from '../dbService.js';
import { migration111 } from './111_carattere_delle_voci.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('aggiunge la colonna del carattere, tutta NULL (vale la regola), senza toccare nient’altro; ripetuta non fa niente', () => {
  dbDiProva();
  const colonne = () => (prepared('PRAGMA table_info(punto_interesse)').all() as Array<{ name: string }>).map((c) => c.name);
  expect(colonne()).toContain('carattere');
  expect(prepared('SELECT COUNT(*) FROM punto_interesse WHERE carattere IS NOT NULL').pluck().get()).toBe(0);
  const voci = JSON.stringify(prepared('SELECT * FROM punto_interesse ORDER BY chiave').all());
  migration111.up(getDb());
  migration111.up(getDb());
  expect(JSON.stringify(prepared('SELECT * FROM punto_interesse ORDER BY chiave').all())).toBe(voci);
  // il vincolo: solo i tre caratteri
  const una = prepared("SELECT chiave FROM punto_interesse WHERE area_dedalo_chiave IS NULL LIMIT 1").pluck().get() as string;
  expect(() => prepared("UPDATE punto_interesse SET carattere = 'boh' WHERE chiave = ?").run(una)).toThrow();
  prepared("UPDATE punto_interesse SET carattere = 'descrittiva' WHERE chiave = ?").run(una);
  expect(prepared('SELECT carattere FROM punto_interesse WHERE chiave = ?').pluck().get(una)).toBe('descrittiva');
});

it('su uno schema senza la colonna la aggiunge (prima della 111)', () => {
  dbDiProva();
  getDb().exec('ALTER TABLE punto_interesse DROP COLUMN carattere');
  migration111.up(getDb());
  expect((prepared('PRAGMA table_info(punto_interesse)').all() as Array<{ name: string }>).some((c) => c.name === 'carattere')).toBe(true);
});
