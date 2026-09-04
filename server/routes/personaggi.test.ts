// ============================================================
// Test API personaggi (Fase 10.3) — cast senza spoiler con gruppi e collegamento ai Confidenti
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { PersonaggiDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API personaggi', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('27 personaggi (10 giocabili con nome in codice), 4 gruppi, Confidenti collegati a chiavi esistenti, fonti allgamestaff', async () => {
    const res = await request(app).get('/api/compendio/personaggi');
    expect(res.status).toBe(200);
    const d = res.body.data as PersonaggiDto;
    // 27 con Lavenza (Stanza di Velluto, aggiunta il 2026-09-04 su richiesta dell'utente)
    expect(d.personaggi).toHaveLength(27);
    expect(d.gruppi.find((g) => g.nome === 'Stanza di Velluto')!.membri).toContain('lavenza');
    expect(d.personaggi.filter((p) => p.giocabile)).toHaveLength(10);
    expect(d.personaggi.filter((p) => p.nomeCodice)).toHaveLength(10);
    expect(d.personaggi[0]).toMatchObject({ chiave: 'joker', nomeCodice: 'Joker', arcano: 'Matto', giocabile: true });
    expect(d.personaggi.find((p) => p.chiave === 'kasumi')?.nomeCodice).toBe('Violet');
    expect(d.personaggi.every((p) => p.fonte.startsWith('https://www.allgamestaff.it/') && p.ruolo.length > 0)).toBe(true);
    const confidenti = (await request(app).get('/api/compendio/confidenti')).body.data as Array<{ chiave: string }>;
    const chiavi = new Set(confidenti.map((c) => c.chiave));
    expect(d.personaggi.filter((p) => p.confidente).every((p) => chiavi.has(p.confidente!))).toBe(true);
    expect(d.personaggi.filter((p) => p.confidente)).toHaveLength(22);
    expect(d.gruppi.map((g) => [g.nome, g.membri.length])).toEqual([['Ladri Fantasma', 10], ['Stanza di Velluto', 4], ['Confidenti', 22], ['Terzo Semestre (Royal)', 3]]);
    expect(d.gruppi.every((g) => g.membri.every((m) => d.personaggi.some((p) => p.chiave === m)))).toBe(true);
  });
});
