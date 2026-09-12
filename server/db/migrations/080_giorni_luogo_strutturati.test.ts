// Test migrazione 080 — i giorni dei luoghi diventano chiavi; ciò che non è un giorno resta nelle note com'era scritto
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { giorniDallaFrase } from './080_giorni_luogo_strutturati.js';

afterEach(() => closeDb());

it('legge gli elenchi puliti, ignora la settimana intera e tiene da parte le precisazioni', () => {
  expect(giorniDallaFrase('martedì, giovedì, sabato, domenica')).toEqual({ giorni: ['martedi', 'giovedi', 'sabato', 'domenica'], resto: null });
  expect(giorniDallaFrase('venerdì, sabato')).toEqual({ giorni: ['venerdi', 'sabato'], resto: null });
  expect(giorniDallaFrase('tutti i giorni (lunedì-domenica)')).toEqual({ giorni: [], resto: null });
  expect(giorniDallaFrase('lunedì, martedì, mercoledì, giovedì, venerdì, sabato, domenica')).toEqual({ giorni: [], resto: null });
  expect(giorniDallaFrase('giovedì, sabato, domenica (per il Confidente Iwai)')).toEqual({ giorni: ['giovedi', 'sabato', 'domenica'], resto: 'giovedì, sabato, domenica (per il Confidente Iwai)' });
  expect(giorniDallaFrase('domenica (regolare) e festività')).toEqual({ giorni: ['domenica'], resto: 'domenica (regolare) e festività' });
  expect(giorniDallaFrase('nei giorni di pioggia')).toEqual({ giorni: [], resto: 'nei giorni di pioggia' });
  expect(giorniDallaFrase(null)).toEqual({ giorni: [], resto: null });
});

it('aggiunge la colonna, converte le righe e mette la precisazione nelle note; è idempotente', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 80));
  db.exec(`INSERT INTO quartiere (chiave, ordine, nome) VALUES ('q', 1, 'Q');
    INSERT INTO luogo (chiave, quartiere_chiave, ordine, tipo, nome, cosa_offre, giorni, note) VALUES
      ('q/a', 'q', 1, 'altro', 'A', '', 'venerdì, sabato', NULL),
      ('q/b', 'q', 2, 'altro', 'B', '', 'domenica (regolare) e festività', 'nota esistente'),
      ('q/c', 'q', 3, 'altro', 'C', '', NULL, NULL)`);
  runMigrations(db);
  const leggi = (k: string) => db.prepare('SELECT giorni_json, note FROM luogo WHERE chiave = ?').get(k) as { giorni_json: string; note: string | null };
  expect(leggi('q/a')).toEqual({ giorni_json: '["venerdi","sabato"]', note: null });
  expect(leggi('q/b')).toEqual({ giorni_json: '["domenica"]', note: 'nota esistente · Giorni (dalla guida): domenica (regolare) e festività' });
  expect(leggi('q/c')).toEqual({ giorni_json: '[]', note: null });
  // di nuovo: le note non si raddoppiano
  db.pragma('main.user_version = 79');
  runMigrations(db);
  expect(leggi('q/b').note).toBe('nota esistente · Giorni (dalla guida): domenica (regolare) e festività');
});

it('nel pacchetto nessun luogo ha più giorni fuori dalle chiavi', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  const righe = db.prepare('SELECT giorni_json FROM luogo').all() as Array<{ giorni_json: string }>;
  expect(righe.length).toBeGreaterThan(80);
  for (const r of righe) for (const g of JSON.parse(r.giorni_json) as string[]) expect(['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica']).toContain(g);
  expect(righe.filter((r) => r.giorni_json !== '[]').length).toBeGreaterThanOrEqual(7);
});
