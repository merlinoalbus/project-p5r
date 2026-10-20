// ============================================================
// Le planimetrie di un Palazzo: ordine logico, legame con l'infiltrazione, elenco completo nella scheda
// ============================================================
//
// Tre cose che prima non reggevano, e sono le tre che si vedono nella scheda del Palazzo:
//
// 1. **Legare una planimetria a un'infiltrazione dall'editor non si vedeva.** Da L3 (migrazione 110) il legame è dell'**Area** della
//    planimetria (`infiltrazione_area`): l'editor lo scrive lì, e la scheda lo legge da lì (`mappa_entita` non si legge più).
// 2. **Un'infiltrazione può stare su più planimetrie** (decisione dell'utente, 2026-10-04, che supera quella del 2026-09-18 «un'area
//    ha una sola planimetria»): legarne una seconda la affianca alla prima.
// 3. **L'ordine si cambia tutto insieme**, ed è quello che il trascinamento salva.
//
// E la scheda del Palazzo deve elencare **tutte** le planimetrie dell'albero, non solo quelle che
// hanno qualcosa da raccogliere: le altre sono proprio quelle da riordinare o da togliere.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { creaMappa, riordinaMappe } from '../services/mappe/mappeService.js';
import { dettaglioDungeon } from '../services/dungeonService.js';
import type { MappaDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';
import { planimetriaDiPalazzo } from '../../test/planimetriaDiPalazzo.js';

const app = createApp();

/** Le infiltrazioni legate a una planimetria: quelle della sua Area (L3, la tabella che legge la scheda), in ordine di guida. */
const infiltrazioniDi = (mappa: string): string[] =>
  prepared(`SELECT ia.infiltrazione_chiave FROM mappa m JOIN infiltrazione_area ia ON ia.area_chiave = m.area_chiave JOIN dungeon_area d ON d.chiave = ia.infiltrazione_chiave
    WHERE m.chiave = ? ORDER BY d.ordine`).pluck().all(mappa) as string[];

describe('planimetrie di un Palazzo', () => {
  let una: MappaDto;
  let altra: MappaDto;
  beforeAll(() => {
    dbDiProva();
    una = planimetriaDiPalazzo('kamoshida', { nome: 'Planimetria di prova uno' });
    altra = planimetriaDiPalazzo('kamoshida', { nome: 'Planimetria di prova due' });
  });
  afterAll(() => closeDb());

  it('il legame con l’infiltrazione salvato dall’editor arriva all’Area della planimetria, che è quella che legge la scheda', async () => {
    const area = (prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine").all() as Array<{ chiave: string }>)[5].chiave;
    const risposta = await request(app).put(`/api/mappe/${una.chiave}`).send({ entita: { tipo: 'area', chiave: area } });
    expect(risposta.status).toBe(200);
    expect(infiltrazioniDi(una.chiave)).toEqual([area]);
    // le fonti vecchie non si scrivono più (R3-09): né la tabella né le colonne
    expect(prepared("SELECT COUNT(*) FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'area'").pluck().get(una.chiave)).toBe(0);
    expect(prepared('SELECT entita_tipo FROM mappa WHERE chiave = ?').pluck().get(una.chiave)).toBeNull();
    const scheda = dettaglioDungeon('kamoshida');
    expect(scheda.aree.find((a) => a.chiave === area)!.mappe.map((m) => m.chiave)).toContain(una.chiave);
  });

  it('un’infiltrazione può stare su più planimetrie: legarne un’altra la affianca alla prima (2026-10-04)', async () => {
    const area = infiltrazioniDi(una.chiave)[0];
    await request(app).put(`/api/mappe/${altra.chiave}`).send({ entita: { tipo: 'area', chiave: area } }).expect(200);
    expect(infiltrazioniDi(altra.chiave)).toEqual([area]);
    expect(infiltrazioniDi(una.chiave)).toEqual([area]);
    expect(dettaglioDungeon('kamoshida').aree.find((a) => a.chiave === area)!.mappe.map((m) => m.chiave)).toEqual(expect.arrayContaining([una.chiave, altra.chiave]));
  });

  it('togliere il legame (l’insieme delle infiltrazioni della planimetria, vuoto) lascia la planimetria senza infiltrazioni; `entita: null` non tocca più i legami', async () => {
    const area = infiltrazioniDi(altra.chiave)[0];
    // le colonne `entita_*` sono una fonte vecchia: cancellarle dall'editor non stacca l'infiltrazione dall'Area
    await request(app).put(`/api/mappe/${altra.chiave}`).send({ entita: null }).expect(200);
    expect(infiltrazioniDi(altra.chiave)).toEqual([area]);
    await request(app).put(`/api/mappe/${altra.chiave}/aree`).send({ aree: [] }).expect(200);
    expect(infiltrazioniDi(altra.chiave)).toEqual([]);
    expect(infiltrazioniDi(una.chiave)).toEqual([area]);
  });

  it('la scheda elenca tutte le planimetrie dell’albero, anche quelle senza collezionabili, in ordine', () => {
    const planimetrie = dettaglioDungeon('kamoshida').planimetrie;
    expect(planimetrie.some((p) => p.n === 0)).toBe(true);
    expect(planimetrie.map((p) => p.chiave)).not.toContain('dungeon-kamoshida');
    expect(planimetrie.map((p) => p.ordine)).toEqual([...planimetrie.map((p) => p.ordine)].sort((a, b) => a - b));
  });

  it('il riordino riscrive l’ordine da 0 e lascia in coda, nell’ordine di prima, quel che non è elencato', async () => {
    const prima = dettaglioDungeon('kamoshida').planimetrie.map((p) => p.chiave);
    const capovolte = [prima[2], prima[0]];
    const risposta = await request(app).put('/api/mappe/ordine').send({ genitore: 'dungeon-kamoshida', chiavi: capovolte });
    expect(risposta.status).toBe(200);
    const dopo = dettaglioDungeon('kamoshida').planimetrie;
    expect(dopo.slice(0, 2).map((p) => p.chiave)).toEqual(capovolte);
    expect(dopo.map((p) => p.ordine)).toEqual(dopo.map((_, i) => i));
    // le non elencate restano fra loro come stavano
    const restanti = dopo.slice(2).map((p) => p.chiave);
    expect(restanti).toEqual(prima.filter((k) => !capovolte.includes(k)));
  });

  // ---- I rilievi della revisione (2026-09-18) ----

  it('legare un’infiltrazione non porta via gli altri legami della mappa (un luogo, per esempio)', async () => {
    const luogo = (prepared('SELECT chiave FROM luogo LIMIT 1').get() as { chiave: string }).chiave;
    prepared("INSERT OR REPLACE INTO mappa_entita (mappa_chiave, entita_tipo, entita_chiave, fonte_json) VALUES (?, 'luogo', ?, '{}')").run(una.chiave, luogo);
    const area = (prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine").all() as Array<{ chiave: string }>)[7].chiave;
    await request(app).put(`/api/mappe/${una.chiave}`).send({ entita: { tipo: 'area', chiave: area } }).expect(200);
    expect(prepared("SELECT 1 FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'luogo'").get(una.chiave)).toBeTruthy();
    // si aggiunge a quelle che l'Area aveva già
    expect(infiltrazioniDi(una.chiave)).toContain(area);
    expect(infiltrazioniDi(una.chiave)).toHaveLength(2);
  });

  it('legare l’infiltrazione anche a un’altra mappa non tocca la prima: le sue infiltrazioni e gli altri legami (il luogo) restano', async () => {
    const prima = infiltrazioniDi(una.chiave);
    const area = prima[prima.length - 1];
    const luogo = (prepared('SELECT chiave FROM luogo LIMIT 1').get() as { chiave: string }).chiave;
    await request(app).put(`/api/mappe/${altra.chiave}`).send({ entita: { tipo: 'area', chiave: area } }).expect(200);
    expect(infiltrazioniDi(una.chiave)).toEqual(prima);
    expect((prepared("SELECT entita_chiave FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'luogo'").get(una.chiave) as { entita_chiave: string }).entita_chiave).toBe(luogo);
  });

  it('l’elenco piatto della scheda si riordina anche quando contiene una nipote', () => {
    // nipoti nei Palazzi non se ne creano più dall'editor (L3, R3-26): qui le si mette per la strada interna, come dati di prima
    const nipote = creaMappa(undefined, { nome: 'Sala interna alla planimetria', tipo: 'area', genitore: altra.chiave }, { dallArea: true });
    const sorella = creaMappa(undefined, { nome: 'Sala interna sorella', tipo: 'area', genitore: altra.chiave }, { dallArea: true });
    // come manda la scheda: tutto l'albero in un elenco solo, con la radice del Palazzo per genitore
    const piatto = dettaglioDungeon('kamoshida').planimetrie.map((p) => p.chiave);
    expect(piatto).toContain(nipote.chiave);
    expect(() => riordinaMappe('dungeon-kamoshida', [sorella.chiave, nipote.chiave, piatto[0]])).not.toThrow();
    const figlie = prepared('SELECT chiave, ordine FROM mappa WHERE genitore_chiave = ? ORDER BY ordine').all(altra.chiave) as Array<{ chiave: string; ordine: number }>;
    expect(figlie.map((f) => f.chiave)).toEqual([sorella.chiave, nipote.chiave]);
  });

  it('una mappa fuori dal sottoalbero resta rifiutata', () => {
    expect(() => riordinaMappe('dungeon-madarame', [una.chiave])).toThrow(/non sta sotto/);
  });
});
