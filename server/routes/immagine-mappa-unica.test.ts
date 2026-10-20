// ============================================================
// L1 (2026-10-20) — l'immagine di una mappa da un posto solo: ogni strada che la scrive (editor, rotta generica delle immagini,
// rimozione) allinea chiave, dimensioni e ruolo con la regola della gerarchia, e ogni vista riceve lo stesso URL versionato
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { creaMappa } from '../services/mappe/mappeService.js';
import type { MappaDto, MappaRiassuntoDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';
import { planimetriaDiPalazzo } from '../../test/planimetriaDiPalazzo.js';

const app = createApp();

/** PNG minimo di larghezza×altezza dati (intestazione IHDR valida; il contenuto non viene decodificato). */
const png = (l: number, a: number) => {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(l, 0); ihdr.writeUInt32BE(a, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from([0, 0, 0, 13]), Buffer.from('IHDR'), ihdr, Buffer.alloc(4), Buffer.alloc(4), Buffer.from('IEND'), Buffer.alloc(4)]);
};
const riga = (chiave: string) => prepared('SELECT immagine_chiave, larghezza, altezza, ruolo_immagine, origine FROM mappa WHERE chiave = ?').get(chiave) as { immagine_chiave: string | null; larghezza: number | null; altezza: number | null; ruolo_immagine: string; origine: string };

describe('l’immagine di una mappa da un posto solo (L1)', () => {
  beforeAll(() => { dbDiProva(); });
  afterAll(() => closeDb());

  it('caricata dall’editor: una planimetria nuova del Palazzo diventa «planimetria-nativa» con le dimensioni, e l’URL è versionato', async () => {
    const m = planimetriaDiPalazzo('kamoshida', { nome: 'Planimetria L1', asset: null });
    expect(riga(m.chiave).ruolo_immagine).toBe('nessuna');
    const r = await request(app).put(`/api/mappe/${encodeURIComponent(m.chiave)}/immagine`).set('Content-Type', 'image/png').send(png(40, 30)).expect(200);
    const d = r.body.data as MappaDto;
    expect(d).toMatchObject({ ruoloImmagine: 'planimetria-nativa', larghezza: 40, altezza: 30, asset: null });
    expect(d.immagineUrl).toMatch(/^\/api\/immagini\/mappa\/.+\/file\?v=/);
    expect('assetOriginale' in d).toBe(false);
    expect(riga(prepared('SELECT chiave FROM mappa WHERE nome = ?').pluck().get('Planimetria L1') as string)).toMatchObject({ larghezza: 40, altezza: 30, ruolo_immagine: 'planimetria-nativa', origine: 'utente' });
    // l'albero dà lo stesso URL versionato, non quello di prima senza versione
    const albero = (await request(app).get('/api/mappe/albero').expect(200)).body.data as MappaRiassuntoDto[];
    expect(albero.find((x) => x.chiave === d.chiave)?.immagineUrl).toBe(d.immagineUrl);
  });

  it('caricata dalla rotta generica delle immagini: stessa regola dell’editor (prima salvava e basta, col ruolo «nessuna»)', async () => {
    const m = planimetriaDiPalazzo('kamoshida', { nome: 'Rotta generica L1', asset: null });
    const interna = prepared('SELECT chiave FROM mappa WHERE nome = ?').pluck().get('Rotta generica L1') as string;
    await request(app).put(`/api/immagini/mappa/${encodeURIComponent(m.chiave)}`).set('Content-Type', 'image/png').send(png(64, 48)).expect(201);
    expect(riga(interna)).toMatchObject({ immagine_chiave: interna, larghezza: 64, altezza: 48, ruolo_immagine: 'planimetria-nativa' });
    // tolta l'immagine, la mappa la dimentica (dimensioni comprese) e torna senza ruolo: non ha un asset
    await request(app).delete(`/api/immagini/mappa/${encodeURIComponent(m.chiave)}`).expect(204);
    expect(riga(interna)).toMatchObject({ immagine_chiave: null, larghezza: null, altezza: null, ruolo_immagine: 'nessuna' });
  });

  it('un quartiere con l’immagine caricata è un’illustrazione; la radice di un Palazzo resta stemma anche con un’illustrazione caricata', async () => {
    const q = creaMappa(undefined, { nome: 'Quartiere L1', tipo: 'quartiere', genitore: 'tokyo', asset: null });
    await request(app).put(`/api/mappe/${encodeURIComponent(q.chiave)}/immagine`).set('Content-Type', 'image/png').send(png(10, 10)).expect(200);
    expect((await request(app).get(`/api/mappe/${encodeURIComponent(q.chiave)}`).expect(200)).body.data.ruoloImmagine).toBe('illustrazione-editoriale');
    await request(app).put('/api/mappe/dungeon-kamoshida/immagine').set('Content-Type', 'image/png').send(png(16, 9)).expect(200);
    expect(riga('dungeon-kamoshida').ruolo_immagine).toBe('emblema');
  });

  it('una mappa con i pezzi ritagliati: anche dalla rotta generica la sostituzione chiede conferma (409 mappa-con-pezzi)', async () => {
    const m = planimetriaDiPalazzo('kamoshida', { nome: 'Con pezzi L1', asset: null });
    await request(app).put(`/api/mappe/${encodeURIComponent(m.chiave)}/immagine`).set('Content-Type', 'image/png').send(png(100, 100)).expect(200);
    await request(app).post(`/api/mappe/${encodeURIComponent(m.chiave)}/pezzi`).send({ nome: 'Muro', sorgente: { x: 10, y: 10, larghezza: 20, altezza: 20 } }).expect(201);
    const r = await request(app).put(`/api/immagini/mappa/${encodeURIComponent(m.chiave)}`).set('Content-Type', 'image/png').send(png(50, 50));
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('mappa-con-pezzi');
    await request(app).put(`/api/immagini/mappa/${encodeURIComponent(m.chiave)}?eliminaPezzi=1`).set('Content-Type', 'image/png').send(png(50, 50)).expect(201);
  });
});
