// ============================================================
// L3 (2026-10-20) — i Palazzi con le Aree: scheda, legami infiltrazione ↔ area, case, rotte delle Aree con il contenitore `dungeon`,
// pacchetto, campo «Infiltrazioni» del diario e voci «da rivedere» (lotti/L3/modifiche.md §6.1, punti 2–9), sui dati del pacchetto
// iniziale migrati alla 110 (che lì crea le aree ma non tocca il diario, base di una generazione precedente: le proposte di G-022 si
// provano nel test della migrazione)
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { esportaMappe, importaMappe } from '../services/mappe/mappeService.js';
import { chiaveMappa, idMappa } from '../services/mappe/percorsiMappe.js';
import type { AreaDettaglioDto, AreaDungeonDto, AreaRiassuntoDto, AzionePercorsoDto, DungeonDettaglioDto, VoceCestinoDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

/** PNG minimo di larghezza×altezza (intestazione IHDR valida; il contenuto non viene decodificato). */
const png = (l: number, a: number) => {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(l, 0); ihdr.writeUInt32BE(a, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from([0, 0, 0, 13]), Buffer.from('IHDR'), ihdr, Buffer.alloc(4), Buffer.alloc(4), Buffer.from('IEND'), Buffer.alloc(4)]);
};
/** La scheda di un Palazzo (con la partita, se data). */
const scheda = async (k: string, partita?: number) => (await request(app).get(`/api/compendio/dungeon/${k}${partita ? `?partita=${partita}` : ''}`).expect(200)).body.data as DungeonDettaglioDto;
/** Le Aree toccate da un'infiltrazione (chiavi, in ordine). */
const areeDi = (inf: string) => prepared('SELECT area_chiave FROM infiltrazione_area WHERE infiltrazione_chiave = ? ORDER BY ordine').pluck().all(inf) as string[];
/** Una voce della giornata com'è nella risposta del giorno. */
const voce = async (data: string, uid: string, partita?: number) =>
  ((await request(app).get(`/api/compendio/percorso/${data}${partita ? `?partita=${partita}` : ''}`).expect(200)).body.data.azioni as AzionePercorsoDto[]).find((v) => v.uid === uid)!;
/** Le colonne di una voce che nessun gesto sull'insieme d'infiltrazioni deve toccare (l'impronta della voce, §6.1.9). */
const improntaVoce = (uid: string) => JSON.stringify(prepared(`SELECT uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo,
  rango_atteso, produce_json, indice_guida, created_at, updated_at FROM voce_giornata WHERE uid = ?`).get(uid));
/** Crea una voce di Palazzo nel giorno dato e ne restituisce l'uid. */
const nuovaVoce = async (data: string, azione: string, palazzo: string) =>
  ((await request(app).post(`/api/compendio/percorso/${data}/voci`).send({ azione, tipo: 'palazzo', riferimento: { tipo: 'dungeon', chiave: palazzo } }).expect(201)).body.data as AzionePercorsoDto).uid;

describe('Palazzi: aree e infiltrazioni (L3)', () => {
  beforeEach(() => { dbDiProva(); });
  afterEach(() => { closeDb(); });

  it('FUN3-1 — uscita la scheda del Palazzo del FE, la casa di L3 è l’unico comportamento: radice, planimetrie e Aree dei Palazzi portano alla scheda (nessun interruttore)', async () => {
    const casa = async (k: string) => ((await request(app).get(`/api/mappe/risolvi/${encodeURIComponent(k)}`).expect(200)).body.data as { casa: string }).casa;
    expect(await casa('dungeon-kamoshida')).toBe('/guida/dungeon/kamoshida');
    expect(await casa('nativo-rmap-153-2-1')).toMatch(/^\/guida\/dungeon\/madarame\/area\//);
    const m = (await request(app).get('/api/mappe/nativo-rmap-153-2-1').expect(200)).body.data as { casa: string; area: { casa: string } | null };
    expect(m.casa).toMatch(/^\/guida\/dungeon\/madarame\/area\//);
    expect(m.area?.casa).toBe(m.casa);
    const aree = (await request(app).get('/api/aree/dungeon/madarame').expect(200)).body.data as Array<{ casa: string; slug: string }>;
    expect(aree.every((a) => a.casa === `/guida/dungeon/madarame/area/${a.slug}`)).toBe(true);
  });

  it('AP3-3 (R3-26) — dall’editor una mappa senza Area non si sposta in un Palazzo (sotto la radice o una sua discendente): 409 usa-aggiungi-area; nei Memento resta ammesso', async () => {
    // una mappa generica sciolta nei Memento (ammessa) e una sua compagna
    const sciolta = (await request(app).post('/api/mappe').send({ nome: 'Sciolta da spostare', tipo: 'generica', genitore: 'dungeon-mementos' }).expect(201)).body.data as { chiave: string };
    const sposta = (genitore: string) => request(app).put(`/api/mappe/${encodeURIComponent(sciolta.chiave)}`).send({ genitore });
    // sotto la radice del Palazzo
    const radice = await sposta('dungeon-kamoshida');
    expect([radice.status, radice.body.error?.code]).toEqual([409, 'usa-aggiungi-area']);
    // sotto una sua planimetria (discendente)
    const pianta = prepared("SELECT chiave FROM mappa WHERE genitore_chiave = 'dungeon-kamoshida' AND area_chiave IS NOT NULL ORDER BY chiave LIMIT 1").pluck().get() as string;
    expect((await sposta(pianta)).status).toBe(409);
    expect(prepared('SELECT genitore_chiave FROM mappa WHERE chiave = ?').pluck().get(idMappa(sciolta.chiave))).toBe('dungeon-mementos');
    // nei Memento resta ammesso
    const altra = (await request(app).post('/api/mappe').send({ nome: 'Altra dei Memento', tipo: 'generica', genitore: 'dungeon-mementos' }).expect(201)).body.data as { chiave: string };
    await sposta(altra.chiave).expect(200);
    // nessuna planimetria sciolta nei Palazzi fra le «da collocare»
    expect(((await request(app).get('/api/aree/da-collocare').expect(200)).body.data as Array<{ chiave: string }>).some((m) => m.chiave === sciolta.chiave)).toBe(false);
  });

  it('NR3-1 — la scheda dei Memento non porta i campi delle Aree dei Palazzi: la risposta resta quella di prima (R3-12)', async () => {
    const m = (await request(app).get('/api/compendio/dungeon/mementos').expect(200)).body.data as DungeonDettaglioDto;
    expect('areePalazzo' in m).toBe(false);
    expect(m.aree.length).toBeGreaterThan(0);
    expect(m.aree.filter((a) => 'areePalazzo' in a).map((a) => a.chiave)).toEqual([]);
    expect(m.aree.flatMap((a) => a.mappe).filter((x) => 'area' in x)).toEqual([]);
  });

  it('2 — la scheda del Palazzo: Aree con infiltrazioni e raccolta, le planimetrie di un’infiltrazione sono quelle delle sue Aree, la raccolta torna', async () => {
    const partita = ((await request(app).post('/api/partite').send({ nome: 'Prova L3' })).body.data as { id: number }).id;
    const s = await scheda('madarame', partita);
    const attese = prepared("SELECT chiave FROM area WHERE dungeon_chiave = 'madarame' ORDER BY ordine, slug").pluck().all() as string[];
    expect(s.areePalazzo!.map((a) => a.chiave)).toEqual(attese);
    // le infiltrazioni di ogni Area sono quelle dei legami, in ordine di guida
    for (const a of s.areePalazzo!) {
      expect(a.infiltrazioni!.map((i) => i.chiave)).toEqual(prepared(`SELECT ia.infiltrazione_chiave FROM infiltrazione_area ia JOIN dungeon_area d ON d.chiave = ia.infiltrazione_chiave
        WHERE ia.area_chiave = ? ORDER BY d.ordine, d.chiave`).pluck().all(a.chiave));
      expect(a.raccolta!.presi).not.toBeNull();
    }
    // la raccolta delle Aree è quella delle planimetrie della colonna «Da raccogliere» (R3-31)
    const perArea = s.areePalazzo!.reduce((n, a) => n + a.raccolta!.n, 0);
    expect(perArea).toBe(s.planimetrie.reduce((n, p) => n + p.n, 0));
    // un'infiltrazione legata: le sue planimetrie sono tutte le versioni delle sue Aree, nell'ordine dei legami e delle versioni
    const inf = s.aree.find((a) => (a.areePalazzo ?? []).length > 0)!;
    const versioni = inf.areePalazzo!.flatMap((a) => prepared('SELECT chiave FROM mappa WHERE area_chiave = ? ORDER BY versione_ordine, chiave').pluck().all(a.chiave) as string[]);
    expect(inf.mappe.map((m) => m.chiave)).toEqual(versioni.map((k) => chiaveMappa(k)));
    expect(inf.mappe.every((m) => typeof m.area === 'string')).toBe(true);
    // la colonna delle planimetrie porta Area ed etichetta della versione
    expect(s.planimetrie.every((p) => p.area !== undefined)).toBe(true);
    expect(s.planimetrie.find((p) => p.chiave === chiaveMappa('nativo-rmap-153-2-1'))).toMatchObject({ area: 'dungeon/madarame/museo-1p' });
  });

  it('4 — la casa di L3: radice → scheda, predefinita → Area, versione secondaria → Area con ?planimetria=, Memento invariato, alias → ?infiltrazione=', async () => {
    const risolvi = async (k: string) => (await request(app).get(`/api/mappe/risolvi/${encodeURIComponent(k)}`).expect(200)).body.data as { tipo: string; casa: string };
    expect((await risolvi('dungeon-madarame')).casa).toBe('/guida/dungeon/madarame');
    expect((await risolvi('nativo-rmap-153-2-0')).casa).toBe('/guida/dungeon/madarame/area/museo-1p');
    // l'alias del Museo 1P apre l'Area sulla versione a cui portava (153-2-1), come oggi (§3.2, da approvare §7.8)
    expect((await risolvi('palazzo-di-madarame-museo-1p')).casa).toBe(`/guida/dungeon/madarame/area/museo-1p?planimetria=${encodeURIComponent(chiaveMappa('nativo-rmap-153-2-1'))}`);
    expect((await risolvi('dungeon-mementos')).casa).toMatch(/^\/guida\/mappe\//);
    const alias = prepared("SELECT ga.chiave, ga.area_chiave FROM guida_alias ga JOIN dungeon_area d ON d.chiave = ga.area_chiave WHERE d.dungeon_chiave = 'madarame' LIMIT 1").get() as { chiave: string; area_chiave: string };
    const g = await risolvi(alias.chiave);
    expect(g).toMatchObject({ tipo: 'guida', casa: `/guida/dungeon/madarame?infiltrazione=${encodeURIComponent(alias.area_chiave)}` });
    const aree = (await request(app).get('/api/aree/dungeon/madarame').expect(200)).body.data as AreaRiassuntoDto[];
    expect(aree.every((a) => a.casa === `/guida/dungeon/madarame/area/${a.slug}`)).toBe(true);
  });

  it('5 — i legami dai due lati danno lo stesso esito; un’area di un altro Palazzo è un 409; voci e pin non si toccano', async () => {
    const conta = () => JSON.stringify([prepared('SELECT COUNT(*) FROM spillo').pluck().get(), prepared('SELECT COUNT(*) FROM punto_interesse').pluck().get(), prepared('SELECT COUNT(*) FROM spillo_voce').pluck().get()]);
    const prima = conta();
    const [i1, i2] = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'madarame' ORDER BY ordine LIMIT 2").pluck().all() as string[];
    const [s1, s2] = prepared("SELECT slug FROM area WHERE dungeon_chiave = 'madarame' ORDER BY ordine LIMIT 2").pluck().all() as string[];
    // dall'area: la prima Area tocca le due infiltrazioni
    const a = (await request(app).put(`/api/aree/dungeon/madarame/${s1}/infiltrazioni`).send({ infiltrazioni: [i1, i2] }).expect(200)).body.data as AreaDettaglioDto;
    expect(a.infiltrazioni!.map((x) => x.chiave)).toEqual([i1, i2]);
    // dall'infiltrazione: la seconda tocca le due Aree, in quell'ordine, aprendo la prima sulla sua predefinita
    const inf = (await request(app).put(`/api/compendio/aree/${i2}/aree-palazzo`).send({ aree: [s2, s1], planimetrieIniziali: { [s1]: null } }).expect(200)).body.data as AreaDungeonDto;
    expect(inf.areePalazzo!.map((x) => x.slug)).toEqual([s2, s1]);
    expect(areeDi(i2)).toEqual([`dungeon/madarame/${s2}`, `dungeon/madarame/${s1}`]);
    // lo stesso legame visto dall'area
    const vista = (await request(app).get(`/api/aree/dungeon/madarame/${s2}`).expect(200)).body.data as AreaDettaglioDto;
    expect(vista.infiltrazioni!.map((x) => x.chiave)).toContain(i2);
    // un'area di un altro Palazzo, dai due lati
    const kam = prepared("SELECT chiave FROM area WHERE dungeon_chiave = 'kamoshida' LIMIT 1").pluck().get() as string;
    const r1 = await request(app).put(`/api/compendio/aree/${i2}/aree-palazzo`).send({ aree: [kam] });
    expect([r1.status, r1.body.error.code]).toEqual([409, 'area-di-un-altro-palazzo']);
    const kamInf = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' LIMIT 1").pluck().get() as string;
    const r2 = await request(app).put(`/api/aree/dungeon/madarame/${s1}/infiltrazioni`).send({ infiltrazioni: [kamInf] });
    expect([r2.status, r2.body.error.code]).toEqual([409, 'area-di-un-altro-palazzo']);
    expect((await request(app).put(`/api/compendio/aree/${i2}/aree-palazzo`).send({ aree: ['non-esiste'] })).status).toBe(404);
    expect(areeDi(i2)).toEqual([`dungeon/madarame/${s2}`, `dungeon/madarame/${s1}`]);
    expect(conta()).toBe(prima);
  });

  it('6 — aggiungi area con infiltrazioni, aggiungi planimetria, elimina area (409 col riepilogo, poi cestino e ripristino completo); elimina infiltrazione e la rimette', async () => {
    const [i1] = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'madarame' ORDER BY ordine LIMIT 1").pluck().all() as string[];
    // niente punto nei Palazzi
    const no = await request(app).post('/api/aree/dungeon/madarame?nome=Sala%20di%20prova&x=10&y=10').set('Content-Type', 'image/png').send(png(32, 32));
    expect([no.status, no.body.error.code]).toEqual([400, 'punto-non-ammesso']);
    const nuova = (await request(app).post(`/api/aree/dungeon/madarame?nome=Sala%20di%20prova&etichetta=giorno&infiltrazioni=${i1}`).set('Content-Type', 'image/png').send(png(32, 32)).expect(201)).body.data as AreaDettaglioDto;
    expect(nuova).toMatchObject({ chiave: 'dungeon/madarame/sala-di-prova', contenitore: { tipo: 'dungeon', chiave: 'madarame' }, origine: 'utente', numeroPlanimetrie: 1 });
    expect(nuova.infiltrazioni!.map((x) => x.chiave)).toEqual([i1]);
    // la planimetria nasce di tipo «area» sotto la radice del Palazzo, ed è subito una pianta (ruolo dedotto, L1)
    const pianta = prepared("SELECT tipo, genitore_chiave, ruolo_immagine FROM mappa WHERE area_chiave = 'dungeon/madarame/sala-di-prova'").get();
    expect(pianta).toEqual({ tipo: 'area', genitore_chiave: 'dungeon-madarame', ruolo_immagine: 'planimetria-nativa' });
    // una seconda versione
    const due = (await request(app).post('/api/aree/dungeon/madarame/sala-di-prova/planimetrie?etichetta=sera').set('Content-Type', 'image/png').send(png(32, 32)).expect(201)).body.data as AreaDettaglioDto;
    expect(due.planimetrie.map((p) => p.etichetta)).toEqual(['giorno', 'sera']);
    // un pin collegato a una voce dell'infiltrazione sulla planimetria: eliminando l'Area il riepilogo lo conta (le voci restano)
    const voceGuida = prepared("SELECT chiave FROM punto_interesse WHERE area_chiave = ? AND tipo NOT IN ('altro') LIMIT 1").pluck().get(i1) as string;
    const pin = (await request(app).post(`/api/mappe/${due.planimetrie[0].chiave}/spilli`).send({ tipo: 'forziere', nome: 'Forziere di prova', x: 20, y: 20 }).expect(201)).body.data as { id: number };
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(voceGuida)}/pin/${pin.id}`).expect(200);
    const impronta = () => JSON.stringify([prepared("SELECT * FROM area WHERE chiave = 'dungeon/madarame/sala-di-prova'").all(), prepared("SELECT * FROM infiltrazione_area WHERE area_chiave = 'dungeon/madarame/sala-di-prova'").all(),
      prepared("SELECT * FROM mappa WHERE area_chiave = 'dungeon/madarame/sala-di-prova' ORDER BY chiave").all(), prepared('SELECT * FROM spillo WHERE id = ?').all(pin.id), prepared('SELECT * FROM spillo_voce WHERE spillo_id = ?').all(pin.id)]);
    const prima = impronta();
    const r = await request(app).delete('/api/aree/dungeon/madarame/sala-di-prova');
    expect(r.status).toBe(409);
    expect(r.body.error.details).toMatchObject({ planimetrie: 2, pin: 1, pinConVoci: 1, infiltrazioni: 1 });
    expect(r.body.error.message).toBe('L’area «Sala di prova» ha 2 planimetrie, 1 pin di cui 1 collegato a voci e 1 infiltrazione: eliminandola va tutto nel cestino (le voci della guida restano nelle loro infiltrazioni).');
    await request(app).delete('/api/aree/dungeon/madarame/sala-di-prova?conferma=1').expect(204);
    expect(prepared("SELECT COUNT(*) FROM area WHERE chiave = 'dungeon/madarame/sala-di-prova'").pluck().get()).toBe(0);
    expect(areeDi(i1)).not.toContain('dungeon/madarame/sala-di-prova');
    expect(prepared('SELECT 1 FROM punto_interesse WHERE chiave = ?').get(voceGuida)).toBeTruthy();
    const [v] = (await request(app).get('/api/impostazioni/cestino').expect(200)).body.data as VoceCestinoDto[];
    expect(v).toMatchObject({ tipo: 'area-fisica', chiave: 'dungeon/madarame/sala-di-prova', contesto: 'Palazzo di Madarame' });
    expect((await request(app).post(`/api/impostazioni/cestino/${v.id}/ripristina`).expect(200)).body.data.saltate).toEqual([]);
    expect(impronta()).toBe(prima);

    // eliminare l'infiltrazione porta via i suoi legami (cestino `area`, come oggi); il ripristino li rimette
    const legami = JSON.stringify(prepared('SELECT * FROM infiltrazione_area WHERE infiltrazione_chiave = ? ORDER BY area_chiave').all(i1));
    await request(app).delete(`/api/compendio/aree/${i1}`).expect(204);
    expect(areeDi(i1)).toEqual([]);
    const [w] = (await request(app).get('/api/impostazioni/cestino').expect(200)).body.data as VoceCestinoDto[];
    expect(w).toMatchObject({ tipo: 'area', chiave: i1 });
    await request(app).post(`/api/impostazioni/cestino/${w.id}/ripristina`).expect(200);
    expect(JSON.stringify(prepared('SELECT * FROM infiltrazione_area WHERE infiltrazione_chiave = ? ORDER BY area_chiave').all(i1))).toBe(legami);
  });

  it('6b — «Sposta la versione in un’altra area» e «Rendila un’area a sé» nel Palazzo, con `PUT /api/aree/colloca`; mai fuori dal Palazzo', async () => {
    const versioni = prepared("SELECT chiave FROM mappa WHERE area_chiave = 'dungeon/madarame/museo-2p' ORDER BY versione_ordine").pluck().all() as string[];
    expect(versioni.length).toBeGreaterThan(2);
    const sposta = (await request(app).put('/api/aree/colloca').send({ mappa: versioni[1], dungeon: 'madarame', area: 'museo-1p' }).expect(200)).body.data as AreaDettaglioDto;
    expect(sposta.planimetrie.map((p) => p.chiave)).toContain(chiaveMappa(versioni[1]));
    expect(prepared("SELECT versione_ordine FROM mappa WHERE area_chiave = 'dungeon/madarame/museo-2p' ORDER BY versione_ordine").pluck().all()).toEqual(versioni.slice(0, -1).map((_, i) => i));
    const sola = (await request(app).put('/api/aree/colloca').send({ mappa: versioni[2], dungeon: 'madarame', nuova: { nome: 'Museo 2P, ala nord' } }).expect(200)).body.data as AreaDettaglioDto;
    expect(sola).toMatchObject({ slug: 'museo-2p-ala-nord', numeroPlanimetrie: 1, origine: 'utente' });
    const fuori = await request(app).put('/api/aree/colloca').send({ mappa: versioni[0], dungeon: 'kamoshida', area: prepared("SELECT slug FROM area WHERE dungeon_chiave = 'kamoshida' LIMIT 1").pluck().get() });
    expect([fuori.status, fuori.body.error.code]).toEqual([400, 'planimetria-di-un-altro-palazzo']);
    // l'unica versione di un'Area «a sé» lo è già (§3.6.1)
    expect((await request(app).put('/api/aree/colloca').send({ mappa: versioni[2], dungeon: 'madarame', nuova: { nome: 'Altro nome' } })).body.error.code).toBe('gia-area-a-se');
  });

  it('§3.6.1 — spostare l’unica versione chiede conferma (409 `area-si-svuota`); confermato, l’area svuotata va nel cestino coi suoi legami, che passano all’area d’arrivo; dal cestino torna vuota', async () => {
    const sola = prepared(`SELECT a.chiave, a.slug, a.nome FROM area a WHERE a.dungeon_chiave = 'madarame' AND (SELECT COUNT(*) FROM mappa m WHERE m.area_chiave = a.chiave) = 1
      AND (SELECT COUNT(*) FROM infiltrazione_area ia WHERE ia.area_chiave = a.chiave) > 0 ORDER BY a.ordine LIMIT 1`).get() as { chiave: string; slug: string; nome: string };
    const arrivo = prepared("SELECT chiave, slug, nome FROM area WHERE dungeon_chiave = 'madarame' AND chiave <> ? ORDER BY ordine LIMIT 1").get(sola.chiave) as { chiave: string; slug: string; nome: string };
    const versione = prepared('SELECT chiave FROM mappa WHERE area_chiave = ?').pluck().get(sola.chiave) as string;
    const legami = prepared('SELECT infiltrazione_chiave, area_chiave, ordine, planimetria_iniziale, origine FROM infiltrazione_area WHERE area_chiave = ? ORDER BY 1').all(sola.chiave) as Array<{ infiltrazione_chiave: string; ordine: number; planimetria_iniziale: string | null; origine: string }>;
    const corpo = { mappa: versione, dungeon: 'madarame', area: arrivo.slug };
    // senza conferma: 409 con il riepilogo, e nulla cambia
    const no = await request(app).put('/api/aree/colloca').send(corpo);
    expect([no.status, no.body.error.code]).toEqual([409, 'area-si-svuota']);
    expect(no.body.error.message).toContain(`«${sola.nome}» resta senza planimetrie`);
    expect(no.body.error.message).toContain(`«${arrivo.nome}»`);
    expect(no.body.error.details).toEqual({ area: sola.slug, arrivo: arrivo.slug, legami: legami.length });
    expect(prepared('SELECT area_chiave FROM mappa WHERE chiave = ?').pluck().get(versione)).toBe(sola.chiave);
    // confermato: la versione entra nell'area d'arrivo, l'area di partenza va nel cestino («fusa in …»)
    await request(app).put('/api/aree/colloca?conferma=1').send(corpo).expect(200);
    expect(prepared('SELECT area_chiave FROM mappa WHERE chiave = ?').pluck().get(versione)).toBe(arrivo.chiave);
    expect(prepared('SELECT 1 FROM area WHERE chiave = ?').get(sola.chiave)).toBeUndefined();
    expect(prepared('SELECT COUNT(*) FROM infiltrazione_area WHERE area_chiave = ?').pluck().get(sola.chiave)).toBe(0);
    // i legami passano all'area d'arrivo con lo stesso ordine e la versione spostata da aprire (dove non c'erano già)
    for (const l of legami) {
      const ora = prepared('SELECT ordine, planimetria_iniziale, origine FROM infiltrazione_area WHERE infiltrazione_chiave = ? AND area_chiave = ?').get(l.infiltrazione_chiave, arrivo.chiave);
      expect(ora).toBeDefined();
    }
    const nelCestino = ((await request(app).get('/api/impostazioni/cestino').expect(200)).body.data as VoceCestinoDto[]).find((v) => v.tipo === 'area-fisica' && v.chiave === sola.chiave)!;
    expect(nelCestino.contesto).toBe(`fusa in «${arrivo.nome}»`);
    expect(nelCestino.contenuto.map((c) => c.tabella).sort()).toEqual(['area', 'infiltrazione_area']);
    // dal cestino: l'area torna vuota (senza planimetria predefinita) coi suoi legami; la versione resta dov'è
    await request(app).post(`/api/impostazioni/cestino/${nelCestino.id}/ripristina`).expect(200);
    expect(prepared('SELECT planimetria_predefinita FROM area WHERE chiave = ?').get(sola.chiave)).toEqual({ planimetria_predefinita: null });
    expect(prepared('SELECT infiltrazione_chiave, area_chiave, ordine, planimetria_iniziale, origine FROM infiltrazione_area WHERE area_chiave = ? ORDER BY 1').all(sola.chiave)).toEqual(legami);
    expect(prepared('SELECT area_chiave FROM mappa WHERE chiave = ?').pluck().get(versione)).toBe(arrivo.chiave);
    // con più versioni nessuna conferma in più
    const due = prepared("SELECT area_chiave FROM mappa WHERE area_chiave IN (SELECT chiave FROM area WHERE dungeon_chiave = 'madarame') GROUP BY area_chiave HAVING COUNT(*) > 2 LIMIT 1").pluck().get() as string;
    const unaDiDue = prepared('SELECT chiave FROM mappa WHERE area_chiave = ? ORDER BY versione_ordine DESC LIMIT 1').pluck().get(due) as string;
    await request(app).put('/api/aree/colloca').send({ mappa: unaDiDue, dungeon: 'madarame', area: sola.slug }).expect(200);
  });

  it('§3.6.1 — la rotta vecchia `/stanza` con `con` e `nome`: l’area d’arrivo di una sola planimetria prende il nome come correzione (Ripristina la riporta), mai sopra un nome dell’utente', async () => {
    const sole = prepared(`SELECT a.chiave, a.slug, a.nome, m.chiave AS mappa FROM area a JOIN mappa m ON m.area_chiave = a.chiave WHERE a.dungeon_chiave = 'iweleth' AND a.origine = 'seed'
      AND (SELECT COUNT(*) FROM mappa x WHERE x.area_chiave = a.chiave) = 1 ORDER BY a.ordine LIMIT 3`).all() as Array<{ chiave: string; slug: string; nome: string; mappa: string }>;
    const [da, verso, rivista] = sole;
    expect(sole.length).toBe(3);
    // la stanza: la versione di `da` entra nell'area di `verso`, che prende il nome dato (come correzione dell'area del seed)
    await request(app).put(`/api/mappe/${encodeURIComponent(chiaveMappa(da.mappa))}/stanza`).send({ con: chiaveMappa(verso.mappa), nome: 'Nome dato' }).expect(200);
    expect(prepared('SELECT nome, nome_rivisto, seed_json IS NOT NULL AS corretta FROM area WHERE chiave = ?').get(verso.chiave)).toEqual({ nome: 'Nome dato', nome_rivisto: 1, corretta: 1 });
    await request(app).post(`/api/aree/dungeon/iweleth/${verso.slug}/ripristina`).expect(200);
    expect(prepared('SELECT nome FROM area WHERE chiave = ?').pluck().get(verso.chiave)).toBe(verso.nome);
    // un nome dato dall'utente resta: la rotta lo lascia e risponde col nome di adesso
    await request(app).put(`/api/aree/dungeon/iweleth/${rivista.slug}`).send({ nome: 'Nome dell’utente' }).expect(200);
    const altra = prepared("SELECT m.chiave FROM mappa m WHERE m.area_chiave = ?").pluck().get(verso.chiave) as string;
    await request(app).put(`/api/mappe/${encodeURIComponent(chiaveMappa(altra))}/stanza`).send({ con: chiaveMappa(rivista.mappa), nome: 'Altro nome' }).expect(200);
    expect(prepared('SELECT nome FROM area WHERE chiave = ?').pluck().get(rivista.chiave)).toBe('Nome dell’utente');
  });

  it('8 — pacchetto del Palazzo: esporta → importa (con e senza «sovrascrivi») identico colonna per colonna; un pacchetto di prima lega le infiltrazioni dal campo `aree`', async () => {
    const tabelle = () => JSON.stringify({
      mappa: prepared("SELECT * FROM mappa WHERE chiave = 'dungeon-madarame' OR genitore_chiave = 'dungeon-madarame' ORDER BY chiave").all(),
      spillo: prepared("SELECT s.* FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave WHERE m.chiave = 'dungeon-madarame' OR m.genitore_chiave = 'dungeon-madarame' ORDER BY s.id").all(),
      area: prepared("SELECT * FROM area WHERE dungeon_chiave = 'madarame' ORDER BY chiave").all(),
      legami: prepared("SELECT ia.* FROM infiltrazione_area ia JOIN area a ON a.chiave = ia.area_chiave WHERE a.dungeon_chiave = 'madarame' ORDER BY 1, 2").all(),
      entita: prepared("SELECT e.* FROM mappa_entita e JOIN mappa m ON m.chiave = e.mappa_chiave WHERE m.chiave = 'dungeon-madarame' OR m.genitore_chiave = 'dungeon-madarame' ORDER BY 1, 2, 3").all(),
      voci: prepared("SELECT sv.* FROM spillo_voce sv JOIN spillo s ON s.id = sv.spillo_id JOIN mappa m ON m.chiave = s.mappa_chiave WHERE m.genitore_chiave = 'dungeon-madarame' ORDER BY 1, 2").all(),
    });
    // un nome rivisto, un pin del seed e un legame dell'utente, perché viaggino anche quelli
    prepared("UPDATE mappa SET nome_rivisto = 1 WHERE chiave = 'nativo-rmap-153-2-1'").run();
    const prima = tabelle();
    const pacchetto = esportaMappe('dungeon-madarame');
    expect(pacchetto.legami?.length).toBe(prepared("SELECT COUNT(*) FROM infiltrazione_area ia JOIN area a ON a.chiave = ia.area_chiave WHERE a.dungeon_chiave = 'madarame'").pluck().get());
    importaMappe(structuredClone(pacchetto), { sovrascrivi: true });
    expect(tabelle()).toBe(prima);
    importaMappe(structuredClone(pacchetto));
    expect(tabelle()).toBe(prima);
    // un pacchetto di prima: senza `legami` né i campi nuovi; i legami tolti tornano dal campo `aree` di ogni planimetria, sulla sua Area
    const vecchio = structuredClone(pacchetto);
    delete vecchio.legami;
    for (const m of vecchio.mappe) { delete m.entitaLegami; delete m.nomeRivisto; delete m.origine; delete m.updatedAt; }
    const conInfiltrazioni = vecchio.mappe.filter((m) => (m.aree ?? []).length > 0);
    expect(conInfiltrazioni.length).toBeGreaterThan(0);
    prepared("DELETE FROM infiltrazione_area WHERE area_chiave IN (SELECT chiave FROM area WHERE dungeon_chiave = 'madarame')").run();
    importaMappe(vecchio, { sovrascrivi: true });
    for (const m of conInfiltrazioni) {
      const area = prepared('SELECT area_chiave FROM mappa WHERE chiave = ?').pluck().get(idMappa(m.chiave)) as string;
      for (const inf of m.aree!) expect(areeDi(inf)).toContain(area);
    }
  });

  it('NR3-2, NR3-3 — dalla rotta dell’app (esporta → importa, con e senza «sovrascrivi») i pin del seed restano del seed e l’immagine caricata resta la stessa riga', async () => {
    const radice = 'dungeon-madarame';
    await request(app).put(`/api/mappe/${radice}/immagine`).set('Content-Type', 'image/png').send(png(64, 48)).expect(200);
    // e la schermata di un pin, che deve tornare con la sua riga e la sua chiave
    const pin = prepared("SELECT s.id FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave WHERE m.genitore_chiave = ? AND s.uid IS NOT NULL ORDER BY s.id LIMIT 1").pluck().get(radice) as number;
    await request(app).post(`/api/mappe/spilli/${pin}/immagini?didascalia=Schermata`).set('Content-Type', 'image/png').send(png(32, 32)).expect(201);
    const tabelle = () => JSON.stringify({
      mappa: prepared('SELECT * FROM mappa WHERE chiave = ? OR genitore_chiave = ? ORDER BY chiave').all(radice, radice),
      spillo: prepared('SELECT s.* FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave WHERE m.chiave = ? OR m.genitore_chiave = ? ORDER BY s.id').all(radice, radice),
      immagine: prepared("SELECT id, ambito, chiave, nome_file, mime, byte, created_at, origine_url, hex(contenuto) AS contenuto FROM immagine WHERE (ambito = 'mappa' AND chiave = ?) OR ambito = 'spillo' ORDER BY id").all(radice),
      spilloImmagine: prepared('SELECT * FROM spillo_immagine ORDER BY id').all(),
    });
    expect(JSON.parse(tabelle()).spilloImmagine.length).toBe(1);
    const seme = prepared("SELECT COUNT(*) FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave WHERE (m.chiave = ? OR m.genitore_chiave = ?) AND s.origine = 'seed'").pluck().get(radice, radice) as number;
    expect(seme).toBeGreaterThan(0);
    const prima = tabelle();
    const pacchetto = (await request(app).get(`/api/mappe/esporta?radice=${radice}`).expect(200)).body.data;
    expect(Object.keys(pacchetto.immagini)).toContain(radice);
    await request(app).post('/api/mappe/importa').send({ pacchetto, sovrascrivi: true }).expect(200);
    expect(tabelle()).toBe(prima);
    await request(app).post('/api/mappe/importa').send({ pacchetto }).expect(200);
    expect(tabelle()).toBe(prima);
    // un'immagine diversa, invece, si scrive (riga aggiornata, contenuto nuovo)
    const altra = structuredClone(pacchetto);
    altra.immagini[radice].base64 = png(80, 40).toString('base64');
    await request(app).post('/api/mappe/importa').send({ pacchetto: altra, sovrascrivi: true }).expect(200);
    expect(prepared("SELECT larghezza || 'x' || altezza FROM mappa WHERE chiave = ?").pluck().get(radice)).toBe('80x40');
    expect(prepared("SELECT nome_file FROM immagine WHERE ambito = 'mappa' AND chiave = ?").pluck().get(radice)).not.toBe(JSON.parse(prima).immagine[0].nome_file);
  });

  it('§3.6.3 — un pin reimportato il cui id è stato preso da un’altra riga ne riceve uno nuovo, lo dice nel riepilogo e il suo stato lo segue per uid', async () => {
    const planimetria = prepared("SELECT chiave FROM mappa WHERE genitore_chiave = 'dungeon-madarame' ORDER BY chiave LIMIT 1").pluck().get() as string;
    const pubblica = chiaveMappa(planimetria);
    // il pin più recente di tutta la base: liberato dall'import, il suo id è il primo che SQLite dà a un pin nuovo
    const x = (await request(app).post(`/api/mappe/${encodeURIComponent(pubblica)}/spilli`).send({ tipo: 'forziere', nome: 'Forziere di prova', x: 40, y: 40 }).expect(201)).body.data as { id: number; uid: string };
    expect(prepared('SELECT MAX(id) FROM spillo').pluck().get()).toBe(x.id);
    const partita = ((await request(app).post('/api/partite').send({ nome: 'Id occupati' }).expect(201)).body.data as { id: number }).id;
    await request(app).put(`/api/partite/${partita}/spilli/${x.id}`).send({ raccolto: true }).expect(200);
    const pacchetto = (await request(app).get(`/api/mappe/esporta?radice=${encodeURIComponent(pubblica)}`).expect(200)).body.data;
    const mappa = pacchetto.mappe.find((m: { chiave: string }) => m.chiave === pubblica);
    // un pin nuovo in testa alla mappa: inserito per primo, prende l'id liberato da quello di prima
    mappa.spilli.unshift({ ...mappa.spilli.find((s: { uid: string }) => s.uid === x.uid), uid: undefined, nome: 'Pin nuovo', x: 10, y: 10 });
    const esito = (await request(app).post('/api/mappe/importa').send({ pacchetto, sovrascrivi: true }).expect(200)).body.data as { idCambiati?: Array<{ tipo: string; uid: string; prima: number; dopo: number }> };
    const dopo = prepared('SELECT id FROM spillo WHERE uid = ?').pluck().get(x.uid) as number;
    expect(dopo).not.toBe(x.id);
    expect(esito.idCambiati).toEqual([{ tipo: 'pin', uid: x.uid, prima: x.id, dopo }]);
    expect(prepared("SELECT nome FROM spillo WHERE id = ?").pluck().get(x.id)).toBe('Pin nuovo');
    expect(prepared('SELECT raccolto FROM utente.spillo_partita WHERE partita_id = ? AND spillo_uid = ?').pluck().get(partita, x.uid)).toBe(1);
    // reimportato di nuovo, senza conflitti: nessun id cambiato, e il campo non c'è
    const di = (await request(app).post('/api/mappe/importa').send({ pacchetto: (await request(app).get(`/api/mappe/esporta?radice=${encodeURIComponent(pubblica)}`)).body.data, sovrascrivi: true }).expect(200)).body.data;
    expect('idCambiati' in di).toBe(false);
  });

  it('9 — il campo «Infiltrazioni» delle voci: presente solo con un Palazzo; scelta, aggiunta, riordino, togli, nessuna; ripetizione non consecutiva sì, consecutiva no; la voce non cambia', async () => {
    const infiltrazioni = prepared("SELECT chiave, nome FROM dungeon_area WHERE dungeon_chiave = 'madarame' ORDER BY ordine").all() as Array<{ chiave: string; nome: string }>;
    const [a, b, c] = infiltrazioni.map((i) => i.chiave);
    const uid = await nuovaVoce('06-10', 'Palazzo di Madarame: visita di prova', 'madarame');
    const v0 = await voce('06-10', uid);
    expect(v0).toMatchObject({ infiltrazioni: [], infiltrazioneDaAprire: null });
    expect(v0.infiltrazioniDelPalazzo!.map((i) => i.chiave)).toEqual(infiltrazioni.map((i) => i.chiave));
    // una voce senza Palazzo non ha il campo (assente, non vuoto)
    const altra = ((await request(app).post('/api/compendio/percorso/06-10/voci').send({ azione: 'Una voce qualunque' }).expect(201)).body.data as AzionePercorsoDto);
    expect('infiltrazioni' in altra).toBe(false);
    expect((await request(app).put(`/api/compendio/percorso/voci/${altra.uid}`).send({ infiltrazioni: [a] })).body.error.code).toBe('voce-senza-palazzo');
    const impronta = improntaVoce(uid);
    const imposta = async (chiavi: string[]) => request(app).put(`/api/compendio/percorso/voci/${uid}`).send({ infiltrazioni: chiavi });
    // scelta, aggiunta, riordino, togli
    expect(((await imposta([a])).body.data as AzionePercorsoDto).infiltrazioni!.map((i) => i.chiave)).toEqual([a]);
    expect(((await imposta([a, b])).body.data as AzionePercorsoDto).infiltrazioni!.map((i) => i.chiave)).toEqual([a, b]);
    expect(((await imposta([b, a])).body.data as AzionePercorsoDto).infiltrazioni!.map((i) => i.chiave)).toEqual([b, a]);
    expect(((await imposta([a])).body.data as AzionePercorsoDto).infiltrazioni!.map((i) => i.chiave)).toEqual([a]);
    // la stessa infiltrazione due volte, non di seguito (N2): salvata e riletta uguale; di seguito no
    await imposta([a, b, c, b]).then((r) => expect(r.status).toBe(200));
    expect((await voce('06-10', uid)).infiltrazioni!.map((i) => i.chiave)).toEqual([a, b, c, b]);
    const seguito = await imposta([a, a]);
    expect([seguito.status, seguito.body.error.code]).toEqual([400, 'infiltrazione-ripetuta-di-seguito']);
    // un'infiltrazione di un altro Palazzo, o inesistente
    const kam = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' LIMIT 1").pluck().get() as string;
    expect((await imposta([kam])).body.error.code).toBe('infiltrazione-di-un-altro-palazzo');
    expect((await imposta(['non-esiste'])).body.error.code).toBe('infiltrazione-inesistente');
    // con altri campi no: si salva da solo
    expect((await request(app).put(`/api/compendio/percorso/voci/${uid}`).send({ infiltrazioni: [a], note: 'x' })).body.error.code).toBe('infiltrazioni-da-sole');
    expect((await voce('06-10', uid)).infiltrazioni!.map((i) => i.chiave)).toEqual([a, b, c, b]);
    // «nessuna»: l'insieme vuoto
    expect(((await imposta([])).body.data as AzionePercorsoDto).infiltrazioni).toEqual([]);
    // dopo ogni gesto la voce è la stessa (testo, ordine, giorno, fascia, uid, spunte)
    expect(improntaVoce(uid)).toBe(impronta);
  });

  it('9b — eliminare un’infiltrazione presente due volte toglie tutte e due le posizioni e ricompatta; il cestino le rimette dov’erano', async () => {
    const [a, b, c] = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'madarame' ORDER BY ordine LIMIT 3").pluck().all() as string[];
    const uid = await nuovaVoce('06-11', 'Palazzo di Madarame: un percorso che torna indietro', 'madarame');
    await request(app).put(`/api/compendio/percorso/voci/${uid}`).send({ infiltrazioni: [a, b, c, b, a] }).expect(200);
    await request(app).delete(`/api/compendio/aree/${b}`).expect(204);
    expect(prepared('SELECT ordine || \':\' || infiltrazione_chiave FROM voce_infiltrazione WHERE voce_uid = ? ORDER BY ordine').pluck().all(uid)).toEqual([`0:${a}`, `1:${c}`, `2:${a}`]);
    const [w] = (await request(app).get('/api/impostazioni/cestino').expect(200)).body.data as VoceCestinoDto[];
    await request(app).post(`/api/impostazioni/cestino/${w.id}/ripristina`).expect(200);
    expect(prepared('SELECT infiltrazione_chiave FROM voce_infiltrazione WHERE voce_uid = ? ORDER BY ordine').pluck().all(uid)).toEqual([a, b, c, b, a]);
  });

  it('9c — «Entra»: la prima non completata dell’insieme, poi l’ultima; la proposta solo con l’insieme vuoto; regole (a) e (b) a richiesta', async () => {
    const partita = ((await request(app).post('/api/partite').send({ nome: 'Prova Entra' })).body.data as { id: number }).id;
    // due infiltrazioni con voci da segnare
    const [p, q] = prepared(`SELECT d.chiave FROM dungeon_area d WHERE d.dungeon_chiave = 'madarame'
      AND EXISTS (SELECT 1 FROM punto_interesse x WHERE x.area_chiave = d.chiave AND x.tipo <> 'altro') ORDER BY d.ordine LIMIT 2`).pluck().all() as string[];
    const segna = (inf: string) => { for (const k of prepared("SELECT chiave FROM punto_interesse WHERE area_chiave = ? AND tipo <> 'altro'").pluck().all(inf) as string[]) prepared("INSERT OR IGNORE INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', 'x')").run(partita, k); };
    const uid = await nuovaVoce('06-12', 'Palazzo di Madarame: due infiltrazioni', 'madarame');
    await request(app).put(`/api/compendio/percorso/voci/${uid}`).send({ infiltrazioni: [p, q] }).expect(200);
    expect((await voce('06-12', uid, partita)).infiltrazioneDaAprire).toBe(p);
    segna(p);
    expect((await voce('06-12', uid, partita)).infiltrazioneDaAprire).toBe(q);
    segna(q);
    expect((await voce('06-12', uid, partita)).infiltrazioneDaAprire).toBe(q);
    // la proposta: solo con l'insieme vuoto (una riga di G-022 scritta qui, il pacchetto di prova non ne ha)
    prepared("INSERT INTO proposta_infiltrazione_voce (voce_uid, ordine, infiltrazione_chiave, regola, motivo, certezza) VALUES (?, 0, ?, 'letta-voce-per-voce', 'Motivo di prova', 'certa'), (?, 1, ?, 'letta-voce-per-voce', 'Motivo di prova', 'certa')").run(uid, q, uid, p);
    expect((await voce('06-12', uid)).propostaInfiltrazioni).toBeNull();
    await request(app).put(`/api/compendio/percorso/voci/${uid}`).send({ infiltrazioni: [] }).expect(200);
    expect((await voce('06-12', uid)).propostaInfiltrazioni).toEqual({ infiltrazioni: [{ chiave: q, nome: expect.any(String) }, { chiave: p, nome: expect.any(String) }], motivo: 'Motivo di prova', certezza: 'certa' });
    // una voce col riferimento a un Confidente e una proposta ha il campo (palazzoDellaVoce), il riferimento resta
    const conf = ((await request(app).post('/api/compendio/percorso/06-12/voci').send({ azione: 'Con Ryuji', riferimento: { tipo: 'confidente', chiave: 'ryuji' } }).expect(201)).body.data as AzionePercorsoDto).uid;
    expect('infiltrazioni' in await voce('06-12', conf)).toBe(false);
    prepared("INSERT INTO proposta_infiltrazione_voce (voce_uid, ordine, infiltrazione_chiave, regola, motivo, certezza) VALUES (?, 0, ?, 'letta-voce-per-voce', 'Motivo', 'probabile')").run(conf, p);
    expect(await voce('06-12', conf)).toMatchObject({ riferimento: { tipo: 'confidente', chiave: 'ryuji' }, infiltrazioni: [], propostaInfiltrazioni: { certezza: 'probabile' } });

    // regola (a): il nome di una sola infiltrazione del Palazzo nel testo; più candidati o nessuno: niente
    const nomi = prepared("SELECT chiave, nome FROM dungeon_area WHERE dungeon_chiave = 'madarame' ORDER BY ordine").all() as Array<{ chiave: string; nome: string }>;
    const unica = nomi.find((x) => !nomi.some((y) => y !== x && (y.nome.toLowerCase().includes(x.nome.toLowerCase()) || x.nome.toLowerCase().includes(y.nome.toLowerCase()))))!;
    const conNome = await nuovaVoce('06-13', `Palazzo di Madarame: ${unica.nome.toUpperCase()}!`, 'madarame');
    expect((await voce('06-13', conNome)).propostaInfiltrazioni).toEqual({ infiltrazioni: [{ chiave: unica.chiave, nome: unica.nome }], motivo: 'Il nome dell’infiltrazione è nel testo della voce.', certezza: 'certa' });
    const senza = await nuovaVoce('06-13', 'Palazzo di Madarame: niente di particolare', 'madarame');
    expect((await voce('06-13', senza)).propostaInfiltrazioni).toBeNull();
    // regola (b): la data della voce nel nome di una sola infiltrazione
    const tutorial = ((await request(app).post('/api/compendio/dungeon/kamoshida/aree').send({ nome: 'Tutorial di prova 11/04' }).expect(201)).body.data as { chiave: string }).chiave;
    const conData = await nuovaVoce('04-11', 'Primo giro nel castello', 'kamoshida');
    expect((await voce('04-11', conData)).propostaInfiltrazioni).toMatchObject({ infiltrazioni: [{ chiave: tutorial }], motivo: 'La data della voce è nel nome dell’infiltrazione.' });
    await request(app).post('/api/compendio/dungeon/kamoshida/aree').send({ nome: 'Altra prova 11/04' }).expect(201);
    expect((await voce('04-11', conData)).propostaInfiltrazioni).toBeNull();
  });

  it('9d — «da rivedere»: tieni il nuovo, rimetti il precedente (solo con un testo precedente), fatto; una voce non da rivedere è un 409', async () => {
    const uid = await nuovaVoce('07-01', 'Testo corretto dal team', 'madarame');
    expect('daRivedere' in await voce('07-01', uid)).toBe(false);
    const precedente = JSON.stringify({ azione: 'Testo di prima', note: 'Nota di prima', riferimento_tipo: 'confidente', riferimento_chiave: 'ryuji', riferimento_testo: 'Ryuji' });
    prepared('UPDATE voce_giornata SET da_rivedere = 1, testo_precedente_json = ? WHERE uid = ?').run(precedente, uid);
    expect(await voce('07-01', uid)).toMatchObject({ daRivedere: true, aggiuntaDa: null, motivoRevisione: null, testoPrecedente: { azione: 'Testo di prima', note: 'Nota di prima', riferimento: { tipo: 'confidente', chiave: 'ryuji' }, riferimentoTesto: 'Ryuji' } });
    // «Tieni il nuovo»
    expect(((await request(app).post(`/api/compendio/percorso/voci/${uid}/rivista`).send({ esito: 'tieni' }).expect(200)).body.data as AzionePercorsoDto)).toMatchObject({ daRivedere: false, azione: 'Testo corretto dal team' });
    expect((await request(app).post(`/api/compendio/percorso/voci/${uid}/rivista`).send({ esito: 'tieni' })).status).toBe(409);
    // «Rimetti il precedente»: i campi di prima, il testo precedente resta
    prepared('UPDATE voce_giornata SET da_rivedere = 1 WHERE uid = ?').run(uid);
    const rimessa = (await request(app).post(`/api/compendio/percorso/voci/${uid}/rivista`).send({ esito: 'rimetti' }).expect(200)).body.data as AzionePercorsoDto;
    expect(rimessa).toMatchObject({ azione: 'Testo di prima', note: 'Nota di prima', riferimento: { tipo: 'confidente', chiave: 'ryuji' }, daRivedere: false });
    expect(prepared('SELECT testo_precedente_json FROM voce_giornata WHERE uid = ?').pluck().get(uid)).toBe(precedente);
    // una voce solo segnalata: il motivo e «Fatto»; «Rimetti» senza testo precedente è un 400
    const segnalata = await nuovaVoce('07-01', 'Testo da rivedere', 'madarame');
    prepared("UPDATE voce_giornata SET da_rivedere = 1, motivo_revisione = 'La sera non si entra nei Palazzi' WHERE uid = ?").run(segnalata);
    expect(await voce('07-01', segnalata)).toMatchObject({ daRivedere: true, motivoRevisione: 'La sera non si entra nei Palazzi', testoPrecedente: null });
    expect((await request(app).post(`/api/compendio/percorso/voci/${segnalata}/rivista`).send({ esito: 'rimetti' })).body.error.code).toBe('senza-testo-precedente');
    const impronta = improntaVoce(segnalata);
    expect(((await request(app).post(`/api/compendio/percorso/voci/${segnalata}/rivista`).send({ esito: 'fatto' }).expect(200)).body.data as AzionePercorsoDto).daRivedere).toBe(false);
    expect(improntaVoce(segnalata)).toBe(impronta);
    expect((await request(app).post(`/api/compendio/percorso/voci/${segnalata}/rivista`).send({ esito: 'altro' })).status).toBe(400);
  });
});
