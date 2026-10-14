// ============================================================
// Spostare una voce della guida in un'altra area dello stesso Palazzo (2026-10-12)
// ============================================================
//
// Richiesta dell'utente: «devo spostare delle voci da un'area ad un'altra nel palazzo». Scelta: un selettore «Area del Palazzo»
// nel modulo «Modifica» della voce. La voce passa in fondo all'area scelta con tutto quel che è suo: la chiave resta (stati delle
// partite, pin, marcatore), i passi di un Enigma la seguono, e le sue schede della guida senza mappa passano con lei.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import type { DungeonDettaglioDto, PuntoInteresseDto } from '../../shared/types.js';
import { bodyNuovoPunto, bodyPunto } from '../schemas/guidaDungeon.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();
const INGRESSO = 'kamoshida-01-cancello-del-castello-ingresso';
const SALA = 'kamoshida-02-sala-centrale';

describe('spostare una voce in un\'altra area del Palazzo', () => {
  let partita: number;
  /** Crea una voce nell'area data (dentro un Enigma se indicato) e la restituisce. */
  const nuova = async (area: string, nome: string, tipo: string, contenitore?: string) =>
    (await request(app).post(`/api/compendio/aree/${area}/punti`).send({ nome, tipo, ...(contenitore ? { contenitore } : {}) }).expect(201)).body.data as PuntoInteresseDto;
  /** Corregge la voce (restituisce la richiesta, per controllarne l'esito). */
  const modifica = (chiave: string, dati: Record<string, unknown>) => request(app).put(`/api/compendio/punti/${encodeURIComponent(chiave)}`).send(dati);
  /** L'area e l'ordine salvati della voce. */
  const dove = (chiave: string) => prepared('SELECT area_chiave, ordine, contenitore_chiave FROM punto_interesse WHERE chiave = ?').get(chiave) as { area_chiave: string; ordine: number; contenitore_chiave: string | null };
  /** Le voci di un'area come le mostra la scheda del Palazzo con la partita. */
  const vociDi = async (area: string) => ((await request(app).get(`/api/compendio/dungeon/kamoshida?partita=${partita}`).expect(200)).body.data as DungeonDettaglioDto).aree.find((a) => a.chiave === area)!.punti;

  beforeAll(async () => {
    dbDiProva();
    partita = ((await request(app).post('/api/partite').send({ nome: 'Sposta voci' })).body.data as { id: number }).id;
  });
  afterAll(() => closeDb());

  it('la voce passa in fondo all\'altra area con la sua chiave: stato nella partita, marcatore e nome restano; l\'area di prima non la mostra più', async () => {
    const v = await nuova(INGRESSO, 'Forziere da spostare', 'forziere');
    await request(app).put(`/api/partite/${partita}/punti`).send({ punto: v.chiave, stato: 'ottenuto' }).expect(200);
    prepared("INSERT INTO marcatore_mappa (punto_chiave, x, y, updated_at) VALUES (?, 10, 20, 'x')").run(v.chiave);
    const inFondo = (prepared('SELECT COALESCE(MAX(ordine), -1) FROM punto_interesse WHERE area_chiave = ? AND contenitore_chiave IS NULL').pluck().get(SALA) as number) + 1;
    const r = await modifica(v.chiave, { area: SALA, nome: 'Forziere spostato' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data).toMatchObject({ chiave: v.chiave, nome: 'Forziere spostato', marcatore: { x: 10, y: 20 } });
    expect(dove(v.chiave)).toEqual({ area_chiave: SALA, ordine: inFondo, contenitore_chiave: null });
    expect((await vociDi(SALA)).find((p) => p.chiave === v.chiave)).toMatchObject({ stato: 'ottenuto' });
    expect((await vociDi(INGRESSO)).some((p) => p.chiave === v.chiave)).toBe(false);
    // la stessa area non sposta niente
    expect((await modifica(v.chiave, { area: SALA })).status).toBe(200);
    expect(dove(v.chiave).ordine).toBe(inFondo);
  });

  it('un Enigma porta con sé i suoi passi; un passo da solo non si sposta', async () => {
    const enigma = await nuova(INGRESSO, 'Enigma da spostare', 'puzzle');
    const passo = await nuova(INGRESSO, 'Passo dell\'Enigma', 'meccanismo', enigma.chiave);
    const solo = await modifica(passo.chiave, { area: SALA });
    expect([solo.status, solo.body.error.code]).toEqual([400, 'passo-segue-enigma']);
    expect(dove(passo.chiave).area_chiave).toBe(INGRESSO);
    // si sposta l'Enigma, e il passo lo segue restando suo
    await modifica(enigma.chiave, { area: SALA }).expect(200);
    expect(dove(enigma.chiave).area_chiave).toBe(SALA);
    expect(dove(passo.chiave)).toMatchObject({ area_chiave: SALA, contenitore_chiave: enigma.chiave });
    // fuori dall'Enigma e nella stessa richiesta in un'altra area: va
    await modifica(passo.chiave, { contenitore: null, area: INGRESSO }).expect(200);
    expect(dove(passo.chiave)).toMatchObject({ area_chiave: INGRESSO, contenitore_chiave: null });
  });

  it('le schede della guida senza mappa della voce passano con lei; quelle delle altre voci restano', async () => {
    const scheda = prepared(`SELECT s.id, s.riferimento_chiave AS voce FROM spillo s WHERE s.mappa_chiave IS NULL AND s.area_guida_chiave = ? AND s.riferimento_tipo = 'punto' ORDER BY s.id LIMIT 1`).get(INGRESSO) as { id: number; voce: string };
    const altre = prepared(`SELECT COUNT(*) FROM spillo WHERE mappa_chiave IS NULL AND area_guida_chiave = ? AND NOT (riferimento_tipo = 'punto' AND riferimento_chiave = ?)`).pluck().get(INGRESSO, scheda.voce) as number;
    await modifica(scheda.voce, { area: SALA }).expect(200);
    expect(prepared('SELECT area_guida_chiave FROM spillo WHERE id = ?').pluck().get(scheda.id)).toBe(SALA);
    expect(prepared(`SELECT COUNT(*) FROM spillo WHERE mappa_chiave IS NULL AND area_guida_chiave = ?`).pluck().get(INGRESSO)).toBe(altre);
  });

  it('solo un\'area che esiste e dello stesso Palazzo, e non nei Memento', async () => {
    const v = await nuova(INGRESSO, 'Voce che resta', 'storia');
    const altro = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'madarame' ORDER BY ordine LIMIT 1").pluck().get() as string;
    expect((await modifica(v.chiave, { area: altro })).body.error.code).toBe('area-di-altro-palazzo');
    const nessuna = await modifica(v.chiave, { area: 'area-che-non-esiste' });
    expect([nessuna.status, nessuna.body.error.code]).toEqual([404, 'area-non-trovata']);
    expect(dove(v.chiave).area_chiave).toBe(INGRESSO);
    const trama = prepared("SELECT chiave FROM punto_interesse WHERE tipo = 'trama' AND area_chiave = 'mementos-02-aiyatsbus' LIMIT 1").pluck().get() as string;
    expect((await modifica(trama, { area: 'mementos-03-chemdah' })).body.error.code).toBe('area-solo-nei-palazzi');
    // creando una voce `area` nel corpo non vale: conta l'area dell'indirizzo
    const creata = (await request(app).post(`/api/compendio/aree/${INGRESSO}/punti`).send({ nome: 'Nuova', tipo: 'storia', area: SALA }).expect(201)).body.data as PuntoInteresseDto;
    expect(dove(creata.chiave).area_chiave).toBe(INGRESSO);
    // lo schema della creazione toglie `area` già all'ingresso; quello della correzione la tiene
    expect(bodyNuovoPunto.parse({ nome: 'Nuova', tipo: 'storia', area: SALA })).not.toHaveProperty('area');
    expect(bodyPunto.parse({ area: SALA })).toEqual({ area: SALA });
  });
});
