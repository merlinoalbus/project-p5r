// ============================================================
// Test 099 — le aree dei dedali: ogni dedalo con voci, Richieste o timbri riceve «Area 1» con tutto quel che aveva
// ============================================================

import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { chiaveAreaIniziale, migration099 } from './099_aree_dei_dedali.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('crea Area 1 nei dedali che hanno qualcosa, ci porta voci, Richieste e timbri, toglie la colonna dal dedalo; ripetuta non cambia niente', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 99));
  db.exec(`INSERT INTO dungeon (chiave, tipo, ordine, nome) VALUES ('mementos', 'mementos', 9, 'Memento'), ('kamoshida', 'palazzo', 1, 'Kamoshida');
    INSERT INTO dungeon_area (chiave, dungeon_chiave, ordine, nome, descrizione, timbri_totale) VALUES
      ('m-1', 'mementos', 0, 'Uno', '', NULL), ('m-2', 'mementos', 1, 'Due', '', 8), ('m-3', 'mementos', 2, 'Tre', '', NULL), ('m-4', 'mementos', 3, 'Quattro', '', NULL),
      ('k-1', 'kamoshida', 0, 'Ingresso', '', NULL);
    INSERT INTO punto_interesse (chiave, area_chiave, ordine, tipo, nome) VALUES ('m-1/0', 'm-1', 0, 'altro', 'Nota'), ('m-1/1', 'm-1', 1, 'persona', 'Ombra'), ('k-1/0', 'k-1', 0, 'sicura', 'Sicura');
    INSERT INTO richiesta (chiave, ordine, nome, area, area_chiave, bersaglio_json) VALUES ('r-1', 0, 'Prima', 'Tre', 'm-3', '{}'), ('r-2', 1, 'Seconda', 'Uno', 'm-1', '{}');`);
  runMigrations(db);
  // Uno (voci e una Richiesta), Due (solo timbri), Tre (solo una Richiesta) hanno Area 1; Quattro, vuoto, no
  expect(db.prepare('SELECT chiave, dedalo_chiave, ordine, nome, descrizione, timbri_totale FROM area_dedalo ORDER BY chiave').all()).toEqual([
    { chiave: 'm-1-area-1', dedalo_chiave: 'm-1', ordine: 0, nome: 'Area 1', descrizione: '', timbri_totale: null },
    { chiave: 'm-2-area-1', dedalo_chiave: 'm-2', ordine: 0, nome: 'Area 1', descrizione: '', timbri_totale: 8 },
    { chiave: 'm-3-area-1', dedalo_chiave: 'm-3', ordine: 0, nome: 'Area 1', descrizione: '', timbri_totale: null },
  ]);
  expect(chiaveAreaIniziale('m-1')).toBe('m-1-area-1');
  // le voci del dedalo nella sua Area 1, quelle dei Palazzi senza area del dedalo; le Richieste nella loro
  expect(db.prepare('SELECT chiave, area_dedalo_chiave FROM punto_interesse ORDER BY chiave').all()).toEqual([
    { chiave: 'k-1/0', area_dedalo_chiave: null }, { chiave: 'm-1/0', area_dedalo_chiave: 'm-1-area-1' }, { chiave: 'm-1/1', area_dedalo_chiave: 'm-1-area-1' },
  ]);
  expect(db.prepare('SELECT chiave, area_dedalo_chiave FROM richiesta ORDER BY chiave').all()).toEqual([{ chiave: 'r-1', area_dedalo_chiave: 'm-3-area-1' }, { chiave: 'r-2', area_dedalo_chiave: 'm-1-area-1' }]);
  // il totale dei timbri non sta più nel dedalo: una sola verità
  expect((db.prepare('PRAGMA table_info(dungeon_area)').all() as Array<{ name: string }>).map((c) => c.name)).not.toContain('timbri_totale');
  // tolta l'area, la Richiesta resta nel dedalo senza area (da collocare)
  db.pragma('foreign_keys = ON');
  db.prepare("DELETE FROM area_dedalo WHERE chiave = 'm-3-area-1'").run();
  expect(db.prepare("SELECT area_chiave, area_dedalo_chiave FROM richiesta WHERE chiave = 'r-1'").get()).toEqual({ area_chiave: 'm-3', area_dedalo_chiave: null });
  // ripetuta: senza la colonna dei timbri e con le aree già fatte, niente di nuovo (Tre non ha più voci né timbri, ma la Richiesta sì)
  const prima = db.prepare('SELECT * FROM area_dedalo ORDER BY chiave').all();
  migration099.up(db);
  expect(db.prepare('SELECT chiave FROM area_dedalo ORDER BY chiave').pluck().all()).toEqual(['m-1-area-1', 'm-2-area-1', 'm-3-area-1']);
  expect(db.prepare("SELECT timbri_totale FROM area_dedalo WHERE chiave = 'm-3-area-1'").pluck().get()).toBeNull();
  expect(db.prepare("SELECT area_dedalo_chiave FROM richiesta WHERE chiave = 'r-1'").pluck().get()).toBe('m-3-area-1');
  expect(db.prepare("SELECT * FROM area_dedalo WHERE chiave <> 'm-3-area-1' ORDER BY chiave").all()).toEqual(prima);
});

it('nel pacchetto ogni voce e ogni Richiesta dei dedali sta in un\'area del suo dedalo, e ogni dedalo ha la sua Area 1', () => {
  const db = dbDiProva();
  expect(db.prepare("SELECT COUNT(*) FROM punto_interesse p JOIN dungeon_area d ON d.chiave = p.area_chiave WHERE d.dungeon_chiave = 'mementos' AND p.area_dedalo_chiave IS NULL").pluck().get()).toBe(0);
  expect(db.prepare("SELECT COUNT(*) FROM punto_interesse p JOIN dungeon_area d ON d.chiave = p.area_chiave WHERE d.dungeon_chiave <> 'mementos' AND p.area_dedalo_chiave IS NOT NULL").pluck().get()).toBe(0);
  // l'area di ogni voce e di ogni Richiesta è del suo stesso dedalo
  expect(db.prepare('SELECT COUNT(*) FROM punto_interesse p JOIN area_dedalo ad ON ad.chiave = p.area_dedalo_chiave WHERE ad.dedalo_chiave <> p.area_chiave').pluck().get()).toBe(0);
  expect(db.prepare('SELECT COUNT(*) FROM richiesta WHERE area_dedalo_chiave IS NULL').pluck().get()).toBe(0);
  expect(db.prepare('SELECT COUNT(*) FROM richiesta r JOIN area_dedalo ad ON ad.chiave = r.area_dedalo_chiave WHERE ad.dedalo_chiave <> r.area_chiave').pluck().get()).toBe(0);
  const senzaAree = db.prepare("SELECT d.chiave FROM dungeon_area d WHERE d.dungeon_chiave = 'mementos' AND NOT EXISTS (SELECT 1 FROM area_dedalo ad WHERE ad.dedalo_chiave = d.chiave)").pluck().all() as string[];
  expect(senzaAree).toEqual([]);
});
