import request from 'supertest';
import { createApp } from '../bootstrap.js';
import { initDb, closeDb, getDb } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { urlDestinazioneMondo } from '../../shared/accessoMondo.js';

const app = createApp();
beforeEach(() => {
  const db = initDb(':memory:'); caricaPacchetto(db);
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
  // Tolto il negozio, il pin sparisce: il luogo non ha piu' un punto preciso, ma il quartiere che
  // dichiara resta un posto sulla mappa. La differenza dev'essere leggibile nel criterio.
  getDb().prepare("UPDATE negozio SET nascosto=1 WHERE chiave='untouchable'").run();
  const dopo = (await accesso('luogo', luogo.chiave)).body.data;
  expect(dopo.destinazioni.length).toBeGreaterThan(0);
  expect(dopo.destinazioni.every((d: { spillo: number | null }) => d.spillo === null)).toBe(true);
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

it('distingue il punto preciso dal posto dichiarato, l’entità inesistente e il pin eliminato', async () => {
  // Senza pin il negozio arriva comunque al quartiere che dichiara, ma con il criterio che lo dice
  const senzaPin = (await accesso('negozio', 'untouchable')).body.data;
  expect(senzaPin.destinazioni.length).toBeGreaterThan(0);
  expect(senzaPin.destinazioni.every((d: { spillo: number | null }) => d.spillo === null)).toBe(true);
  expect((await accesso('negozio', 'inesistente')).status).toBe(404);
  expect((await accesso('tipo-inesistente', 'untouchable')).status).toBe(400);
  const id = await creaPin('shibuya');
  const conPin = (await accesso('negozio', 'untouchable')).body.data;
  expect(conPin.destinazioni[0].spillo).toBe(id);
  // e il posto dichiarato non si aggiunge accanto al punto preciso: sarebbe una seconda meta
  expect(conPin.destinazioni.flatMap((d: { provenienze: Array<{ criterio: string }> }) => d.provenienze.map(p => p.criterio)))
    .not.toContain('posto-dichiarato');
  expect(conPin.destinazioni).toHaveLength(1);
  expect((await request(app).delete(`/api/mappe/spilli/${id}`)).status).toBe(204);
  expect((await accesso('negozio', 'untouchable')).body.data.destinazioni.every((d: { spillo: number | null }) => d.spillo === null)).toBe(true);
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
  // niente uscite anticipate: se la fixture non ha il caso, il test deve dirlo invece di passare a vuoto
  expect(riga).toBeTruthy();
  const confidente = db.prepare('SELECT confidenti_json FROM luogo WHERE chiave=?').get(riga!.chiave) as { confidenti_json: string };
  const prima = JSON.parse(confidente.confidenti_json)[0] as { chiave?: string } | string;
  const chiave = typeof prima === 'string' ? prima : prima.chiave;
  expect(chiave).toBeTruthy();
  const r = await accesso('confidente', chiave!);
  expect(r.status).toBe(200);
  expect(JSON.stringify(r.body.data)).toContain(riga!.chiave);
});

it('non affianca mai una meta generica al pin preciso, nemmeno su mappe diverse', async () => {
  // il pin sta su una planimetria figlia, il quartiere è un'altra mappa: la deduplicazione per
  // chiave uguale non basterebbe, e infatti qui si verifica il comportamento, non l'implementazione
  const luogo = getDb().prepare("SELECT chiave FROM luogo WHERE negozio='untouchable' LIMIT 1").get() as { chiave: string };
  const figlia = await request(app).post('/api/mappe').send({ chiave: 'shibuya-sotterraneo-prova', nome: 'Sotterraneo di prova', genitore: 'citta-shibuya', tipo: 'quartiere' });
  expect([201, 409]).toContain(figlia.status);
  const pin = await request(app).post('/api/mappe/shibuya-sotterraneo-prova/spilli')
    .send({ tipo: 'negozio', nome: 'Untouchable', x: 20, y: 30, riferimento: { tipo: 'luogo', chiave: luogo.chiave } });
  expect(pin.status).toBe(201);
  const r = (await accesso('luogo', luogo.chiave)).body.data;
  const criteri = r.destinazioni.flatMap((d: { provenienze: Array<{ criterio: string }> }) => d.provenienze.map((p) => p.criterio));
  expect(criteri).not.toContain('posto-dichiarato');
  expect(r.destinazioni.every((d: { spillo: number | null }) => d.spillo !== null)).toBe(true);
});

it('senza alcun pin arriva al posto dichiarato, e lo dice nel criterio', async () => {
  // un luogo che nessun pin riferisce: l'unica via è il quartiere in cui sta, ed è un ripiego
  const l = getDb().prepare(`SELECT chiave FROM luogo WHERE quartiere_chiave IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM spillo s WHERE s.riferimento_tipo='luogo' AND s.riferimento_chiave=luogo.chiave AND s.mappa_chiave IS NOT NULL)
      AND negozio IS NULL LIMIT 1`).get() as { chiave: string } | undefined;
  expect(l).toBeTruthy();
  const r = (await accesso('luogo', l!.chiave)).body.data;
  expect(r.destinazioni.length).toBeGreaterThan(0);
  expect(r.destinazioni.every((d: { spillo: number | null }) => d.spillo === null)).toBe(true);
  expect(r.destinazioni.flatMap((d: { provenienze: Array<{ criterio: string }> }) => d.provenienze.map((p) => p.criterio)))
    .toContain('posto-dichiarato');
});
