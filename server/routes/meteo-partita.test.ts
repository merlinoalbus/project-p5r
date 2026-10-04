// ============================================================
// Test API — il meteo della partita per fascia, e i requisiti «non deve piovere» che lo leggono
// ============================================================
//
// Scelte dell'utente (2026-09-30): il meteo si segna nella partita, giorno e sera separati, pre-compilato dalla guida;
// «non deve piovere» guarda la fascia corrente; senza meteo il requisito è da controllare e non blocca.
// ============================================================

import request from 'supertest';
import { closeDb } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import type { ConfidentePartitaDto, MeteoGiornoDto, PartitaDto, PercorsoGiornoDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

describe('Meteo della partita', () => {
  let id = 0;
  beforeAll(async () => {
    dbDiProva();
    id = ((await request(app).post('/api/partite').send({ nome: 'Meteo' })).body.data as { id: number }).id;
  });
  afterAll(() => closeDb());

  const meteo = async (data: string) => (await request(app).get(`/api/partite/${id}/meteo/${data}`)).body.data as MeteoGiornoDto;
  const imposta = (data: string, body: object) => request(app).put(`/api/partite/${id}/meteo/${data}`).send(body);
  const partita = async (mod: object) => (await request(app).put(`/api/partite/${id}`).send(mod)).body.data as PartitaDto;
  // Ann al rango 3 chiede solo che non piova: il semaforo del rango 3 con Ann al rango 2
  const ann3 = async () => {
    const ann = ((await request(app).get(`/api/partite/${id}/confidenti`)).body.data as ConfidentePartitaDto[]).find((c) => c.chiave === 'ann')!;
    return { ann, req: ann.semafori.find((s) => s.rango === 3)!.requisiti.find((r) => r.tipo === 'meteo')! };
  };

  it('senza scelta vale la guida, divisa per fascia («Sereno/Pioggia» = sereno di giorno, pioggia di sera)', async () => {
    const m = await meteo('08-10');
    expect(m).toMatchObject({
      dataGioco: '08-10', testoGuida: 'Sereno/Pioggia',
      giorno: { meteo: 'sereno', origine: 'guida', guida: 'sereno', allerte: [] },
      sera: { meteo: 'pioggia', origine: 'guida', guida: 'pioggia', allerte: [{ chiave: 'pioggia-torrenziale', nome: 'Pioggia torrenziale' }] },
    });
    // gli effetti dell'allerta arrivano senza la riga delle date
    expect(m.sera.allerte[0].effetti.length).toBeGreaterThan(0);
    expect(m.sera.allerte[0].effetti.some((e) => /^Date/.test(e))).toBe(false);
    // un giorno che la guida non dice
    expect((await meteo('04-21')).giorno).toEqual({ meteo: null, origine: null, guida: null, allerte: [] });
    // l'ondata di calore è solo di giorno (il 9 agosto), la notte torrida solo di sera
    expect((await meteo('08-09')).giorno.allerte.map((a) => a.chiave)).toEqual(['ondata-di-calore']);
    expect((await meteo('08-09')).sera.allerte.map((a) => a.chiave)).toEqual(['notte-torrida']);
    // il 17 agosto di sera le allerte sono due
    expect((await meteo('08-17')).sera.allerte.map((a) => a.chiave)).toEqual(['notte-torrida', 'pioggia-torrenziale']);
  });

  it('la pioggia torrenziale del gioco è pioggia anche dove la guida non dice il meteo; la scelta dell’utente vince', async () => {
    const { getDb } = await import('../db/dbService.js');
    getDb().prepare("INSERT INTO allerta_meteo (data, fascia, chiave, nome, effetti_json) VALUES ('04-22', 'sera', 'pioggia-torrenziale', 'Pioggia torrenziale', '[]')").run();
    expect((await meteo('04-22')).sera).toMatchObject({ meteo: 'pioggia', origine: 'guida', guida: 'pioggia' });
    expect((await meteo('04-22')).giorno.meteo).toBeNull();
    await imposta('04-22', { sera: 'nuvoloso' }).expect(200);
    expect((await meteo('04-22')).sera).toMatchObject({ meteo: 'nuvoloso', origine: 'partita', guida: 'pioggia' });
    getDb().prepare("DELETE FROM allerta_meteo WHERE data = '04-22'").run();
  });

  it('si segna per fascia, si torna alla guida con null; valori e date sbagliati sono rifiutati', async () => {
    const r = await imposta('08-10', { sera: 'nuvoloso' }).expect(200);
    expect(r.body.data.meteo.sera).toMatchObject({ meteo: 'nuvoloso', origine: 'partita', guida: 'pioggia' });
    expect(r.body.data.meteo.giorno).toMatchObject({ meteo: 'sereno', origine: 'guida', guida: 'sereno' });
    expect(r.body.data.partita.id).toBe(id);
    await imposta('08-10', { giorno: 'neve' }).expect(200);
    expect((await meteo('08-10')).sera.origine).toBe('partita'); // l'altra fascia resta com'era
    await imposta('08-10', { giorno: null, sera: null }).expect(200);
    expect((await meteo('08-10')).sera).toMatchObject({ meteo: 'pioggia', origine: 'guida', guida: 'pioggia' });
    expect((await imposta('08-10', { giorno: 'grandine' })).status).toBe(400);
    expect((await imposta('08-10', {})).status).toBe(400);
    expect((await imposta('10agosto', { giorno: 'sereno' })).status).toBe(400);
    // forma giusta, ma non è un giorno del calendario di gioco
    expect((await imposta('02-30', { giorno: 'sereno' })).status).toBe(404);
    expect((await imposta('13-40', { giorno: 'sereno' })).status).toBe(404);
  });

  it('«non deve piovere» guarda la fascia corrente, e la partita dice il meteo di adesso', async () => {
    await request(app).put(`/api/partite/${id}/confidenti/ann`).send({ rango: 2, forza: true });
    let p = await partita({ dataGioco: '08-10', fasciaGioco: 'giorno' });
    expect(p.meteoOra).toBe('sereno');
    let { ann, req } = await ann3();
    expect(req).toMatchObject({ stato: 'verde' });
    expect(req.dettaglio).toBe('Oggi sereno (dalla guida)');
    expect(ann.bloccato).toBeNull();
    p = await partita({ fasciaGioco: 'sera' });
    expect(p.meteoOra).toBe('pioggia');
    ({ ann, req } = await ann3());
    expect(req).toMatchObject({ stato: 'rosso' });
    expect(req.dettaglio).toMatch(/^Stasera pioggia \(dalla guida\)/);
    expect(ann.bloccato).toMatchObject({ rango: 3 });
    // la sera nel gioco invece è stata serena: segnata, il rango si sblocca
    await imposta('08-10', { sera: 'sereno' }).expect(200);
    ({ ann, req } = await ann3());
    expect(req).toMatchObject({ stato: 'verde', dettaglio: 'Stasera sereno' });
    expect(ann.bloccato).toBeNull();
  });

  it('senza meteo il requisito è da controllare e non blocca; segnato, vale', async () => {
    await partita({ dataGioco: '04-21', fasciaGioco: 'giorno' });
    let { ann, req } = await ann3();
    expect(req).toMatchObject({ stato: 'grigio', bloccante: false });
    expect(ann.bloccato).toBeNull();
    await imposta('04-21', { giorno: 'pioggia' }).expect(200);
    ({ ann, req } = await ann3());
    expect(req).toMatchObject({ stato: 'rosso' });
    expect(ann.bloccato).toMatchObject({ rango: 3 });
  });

  it('la giornata della guida con la partita porta il meteo della partita', async () => {
    const g = (await request(app).get(`/api/compendio/percorso/04-21?partita=${id}`)).body.data as PercorsoGiornoDto;
    expect(g.meteoPartita?.giorno).toEqual({ meteo: 'pioggia', origine: 'partita', guida: null, allerte: [] });
    const senza = (await request(app).get('/api/compendio/percorso/04-21')).body.data as PercorsoGiornoDto;
    expect(senza.meteoPartita).toBeNull();
  });

  it('eliminata la partita, il suo meteo se ne va con lei', async () => {
    const altra = ((await request(app).post('/api/partite').send({ nome: 'Da buttare' })).body.data as { id: number }).id;
    await request(app).put(`/api/partite/${altra}/meteo/05-01`).send({ giorno: 'neve' }).expect(200);
    await request(app).delete(`/api/partite/${altra}`).expect(204);
    const { getDb } = await import('../db/dbService.js');
    expect((getDb().prepare('SELECT COUNT(*) AS n FROM meteo_partita WHERE partita_id = ?').get(altra) as { n: number }).n).toBe(0);
  });
});
