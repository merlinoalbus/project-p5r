// ============================================================
// API Videogiochi — round, completamento e sblocco per partita
// ============================================================
//
// Test scritto da Codex (`candidato/lotto-b-v5`) e portato qui tale e quale: il candidato partiva
// da prima che la pagina fosse riscritta, quindi non si poteva integrare com'era, ma questa parte
// non tocca l'interfaccia ed è valida così com'è — copre le tre cose che contano davvero sui
// round: che si registrino, che il completamento sblocchi il requisito, e che una partita non
// veda l'avanzamento dell'altra.

import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { caricaPacchetto, ricaricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { statoDisponibilitaPartita } from '../services/disponibilitaService.js';
import { createApp } from '../bootstrap.js';
import type { VideogiocoDto, VideogiochiDto } from '../../shared/types.js';

const app = createApp();

describe('API Videogiochi', () => {
  beforeAll(() => { const db = initDb(':memory:'); caricaPacchetto(db); });
  afterAll(() => closeDb());

  it('espone il catalogo e round coerenti con il seed', async () => {
    const d = (await request(app).get('/api/compendio/videogiochi')).body.data as VideogiochiDto;
    expect(d.videogiochi.length).toBeGreaterThan(0);
    expect(d.videogiochi.every((g) => g.tipo === 'videogioco' && g.totaleRound > 0 && g.progresso === 0 && !g.fatto)).toBe(true);
    expect(d.iniziati).toBe(0);
    expect(d.completati).toBe(0);
  });

  it('registra round parziali e completa sbloccando il requisito', async () => {
    const gioco = ((await request(app).get('/api/compendio/videogiochi')).body.data as VideogiochiDto).videogiochi[0];
    const id = ((await request(app).post('/api/partite').send({ nome: 'Round videogiochi', dataGioco: '12-15' })).body.data as { id: number }).id;
    const url = `/api/partite/${id}/letture`;
    let g = (await request(app).put(url).send({ tipo: 'videogioco', chiave: gioco.chiave, avanzamento: 1 })).body.data as VideogiocoDto;
    expect(g).toMatchObject({ progresso: 1, fatto: gioco.totaleRound === 1 });
    expect(statoDisponibilitaPartita(id).contatori.get('videogiochi-completati') ?? 0).toBe(0);
    g = (await request(app).put(url).send({ tipo: 'videogioco', chiave: gioco.chiave, avanzamento: gioco.totaleRound })).body.data as VideogiocoDto;
    expect(g).toMatchObject({ progresso: gioco.totaleRound, fatto: true });
    expect(statoDisponibilitaPartita(id).contatori.get('videogiochi-completati')).toBeGreaterThanOrEqual(1);
  });

  it('isola le partite, valida i limiti e conserva il progresso al reseed', async () => {
    const gioco = ((await request(app).get('/api/compendio/videogiochi')).body.data as VideogiochiDto).videogiochi[0];
    const id1 = ((await request(app).post('/api/partite').send({ nome: 'Uno videogiochi', dataGioco: '12-15' })).body.data as { id: number }).id;
    const id2 = ((await request(app).post('/api/partite').send({ nome: 'Due videogiochi', dataGioco: '12-15' })).body.data as { id: number }).id;
    const url = `/api/partite/${id1}/letture`;
    await request(app).put(url).send({ tipo: 'videogioco', chiave: gioco.chiave, avanzamento: gioco.totaleRound });
    expect(((await request(app).get(`/api/compendio/videogiochi?partita=${id2}`)).body.data as VideogiochiDto).completati).toBe(0);
    expect((await request(app).put(url).send({ tipo: 'videogioco', chiave: gioco.chiave, avanzamento: gioco.totaleRound + 1 })).status).toBe(400);
    expect((await request(app).put(url).send({ tipo: 'videogioco', chiave: gioco.chiave, avanzamento: -1 })).status).toBe(400);
    ricaricaPacchetto(getDb());
    expect(((await request(app).get(`/api/compendio/videogiochi?partita=${id1}`)).body.data as VideogiochiDto).videogiochi.find((g) => g.chiave === gioco.chiave)?.fatto).toBe(true);
  });
});
