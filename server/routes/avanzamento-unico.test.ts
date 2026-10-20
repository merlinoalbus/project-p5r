// ============================================================
// L4 «Avanzamento unico» (2026-10-20) — dal §8.11 (NR4-1) ogni pin tiene il suo segno e la voce lo calcola dai suoi pin (k/N); oggetti
// permanenti come unità di conteggio, rigenerabili per infiltrazione,
// racconti col loro segno, divergenze «da verificare», completamento con la funzione unica, schede senza mappa assorbite, copie
// (lotti/L4/modifiche.md §0-§3, piano dei test §6.1)
// ============================================================

import request from 'supertest';
import { closeDb, getDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { modelloAvanzamento, pinFattoPerLaVoce, statiDellaPartita, voceDaiPin, voceFatta } from '../services/mappe/statiGuida.js';
import type { DivergenzaDto, DungeonDettaglioDto, MappaDto, PuntoInteresseDto } from '../../shared/types.js';
import type { ContenutiMappaDto } from '../../shared/organizzazioneMappe.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

describe('L4 — avanzamento unico', () => {
  let partita: number;
  let inf: string[];
  let pin: Array<{ id: number; uid: string; mappa: string }>;
  /** Crea una voce nell'infiltrazione data, pretende il 201 e la restituisce. */
  const nuova = async (infiltrazione: string, nome: string, tipo: string) => (await request(app).post(`/api/compendio/aree/${infiltrazione}/punti`).send({ nome, tipo }).expect(201)).body.data as PuntoInteresseDto;
  const collega = (voce: string, p: number) => request(app).put(`/api/compendio/punti/${encodeURIComponent(voce)}/pin/${p}`).expect(200);
  const scollega = (voce: string, p: number) => request(app).delete(`/api/compendio/punti/${encodeURIComponent(voce)}/pin/${p}`).expect(200);
  const stato = (punto: string, s: string | null) => request(app).put(`/api/partite/${partita}/punti`).send({ punto, stato: s });
  const segnaPin = (p: number, raccolto: boolean, infiltrazione?: string) => request(app).put(`/api/partite/${partita}/spilli/${p}`).send({ raccolto, ...(infiltrazione ? { infiltrazione } : {}) }).expect(200);
  const riga = (punto: string) => (prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partita, punto) as { stato: string } | undefined)?.stato ?? null;
  const scheda = async (q = '') => (await request(app).get(`/api/compendio/dungeon/kamoshida?partita=${partita}${q}`).expect(200)).body.data as DungeonDettaglioDto;
  const voceDi = (s: DungeonDettaglioDto, k: string) => s.aree.flatMap((a) => a.punti).find((p) => p.chiave === k)!;
  /** Il pin com'è sulla sua planimetria (con la partita e, se dato, il contesto). */
  const sullaMappa = async (p: { id: number; mappa: string }, infiltrazione?: string) => ((await request(app).get(`/api/mappe/${p.mappa}?partita=${partita}${infiltrazione ? `&infiltrazione=${infiltrazione}` : ''}`).expect(200)).body.data as MappaDto).spilli.find((s) => s.id === p.id)!;

  beforeAll(async () => {
    dbDiProva();
    partita = ((await request(app).post('/api/partite').send({ nome: 'Avanzamento unico' })).body.data as { id: number }).id;
    inf = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine").pluck().all() as string[];
    pin = prepared(`SELECT s.id, s.uid, s.mappa_chiave AS mappa FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave WHERE m.genitore_chiave = 'dungeon-kamoshida' AND s.uid IS NOT NULL
      AND s.riferimento_tipo IS NULL AND s.tipo NOT IN ('nemico', 'passaggio', 'scala') AND NOT EXISTS (SELECT 1 FROM spillo_voce sv WHERE sv.spillo_id = s.id) ORDER BY s.id LIMIT 8`).all() as typeof pin;
    expect(pin).toHaveLength(8);
  });
  afterAll(() => closeDb());

  it('§1.3, §8.11 — due voci permanenti sullo stesso pin in infiltrazioni diverse: il pin condiviso le fa fatte insieme (segnata nella 2 → fatta nella 4, riaperta nella 4 → riaperta nella 2) e contano come un oggetto solo; due voci uguali su pin diversi restano indipendenti', async () => {
    const a = await nuova(inf[1], 'Forziere condiviso', 'forziere');
    const b = await nuova(inf[3], 'Forziere condiviso', 'forziere');
    const c = await nuova(inf[3], 'Forziere condiviso', 'forziere');
    await collega(a.chiave, pin[0].id);
    await collega(b.chiave, pin[0].id);
    await collega(c.chiave, pin[1].id);
    const oggettiPrima = (await scheda()).completamento!;
    const segnata = (await stato(a.chiave, 'ottenuto').expect(200)).body.data as PuntoInteresseDto;
    // §8.11: la risposta dice l'altra voce diventata fatta; lo specchio c'è anche per lei
    expect(segnata.effetti?.segnate.map((v) => [v.chiave, v.infiltrazione.chiave])).toEqual([[b.chiave, inf[3]]]);
    let s = await scheda();
    expect(voceDi(s, b.chiave)).toMatchObject({ stato: 'ottenuto', carattere: 'permanente', oggetto: [a.chiave, b.chiave].sort()[0], avanzamento: { fatti: 1, totale: 1 } });
    expect(voceDi(s, c.chiave)).toMatchObject({ stato: null, oggetto: null });
    expect(riga(b.chiave)).toBe('ottenuto');
    // l'oggetto conta una volta (R4-24)
    expect(s.completamento!.fatti).toBe(oggettiPrima.fatti! + 1);
    expect((await sullaMappa(pin[0])).raccolto).toBe(true);
    // riaperta nella 4: il pin perde il segno, e si riapre anche nella 2
    await stato(b.chiave, null).expect(200);
    s = await scheda();
    expect([voceDi(s, a.chiave).stato, voceDi(s, b.chiave).stato, riga(a.chiave)]).toEqual([null, null, null]);
    expect((await sullaMappa(pin[0])).raccolto).toBe(false);
    // dal pin: un gesto le fa fatte tutte e due, toglierlo le riapre
    await segnaPin(pin[0].id, true);
    expect([voceDi(await scheda(), a.chiave).stato, voceDi(await scheda(), b.chiave).stato]).toEqual(['ottenuto', 'ottenuto']);
    await segnaPin(pin[0].id, false);
    expect([riga(a.chiave), riga(b.chiave)]).toEqual([null, null]);
    for (const [v, p] of [[a.chiave, pin[0].id], [b.chiave, pin[0].id], [c.chiave, pin[1].id]] as const) await scollega(v, p);
  });

  it('§1.4 — un pin di rigenerabili di più infiltrazioni mostra lo stato del contesto (guardata, altrimenti in corso; se manca, la più recente prima); segnarlo tocca solo quella', async () => {
    const o2 = await nuova(inf[1], 'Oggetto che si ripropone', 'oggetto');
    const o4 = await nuova(inf[3], 'Oggetto che si ripropone', 'oggetto');
    await collega(o2.chiave, pin[2].id);
    await collega(o4.chiave, pin[2].id);
    await stato(o2.chiave, 'ottenuto').expect(200);
    // la voce della 4 resta da fare: un oggetto raccolto nella 2 si ripropone
    expect(voceDi(await scheda(), o4.chiave)).toMatchObject({ stato: null, carattere: 'rigenerabile' });
    const nella2 = await sullaMappa(pin[2], inf[1]);
    expect(nella2).toMatchObject({ raccolto: true, contestoInfiltrazione: { chiave: inf[1] } });
    expect((await sullaMappa(pin[2], inf[3]))).toMatchObject({ raccolto: false, contestoInfiltrazione: { chiave: inf[3] } });
    // guardando la 5 (il pin non ne ha): la più recente prima, la 4
    expect((await sullaMappa(pin[2], inf[4])).contestoInfiltrazione?.chiave).toBe(inf[3]);
    // senza contesto: l'infiltrazione in corso della partita (la prima non completata, inf[0], che ha oggetti permanenti da fare) → il pin
    // non ha voci lì né prima → la sua prima, inf[1]
    expect((await sullaMappa(pin[2])).contestoInfiltrazione?.chiave).toBe(inf[1]);
    // segnare il pin nel contesto della 4 segna solo la voce della 4
    await segnaPin(pin[2].id, true, inf[3]);
    expect([riga(o2.chiave), riga(o4.chiave)]).toEqual(['ottenuto', 'ottenuto']);
    await segnaPin(pin[2].id, false, inf[1]);
    expect([riga(o2.chiave), riga(o4.chiave)]).toEqual([null, 'ottenuto']);
    await stato(o4.chiave, null).expect(200);
    await scollega(o2.chiave, pin[2].id);
    await scollega(o4.chiave, pin[2].id);
  });

  it('§0, §1.6 — un pin di sole voci di racconto ha il suo stato; «esaurito» solo se esauribile, e togliere il segno dal pin lo riapre', async () => {
    const st = await nuova(inf[1], 'Racconto', 'storia');
    await collega(st.chiave, pin[3].id);
    await stato(st.chiave, 'ottenuto').expect(200);
    expect(await sullaMappa(pin[3])).toMatchObject({ raccolto: false, statoProprio: true });
    await segnaPin(pin[3].id, true);
    expect([(await sullaMappa(pin[3])).raccolto, riga(st.chiave)]).toEqual([true, 'ottenuto']);
    await segnaPin(pin[3].id, false);
    await stato(st.chiave, null).expect(200);
    await scollega(st.chiave, pin[3].id);
    // esaurito
    const f = await nuova(inf[1], 'Forziere esauribile', 'forziere');
    const no = await stato(f.chiave, 'esaurito');
    expect([no.status, no.body.error.code]).toEqual([400, 'voce-non-esauribile']);
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(f.chiave)}`).send({ esauribile: true }).expect(200);
    await stato(f.chiave, 'esaurito').expect(200);
    await collega(f.chiave, pin[4].id);
    expect((await sullaMappa(pin[4])).voci[0]).toMatchObject({ stato: 'esaurito', carattere: 'permanente', infiltrazione: { chiave: inf[1] } });
    await segnaPin(pin[4].id, false);
    expect(riga(f.chiave)).toBeNull();
    // un «esaurito» rimasto su una voce che non è più esauribile si legge «ottenuto» (la riga non si riscrive)
    await stato(f.chiave, 'esaurito').expect(200);
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(f.chiave)}`).send({ esauribile: false }).expect(200);
    expect([voceDi(await scheda(), f.chiave).stato, riga(f.chiave)]).toEqual(['ottenuto', 'esaurito']);
    await stato(f.chiave, null).expect(200);
    await scollega(f.chiave, pin[4].id);
  });

  it('§1.1, R4-08 — il carattere si sceglie e si ripristina senza riscrivere stati; non per dedali e Persona', async () => {
    const f = await nuova(inf[2], 'Forziere che racconta', 'forziere');
    const prima = (await scheda()).completamento!.oggetti;
    await stato(f.chiave, 'ottenuto').expect(200);
    const resa = (await request(app).put(`/api/compendio/punti/${encodeURIComponent(f.chiave)}`).send({ carattere: 'descrittiva' }).expect(200)).body.data as PuntoInteresseDto;
    expect(resa).toMatchObject({ carattere: 'descrittiva', carattereScelto: true });
    expect((await scheda()).completamento!.oggetti).toBe(prima - 1);
    expect(riga(f.chiave)).toBe('ottenuto');
    const ripristinata = (await request(app).put(`/api/compendio/punti/${encodeURIComponent(f.chiave)}`).send({ carattere: null }).expect(200)).body.data as PuntoInteresseDto;
    expect(ripristinata).toMatchObject({ carattere: 'permanente', carattereScelto: false });
    expect((await scheda()).completamento!.oggetti).toBe(prima);
    const memento = prepared("SELECT chiave FROM punto_interesse WHERE area_dedalo_chiave IS NOT NULL LIMIT 1").pluck().get() as string;
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(memento)}`).send({ carattere: 'permanente' })).body.error.code).toBe('carattere-non-ammesso');
    await stato(f.chiave, null).expect(200);
  });

  it('§3.2, R4-14 — le divergenze conservate: elenco, «Segna la voce» e «Togli il fatto al pin»; dopo una sequenza di gesti misti nessuna divergenza nuova', async () => {
    const f = await nuova(inf[1], 'Forziere da verificare', 'forziere');
    const g = await nuova(inf[1], 'Porta da verificare', 'porta');
    // §8.11: le divergenze di p1 sono voci con più pin (uno raccolto, la voce non segnata): ognuna ha due pin
    await collega(f.chiave, pin[5].id);
    await collega(f.chiave, pin[4].id);
    await collega(g.chiave, pin[6].id);
    await collega(g.chiave, pin[3].id);
    // come le avrebbe lasciate la migrazione utente 022: il segno di prima del pin, la voce non segnata
    for (const [p, v] of [[pin[5], f.chiave], [pin[6], g.chiave]] as const) {
      prepared("INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, ?, 1, 'x') ON CONFLICT(partita_id, spillo_uid) DO UPDATE SET raccolto = 1").run(partita, p.uid);
      prepared("INSERT INTO divergenza_partita (partita_id, spillo_uid, voce_chiave, rilevata_il) VALUES (?, ?, ?, 'x')").run(partita, p.uid, v);
    }
    const elenco = (await request(app).get(`/api/partite/${partita}/divergenze?dungeon=kamoshida`).expect(200)).body.data as DivergenzaDto[];
    expect(elenco.map((d) => [d.spillo, d.voce])).toEqual([[pin[5].id, f.chiave], [pin[6].id, g.chiave]]);
    expect(await sullaMappa(pin[5])).toMatchObject({ raccolto: true, daVerificare: true });
    let s = await scheda();
    expect(s.daVerificare).toBe(2);
    // la voce è «in corso» (1/2) e tiene il chip finché l'utente non fa un gesto (§8.11 punto 6)
    expect(voceDi(s, f.chiave)).toMatchObject({ stato: null, daVerificare: true, avanzamento: { fatti: 1, totale: 2 } });
    // «Segna la voce»: segna tutti i suoi pin, e la divergenza se ne va
    await stato(f.chiave, 'ottenuto').expect(200);
    // «Togli il fatto al pin»: il segno del pin si toglie, la voce resta com'è (da fare)
    await request(app).delete(`/api/partite/${partita}/divergenze/${pin[6].uid}`).expect(204);
    await request(app).delete(`/api/partite/${partita}/divergenze/${pin[6].uid}`).expect(404);
    s = await scheda();
    expect([s.daVerificare, riga(f.chiave), riga(g.chiave)]).toEqual([0, 'ottenuto', null]);
    expect(voceDi(s, g.chiave).avanzamento).toEqual({ fatti: 0, totale: 2 });
    expect(await sullaMappa(pin[6])).toMatchObject({ raccolto: false, daVerificare: false });
    // una sequenza di gesti misti: segna voce, segna pin, collega, scollega, copia, elimina, cestino, carattere
    await segnaPin(pin[6].id, true);
    await collega(g.chiave, pin[7].id);
    await stato(g.chiave, null).expect(200);
    await segnaPin(pin[7].id, true);
    await scollega(g.chiave, pin[7].id);
    await request(app).post('/api/compendio/punti/copia-in-area').send({ chiavi: [f.chiave], area: inf[3] }).expect(201);
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(f.chiave)}`).send({ carattere: 'descrittiva' }).expect(200);
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(f.chiave)}`).send({ carattere: null }).expect(200);
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(g.chiave)}`).expect(204);
    // il controllo dei dati (§8.11): nessuna divergenza nuova, e ogni voce con pin è fatta se e solo se lo sono tutti i suoi pin, con
    // lo specchio (`punto_partita`) presente se e solo se è fatta
    expect(prepared('SELECT COUNT(*) FROM divergenza_partita WHERE partita_id = ?').pluck().get(partita)).toBe(0);
    const m = modelloAvanzamento(getDb());
    const st = statiDellaPartita(getDb(), m, partita);
    let controllate = 0;
    for (const [voce, pinDellaVoce] of m.pinDellaVoce) {
      if (!voceDaiPin(m, voce)) continue;
      const fatta = pinDellaVoce.every((p) => pinFattoPerLaVoce(m, st, p, m.voci.get(voce)!.infiltrazione));
      expect([voce, voceFatta(m, st, voce)]).toEqual([voce, fatta]);
      expect([voce, st.segnate.has(voce)]).toEqual([voce, fatta]);
      controllate++;
    }
    expect(controllate).toBeGreaterThan(0);
  });

  it('§1.5 — completamento: infiltrazione, planimetria e Area con la funzione unica; il Palazzo con oggetti, Tesoro e boss', async () => {
    const s = await scheda();
    expect(s.completamento).toMatchObject({ oggetti: expect.any(Number), fatti: expect.any(Number), tesoro: false, boss: false, concluso: false, completato: false });
    for (const a of s.aree) expect(a.completamento).toEqual({ oggetti: expect.any(Number), fatti: expect.any(Number), completata: a.completamento!.oggetti > 0 && a.completamento!.fatti! >= a.completamento!.oggetti });
    // una planimetria senza oggetti permanenti è completata; un'Area del Palazzo pure
    expect(s.planimetrie.filter((p) => p.completamento!.oggetti === 0).every((p) => p.completamento!.completata)).toBe(true);
    expect(s.areePalazzo!.every((a) => a.completamento!.completata === (a.completamento!.fatti! >= a.completamento!.oggetti))).toBe(true);
    // l'elenco delle Aree del Palazzo dice lo stesso completamento della scheda
    const elenco = (await request(app).get(`/api/aree/dungeon/kamoshida?partita=${partita}`).expect(200)).body.data as Array<{ chiave: string; completamento?: unknown }>;
    expect(elenco.map((a) => [a.chiave, a.completamento])).toEqual(s.areePalazzo!.map((a) => [a.chiave, a.completamento]));
    expect(s.areePalazzo!.some((a) => a.completamento!.oggetti > 0)).toBe(true);
    // senza partita: i soli numeri
    const senza = (await request(app).get('/api/compendio/dungeon/kamoshida').expect(200)).body.data as DungeonDettaglioDto;
    expect(senza.completamento).toEqual({ oggetti: s.completamento!.oggetti, fatti: null, tesoro: null, boss: null, concluso: null, completato: null });
    expect(senza.daVerificare).toBeNull();
    // i Memento non hanno i campi di L4
    const m = (await request(app).get(`/api/compendio/dungeon/mementos?partita=${partita}`).expect(200)).body.data as DungeonDettaglioDto;
    expect(['completamento', 'daVerificare', 'schedeDaSistemare', 'concluso'].filter((k) => k in m)).toEqual([]);
    expect(m.aree.flatMap((a) => a.punti).filter((p) => 'carattere' in p)).toEqual([]);
  });

  it('§2.3 — le schede senza mappa: assorbite nella voce nei contenuti della guida; quelle senza voce da sistemare («Collega a una voce», «Crea la voce»)', async () => {
    const legata = prepared("SELECT s.id, s.riferimento_chiave AS voce, s.area_guida_chiave AS area FROM spillo s JOIN dungeon_area a ON a.chiave = s.area_guida_chiave WHERE s.mappa_chiave IS NULL AND s.riferimento_tipo = 'punto' AND a.dungeon_chiave = 'kamoshida' LIMIT 1").get() as { id: number; voce: string; area: string } | undefined;
    const mappa = prepared("SELECT chiave FROM mappa WHERE chiave = 'dungeon-kamoshida'").pluck().get() as string;
    const contenuti = (await request(app).get(`/api/mappe/contenuti/${mappa}?partita=${partita}`).expect(200)).body.data as ContenutiMappaDto;
    const punti = contenuti.aree.flatMap((a) => a.punti);
    // nessuna scheda come elemento a sé: solo voci
    expect(punti.every((p) => typeof p.id === 'string' && String(p.id).startsWith('punto:') && !p.scheda)).toBe(true);
    if (legata) expect(punti.find((p) => p.id === `punto:${legata.voce}`)).toMatchObject({ carattere: expect.anything() });
    // una scheda da sistemare, fatta apposta
    const area = inf[1];
    prepared("INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, collezionabile, ordine, origine, updated_at, area_guida_chiave, ruolo_guida, uid) VALUES (NULL, 'forziere', 'Scheda orfana', 'Senza voce', 11, 22, 1, 0, 'seed', 'x', ?, 'punto', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')").run(area);
    const id = prepared("SELECT id FROM spillo WHERE uid = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'").pluck().get() as number;
    expect((await scheda()).schedeDaSistemare!.find((x) => x.id === id)).toEqual({ id, nome: 'Scheda orfana', descrizione: 'Senza voce', tipo: 'forziere', infiltrazione: area, infiltrazioneNome: expect.any(String), posizione: { x: 11, y: 22 } });
    // la scheda segnata nella partita: «Crea la voce» non trasferisce lo stato (§8.8)
    prepared("INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 1, 'x')").run(partita);
    const creata = (await request(app).post(`/api/compendio/schede/${id}/voce`).send({ tipo: 'forziere' }).expect(201)).body.data as PuntoInteresseDto;
    expect(creata).toMatchObject({ nome: 'Scheda orfana', descrizione: 'Senza voce', tipo: 'forziere', marcatore: { x: 11, y: 22 } });
    expect([riga(creata.chiave), voceDi(await scheda(), creata.chiave).stato]).toEqual([null, null]);
    expect((await scheda()).schedeDaSistemare!.some((x) => x.id === id)).toBe(false);
    expect((await request(app).put(`/api/compendio/schede/${id}/voce`).send({ voce: creata.chiave })).status).toBe(409);
    // «Collega a una voce» di un altro Palazzo si rifiuta
    prepared("INSERT INTO spillo (mappa_chiave, tipo, nome, descrizione, x, y, collezionabile, ordine, origine, updated_at, area_guida_chiave, ruolo_guida, uid) VALUES (NULL, 'forziere', 'Altra orfana', '', 1, 2, 1, 0, 'seed', 'x', ?, 'punto', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')").run(area);
    const id2 = prepared("SELECT id FROM spillo WHERE uid = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'").pluck().get() as number;
    const altrove = prepared("SELECT p.chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE a.dungeon_chiave = 'madarame' LIMIT 1").pluck().get() as string;
    expect((await request(app).put(`/api/compendio/schede/${id2}/voce`).send({ voce: altrove })).body.error.code).toBe('voce-di-un-altro-palazzo');
    // «Collega a una voce» del suo Palazzo, con la scheda segnata: nessuno stato trasferito
    prepared("INSERT INTO spillo_partita (partita_id, spillo_uid, raccolto, updated_at) VALUES (?, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 1, 'x')").run(partita);
    const qui = (await request(app).put(`/api/compendio/schede/${id2}/voce`).send({ voce: creata.chiave }).expect(200)).body.data as PuntoInteresseDto;
    expect(qui.chiave).toBe(creata.chiave);
    expect(riga(creata.chiave)).toBeNull();
    await request(app).put('/api/compendio/schede/999999/voce').send({ voce: creata.chiave }).expect(404);
  });

  // ---- §8.11 (NR4-1): ogni pin tiene il suo stato ----
  /** Lo specchio è coerente in tutta la partita: ogni voce con pin ha la riga di `punto_partita` se e solo se è fatta. */
  const specchioCoerente = () => {
    const m = modelloAvanzamento(getDb());
    const st = statiDellaPartita(getDb(), m, partita);
    return [...m.pinDellaVoce.keys()].filter((v) => voceDaiPin(m, v) && st.voci.get(v)!.fatta !== st.segnate.has(v));
  };

  it('§8.11 — «Installazioni Artistiche»: raccoglierne una porta la voce a 1/8 e lascia gli altri 7 pin; «Segna» li segna tutti; togliere un pin la porta a 7/8 e toglie lo specchio', async () => {
    const voce = await nuova(inf[1], 'Raccogli e depreda le Installazioni', 'forziere');
    const otto: Array<{ id: number; uid: string; mappa: string }> = [];
    for (let i = 0; i < 8; i++) {
      const s = (await request(app).post(`/api/mappe/${pin[0].mappa}/spilli`).send({ tipo: 'forziere', nome: `Installazione ${i + 1}`, x: 10 + i, y: 10 }).expect(201)).body.data as { id: number; uid: string };
      otto.push({ id: s.id, uid: s.uid, mappa: pin[0].mappa });
      await collega(voce.chiave, s.id);
    }
    const fatti = async () => (await Promise.all(otto.map((p) => sullaMappa(p)))).map((s) => s.raccolto);
    // una raccolta: 1/8, gli altri 7 pin invariati, la voce non è fatta
    await segnaPin(otto[0].id, true);
    expect(await fatti()).toEqual([true, false, false, false, false, false, false, false]);
    expect(voceDi(await scheda(), voce.chiave)).toMatchObject({ stato: null, avanzamento: { fatti: 1, totale: 8 } });
    expect(riga(voce.chiave)).toBeNull();
    // «Segna» sulla voce: tutti gli 8 pin
    await stato(voce.chiave, 'ottenuto').expect(200);
    expect(await fatti()).toEqual(Array(8).fill(true));
    expect(voceDi(await scheda(), voce.chiave)).toMatchObject({ stato: 'ottenuto', avanzamento: { fatti: 8, totale: 8 } });
    // tolto un pin: 7/8, lo specchio sparisce
    await segnaPin(otto[3].id, false);
    expect(voceDi(await scheda(), voce.chiave)).toMatchObject({ stato: null, avanzamento: { fatti: 7, totale: 8 } });
    expect(riga(voce.chiave)).toBeNull();
    // eliminato il pin che mancava, la voce ha tutti i suoi pin fatti: è fatta, con lo specchio
    await request(app).delete(`/api/mappe/spilli/${otto[3].id}`).expect(204);
    expect([voceDi(await scheda(), voce.chiave).avanzamento, riga(voce.chiave)]).toEqual([{ fatti: 7, totale: 7 }, 'ottenuto']);
    expect(specchioCoerente()).toEqual([]);
    await stato(voce.chiave, null).expect(200);
    for (const p of otto.filter((_, i) => i !== 3)) await request(app).delete(`/api/mappe/spilli/${p.id}`).expect(204);
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(voce.chiave)}`).expect(204);
  });

  it('§8.11 — lo specchio resta coerente dopo il cestino (una voce rimessa dopo che un suo pin ha perso il segno) e dopo l’import delle mappe', async () => {
    const voce = await nuova(inf[2], 'Forziere del cestino', 'forziere');
    await collega(voce.chiave, pin[1].id);
    await collega(voce.chiave, pin[2].id);
    await stato(voce.chiave, 'ottenuto').expect(200);
    expect(riga(voce.chiave)).toBe('ottenuto');
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(voce.chiave)}`).expect(204);
    // dopo l'eliminazione un pin perde il segno: rimettendo la voce, la sua riga (dal cestino) non vale più — la voce è in corso
    await segnaPin(pin[2].id, false);
    const elenco = (await request(app).get('/api/impostazioni/cestino').expect(200)).body.data as Array<{ id: number; chiave: string }>;
    await request(app).post(`/api/impostazioni/cestino/${elenco.find((v) => v.chiave === voce.chiave)!.id}/ripristina`).expect(200);
    expect([riga(voce.chiave), voceDi(await scheda(), voce.chiave).avanzamento]).toEqual([null, { fatti: 1, totale: 2 }]);
    expect(specchioCoerente()).toEqual([]);
    // l'import delle mappe (andata e ritorno): i segni dei pin e lo specchio restano come sono
    await segnaPin(pin[2].id, true);
    expect(riga(voce.chiave)).toBe('ottenuto');
    const { esportaMappe, importaMappe } = await import('../services/mappe/mappeService.js');
    importaMappe(esportaMappe(pin[1].mappa), { sovrascrivi: true });
    expect([riga(voce.chiave), (await sullaMappa(pin[1])).raccolto, (await sullaMappa(pin[2])).raccolto]).toEqual(['ottenuto', true, true]);
    expect(specchioCoerente()).toEqual([]);
    await stato(voce.chiave, null).expect(200);
    await scollega(voce.chiave, pin[1].id);
    await scollega(voce.chiave, pin[2].id);
  });

  it('§8.11 — una rigenerabile copiata in un’altra infiltrazione rende il pin condiviso: lì parte da fare, e la voce di prima tiene il suo segno', async () => {
    const o = await nuova(inf[1], 'Oggetto da copiare', 'oggetto');
    await collega(o.chiave, pin[3].id);
    await segnaPin(pin[3].id, true);
    expect(riga(o.chiave)).toBe('ottenuto');
    const copia = ((await request(app).post('/api/compendio/punti/copia-in-area').send({ chiavi: [o.chiave], area: inf[3] }).expect(201)).body.data as { copiate: Array<{ copia: string }> }).copiate[0].copia;
    const s = await scheda();
    expect([voceDi(s, o.chiave).stato, voceDi(s, copia).stato]).toEqual(['ottenuto', null]);
    expect(prepared('SELECT infiltrazione_chiave FROM spillo_partita_infiltrazione WHERE partita_id = ? AND spillo_uid = ?').pluck().all(partita, pin[3].uid)).toEqual([inf[1]]);
    expect((await sullaMappa(pin[3], inf[3])).raccolto).toBe(false);
    expect((await sullaMappa(pin[3], inf[1])).raccolto).toBe(true);
    expect(specchioCoerente()).toEqual([]);
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(copia)}`).expect(204);
    // tornato non condiviso, il pin ha di nuovo un segno solo (quello della 2)
    expect([(await sullaMappa(pin[3])).raccolto, riga(o.chiave)]).toEqual([true, 'ottenuto']);
    await segnaPin(pin[3].id, false);
    await scollega(o.chiave, pin[3].id);
  });

  it('§3.2, R4-15 — le copie secondo la regola dell’utente: vuote a Madarame; con voci uguali sugli stessi pin nella stessa infiltrazione, trovate', async () => {
    expect((await request(app).get('/api/compendio/dungeon/madarame/copie').expect(200)).body.data).toEqual([]);
    const a = await nuova(inf[5], 'Doppione', 'forziere');
    const b = await nuova(inf[5], 'Doppione', 'forziere');
    const c = await nuova(inf[5], 'Doppione', 'forziere');
    await collega(a.chiave, pin[7].id);
    await collega(b.chiave, pin[7].id);
    await collega(c.chiave, pin[6].id);
    const copie = (await request(app).get('/api/compendio/dungeon/kamoshida/copie').expect(200)).body.data as Array<{ infiltrazione: string; voci: Array<{ chiave: string }>; pin: number[] }>;
    expect(copie).toEqual([{ infiltrazione: inf[5], voci: [{ chiave: a.chiave, nome: 'Doppione', ordine: expect.any(Number) }, { chiave: b.chiave, nome: 'Doppione', ordine: expect.any(Number) }], pin: [pin[7].id] }]);
    await request(app).get('/api/compendio/dungeon/nessuno/copie').expect(404);
  });
});
