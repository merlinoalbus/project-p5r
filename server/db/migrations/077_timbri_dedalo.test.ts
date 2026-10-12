// Test migrazione 077 — i timbri totali di un dedalo si leggono dalla descrizione, e i mancanti restano nulli
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { timbriDallaDescrizione } from './077_timbri_dedalo.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('legge «20 Timbri totali» e lascia nullo ciò che la guida non dichiara', () => {
  expect(timbriDallaDescrizione('10 Aree (Area 1-10); Sala d’attesa in Area 6; 20 Timbri totali Palazzo di Kaneshiro completato.')).toBe(20);
  expect(timbriDallaDescrizione('2 Aree (Area 1 e Area 2) Sblocco: 7 maggio.')).toBeNull();
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 77));
  db.exec(`INSERT INTO dungeon (chiave, tipo, ordine, nome) VALUES ('mementos', 'mementos', 1, 'Memento');
    INSERT INTO dungeon_area (chiave, dungeon_chiave, ordine, nome, descrizione) VALUES ('m-1', 'mementos', 1, 'Uno', '8 Timbri totali'), ('m-2', 'mementos', 2, 'Due', 'niente');`);
  // fino alla 098: dalla 099 il totale passa nell'area del dedalo (`area_dedalo.timbri_totale`)
  runMigrations(db, migrations.filter((m) => m.id < 99));
  expect(db.prepare('SELECT chiave, timbri_totale FROM dungeon_area ORDER BY ordine').all()).toEqual([{ chiave: 'm-1', timbri_totale: 8 }, { chiave: 'm-2', timbri_totale: null }]);
  expect(db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' AND name = 'timbri_dedalo_partita'").get()).toBeTruthy();
});

it('nel pacchetto i totali dei timbri sono per area e li imposta l\'utente (101): nessuno ancora; quello di sei dedali resta nella descrizione', () => {
  const db = dbDiProva();
  // la 099 aveva messo il totale del dedalo nell'Area 1; con le aree reali (101) si svuota: la guida non dice quanti per area
  expect(db.prepare("SELECT COUNT(*) FROM area_dedalo ad JOIN dungeon_area d ON d.chiave = ad.dedalo_chiave WHERE d.dungeon_chiave = 'mementos' AND ad.timbri_totale IS NOT NULL").pluck().get()).toBe(0);
  const scritti = (db.prepare("SELECT descrizione FROM dungeon_area WHERE dungeon_chiave = 'mementos' ORDER BY ordine").pluck().all() as string[]).map((t) => /(\d+) Timbri totali/.exec(t)?.[1] ?? null);
  expect(scritti).toEqual([null, '8', null, '20', '25', '30', '30', null, '40']);
});
