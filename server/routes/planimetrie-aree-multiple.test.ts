// ============================================================
// Più aree della guida nella stessa planimetria (richiesta dell'utente, 2026-09-29)
// ============================================================
//
// «Quando associo le aree della guida alle mappe nei palazzi devo poter selezionare più elementi della
// guida alla stessa mappa… Se una mappa contiene più aree della guida deve mostrare le sue aree in
// ordine.» E dal 2026-10-04 (decisione dell'utente, che supera quella del 2026-09-18) un'area può stare su
// più planimetrie. Quindi: una mappa → più aree (in ordine di guida); un'area → una o più mappe.
//
// Da L3 (migrazione 110) le «aree della guida» si chiamano infiltrazioni e il legame è dell'**Area** del Palazzo a cui la planimetria
// appartiene (`infiltrazione_area`): `PUT /api/mappe/:k/aree` è una rotta vecchia riscritta sul modello nuovo, e le colonne
// `entita_*` e `mappa_entita` di tipo area non si scrivono più. I casi sono gli stessi, con le attese del modello nuovo.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { esportaMappe, importaMappe } from '../services/mappe/mappeService.js';
import { dettaglioDungeon } from '../services/dungeonService.js';
import type { MappaDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';
import { planimetriaDiPalazzo } from '../../test/planimetriaDiPalazzo.js';

const app = createApp();

/** Chiave, nome e ordine delle infiltrazioni del Palazzo di Kamoshida, nell'ordine della guida. */
const areeKamoshida = () => (prepared("SELECT chiave, nome, ordine FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine").all() as Array<{ chiave: string; nome: string; ordine: number }>);
/** Le infiltrazioni legate alla planimetria: quelle della sua Area (L3), ordinate per chiave. */
const areeLegate = (mappa: string) => (prepared(`SELECT ia.infiltrazione_chiave FROM mappa m JOIN infiltrazione_area ia ON ia.area_chiave = m.area_chiave WHERE m.chiave = ?`)
  .pluck().all(mappa) as string[]).sort();
/** Le colonne `entita_tipo`/`entita_chiave` della mappa, cioè l'entità che la riga della mappa dichiara. */
const colonne = (mappa: string) => prepared('SELECT entita_tipo, entita_chiave FROM mappa WHERE chiave = ?').get(mappa) as { entita_tipo: string | null; entita_chiave: string | null };

describe('più aree della guida nella stessa planimetria', () => {
  let una: MappaDto;
  let altra: MappaDto;
  beforeAll(() => {
    dbDiProva();
    una = planimetriaDiPalazzo('kamoshida', { nome: 'Planimetria con più aree' });
    altra = planimetriaDiPalazzo('kamoshida', { nome: 'Planimetria vicina' });
  });
  afterAll(() => closeDb());

  it('una planimetria contiene più infiltrazioni, restituite e mostrate nella scheda del Palazzo in ordine di guida', async () => {
    const a = areeKamoshida();
    // si mandano in disordine: tornano in ordine di guida
    const r = await request(app).put(`/api/mappe/${una.chiave}/aree`).send({ aree: [a[9].chiave, a[3].chiave, a[6].chiave] });
    expect(r.status).toBe(200);
    expect(r.body.data.aree.map((x: { chiave: string }) => x.chiave)).toEqual([a[3].chiave, a[6].chiave, a[9].chiave]);
    const p = dettaglioDungeon('kamoshida').planimetrie.filter((x) => x.chiave === una.chiave);
    // una riga sola per la planimetria, con le sue infiltrazioni in ordine
    expect(p).toHaveLength(1);
    expect(p[0].aree.map((x) => x.chiave)).toEqual([a[3].chiave, a[6].chiave, a[9].chiave]);
    expect(p[0].aree.map((x) => x.ordine)).toEqual([a[3].ordine, a[6].ordine, a[9].ordine]);
    // ogni infiltrazione vede la planimetria fra le sue mappe
    for (const k of [a[3], a[6], a[9]]) expect(dettaglioDungeon('kamoshida').aree.find((x) => x.chiave === k.chiave)!.mappe.map((m) => m.chiave)).toContain(una.chiave);
    // le colonne della mappa non si scrivono più (fonte vecchia, R3-09)
    expect(colonne(una.chiave)).toEqual({ entita_tipo: null, entita_chiave: null });
  });

  it('un’infiltrazione aggiunta a un’altra planimetria resta anche su questa: tutte e due la contengono (2026-10-04)', async () => {
    const a = areeKamoshida();
    await request(app).put(`/api/mappe/${altra.chiave}/aree`).send({ aree: [a[3].chiave] }).expect(200);
    expect(areeLegate(altra.chiave)).toEqual([a[3].chiave].sort());
    expect(areeLegate(una.chiave)).toEqual([a[3].chiave, a[6].chiave, a[9].chiave].sort());
    // la scheda del Palazzo vede l'infiltrazione su entrambe
    expect(dettaglioDungeon('kamoshida').aree.find((x) => x.chiave === a[3].chiave)!.mappe.map((m) => m.chiave)).toEqual(expect.arrayContaining([una.chiave, altra.chiave]));
  });

  it('l’insieme sostituisce: le infiltrazioni non più elencate si staccano, e l’insieme vuoto le toglie tutte', async () => {
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

  it('il pacchetto delle mappe porta tutte le infiltrazioni e le rimette uguali all’importazione, senza cancellare il luogo', async () => {
    const a = areeKamoshida();
    const pacchetto = esportaMappe(una.chiave);
    const voce = pacchetto.mappe.find((m) => m.chiave === una.chiave)!;
    // il campo vecchio per i lettori di pacchetti di prima, e i legami veri dell'Area
    expect(voce.aree).toEqual([a[1].chiave, a[2].chiave]);
    expect(pacchetto.legami?.filter((l) => l.area === una.area!.chiave).map((l) => l.infiltrazione).sort()).toEqual([a[1].chiave, a[2].chiave].sort());
    // si staccano a mano, poi si reimporta il pacchetto
    prepared('DELETE FROM infiltrazione_area WHERE area_chiave = ?').run(una.area!.chiave);
    importaMappe(pacchetto, { sovrascrivi: true });
    expect(areeLegate(una.chiave)).toEqual([a[1].chiave, a[2].chiave].sort());
    expect(prepared("SELECT 1 FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'luogo'").get(una.chiave)).toBeTruthy();
  });

  it('un pacchetto di prima, con la sola `entita` area (senza `aree` né `legami`), lega quell’infiltrazione all’Area', () => {
    const a = areeKamoshida();
    const pacchetto = esportaMappe(altra.chiave);
    const voce = pacchetto.mappe.find((m) => m.chiave === altra.chiave)!;
    delete voce.aree;
    delete voce.entitaLegami;
    delete pacchetto.legami;
    voce.entita = { tipo: 'area', chiave: a[12].chiave };
    importaMappe(pacchetto, { sovrascrivi: true });
    // si aggiunge a quelle che l'Area ha già (un pacchetto di prima non dice l'insieme dell'Area)
    expect(areeLegate(altra.chiave)).toEqual([a[3].chiave, a[12].chiave].sort());
  });

  it('importando il pacchetto, un’infiltrazione che sta anche su un’altra planimetria resta anche lì (2026-10-04)', async () => {
    const a = areeKamoshida();
    // a[1] sta su `una` (test precedente) e anche su `altra`
    await request(app).put(`/api/mappe/${altra.chiave}/aree`).send({ aree: [a[1].chiave] }).expect(200);
    const pacchetto = esportaMappe(una.chiave);
    importaMappe(pacchetto, { sovrascrivi: true });
    expect(areeLegate(una.chiave)).toContain(a[1].chiave);
    expect(areeLegate(altra.chiave)).toEqual([a[1].chiave]);
  });

  it('funziona sulle planimetrie vere, che l’interfaccia chiama con la chiave di percorso (diversa da quella interna)', async () => {
    const a = areeKamoshida();
    // una planimetria nativa del pacchetto con un'Area legata, con la chiave che la scheda del Palazzo dà all'interfaccia
    const nativa = prepared(`SELECT m.chiave AS mappa_chiave, ia.infiltrazione_chiave AS entita_chiave FROM mappa m JOIN infiltrazione_area ia ON ia.area_chiave = m.area_chiave
      JOIN dungeon_area d ON d.chiave = ia.infiltrazione_chiave WHERE d.dungeon_chiave = 'kamoshida' AND m.chiave LIKE 'nativo-%' ORDER BY d.ordine, m.chiave LIMIT 1`).get() as { mappa_chiave: string; entita_chiave: string };
    const interna = nativa.mappa_chiave;
    const p = dettaglioDungeon('kamoshida').planimetrie.find((x) => x.chiave !== interna && x.aree.some((ar) => ar.chiave === nativa.entita_chiave) && x.area === prepared('SELECT area_chiave FROM mappa WHERE chiave = ?').pluck().get(interna))!;
    expect(interna).not.toBe(p.chiave);
    // un'infiltrazione che questa planimetria non ha ancora (può stare anche su altre: dal 2026-10-04 non si stacca da lì)
    const libera = a.find((x) => !p.aree.some((ar) => ar.chiave === x.chiave))!;
    const origine = prepared('SELECT origine FROM mappa WHERE chiave = ?').pluck().get(interna);
    const r = await request(app).put(`/api/mappe/${encodeURIComponent(p.chiave)}/aree`).send({ aree: [p.aree[0].chiave, libera.chiave] });
    expect(r.status).toBe(200);
    expect(areeLegate(interna)).toEqual([p.aree[0].chiave, libera.chiave].sort());
    expect(dettaglioDungeon('kamoshida').planimetrie.find((x) => x.chiave === p.chiave)!.aree.map((x) => x.chiave)).toEqual([...r.body.data.aree.map((x: { chiave: string }) => x.chiave)]);
    // il legame è dell'Area: la riga della planimetria non cambia (L3)
    expect(prepared('SELECT origine FROM mappa WHERE chiave = ?').pluck().get(interna)).toBe(origine);
  });

  it('un’infiltrazione di un altro Palazzo non si lega, e nemmeno la mappa d’insieme del Palazzo', async () => {
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

  it('il legame singolo (`entita` di tipo area) aggiunge l’infiltrazione all’Area: le altre restano, e `entita: null` non le stacca (L3)', async () => {
    const a = areeKamoshida();
    const terza = planimetriaDiPalazzo('kamoshida', { nome: 'Planimetria per il legame singolo' });
    await request(app).put(`/api/mappe/${terza.chiave}/aree`).send({ aree: [a[14].chiave, a[15].chiave] }).expect(200);
    await request(app).put(`/api/mappe/${terza.chiave}`).send({ entita: { tipo: 'area', chiave: a[16].chiave } }).expect(200);
    expect(areeLegate(terza.chiave)).toEqual([a[14].chiave, a[15].chiave, a[16].chiave].sort());
    expect(colonne(terza.chiave)).toEqual({ entita_tipo: null, entita_chiave: null });
    await request(app).put(`/api/mappe/${terza.chiave}`).send({ entita: null }).expect(200);
    expect(areeLegate(terza.chiave)).toEqual([a[14].chiave, a[15].chiave, a[16].chiave].sort());
  });

  it('importazione di un pacchetto di prima: planimetrie nuove annidate, con la figlia prima del genitore, legano le loro infiltrazioni all’Area che le contiene', () => {
    const a = areeKamoshida();
    const base = { ordine: 0, immagine: null, asset: null, larghezza: null, altezza: null, entita: null, note: '', spilli: [] };
    // Palazzo › piano nuovo › stanza nuova con due infiltrazioni: nel pacchetto la stanza viene prima del piano
    const esito = importaMappe({ versione: 1, mappe: [
      { ...base, chiave: 'prova-stanza-annidata', nome: 'Stanza annidata', tipo: 'area', genitore: 'prova-piano-annidato', aree: [a[5].chiave, a[4].chiave] },
      { ...base, chiave: 'prova-piano-annidato', nome: 'Piano annidato', tipo: 'area', genitore: 'dungeon-kamoshida' },
    ] }, { sovrascrivi: true });
    expect(esito.saltate).toEqual([]);
    // il piano (figlio della radice) riceve un'Area dalla regola della 110; la stanza dentro di lui ci porta le sue infiltrazioni
    expect(prepared("SELECT area_chiave FROM mappa WHERE chiave = 'prova-piano-annidato'").pluck().get()).toBeTruthy();
    expect(areeLegate('prova-piano-annidato')).toEqual([a[4].chiave, a[5].chiave].sort());
    expect(prepared("SELECT COUNT(*) FROM mappa_entita WHERE mappa_chiave = 'prova-stanza-annidata' AND entita_tipo = 'area'").pluck().get()).toBe(0);
    // e un piano nuovo fuori da ogni Palazzo resta rifiutato, anche nel pacchetto
    expect(() => importaMappe({ versione: 1, mappe: [
      { ...base, chiave: 'prova-stanza-orfana', nome: 'Stanza orfana', tipo: 'area', genitore: 'prova-piano-orfano', aree: [a[7].chiave] },
      { ...base, chiave: 'prova-piano-orfano', nome: 'Piano orfano', tipo: 'area', genitore: null },
    ] }, { sovrascrivi: true })).toThrow(/planimetrie di un Palazzo/);
    expect(prepared("SELECT 1 FROM mappa WHERE chiave = 'prova-stanza-orfana'").get()).toBeUndefined();
  });

  it('spostare una planimetria con infiltrazioni fuori dal suo Palazzo è un 400; dentro lo stesso Palazzo si può', async () => {
    const a = areeKamoshida();
    const quarta = planimetriaDiPalazzo('kamoshida', { nome: 'Planimetria da spostare' });
    await request(app).put(`/api/mappe/${quarta.chiave}/aree`).send({ aree: [a[8].chiave] }).expect(200);
    const r1 = await request(app).put(`/api/mappe/${quarta.chiave}`).send({ genitore: 'dungeon-madarame' });
    expect(r1.status).toBe(400);
    expect(r1.body.error.code).toBe('area-di-altro-palazzo');
    const r2 = await request(app).put(`/api/mappe/${quarta.chiave}`).send({ genitore: null });
    expect(r2.status).toBe(400);
    expect(r2.body.error.code).toBe('mappa-fuori-palazzo');
    expect((prepared('SELECT genitore_chiave FROM mappa WHERE chiave = ?').get(quarta.chiave) as { genitore_chiave: string }).genitore_chiave).toBe('dungeon-kamoshida');
    // sotto un'altra planimetria dello stesso Palazzo sì, con le infiltrazioni intatte
    await request(app).put(`/api/mappe/${quarta.chiave}`).send({ genitore: 'prova-piano-annidato' }).expect(200);
    expect(areeLegate(quarta.chiave)).toEqual([a[8].chiave]);
    // il piano ha le sue infiltrazioni (e le discendenti le loro): nemmeno lui esce dal Palazzo
    const r3 = await request(app).put('/api/mappe/prova-piano-annidato').send({ genitore: 'dungeon-madarame' });
    expect(r3.status).toBe(400);
    expect(r3.body.error.code).toBe('area-di-altro-palazzo');
    // senza infiltrazioni la mappa si sposta dove si vuole
    await request(app).put(`/api/mappe/${quarta.chiave}/aree`).send({ aree: [] }).expect(200);
    await request(app).put(`/api/mappe/${quarta.chiave}`).send({ genitore: null }).expect(200);
  });

  it('importazione: un elenco di infiltrazioni non valido è un 400, non un errore del database', async () => {
    const pacchetto = esportaMappe(una.chiave);
    const voce = pacchetto.mappe.find((m) => m.chiave === una.chiave)!;
    (voce as unknown as { aree: unknown }).aree = [{}];
    expect(() => importaMappe(pacchetto, { sovrascrivi: true })).toThrow(/Infiltrazioni non valide/);
  });

  it('validazione: infiltrazione inesistente 400, mappa inesistente 404, corpo senza elenco 400', async () => {
    expect((await request(app).put(`/api/mappe/${una.chiave}/aree`).send({ aree: ['area-che-non-esiste'] })).status).toBe(400);
    expect((await request(app).put('/api/mappe/mappa-che-non-esiste/aree').send({ aree: [] })).status).toBe(404);
    expect((await request(app).put(`/api/mappe/${una.chiave}/aree`).send({})).status).toBe(400);
  });
});
