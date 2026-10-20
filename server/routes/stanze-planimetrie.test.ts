// ============================================================
// La stanza di una planimetria si cambia (richiesta dell'utente, 2026-09-30)
// ============================================================
//
// «Come faccio a rendere una mappa censita come a sé e trasformarla in planimetria di un'altra mappa? E il
// viceversa, prendere una planimetria gestita all'interno di una mappa ed eleggerla mappa individuale?»
// `PUT /api/mappe/:chiave/stanza` con `con` (entra nella stanza di quella) o `con: null` (diventa una stanza a sé), in un'operazione
// sola. Da L3 la «stanza» di una planimetria di un Palazzo è la sua **Area** (migrazione 110): la rotta vecchia sposta la versione fra
// le Aree (`PUT /api/aree/colloca`), e il nome della stanza è il nome dell'Area. I gruppi d'immagini non si scrivono più.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { esportaMappe, importaMappe } from '../services/mappe/mappeService.js';
import type { MappaDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';
import { planimetriaDiPalazzo } from '../../test/planimetriaDiPalazzo.js';

const app = createApp();

/** L'Area di una planimetria con la sua versione (null se non ne ha). */
const areaDi = (mappa: string) => prepared(`SELECT a.chiave, a.nome, a.nome_rivisto AS rivisto, m.versione_ordine AS versione, m.versione_etichetta AS etichetta
  FROM mappa m JOIN area a ON a.chiave = m.area_chiave WHERE m.chiave = ?`).get(mappa) as { chiave: string; nome: string; rivisto: number; versione: number; etichetta: string | null } | undefined;
/** Il gruppo d'immagini salvato nella presentazione (fonte vecchia: da L3 nessuno lo scrive per le planimetrie con un'Area). */
const gruppo = (mappa: string) => (prepared('SELECT gruppo_immagini_json FROM mappa_presentazione WHERE mappa_chiave = ?').get(mappa) as { gruppo_immagini_json: string | null } | undefined)?.gruppo_immagini_json ?? null;

describe('la stanza (Area) di una planimetria', () => {
  let a: MappaDto; let b: MappaDto; let c: MappaDto;
  beforeAll(() => {
    dbDiProva();
    a = planimetriaDiPalazzo('kamoshida', { nome: 'Salone porzione ovest' });
    b = planimetriaDiPalazzo('kamoshida', { nome: 'Salone' });
    c = planimetriaDiPalazzo('kamoshida', { nome: 'Salone porzione est' });
  });
  afterAll(() => closeDb());

  it('una planimetria sola nella sua Area entra nell’Area di un’altra, che prende il nome dato; l’etichetta resta; l’Area rimasta vuota se ne va', async () => {
    await request(app).put(`/api/mappe/${a.chiave}/presentazione`).send({ etichetta: 'Porzione ovest' }).expect(200);
    expect(areaDi(a.chiave)!.etichetta).toBe('Porzione ovest');
    const areaDiA = areaDi(a.chiave)!.chiave;
    const r = await request(app).put(`/api/mappe/${a.chiave}/stanza`).send({ con: b.chiave, nome: 'Salone dei trofei' });
    expect(r.status).toBe(200);
    expect(areaDi(b.chiave)).toMatchObject({ nome: 'Salone dei trofei', rivisto: 1, versione: 0 });
    // in fondo alle versioni dell'Area di b, con la sua etichetta
    expect(areaDi(a.chiave)).toMatchObject({ chiave: areaDi(b.chiave)!.chiave, versione: 1, etichetta: 'Porzione ovest' });
    expect(prepared('SELECT 1 FROM area WHERE chiave = ?').get(areaDiA)).toBeUndefined();
    // una terza entra in fondo
    await request(app).put(`/api/mappe/${c.chiave}/stanza`).send({ con: a.chiave }).expect(200);
    expect(areaDi(c.chiave)).toMatchObject({ chiave: areaDi(b.chiave)!.chiave, versione: 2 });
    // l'Area non è più quella di una planimetria sola: il nome dato a chi entra dopo non la rinomina
    expect(areaDi(b.chiave)!.nome).toBe('Salone dei trofei');
    // i gruppi d'immagini (fonte vecchia) non si scrivono
    expect([gruppo(a.chiave), gruppo(b.chiave), gruppo(c.chiave)]).toEqual([null, null, null]);
  });

  it('una versione di un’Area diventa un’Area a sé, col nome dato e la sua etichetta; le altre restano insieme e si ricompattano', async () => {
    const prima = areaDi(b.chiave)!.chiave;
    await request(app).put(`/api/mappe/${a.chiave}/stanza`).send({ con: null, nome: 'Ala ovest' }).expect(200);
    expect(areaDi(a.chiave)).toMatchObject({ nome: 'Ala ovest', versione: 0, etichetta: 'Porzione ovest' });
    expect(areaDi(a.chiave)!.chiave).not.toBe(prima);
    expect(areaDi(b.chiave)).toMatchObject({ chiave: prima, versione: 0 });
    expect(areaDi(c.chiave)).toMatchObject({ chiave: prima, versione: 1 });
    // anche la planimetria che dava il nome all'Area può uscirne
    await request(app).put(`/api/mappe/${b.chiave}/stanza`).send({ con: null, nome: 'Salone' }).expect(200);
    expect(areaDi(b.chiave)!.chiave).not.toBe(areaDi(c.chiave)!.chiave);
    expect(areaDi(b.chiave)!.nome).toBe('Salone');
    // una planimetria già sola nella sua Area: `con: null` col nome rinomina l'Area
    await request(app).put(`/api/mappe/${b.chiave}/stanza`).send({ con: null, nome: 'Salone grande' }).expect(200);
    expect(areaDi(b.chiave)).toMatchObject({ nome: 'Salone grande', rivisto: 1 });
  });

  it('il nome dell’Area scelto da una persona vale per tutte le sue planimetrie, anche per chi ci entra dopo, e viaggia nel pacchetto', async () => {
    const d = planimetriaDiPalazzo('kamoshida', { nome: 'Cripta' });
    const e = planimetriaDiPalazzo('kamoshida', { nome: 'Cripta laterale' });
    await request(app).put(`/api/mappe/${e.chiave}/stanza`).send({ con: d.chiave, nome: 'Cripta' }).expect(200);
    await request(app).put(`/api/mappe/${e.chiave}/presentazione`).send({ gruppoNome: 'Cripta dei re' }).expect(200);
    expect(areaDi(d.chiave)).toMatchObject({ nome: 'Cripta dei re', rivisto: 1 });
    expect(areaDi(e.chiave)).toMatchObject({ nome: 'Cripta dei re', rivisto: 1 });
    // la sola etichetta non toglie il segno
    await request(app).put(`/api/mappe/${d.chiave}/presentazione`).send({ etichetta: 'Pianta completa' }).expect(200);
    expect(areaDi(d.chiave)).toMatchObject({ rivisto: 1, etichetta: 'Pianta completa' });
    const f = planimetriaDiPalazzo('kamoshida', { nome: 'Cripta, ossario' });
    await request(app).put(`/api/mappe/${f.chiave}/stanza`).send({ con: d.chiave }).expect(200);
    expect(areaDi(f.chiave)).toMatchObject({ nome: 'Cripta dei re', rivisto: 1 });
    // il nome e il segno viaggiano nel pacchetto delle mappe: esportati e reimportati restano
    const pacchetto = esportaMappe(d.chiave);
    expect(pacchetto.aree?.find((x) => x.chiave === areaDi(d.chiave)!.chiave)).toMatchObject({ nome: 'Cripta dei re', nomeRivisto: true });
    prepared('UPDATE area SET nome = ?, nome_rivisto = 0 WHERE chiave = ?').run('Cripta', areaDi(d.chiave)!.chiave);
    importaMappe(pacchetto, { sovrascrivi: true });
    expect(areaDi(d.chiave)).toMatchObject({ nome: 'Cripta dei re', rivisto: 1 });
  });

  it('rinominare una planimetria (anche dall’editor) non rinomina la sua Area, né la prima né le altre', async () => {
    const g = planimetriaDiPalazzo('kamoshida', { nome: 'Torre ovest' });
    const h = planimetriaDiPalazzo('kamoshida', { nome: 'Torre ovest bis' });
    await request(app).put(`/api/mappe/${h.chiave}/stanza`).send({ con: g.chiave }).expect(200);
    const area = areaDi(g.chiave)!;
    await request(app).put(`/api/mappe/${h.chiave}`).send({ nome: 'Torre ovest, porzione' }).expect(200);
    await request(app).put(`/api/mappe/${g.chiave}`).send({ nome: 'Torre ovest rinominata' }).expect(200);
    expect(areaDi(g.chiave)).toMatchObject({ chiave: area.chiave, nome: area.nome, rivisto: area.rivisto });
    expect(areaDi(h.chiave)!.nome).toBe(area.nome);
    // il titolo della «stanza» di un gruppo d'immagini non si fissa più per le planimetrie dei Palazzi
    expect([gruppo(g.chiave), gruppo(h.chiave)]).toEqual([null, null]);
  });

  it('solo fra planimetrie dello stesso luogo; non nella propria Area; mappa inesistente 404; corpo non valido 400', async () => {
    const altrove = planimetriaDiPalazzo('madarame', { nome: 'Galleria' });
    const r1 = await request(app).put(`/api/mappe/${a.chiave}/stanza`).send({ con: altrove.chiave });
    expect(r1.status).toBe(400);
    expect(r1.body.error.code).toBe('stanza-di-altro-luogo');
    const r2 = await request(app).put(`/api/mappe/${a.chiave}/stanza`).send({ con: a.chiave });
    expect(r2.status).toBe(400);
    expect(r2.body.error.code).toBe('stanza-non-valida');
    expect((await request(app).put(`/api/mappe/${a.chiave}/stanza`).send({ con: 'mappa-che-non-esiste' })).status).toBe(404);
    expect((await request(app).put(`/api/mappe/${a.chiave}/stanza`).send({})).status).toBe(400);
  });
});
