import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import request from 'supertest';
import { closeDb, getDb, initDb, prepared } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { riallineaPercorso } from '../services/seed/riallineaPercorso.js';
import { createApp } from '../bootstrap.js';
import { impostaAzione } from '../services/percorsoService.js';
import type { PercorsoSeed } from '../../shared/seed.js';

const dir = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();
describe('Conservazione catalogo e spunte', () => {
  let id: number;
  beforeEach(async () => {
    const db = initDb(':memory:'); runMigrations(db); caricaSeed(db, dir);
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

  it('rimozione di negozio dal seed conserva figli personali, acquisti e righe nascoste', async () => {
    const n = (await request(app).get('/api/compendio/negozi/untouchable')).body.data;
    const a = n.articoliElenco[0].chiave as string;
    prepared('INSERT INTO acquisto_partita (partita_id, articolo_chiave, updated_at) VALUES (?, ?, ?)').run(id, a, 'prima');
    const u = (await request(app).post('/api/catalogo/articolo').send({ nome: 'Personale', negozio_chiave: 'untouchable' })).body.data;
    const nascosto = n.articoliElenco[1].chiave as string;
    await request(app).put(`/api/catalogo/articolo/${encodeURIComponent(nascosto)}/nascosta`).send({ nascosta: true });
    const tmp=fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-seed-'));
    try {
      fs.cpSync(dir,tmp,{recursive:true});
      const p=path.join(tmp,'negozi.json'); const seed=JSON.parse(fs.readFileSync(p,'utf8'));
      seed.negozi=seed.negozi.filter((x: {chiave:string})=>x.chiave!=='untouchable'); fs.writeFileSync(p,JSON.stringify(seed));
      caricaSeed(getDb(),tmp,true);
      expect(prepared('SELECT 1 FROM articolo WHERE chiave = ?').get(u.chiave)).toBeTruthy();
      expect(prepared('SELECT 1 FROM acquisto_partita WHERE articolo_chiave = ?').get(a)).toBeTruthy();
      expect(prepared('SELECT nascosto FROM articolo WHERE chiave = ?').get(nascosto)).toEqual({nascosto:1});
    } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
  });

  it('riordino, inserimento e azione rimossa: conserva spunte ed effetti e li annulla una sola volta', async () => {
    const db=getDb();
    const precedente=JSON.parse(fs.readFileSync(path.join(dir,'percorso.json'),'utf8')) as PercorsoSeed;
    const nuovo=structuredClone(precedente);
    const g=nuovo.giorni.find(g=>g.data==='04-12')!;
    const originale=g.azioni[0];
    impostaAzione(id,'04-12',0,true);
    impostaAzione(id,'04-12',4,true);
    const effetti=(prepared("SELECT effetti_json FROM azione_partita WHERE data='04-12' AND indice=0").get() as {effetti_json:string}).effetti_json;
    const punti=()=> (prepared("SELECT punti FROM dote_sociale_partita WHERE partita_id=? AND dote_chiave='conoscenza'").get(id) as {punti:number}).punti;
    const prima=punti();
    g.azioni=g.azioni.slice(1).reverse();
    // Stesso riferimento e tipo, ma nuova attività: non deve ereditare la spunta della vecchia.
    g.azioni.push({ ...originale, azione: 'Una domanda diversa' });
    db.transaction(()=>riallineaPercorso(db,nuovo))();
    expect(prepared("SELECT indice FROM azione_partita WHERE data='04-12'").get()).toEqual({indice:0});
    const salvata=prepared('SELECT id, azione FROM azione_utente WHERE partita_id=?').get(id) as {id:number;azione:string};
    expect(salvata.azione).toBe(originale.azione);
    expect((prepared('SELECT effetti_json FROM azione_utente_partita WHERE azione_utente_id=?').get(salvata.id) as {effetti_json:string}).effetti_json).toBe(effetti);
    expect((await request(app).delete(`/api/catalogo/agenda/azioni/${salvata.id}`)).status).toBe(400);
    expect((await request(app).put(`/api/catalogo/agenda/azioni/${salvata.id}`).send({ partitaId: null })).status).toBe(400);
    const riapri=()=>request(app).put(`/api/catalogo/agenda/azioni/${salvata.id}/fatta`).send({partita:id,fatta:false});
    expect((await riapri()).status).toBe(200); expect(punti()).toBeLessThan(prima);
    const dopo=punti(); await riapri(); expect(punti()).toBe(dopo);
  });
});
