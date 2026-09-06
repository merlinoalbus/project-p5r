import request from 'supertest';
import path from 'node:path';
import { createApp } from '../bootstrap.js';
import { initDb, closeDb, getDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { urlDestinazioneMondo } from '../../shared/accessoMondo.js';

const app = createApp();
beforeEach(() => {
  const db = initDb(':memory:'); runMigrations(db); caricaSeed(db, path.resolve(import.meta.dirname, '../../data/seed'));
  // Isola i casi della fixture dai pin preesistenti di questo solo negozio.
  db.prepare("DELETE FROM spillo WHERE (riferimento_tipo='negozio' AND riferimento_chiave='untouchable') OR (riferimento_tipo='luogo' AND riferimento_chiave IN (SELECT chiave FROM luogo WHERE negozio='untouchable'))").run();
});
afterEach(() => closeDb());
const accesso = (tipo: string, chiave: string) => request(app).get(`/api/mappe/accesso/${tipo}/${encodeURIComponent(chiave)}`);

async function creaPin(mappa: string, negozio = 'untouchable') {
  const r = await request(app).post(`/api/mappe/${mappa}/spilli`).send({ tipo: 'negozio', nome: 'Armeria', x: 0, y: 100, riferimento: { tipo: 'negozio', chiave: negozio } });
  expect(r.status).toBe(201);
  return r.body.data.id as number;
}

it('risolve lo stesso pin dal negozio e dai suoi articoli senza inventare coordinate', async () => {
  const id = await creaPin('shibuya');
  const articolo = getDb().prepare("SELECT chiave FROM articolo WHERE negozio_chiave='untouchable' AND nascosto=0 LIMIT 1").get() as { chiave: string };
  const luogo = getDb().prepare("SELECT chiave FROM luogo WHERE negozio='untouchable' LIMIT 1").get() as { chiave: string };
  for (const [tipo, chiave] of [['negozio', 'untouchable'], ['articolo', articolo.chiave], ['luogo', luogo.chiave]]) {
    const r = await accesso(tipo, chiave);
    expect(r.status).toBe(200);
    expect(r.body.data.esito).toBe('unica');
    expect(r.body.data.destinazioni[0]).toMatchObject({ mappa: 'shibuya', spillo: id, centro: null });
    expect(urlDestinazioneMondo(r.body.data.destinazioni[0])).toBe(`/guida/mappe/shibuya?spillo=${id}`);
  }
  getDb().prepare("UPDATE negozio SET nascosto=1 WHERE chiave='untouchable'").run();
  expect((await accesso('luogo', luogo.chiave)).body.data.esito).toBe('assente');
  expect((await accesso('articolo', articolo.chiave)).body.data.esito).toBe('assente');
});

it('conserva alternative reali e non sceglie arbitrariamente il primo piano', async () => {
  const primo = await creaPin('shibuya');
  const secondo = await creaPin('shibuya');
  const r = await accesso('negozio', 'untouchable');
  expect(r.body.data.esito).toBe('multipla');
  expect(r.body.data.destinazioni.map((d: { spillo: number }) => d.spillo)).toEqual([primo, secondo]);
});

it('unifica riferimento diretto e mappa della stessa entità senza duplicare destinazioni', async () => {
  await creaPin('shibuya');
  getDb().prepare("UPDATE mappa SET entita_tipo='negozio',entita_chiave='untouchable' WHERE chiave='citta-shibuya'").run();
  const r = await accesso('negozio', 'untouchable');
  expect(r.body.data.destinazioni).toHaveLength(1);
  expect(r.body.data.destinazioni[0].provenienze.map((p: { criterio: string }) => p.criterio)).toContain('entita-mappa');
});

it('raggiunge il pin di un luogo attraverso il suo legame strutturato con il negozio', async () => {
  const luogo = getDb().prepare("SELECT chiave FROM luogo WHERE negozio='untouchable' LIMIT 1").get() as { chiave: string };
  const r = await request(app).post('/api/mappe/shibuya/spilli').send({ tipo: 'negozio', nome: 'Untouchable', x: 30, y: 40, riferimento: { tipo: 'luogo', chiave: luogo.chiave } });
  expect(r.status).toBe(201);
  const a = (await accesso('negozio', 'untouchable')).body.data;
  expect(a.esito).toBe('unica');
  expect(a.destinazioni[0].spillo).toBe(r.body.data.id);
  expect(a.destinazioni[0].provenienze).toContainEqual({ tipo: 'luogo', chiave: luogo.chiave, criterio: 'riferimento-spillo' });
});

it('usa ingresso solo per il quartiere e conserva alias dopo rinomina', async () => {
  expect((await request(app).put('/api/compendio/citta/shibuya/ingresso').send({ mappa: 'shibuya', x: 0, y: 100, zoom: 3 })).status).toBe(200);
  const id = await creaPin('shibuya');
  expect((await request(app).put('/api/mappe/shibuya').send({ nome: 'Shibuya Centrale' })).status).toBe(200);
  const q = (await accesso('quartiere', 'shibuya')).body.data.destinazioni[0];
  expect(q).toMatchObject({ mappa: 'shibuya-centrale', centro: { x: 0, y: 100, zoom: 3 } });
  expect((await accesso('negozio', 'untouchable')).body.data.destinazioni[0]).toMatchObject({ mappa: 'shibuya-centrale', spillo: id, centro: null });
  expect((await accesso('mappa', 'shibuya')).body.data.destinazioni[0].mappa).toBe('shibuya-centrale');
});

it('distingue associazione assente, entità inesistente e pin eliminato', async () => {
  expect((await accesso('negozio', 'untouchable')).body.data).toMatchObject({ esito: 'assente', destinazioni: [] });
  expect((await accesso('negozio', 'inesistente')).status).toBe(404);
  expect((await accesso('tipo-inesistente', 'untouchable')).status).toBe(400);
  const id = await creaPin('shibuya');
  expect((await request(app).delete(`/api/mappe/spilli/${id}`)).status).toBe(204);
  expect((await accesso('negozio', 'untouchable')).body.data.esito).toBe('assente');
  getDb().prepare("UPDATE negozio SET nascosto=1 WHERE chiave='untouchable'").run();
  expect((await accesso('negozio', 'untouchable')).status).toBe(404);
});

it('un’attività porta al posto che dichiara, e non a uno scelto per somiglianza del nome', async () => {
  const db = getDb();
  const attivita = db.prepare("SELECT chiave, nome, luogo_chiave FROM attivita WHERE luogo_chiave IS NOT NULL LIMIT 1").get() as { chiave: string; nome: string; luogo_chiave: string };
  expect(attivita).toBeTruthy();
  // un luogo che *contiene* il nome dell'attività ma che nessuno ha dichiarato: non deve essere scelto
  const esca = `${attivita.luogo_chiave}/esca-${attivita.chiave}`;
  db.prepare("INSERT OR IGNORE INTO luogo (chiave, quartiere_chiave, ordine, tipo, nome, fonte) VALUES (?,?,?,?,?,?)")
    .run(esca, attivita.luogo_chiave, 999, 'altro', `Locale con ${attivita.nome} e altro`, 'test');
  const r = await accesso('attivita', attivita.chiave);
  expect(r.status).toBe(200);
  const riferimenti = JSON.stringify(r.body.data);
  expect(riferimenti).not.toContain(esca);
  // ma il posto dichiarato c'è
  expect(riferimenti).toContain(attivita.luogo_chiave);
});

it('un confidente porta ai luoghi che il catalogo gli attribuisce', async () => {
  const db = getDb();
  const riga = db.prepare("SELECT chiave FROM luogo WHERE confidenti_json IS NOT NULL AND confidenti_json <> '[]' LIMIT 1").get() as { chiave: string } | undefined;
  if (!riga) return;
  const confidente = db.prepare('SELECT confidenti_json FROM luogo WHERE chiave=?').get(riga.chiave) as { confidenti_json: string };
  const prima = JSON.parse(confidente.confidenti_json)[0] as { chiave?: string } | string;
  const chiave = typeof prima === 'string' ? prima : prima.chiave;
  if (!chiave) return;
  const r = await accesso('confidente', chiave);
  expect(r.status).toBe(200);
  expect(JSON.stringify(r.body.data)).toContain(riga.chiave);
});
