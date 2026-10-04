// ============================================================
// Test API — requisiti dei Confidenti come eventi della partita (Sojiro rango 3) e avvertenze che non bloccano (Futaba rango 4)
// ============================================================
//
// Sojiro restava fermo al rango 3: «il caffè al Leblanc» era un requisito da confermare con un
// pulsante che l'utente non trovava. Ora è un evento di Partita → Progressi, e il pulsante del
// Confidente scrive lo stesso dato: segnarlo da una parte si vede dall'altra.
// ============================================================

import request from 'supertest';
import { closeDb } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import type { ConfidentePartitaDto, ProgressiPartitaDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

describe('Requisiti dei Confidenti come eventi della partita', () => {
  let id = 0;
  beforeAll(async () => {
    dbDiProva();
    id = ((await request(app).post('/api/partite').send({ nome: 'Eventi' })).body.data as { id: number }).id;
  });
  afterAll(() => closeDb());

  const confidente = async (chiave: string) => ((await request(app).get(`/api/partite/${id}/confidenti`)).body.data as ConfidentePartitaDto[]).find((c) => c.chiave === chiave)!;
  const progressi = async () => (await request(app).get(`/api/condizioni/partite/${id}/progressi`)).body.data as ProgressiPartitaDto;
  const segnaEvento = (evento: string, avvenuto: boolean) => request(app).put(`/api/condizioni/partite/${id}/eventi/${evento}`).send({ avvenuto });
  const caffe = (c: ConfidentePartitaDto) => c.semafori.find((s) => s.rango === 3)!.requisiti.find((r) => r.tipo === 'evento')!;

  it('il caffè al Leblanc: da segnare e bloccante, e in Progressi dice a che cosa serve', async () => {
    await request(app).put(`/api/partite/${id}/confidenti/sojiro`).send({ rango: 2, forza: true });
    const sojiro = await confidente('sojiro');
    expect(caffe(sojiro)).toMatchObject({ stato: 'grigio', manuale: true, confermato: false });
    expect(caffe(sojiro).dettaglio).toMatch(/Partita → Progressi/);
    expect(sojiro.bloccato).toMatchObject({ rango: 3 });
    const evento = (await progressi()).eventi.find((e) => e.chiave === 'caffe-leblanc')!;
    expect(evento).toMatchObject({ origine: 'manuale', avvenuto: false, serveA: ['Sojiro Sakura, rango 3'] });
  });

  it('segnato in Progressi, il rango 3 di Sojiro si sblocca; tolto, torna da segnare', async () => {
    await segnaEvento('caffe-leblanc', true).expect(200);
    let sojiro = await confidente('sojiro');
    expect(caffe(sojiro)).toMatchObject({ stato: 'verde', confermato: true });
    expect(sojiro.bloccato).toBeNull();
    await segnaEvento('caffe-leblanc', false).expect(200);
    sojiro = await confidente('sojiro');
    expect(caffe(sojiro)).toMatchObject({ stato: 'grigio', confermato: false });
  });

  it('«Condizione soddisfatta» sul Confidente segna lo stesso evento di Progressi, e lo toglie', async () => {
    const r = caffe(await confidente('sojiro'));
    const dopo = (await request(app).put(`/api/partite/${id}/confidenti/sojiro/requisiti`).send({ rango: 3, indice: r.indice, confermato: true })).body.data as ConfidentePartitaDto;
    expect(caffe(dopo)).toMatchObject({ stato: 'verde', confermato: true });
    expect((await progressi()).eventi.find((e) => e.chiave === 'caffe-leblanc')!.avvenuto).toBe(true);
    await request(app).put(`/api/partite/${id}/confidenti/sojiro/requisiti`).send({ rango: 3, indice: r.indice, confermato: false }).expect(200);
    expect((await progressi()).eventi.find((e) => e.chiave === 'caffe-leblanc')!.avvenuto).toBe(false);
    // col caffè segnato si sale al rango 3 senza forzare
    await segnaEvento('caffe-leblanc', true).expect(200);
    expect((await request(app).put(`/api/partite/${id}/confidenti/sojiro`).send({ rango: 3 })).status).toBe(200);
  });

  it('ogni evento dei requisiti è in Progressi con il Confidente che lo aspetta', async () => {
    const eventi = (await progressi()).eventi;
    expect(eventi.find((e) => e.chiave === 'duello-akechi-vinto')?.serveA).toEqual(['Goro Akechi, rango 8']);
    expect(eventi.find((e) => e.chiave === 'pietra-sacra-comprata')?.serveA?.[0]).toMatch(/rango 1$/);
    expect(eventi.find((e) => e.chiave === 'chiamata-kawakami-pagata')?.serveA?.[0]).toMatch(/rango 1$/);
    expect(eventi.find((e) => e.chiave === 'oratore-shibuya-ascoltato')?.serveA?.[0]).toMatch(/rango 1$/);
    // gli eventi che nessun requisito chiede non hanno la riga
    expect(eventi.find((e) => e.chiave === 'mansarda-pulita')?.serveA).toBeUndefined();
  });

  it('la scuola aperta di Futaba al rango 4 è un’avvertenza: grigia, non si conferma e non blocca', async () => {
    await request(app).put(`/api/partite/${id}/confidenti/futaba`).send({ rango: 3, forza: true });
    const futaba = await confidente('futaba');
    const sem = futaba.semafori.find((s) => s.rango === 4)!;
    const avviso = sem.requisiti.find((r) => r.tipo === 'avviso')!;
    expect(avviso).toMatchObject({ stato: 'grigio', bloccante: false, manuale: false });
    // gli altri requisiti del rango 4 (se ce ne sono) decidono da soli
    expect(sem.pronto).toBe(sem.requisiti.filter((r) => r.bloccante !== false).every((r) => r.stato === 'verde'));
    if (sem.pronto) expect(futaba.bloccato).toBeNull();
    else expect(futaba.bloccato!.motivi.some((m) => m.includes('scuola'))).toBe(false);
    const rifiuto = await request(app).put(`/api/partite/${id}/confidenti/futaba/requisiti`).send({ rango: 4, indice: avviso.indice, confermato: true });
    expect(rifiuto.status).toBe(400);
    expect(rifiuto.body.error.code).toBe('requisito-non-confermabile');
  });
});
