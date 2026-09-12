import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import request from 'supertest';
import { closeDb, getDb, initDb, prepared } from '../db/dbService.js';
import { caricaPacchetto, ricaricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import Database from 'better-sqlite3';
import { percorsoPacchettoDb } from '../services/pacchetto/pacchettoGioco.js';
import { createApp } from '../bootstrap.js';

const app = createApp();
describe('Conservazione catalogo e spunte', () => {
  let id: number;
  beforeEach(async () => {
    const db = initDb(':memory:'); caricaPacchetto(db);
    id = (await request(app).post('/api/partite').send({ nome: 'Conservazione' })).body.data.id as number;
  });
  afterEach(() => closeDb());

  it('nasconde articoli e negozi da conteggi, ricerca e dettaglio, conservando accesso editor', async () => {
    const n = (await request(app).get('/api/compendio/negozi/untouchable')).body.data;
    const a = n.articoliElenco[0].chiave as string;
    expect((await request(app).put(`/api/catalogo/articolo/${encodeURIComponent(a)}/nascosta`).send({ nascosta: true })).status).toBe(200);
    const dopo = (await request(app).get('/api/compendio/negozi/untouchable')).body.data;
    expect(dopo.articoli).toBe(n.articoli - 1);
    expect(dopo.articoliElenco.some((x: { chiave: string }) => x.chiave === a)).toBe(false);
    expect((await request(app).get(`/api/catalogo/articolo/${encodeURIComponent(a)}`)).status).toBe(200);
    await request(app).put('/api/catalogo/negozio/untouchable/nascosta').send({ nascosta: true });
    expect((await request(app).get('/api/compendio/negozi/untouchable')).status).toBe(404);
    const ricerca = (await request(app).get('/api/compendio/articoli?q=Untouchable')).body.data;
    expect(ricerca.totale).toBe(0);
  });

  it('nomi massimi duplicati producono chiavi distinte e terminano', async () => {
    const n = (await request(app).post('/api/catalogo/negozio').send({ nome: 'n'.repeat(160) })).body.data;
    const body = { nome: 'a'.repeat(160), negozio_chiave: n.chiave };
    const a = await request(app).post('/api/catalogo/articolo').send(body);
    const b = await request(app).post('/api/catalogo/articolo').send(body);
    expect(a.status).toBe(201); expect(b.status).toBe(201);
    expect(a.body.data.chiave).not.toBe(b.body.data.chiave);
    expect(b.body.data.chiave).toHaveLength(190);
  });

  it('una guida aggiornata senza il negozio conserva figli personali, acquisti e righe nascoste', async () => {
    const n = (await request(app).get('/api/compendio/negozi/untouchable')).body.data;
    const a = n.articoliElenco[0].chiave as string;
    prepared('INSERT INTO acquisto_partita (partita_id, articolo_chiave, updated_at) VALUES (?, ?, ?)').run(id, a, 'prima');
    const u = (await request(app).post('/api/catalogo/articolo').send({ nome: 'Personale', negozio_chiave: 'untouchable' })).body.data;
    const nascosto = n.articoliElenco[1].chiave as string;
    await request(app).put(`/api/catalogo/articolo/${encodeURIComponent(nascosto)}/nascosta`).send({ nascosta: true });
    // un pacchetto di gioco in cui la guida non ha più quel negozio
    const tmp=fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-pacchetto-'));
    try {
      const p=path.join(tmp,'gioco.db'); fs.copyFileSync(percorsoPacchettoDb(), p);
      const altro=new Database(p); altro.exec("DELETE FROM articolo WHERE negozio_chiave='untouchable'; DELETE FROM negozio WHERE chiave='untouchable'"); altro.close();
      ricaricaPacchetto(getDb(), p);
      expect(prepared('SELECT 1 FROM articolo WHERE chiave = ?').get(u.chiave)).toBeTruthy();
      expect(prepared('SELECT 1 FROM acquisto_partita WHERE articolo_chiave = ?').get(a)).toBeTruthy();
      expect(prepared('SELECT nascosto FROM articolo WHERE chiave = ?').get(nascosto)).toEqual({nascosto:1});
    } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
  });

});
