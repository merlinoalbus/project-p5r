// Test migrazione 071 — un luogo ha origine, nascosto, fotografia della guida e regola di presenza
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';

afterEach(() => closeDb());

it('prende la regola da sblocco-luoghi e fotografa la riga della guida', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 71));
  db.exec(`INSERT INTO quartiere (chiave, ordine, nome) VALUES ('q', 1, 'Q');
    INSERT INTO luogo (chiave, quartiere_chiave, ordine, tipo, nome) VALUES ('q/a', 'q', 1, 'negozio', 'A'), ('q/b', 'q', 2, 'negozio', 'B');
    INSERT OR REPLACE INTO dati_guida (chiave, json) VALUES ('sblocco-luoghi', '{"luoghi":[{"chiave":"q/a","condizioni":[{"tipo":"data","dal":"06-01"}]},{"chiave":"q/ignoto","condizioni":[{"tipo":"piove"}]}]}');`);
  runMigrations(db);
  const a = db.prepare("SELECT origine, nascosto, condizioni_json, seed_json, updated_at FROM luogo WHERE chiave = 'q/a'").get() as { origine: string; nascosto: number; condizioni_json: string; seed_json: string; updated_at: string };
  expect(a.origine).toBe('seed'); expect(a.nascosto).toBe(0); expect(a.updated_at).toBeTruthy();
  expect(JSON.parse(a.condizioni_json)).toEqual([{ tipo: 'data', dal: '06-01' }]);
  expect(JSON.parse(a.seed_json)).toMatchObject({ chiave: 'q/a', quartiere_chiave: 'q', tipo: 'negozio', nome: 'A' });
  expect(db.prepare("SELECT condizioni_json FROM luogo WHERE chiave = 'q/b'").pluck().get()).toBe('[]');
});

it('nel pacchetto i tredici luoghi con una regola la portano sulla riga, e tutti hanno la fotografia', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  const r = db.prepare("SELECT COUNT(*) AS n, SUM(condizioni_json <> '[]') AS conRegola, SUM(seed_json IS NOT NULL) AS conSeed, SUM(origine = 'seed') AS seed FROM luogo").get() as { n: number; conRegola: number; conSeed: number; seed: number };
  expect(r.conRegola).toBe(13);
  expect(r.conSeed).toBe(r.n);
  expect(r.seed).toBe(r.n);
  expect(JSON.parse(db.prepare("SELECT condizioni_json FROM luogo WHERE chiave = 'ichigaya/laghetto-ichigaya'").pluck().get() as string)).toEqual([{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [{ tipo: 'lettura', categoria: 'libro', chiave: 'vedetta-lacustre' }, { tipo: 'data', dal: '07-06' }] }]);
});
