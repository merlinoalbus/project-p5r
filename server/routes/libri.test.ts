// ============================================================
// Test API Libri — avanzamento, completamento canonico e fonti territoriali
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { statoDisponibilitaPartita } from '../services/disponibilitaService.js';
import { createApp } from '../bootstrap.js';
import type { LibriDto, LibroDto, StoricoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API Libri', () => {
  beforeAll(() => { const db = initDb(':memory:'); runMigrations(db); caricaSeed(db, DIR_SEED); });
  afterAll(() => closeDb());

  it('espone il catalogo completo senza inventare uno stato di partita e valida tutte le posizioni', async () => {
    const d = (await request(app).get('/api/compendio/libri')).body.data as LibriDto;
    expect(d.libri).toHaveLength(46);
    expect(d).toMatchObject({ completati: 0, sessioniFatte: 0, sessioniTotali: 74 });
    expect(d.libri.every((l) => l.progresso === 0 && !l.fatto && l.totaleSessioni >= 1)).toBe(true);
    expect(d.libri.every((l) => l.posizioni.length >= 1)).toBe(true);
    expect(d.libri.find((l) => l.chiave === 'vague')?.posizioni).toEqual([{ tipo: 'negozio', chiave: 'libreria-taiheido', etichetta: 'Libreria Taiheido' }]);
    expect((await request(app).get('/api/compendio/libri?partita=99999')).status).toBe(404);
  });

  it('registra 0, parziale, totale e riduzione senza sbloccare prima del completamento', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Progresso libri' })).body.data as { id: number }).id;
    const chiave = 'il-magnifico-ladro';
    let r = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave, avanzamento: 1 })).body.data as LibroDto;
    expect(r).toMatchObject({ progresso: 1, totaleSessioni: 2, fatto: false });
    expect(statoDisponibilitaPartita(id).letture?.has(`libro/${chiave}`)).toBe(false);
    expect((getDb().prepare("SELECT COUNT(*) n FROM lettura_partita WHERE partita_id=? AND tipo='libro' AND chiave=?").get(id, chiave) as { n: number }).n).toBe(0);

    r = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave, avanzamento: 2 })).body.data as LibroDto;
    expect(r).toMatchObject({ progresso: 2, fatto: true });
    expect(statoDisponibilitaPartita(id).letture?.has(`libro/${chiave}`)).toBe(true);
    await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave, avanzamento: 2 });
    let storico = (await request(app).get(`/api/partite/${id}/storico?tipi=lettura`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);

    r = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave, avanzamento: 1 })).body.data as LibroDto;
    expect(r).toMatchObject({ progresso: 1, fatto: false });
    await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave, fatto: true });
    storico = (await request(app).get(`/api/partite/${id}/storico?tipi=lettura`)).body.data as StoricoDto;
    expect(storico.totale).toBe(2);
    r = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave, fatto: false })).body.data as LibroDto;
    expect(r).toMatchObject({ progresso: 0, fatto: false });
  });

  it('rifiuta contratti ambigui e avanzamenti fuori dal totale', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Validazione libri' })).body.data as { id: number }).id;
    const url = `/api/partite/${id}/letture`;
    expect((await request(app).put(url).send({ tipo: 'libro', chiave: 'il-magnifico-ladro' })).status).toBe(400);
    expect((await request(app).put(url).send({ tipo: 'libro', chiave: 'il-magnifico-ladro', fatto: true, avanzamento: 2 })).status).toBe(400);
    expect((await request(app).put(url).send({ tipo: 'libro', chiave: 'il-magnifico-ladro', avanzamento: 1.5 })).status).toBe(400);
    expect((await request(app).put(url).send({ tipo: 'libro', chiave: 'il-magnifico-ladro', avanzamento: 3 })).status).toBe(400);
    expect((await request(app).put(url).send({ tipo: 'film', chiave: 'x', avanzamento: 1 })).status).toBe(404);
  });

  it('clampa un progresso quando il seed riduce il totale senza dichiararlo completato', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Clamp libri' })).body.data as { id: number }).id;
    await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: 'spadaccino-provetto', avanzamento: 2 });
    getDb().prepare("UPDATE libro SET sessioni=1 WHERE chiave='spadaccino-provetto'").run();
    let libro = ((await request(app).get(`/api/compendio/libri?partita=${id}`)).body.data as LibriDto).libri.find((l) => l.chiave === 'spadaccino-provetto')!;
    expect(libro).toMatchObject({ progresso: 1, totaleSessioni: 1, fatto: false });
    libro = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: 'spadaccino-provetto', avanzamento: 1 })).body.data as LibroDto;
    expect(libro.fatto).toBe(true);
  });

  it('mantiene progresso e posizioni al reseed e cancella il progresso insieme alla partita', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Persistenza libri' })).body.data as { id: number }).id;
    await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: 'il-magnifico-ladro', avanzamento: 1 });
    caricaSeed(getDb(), DIR_SEED, true);
    const d = (await request(app).get(`/api/compendio/libri?partita=${id}`)).body.data as LibriDto;
    expect(d.libri.find((l) => l.chiave === 'il-magnifico-ladro')?.progresso).toBe(1);
    expect((getDb().prepare('SELECT COUNT(*) n FROM libro_posizione').get() as { n: number }).n).toBe(48);
    await request(app).delete(`/api/partite/${id}`);
    expect((getDb().prepare('SELECT COUNT(*) n FROM progresso_libro_partita WHERE partita_id=?').get(id) as { n: number }).n).toBe(0);
  });
});
