// ============================================================
// Un'area della guida si elimina davvero (richiesta dell'utente, 2026-09-30)
// ============================================================
//
// «Devo poter rimuovere un'area/planimetria» — e alla domanda «nasconderla o eliminarla?» la risposta è
// stata «eliminarla davvero». Con l'area se ne vanno i suoi punti e quel che le partite ne avevano
// segnato, gli spilli della guida, i timbri, i legami con le planimetrie (che tengono le altre aree);
// l'ordine delle aree che restano non ha buchi.
// ============================================================

import request from 'supertest';
import { closeDb, initDb, prepared } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import { creaMappa } from '../services/mappe/mappeService.js';
import { dettaglioDungeon } from '../services/dungeonService.js';

const app = createApp();

const aree = (dungeon: string) => prepared('SELECT chiave, ordine FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine').all(dungeon) as Array<{ chiave: string; ordine: number }>;
const conta = (sql: string, ...p: unknown[]) => (prepared(sql).get(...p) as { n: number }).n;

describe('eliminare un’area della guida', () => {
  let partita: number;
  beforeAll(async () => {
    const db = initDb(':memory:');
    caricaPacchetto(db);
    invalidaCacheTraduzioni();
    partita = ((await request(app).post('/api/partite').send({ nome: 'Prova aree' })).body.data as { id: number }).id;
  });
  afterAll(() => closeDb());

  it('toglie l’area con i suoi punti e le loro segnature; la planimetria tiene le altre aree; l’ordine si ricompatta', async () => {
    const prima = aree('kamoshida');
    const [a1, a2] = [prima[4], prima[5]];
    const mappa = creaMappa(undefined, { nome: 'Planimetria con due aree', tipo: 'area', genitore: 'dungeon-kamoshida' });
    await request(app).put(`/api/mappe/${mappa.chiave}/aree`).send({ aree: [a1.chiave, a2.chiave] }).expect(200);
    // un punto dell'area segnato dalla partita
    const punto = await request(app).post(`/api/compendio/aree/${a1.chiave}/punti`).send({ nome: 'Punto da perdere', tipo: 'altro' });
    expect(punto.status).toBe(201);
    prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', 'x')").run(partita, punto.body.data.chiave);

    const r = await request(app).delete(`/api/compendio/aree/${a1.chiave}`);
    expect(r.status).toBe(204);
    expect(conta('SELECT COUNT(*) AS n FROM dungeon_area WHERE chiave = ?', a1.chiave)).toBe(0);
    expect(conta('SELECT COUNT(*) AS n FROM punto_interesse WHERE area_chiave = ?', a1.chiave)).toBe(0);
    expect(conta('SELECT COUNT(*) AS n FROM punto_partita WHERE punto_chiave = ?', punto.body.data.chiave)).toBe(0);
    // la planimetria resta, con l'altra area, e le colonne dichiarano quella
    const legate = prepared("SELECT entita_chiave FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'area'").all(mappa.chiave) as Array<{ entita_chiave: string }>;
    expect(legate.map((x) => x.entita_chiave)).toEqual([a2.chiave]);
    expect(prepared('SELECT entita_tipo, entita_chiave FROM mappa WHERE chiave = ?').get(mappa.chiave)).toEqual({ entita_tipo: 'area', entita_chiave: a2.chiave });
    // l'ordine resta consecutivo, con le altre nello stesso ordine
    const dopo = aree('kamoshida');
    expect(dopo.map((x) => x.ordine)).toEqual(dopo.map((_, i) => i));
    expect(dopo.map((x) => x.chiave)).toEqual(prima.filter((x) => x.chiave !== a1.chiave).map((x) => x.chiave));
    expect(dettaglioDungeon('kamoshida').aree).toHaveLength(prima.length - 1);
  });

  it('gli spilli della guida senza mappa, che vincolano l’area, se ne vanno con il loro «raccolto»', async () => {
    const riga = prepared('SELECT area_guida_chiave AS area FROM spillo WHERE area_guida_chiave IS NOT NULL LIMIT 1').get() as { area: string } | undefined;
    expect(riga).toBeTruthy();
    const uid = (prepared('SELECT uid FROM spillo WHERE area_guida_chiave = ? AND uid IS NOT NULL LIMIT 1').get(riga!.area) as { uid: string } | undefined)?.uid;
    if (uid) prepared("INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, 1, 'x')").run(partita, uid);
    await request(app).delete(`/api/compendio/aree/${riga!.area}`).expect(204);
    expect(conta('SELECT COUNT(*) AS n FROM spillo WHERE area_guida_chiave = ?', riga!.area)).toBe(0);
    if (uid) expect(conta('SELECT COUNT(*) AS n FROM spillo_partita WHERE spillo_uid = ?', uid)).toBe(0);
  });

  it('i timbri di un dedalo eliminato spariscono dalle partite', async () => {
    const dedalo = aree('mementos')[0].chiave;
    prepared("INSERT INTO timbri_dedalo_partita (partita_id, area_chiave, raccolti, updated_at) VALUES (?, ?, 2, 'x')").run(partita, dedalo);
    await request(app).delete(`/api/compendio/aree/${dedalo}`).expect(204);
    expect(conta('SELECT COUNT(*) AS n FROM timbri_dedalo_partita WHERE area_chiave = ?', dedalo)).toBe(0);
  });

  it('i riferimenti dentro i testi JSON seguono l’area: piante delle altre aree, Ombre della Battaglia, mappe assenti', async () => {
    const json = (chiave: string) => JSON.parse((prepared('SELECT json FROM dati_guida WHERE chiave = ?').get(chiave) as { json: string }).json) as Record<string, unknown>;
    // una pianta che dice di coprire un'altra area
    const pianta = prepared("SELECT area_chiave, copre_aree_json FROM pianta_area WHERE copre_aree_json LIKE '[\"%' LIMIT 1").get() as { area_chiave: string; copre_aree_json: string };
    const coperta = (JSON.parse(pianta.copre_aree_json) as string[])[0];
    await request(app).delete(`/api/compendio/aree/${coperta}`).expect(204);
    expect(JSON.parse((prepared('SELECT copre_aree_json FROM pianta_area WHERE area_chiave = ?').get(pianta.area_chiave) as { copre_aree_json: string }).copre_aree_json)).not.toContain(coperta);

    // un dedalo con le sue Ombre: il collegamento se ne va, il nome dell'area resta
    const ombre = () => (json('battaglia').ombre as Array<{ area: string | null; areaChiave: string | null }>);
    const conArea = ombre().find((o) => o.areaChiave)!;
    const quante = ombre().filter((o) => o.areaChiave === conArea.areaChiave).length;
    await request(app).delete(`/api/compendio/aree/${conArea.areaChiave}`).expect(204);
    expect(ombre().filter((o) => o.areaChiave === conArea.areaChiave)).toHaveLength(0);
    expect(ombre().filter((o) => o.area === conArea.area && o.areaChiave === null).length).toBeGreaterThanOrEqual(quante);

    // un'area senza pianta, spiegata in «mappe-assenti»
    const assente = Object.keys(json('mappe-assenti')).find((k) => prepared('SELECT 1 FROM dungeon_area WHERE chiave = ?').get(k))!;
    await request(app).delete(`/api/compendio/aree/${assente}`).expect(204);
    expect(Object.keys(json('mappe-assenti'))).not.toContain(assente);
  });

  it('un nemico non si segna raccolto (si rigenera); togliere un vecchio «raccolto» resta possibile', async () => {
    const mappa = creaMappa(undefined, { nome: 'Planimetria con un nemico', tipo: 'area', genitore: 'dungeon-kamoshida' });
    const nemico = await request(app).post(`/api/mappe/${mappa.chiave}/spilli`).send({ tipo: 'nemico', nome: 'Ombra di guardia', x: 10, y: 10 });
    expect(nemico.status).toBe(201);
    expect(nemico.body.data.collezionabile).toBe(false);
    const r = await request(app).put(`/api/partite/${partita}/spilli/${nemico.body.data.id}`).send({ raccolto: true });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('spillo-non-raccoglibile');
    expect((await request(app).put(`/api/partite/${partita}/spilli/${nemico.body.data.id}`).send({ raccolto: false })).status).toBe(200);
  });

  it('un’area che non esiste è un 404', async () => {
    expect((await request(app).delete('/api/compendio/aree/area-che-non-esiste')).status).toBe(404);
  });
});
