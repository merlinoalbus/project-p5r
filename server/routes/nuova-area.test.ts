// ============================================================
// Una sezione nuova della guida di un Palazzo (richiesta dell'utente, 2026-10-01)
// ============================================================
//
// «come faccio ad aggiungere una nuova sezione di guida ad una planimetria che non ha sezioni di guida autonome?» — «implementa».
// L'area nasce al posto scelto (in cima, dopo un'altra, in fondo), l'ordine del Palazzo si ricompatta, e con la planimetria
// si aggiunge alle sue aree. Tutto o niente: una planimetria sbagliata non lascia un'area a metà.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { palazzoDiOgniMappa } from '../services/palazziService.js';
import type { DungeonDettaglioDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();
const aree = () => (prepared("SELECT chiave, ordine FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine, chiave").all() as Array<{ chiave: string; ordine: number }>);
const crea = (corpo: Record<string, unknown>, dungeon = 'kamoshida') => request(app).post(`/api/compendio/dungeon/${dungeon}/aree`).send(corpo);

describe('nuova area della guida', () => {
  beforeAll(() => {
    dbDiProva();
  });
  afterAll(() => closeDb());

  it('nasce in fondo, in cima o dopo un’area, e l’ordine del Palazzo resta 0, 1, 2… senza buchi', async () => {
    const prima = aree().map((a) => a.chiave);
    const inFondo = (await crea({ nome: 'Soffitta segreta', descrizione: 'Sopra la torre.' }).expect(201)).body.data as { chiave: string; nome: string; ordine: number };
    expect(inFondo).toEqual({ chiave: 'kamoshida-soffitta-segreta', nome: 'Soffitta segreta', ordine: prima.length });
    const inCima = (await crea({ nome: 'Atrio', dopo: null }).expect(201)).body.data as { chiave: string; ordine: number };
    expect(inCima.ordine).toBe(0);
    const dopoSeconda = (await crea({ nome: 'Corridoio di servizio', dopo: prima[1] }).expect(201)).body.data as { chiave: string; ordine: number };
    const ora = aree();
    expect(ora.map((a) => a.ordine)).toEqual(ora.map((_, i) => i));
    expect(ora.map((a) => a.chiave)).toEqual(['kamoshida-atrio', prima[0], prima[1], 'kamoshida-corridoio-di-servizio', ...prima.slice(2), 'kamoshida-soffitta-segreta']);
    expect(dopoSeconda.ordine).toBe(3);
    // nella scheda del Palazzo c'è, col suo testo, senza planimetria e senza voci (le si aggiunge dalla guida dell'area)
    const scheda = (await request(app).get('/api/compendio/dungeon/kamoshida').expect(200)).body.data as DungeonDettaglioDto;
    expect(scheda.aree.find((a) => a.chiave === inFondo.chiave)).toMatchObject({ nome: 'Soffitta segreta', descrizione: 'Sopra la torre.', mappe: [], punti: [] });
    // e la guida dell'area la accetta: una voce nuova
    await request(app).post(`/api/compendio/aree/${inFondo.chiave}/punti`).send({ nome: 'Forziere in soffitta', tipo: 'forziere' }).expect(201);
  });

  it('due aree con lo stesso nome hanno chiavi diverse', async () => {
    const a = (await crea({ nome: 'Ripostiglio' }).expect(201)).body.data as { chiave: string };
    const b = (await crea({ nome: 'Ripostiglio' }).expect(201)).body.data as { chiave: string };
    expect([a.chiave, b.chiave]).toEqual(['kamoshida-ripostiglio', 'kamoshida-ripostiglio-2']);
  });

  it('un nome lunghissimo (300 caratteri) dà una chiave che le route accettano: l’area si modifica, si riempie e si elimina', async () => {
    const nome = 'Sala '.padEnd(300, 'x');
    const a = (await crea({ nome }).expect(201)).body.data as { chiave: string };
    expect(a.chiave.length).toBeLessThanOrEqual(200 - 6);
    const b = (await crea({ nome }).expect(201)).body.data as { chiave: string };
    expect(b.chiave).toBe(`${a.chiave}-2`);
    await request(app).put(`/api/compendio/aree/${a.chiave}`).send({ descrizione: 'Ritoccata.' }).expect(200);
    await request(app).post(`/api/compendio/aree/${a.chiave}/punti`).send({ nome: 'Voce', tipo: 'altro' }).expect(201);
    await request(app).delete(`/api/compendio/aree/${a.chiave}`).expect(204);
    await request(app).delete(`/api/compendio/aree/${b.chiave}`).expect(204);
  });

  it('un nome senza lettere né cifre non dà una chiave vuota', async () => {
    const a = (await crea({ nome: '???' }).expect(201)).body.data as { chiave: string };
    expect(a.chiave).toBe('kamoshida-area');
    await request(app).delete(`/api/compendio/aree/${a.chiave}`).expect(204);
  });

  it('con la planimetria si aggiunge alle sue aree, e quelle che aveva restano', async () => {
    const palazzi = palazzoDiOgniMappa();
    const pianta = (prepared("SELECT e.mappa_chiave FROM mappa_entita e WHERE e.entita_tipo = 'area' AND e.entita_chiave LIKE 'kamoshida-%' LIMIT 1").pluck().get() as string);
    expect(palazzi.get(pianta)).toBe('kamoshida');
    const gia = prepared("SELECT entita_chiave FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'area' ORDER BY entita_chiave").pluck().all(pianta) as string[];
    const pubblica = prepared('SELECT chiave FROM mappa_percorso WHERE mappa_chiave = ? LIMIT 1').pluck().get(pianta) as string | undefined;
    const nuova = (await crea({ nome: 'Stanza dietro l’arazzo', planimetria: pubblica ?? pianta }).expect(201)).body.data as { chiave: string };
    const dopo = prepared("SELECT entita_chiave FROM mappa_entita WHERE mappa_chiave = ? AND entita_tipo = 'area' ORDER BY entita_chiave").pluck().all(pianta) as string[];
    expect(dopo).toEqual([...gia, nuova.chiave].sort());
    const scheda = (await request(app).get('/api/compendio/dungeon/kamoshida').expect(200)).body.data as DungeonDettaglioDto;
    expect(scheda.aree.find((a) => a.chiave === nuova.chiave)!.mappe.length).toBe(1);
  });

  it('tutto o niente: una planimetria di un altro Palazzo, un’area di riferimento altrui o un Palazzo che non c’è non creano niente', async () => {
    const quante = aree().length;
    const altrove = prepared("SELECT e.mappa_chiave FROM mappa_entita e WHERE e.entita_tipo = 'area' AND e.entita_chiave LIKE 'madarame-%' LIMIT 1").pluck().get() as string;
    await crea({ nome: 'Area sbagliata', planimetria: altrove }).expect(400);
    expect(aree().length).toBe(quante);
    expect((await crea({ nome: 'Area sbagliata', dopo: 'madarame-01-ingresso-del-museo' }).expect(400)).body.error.code).toBe('area-non-del-palazzo');
    expect(aree().length).toBe(quante);
    await crea({ nome: 'Area' }, 'nessuno').expect(404);
    await crea({ nome: '   ' }).expect(400);
  });
});
