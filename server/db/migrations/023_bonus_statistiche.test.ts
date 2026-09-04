// ============================================================
// Test migrazione 023 — conversione dei valori assoluti in bonus e riempimento delle istantanee del compendio
// ============================================================

import path from 'node:path';
import { closeDb, getDb, initDb, prepared } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { caricaSeed } from '../../services/seed/caricaSeed.js';
import { statistichePerLivello } from '../../../shared/statistiche.js';
import { convertiAssoluteInBonus, riempiIstantaneeDallaScorta } from './023_bonus_statistiche.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../../data/seed');

describe('migrazione 023 — bonus statistiche', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
  });
  afterAll(() => closeDb());

  it('converte i valori assoluti registrati in scarti rispetto alla stima del livello e azzera le vecchie colonne', () => {
    const jf = prepared("SELECT id, livello, forza, magia, resistenza, agilita, fortuna FROM persona WHERE nome = 'Jack Frost'").get() as { id: number; livello: number; forza: number; magia: number; resistenza: number; agilita: number; fortuna: number };
    prepared("INSERT INTO partita (nome, attiva, livello_protagonista, created_at, updated_at) VALUES ('t', 1, 1, 'x', 'x')").run();
    const partitaId = Number((prepared('SELECT id FROM partita ORDER BY id DESC').get() as { id: number }).id);
    // esemplare «vecchio stile»: livello 20 con valori assoluti registrati (magia 30, il resto pari alla stima)
    const stima = statistichePerLivello({ forza: jf.forza, magia: jf.magia, resistenza: jf.resistenza, agilita: jf.agilita, fortuna: jf.fortuna }, jf.livello, 20);
    prepared(`INSERT INTO persona_posseduta (partita_id, persona_id, livello, forza, magia, resistenza, agilita, fortuna, in_squadra, carica, note, created_at, updated_at)
      VALUES (?, ?, 20, ?, 30, ?, ?, ?, 1, 0, '', 'x', 'x')`).run(partitaId, jf.id, stima.forza, stima.resistenza, stima.agilita, stima.fortuna - 1);
    const id = Number((prepared('SELECT id FROM persona_posseduta ORDER BY id DESC').get() as { id: number }).id);
    prepared('INSERT INTO persona_posseduta_skill (posseduta_id, slot, skill_id) VALUES (?, 1, (SELECT id FROM skill WHERE nome = ?))').run(id, 'Bufu');
    prepared("INSERT INTO compendio_partita (partita_id, persona_id, registrata, livello_registrato, updated_at) VALUES (?, ?, 1, 12, 'x')").run(partitaId, jf.id);

    const db = getDb();
    expect(convertiAssoluteInBonus(db)).toBe(1);
    const r = prepared('SELECT forza, magia, bonus_forza, bonus_magia, bonus_resistenza, bonus_agilita, bonus_fortuna FROM persona_posseduta WHERE id = ?').get(id) as Record<string, number | null>;
    expect(r.forza).toBeNull();
    expect(r.magia).toBeNull();
    expect(r.bonus_magia).toBe(30 - stima.magia);
    expect(r.bonus_forza).toBe(0);
    expect(r.bonus_fortuna).toBe(-1);
    // seconda esecuzione: nessuna riga da convertire
    expect(convertiAssoluteInBonus(db)).toBe(0);

    expect(riempiIstantaneeDallaScorta(db)).toBe(1);
    const cp = prepared('SELECT livello_registrato, bonus_magia, skill_ids_json, carica FROM compendio_partita WHERE partita_id = ? AND persona_id = ?').get(partitaId, jf.id) as { livello_registrato: number; bonus_magia: number; skill_ids_json: string; carica: number };
    expect(cp.livello_registrato).toBe(20);
    expect(cp.bonus_magia).toBe(30 - stima.magia);
    expect(JSON.parse(cp.skill_ids_json)).toHaveLength(1);
    expect(cp.carica).toBe(0);
  });
});
