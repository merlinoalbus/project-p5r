// Test migrazione 072 — negozi e attività hanno una sede fra i luoghi della città
import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';
import { LUOGHI_NUOVI, SEDI_ATTIVITA, SEDI_NEGOZI } from './072_sedi_negozi_attivita.js';

afterEach(() => closeDb());

it('la sede viene dall’inverso di luogo.negozio e il quartiere segue la sede', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 72));
  db.exec(`INSERT INTO quartiere (chiave, ordine, nome) VALUES ('q', 1, 'Q'), ('altro', 2, 'Altro');
    INSERT INTO luogo (chiave, quartiere_chiave, ordine, tipo, nome, negozio) VALUES ('q/bottega', 'q', 1, 'negozio', 'Bottega', 'bottega');
    INSERT INTO negozio (chiave, ordine, nome, tipo, luogo_chiave) VALUES ('bottega', 1, 'Bottega', 'misto', 'altro'), ('senza', 2, 'Senza', 'misto', NULL);`);
  runMigrations(db);
  expect(db.prepare("SELECT sede_chiave, luogo_chiave FROM negozio WHERE chiave = 'bottega'").get()).toEqual({ sede_chiave: 'q/bottega', luogo_chiave: 'q' });
  expect(db.prepare("SELECT sede_chiave FROM negozio WHERE chiave = 'senza'").pluck().get()).toBeNull();
});

it('nel pacchetto 57 negozi su 60 e 29 attività su 30 hanno una sede esistente, i tre e l’una senza sono quelli dichiarati', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  const negozi = db.prepare('SELECT chiave, sede_chiave, luogo_chiave FROM negozio').all() as Array<{ chiave: string; sede_chiave: string | null; luogo_chiave: string | null }>;
  expect(negozi.length).toBe(60);
  expect(negozi.filter((n) => n.sede_chiave === null).map((n) => n.chiave).sort()).toEqual(['home-shopping-tv', 'negozio-palazzo-niijima', 'tanaka-affari-loschi']);
  const attivita = db.prepare('SELECT chiave, sede_chiave, luogo_chiave FROM attivita').all() as Array<{ chiave: string; sede_chiave: string | null; luogo_chiave: string | null }>;
  expect(attivita.length).toBe(30);
  expect(attivita.filter((a) => a.sede_chiave === null).map((a) => a.chiave)).toEqual(['lettura-metropolitana']);
  // ogni sede esiste e il quartiere è quello della sede
  const quartiereDi = new Map((db.prepare('SELECT chiave, quartiere_chiave FROM luogo').all() as Array<{ chiave: string; quartiere_chiave: string }>).map((l) => [l.chiave, l.quartiere_chiave]));
  for (const r of [...negozi, ...attivita]) if (r.sede_chiave) { expect(quartiereDi.has(r.sede_chiave), r.chiave).toBe(true); expect(r.luogo_chiave, r.chiave).toBe(quartiereDi.get(r.sede_chiave)); }
  expect(attivita.find((a) => a.chiave === 'studio-biblioteca-scuola')).toMatchObject({ sede_chiave: 'shujin-academy/biblioteca-shujin', luogo_chiave: 'shujin-academy' });
  // i luoghi nuovi esistono, i dizionari puntano tutti a luoghi esistenti, il finto negozio dei distributori è sparito
  for (const l of LUOGHI_NUOVI) expect(quartiereDi.get(l.chiave), l.chiave).toBe(l.quartiere);
  for (const sede of [...Object.values(SEDI_NEGOZI), ...Object.values(SEDI_ATTIVITA)]) if (sede) expect(quartiereDi.has(sede), sede).toBe(true);
  expect(db.prepare("SELECT COUNT(*) FROM luogo WHERE negozio = 'distributori-automatici'").pluck().get()).toBe(0);
  expect(db.pragma('foreign_key_check')).toEqual([]);
});
