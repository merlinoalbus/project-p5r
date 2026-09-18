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

  it('non si riordina una mappa che non è figlia di quel genitore', () => {
    expect(() => riordinaMappe('dungeon-madarame', [una.chiave])).toThrow(/non è figlia/);
  });
});
