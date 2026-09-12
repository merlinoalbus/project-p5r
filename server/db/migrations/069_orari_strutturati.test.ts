// Test migrazione 069 — gli orari dei negozi diventano valori; il dizionario copre tutte le frasi dei dati
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { ORARI_DALLA_PROSA, orariDallaProsa } from './069_orari_strutturati.js';
import { descriviOrari, leggiOrari, orariComeCondizioni } from '../../../shared/orariNegozio.js';

afterEach(() => closeDb());

it('traduce le frasi note, rende «sempre» il vuoto e conserva in nota una frase sconosciuta', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 69));
  db.exec(`INSERT INTO negozio (chiave, ordine, nome, tipo, orari) VALUES ('a', 1, 'A', 'misto', 'Domenica sera'), ('b', 2, 'B', 'misto', NULL), ('c', 3, 'C', 'misto', 'Aperto quando gli pare')`);
  runMigrations(db);
  const orari = (chiave: string) => leggiOrari(db.prepare('SELECT orari_json FROM negozio WHERE chiave = ?').pluck().get(chiave) as string);
  expect(orari('a')).toEqual({ giorni: ['domenica'], fasce: ['sera'], chiusoConPioggia: false, nota: null });
  expect(orari('b')).toEqual({ giorni: [], fasce: [], chiusoConPioggia: false, nota: null });
  expect(orari('c')).toEqual({ giorni: [], fasce: [], chiusoConPioggia: false, nota: 'Aperto quando gli pare' });
  expect(orariComeCondizioni(orari('a'))).toEqual([{ tipo: 'giorno-settimana', giorni: ['domenica'] }, { tipo: 'fascia', fascia: 'sera' }]);
  expect(descriviOrari(orari('a'))).toBe('Solo di sera, solo la domenica');
  expect(descriviOrari(orariDallaProsa('Sera, dal lunedi al venerdi; assente nei giorni di pioggia').orari)).toBe('Solo di sera, dal lunedì al venerdì, chiuso nei giorni di pioggia');
});

it('nel pacchetto ogni negozio ha gli orari strutturati e nessuna frase è finita fuori dizionario', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  const righe = db.prepare('SELECT chiave, orari, orari_json FROM negozio').all() as Array<{ chiave: string; orari: string | null; orari_json: string | null }>;
  expect(righe.length).toBeGreaterThan(50);
  for (const r of righe) {
    expect(r.orari_json, r.chiave).toBeTruthy();
    expect(orariDallaProsa(r.orari).nelDizionario, `${r.chiave}: «${r.orari}»`).toBe(true);
  }
  // il dizionario non contiene frasi che i dati non hanno (ogni voce è stata letta da una riga vera)
  const frasi = new Set(righe.map((r) => (r.orari ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean));
  for (const frase of Object.keys(ORARI_DALLA_PROSA)) expect(frasi.has(frase), frase).toBe(true);
});
