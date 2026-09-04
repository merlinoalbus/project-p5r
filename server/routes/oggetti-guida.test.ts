// ============================================================
// Test API oggetti della guida (Fase 10.2) — consumabili, chiave e materiali, fabbricazione, personalizzazione, abiti, scambi
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { OggettiGuidaDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API oggetti della guida', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('247 consumabili, 108 oggetti chiave e materiali, 10 ricette, personalizzazione con 8 modifiche, 55 abiti con lavanderia, 5 venditori con 60 offerte', async () => {
    const res = await request(app).get('/api/compendio/oggetti-guida');
    expect(res.status).toBe(200);
    const d = res.body.data as OggettiGuidaDto;
    expect(d.consumabili).toHaveLength(247);
    expect(d.consumabili[0]).toMatchObject({ nome: 'Frutto del diavolo', categoria: 'cura', verificato: true });
    expect(d.consumabili.every((c) => c.effetto.length > 0 && c.fonte.startsWith('http'))).toBe(true);
    expect(d.chiaveEMateriali).toHaveLength(108);
    expect(d.chiaveEMateriali.filter((c) => c.tipo === 'materiale')).toHaveLength(26);
    expect(d.fabbricazione.ricette).toHaveLength(10);
    expect(d.fabbricazione.ricette[0]).toMatchObject({ attrezzo: 'Grimaldello', materiali: [{ nome: 'Gomitolo di seta', quantita: 1 }, { nome: 'Fibbia di latta', quantita: 1 }] });
    expect(d.personalizzazioneArmi.effetti).toHaveLength(8);
    expect(d.personalizzazioneArmi.introduzione).toContain('Untouchable');
    expect(d.abiti.elenco).toHaveLength(55);
    expect(d.abiti.lavanderia.dove).toContain('Yongen-Jaya');
    expect(d.scambi).toHaveLength(5);
    expect(d.scambi.reduce((s, x) => s + x.offerte.length, 0)).toBe(60);
    expect(d.scambi[0]).toMatchObject({ venditore: 'Mercante Sakai', dove: 'Kichijoji' });
  });
});
