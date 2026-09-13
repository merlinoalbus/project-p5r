// Test migrazione 082 — la colonna che dichiara il nome rivisto a mano: parte spenta per tutti e
// la accende solo il salvataggio del nome, non un salvataggio qualsiasi né un'importazione.
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { aggiornaMappa, importaMappe } from '../../services/mappe/mappeService.js';

afterEach(() => closeDb());

function conMappa() {
  const db = initDb(':memory:');
  runMigrations(db);
  db.prepare(`INSERT INTO mappa (chiave, nome, tipo, genitore_chiave, ordine, immagine_chiave, asset, larghezza, altezza, entita_tipo, entita_chiave, origine, note, updated_at)
    VALUES ('nativa', 'Area 4 — RMAP 153', 'area', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 'seed', '', '2026-09-09T00:00:00.000Z')`).run();
  return db;
}
const rivisto = (db: ReturnType<typeof initDb>, chiave = 'nativa') =>
  db.prepare('SELECT nome_rivisto FROM mappa WHERE chiave = ?').pluck().get(chiave) as number;

it('la colonna esiste, parte a 0 per tutte le righe ed è idempotente', () => {
  const db = conMappa();
  expect((db.prepare('PRAGMA table_info(mappa)').all() as Array<{ name: string }>).map((c) => c.name)).toContain('nome_rivisto');
  expect(rivisto(db)).toBe(0);
  db.pragma('main.user_version = 81');
  runMigrations(db);
  expect(rivisto(db)).toBe(0);
});

it('cambiare il nome lo accende; cambiare altro non lo tocca', () => {
  const db = conMappa();
  aggiornaMappa('nativa', { nome: 'Area 4 — RMAP 153', tipo: 'area', genitore: null, ordine: 0, note: 'solo una nota' });
  expect(rivisto(db)).toBe(0); // stesso nome: non è una revisione
  aggiornaMappa('nativa', { nome: 'Ripostiglio del seminterrato', tipo: 'area', genitore: null, ordine: 0, note: '' });
  expect(rivisto(db)).toBe(1);
  aggiornaMappa('nativa', { nome: 'Ripostiglio del seminterrato', tipo: 'area', genitore: null, ordine: 1, note: '' });
  expect(rivisto(db)).toBe(1); // una volta rivisto, resta rivisto
});

it('importare un pacchetto lo spegne: quel nome torna a essere quello dichiarato dal pacchetto', () => {
  const db = conMappa();
  aggiornaMappa('nativa', { nome: 'Ripostiglio del seminterrato', tipo: 'area', genitore: null, ordine: 0, note: '' });
  expect(rivisto(db)).toBe(1);
  importaMappe({ versione: 1, mappe: [{ chiave: 'nativa', nome: 'Area 4 — RMAP 153', tipo: 'area', genitore: null, ordine: 0, immagine: null, asset: null, larghezza: null, altezza: null, entita: null, note: '', spilli: [] }] }, { origine: 'utente', sovrascrivi: true });
  expect(rivisto(db)).toBe(0);
  expect(db.prepare('SELECT nome FROM mappa WHERE chiave = ?').pluck().get('nativa')).toBe('Area 4 — RMAP 153');
});
