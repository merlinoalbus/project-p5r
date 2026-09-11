import request from 'supertest';
import { createApp } from '../bootstrap.js';
import { initDb, closeDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';

// ============================================================
// Le regole di categoria (2026-09-11): uno spillo di città non è condizionato, non porta altrove e
// si collega a un negozio, un'attività, un luogo o un Confidente; un consumabile è collezionabile
// per definizione; un informativo non si collega a niente. Il server le applica, chiunque scriva.
// ============================================================

const app = createApp();
beforeEach(async () => { runMigrations(initDb(':memory:')); await request(app).post('/api/mappe').send({ chiave: 'luoghi', nome: 'Luoghi', tipo: 'luogo' }).expect(201); });
afterEach(() => closeDb());
const crea = (extra: Record<string, unknown> = {}) => request(app).post('/api/mappe/luoghi/spilli').send({ tipo: 'attivita', nome: 'Luogo', x: 20, y: 30, ...extra });

it('uno spillo di città non è mai condizionato né bloccato: le condizioni inviate non si salvano, il pin resta', async () => {
  const partita = (await request(app).post('/api/partite').send({ nome: 'Posizioni' })).body.data.id;
  const s = (await crea({ condizioni: [{ tipo: 'fascia', fascia: 'sera' }] })).body.data;
  expect(s.condizioni).toEqual([]);
  const leggi = async () => (await request(app).get(`/api/mappe/luoghi?partita=${partita}`)).body.data.spilli[0];
  expect((await leggi()).disponibilita?.stato).not.toBe('bloccato');
  await request(app).put(`/api/mappe/spilli/${s.id}`).send({ condizioni: [{ tipo: 'piove' }] }).expect(200);
  expect((await leggi()).condizioni).toEqual([]);
  // cambiando tipo verso uno spostamento le condizioni tornano ammesse
  const cambiato = (await request(app).put(`/api/mappe/spilli/${s.id}`).send({ tipo: 'passaggio', condizioni: [{ tipo: 'piove' }] })).body.data;
  expect(cambiato.condizioni).toEqual([{ tipo: 'piove', testo: 'solo nei giorni di pioggia' }]);
});

it('la categoria decide collezionabile e riferimento: consumabile sì, gli altri no; un riferimento estraneo è rifiutato', async () => {
  expect((await crea({ tipo: 'forziere', collezionabile: false })).body.data.collezionabile).toBe(true);
  expect((await crea({ tipo: 'negozio', collezionabile: true })).body.data.collezionabile).toBe(false);
  expect((await crea({ tipo: 'nota', collezionabile: true })).body.data.collezionabile).toBe(false);
  // città → mappa no; spostamento → negozio no (luogo e punto sì: sono l'identità con cui il seed lo riconosce); informativo → negozio no
  expect((await crea({ tipo: 'negozio', riferimento: { tipo: 'mappa', chiave: 'luoghi' } })).status).toBe(400);
  expect((await crea({ tipo: 'passaggio', riferimento: { tipo: 'negozio', chiave: 'x' } })).status).toBe(400);
  expect((await crea({ tipo: 'nota', riferimento: { tipo: 'negozio', chiave: 'x' } })).status).toBe(400);
  // e un riferimento ammesso ma inesistente resta un 404, come prima
  expect((await crea({ tipo: 'negozio', riferimento: { tipo: 'negozio', chiave: 'non-esiste' } })).status).toBe(404);
});

it('il pacchetto porta e riporta le stesse regole: i valori fuori categoria non tornano', async () => {
  await crea({ tipo: 'forziere', nome: 'Scrigno' });
  await crea({ tipo: 'negozio', nome: 'Bottega' });
  const pacchetto = (await request(app).get('/api/mappe/esporta?radice=luoghi')).body.data;
  pacchetto.mappe[0].spilli[0].collezionabile = false;
  pacchetto.mappe[0].spilli[1].condizioni = [{ tipo: 'piove' }];
  await request(app).delete('/api/mappe/luoghi').expect(204);
  await request(app).post('/api/mappe/importa').send({ pacchetto }).expect(200);
  const spilli = (await request(app).get('/api/mappe/luoghi')).body.data.spilli as Array<{ nome: string; collezionabile: boolean; condizioni: unknown[] }>;
  expect(spilli.find((s) => s.nome === 'Scrigno')?.collezionabile).toBe(true);
  expect(spilli.find((s) => s.nome === 'Bottega')?.condizioni).toEqual([]);
});
