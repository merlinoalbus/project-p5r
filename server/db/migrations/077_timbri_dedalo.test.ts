// Test migrazione 077 — i timbri totali di un dedalo si leggono dalla descrizione, e i mancanti restano nulli
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { timbriDallaDescrizione } from './077_timbri_dedalo.js';

afterEach(() => closeDb());

it('legge «20 Timbri totali» e lascia nullo ciò che la guida non dichiara', () => {
  expect(timbriDallaDescrizione('10 Aree (Area 1-10); Sala d’attesa in Area 6; 20 Timbri totali Palazzo di Kaneshiro completato.')).toBe(20);
  expect(timbriDallaDescrizione('2 Aree (Area 1 e Area 2) Sblocco: 7 maggio.')).toBeNull();
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 77));
  db.exec(`INSERT INTO dungeon (chiave, tipo, ordine, nome) VALUES ('mementos', 'mementos', 1, 'Memento');
    INSERT INTO dungeon_area (chiave, dungeon_chiave, ordine, nome, descrizione) VALUES ('m-1', 'mementos', 1, 'Uno', '8 Timbri totali'), ('m-2', 'mementos', 2, 'Due', 'niente');`);
  runMigrations(db);
  expect(db.prepare('SELECT chiave, timbri_totale FROM dungeon_area ORDER BY ordine').all()).toEqual([{ chiave: 'm-1', timbri_totale: 8 }, { chiave: 'm-2', timbri_totale: null }]);
  expect(db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' AND name = 'timbri_dedalo_partita'").get()).toBeTruthy();
});

it('nel pacchetto sei dedali su nove hanno i timbri dichiarati', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  const righe = db.prepare("SELECT chiave, timbri_totale FROM dungeon_area WHERE dungeon_chiave = 'mementos' ORDER BY ordine").all() as Array<{ chiave: string; timbri_totale: number | null }>;
  expect(righe.map((r) => r.timbri_totale)).toEqual([null, 8, null, 20, 25, 30, 30, null, 40]);
});
