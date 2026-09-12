// Test migrazione 070 — le condizioni del negozio passano agli articoli, unite alle loro
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';

afterEach(() => closeDb());

const condizioni = (db: ReturnType<typeof initDb>, chiave: string) => JSON.parse(db.prepare('SELECT condizioni_json FROM articolo WHERE chiave = ?').pluck().get(chiave) as string) as unknown[];

it('unisce le condizioni del negozio a quelle dell’articolo, svuota il negozio e converte le frasi residue', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 70));
  db.exec(`INSERT INTO negozio (chiave, ordine, nome, tipo, condizioni_json) VALUES ('n', 1, 'N', 'misto', '[{"tipo":"data","dal":"04-18"}]');
    INSERT INTO articolo (chiave, negozio_chiave, ordine, nome, categoria, condizioni_json, condizione) VALUES
      ('n/a', 'n', 1, 'A', 'altro', '[]', NULL),
      ('n/b', 'n', 2, 'B', 'altro', '[{"tipo":"piove"}]', NULL),
      ('n/c', 'n', 3, 'C', 'altro', NULL, 'rango cliente Nero'),
      ('n/d', 'n', 4, 'D', 'altro', NULL, 'rango cliente Iniziale');`);
  runMigrations(db);
  expect(condizioni(db, 'n/a')).toEqual([{ tipo: 'data', dal: '04-18' }]);
  expect(condizioni(db, 'n/b')).toEqual([{ tipo: 'data', dal: '04-18' }, { tipo: 'piove' }]);
  expect(condizioni(db, 'n/c')).toEqual([{ tipo: 'data', dal: '04-18' }, { tipo: 'rango-cliente', negozio: 'n', rango: 'nero' }]);
  // il grado iniziale è il punto di partenza: nessuna condizione oltre quella del negozio
  expect(condizioni(db, 'n/d')).toEqual([{ tipo: 'data', dal: '04-18' }]);
  expect(db.prepare("SELECT condizioni_json FROM negozio WHERE chiave = 'n'").pluck().get()).toBe('[]');
});

it('nel pacchetto nessun negozio porta condizioni e gli articoli di Takemi chiedono il Confidente', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  expect(db.prepare("SELECT COUNT(*) FROM negozio WHERE condizioni_json IS NOT NULL AND condizioni_json <> '[]'").pluck().get()).toBe(0);
  const takemi = db.prepare("SELECT condizioni_json FROM articolo WHERE negozio_chiave = 'clinica-takemi'").all() as Array<{ condizioni_json: string }>;
  expect(takemi.length).toBeGreaterThan(0);
  for (const a of takemi) expect(JSON.parse(a.condizioni_json)).toContainEqual({ tipo: 'confidente', confidente: 'takemi', rango: 1 });
  expect(condizioni(db, 'tanaka-affari-loschi/hercules-anklet')).toContainEqual({ tipo: 'rango-cliente', negozio: 'tanaka-affari-loschi', rango: 'nero' });
  expect(condizioni(db, 'tanaka-affari-loschi/nirvana-ring').some((c) => (c as { tipo: string }).tipo === 'rango-cliente')).toBe(false);
});
