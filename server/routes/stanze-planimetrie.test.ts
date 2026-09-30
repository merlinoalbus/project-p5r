// ============================================================
// La stanza di una planimetria si cambia (richiesta dell'utente, 2026-09-30)
// ============================================================
//
// «Come faccio a rendere una mappa censita come a sé e trasformarla in planimetria di un'altra mappa? E il
// viceversa, prendere una planimetria gestita all'interno di una mappa ed eleggerla mappa individuale?»
// La stanza è il gruppo di immagini: `PUT /api/mappe/:chiave/stanza` con `con` (entra nella stanza di
// quella) o `con: null` (diventa una stanza a sé), in un'operazione sola.
// ============================================================

import request from 'supertest';
import { closeDb, initDb, prepared } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import { creaMappa, esportaMappe, importaMappe } from '../services/mappe/mappeService.js';
import type { MappaDto } from '../../shared/types.js';

const app = createApp();

type Gruppo = { id: string; nome: string; ordine: number; etichetta?: string; nomeRivisto?: boolean };
const gruppo = (mappa: string): Gruppo | null => {
  const r = prepared('SELECT gruppo_immagini_json FROM mappa_presentazione WHERE mappa_chiave = ?').get(mappa) as { gruppo_immagini_json: string | null } | undefined;
  return r?.gruppo_immagini_json ? JSON.parse(r.gruppo_immagini_json) as Gruppo : null;
};

describe('la stanza di una planimetria', () => {
  let a: MappaDto; let b: MappaDto; let c: MappaDto;
  beforeAll(() => {
    const db = initDb(':memory:');
    caricaPacchetto(db);
    invalidaCacheTraduzioni();
    a = creaMappa(undefined, { nome: 'Salone porzione ovest', tipo: 'area', genitore: 'dungeon-kamoshida' });
    b = creaMappa(undefined, { nome: 'Salone', tipo: 'area', genitore: 'dungeon-kamoshida' });
    c = creaMappa(undefined, { nome: 'Salone porzione est', tipo: 'area', genitore: 'dungeon-kamoshida' });
  });
  afterAll(() => closeDb());

  it('una mappa a sé entra nella stanza di un’altra: se quella non ne ha una, nasce col nome dato; l’etichetta resta', async () => {
    await request(app).put(`/api/mappe/${a.chiave}/presentazione`).send({ etichetta: 'Porzione ovest' }).expect(200);
    const r = await request(app).put(`/api/mappe/${a.chiave}/stanza`).send({ con: b.chiave, nome: 'Salone dei trofei' });
    expect(r.status).toBe(200);
    expect(gruppo(b.chiave)).toMatchObject({ nome: 'Salone dei trofei', ordine: 0 });
    // il nome della stanza l'ha dato l'interfaccia: è scelto, e vince sul nome rivisto delle singole mappe
    expect(gruppo(a.chiave)).toEqual({ id: gruppo(b.chiave)!.id, nome: 'Salone dei trofei', ordine: 1, etichetta: 'Porzione ovest', nomeRivisto: true });
    // nell'ordine del luogo è subito dopo la stanza in cui è entrata, così le versioni si leggono in fila
    const ordine = () => (prepared("SELECT chiave FROM mappa WHERE genitore_chiave = 'dungeon-kamoshida' ORDER BY ordine, chiave").all() as Array<{ chiave: string }>).map((x) => x.chiave);
    expect(ordine().indexOf(a.chiave)).toBe(ordine().indexOf(b.chiave) + 1);
    // una terza entra in fondo, anche nell'ordine
    await request(app).put(`/api/mappe/${c.chiave}/stanza`).send({ con: a.chiave }).expect(200);
    expect(gruppo(c.chiave)).toMatchObject({ id: gruppo(b.chiave)!.id, ordine: 2 });
    expect(ordine().slice(ordine().indexOf(b.chiave), ordine().indexOf(b.chiave) + 3)).toEqual([b.chiave, a.chiave, c.chiave]);
    // le righe diventano dell'utente, come ogni modifica dall'app
    expect((prepared('SELECT origine FROM mappa WHERE chiave = ?').get(b.chiave) as { origine: string }).origine).toBe('utente');
  });

  it('una planimetria di una stanza diventa una stanza a sé, col suo nome e la sua etichetta; le altre restano insieme', async () => {
    const prima = gruppo(b.chiave)!.id;
    await request(app).put(`/api/mappe/${a.chiave}/stanza`).send({ con: null, nome: 'Ala ovest' }).expect(200);
    expect(gruppo(a.chiave)).toMatchObject({ nome: 'Ala ovest', ordine: 0, etichetta: 'Porzione ovest' });
    expect(gruppo(a.chiave)!.id).not.toBe(prima);
    expect(gruppo(b.chiave)!.id).toBe(prima);
    expect(gruppo(c.chiave)!.id).toBe(prima);
    // anche la mappa che ha dato il nome alla stanza può uscirne
    await request(app).put(`/api/mappe/${b.chiave}/stanza`).send({ con: null, nome: 'Salone' }).expect(200);
    expect(gruppo(b.chiave)!.id).not.toBe(gruppo(c.chiave)!.id);
  });

  it('il nome della stanza scelto da una persona si segna su tutte le sue planimetrie, anche su chi ci entra dopo', async () => {
    const d = creaMappa(undefined, { nome: 'Cripta', tipo: 'area', genitore: 'dungeon-kamoshida' });
    const e = creaMappa(undefined, { nome: 'Cripta laterale', tipo: 'area', genitore: 'dungeon-kamoshida' });
    await request(app).put(`/api/mappe/${e.chiave}/stanza`).send({ con: d.chiave, nome: 'Cripta' }).expect(200);
    await request(app).put(`/api/mappe/${e.chiave}/presentazione`).send({ gruppoNome: 'Cripta dei re' }).expect(200);
    expect(gruppo(d.chiave)).toMatchObject({ nome: 'Cripta dei re', nomeRivisto: true });
    expect(gruppo(e.chiave)).toMatchObject({ nome: 'Cripta dei re', nomeRivisto: true });
    // la sola etichetta non toglie il segno
    await request(app).put(`/api/mappe/${d.chiave}/presentazione`).send({ etichetta: 'Pianta completa' }).expect(200);
    expect(gruppo(d.chiave)).toMatchObject({ nomeRivisto: true, etichetta: 'Pianta completa' });
    const f = creaMappa(undefined, { nome: 'Cripta, ossario', tipo: 'area', genitore: 'dungeon-kamoshida' });
    await request(app).put(`/api/mappe/${f.chiave}/stanza`).send({ con: d.chiave }).expect(200);
    expect(gruppo(f.chiave)).toMatchObject({ nome: 'Cripta dei re', nomeRivisto: true });
    // il segno viaggia nel pacchetto delle mappe: esportato e reimportato resta
    const pacchetto = esportaMappe(d.chiave);
    expect(pacchetto.mappe.find((m) => m.chiave === d.chiave)!.gruppoImmagini).toMatchObject({ nomeRivisto: true });
    prepared('UPDATE mappa_presentazione SET gruppo_immagini_json = NULL WHERE mappa_chiave = ?').run(d.chiave);
    importaMappe(pacchetto, { sovrascrivi: true });
    expect(gruppo(d.chiave)).toMatchObject({ nome: 'Cripta dei re', nomeRivisto: true });
  });

  it('rinominare la prima planimetria di una stanza (anche dall’editor) fissa il titolo che la stanza aveva; le altre non la toccano', async () => {
    const g = creaMappa(undefined, { nome: 'Torre ovest', tipo: 'area', genitore: 'dungeon-kamoshida' });
    const h = creaMappa(undefined, { nome: 'Torre ovest bis', tipo: 'area', genitore: 'dungeon-kamoshida' });
    // una stanza dell'estrazione: nome col gergo, nessun nome scelto; «g» è la prima nell'ordine
    const estratta = { id: 'nativo-prova-torre', nome: 'Palazzo di Kamoshida — Immagini native che nessun campo usa', ordine: 0 };
    for (const [k, o] of [[g.chiave, 0], [h.chiave, 1]] as const) {
      prepared("INSERT INTO mappa_presentazione (mappa_chiave, contesti_json, gruppo_immagini_json) VALUES (?, '[]', ?) ON CONFLICT(mappa_chiave) DO UPDATE SET gruppo_immagini_json = excluded.gruppo_immagini_json")
        .run(k, JSON.stringify({ ...estratta, ordine: o }));
    }
    prepared('UPDATE mappa SET ordine = -2 WHERE chiave = ?').run(g.chiave);
    prepared('UPDATE mappa SET ordine = -1 WHERE chiave = ?').run(h.chiave);
    // la seconda cambia nome: il titolo della stanza non dipende da lei, niente da fissare
    await request(app).put(`/api/mappe/${h.chiave}`).send({ nome: 'Torre ovest, porzione' }).expect(200);
    expect(gruppo(h.chiave)!.nomeRivisto).toBeUndefined();
    // la prima cambia nome: il titolo di prima (senza gergo, come lo mostra la scheda) diventa il nome scelto
    await request(app).put(`/api/mappe/${g.chiave}`).send({ nome: 'Torre ovest rinominata' }).expect(200);
    expect(gruppo(g.chiave)).toMatchObject({ nome: 'Palazzo di Kamoshida — Planimetria non attribuita', nomeRivisto: true });
    expect(gruppo(h.chiave)).toMatchObject({ nome: 'Palazzo di Kamoshida — Planimetria non attribuita', nomeRivisto: true });

    // con la prima già rinominata a mano, il titolo era il suo nome: è quello che si fissa
    const i = creaMappa(undefined, { nome: 'Cella', tipo: 'area', genitore: 'dungeon-kamoshida' });
    prepared("INSERT INTO mappa_presentazione (mappa_chiave, contesti_json, gruppo_immagini_json) VALUES (?, '[]', ?) ON CONFLICT(mappa_chiave) DO UPDATE SET gruppo_immagini_json = excluded.gruppo_immagini_json")
      .run(i.chiave, JSON.stringify({ id: 'nativo-prova-cella', nome: 'Cella grezza', ordine: 0 }));
    prepared('UPDATE mappa SET nome_rivisto = 1 WHERE chiave = ?').run(i.chiave);
    await request(app).put(`/api/mappe/${i.chiave}`).send({ nome: 'Cella nord' }).expect(200);
    expect(gruppo(i.chiave)).toMatchObject({ nome: 'Cella', nomeRivisto: true });
  });

  it('solo fra planimetrie dello stesso luogo; non nella propria stanza; mappa inesistente 404; corpo non valido 400', async () => {
    const altrove = creaMappa(undefined, { nome: 'Galleria', tipo: 'area', genitore: 'dungeon-madarame' });
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
