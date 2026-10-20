// ============================================================
// L2 (2026-10-20) — le Aree del mondo sui dati del pacchetto: percorsi pubblici del Covo dopo lo spostamento sotto Yongen-Jaya,
// ingresso di un quartiere solo in una sua Area
// ============================================================

import request from 'supertest';
import { closeDb, getDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { chiaveMappa, idMappa, sincronizzaPercorsiMappe } from '../services/mappe/percorsiMappe.js';
import { importaMappe } from '../services/mappe/mappeService.js';
import type { AreaDettaglioDto, AreaRiassuntoDto, EsportazioneMappeDto, MappaDto, MappaRiassuntoDto, QuartiereDettaglioDto, QuartiereRiassuntoDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

/** PNG minimo di larghezza×altezza dati (intestazione IHDR valida; il contenuto non viene decodificato). */
const png = (l: number, a: number) => {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(l, 0); ihdr.writeUInt32BE(a, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from([0, 0, 0, 13]), Buffer.from('IHDR'), ihdr, Buffer.alloc(4), Buffer.alloc(4), Buffer.from('IEND'), Buffer.alloc(4)]);
};

/** I percorsi pubblici delle cinque planimetrie del Covo, nell'ordine delle chiavi interne. */
const percorsiCovo = () => prepared("SELECT chiave || ' | ' || nome FROM mappa_percorso WHERE mappa_chiave LIKE 'nativo-rmap-022-1-%' ORDER BY mappa_chiave").pluck().all();
const COVO_DI_PRIMA = [
  'covo-dei-ladri-settore-dingresso | Covo dei Ladri — settore d’ingresso',
  'covo-dei-ladri | Covo dei Ladri',
  'covo-dei-ladri-porzione-occidentale | Covo dei Ladri — porzione occidentale',
  'covo-dei-ladri-porzione-settentrionale | Covo dei Ladri — porzione settentrionale',
  'covo-dei-ladri-inquadratura-orientale | Covo dei Ladri — inquadratura orientale',
];

describe('Aree del mondo (L2)', () => {
  beforeEach(() => { dbDiProva(); });
  afterEach(() => closeDb());

  it('FUN2-2 — il Covo sotto Yongen-Jaya tiene i suoi percorsi pubblici anche quando i percorsi si risincronizzano (import, creazione, eliminazione)', async () => {
    expect(prepared("SELECT genitore_chiave FROM mappa WHERE chiave = 'nativo-rmap-022-1-1'").pluck().get()).toBe('citta-yongen-jaya');
    expect(percorsiCovo()).toEqual(COVO_DI_PRIMA);
    const alias = prepared('SELECT COUNT(*) FROM mappa_alias').pluck().get();
    sincronizzaPercorsiMappe(getDb());
    // la strada del difetto: un import di un pacchetto con un solo ingresso, che risincronizza i percorsi
    await request(app).post('/api/mappe/importa').send({ pacchetto: { versione: 1, mappe: [], ingressi: [{ quartiere: 'yongen-jaya', mappa: 'nativo-rmap-009-2-0', x: 37.46, y: 25.14, zoom: 1 }] }, sovrascrivi: true }).expect(200);
    expect(percorsiCovo()).toEqual(COVO_DI_PRIMA);
    expect(prepared('SELECT COUNT(*) FROM mappa_alias').pluck().get()).toBe(alias);
    expect((await request(app).get('/api/mappe/risolvi/covo-dei-ladri').expect(200)).body.data.mappa).toBe('covo-dei-ladri');
  });

  it('FUN2-1 — l’ingresso di un quartiere sta in una sua Area: una planimetria di un altro quartiere si rifiuta, dalla PUT e dall’import', async () => {
    const put = await request(app).put('/api/compendio/citta/kichijoji/ingresso').send({ mappa: 'nativo-rmap-001-3-0', x: 10, y: 20, zoom: 2 });
    expect([put.status, put.body.error?.code]).toEqual([400, 'area-di-altro-quartiere']);
    const imp = await request(app).post('/api/mappe/importa').send({ pacchetto: { versione: 1, mappe: [], ingressi: [{ quartiere: 'kichijoji', mappa: 'nativo-rmap-001-3-0', x: 10, y: 20, zoom: 2 }] }, sovrascrivi: true });
    expect([imp.status, imp.body.error?.code]).toEqual([400, 'area-di-altro-quartiere']);
    expect(prepared("SELECT COUNT(*) FROM quartiere_ingresso WHERE quartiere_chiave = 'kichijoji'").pluck().get()).toBe(0);
    // una planimetria senza Area (la mappa del quartiere) non è un ingresso; una sua Area sì, e l'ingresso porta l'Area
    const senza = await request(app).put('/api/compendio/citta/kichijoji/ingresso').send({ mappa: 'kichijoji', x: 10, y: 20, zoom: 2 });
    expect([senza.status, senza.body.error?.code]).toEqual([400, 'ingresso-senza-area']);
    const ok = await request(app).put('/api/compendio/citta/kichijoji/ingresso').send({ mappa: 'nativo-rmap-005-1-0', x: 10, y: 20, zoom: 2 }).expect(200);
    expect(ok.body.data).toMatchObject({ x: 10, y: 20, zoom: 2, area: { slug: 'quartiere-dello-shopping', nome: 'Quartiere dello shopping' } });
  });

  it('3/4 — la casa di ogni mappa: La città, il quartiere, l’Area (con la versione se non è la predefinita), il visore per Palazzi e Memento', async () => {
    const casa = async (k: string) => ((await request(app).get(`/api/mappe/risolvi/${encodeURIComponent(k)}`).expect(200)).body.data as { casa: string }).casa;
    expect(await casa('tokyo')).toBe('/guida/citta');
    expect(await casa('citta-shibuya')).toBe('/guida/citta/shibuya');
    expect(await casa('nativo-rmap-001-2-0')).toBe('/guida/citta/shibuya/sottopasso');
    expect(await casa('nativo-rmap-001-2-1')).toBe('/guida/citta/shibuya/sottopasso?planimetria=shibuya-sottopasso-speciale');
    expect(await casa('nativo-rmap-152-1-0')).toMatch(/^\/guida\/mappe\//);
    expect(await casa('citta-mementos')).toMatch(/^\/guida\/mappe\//);
    expect(await casa('nativo-rmap-150-3-0')).toBe('/guida/citta/tokyo/area-riservata-allo-staff');
    expect(await casa('nativo-rmap-150-3-1')).toMatch(/^\/guida\/citta\/tokyo\/area-riservata-allo-staff\?planimetria=/);
    // gli indirizzi vecchi: l'alias del Sottopasso porta alla versione a cui puntava, il Covo alla sua Area con la planimetria completa
    expect(await casa('shibuya-sottopasso')).toBe('/guida/citta/shibuya/sottopasso?planimetria=shibuya-sottopasso-speciale');
    expect(await casa('covo-dei-ladri')).toBe('/guida/citta/yongen-jaya/covo-dei-ladri?planimetria=covo-dei-ladri');
    // l'albero e il dettaglio portano la stessa casa e l'Area con la versione; il percorso chiude col nome dell'Area
    const speciale = (await request(app).get('/api/mappe/shibuya-sottopasso-speciale').expect(200)).body.data as MappaDto;
    expect(speciale.area).toMatchObject({ chiave: 'citta/shibuya/sottopasso', contenitore: { tipo: 'quartiere', chiave: 'shibuya', nome: 'Shibuya' }, versioneEtichetta: 'planimetria completa', versioneOrdine: 1, predefinita: false });
    expect(speciale.percorso.map((p) => p.nome)).toEqual(['Tokyo', 'Shibuya', 'Sottopasso']);
    const albero = (await request(app).get('/api/mappe/albero').expect(200)).body.data as MappaRiassuntoDto[];
    expect(albero.find((m) => m.chiave === 'shibuya-sottopasso-speciale')?.casa).toBe(speciale.casa);
  });

  it('5 — il quartiere: le Aree in ordine con predefinite, passaggi sull’illustrazione e ingresso; Kichijoji con un’Area senza passaggio', async () => {
    const s = (await request(app).get('/api/compendio/citta/shibuya').expect(200)).body.data as QuartiereDettaglioDto;
    expect(s.aree.map((a) => `${a.ordine}:${a.slug}`)).toEqual(['0:piazza-della-stazione', '100:sottopasso', '200:central-street', '300:centro-comm-sotterraneo', '400:tornello-della-linea-ginza', '500:banchina-della-metropolitana']);
    expect(Object.fromEntries(s.aree.filter((a) => a.passaggio).map((a) => [a.slug, a.passaggio!.spillo]))).toEqual({ 'piazza-della-stazione': 1632, 'central-street': 1631, 'banchina-della-metropolitana': 1630 });
    expect(s.aree.filter((a) => a.ingresso).map((a) => a.slug)).toEqual(['central-street']);
    expect(s.ingresso).toMatchObject({ x: 38.29, y: 32.67, zoom: 1, area: { slug: 'central-street', nome: 'Central Street' } });
    const sottopasso = s.aree.find((a) => a.slug === 'sottopasso')!;
    expect(sottopasso).toMatchObject({ numeroPlanimetrie: 2, predefinita: 'shibuya-sottopasso-nativo-rmap-001-2-0', nomeRivisto: true, origine: 'utente', daVerificare: false, casa: '/guida/citta/shibuya/sottopasso' });
    const k = (await request(app).get('/api/compendio/citta/kichijoji').expect(200)).body.data as QuartiereDettaglioDto;
    expect(k.aree.map((a) => [a.slug, a.passaggio])).toEqual([['quartiere-dello-shopping', null]]);
    const elenco = (await request(app).get('/api/compendio/citta').expect(200)).body.data as QuartiereRiassuntoDto[];
    expect(Object.fromEntries(elenco.filter((q) => ['shibuya', 'shujin-academy', 'yongen-jaya', 'ikebukuro'].includes(q.chiave)).map((q) => [q.chiave, q.aree]))).toEqual({ shibuya: 6, 'shujin-academy': 8, 'yongen-jaya': 3, ikebukuro: 0 });
    // l'elenco delle Aree di un contenitore: lo stesso del quartiere, e per la città le Aree agganciate a Tokyo (lo staff, da verificare)
    const diShibuya = (await request(app).get('/api/aree/citta/shibuya').expect(200)).body.data as AreaRiassuntoDto[];
    expect(diShibuya).toEqual(s.aree);
    const diTokyo = (await request(app).get('/api/aree/citta/tokyo').expect(200)).body.data as AreaRiassuntoDto[];
    expect(diTokyo.map((a) => [a.contenitore.tipo, a.daVerificare, a.casa.startsWith('/guida/citta/tokyo/')])).toEqual([['citta', true, true]]);
    expect((await request(app).get('/api/aree/citta/nessuno')).body.error.code).toBe('quartiere-non-trovato');
  });

  it('6 — la pagina di un’Area: versioni con pin, elementi, vicine; quartiere o Area inesistenti 404', async () => {
    const a = (await request(app).get('/api/aree/citta/shibuya/sottopasso').expect(200)).body.data as AreaDettaglioDto;
    expect(a.planimetrie.map((p) => [p.ordine, p.etichetta, p.predefinita, p.numeroSpilli])).toEqual([[0, 'inquadratura orientale', true, 16], [1, 'planimetria completa', false, 0]]);
    expect(a.vicine.length).toBeGreaterThan(0);
    expect(a.vicine.every((v) => v.casa.startsWith('/guida/'))).toBe(true);
    const cs = (await request(app).get('/api/aree/citta/shibuya/central-street').expect(200)).body.data as AreaDettaglioDto;
    expect(cs.elementi.length).toBeGreaterThan(0);
    expect(cs.elementi.every((e) => ['luogo', 'negozio', 'attivita', 'confidente'].includes(e.tipo) && e.planimetria === 'shibuya-central-street')).toBe(true);
    expect((await request(app).get('/api/aree/citta/nessuno/sottopasso')).body.error.code).toBe('quartiere-non-trovato');
    expect((await request(app).get('/api/aree/citta/shibuya/nessuna')).body.error.code).toBe('area-non-trovata');
    expect((await request(app).get('/api/aree/citta/mementos/x')).status).toBe(404);
  });

  it('7 — creare un’Area: con l’immagine nasce l’Area con la sua planimetria e il passaggio; un errore non lascia niente; slug riservato e collisione', async () => {
    const prima = { aree: prepared('SELECT COUNT(*) FROM area').pluck().get(), mappe: prepared('SELECT COUNT(*) FROM mappa').pluck().get(), spilli: prepared('SELECT COUNT(*) FROM spillo').pluck().get() };
    const r = await request(app).post('/api/aree/citta/ikebukuro?nome=Stazione%20Est&x=40&y=60&etichetta=giorno').set('Content-Type', 'image/png').send(png(320, 200)).expect(201);
    const a = r.body.data as AreaDettaglioDto;
    expect(a).toMatchObject({ chiave: 'citta/ikebukuro/stazione-est', slug: 'stazione-est', nome: 'Stazione Est', ordine: 0, origine: 'utente', numeroPlanimetrie: 1, casa: '/guida/citta/ikebukuro/stazione-est', passaggio: { x: 40, y: 60 } });
    expect(a.planimetrie[0]).toMatchObject({ etichetta: 'giorno', predefinita: true, ruoloImmagine: 'planimetria-nativa' });
    expect(prepared('SELECT tipo, nome, riferimento_tipo FROM spillo WHERE id = ?').get(a.passaggio!.spillo)).toEqual({ tipo: 'passaggio', nome: 'Stazione Est', riferimento_tipo: 'mappa' });
    // un'immagine non valida o un nome vuoto: 400, e niente di scritto
    expect((await request(app).post('/api/aree/citta/ikebukuro?nome=Rotta').set('Content-Type', 'image/png').send(Buffer.alloc(0))).status).toBe(400);
    expect((await request(app).post('/api/aree/citta/ikebukuro?nome=Rotta').set('Content-Type', 'image/bmp').send(png(10, 10))).body.error?.code).toMatch(/formato-non-ammesso|validation-error|corpo-non-immagine|immagine-vuota/);
    expect((await request(app).post('/api/aree/citta/ikebukuro?nome=%20%20').set('Content-Type', 'image/png').send(png(10, 10))).body.error.code).toBe('nome-vuoto');
    expect((await request(app).post('/api/aree/citta/ikebukuro?nome=Ordine').set('Content-Type', 'image/png').send(png(10, 10))).body.error.code).toBe('slug-riservato');
    expect({ aree: prepared('SELECT COUNT(*) FROM area').pluck().get(), mappe: prepared('SELECT COUNT(*) FROM mappa').pluck().get(), spilli: prepared('SELECT COUNT(*) FROM spillo').pluck().get() })
      .toEqual({ aree: (prima.aree as number) + 1, mappe: (prima.mappe as number) + 1, spilli: (prima.spilli as number) + 1 });
    // lo stesso nome: slug `-2`, in fondo al quartiere
    const due = (await request(app).post('/api/aree/citta/ikebukuro?nome=Stazione%20Est').set('Content-Type', 'image/png').send(png(32, 20)).expect(201)).body.data as AreaDettaglioDto;
    expect([due.slug, due.ordine, due.passaggio]).toEqual(['stazione-est-2', 100, null]);
  });

  it('8 — le versioni: aggiunta in coda, predefinita, ordine ed etichette; l’ultima non si elimina; quella d’ingresso con conferma; la predefinita passa alla successiva', async () => {
    const piu = (await request(app).post('/api/aree/citta/shibuya/central-street/planimetrie?etichetta=sera&predefinita=1').set('Content-Type', 'image/png').send(png(64, 64)).expect(201)).body.data as AreaDettaglioDto;
    expect(piu.planimetrie.map((p) => [p.ordine, p.etichetta, p.predefinita])).toEqual([[0, null, false], [1, 'sera', true]]);
    const [prima, seconda] = piu.planimetrie.map((p) => p.chiave);
    const scambiate = (await request(app).put('/api/aree/citta/shibuya/central-street/planimetrie').send({ ordine: [seconda, prima], etichette: { [prima]: 'giorno' } }).expect(200)).body.data as AreaDettaglioDto;
    expect(scambiate.planimetrie.map((p) => [p.chiave, p.ordine, p.etichetta])).toEqual([[seconda, 0, 'sera'], [prima, 1, 'giorno']]);
    expect((await request(app).put('/api/aree/citta/shibuya/central-street/planimetrie').send({ ordine: [prima] })).body.error.code).toBe('ordine-non-valido');
    // la planimetria dell'ingresso di Shibuya: 409 senza conferma; la predefinita (la «sera») eliminata passa alla successiva
    const ingresso = await request(app).delete(`/api/mappe/${prima}`);
    expect([ingresso.status, ingresso.body.error.code]).toEqual([409, 'planimetria-d-ingresso']);
    await request(app).delete(`/api/mappe/${seconda}`).expect(204);
    const dopo = (await request(app).get('/api/aree/citta/shibuya/central-street').expect(200)).body.data as AreaDettaglioDto;
    expect(dopo.planimetrie.map((p) => [p.chiave, p.ordine, p.predefinita])).toEqual([[prima, 0, true]]);
    const ultima = await request(app).delete(`/api/mappe/${prima}?conferma=1`);
    expect([ultima.status, ultima.body.error.code]).toEqual([409, 'ultima-planimetria']);
  });

  it('9 — correggere un’Area: nome (lo slug resta) e predefinita; la prima correzione di un’Area della guida conserva i valori, «Ripristina» li rimette; un’Area dell’utente no', async () => {
    const r = (await request(app).put('/api/aree/citta/shibuya/central-street').send({ nome: 'Center Gai' }).expect(200)).body.data as AreaDettaglioDto;
    expect(r).toMatchObject({ slug: 'central-street', nome: 'Center Gai', nomeRivisto: true, modificata: true, casa: '/guida/citta/shibuya/central-street' });
    expect(JSON.parse(prepared("SELECT seed_json FROM area WHERE chiave = 'citta/shibuya/central-street'").pluck().get() as string)).toMatchObject({ nome: 'Central Street', nome_rivisto: 0 });
    expect((await request(app).put('/api/aree/citta/shibuya/central-street').send({ predefinita: 'shibuya-sottopasso-speciale' })).body.error.code).toBe('planimetria-di-altra-area');
    expect((await request(app).put('/api/aree/citta/shibuya/central-street').send({ nome: ' ' })).body.error.code).toBe('nome-vuoto');
    const rimessa = (await request(app).post('/api/aree/citta/shibuya/central-street/ripristina').expect(200)).body.data as AreaDettaglioDto;
    expect(rimessa).toMatchObject({ nome: 'Central Street', nomeRivisto: false, modificata: false });
    expect((await request(app).post('/api/aree/citta/shibuya/central-street/ripristina')).body.error.code).toBe('area-non-modificata');
    expect((await request(app).post('/api/aree/citta/shibuya/sottopasso/ripristina')).body.error.code).toBe('area-dell-utente');
    // il riordino vuole tutte le Aree, una volta
    const ordine = ['sottopasso', 'piazza-della-stazione', 'central-street', 'centro-comm-sotterraneo', 'tornello-della-linea-ginza', 'banchina-della-metropolitana'];
    expect(((await request(app).put('/api/aree/citta/shibuya/ordine').send({ slug: ordine }).expect(200)).body.data as AreaRiassuntoDto[]).map((a) => a.slug)).toEqual(ordine);
    expect((await request(app).put('/api/aree/citta/shibuya/ordine').send({ slug: ordine.slice(1) })).body.error.code).toBe('ordine-non-valido');
  });

  it('10 — eliminare un’Area con contenuti chiede conferma; con la conferma va nel cestino con planimetrie, passaggi e ingresso; dal cestino torna com’era', async () => {
    const fotografia = () => JSON.stringify({
      area: prepared("SELECT * FROM area WHERE chiave = 'citta/shibuya/central-street'").all(),
      mappe: prepared("SELECT chiave, area_chiave, versione_ordine, genitore_chiave FROM mappa WHERE area_chiave = 'citta/shibuya/central-street' OR chiave = 'nativo-rmap-001-3-0'").all(),
      spilli: prepared("SELECT id, mappa_chiave, x, y, nome, riferimento_tipo, riferimento_chiave FROM spillo WHERE mappa_chiave = 'nativo-rmap-001-3-0' OR riferimento_chiave = 'nativo-rmap-001-3-0' ORDER BY id").all(),
      ingresso: prepared("SELECT * FROM quartiere_ingresso WHERE quartiere_chiave = 'shibuya'").all(),
      percorso: prepared("SELECT * FROM mappa_percorso WHERE mappa_chiave = 'nativo-rmap-001-3-0'").all(),
    });
    const prima = fotografia();
    const no = await request(app).delete('/api/aree/citta/shibuya/central-street');
    expect([no.status, no.body.error.code]).toEqual([409, 'area-con-contenuti']);
    expect(no.body.error.details).toMatchObject({ planimetrie: 1, ingresso: true });
    expect(no.body.error.details.pin).toBeGreaterThan(0);
    expect(no.body.error.details.passaggi).toBeGreaterThan(0);
    expect(fotografia()).toBe(prima);
    await request(app).delete('/api/aree/citta/shibuya/central-street?conferma=1').expect(204);
    expect(prepared("SELECT COUNT(*) FROM area WHERE chiave = 'citta/shibuya/central-street'").pluck().get()).toBe(0);
    expect(prepared("SELECT COUNT(*) FROM mappa WHERE chiave = 'nativo-rmap-001-3-0'").pluck().get()).toBe(0);
    expect(prepared("SELECT COUNT(*) FROM spillo WHERE riferimento_chiave = 'nativo-rmap-001-3-0'").pluck().get()).toBe(0);
    expect(prepared("SELECT COUNT(*) FROM quartiere_ingresso WHERE quartiere_chiave = 'shibuya'").pluck().get()).toBe(0);
    const voce = prepared("SELECT id, tipo, nome, contesto FROM cestino WHERE tipo = 'area-fisica'").get() as { id: number; tipo: string; nome: string; contesto: string };
    expect(voce).toMatchObject({ tipo: 'area-fisica', nome: 'Central Street', contesto: 'Shibuya' });
    await request(app).post(`/api/impostazioni/cestino/${voce.id}/ripristina`).expect(200);
    expect(fotografia()).toBe(prima);
  });

  it('staff — un’Area di Tokyo da verificare: «Tieni» la tiene; «Rimuovi» la mette nel cestino, e da lì torna', async () => {
    const staff = (await request(app).get('/api/aree/citta/tokyo/area-riservata-allo-staff').expect(200)).body.data as AreaDettaglioDto;
    expect(staff).toMatchObject({ contenitore: { tipo: 'citta', chiave: 'tokyo', nome: 'Tokyo' }, daVerificare: true, numeroPlanimetrie: 2, origine: 'seed' });
    const tenuta = (await request(app).put('/api/aree/citta/tokyo/area-riservata-allo-staff').send({ daVerificare: false }).expect(200)).body.data as AreaDettaglioDto;
    expect(tenuta.daVerificare).toBe(false);
    expect((await request(app).put('/api/aree/citta/tokyo/area-riservata-allo-staff').send({ daVerificare: true })).status).toBe(400);
    // «Rimuovi»: senza pin né passaggi né ingresso non serve conferma
    await request(app).delete('/api/aree/citta/tokyo/area-riservata-allo-staff').expect(204);
    expect(prepared("SELECT COUNT(*) FROM mappa WHERE chiave LIKE 'nativo-rmap-150-3-%'").pluck().get()).toBe(0);
    const voce = prepared("SELECT id FROM cestino WHERE tipo = 'area-fisica'").pluck().get() as number;
    await request(app).post(`/api/impostazioni/cestino/${voce}/ripristina`).expect(200);
    expect((await request(app).get('/api/aree/citta/tokyo/area-riservata-allo-staff').expect(200)).body.data).toMatchObject({ daVerificare: false, numeroPlanimetrie: 2 });
  });

  it('11 — dall’editor una mappa `luogo` o `area` nel mondo è 409 usa-aggiungi-area; da L3 anche nei Palazzi (qualunque tipo, R3-26); le generiche del mondo restano ammesse', async () => {
    const mondo = await request(app).post('/api/mappe').send({ nome: 'Zona sciolta', tipo: 'luogo', genitore: 'shibuya' });
    expect([mondo.status, mondo.body.error.code]).toEqual([409, 'usa-aggiungi-area']);
    expect((await request(app).post('/api/mappe').send({ nome: 'Zona sotto Tokyo', tipo: 'area', genitore: 'tokyo' })).status).toBe(409);
    const palazzo = await request(app).post('/api/mappe').send({ nome: 'Stanza di prova L2', tipo: 'area', genitore: 'dungeon-kamoshida' });
    expect([palazzo.status, palazzo.body.error.code]).toEqual([409, 'usa-aggiungi-area']);
    expect((await request(app).post('/api/mappe').send({ nome: 'Appunti nel Palazzo', tipo: 'generica', genitore: 'dungeon-kamoshida' })).status).toBe(409);
    // i Memento no (R3-12)
    expect((await request(app).post('/api/mappe').send({ nome: 'Appunti nei Memento', tipo: 'generica', genitore: 'dungeon-mementos' })).status).toBe(201);
    await request(app).post('/api/mappe').send({ nome: 'Appunti L2', tipo: 'generica', genitore: 'shibuya' }).expect(201);
  });

  it('R1 (giro 2) — l’indice delle mappe dice se l’Area di una planimetria è da verificare (l’area staff di Tokyo), come la pagina dell’Area', async () => {
    const albero = (await request(app).get('/api/mappe/albero').expect(200)).body.data as MappaRiassuntoDto[];
    const conArea = albero.filter((m) => m.area);
    expect(conArea.length).toBeGreaterThan(0);
    const staff = conArea.filter((m) => m.area!.chiave === 'citta/tokyo/area-riservata-allo-staff');
    expect(staff.length).toBe(2);
    expect(staff.every((m) => m.area!.daVerificare === true)).toBe(true);
    expect(conArea.filter((m) => m.area!.chiave !== 'citta/tokyo/area-riservata-allo-staff').every((m) => m.area!.daVerificare === false)).toBe(true);
    // «Tieni»: nell'indice il segno se ne va
    await request(app).put('/api/aree/citta/tokyo/area-riservata-allo-staff').send({ daVerificare: false }).expect(200);
    const dopo = (await request(app).get('/api/mappe/albero').expect(200)).body.data as MappaRiassuntoDto[];
    expect(dopo.filter((m) => m.area?.chiave === 'citta/tokyo/area-riservata-allo-staff').every((m) => m.area!.daVerificare === false)).toBe(true);
    // e il dettaglio di una sua planimetria dice lo stesso
    const una = staff[0].chiave;
    expect(((await request(app).get(`/api/mappe/${encodeURIComponent(una)}`).expect(200)).body.data as MappaDto).area?.daVerificare).toBe(false);
  });

  it('R3 (giro 2), R2-28 — un’Area corretta dall’utente resta com’è dopo un import senza «sovrascrivi», dall’app e dal seed; «Ripristina» la riporta', async () => {
    // un'Area della guida (seed) di Shibuya, che l'utente corregge
    const { chiave, slug } = prepared("SELECT chiave, slug FROM area WHERE quartiere_chiave = 'shibuya' AND origine = 'seed' AND seed_json IS NULL ORDER BY ordine LIMIT 1").get() as { chiave: string; slug: string };
    const pacchetto = (await request(app).get('/api/mappe/esporta?radice=shibuya').expect(200)).body.data as EsportazioneMappeDto;
    const nomeGuida = pacchetto.aree!.find((a) => a.slug === slug)!.nome;
    await request(app).put(`/api/aree/citta/shibuya/${slug}`).send({ nome: 'Nome dato dall’utente' }).expect(200);
    const corretta = () => prepared('SELECT nome, nome_rivisto, origine, seed_json IS NOT NULL AS corretta, planimetria_predefinita FROM area WHERE chiave = ?').get(chiave);
    const prima = corretta();
    expect(prima).toMatchObject({ nome: 'Nome dato dall’utente', nome_rivisto: 1, origine: 'seed', corretta: 1 });
    // dall'app, senza «sovrascrivi»
    await request(app).post('/api/mappe/importa').send({ pacchetto }).expect(200);
    expect(corretta()).toEqual(prima);
    // dal seed (il pacchetto del seed sopra un'Area del seed corretta dall'utente)
    importaMappe(structuredClone(pacchetto), { origine: 'seed' });
    expect(corretta()).toEqual(prima);
    // «Ripristina» rimette i valori della guida
    await request(app).post(`/api/aree/citta/shibuya/${slug}/ripristina`).expect(200);
    expect(prepared('SELECT nome FROM area WHERE chiave = ?').pluck().get(chiave)).toBe(nomeGuida);
  });

  it('FUN2-8 (giro 2) — dall’editor una mappa senza Area non entra nel mondo: spostarla sotto un quartiere o renderla `luogo`/`area` lì è 409 usa-aggiungi-area; nei Memento e fra le generiche niente cambia', async () => {
    // una mappa sciolta nei Memento (ammessa), resa `luogo` lì
    const sciolta = (await request(app).post('/api/mappe').send({ nome: 'Sciolta di prova', tipo: 'generica', genitore: 'dungeon-mementos' }).expect(201)).body.data as MappaDto;
    await request(app).put(`/api/mappe/${encodeURIComponent(sciolta.chiave)}`).send({ tipo: 'luogo' }).expect(200);
    const sposta = await request(app).put(`/api/mappe/${encodeURIComponent(sciolta.chiave)}`).send({ genitore: 'citta-kichijoji' });
    expect([sposta.status, sposta.body.error?.code]).toEqual([409, 'usa-aggiungi-area']);
    expect(prepared('SELECT genitore_chiave FROM mappa WHERE chiave = ?').pluck().get(idMappa(sciolta.chiave))).toBe('dungeon-mementos');
    expect((await request(app).put(`/api/mappe/${encodeURIComponent(sciolta.chiave)}`).send({ genitore: 'tokyo' })).status).toBe(409);
    // una generica del mondo resta ammessa, ma non diventa un `luogo` sciolto
    const generica = (await request(app).post('/api/mappe').send({ nome: 'Appunti di Kichijoji', tipo: 'generica', genitore: 'citta-kichijoji' }).expect(201)).body.data as MappaDto;
    const resa = await request(app).put(`/api/mappe/${encodeURIComponent(generica.chiave)}`).send({ tipo: 'area' });
    expect([resa.status, resa.body.error?.code]).toEqual([409, 'usa-aggiungi-area']);
    await request(app).put(`/api/mappe/${encodeURIComponent(generica.chiave)}`).send({ nome: 'Appunti rinominati' }).expect(200);
    // nei Memento lo spostamento resta com'era
    const altra = (await request(app).post('/api/mappe').send({ nome: 'Altra dei Memento', tipo: 'generica', genitore: 'dungeon-mementos' }).expect(201)).body.data as MappaDto;
    await request(app).put(`/api/mappe/${encodeURIComponent(sciolta.chiave)}`).send({ genitore: altra.chiave }).expect(200);
    // nessuna planimetria del mondo è finita fra le «da collocare»
    expect(((await request(app).get('/api/aree/da-collocare').expect(200)).body.data as Array<{ chiave: string }>).some((m) => [sciolta.chiave, generica.chiave].includes(m.chiave))).toBe(false);
  });

  it('FUN2-9 (giro 2) — le planimetrie da collocare dicono la chiave del loro genitore, perché «Colloca» proponga il quartiere giusto', async () => {
    // una planimetria di Shibuya tolta dalla sua Area finisce fra le «da collocare»
    const pianta = prepared("SELECT chiave FROM mappa WHERE area_chiave = 'citta/shibuya/central-street' ORDER BY versione_ordine LIMIT 1").pluck().get() as string;
    getDb().pragma('foreign_keys = OFF');
    prepared('UPDATE area SET planimetria_predefinita = NULL WHERE chiave = ?').run('citta/shibuya/central-street');
    prepared('UPDATE mappa SET area_chiave = NULL, versione_ordine = NULL, versione_etichetta = NULL WHERE chiave = ?').run(pianta);
    getDb().pragma('foreign_keys = ON');
    const elenco = (await request(app).get('/api/aree/da-collocare').expect(200)).body.data as Array<{ chiave: string; genitore?: string | null; genitoreNome: string | null }>;
    const voce = elenco.find((m) => m.chiave === chiaveMappa(pianta))!;
    expect(voce).toMatchObject({ genitore: chiaveMappa(prepared('SELECT genitore_chiave FROM mappa WHERE chiave = ?').pluck().get(pianta) as string), genitoreNome: expect.any(String) });
    // la chiave è quella con cui il quartiere si riconosce nella città (`mappaChiave`)
    const quartieri = (await request(app).get('/api/compendio/citta').expect(200)).body.data as QuartiereRiassuntoDto[];
    expect(quartieri.find((q) => q.mappaChiave === voce.genitore)?.chiave).toBe('shibuya');
  });

  it('12 — pacchetto delle mappe: le Aree viaggiano (esporta → importa sulla stessa istanza dopo averle tolte); un pacchetto senza Aree le riceve dalla regola', async () => {
    const pacchetto = (await request(app).get('/api/mappe/esporta?radice=shibuya').expect(200)).body.data as EsportazioneMappeDto;
    expect(pacchetto.aree?.map((a) => a.slug).sort()).toEqual(['banchina-della-metropolitana', 'central-street', 'centro-comm-sotterraneo', 'piazza-della-stazione', 'sottopasso', 'tornello-della-linea-ginza']);
    expect(pacchetto.mappe.find((m) => m.chiave === 'shibuya-sottopasso-speciale')).toMatchObject({ area: 'citta/shibuya/sottopasso', versione: { etichetta: 'planimetria completa', ordine: 1 } });
    const prima = JSON.stringify(prepared("SELECT a.chiave, a.nome, a.ordine, a.planimetria_predefinita, m.chiave AS mappa, m.versione_ordine, m.versione_etichetta FROM area a JOIN mappa m ON m.area_chiave = a.chiave WHERE a.quartiere_chiave = 'shibuya' ORDER BY m.chiave").all());
    // le Aree di Shibuya tolte (senza toccare le mappe), poi l'import col pacchetto: tornano uguali
    getDb().pragma('foreign_keys = OFF');
    prepared("UPDATE mappa SET area_chiave = NULL, versione_ordine = NULL, versione_etichetta = NULL WHERE area_chiave LIKE 'citta/shibuya/%'").run();
    prepared("UPDATE quartiere_ingresso SET area_chiave = NULL WHERE quartiere_chiave = 'shibuya'").run();
    prepared("DELETE FROM area WHERE quartiere_chiave = 'shibuya'").run();
    getDb().pragma('foreign_keys = ON');
    await request(app).post('/api/mappe/importa').send({ pacchetto, sovrascrivi: true }).expect(200);
    expect(JSON.stringify(prepared("SELECT a.chiave, a.nome, a.ordine, a.planimetria_predefinita, m.chiave AS mappa, m.versione_ordine, m.versione_etichetta FROM area a JOIN mappa m ON m.area_chiave = a.chiave WHERE a.quartiere_chiave = 'shibuya' ORDER BY m.chiave").all())).toBe(prima);
    // un pacchetto di prima (senza `aree`): le planimetrie del mondo ricevono un'Area con la regola della 109
    const { aree: _a, ...diPrima } = pacchetto;
    getDb().pragma('foreign_keys = OFF');
    prepared("UPDATE mappa SET area_chiave = NULL, versione_ordine = NULL, versione_etichetta = NULL WHERE area_chiave LIKE 'citta/shibuya/%'").run();
    prepared("DELETE FROM area WHERE quartiere_chiave = 'shibuya'").run();
    getDb().pragma('foreign_keys = ON');
    await request(app).post('/api/mappe/importa').send({ pacchetto: { ...diPrima, mappe: diPrima.mappe.map(({ area: _x, versione: _v, ...m }) => m) }, sovrascrivi: true }).expect(200);
    expect(prepared("SELECT COUNT(*) FROM mappa m JOIN mappa g ON g.chiave = m.genitore_chiave WHERE g.chiave = 'citta-shibuya' AND m.tipo IN ('luogo', 'area') AND m.area_chiave IS NULL").pluck().get()).toBe(0);
    expect(prepared("SELECT COUNT(*) FROM area WHERE quartiere_chiave = 'shibuya'").pluck().get()).toBe(6);
  });

  it('FUN2-3 — un corpo che non è un’immagine (testo dichiarato image/png) è 400 formato-non-ammesso, e non si scrive niente', async () => {
    const conta = () => [prepared('SELECT COUNT(*) FROM area').pluck().get(), prepared('SELECT COUNT(*) FROM mappa').pluck().get(), prepared('SELECT COUNT(*) FROM immagine').pluck().get()];
    const prima = conta();
    const finto = Buffer.from('non sono una immagine');
    const crea = await request(app).post('/api/aree/citta/kichijoji?nome=Finta').set('Content-Type', 'image/png').send(finto);
    expect([crea.status, crea.body.error?.code]).toEqual([400, 'formato-non-ammesso']);
    const aggiungi = await request(app).post('/api/aree/citta/kichijoji/quartiere-dello-shopping/planimetrie').set('Content-Type', 'image/jpeg').send(finto);
    expect([aggiungi.status, aggiungi.body.error?.code]).toEqual([400, 'formato-non-ammesso']);
    // anche le altre strade che salvano un'immagine
    expect((await request(app).put('/api/immagini/altro/finta').set('Content-Type', 'image/webp').send(finto)).body.error?.code).toBe('formato-non-ammesso');
    expect(conta()).toEqual(prima);
    // un SVG vero passa; un PNG dichiarato JPEG (l'estensione sbagliata) si salva come PNG
    await request(app).put('/api/immagini/altro/vera-svg').set('Content-Type', 'image/svg+xml').send(Buffer.from('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>')).expect(201);
    expect((await request(app).put('/api/immagini/altro/png-come-jpg').set('Content-Type', 'image/jpeg').send(png(4, 4)).expect(201)).body.data.mime).toBe('image/png');
  });

  it('FUN2-4 — il messaggio della conferma dice «1 planimetria, 1 pin, 1 passaggio», al singolare', async () => {
    const a = (await request(app).post('/api/aree/citta/ikebukuro?nome=Uno%20solo&x=10&y=10').set('Content-Type', 'image/png').send(png(50, 50)).expect(201)).body.data as AreaDettaglioDto;
    await request(app).post(`/api/mappe/${encodeURIComponent(a.planimetrie[0].chiave)}/spilli`).send({ tipo: 'nota', nome: 'Una nota', x: 5, y: 5 }).expect(201);
    const no = await request(app).delete('/api/aree/citta/ikebukuro/uno-solo');
    expect(no.body.error.details).toMatchObject({ planimetrie: 1, pin: 1, passaggi: 1, ingresso: false });
    expect(no.body.error.message).toBe('L’area «Uno solo» ha 1 planimetria, 1 pin e 1 passaggio che porta qui: eliminandola va tutto nel cestino.');
  });

  it('13 — l’ingresso col corpo nuovo { area } e con quello di prima { mappa }; un’Area inesistente è 404', async () => {
    const nuovo = (await request(app).put('/api/compendio/citta/shibuya/ingresso').send({ area: 'piazza-della-stazione', x: 50, y: 50, zoom: 2 }).expect(200)).body.data;
    expect(nuovo).toMatchObject({ mappa: 'shibuya-piazza-della-stazione', x: 50, y: 50, zoom: 2, area: { slug: 'piazza-della-stazione', nome: 'Piazza della stazione' } });
    const vecchio = (await request(app).put('/api/compendio/citta/shibuya/ingresso').send({ mappa: 'shibuya-central-street', x: 38.29, y: 32.67, zoom: 1 }).expect(200)).body.data;
    expect(vecchio.area).toEqual({ slug: 'central-street', nome: 'Central Street' });
    expect((await request(app).put('/api/compendio/citta/shibuya/ingresso').send({ area: 'nessuna', x: 1, y: 1, zoom: 1 })).body.error.code).toBe('area-non-trovata');
    expect((await request(app).put('/api/compendio/citta/shibuya/ingresso').send({ x: 1, y: 1, zoom: 1 })).status).toBe(400);
    expect((await request(app).put('/api/compendio/citta/shibuya/ingresso').send({ area: 'sottopasso', mappa: 'shibuya-central-street', x: 1, y: 1, zoom: 1 })).status).toBe(400);
  });
});
