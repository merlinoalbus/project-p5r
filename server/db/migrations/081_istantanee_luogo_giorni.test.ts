// Test migrazione 081 — le istantanee dei luoghi ricevono giorni_json dalla frase; le righe della guida senza istantanea la riacquistano
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { aggiornaIstantanea } from './081_istantanee_luogo_giorni.js';

afterEach(() => closeDb());

it('converte la frase dell’istantanea come la 080 e non tocca chi ha già giorni_json', () => {
  const a = aggiornaIstantanea(JSON.stringify({ chiave: 'q/a', giorni: 'domenica (regolare) e festività', note: 'nota' }));
  expect(a.cambiata).toBe(true);
  expect(JSON.parse(a.istantanea)).toMatchObject({ giorni_json: '["domenica"]', note: 'nota · Giorni (dalla guida): domenica (regolare) e festività' });
  const b = aggiornaIstantanea(JSON.stringify({ chiave: 'q/b', giorni: null, note: null }));
  expect(JSON.parse(b.istantanea)).toMatchObject({ giorni_json: '[]', note: null });
  expect(aggiornaIstantanea(a.istantanea)).toEqual({ istantanea: a.istantanea, cambiata: false });
  expect(aggiornaIstantanea('non json')).toEqual({ istantanea: 'non json', cambiata: false });
});

it('sul database: istantanee aggiornate, riga della guida senza istantanea fotografata, idempotente', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 81));
  db.exec(`INSERT INTO quartiere (chiave, ordine, nome) VALUES ('q', 1, 'Q');
    INSERT INTO luogo (chiave, quartiere_chiave, ordine, tipo, nome, cosa_offre, giorni_json, seed_json) VALUES
      ('q/a', 'q', 1, 'altro', 'A', '', '["venerdi"]', '{"chiave":"q/a","giorni":"venerdì, sabato","note":null}'),
      ('q/b', 'q', 2, 'altro', 'B', '', '[]', NULL)`);
  runMigrations(db);
  const leggi = (k: string) => JSON.parse(db.prepare('SELECT seed_json FROM luogo WHERE chiave = ?').pluck().get(k) as string) as Record<string, unknown>;
  expect(leggi('q/a')).toMatchObject({ giorni_json: '["venerdi","sabato"]', note: null });
  expect(leggi('q/b')).toMatchObject({ chiave: 'q/b', nome: 'B', giorni_json: '[]' });
  expect(leggi('q/b')).not.toHaveProperty('origine');
  const prima = db.prepare('SELECT chiave, seed_json FROM luogo ORDER BY chiave').all();
  db.pragma('main.user_version = 80');
  runMigrations(db);
  expect(db.prepare('SELECT chiave, seed_json FROM luogo ORDER BY chiave').all()).toEqual(prima);
});

it('nel pacchetto ogni luogo della guida ha un’istantanea con giorni_json coerente con la riga', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  const righe = db.prepare("SELECT chiave, giorni_json, seed_json FROM luogo WHERE origine = 'seed'").all() as Array<{ chiave: string; giorni_json: string; seed_json: string | null }>;
  expect(righe.length).toBeGreaterThan(80);
  for (const r of righe) {
    expect(r.seed_json, r.chiave).not.toBeNull();
    expect((JSON.parse(r.seed_json!) as { giorni_json: string }).giorni_json, r.chiave).toBe(r.giorni_json);
  }
});
