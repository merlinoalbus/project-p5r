import request from 'supertest';
import { createApp } from '../bootstrap.js';
import { initDb, closeDb, getDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { tipiDellaCategoria } from '../../shared/spilli.js';
import type { EsportazioneMappeDto } from '../../shared/types.js';

// ============================================================
// La destinazione di uno spostamento è «mappa + spillo» (2026-09-11): la mappa d'arrivo si adatta
// alla finestra e lo spillo, se indicato, è già selezionato. Nei pacchetti lo spillo viaggia per
// nome e posizione; i pacchetti vecchi (x, y, zoom) diventano lo spillo più vicino.
// ============================================================

const app = createApp();
let ingressoId = 0;
beforeEach(async () => {
  runMigrations(initDb(':memory:'));
  for (const [chiave, nome] of [['partenza', 'Partenza'], ['arrivo', 'Sala di arrivo']]) await request(app).post('/api/mappe').send({ chiave, nome, tipo: 'luogo' }).expect(201);
  ingressoId = (await request(app).post('/api/mappe/arrivo/spilli').send({ tipo: 'porta', nome: 'Ingresso', x: 50, y: 90 })).body.data.id;
});
afterEach(() => closeDb());
const crea = (extra: Record<string, unknown> = {}) => request(app).post('/api/mappe/partenza/spilli').send({ tipo: 'passaggio', nome: 'Attraversamento', x: 10, y: 20, ...extra });
const leggi = async (id: number) => (await request(app).get('/api/mappe/partenza')).body.data.spilli.find((s: { id: number }) => s.id === id);

it('ogni tipo di spostamento accetta mappa e spillo di arrivo; il riferimento alla mappa si allinea; i nomi arrivano con lo spillo', async () => {
  for (const tipo of tipiDellaCategoria('spostamento')) {
    const r = await crea({ tipo, destinazione: { mappa: 'arrivo', spillo: ingressoId } });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({ tipo, destinazione: { mappa: 'sala-di-arrivo', spillo: ingressoId }, destinazioneNonDisponibile: false, destinazioneNomi: { mappa: 'Sala di arrivo', spillo: 'Ingresso' } });
  }
  // solo la mappa, senza spillo
  const solo = await crea({ destinazione: { mappa: 'arrivo' } });
  expect(solo.body.data.destinazione).toEqual({ mappa: 'sala-di-arrivo', spillo: null });
  expect((await request(app).get('/api/mappe/arrivo')).body.data.spilli).toHaveLength(1);
});

it('gli altri tipi non hanno destinazione: uno spillo di città, consumabile o informativo la perde', async () => {
  for (const tipo of ['negozio', 'forziere', 'nota'] as const) {
    const r = await crea({ tipo, destinazione: { mappa: 'arrivo', spillo: ingressoId } });
    expect(r.status).toBe(201);
    expect(r.body.data.destinazione ?? null).toBeNull();
  }
});

it('conserva l’arrivo su patch omessa, segue la rinomina della mappa, distingue la rimozione esplicita', async () => {
  const id = (await crea({ destinazione: { mappa: 'arrivo', spillo: ingressoId } })).body.data.id;
  await request(app).put('/api/mappe/arrivo').send({ nome: 'Nuovo arrivo' }).expect(200);
  const changed = await request(app).put(`/api/mappe/spilli/${id}`).send({ nome: 'Nuovo nome' });
  expect(changed.body.data.destinazione).toEqual({ mappa: 'nuovo-arrivo', spillo: ingressoId });
  await request(app).put(`/api/mappe/spilli/${id}`).send({ destinazione: null }).expect(200);
  expect(await leggi(id)).toMatchObject({ destinazione: null, destinazioneNonDisponibile: false });
});

it('eliminando la mappa d’arrivo il pin resta e segnala il percorso invalidato, anche dopo esportazione e importazione', async () => {
  const id = (await crea({ destinazione: { mappa: 'arrivo', spillo: ingressoId } })).body.data.id;
  await request(app).delete('/api/mappe/arrivo').expect(204);
  expect(await leggi(id)).toMatchObject({ tipo: 'passaggio', destinazione: null, destinazioneNonDisponibile: true });
  const pacchetto = (await request(app).get('/api/mappe/esporta?radice=partenza')).body.data;
  expect(pacchetto.mappe[0].spilli[0].destinazioneNonDisponibile).toBe(true);
  await request(app).delete('/api/mappe/partenza').expect(204);
  await request(app).post('/api/mappe/importa').send({ pacchetto }).expect(200);
  expect((await request(app).get('/api/mappe/partenza')).body.data.spilli[0].destinazioneNonDisponibile).toBe(true);
});

it('uno spillo di arrivo di un’altra mappa, inesistente, o una mappa assente non producono modifiche parziali', async () => {
  const altrove = (await crea({ tipo: 'nota', nome: 'Altrove', x: 1, y: 1 })).body.data.id;
  const id = (await crea({ destinazione: { mappa: 'arrivo', spillo: ingressoId } })).body.data.id;
  for (const invalid of [{ mappa: 'arrivo', spillo: altrove }, { mappa: 'arrivo', spillo: 999999 }, { mappa: 'assente', spillo: null }, { mappa: 'arrivo', x: 0 }]) {
    const r = await request(app).put(`/api/mappe/spilli/${id}`).send({ nome: 'Non deve cambiare', destinazione: invalid });
    expect([400, 404]).toContain(r.status);
    expect((await leggi(id)).nome).toBe('Attraversamento');
    expect((await leggi(id)).destinazione).toEqual({ mappa: 'sala-di-arrivo', spillo: ingressoId });
  }
});

it('nel pacchetto lo spillo di arrivo viaggia per nome e posizione, e all’importazione si risolve anche dopo la rinomina della mappa', async () => {
  await crea({ tipo: 'treno', destinazione: { mappa: 'arrivo', spillo: ingressoId } });
  await request(app).put('/api/mappe/arrivo').send({ nome: 'Stazione nuova' }).expect(200);
  const pacchetto = (await request(app).get('/api/mappe/esporta')).body.data as EsportazioneMappeDto;
  pacchetto.mappe = pacchetto.mappe.filter((m) => m.chiave === 'partenza' || m.nome === 'Stazione nuova').sort((a) => (a.chiave === 'partenza' ? -1 : 1));
  expect(pacchetto.mappe).toHaveLength(2);
  expect(pacchetto.mappe[0].spilli[0].destinazione).toEqual({ mappa: pacchetto.mappe[1].chiave, spillo: { nome: 'Ingresso', x: 50, y: 90 } });
  await request(app).delete('/api/mappe/partenza').expect(204);
  await request(app).delete('/api/mappe/arrivo').expect(204);
  const r = await request(app).post('/api/mappe/importa').send({ pacchetto });
  expect(r.status).toBe(200);
  expect(r.body.data).toMatchObject({ mappe: 2, spilli: 2, saltate: [] });
  const nuovoIngresso = (await request(app).get('/api/mappe/stazione-nuova')).body.data.spilli[0].id;
  expect((await request(app).get('/api/mappe/partenza')).body.data.spilli[0].destinazione).toEqual({ mappa: 'stazione-nuova', spillo: nuovoIngresso });
});

it('un pacchetto vecchio con punto e zoom diventa lo spillo più vicino a quel punto, o la sola mappa se non ce n’è', async () => {
  const pacchetto = { versione: 1, mappe: [
    { chiave: 'partenza', nome: 'Partenza', tipo: 'luogo', spilli: [
      { tipo: 'passaggio', nome: 'Vicino', x: 10, y: 10, destinazione: { mappa: 'arrivo', x: 52, y: 88, zoom: 2 } },
      { tipo: 'passaggio', nome: 'Lontano', x: 30, y: 10, destinazione: { mappa: 'arrivo', x: 5, y: 5, zoom: 2 } },
    ] },
  ] };
  await request(app).post('/api/mappe/importa').send({ pacchetto, sovrascrivi: true }).expect(200);
  const spilli = (await request(app).get('/api/mappe/partenza')).body.data.spilli as Array<{ nome: string; destinazione: unknown }>;
  expect(spilli.find((s) => s.nome === 'Vicino')?.destinazione).toEqual({ mappa: 'sala-di-arrivo', spillo: ingressoId });
  expect(spilli.find((s) => s.nome === 'Lontano')?.destinazione).toEqual({ mappa: 'sala-di-arrivo', spillo: null });
});

it('rifiuta un pacchetto con destinazione verso una mappa inesistente prima di inserire mappe', async () => {
  const before = (getDb().prepare('SELECT COUNT(*) AS n FROM mappa').get() as { n: number }).n;
  const pacchetto = { versione: 1, mappe: [{ chiave: 'nuova', nome: 'Nuova', tipo: 'luogo', spilli: [{ tipo: 'rampino', nome: 'Salto', x: 10, y: 10, destinazione: { mappa: 'inesistente', spillo: null } }] }] };
  const r = await request(app).post('/api/mappe/importa').send({ pacchetto });
  expect(r.status).toBe(404);
  expect((getDb().prepare('SELECT COUNT(*) AS n FROM mappa').get() as { n: number }).n).toBe(before);
});
