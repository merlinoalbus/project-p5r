// Test migrazione 078 — il quiz in TV ha il suo tipo, gli esami portano i quesiti, gli id restano
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';

afterEach(() => closeDb());

it('estende il CHECK, converte «Game show in TV» e aggiunge i quesiti dalle righe degli esami', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 78));
  db.exec(`INSERT INTO domanda (id, ordine, data, tipo, chi, domanda, risposte_json) VALUES
      (5, 1, '05-19', 'altro', 'Game show in TV', 'Quale?', '[{"ordine":1,"testo":"Questa"}]'),
      (6, 2, '05-11', 'esame-medio', 'Esame 1', 'Domande su X', '[{"ordine":1,"testo":"La risposta lunga"}]'),
      (7, 3, '04-12', 'classe', 'Prof', 'Che ora è?', '[{"ordine":1,"testo":"Tardi"}]');
    INSERT INTO esame (chiave, ordine, nome, date_json, domande_json) VALUES ('esame-1', 0, 'Esame 1', '["05-11"]', '[{"data":"05-11","ordine":2,"domanda":"Seconda?","risposta":"B"},{"data":"05-11","ordine":1,"domanda":"Prima?","risposta":"A"}]');`);
  expect(() => db.exec("INSERT INTO domanda (ordine, data, tipo, domanda, risposte_json) VALUES (9, '01-01', 'tv', 'x', '[]')")).toThrow();
  runMigrations(db);
  expect(db.prepare('SELECT id, tipo FROM domanda ORDER BY id').all()).toEqual([{ id: 5, tipo: 'tv' }, { id: 6, tipo: 'esame-medio' }, { id: 7, tipo: 'classe' }]);
  expect(JSON.parse(db.prepare('SELECT risposte_json FROM domanda WHERE id = 6').pluck().get() as string)).toEqual([{ ordine: 1, testo: 'A', domanda: 'Prima?' }, { ordine: 2, testo: 'B', domanda: 'Seconda?' }]);
  expect(JSON.parse(db.prepare('SELECT risposte_json FROM domanda WHERE id = 7').pluck().get() as string)).toEqual([{ ordine: 1, testo: 'Tardi' }]);
  expect(() => db.exec("INSERT INTO domanda (ordine, data, tipo, domanda, risposte_json) VALUES (9, '01-01', 'tv', 'x', '[]')")).not.toThrow();
  expect(() => db.exec("INSERT INTO domanda (ordine, data, tipo, domanda, risposte_json) VALUES (10, '01-01', 'boh', 'x', '[]')")).toThrow();
  // gli indici sopravvivono alla ricostruzione
  expect(indiciDomanda(db)).toEqual(['idx_domanda_chiave', 'idx_domanda_data']);
});

const indiciDomanda = (db: ReturnType<typeof initDb>) => (db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'domanda' AND sql IS NOT NULL ORDER BY name").all() as Array<{ name: string }>).map((i) => i.name);

it('nel pacchetto le undici domande del quiz sono «tv», nessuna resta «altro», ogni riga d’esame porta i quesiti', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  expect(db.prepare('SELECT tipo, COUNT(*) AS n FROM domanda GROUP BY tipo ORDER BY tipo').all()).toEqual([{ tipo: 'classe', n: 55 }, { tipo: 'esame-finale', n: 6 }, { tipo: 'esame-medio', n: 6 }, { tipo: 'tv', n: 11 }]);
  const esami = db.prepare("SELECT risposte_json FROM domanda WHERE tipo IN ('esame-medio','esame-finale')").all() as Array<{ risposte_json: string }>;
  for (const r of esami) for (const risposta of JSON.parse(r.risposte_json) as Array<{ domanda?: string; testo: string }>) { expect(risposta.domanda).toBeTruthy(); expect(risposta.testo).toBeTruthy(); }
  expect(indiciDomanda(db)).toEqual(['idx_domanda_chiave', 'idx_domanda_data']);
  expect((db.prepare("SELECT sql FROM sqlite_master WHERE name = 'idx_domanda_chiave'").pluck().get() as string).toUpperCase()).toContain('UNIQUE');
});
