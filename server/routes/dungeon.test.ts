// ============================================================
// Test API dungeon (Fase 7.1) — seed, schede, stato dei punti per partita con eventi, marcatori delle mappe, reseed stabile
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { DungeonDettaglioDto, DungeonRiassuntoDto, PuntoInteresseDto, StoricoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API dungeon', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('elenco e scheda: 10 dungeon in ordine, aree e punti con chiave stabile, tipi ammessi, fonti', async () => {
    const lista = (await request(app).get('/api/compendio/dungeon')).body.data as DungeonRiassuntoDto[];
    expect(lista).toHaveLength(10);
    expect(lista.map((d) => d.chiave)).toEqual(['kamoshida', 'madarame', 'kaneshiro', 'futaba', 'okumura', 'niijima', 'shido', 'iweleth', 'maruki', 'mementos']);
    expect(lista[0]).toMatchObject({ nome: 'Palazzo di Kamoshida', tipo: 'palazzo', gestiti: null });
    expect(lista.filter((d) => d.tipo === 'palazzo').reduce((s, d) => s + d.punti, 0)).toBe(524);
    expect(lista.filter((d) => d.tipo === 'palazzo').reduce((s, d) => s + d.aree, 0)).toBe(107);
    expect(lista.find((d) => d.chiave === 'mementos')).toMatchObject({ tipo: 'mementos', aree: 9, punti: 164 });
    const k = (await request(app).get('/api/compendio/dungeon/kamoshida')).body.data as DungeonDettaglioDto;
    expect(k.aree).toHaveLength(18);
    expect(k.aree[0].ordine).toBe(0);
    expect(k.date.scadenza.length).toBeGreaterThan(0);
    const tipi = new Set(['sicura', 'forziere', 'forziere-chiuso', 'volonta', 'puzzle', 'miniboss', 'boss', 'ombra-sciagura', 'persona', 'oggetto', 'scorciatoia', 'altro']);
    for (const a of k.aree) {
      expect(a.mappa).toBe(false);
      for (const p of a.punti) {
        expect(p.chiave).toBe(`${a.chiave}/${p.ordine}`);
        expect(tipi.has(p.tipo)).toBe(true);
        expect(p.nome.length).toBeGreaterThan(0);
        expect(p.stato).toBeNull();
        // 7.4b: spillo preposizionato dal seed (percentuali) oppure nessuno
        if (p.marcatore) {
          expect(p.marcatore.x).toBeGreaterThanOrEqual(0); expect(p.marcatore.x).toBeLessThanOrEqual(100);
          expect(p.marcatore.y).toBeGreaterThanOrEqual(0); expect(p.marcatore.y).toBeLessThanOrEqual(100);
        }
      }
    }
    expect(k.aree.flatMap((a) => a.punti).filter((p) => p.marcatore)).toHaveLength(21);
    expect(k.aree.flatMap((a) => a.punti).filter((p) => p.tipo === 'volonta')).toHaveLength(3);
    expect(k.aree.flatMap((a) => a.punti).some((p) => p.tipo === 'boss')).toBe(true);
    expect(k.fonti.every((f) => f.startsWith('http'))).toBe(true);
    expect((await request(app).get('/api/compendio/dungeon/nessuno')).status).toBe(404);
    expect((await request(app).get('/api/compendio/dungeon?partita=99999')).status).toBe(404);
  });

  it('stato dei punti per partita (ottenuto/esaurito/riapri) con evento, avanzamento nell\'elenco, marcatori delle mappe', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Dungeon' })).body.data as { id: number }).id;
    const k = (await request(app).get(`/api/compendio/dungeon/kamoshida?partita=${id}`)).body.data as DungeonDettaglioDto;
    const forziere = k.aree.flatMap((a) => a.punti).find((p) => p.tipo === 'forziere')!;
    const sicura = k.aree.flatMap((a) => a.punti).find((p) => p.tipo === 'sicura')!;
    let p = (await request(app).put(`/api/partite/${id}/punti`).send({ punto: forziere.chiave, stato: 'ottenuto' })).body.data as PuntoInteresseDto;
    expect(p).toMatchObject({ chiave: forziere.chiave, stato: 'ottenuto' });
    p = (await request(app).put(`/api/partite/${id}/punti`).send({ punto: forziere.chiave, stato: 'ottenuto' })).body.data as PuntoInteresseDto; // idempotente: nessun secondo evento
    p = (await request(app).put(`/api/partite/${id}/punti`).send({ punto: sicura.chiave, stato: 'esaurito' })).body.data as PuntoInteresseDto;
    expect(p.stato).toBe('esaurito');
    const lista = (await request(app).get(`/api/compendio/dungeon?partita=${id}`)).body.data as DungeonRiassuntoDto[];
    expect(lista.find((d) => d.chiave === 'kamoshida')?.gestiti).toBe(2);
    expect(lista.find((d) => d.chiave === 'madarame')?.gestiti).toBe(0);
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=punto-dungeon`)).body.data as StoricoDto;
    expect(storico.totale).toBe(2);
    expect(storico.eventi[1].titolo).toContain(forziere.nome);
    p = (await request(app).put(`/api/partite/${id}/punti`).send({ punto: forziere.chiave, stato: null })).body.data as PuntoInteresseDto;
    expect(p.stato).toBeNull();
    expect((await request(app).put(`/api/partite/${id}/punti`).send({ punto: 'x/999', stato: 'ottenuto' })).status).toBe(404);
    expect((await request(app).put(`/api/partite/${id}/punti`).send({ punto: forziere.chiave, stato: 'boh' })).status).toBe(400);
    // marcatori: fissa, leggi nella scheda, limiti, rimozione
    const m = await request(app).put('/api/mappe/marcatori').send({ punto: forziere.chiave, x: 12.5, y: 80 });
    expect(m.status).toBe(200);
    expect(m.body.data.marcatore).toEqual({ x: 12.5, y: 80 });
    const k2 = (await request(app).get('/api/compendio/dungeon/kamoshida')).body.data as DungeonDettaglioDto;
    expect(k2.aree.flatMap((a) => a.punti).find((q) => q.chiave === forziere.chiave)?.marcatore).toEqual({ x: 12.5, y: 80 });
    expect((await request(app).put('/api/mappe/marcatori').send({ punto: forziere.chiave, x: 120, y: 0 })).status).toBe(400);
    expect((await request(app).put('/api/mappe/marcatori').send({ punto: 'x/999', x: 1, y: 1 })).status).toBe(404);
    expect((await request(app).put('/api/mappe/marcatori').send({ punto: forziere.chiave, x: null, y: null })).body.data.marcatore).toBeNull();
    // reseed forzato: chiavi stabili → lo stato della partita resta
    caricaSeed(getDb(), DIR_SEED, true);
    const k3 = (await request(app).get(`/api/compendio/dungeon/kamoshida?partita=${id}`)).body.data as DungeonDettaglioDto;
    expect(k3.aree.flatMap((a) => a.punti).find((q) => q.chiave === sicura.chiave)?.stato).toBe('esaurito');
    expect(k3.aree.flatMap((a) => a.punti).length).toBe(58);
  });
});
