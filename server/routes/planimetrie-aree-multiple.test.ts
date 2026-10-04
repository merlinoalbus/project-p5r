// ============================================================
// Più aree della guida nella stessa planimetria (richiesta dell'utente, 2026-09-29)
// ============================================================
//
// «Quando associo le aree della guida alle mappe nei palazzi devo poter selezionare più elementi della
// guida alla stessa mappa… Se una mappa contiene più aree della guida deve mostrare le sue aree in
// ordine.» Resta la decisione del 2026-09-18: un'area ha una sola planimetria. Quindi:
// una mappa → più aree (in ordine di guida); un'area → al più una mappa.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { creaMappa, esportaMappe, importaMappe } from '../services/mappe/mappeService.js';
import { dettaglioDungeon } from '../services/dungeonService.js';
import type { MappaDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

const areeKamoshida = () => (prepared("SELECT chiave, nome, ordine FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine").all() as Array<{ chiave: string; nome: string; ordine: number }>);
const areeLegate = (mappa: string) => (prepared("SELECT entita_chiave FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'area' ORDER BY entita_chiave").all(mappa) as Array<{ entita_chiave: string }>).map((r) => r.entita_chiave).sort();
const colonne = (mappa: string) => prepared('SELECT entita_tipo, entita_chiave FROM mappa WHERE chiave = ?').get(mappa) as { entita_tipo: string | null; entita_chiave: string | null };

describe('più aree della guida nella stessa planimetria', () => {
  let una: MappaDto;
  let altra: MappaDto;
  beforeAll(() => {
    dbDiProva();
    una = creaMappa(undefined, { nome: 'Planimetria con più aree', tipo: 'area', genitore: 'dungeon-kamoshida' });
    altra = creaMappa(undefined, { nome: 'Planimetria vicina', tipo: 'area', genitore: 'dungeon-kamoshida' });
  });
  afterAll(() => closeDb());

  it('una planimetria contiene più aree, restituite e mostrate nella scheda del Palazzo in ordine di guida', async () => {
    const a = areeKamoshida();
    // si mandano in disordine: tornano in ordine di guida
    const r = await request(app).put(`/api/mappe/${una.chiave}/aree`).send({ aree: [a[9].chiave, a[3].chiave, a[6].chiave] });
    expect(r.status).toBe(200);
    expect(r.body.data.aree.map((x: { chiave: string }) => x.chiave)).toEqual([a[3].chiave, a[6].chiave, a[9].chiave]);
    const p = dettaglioDungeon('kamoshida').planimetrie.filter((x) => x.chiave === una.chiave);
    // una riga sola per la planimetria, con le sue aree in ordine
    expect(p).toHaveLength(1);
    expect(p[0].aree.map((x) => x.chiave)).toEqual([a[3].chiave, a[6].chiave, a[9].chiave]);
    expect(p[0].aree.map((x) => x.ordine)).toEqual([a[3].ordine, a[6].ordine, a[9].ordine]);
    // ogni area vede la planimetria fra le sue mappe
    for (const k of [a[3], a[6], a[9]]) expect(dettaglioDungeon('kamoshida').aree.find((x) => x.chiave === k.chiave)!.mappe.map((m) => m.chiave)).toContain(una.chiave);
    // le colonne dichiarano la prima in ordine di guida
    expect(colonne(una.chiave)).toEqual({ entita_tipo: 'area', entita_chiave: a[3].chiave });
  });

  it('un’area ha comunque una sola planimetria: aggiungerla altrove la stacca da qui, e le altre aree restano', async () => {
    const a = areeKamoshida();
    await request(app).put(`/api/mappe/${altra.chiave}/aree`).send({ aree: [a[3].chiave] }).expect(200);
    expect(areeLegate(altra.chiave)).toEqual([a[3].chiave].sort());
    expect(areeLegate(una.chiave)).toEqual([a[6].chiave, a[9].chiave].sort());
    // la planimetria che l'ha persa dichiara ora la sua prima area rimasta
    expect(colonne(una.chiave)).toEqual({ entita_tipo: 'area', entita_chiave: a[6].chiave });
  });

  it('l’insieme sostituisce: le aree non più elencate si staccano, e l’insieme vuoto le toglie tutte', async () => {
    const a = areeKamoshida();
    await request(app).put(`/api/mappe/${una.chiave}/aree`).send({ aree: [a[9].chiave] }).expect(200);
    expect(areeLegate(una.chiave)).toEqual([a[9].chiave]);
    await request(app).put(`/api/mappe/${una.chiave}/aree`).send({ aree: [] }).expect(200);
    expect(areeLegate(una.chiave)).toEqual([]);
    expect(colonne(una.chiave)).toEqual({ entita_tipo: null, entita_chiave: null });
  });

  it('gli altri legami della mappa (un luogo) non si toccano, e le colonne di un legame di altro tipo restano', async () => {
    const a = areeKamoshida();
    const luogo = (prepared('SELECT chiave FROM luogo LIMIT 1').get() as { chiave: string }).chiave;
    prepared("INSERT OR REPLACE INTO mappa_entita (mappa_chiave, entita_tipo, entita_chiave, fonte_json) VALUES (?, 'luogo', ?, '{}')").run(una.chiave, luogo);
    prepared("UPDATE mappa SET entita_tipo = 'luogo', entita_chiave = ? WHERE chiave = ?").run(luogo, una.chiave);
    await request(app).put(`/api/mappe/${una.chiave}/aree`).send({ aree: [a[1].chiave, a[2].chiave] }).expect(200);
    expect(prepared("SELECT 1 FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'luogo'").get(una.chiave)).toBeTruthy();
    expect(colonne(una.chiave)).toEqual({ entita_tipo: 'luogo', entita_chiave: luogo });
    expect(areeLegate(una.chiave)).toEqual([a[1].chiave, a[2].chiave].sort());
  });

  it('il pacchetto delle mappe porta tutte le aree e le rimette uguali all’importazione, senza cancellare il luogo', async () => {
    const a = areeKamoshida();
    const pacchetto = esportaMappe(una.chiave);
    const voce = pacchetto.mappe.find((m) => m.chiave === una.chiave)!;
    expect(voce.aree).toEqual([a[1].chiave, a[2].chiave]);
    // si staccano a mano, poi si reimporta il pacchetto
    prepared("DELETE FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'area'").run(una.chiave);
    importaMappe(pacchetto, { sovrascrivi: true });
    expect(areeLegate(una.chiave)).toEqual([a[1].chiave, a[2].chiave].sort());
    expect(prepared("SELECT 1 FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'luogo'").get(una.chiave)).toBeTruthy();
  });

  it('un pacchetto di prima, con la sola `entita` area, lega quell’area', () => {
    const a = areeKamoshida();
    const pacchetto = esportaMappe(altra.chiave);
    const voce = pacchetto.mappe.find((m) => m.chiave === altra.chiave)!;
    delete voce.aree;
    voce.entita = { tipo: 'area', chiave: a[12].chiave };
    importaMappe(pacchetto, { sovrascrivi: true });
    expect(areeLegate(altra.chiave)).toEqual([a[12].chiave]);
  });

  it('funziona sulle planimetrie vere, che l’interfaccia chiama con la chiave di percorso (diversa da quella interna)', async () => {
    const a = areeKamoshida();
    // una planimetria nativa del pacchetto, con la chiave che la scheda del Palazzo dà all'interfaccia
    const nativa = prepared(`SELECT e.mappa_chiave, e.entita_chiave FROM mappa_entita e JOIN dungeon_area a ON a.chiave = e.entita_chiave
      WHERE e.entita_tipo = 'area' AND a.dungeon_chiave = 'kamoshida' AND e.mappa_chiave LIKE 'nativo-%' ORDER BY a.ordine LIMIT 1`).get() as { mappa_chiave: string; entita_chiave: string };
    const interna = nativa.mappa_chiave;
    const p = dettaglioDungeon('kamoshida').planimetrie.find((x) => x.aree.some((ar) => ar.chiave === nativa.entita_chiave))!;
    expect(interna).not.toBe(p.chiave);
    const libera = a.find((x) => !prepared("SELECT 1 FROM mappa_entita WHERE entita_tipo = 'area' AND entita_chiave = ?").get(x.chiave))!;
    const r = await request(app).put(`/api/mappe/${encodeURIComponent(p.chiave)}/aree`).send({ aree: [p.aree[0].chiave, libera.chiave] });
    expect(r.status).toBe(200);
    expect(areeLegate(interna)).toEqual([p.aree[0].chiave, libera.chiave].sort());
    expect(dettaglioDungeon('kamoshida').planimetrie.find((x) => x.chiave === p.chiave)!.aree.map((x) => x.chiave)).toEqual([...r.body.data.aree.map((x: { chiave: string }) => x.chiave)]);
    // come ogni modifica dall'app, la riga diventa dell'utente
    expect((prepared('SELECT origine FROM mappa WHERE chiave = ?').get(interna) as { origine: string }).origine).toBe('utente');
  });

  it('un’area di un altro Palazzo non si lega, e nemmeno la mappa d’insieme del Palazzo', async () => {
    const madarame = (prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'madarame' ORDER BY ordine LIMIT 1").get() as { chiave: string }).chiave;
    const r1 = await request(app).put(`/api/mappe/${una.chiave}/aree`).send({ aree: [madarame] });
    expect(r1.status).toBe(400);
    expect(r1.body.error.code).toBe('area-di-altro-palazzo');
    const r2 = await request(app).put('/api/mappe/dungeon-kamoshida/aree').send({ aree: [areeKamoshida()[0].chiave] });
    expect(r2.status).toBe(400);
    expect(r2.body.error.code).toBe('mappa-fuori-palazzo');
    // anche dal legame singolo dell'editor
    expect((await request(app).put(`/api/mappe/${una.chiave}`).send({ entita: { tipo: 'area', chiave: madarame } })).status).toBe(400);
  });

  it('il legame singolo (`entita` di tipo area) sostituisce solo l’area dichiarata: le altre aree della planimetria restano', async () => {
    const a = areeKamoshida();
    const terza = creaMappa(undefined, { nome: 'Planimetria per il legame singolo', tipo: 'area', genitore: 'dungeon-kamoshida' });
    await request(app).put(`/api/mappe/${terza.chiave}/aree`).send({ aree: [a[14].chiave, a[15].chiave] }).expect(200);
    // le colonne dichiarano a[14]; il legame singolo la sostituisce con a[16]
    await request(app).put(`/api/mappe/${terza.chiave}`).send({ entita: { tipo: 'area', chiave: a[16].chiave } }).expect(200);
    expect(areeLegate(terza.chiave)).toEqual([a[15].chiave, a[16].chiave].sort());
    expect(colonne(terza.chiave)).toEqual({ entita_tipo: 'area', entita_chiave: a[15].chiave });
    // e togliere il legame singolo toglie solo l'area dichiarata
    await request(app).put(`/api/mappe/${terza.chiave}`).send({ entita: null }).expect(200);
    expect(areeLegate(terza.chiave)).toEqual([a[16].chiave]);
  });

  it('importazione: planimetrie nuove annidate, con la figlia prima del genitore, legano le loro aree', () => {
    const a = areeKamoshida();
    const base = { ordine: 0, immagine: null, asset: null, larghezza: null, altezza: null, entita: null, note: '', spilli: [] };
    // Palazzo › piano nuovo › stanza nuova con due aree: nel pacchetto la stanza viene prima del piano
    const esito = importaMappe({ versione: 1, mappe: [
      { ...base, chiave: 'prova-stanza-annidata', nome: 'Stanza annidata', tipo: 'area', genitore: 'prova-piano-annidato', aree: [a[5].chiave, a[4].chiave] },
      { ...base, chiave: 'prova-piano-annidato', nome: 'Piano annidato', tipo: 'area', genitore: 'dungeon-kamoshida' },
    ] }, { sovrascrivi: true });
    expect(esito.saltate).toEqual([]);
    expect(areeLegate('prova-stanza-annidata')).toEqual([a[4].chiave, a[5].chiave].sort());
    expect(colonne('prova-stanza-annidata')).toEqual({ entita_tipo: 'area', entita_chiave: a[4].chiave });
    // e un piano nuovo fuori da ogni Palazzo resta rifiutato, anche nel pacchetto
    expect(() => importaMappe({ versione: 1, mappe: [
      { ...base, chiave: 'prova-stanza-orfana', nome: 'Stanza orfana', tipo: 'area', genitore: 'prova-piano-orfano', aree: [a[7].chiave] },
      { ...base, chiave: 'prova-piano-orfano', nome: 'Piano orfano', tipo: 'area', genitore: null },
    ] }, { sovrascrivi: true })).toThrow(/planimetrie di un Palazzo/);
    expect(prepared("SELECT 1 FROM mappa WHERE chiave = 'prova-stanza-orfana'").get()).toBeUndefined();
  });

  it('spostare una planimetria con aree fuori dal suo Palazzo è un 400; dentro lo stesso Palazzo si può', async () => {
    const a = areeKamoshida();
    const quarta = creaMappa(undefined, { nome: 'Planimetria da spostare', tipo: 'area', genitore: 'dungeon-kamoshida' });
    await request(app).put(`/api/mappe/${quarta.chiave}/aree`).send({ aree: [a[8].chiave] }).expect(200);
    const r1 = await request(app).put(`/api/mappe/${quarta.chiave}`).send({ genitore: 'dungeon-madarame' });
    expect(r1.status).toBe(400);
    expect(r1.body.error.code).toBe('area-di-altro-palazzo');
    const r2 = await request(app).put(`/api/mappe/${quarta.chiave}`).send({ genitore: null });
    expect(r2.status).toBe(400);
    expect(r2.body.error.code).toBe('mappa-fuori-palazzo');
    expect((prepared('SELECT genitore_chiave FROM mappa WHERE chiave = ?').get(quarta.chiave) as { genitore_chiave: string }).genitore_chiave).toBe('dungeon-kamoshida');
    // sotto un'altra planimetria dello stesso Palazzo sì, con le aree intatte
    await request(app).put(`/api/mappe/${quarta.chiave}`).send({ genitore: 'prova-piano-annidato' }).expect(200);
    expect(areeLegate(quarta.chiave)).toEqual([a[8].chiave]);
    // il piano intermedio non ha aree sue, ma le discendenti sì: nemmeno lui esce dal Palazzo
    const r3 = await request(app).put('/api/mappe/prova-piano-annidato').send({ genitore: 'dungeon-madarame' });
    expect(r3.status).toBe(400);
    expect(r3.body.error.code).toBe('area-di-altro-palazzo');
    // senza aree la mappa si sposta dove si vuole
    await request(app).put(`/api/mappe/${quarta.chiave}/aree`).send({ aree: [] }).expect(200);
    await request(app).put(`/api/mappe/${quarta.chiave}`).send({ genitore: null }).expect(200);
  });

  it('importazione: un elenco di aree non valido è un 400, non un errore del database', async () => {
    const pacchetto = esportaMappe(una.chiave);
    const voce = pacchetto.mappe.find((m) => m.chiave === una.chiave)!;
    (voce as unknown as { aree: unknown }).aree = [{}];
    expect(() => importaMappe(pacchetto, { sovrascrivi: true })).toThrow(/Aree della guida non valide/);
  });

  it('validazione: area inesistente 400, mappa inesistente 404, corpo senza elenco 400', async () => {
    expect((await request(app).put(`/api/mappe/${una.chiave}/aree`).send({ aree: ['area-che-non-esiste'] })).status).toBe(400);
    expect((await request(app).put('/api/mappe/mappa-che-non-esiste/aree').send({ aree: [] })).status).toBe(404);
    expect((await request(app).put(`/api/mappe/${una.chiave}/aree`).send({})).status).toBe(400);
  });
});
