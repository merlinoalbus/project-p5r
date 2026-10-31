// ============================================================
// L13, O9-5 (2026-10-31) — le miniature delle carte dei Palazzi, dei Dedali dei Memento e delle loro aree nella pagina Luoghi: ambito
// `dungeon`, entità verificata (400/404), URL versionato nella gerarchia, miniatura WebP con `l`, rimozione che riporta all'emblema
// Scritto per la verifica; non eseguito (zero test nella ripresa corrente).
// ============================================================

import sharp from 'sharp';
import request from 'supertest';
import { closeDb } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { dbDiProva } from '../../test/dbDiProva.js';
import type { GerarchiaMappeDto, NodoGerarchiaDto } from '../../shared/types.js';

const app = createApp();
const png = (l: number, a: number) => sharp({ create: { width: l, height: a, channels: 4, background: { r: 200, g: 30, b: 60, alpha: 1 } } }).png().toBuffer();
const binario = (r: request.Test) => r.buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on('data', (d: Buffer) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); });

/** Tutti i nodi della gerarchia, in profondità. */
function nodi(g: GerarchiaMappeDto): NodoGerarchiaDto[] {
  const fuori: NodoGerarchiaDto[] = [];
  const visita = (n: NodoGerarchiaDto) => { fuori.push(n); n.figli.forEach(visita); };
  g.radici.forEach(visita);
  return fuori;
}
const gerarchia = async () => (await request(app).get('/api/mappe/gerarchia').expect(200)).body.data as GerarchiaMappeDto;
const nodo = async (tipo: string, chiave: string) => nodi(await gerarchia()).find((n) => n.tipo === tipo && n.chiave === chiave);

describe('miniature delle carte dei Luoghi (O9-5)', () => {
  beforeAll(() => { dbDiProva(); });
  afterAll(() => closeDb());

  it('1 — senza caricata: il Palazzo, il Dedalo e l’area del Dedalo hanno `immagine` null e la chiave dove caricarla', async () => {
    const k = await nodo('palazzo', 'kamoshida');
    expect(k?.immagine).toBeNull();
    expect(k?.miniatura).toEqual({ ambito: 'dungeon', chiave: 'kamoshida' });
    const dd = await nodo('dedalo', 'mementos-02-aiyatsbus');
    expect(dd?.immagine).toBeNull();
    expect(dd?.miniatura).toEqual({ ambito: 'dungeon', chiave: 'mementos-02-aiyatsbus' });
    const a = await nodo('area-dedalo', 'mementos-02-aiyatsbus-area-2');
    expect(a?.immagine).toBeNull();
    expect(a?.miniatura).toEqual({ ambito: 'dungeon', chiave: 'mementos-02-aiyatsbus-area-2' });
    // e anche la carta «Memento»
    expect((await nodo('memento', 'mementos'))?.miniatura).toEqual({ ambito: 'dungeon', chiave: 'mementos' });
  });

  it('2 — PUT di un PNG per un Palazzo, un Dedalo e un’area del Dedalo: la gerarchia porta l’URL versionato, `l` dà la WebP', async () => {
    for (const [tipo, chiave] of [['palazzo', 'kamoshida'], ['dedalo', 'mementos-02-aiyatsbus'], ['area-dedalo', 'mementos-02-aiyatsbus-area-2']] as const) {
      await request(app).put(`/api/immagini/dungeon/${chiave}`).set('Content-Type', 'image/png').send(await png(1600, 900)).expect(201);
      const n = await nodo(tipo, chiave);
      expect(n?.immagine?.immagineUrl).toMatch(new RegExp(`^/api/immagini/dungeon/${chiave}/file\\?v=`));
      expect(n?.immagine?.asset).toBeNull();
      const r = await binario(request(app).get(`${n!.immagine!.immagineUrl}&l=320`)).expect(200);
      expect(r.headers['content-type']).toBe('image/webp');
      expect((await sharp(r.body as Buffer).metadata()).width).toBe(320);
    }
  });

  it('3 — DELETE la toglie: il Palazzo torna senza immagine (l’emblema lo disegna il client)', async () => {
    await request(app).delete('/api/immagini/dungeon/kamoshida').expect(204);
    expect((await nodo('palazzo', 'kamoshida'))?.immagine).toBeNull();
    await request(app).delete('/api/immagini/dungeon/kamoshida').expect(404);
  });

  it('4 — chiave inesistente 404 `luogo-non-trovato`; chiave di altro (infiltrazione di un Palazzo) 400 `luogo-senza-miniatura`; nulla si salva', async () => {
    const corpo = await png(10, 10);
    const r404 = await request(app).put('/api/immagini/dungeon/non-esiste').set('Content-Type', 'image/png').send(corpo).expect(404);
    expect(r404.body.error.code).toBe('luogo-non-trovato');
    // un Dedalo e la carta «Memento» dal 2026-10-31 hanno la loro miniatura: qui un'infiltrazione di un Palazzo
    for (const chiave of ['kamoshida-01-cancello-del-castello-ingresso']) {
      const r400 = await request(app).put(`/api/immagini/dungeon/${chiave}`).set('Content-Type', 'image/png').send(corpo).expect(400);
      expect(r400.body.error.code).toBe('luogo-senza-miniatura');
    }
    const elenco = (await request(app).get('/api/immagini?ambito=dungeon').expect(200)).body.data as Array<{ chiave: string }>;
    expect(elenco.map((i) => i.chiave)).not.toContain('non-esiste');
  });
});
