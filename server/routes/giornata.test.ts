// ============================================================
// Test API — la giornata della guida è canone: voci aggiunte al posto esatto, modificate, spostate, eliminate,
// per tutte le partite e scritte nel file di gioco; spunte per identità (richiesta dell'utente, 2026-09-30)
// ============================================================

import request from 'supertest';
import { closeDb, getDb, prepared } from '../db/dbService.js';
import { orfaniPartite } from '../services/pacchettoGiocoService.js';
import { createApp } from '../bootstrap.js';
import type { AzionePercorsoDto, DoteSocialePartitaDto, ElenchiAzioneDto, PercorsoGiornoDto, PercorsoIndiceDto, SuggerimentiOggiDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

const giorno = async (data: string, partita?: number) =>
  (await request(app).get(`/api/compendio/percorso/${data}${partita ? `?partita=${partita}` : ''}`)).body.data as PercorsoGiornoDto;
const fascia = async (data: string, f: 'giorno' | 'sera', partita?: number) => (await giorno(data, partita)).azioni.filter((a) => a.fascia === f);
const nuovaPartita = async (nome: string) => ((await request(app).post('/api/partite').send({ nome })).body.data as { id: number }).id;
const riassunto = async (data: string, partita?: number) =>
  ((await request(app).get(`/api/compendio/percorso${partita ? `?partita=${partita}` : ''}`)).body.data as PercorsoIndiceDto).giorni.find((g) => g.giorno === data)!;
const crea = (data: string, body: object) => request(app).post(`/api/compendio/percorso/${data}/voci`).send(body);
const modifica = (uid: string, body: object) => request(app).put(`/api/compendio/percorso/voci/${uid}`).send(body);
/** L'ordine nel file di gioco dev'essere 0, 1, 2… in ogni fascia. */
const ordiniCompatti = (data: string) => {
  for (const f of ['giorno', 'sera']) {
    const o = prepared('SELECT ordine FROM voce_giornata WHERE data = ? AND fascia = ? ORDER BY ordine').pluck().all(data, f) as number[];
    expect(o, `${data} ${f}`).toEqual(o.map((_, i) => i));
  }
};

describe('API — la giornata della guida è canone', () => {
  beforeAll(() => {
    dbDiProva();
  });
  afterAll(() => closeDb());

  it('una voce nuova va al posto scelto, vale per tutte le partite ed è scritta nel file di gioco', async () => {
    const prima = await fascia('04-14', 'giorno');
    expect(prima.length).toBeGreaterThanOrEqual(2);
    const p1 = await nuovaPartita('Canone 1');
    const conteggio = await riassunto('04-14', p1);
    const r = await crea('04-14', { fascia: 'giorno', azione: '  Comprare il pane  ', note: 'al Leblanc', posizione: 1 });
    expect(r.status).toBe(201);
    const nuova = r.body.data as AzionePercorsoDto;
    expect(nuova).toMatchObject({ giorno: '04-14', fascia: 'giorno', genere: 'azione', azione: 'Comprare il pane', note: 'al Leblanc', tipo: 'altro', produce: [] });
    expect(nuova.uid).toMatch(/^[0-9a-f]{32}$/);
    // al secondo posto, prima e dopo le voci di prima nel loro ordine
    expect((await fascia('04-14', 'giorno')).map((a) => a.uid)).toEqual([prima[0].uid, nuova.uid, ...prima.slice(1).map((a) => a.uid)]);
    // canone: senza partita e in un'altra partita c'è; la riga sta nel file di gioco
    const p2 = await nuovaPartita('Canone 2');
    for (const p of [undefined, p1, p2]) expect((await giorno('04-14', p)).azioni.some((a) => a.uid === nuova.uid)).toBe(true);
    expect(prepared('SELECT azione FROM main.voce_giornata WHERE uid = ?').get(nuova.uid)).toEqual({ azione: 'Comprare il pane' });
    // conta fra le azioni del giorno
    expect((await riassunto('04-14', p1)).azioni).toBe(conteggio.azioni + 1);
    ordiniCompatti('04-14');
    await request(app).delete(`/api/compendio/percorso/voci/${nuova.uid}`).expect(204);
  });

  it('senza posizione in fondo; una posizione oltre l\'ultima vuol dire in fondo; in cima con 0', async () => {
    const n = (await fascia('04-15', 'sera')).length;
    const inFondo = (await crea('04-15', { fascia: 'sera', azione: 'In fondo' })).body.data as AzionePercorsoDto;
    const oltre = (await crea('04-15', { fascia: 'sera', azione: 'Oltre', posizione: 400 })).body.data as AzionePercorsoDto;
    const inCima = (await crea('04-15', { fascia: 'sera', azione: 'In cima', posizione: 0 })).body.data as AzionePercorsoDto;
    const sera = await fascia('04-15', 'sera');
    expect(sera.length).toBe(n + 3);
    expect(sera[0].uid).toBe(inCima.uid);
    expect(sera.slice(-2).map((a) => a.uid)).toEqual([inFondo.uid, oltre.uid]);
    ordiniCompatti('04-15');
    for (const v of [inFondo, oltre, inCima]) await request(app).delete(`/api/compendio/percorso/voci/${v.uid}`).expect(204);
    ordiniCompatti('04-15');
  });

  it('un evento si mostra e non si spunta né conta; con la partita non ha stato', async () => {
    const p = await nuovaPartita('Eventi');
    const conteggio = await riassunto('04-14', p);
    const ev = (await crea('04-14', { genere: 'scadenza', fascia: 'sera', azione: 'Consegna del Palazzo', note: 'entro le 23', posizione: 0 })).body.data as AzionePercorsoDto;
    expect(ev).toMatchObject({ genere: 'scadenza', tipo: 'altro', produce: [] });
    const g = await giorno('04-14', p);
    expect(g.azioni.filter((a) => a.fascia === 'sera')[0]).toMatchObject({ uid: ev.uid, stato: null, fatta: false });
    expect((await request(app).put(`/api/partite/${p}/percorso`).send({ uid: ev.uid, fatta: true })).body.error.code).toBe('voce-non-spuntabile');
    expect((await riassunto('04-14', p)).azioni).toBe(conteggio.azioni);
    await request(app).delete(`/api/compendio/percorso/voci/${ev.uid}`).expect(204);
  });

  it('modifica testo, note e fascia di un\'azione della guida per tutte le partite; la spunta resta alla voce', async () => {
    const sera = await fascia('04-12', 'sera');
    const originale = sera[0];
    const p1 = await nuovaPartita('Modifica 1');
    const p2 = await nuovaPartita('Modifica 2');
    await request(app).put(`/api/partite/${p1}/percorso`).send({ uid: originale.uid, fatta: true }).expect(200);

    const r = await modifica(originale.uid, { azione: '  Scaffale del Leblanc: aprire lo scatolone  ', note: 'Da fare prima di dormire', fascia: 'giorno' });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ uid: originale.uid, azione: 'Scaffale del Leblanc: aprire lo scatolone', note: 'Da fare prima di dormire', fascia: 'giorno' });
    // passa in fondo alla fascia nuova; la vecchia si ricompatta
    expect((await fascia('04-12', 'giorno')).at(-1)!.uid).toBe(originale.uid);
    ordiniCompatti('04-12');
    for (const [p, fatta] of [[p1, true], [p2, false]] as const) {
      expect((await giorno('04-12', p)).azioni.find((x) => x.uid === originale.uid)).toMatchObject({ azione: 'Scaffale del Leblanc: aprire lo scatolone', fatta });
    }
    // una modifica parziale tiene gli altri campi; note vuote = nessuna nota; si torna al posto di prima con fascia e posizione
    const solo = (await modifica(originale.uid, { fascia: 'sera', posizione: 0 })).body.data as AzionePercorsoDto;
    expect(solo).toMatchObject({ azione: 'Scaffale del Leblanc: aprire lo scatolone', note: 'Da fare prima di dormire', fascia: 'sera' });
    expect((await fascia('04-12', 'sera'))[0].uid).toBe(originale.uid);
    expect(((await modifica(originale.uid, { note: '   ' })).body.data as AzionePercorsoDto).note).toBeNull();
    await modifica(originale.uid, { azione: originale.azione, note: originale.note }).expect(200);
    await request(app).put(`/api/partite/${p1}/percorso`).send({ uid: originale.uid, fatta: false });
  });

  it('le note sono solo testo: la spunta segue gli effetti della voce', async () => {
    const p = await nuovaPartita('Note');
    const conDote = (await giorno('04-12')).azioni.find((a) => a.produce.some((e) => e.tipo === 'dote' && e.dote === 'conoscenza'))!;
    await modifica(conDote.uid, { note: 'Coraggio +2' }).expect(200);
    const a = (await request(app).put(`/api/partite/${p}/percorso`).send({ uid: conDote.uid, fatta: true })).body.data as AzionePercorsoDto;
    expect(a.effetti?.doti).toEqual([expect.objectContaining({ chiave: 'conoscenza', delta: 2 })]);
    expect(a.stato).not.toBeNull();
    expect(a).toHaveProperty('mappa');
    const doti = (await request(app).get(`/api/partite/${p}/doti`)).body.data as DoteSocialePartitaDto[];
    expect(doti.find((d) => d.chiave === 'conoscenza')!.punti).toBe(0);
    await request(app).put(`/api/partite/${p}/percorso`).send({ uid: conDote.uid, fatta: false });
    await modifica(conDote.uid, { note: conDote.note }).expect(200);
  });

  it('sposta su e giù di un passo nella fascia; ai bordi resta; vale anche per le azioni della guida', async () => {
    const g = await fascia('04-12', 'giorno');
    expect(g.length).toBeGreaterThanOrEqual(3);
    const giu = (await request(app).put(`/api/compendio/percorso/voci/${g[0].uid}/sposta`).send({ verso: 1 })).body.data as AzionePercorsoDto[];
    expect(giu.filter((a) => a.fascia === 'giorno').map((a) => a.uid).slice(0, 2)).toEqual([g[1].uid, g[0].uid]);
    await request(app).put(`/api/compendio/percorso/voci/${g[0].uid}/sposta`).send({ verso: -1 }).expect(200);
    expect((await fascia('04-12', 'giorno')).map((a) => a.uid)).toEqual(g.map((a) => a.uid));
    // in cima non sale, in fondo non scende
    await request(app).put(`/api/compendio/percorso/voci/${g[0].uid}/sposta`).send({ verso: -1 }).expect(200);
    await request(app).put(`/api/compendio/percorso/voci/${g.at(-1)!.uid}/sposta`).send({ verso: 1 }).expect(200);
    expect((await fascia('04-12', 'giorno')).map((a) => a.uid)).toEqual(g.map((a) => a.uid));
    expect((await request(app).put(`/api/compendio/percorso/voci/${g[0].uid}/sposta`).send({ verso: 2 })).status).toBe(400);
    ordiniCompatti('04-12');
  });

  it('eliminare una voce la toglie dalla guida con le sue spunte: non conta e non suggerisce più', async () => {
    const p = await nuovaPartita('Eliminazioni');
    await request(app).put(`/api/partite/${p}/giorno`).send({ data: '04-12' });
    const ryuji = (await giorno('04-12', p)).azioni.find((a) => a.riferimento?.tipo === 'confidente' && a.riferimento.chiave === 'ryuji')!;
    const suggPrima = (await request(app).get(`/api/partite/${p}/suggerimenti`)).body.data as SuggerimentiOggiDto;
    expect(suggPrima.motivi.some((m) => m.azione === ryuji.azione)).toBe(true);
    const spuntata = (await request(app).put(`/api/partite/${p}/percorso`).send({ uid: ryuji.uid, fatta: true }).expect(200)).body.data as AzionePercorsoDto;
    const conteggio = await riassunto('04-12', p);
    // l'incontro con Ryuji è un effetto registrato: con effetti applicati non si elimina, prima si toglie la spunta
    expect(spuntata.effetti).not.toBeNull();
    expect((await request(app).delete(`/api/compendio/percorso/voci/${ryuji.uid}`)).status).toBe(409);
    await request(app).put(`/api/partite/${p}/percorso`).send({ uid: ryuji.uid, fatta: false }).expect(200);
    // e la si rimette senza effetti per provare che una spunta semplice se ne va con la voce
    prepared("INSERT INTO spunta_voce_partita (partita_id, voce_uid, fatta_at, effetti_json) VALUES (?, ?, 't', NULL)").run(p, ryuji.uid);

    expect((await request(app).delete(`/api/compendio/percorso/voci/${ryuji.uid}`)).status).toBe(204);
    const g = await giorno('04-12', p);
    expect(g.azioni.some((a) => a.uid === ryuji.uid)).toBe(false);
    expect(await riassunto('04-12', p)).toMatchObject({ azioni: conteggio.azioni - 1, fatte: conteggio.fatte - 1 });
    expect(prepared('SELECT COUNT(*) AS n FROM spunta_voce_partita WHERE voce_uid = ?').get(ryuji.uid)).toEqual({ n: 0 });
    const sugg = (await request(app).get(`/api/partite/${p}/suggerimenti`)).body.data as SuggerimentiOggiDto;
    expect(sugg.motivi.some((m) => m.azione === ryuji.azione)).toBe(false);
    ordiniCompatti('04-12');
    expect((await request(app).delete(`/api/compendio/percorso/voci/${ryuji.uid}`)).status).toBe(404);
  });

  it('una spunta la cui voce non c\'è più (un pacchetto importato che non l\'ha) è un orfano dichiarato', async () => {
    const p = await nuovaPartita('Orfani');
    prepared("INSERT INTO spunta_voce_partita (partita_id, voce_uid, fatta_at, effetti_json) VALUES (?, ?, 't', NULL)").run(p, 'f'.repeat(32));
    expect(orfaniPartite(getDb())).toEqual(expect.arrayContaining([expect.objectContaining({ tabella: 'spunta_voce_partita', colonna: 'voce_uid', esempi: ['f'.repeat(32)] })]));
    prepared('DELETE FROM spunta_voce_partita WHERE voce_uid = ?').run('f'.repeat(32));
  });

  it('un\'azione spuntata con effetti non diventa un evento; senza effetti sì, e le sue spunte se ne vanno', async () => {
    const p = await nuovaPartita('Genere');
    const conDote = (await giorno('04-12')).azioni.find((a) => a.produce.some((e) => e.tipo === 'dote'))!;
    await request(app).put(`/api/partite/${p}/percorso`).send({ uid: conDote.uid, fatta: true }).expect(200);
    expect((await modifica(conDote.uid, { genere: 'evento' })).body.error.code).toBe('voce-con-effetti');
    await request(app).put(`/api/partite/${p}/percorso`).send({ uid: conDote.uid, fatta: false });
    const semplice = (await crea('04-12', { azione: 'Da provare' })).body.data as AzionePercorsoDto;
    await request(app).put(`/api/partite/${p}/percorso`).send({ uid: semplice.uid, fatta: true }).expect(200);
    expect(((await modifica(semplice.uid, { genere: 'promemoria' })).body.data as AzionePercorsoDto).genere).toBe('promemoria');
    expect(prepared('SELECT COUNT(*) AS n FROM spunta_voce_partita WHERE voce_uid = ?').get(semplice.uid)).toEqual({ n: 0 });
    await request(app).delete(`/api/compendio/percorso/voci/${semplice.uid}`).expect(204);
  });

  // ---- La Guida si modifica al 100%: tipo, collegamento, rango atteso, effetti ----

  it('modifica tipo, collegamento, rango atteso ed effetti; il nome del collegamento lo dà il server', async () => {
    const prima = (await giorno('04-26')).azioni.find((a) => a.produce.some((e) => e.tipo === 'turno' && e.attivita === 'lavoro-rafflesia'))!;
    expect(prima.produceTesto).toEqual(['Turno: Fioraio Rafflesia']);
    const r = await modifica(prima.uid, { tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, rangoAtteso: 2, produce: [{ tipo: 'dote', dote: 'coraggio', note: 1 }] });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({
      tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, riferimentoTesto: 'Tae Takemi - Morte', rangoAtteso: 2,
      produce: [{ tipo: 'dote', dote: 'coraggio', note: 1 }], produceTesto: ['Coraggio, 1 nota'],
    });
    const p = await nuovaPartita('Guida al 100%');
    const a = (await request(app).put(`/api/partite/${p}/percorso`).send({ uid: prima.uid, fatta: true })).body.data as AzionePercorsoDto;
    expect(a.effetti).toMatchObject({ doti: [{ chiave: 'coraggio', delta: 2 }] });
    expect(a.effetti?.turni).toBeUndefined();
    expect(prepared("SELECT COUNT(*) AS n FROM attivita_svolta_partita WHERE partita_id = ? AND attivita_chiave = 'lavoro-rafflesia'").get(p)).toEqual({ n: 0 });
    await request(app).put(`/api/partite/${p}/percorso`).send({ uid: prima.uid, fatta: false });
    expect((await modifica(prima.uid, { riferimento: null })).body.data).toMatchObject({ riferimento: null, riferimentoTesto: null });
    await modifica(prima.uid, { tipo: prima.tipo, riferimento: prima.riferimento, rangoAtteso: prima.rangoAtteso, produce: prima.produce }).expect(200);
    expect((await giorno('04-26')).azioni.find((x) => x.uid === prima.uid)).toMatchObject({ tipo: prima.tipo, riferimento: prima.riferimento, produce: prima.produce });
  });

  it('il bagno del 25 aprile si porta a due note: la spunta dice 3 punti di Fascino (da segnare a mano)', async () => {
    const bagno = (await giorno('04-25')).azioni.find((a) => /Bagno pubblico/.test(a.azione))!;
    expect(bagno.produce).toEqual([{ tipo: 'dote', dote: 'fascino', note: 3 }]);
    await modifica(bagno.uid, { produce: [{ tipo: 'dote', dote: 'fascino', note: 2 }] }).expect(200);
    const p = await nuovaPartita('Bagno');
    const a = (await request(app).put(`/api/partite/${p}/percorso`).send({ uid: bagno.uid, fatta: true }).expect(200)).body.data as AzionePercorsoDto;
    expect(a.effetti?.doti).toEqual([expect.objectContaining({ chiave: 'fascino', delta: 3, note: 2 })]);
    await request(app).put(`/api/partite/${p}/percorso`).send({ uid: bagno.uid, fatta: false });
    await modifica(bagno.uid, { produce: bagno.produce }).expect(200);
  });

  it('validazione: un collegamento o un effetto che punta al nulla non si salva; testo, fascia, uid e giorno controllati', async () => {
    const uid = (await giorno('04-12')).azioni[0].uid;
    const put = (body: object) => modifica(uid, body);
    expect((await put({ riferimento: { tipo: 'confidente', chiave: 'nessuno' } })).body.error.code).toBe('riferimento-inesistente');
    expect((await put({ riferimento: { tipo: 'pianeta', chiave: 'x' } })).status).toBe(400);
    expect((await put({ tipo: 'boh' })).status).toBe(400);
    expect((await put({ rangoAtteso: 11 })).status).toBe(400);
    expect((await put({ produce: [{ tipo: 'lettura', categoria: 'libro', chiave: 'libro-inesistente', almeno: null }] })).body.error.code).toBe('effetto-inesistente');
    expect((await put({ produce: [{ tipo: 'turno', attivita: 'studio-leblanc' }] })).body.error.code).toBe('effetto-non-valido');
    expect((await put({ produce: [{ tipo: 'dote', dote: 'fascino', note: 4 }] })).body.error.code).toBe('effetto-non-valido');
    expect((await put({})).status).toBe(400);
    expect((await put({ azione: '   ' })).status).toBe(400);
    expect((await put({ fascia: 'notte' })).status).toBe(400);
    expect((await put({ genere: 'festa' })).status).toBe(400);
    expect((await modifica('0'.repeat(32), { azione: 'x' })).status).toBe(404);
    expect((await modifica('non-un-uid', { azione: 'x' })).status).toBe(400);
    expect((await crea('aprile', { azione: 'x' })).status).toBe(400);
    expect((await crea('13-40', { azione: 'x' })).status).toBe(404);
    expect((await crea('04-12', { azione: '' })).status).toBe(400);
    expect((await crea('04-12', { azione: 'x', posizione: -1 })).status).toBe(400);
    expect((await crea('04-12', { azione: 'x', riferimento: { tipo: 'confidente', chiave: 'nessuno' } })).body.error.code).toBe('riferimento-inesistente');
    // una partita inesistente si scopre prima di scrivere: 404 e la guida non cambia
    const prima = prepared('SELECT uid, fascia, ordine, azione, note FROM voce_giornata WHERE data = ? ORDER BY uid').all('04-12');
    expect((await request(app).post('/api/compendio/percorso/04-12/voci?partita=99999').send({ azione: 'Non deve restare' })).status).toBe(404);
    expect((await request(app).put(`/api/compendio/percorso/voci/${uid}?partita=99999`).send({ azione: 'Non deve restare' })).status).toBe(404);
    expect((await request(app).put(`/api/compendio/percorso/voci/${uid}/sposta?partita=99999`).send({ verso: 1 })).status).toBe(404);
    expect(prepared('SELECT uid, fascia, ordine, azione, note FROM voce_giornata WHERE data = ? ORDER BY uid').all('04-12')).toEqual(prima);
  });

  it('la finestra rimanda tutti i campi: modificare una nota riesce anche se il libro collegato è stato nascosto dal catalogo', async () => {
    const zorro = (await giorno('04-25')).azioni.find((a) => a.produce.some((e) => e.tipo === 'lettura' && e.chiave === 'zorro-il-fuorilegge'))!;
    const corpo = (note: string) => ({ azione: zorro.azione, note, fascia: zorro.fascia, tipo: zorro.tipo, riferimento: zorro.riferimento, rangoAtteso: zorro.rangoAtteso, produce: zorro.produce });
    prepared("UPDATE libro SET nascosto = 1 WHERE chiave IN ('zorro-il-fuorilegge', 'la-ballerina-seducente')").run();
    try {
      const r = await modifica(zorro.uid, corpo('Nota mia'));
      expect(r.status).toBe(200);
      expect(r.body.data).toMatchObject({ note: 'Nota mia', riferimento: zorro.riferimento, riferimentoTesto: zorro.riferimentoTesto, produce: zorro.produce });
      expect((await modifica(zorro.uid, corpo('Nota mia, ancora'))).status).toBe(200);
      expect((await modifica(zorro.uid, { produce: [...zorro.produce, { tipo: 'lettura', categoria: 'libro', chiave: 'la-ballerina-seducente', almeno: 1 }] })).body.error.code).toBe('effetto-inesistente');
    } finally {
      prepared("UPDATE libro SET nascosto = 0 WHERE chiave IN ('zorro-il-fuorilegge', 'la-ballerina-seducente')").run();
      await modifica(zorro.uid, { note: zorro.note });
    }
  });

  it('ogni voce della guida, rimandata invariata come fa la finestra, risponde 200 e resta com\'era', async () => {
    const prima = prepared('SELECT uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, rango_atteso, produce_json FROM voce_giornata ORDER BY uid').all();
    const indice = (await request(app).get('/api/compendio/percorso')).body.data as PercorsoIndiceDto;
    const rifiutate: string[] = [];
    let provate = 0;
    for (const gg of indice.giorni) {
      for (const a of (await giorno(gg.giorno)).azioni) {
        const r = await modifica(a.uid, { azione: a.azione, note: a.note, fascia: a.fascia, tipo: a.tipo, riferimento: a.riferimento, rangoAtteso: a.rangoAtteso, produce: a.produce });
        provate++;
        if (r.status !== 200) rifiutate.push(`${gg.giorno}/${a.uid} ${r.status} ${JSON.stringify(r.body.error)}`);
      }
    }
    expect(rifiutate).toEqual([]);
    expect(provate).toBeGreaterThan(900);
    expect(prepared('SELECT uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, rango_atteso, produce_json FROM voce_giornata ORDER BY uid').all()).toEqual(prima);
  }, 180_000);

  it('il nome di un collegamento scelto dall\'utente segue le rinomine del pacchetto', async () => {
    const v = (await giorno('04-12')).azioni[0];
    await modifica(v.uid, { riferimento: { tipo: 'confidente', chiave: 'takemi' } }).expect(200);
    const nome = (prepared("SELECT nome FROM confidente WHERE chiave = 'takemi'").get() as { nome: string }).nome;
    prepared("UPDATE confidente SET nome = 'Tae Takemi (rinominata)' WHERE chiave = 'takemi'").run();
    try {
      expect((await giorno('04-12')).azioni.find((a) => a.uid === v.uid)!.riferimentoTesto).toBe('Tae Takemi (rinominata) - Morte');
    } finally {
      prepared("UPDATE confidente SET nome = ? WHERE chiave = 'takemi'").run(nome);
      await modifica(v.uid, { riferimento: v.riferimento });
    }
  });

  it('gli elenchi per la finestra: Confidenti con l\'arcano, attività con i turni solo se contate per volte', async () => {
    const e = (await request(app).get('/api/compendio/percorso-elenchi')).body.data as ElenchiAzioneDto;
    expect(e.confidenti.find((c) => c.chiave === 'takemi')).toEqual({ chiave: 'takemi', nome: 'Tae Takemi', dettaglio: 'Morte' });
    expect(e.attivita.find((a) => a.chiave === 'lavoro-rafflesia')?.turni).toBe(true);
    expect(e.attivita.find((a) => a.chiave === 'studio-leblanc')?.turni).toBe(false);
    expect(e.libri.some((l) => l.chiave === 'zorro-il-fuorilegge')).toBe(true);
    expect(e.doti.map((d) => d.chiave)).toEqual(expect.arrayContaining(['conoscenza', 'coraggio', 'fascino', 'gentilezza', 'perizia']));
  });
});
