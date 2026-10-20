// ============================================================
// L1 (2026-10-20), correzioni del primo giro del validatore — ogni strada che scrive o toglie l'immagine di una mappa segue la
// regola dell'editor sui pezzi (F5), le dimensioni importate col pacchetto sono dichiarate (F6), una mappa nuova dichiara un
// asset solo se esiste (F9), e l'illustrazione di quartieri e Palazzi è la stessa immagine della loro mappa (scelta dell'utente)
// ============================================================

import http from 'node:http';
import request from 'supertest';
import { closeDb, getDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { creaMappa, esportaMappe, importaMappe } from '../services/mappe/mappeService.js';
import { salvaImmagine } from '../services/immaginiService.js';
import type { DungeonDettaglioDto, MappaDto, QuartiereDettaglioDto, QuartiereRiassuntoDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

/** PNG minimo di larghezza×altezza dati (intestazione IHDR valida; il contenuto non viene decodificato). */
const png = (l: number, a: number) => {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(l, 0); ihdr.writeUInt32BE(a, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from([0, 0, 0, 13]), Buffer.from('IHDR'), ihdr, Buffer.alloc(4), Buffer.alloc(4), Buffer.from('IEND'), Buffer.alloc(4)]);
};
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
const riga = (chiave: string) => prepared('SELECT immagine_chiave, asset, larghezza, altezza, ruolo_immagine, origine FROM mappa WHERE chiave = ?').get(chiave) as { immagine_chiave: string | null; asset: string | null; larghezza: number | null; altezza: number | null; ruolo_immagine: string; origine: string };
const pezzi = (mappa: string) => prepared('SELECT COUNT(*) FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(mappa) as number;
const interna = (nome: string) => prepared('SELECT chiave FROM mappa WHERE nome = ?').pluck().get(nome) as string;

/** Una planimetria del Palazzo di Kamoshida con l'immagine caricata dall'editor (100×100) e un pezzo ritagliato. */
async function planimetriaConPezzo(nome: string): Promise<{ pubblica: string; chiave: string }> {
  const m = creaMappa(undefined, { nome, tipo: 'area', genitore: 'dungeon-kamoshida', asset: null });
  await request(app).put(`/api/mappe/${encodeURIComponent(m.chiave)}/immagine`).set('Content-Type', 'image/png').send(png(100, 100)).expect(200);
  await request(app).post(`/api/mappe/${encodeURIComponent(m.chiave)}/pezzi`).send({ nome: 'Muro', sorgente: { x: 10, y: 10, larghezza: 20, altezza: 20 } }).expect(201);
  return { pubblica: m.chiave, chiave: interna(nome) };
}

describe('L1 — strade dell’immagine di una mappa, illustrazioni, dimensioni e asset', () => {
  let server: http.Server; let porta = 0;
  beforeAll(async () => {
    dbDiProva();
    // il sito «esterno» delle prove: ogni indirizzo risponde con un PNG 64×48
    server = http.createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(png(64, 48)); });
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', () => ok()));
    porta = (server.address() as { port: number }).port;
  });
  afterAll(async () => { await new Promise<void>((ok) => server.close(() => ok())); closeDb(); });

  it('F5 — da-url su una mappa con pezzi: 409 senza conferma (niente cambia); con la conferma sostituisce, toglie i pezzi e la mappa è dell’utente', async () => {
    const m = await planimetriaConPezzo('Da URL F5');
    prepared("UPDATE mappa SET origine = 'seed' WHERE chiave = ?").run(m.chiave);
    const url = `http://127.0.0.1:${porta}/da-url.png`;
    const r = await request(app).post(`/api/immagini/mappa/${encodeURIComponent(m.pubblica)}/da-url`).send({ url });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('mappa-con-pezzi');
    expect(r.body.error.details).toEqual({ pezzi: 1, copie: 1 });
    expect(pezzi(m.chiave)).toBe(1);
    expect(riga(m.chiave)).toMatchObject({ larghezza: 100, altezza: 100, origine: 'seed' });
    const ok = await request(app).post(`/api/immagini/mappa/${encodeURIComponent(m.pubblica)}/da-url?eliminaPezzi=1`).send({ url });
    expect(ok.status).toBe(201);
    expect(ok.body.data).toMatchObject({ ambito: 'mappa', chiave: m.chiave, origineUrl: url });
    expect(pezzi(m.chiave)).toBe(0);
    expect(riga(m.chiave)).toMatchObject({ immagine_chiave: m.chiave, larghezza: 64, altezza: 48, ruolo_immagine: 'planimetria-nativa', origine: 'utente' });
  });

  it('F5 — scarico della pianta di un quartiere con pezzi: 409 senza conferma, poi con la conferma; l’origine della mappa non cambia (non è una scelta dell’utente)', async () => {
    getDb().prepare('UPDATE pianta_quartiere SET url = ? WHERE quartiere_chiave = ?').run(`http://127.0.0.1:${porta}/shibuya.png`, 'shibuya');
    await request(app).put('/api/mappe/citta-shibuya/immagine').set('Content-Type', 'image/png').send(png(100, 100)).expect(200);
    await request(app).post('/api/mappe/citta-shibuya/pezzi').send({ nome: 'Insegna', sorgente: { x: 0, y: 0, larghezza: 10, altezza: 10 } }).expect(201);
    prepared("UPDATE mappa SET origine = 'seed' WHERE chiave = 'citta-shibuya'").run();
    const r = await request(app).post('/api/mappe/piante-citta/shibuya/scarica');
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('mappa-con-pezzi');
    expect(pezzi('citta-shibuya')).toBe(1);
    expect(riga('citta-shibuya')).toMatchObject({ larghezza: 100, altezza: 100 });
    const ok = await request(app).post('/api/mappe/piante-citta/shibuya/scarica?eliminaPezzi=1');
    expect(ok.status).toBe(201);
    expect(ok.body.data).toMatchObject({ quartiere: 'shibuya', mime: 'image/png' });
    expect(pezzi('citta-shibuya')).toBe(0);
    expect(riga('citta-shibuya')).toMatchObject({ immagine_chiave: 'citta-shibuya', larghezza: 64, altezza: 48, ruolo_immagine: 'illustrazione-editoriale', origine: 'seed' });
  });

  it('illustrazione: scheda e intestazione di ogni quartiere mostrano la stessa immagine della loro mappa (caricata, poi asset)', async () => {
    const elenco = (await request(app).get('/api/compendio/citta').expect(200)).body.data as QuartiereRiassuntoDto[];
    expect(elenco.length).toBeGreaterThan(10);
    for (const q of elenco) {
      const mappa = (await request(app).get(`/api/mappe/${encodeURIComponent(q.mappaChiave!)}`).expect(200)).body.data as MappaDto;
      expect(q.illustrazione).toEqual({ immagineUrl: mappa.immagineUrl, asset: mappa.asset });
      const d = (await request(app).get(`/api/compendio/citta/${q.chiave}`).expect(200)).body.data as QuartiereDettaglioDto;
      expect(d.illustrazione).toEqual(q.illustrazione);
      expect(d.mappa).toBe(mappa.immagineUrl !== null);
    }
    // Shibuya ha la caricata (scaricata nel caso prima): URL versionato
    expect(elenco.find((q) => q.chiave === 'shibuya')!.illustrazione.immagineUrl).toMatch(/^\/api\/immagini\/mappa\/citta-shibuya\/file\?v=/);
  });

  it('illustrazione: l’intestazione di un Palazzo ha la caricata della sua radice, mai lo stemma (che è il segno)', async () => {
    const senza = (await request(app).get('/api/compendio/dungeon/mementos').expect(200)).body.data as DungeonDettaglioDto;
    expect(senza.illustrazione).toEqual({ immagineUrl: null, asset: null });
    await request(app).put('/api/mappe/dungeon-kamoshida/immagine').set('Content-Type', 'image/png').send(png(16, 9)).expect(200);
    const radice = (await request(app).get('/api/mappe/dungeon-kamoshida').expect(200)).body.data as MappaDto;
    const k = (await request(app).get('/api/compendio/dungeon/kamoshida').expect(200)).body.data as DungeonDettaglioDto;
    expect(radice.immagineUrl).toMatch(/\?v=/);
    expect(k.illustrazione).toEqual({ immagineUrl: radice.immagineUrl, asset: null });
  });

  it('F6 — import: le dimensioni dell’intestazione dell’immagine vincono su quelle del pacchetto; se l’intestazione non si legge (SVG) restano quelle del pacchetto', () => {
    const pacchetto = (chiave: string, mime: string, contenuto: Buffer) => ({
      versione: 1 as const, esportato: 'prova',
      mappe: [{ chiave, nome: chiave, tipo: 'generica' as const, genitore: null, ordine: 0, immagine: chiave, asset: null, larghezza: 500, altezza: 400, entita: null, note: '', spilli: [] }],
      immagini: { [chiave]: { mime, base64: contenuto.toString('base64') } },
    });
    importaMappe(pacchetto('import-dimensioni-png', 'image/png', png(64, 48)), { sovrascrivi: true });
    expect(riga('import-dimensioni-png')).toMatchObject({ immagine_chiave: 'import-dimensioni-png', larghezza: 64, altezza: 48 });
    importaMappe(pacchetto('import-dimensioni-svg', 'image/svg+xml', SVG), { sovrascrivi: true });
    expect(riga('import-dimensioni-svg')).toMatchObject({ immagine_chiave: 'import-dimensioni-svg', larghezza: 500, altezza: 400 });
  });

  it('O2 — un SVG senza dimensioni leggibili, caricato dall’editor o dalla rotta generica, conserva le dimensioni dichiarate (come all’import)', async () => {
    for (const [nome, via] of [['SVG editor O2', 'editor'], ['SVG generica O2', 'generica']] as const) {
      const m = creaMappa(undefined, { nome, tipo: 'generica', asset: null, larghezza: 777, altezza: 555 });
      const k = interna(nome);
      expect(riga(k)).toMatchObject({ larghezza: 777, altezza: 555 });
      const url = via === 'editor' ? `/api/mappe/${encodeURIComponent(m.chiave)}/immagine` : `/api/immagini/mappa/${encodeURIComponent(m.chiave)}`;
      await request(app).put(url).set('Content-Type', 'image/svg+xml').send(SVG).expect(via === 'editor' ? 200 : 201);
      expect(riga(k)).toMatchObject({ immagine_chiave: k, larghezza: 777, altezza: 555, ruolo_immagine: 'planimetria-nativa' });
      // un'immagine con l'intestazione leggibile, invece, porta le sue
      await request(app).put(url).set('Content-Type', 'image/png').send(png(64, 48)).expect(via === 'editor' ? 200 : 201);
      expect(riga(k)).toMatchObject({ larghezza: 64, altezza: 48 });
    }
  });

  it('F9 — una mappa nuova dichiara l’asset predefinito solo se esiste; l’esportazione non inventa asset per convenzione', () => {
    const senza = creaMappa(undefined, { nome: 'Senza asset F9', tipo: 'generica' });
    expect(senza.asset).toBeNull();
    expect(riga(interna('Senza asset F9'))).toMatchObject({ asset: null, ruolo_immagine: 'nessuna' });
    salvaImmagine('mappe', 'con-asset-f9', 'image/png', png(8, 8));
    const con = creaMappa(undefined, { nome: 'Con asset F9', tipo: 'generica' });
    expect(con.asset).toBe('mappe/con-asset-f9');
    expect(riga(interna('Con asset F9'))).toMatchObject({ asset: 'mappe/con-asset-f9', ruolo_immagine: 'planimetria-nativa' });
    // l'esportazione porta l'asset dichiarato se esiste, altrimenti null (prima `mappe/<chiave pubblica>` per ogni mappa)
    expect(esportaMappe(senza.chiave).mappe[0]).toMatchObject({ asset: null, assetOriginale: null });
    expect(esportaMappe(con.chiave).mappe[0]).toMatchObject({ asset: 'mappe/con-asset-f9', assetOriginale: 'mappe/con-asset-f9' });
    // una riga di prima con l'asset per convenzione che non esiste: esportata senza
    prepared("UPDATE mappa SET asset = 'mappe/inesistente-f9' WHERE chiave = ?").run(interna('Senza asset F9'));
    expect(esportaMappe(senza.chiave).mappe[0]).toMatchObject({ asset: null, assetOriginale: null });
  });

  it('F5 — rimozione dell’immagine di una mappa con pezzi: 409 senza conferma (niente cambia); con la conferma se ne vanno anche i pezzi', async () => {
    const m = await planimetriaConPezzo('Rimozione F5');
    const r = await request(app).delete(`/api/immagini/mappa/${encodeURIComponent(m.pubblica)}`);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('mappa-con-pezzi');
    expect(pezzi(m.chiave)).toBe(1);
    expect(riga(m.chiave)).toMatchObject({ immagine_chiave: m.chiave, larghezza: 100, altezza: 100 });
    await request(app).delete(`/api/immagini/mappa/${encodeURIComponent(m.pubblica)}?eliminaPezzi=1`).expect(204);
    expect(pezzi(m.chiave)).toBe(0);
    expect(riga(m.chiave)).toMatchObject({ immagine_chiave: null, larghezza: null, altezza: null, ruolo_immagine: 'nessuna' });
  });

  // per ultimo: toglie tutte le immagini caricate delle mappe del database di prova
  it('F5 — rimozione in blocco (ambito mappa, o tutti gli ambiti) con una mappa che ha pezzi: 409 senza conferma; con la conferma i pezzi se ne vanno', async () => {
    const m = await planimetriaConPezzo('Blocco F5');
    const prima = prepared("SELECT COUNT(*) FROM immagine WHERE ambito = 'mappa'").pluck().get() as number;
    for (const query of ['?ambito=mappa', '']) {
      const r = await request(app).delete(`/api/immagini${query}`);
      expect(r.status).toBe(409);
      expect(r.body.error.code).toBe('mappa-con-pezzi');
      expect(r.body.error.details).toMatchObject({ mappe: 1, pezzi: 1, copie: 1 });
    }
    expect(prepared("SELECT COUNT(*) FROM immagine WHERE ambito = 'mappa'").pluck().get()).toBe(prima);
    expect(pezzi(m.chiave)).toBe(1);
    const ok = await request(app).delete('/api/immagini?ambito=mappa&eliminaPezzi=1').expect(200);
    expect(ok.body.data.eliminate).toBe(prima);
    expect(pezzi(m.chiave)).toBe(0);
    expect(riga(m.chiave)).toMatchObject({ immagine_chiave: null, larghezza: null, altezza: null, ruolo_immagine: 'nessuna' });
  });
});
