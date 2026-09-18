// ============================================================
// Le planimetrie di un Palazzo: ordine logico, legame con l'area, elenco completo nella scheda
// ============================================================
//
// Tre cose che prima non reggevano, e sono le tre che si vedono nella scheda del Palazzo:
//
// 1. **Legare una planimetria a un'area dall'editor non si vedeva.** Il legame vive in due posti —
//    le colonne `entita_*` della mappa e la tabella `mappa_entita` — e la scheda legge la tabella,
//    che il salvataggio dell'editor non scriveva mai.
// 2. **Un'area ha una sola planimetria** (decisione dell'utente, 2026-09-18): legarne una seconda
//    stacca la prima invece di affiancarla.
// 3. **L'ordine si cambia tutto insieme**, ed è quello che il trascinamento salva.
//
// E la scheda del Palazzo deve elencare **tutte** le planimetrie dell'albero, non solo quelle che
// hanno qualcosa da raccogliere: le altre sono proprio quelle da riordinare o da togliere.
// ============================================================

import request from 'supertest';
import { closeDb, initDb, prepared } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import { creaMappa, riordinaMappe } from '../services/mappe/mappeService.js';
import { dettaglioDungeon } from '../services/dungeonService.js';
import type { MappaDto } from '../../shared/types.js';

const app = createApp();

/** L'area della guida a cui `mappa_entita` lega una planimetria (la tabella che legge la scheda). */
const areaLegata = (mappa: string): string | null =>
  (prepared("SELECT entita_chiave FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'area'").get(mappa) as { entita_chiave: string } | undefined)?.entita_chiave ?? null;

describe('planimetrie di un Palazzo', () => {
  let una: MappaDto;
  let altra: MappaDto;
  beforeAll(() => {
    const db = initDb(':memory:');
    caricaPacchetto(db);
    invalidaCacheTraduzioni();
    una = creaMappa(undefined, { nome: 'Planimetria di prova uno', tipo: 'area', genitore: 'dungeon-kamoshida' });
    altra = creaMappa(undefined, { nome: 'Planimetria di prova due', tipo: 'area', genitore: 'dungeon-kamoshida' });
  });
  afterAll(() => closeDb());

  it('il legame con l’area salvato dall’editor arriva nella tabella che legge la scheda', async () => {
    const area = (prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine").all() as Array<{ chiave: string }>)[5].chiave;
    const risposta = await request(app).put(`/api/mappe/${una.chiave}`).send({ entita: { tipo: 'area', chiave: area } });
    expect(risposta.status).toBe(200);
    expect(areaLegata(una.chiave)).toBe(area);
    const scheda = dettaglioDungeon('kamoshida');
    expect(scheda.aree.find((a) => a.chiave === area)!.mappe.map((m) => m.chiave)).toContain(una.chiave);
  });

  it('un’area ha una sola planimetria: legarne un’altra stacca la prima', async () => {
    const area = areaLegata(una.chiave)!;
    await request(app).put(`/api/mappe/${altra.chiave}`).send({ entita: { tipo: 'area', chiave: area } }).expect(200);
    expect(areaLegata(altra.chiave)).toBe(area);
    expect(areaLegata(una.chiave)).toBeNull();
    expect(dettaglioDungeon('kamoshida').aree.find((a) => a.chiave === area)!.mappe).toHaveLength(1);
  });

  it('togliere il legame lascia la planimetria senza area', async () => {
    await request(app).put(`/api/mappe/${altra.chiave}`).send({ entita: null }).expect(200);
    expect(areaLegata(altra.chiave)).toBeNull();
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

  it('legare un’area non porta via gli altri legami della mappa (un luogo, per esempio)', async () => {
    const luogo = (prepared('SELECT chiave FROM luogo LIMIT 1').get() as { chiave: string }).chiave;
    prepared("INSERT OR REPLACE INTO mappa_entita (mappa_chiave, entita_tipo, entita_chiave, fonte_json) VALUES (?, 'luogo', ?, '{}')").run(una.chiave, luogo);
    const area = (prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine").all() as Array<{ chiave: string }>)[7].chiave;
    await request(app).put(`/api/mappe/${una.chiave}`).send({ entita: { tipo: 'area', chiave: area } }).expect(200);
    expect(prepared("SELECT 1 FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'luogo'").get(una.chiave)).toBeTruthy();
    expect(areaLegata(una.chiave)).toBe(area);
  });

  it('stacciare un’area dalla mappa che ce l’aveva non tocca i suoi altri legami', async () => {
    const area = areaLegata(una.chiave)!;
    const luogo = (prepared('SELECT chiave FROM luogo LIMIT 1').get() as { chiave: string }).chiave;
    await request(app).put(`/api/mappe/${altra.chiave}`).send({ entita: { tipo: 'area', chiave: area } }).expect(200);
    expect(areaLegata(una.chiave)).toBeNull();
    expect((prepared("SELECT entita_chiave FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'luogo'").get(una.chiave) as { entita_chiave: string }).entita_chiave).toBe(luogo);
  });

  it('l’elenco piatto della scheda si riordina anche quando contiene una nipote', () => {
    const nipote = creaMappa(undefined, { nome: 'Sala interna alla planimetria', tipo: 'area', genitore: altra.chiave });
    const sorella = creaMappa(undefined, { nome: 'Sala interna sorella', tipo: 'area', genitore: altra.chiave });
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
