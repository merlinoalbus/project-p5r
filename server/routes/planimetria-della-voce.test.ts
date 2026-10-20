// ============================================================
// L3, «planimetria della voce» (decisione dell'utente, 2026-10-20) — su quale planimetria sta una voce della guida di un Palazzo, con una
// regola sola calcolata alla lettura: a) dai suoi pin; b) senza pin, l'aggancio a mano; c) senza pin né aggancio, la planimetria 1 della sua
// infiltrazione. La PUT della voce sposta l'aggancio (400 / 404 / null), e il visore della planimetria X elenca le voci che stanno su X
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { chiaveMappa } from '../services/mappe/percorsiMappe.js';
import type { DungeonDettaglioDto, GuidaDellaPlanimetriaDto, PuntoInteresseDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

/** Le voci della scheda di un Palazzo, per chiave. */
async function vociDelPalazzo(palazzo: string): Promise<Map<string, PuntoInteresseDto>> {
  const d = (await request(app).get(`/api/compendio/dungeon/${palazzo}`).expect(200)).body.data as DungeonDettaglioDto;
  return new Map(d.aree.flatMap((a) => a.punti).map((p) => [p.chiave, p]));
}

/** Le planimetrie del Palazzo (chiavi interne), dalle sue Aree. */
const planimetrieDi = (palazzo: string) => prepared('SELECT m.chiave FROM mappa m JOIN area a ON a.chiave = m.area_chiave WHERE a.dungeon_chiave = ? ORDER BY a.ordine, m.chiave').pluck().all(palazzo) as string[];

/** Le voci di un Palazzo senza pin e che non sono Enigmi con passi. */
const senzaPin = (palazzo: string) => prepared(`SELECT p.chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE a.dungeon_chiave = ?
  AND NOT EXISTS (SELECT 1 FROM spillo_voce sv JOIN spillo s ON s.id = sv.spillo_id WHERE sv.voce_chiave = p.chiave AND s.mappa_chiave IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM punto_interesse x WHERE x.contenitore_chiave = p.chiave) ORDER BY a.ordine, p.ordine, p.chiave`).pluck().all(palazzo) as string[];

/** La planimetria 1 dell'infiltrazione della voce, in SQL senza il codice della regola: l'iniziale della prima Area toccata (o la sua
 *  predefinita), altrimenti la predefinita della prima Area del Palazzo. */
const planimetriaUno = (voce: string) => prepared(`SELECT COALESCE(
    (SELECT COALESCE(ia.planimetria_iniziale, ar.planimetria_predefinita) FROM infiltrazione_area ia JOIN area ar ON ar.chiave = ia.area_chiave
      WHERE ia.infiltrazione_chiave = p.area_chiave AND COALESCE(ia.planimetria_iniziale, ar.planimetria_predefinita) IS NOT NULL ORDER BY ia.ordine, ar.ordine, ar.chiave LIMIT 1),
    (SELECT ar.planimetria_predefinita FROM area ar WHERE ar.dungeon_chiave = a.dungeon_chiave AND ar.planimetria_predefinita IS NOT NULL ORDER BY ar.ordine, ar.chiave LIMIT 1))
  FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE p.chiave = ?`).pluck().get(voce) as string | null;

/** Collega alla voce un pin già sulla planimetria (il pacchetto dei test non ha legami voce–pin); restituisce chi lo stacca. */
function collegaUnPin(voce: string, mappa: string): { id: number; stacca: () => void } {
  const id = prepared('SELECT id FROM spillo WHERE mappa_chiave = ? AND uid IS NOT NULL ORDER BY id LIMIT 1').pluck().get(mappa) as number | undefined;
  if (id === undefined) throw new Error(`nessun pin sulla planimetria ${mappa}`);
  prepared('INSERT INTO spillo_voce (spillo_id, voce_chiave) VALUES (?, ?)').run(id, voce);
  return { id, stacca: () => { prepared('DELETE FROM spillo_voce WHERE spillo_id = ? AND voce_chiave = ?').run(id, voce); } };
}

/** Le planimetrie del Palazzo con almeno un pin con uid. */
const conPin = (palazzo: string) => planimetrieDi(palazzo).filter((m) => !!prepared('SELECT 1 FROM spillo WHERE mappa_chiave = ? AND uid IS NOT NULL').get(m));

/** Il visore della planimetria (chiave interna): le chiavi delle voci elencate. */
async function vociNelVisore(mappa: string, partita?: number): Promise<{ dto: GuidaDellaPlanimetriaDto; chiavi: string[] }> {
  const dto = (await request(app).get(`/api/mappe/${encodeURIComponent(chiaveMappa(mappa))}/guida${partita ? `?partita=${partita}` : ''}`).expect(200)).body.data as GuidaDellaPlanimetriaDto;
  return { dto, chiavi: dto.infiltrazioni.flatMap((i) => i.voci.map((v) => v.chiave)) };
}

describe('planimetria della voce (L3)', () => {
  beforeAll(() => { dbDiProva(); });
  afterAll(() => closeDb());

  it('la regola: a) con pin dove stanno i pin; c) senza pin la planimetria 1 dell’infiltrazione; b) l’aggancio a mano; i Memento no', async () => {
    // a) una voce con un pin su una planimetria che non è la sua planimetria 1: la planimetria del pin, non a mano (anche con un aggancio
    // a mano, che per una voce con pin non conta)
    const scelta = senzaPin('kamoshida')[1];
    const suPin = conPin('kamoshida').find((m) => m !== planimetriaUno(scelta))!;
    const legame = collegaUnPin(scelta, suPin);
    prepared('UPDATE punto_interesse SET planimetria_chiave = ? WHERE chiave = ?').run(planimetriaUno(scelta), scelta);
    try {
      expect((await vociDelPalazzo('kamoshida')).get(scelta)!.planimetria).toMatchObject({ chiave: chiaveMappa(suPin), aMano: false });
    } finally {
      legame.stacca();
      prepared('UPDATE punto_interesse SET planimetria_chiave = NULL WHERE chiave = ?').run(scelta);
    }
    const voci = await vociDelPalazzo('kamoshida');
    // c) ogni voce senza pin ha la sua planimetria 1, con il nome
    const vuote = senzaPin('kamoshida');
    expect(vuote.length).toBeGreaterThan(0);
    for (const k of vuote) {
      const atteso = planimetriaUno(k);
      expect([k, voci.get(k)!.planimetria?.chiave ?? null]).toEqual([k, atteso ? chiaveMappa(atteso) : null]);
    }
    expect(voci.get(vuote[0])!.planimetria!.nome.length).toBeGreaterThan(0);
    // b) l'aggancio a mano vince sulla planimetria 1 (scritto qui direttamente: la PUT si prova sotto)
    const altra = planimetrieDi('kamoshida').find((m) => m !== planimetriaUno(vuote[0]))!;
    prepared('UPDATE punto_interesse SET planimetria_chiave = ? WHERE chiave = ?').run(altra, vuote[0]);
    try {
      expect((await vociDelPalazzo('kamoshida')).get(vuote[0])!.planimetria).toMatchObject({ chiave: chiaveMappa(altra), aMano: true });
    } finally {
      prepared('UPDATE punto_interesse SET planimetria_chiave = NULL WHERE chiave = ?').run(vuote[0]);
    }
    // i Memento non hanno planimetrie: il campo non c'è (la risposta dei Memento resta com'era)
    const memento = (await request(app).get('/api/compendio/dungeon/mementos').expect(200)).body.data as DungeonDettaglioDto;
    expect(memento.aree.flatMap((a) => a.punti).every((p) => !('planimetria' in p))).toBe(true);
  });

  it('su tutti i Palazzi dei dati dei test (Iweleth compreso) ogni voce senza pin ha una planimetria del suo Palazzo', async () => {
    for (const palazzo of prepared("SELECT chiave FROM dungeon WHERE tipo = 'palazzo' ORDER BY chiave").pluck().all() as string[]) {
      if (planimetrieDi(palazzo).length === 0) continue;
      const voci = await vociDelPalazzo(palazzo);
      const proprie = new Set(planimetrieDi(palazzo).map((m) => chiaveMappa(m)));
      for (const k of senzaPin(palazzo)) expect([palazzo, k, proprie.has(voci.get(k)!.planimetria?.chiave ?? '')]).toEqual([palazzo, k, true]);
    }
  });

  it('PUT della voce: sposta l’aggancio; 400 per una planimetria di un altro Palazzo o la mappa del Palazzo, 404 se non esiste; null torna alla planimetria 1', async () => {
    const voce = senzaPin('kamoshida')[0];
    const uno = planimetriaUno(voce)!;
    const altra = planimetrieDi('kamoshida').find((m) => m !== uno)!;
    const r = (await request(app).put(`/api/compendio/punti/${encodeURIComponent(voce)}`).send({ planimetria: chiaveMappa(altra) }).expect(200)).body.data as PuntoInteresseDto;
    expect(r.planimetria).toMatchObject({ chiave: chiaveMappa(altra), aMano: true });
    expect(prepared('SELECT planimetria_chiave FROM punto_interesse WHERE chiave = ?').pluck().get(voce)).toBe(altra);
    const madarame = planimetrieDi('madarame')[0];
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(voce)}`).send({ planimetria: chiaveMappa(madarame) }).expect(400)).body.error.code).toBe('planimetria-fuori-dal-palazzo');
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(voce)}`).send({ planimetria: 'dungeon-kamoshida' }).expect(400)).body.error.code).toBe('planimetria-fuori-dal-palazzo');
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(voce)}`).send({ planimetria: 'mappa-che-non-esiste' }).expect(404)).body.error.code).toBe('mappa-non-trovata');
    expect(prepared('SELECT planimetria_chiave FROM punto_interesse WHERE chiave = ?').pluck().get(voce)).toBe(altra);
    const dopo = (await request(app).put(`/api/compendio/punti/${encodeURIComponent(voce)}`).send({ planimetria: null }).expect(200)).body.data as PuntoInteresseDto;
    expect(dopo.planimetria).toMatchObject({ chiave: chiaveMappa(uno), aMano: false });
    expect(prepared('SELECT planimetria_chiave FROM punto_interesse WHERE chiave = ?').pluck().get(voce)).toBeNull();
    // una voce nuova creata con una planimetria la tiene
    const infiltrazione = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine LIMIT 1").pluck().get() as string;
    const nuova = (await request(app).post(`/api/compendio/aree/${infiltrazione}/punti`).send({ nome: 'Voce agganciata', tipo: 'storia', planimetria: chiaveMappa(altra) }).expect(201)).body.data as PuntoInteresseDto;
    expect(nuova.planimetria).toMatchObject({ chiave: chiaveMappa(altra), aMano: true });
    expect((await request(app).post(`/api/compendio/aree/${infiltrazione}/punti`).send({ nome: 'Voce fuori', tipo: 'storia', planimetria: chiaveMappa(madarame) }).expect(400)).body.error.code).toBe('planimetria-fuori-dal-palazzo');
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(nuova.chiave)}`).expect(204);
  });

  it('il visore di Kamoshida e di Madarame: le voci con pin su X e quelle senza pin su X; una voce spostata a mano compare dove l’ha messa l’utente', async () => {
    for (const palazzo of ['kamoshida', 'madarame']) {
      const voce = senzaPin(palazzo)[0];
      const uno = planimetriaUno(voce)!;
      const altra = planimetrieDi(palazzo).find((m) => m !== uno)!;
      // prima: sulla planimetria 1, non sull'altra
      expect((await vociNelVisore(uno)).chiavi).toContain(voce);
      expect((await vociNelVisore(altra)).chiavi).not.toContain(voce);
      // una voce con un pin su X c'è, anche se la sua planimetria 1 è un'altra; il pin porta uid, mappa e nome (per centrarlo)
      const x = conPin(palazzo)[0];
      const conUnPin = senzaPin(palazzo).find((k) => k !== voce && planimetriaUno(k) !== x)!;
      const legame = collegaUnPin(conUnPin, x);
      try {
        const { dto, chiavi } = await vociNelVisore(x);
        expect(chiavi).toContain(conUnPin);
        const v = dto.infiltrazioni.flatMap((i) => i.voci).find((y) => y.chiave === conUnPin)!;
        expect(v.pin).toEqual([expect.objectContaining({ id: legame.id, uid: expect.any(String), mappa: chiaveMappa(x), nome: expect.any(String) })]);
        expect((await vociNelVisore(planimetriaUno(conUnPin)!)).chiavi).not.toContain(conUnPin);
      } finally {
        legame.stacca();
      }
      const { dto } = await vociNelVisore(uno);
      // raggruppate per infiltrazione, nell'ordine delle infiltrazioni e poi delle voci
      expect(dto.infiltrazioni.map((i) => i.ordine)).toEqual([...dto.infiltrazioni.map((i) => i.ordine)].sort((a, b) => a - b));
      // spostata a mano: compare sull'altra e non più sulla planimetria 1
      await request(app).put(`/api/compendio/punti/${encodeURIComponent(voce)}`).send({ planimetria: chiaveMappa(altra) }).expect(200);
      expect((await vociNelVisore(altra)).chiavi).toContain(voce);
      expect((await vociNelVisore(uno)).chiavi).not.toContain(voce);
      await request(app).put(`/api/compendio/punti/${encodeURIComponent(voce)}`).send({ planimetria: null }).expect(200);
    }
    // una planimetria che non esiste: 404
    expect((await request(app).get('/api/mappe/mappa-che-non-esiste/guida').expect(404)).body.error.code).toBe('mappa-non-trovata');
  });

  it('un Enigma con i passi su planimetrie diverse compare su ognuna, e ogni passo solo sulla sua', async () => {
    const infiltrazione = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine LIMIT 1").pluck().get() as string;
    const [p1, p2] = planimetrieDi('kamoshida');
    const enigma = (await request(app).post(`/api/compendio/aree/${infiltrazione}/punti`).send({ nome: 'Enigma di prova', tipo: 'puzzle' }).expect(201)).body.data as PuntoInteresseDto;
    const passo = async (nome: string, planimetria: string) => ((await request(app).post(`/api/compendio/aree/${infiltrazione}/punti`)
      .send({ nome, tipo: 'meccanismo', contenitore: enigma.chiave, planimetria: chiaveMappa(planimetria) }).expect(201)).body.data as PuntoInteresseDto).chiave;
    const a = await passo('Primo passo', p1);
    const b = await passo('Secondo passo', p2);
    try {
      const su1 = (await vociNelVisore(p1)).chiavi;
      const su2 = (await vociNelVisore(p2)).chiavi;
      expect([su1.includes(enigma.chiave), su1.includes(a), su1.includes(b)]).toEqual([true, true, false]);
      expect([su2.includes(enigma.chiave), su2.includes(a), su2.includes(b)]).toEqual([true, false, true]);
      // la planimetria principale dell'Enigma è quella del primo passo; spostarlo a mano non si può, segue i passi
      expect((await vociDelPalazzo('kamoshida')).get(enigma.chiave)!.planimetria).toMatchObject({ chiave: chiaveMappa(p1), aMano: false });
      expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(enigma.chiave)}`).send({ planimetria: chiaveMappa(p2) }).expect(400)).body.error.code).toBe('enigma-segue-i-passi');
    } finally {
      for (const k of [a, b, enigma.chiave]) await request(app).delete(`/api/compendio/punti/${encodeURIComponent(k)}`).expect(204);
    }
  });
});
