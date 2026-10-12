// ============================================================
// Le aree dei dedali dei Memento: Dedalo → Aree → Elementi (099, richiesta dell'utente del 2026-10-11; aree reali dalla 101)
// ============================================================
//
// «devo poter definire in ogni Dedalo delle aree... e in quelle aree devo poter modificare gli elementi... i dettagli dell'area
// e le cose da vedere o da fare... ogni elemento deve avere uno stato... solo quando tutti gli elementi di un'area sono in stato
// completato l'area deve risultare completata. un dedalo diventa completato se tutte le sue aree sono completate.»
// Scelte dell'utente: Richieste e timbri «Elementi delle aree»; «Tutti con stato»; un elemento è completato Ottenuto o Esaurito;
// un'area vuota «Sì, completata»; i timbri «Uno per timbro»; eliminando un'area «Voci via, Richieste da collocare».
// Dal 2026-10-12 (migrazione 101) le aree sono quelle della guida (Qimranut Area 1–2, Aiyatsbus Area 1–7…), il totale dei
// timbri di ogni area lo imposta l'utente, e una Persona si incontra in più aree.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { dbDiProva } from '../../test/dbDiProva.js';
import type { AreaDedaloDto, AreaDungeonDto, DungeonDettaglioDto, PuntoInteresseDto } from '../../shared/types.js';

const app = createApp();
const QIMRANUT = 'mementos-01-qimranut';
const AIYATSBUS = 'mementos-02-aiyatsbus';

/** La scheda del Memento (con la partita, se data). */
const scheda = async (partita?: number) => (await request(app).get(`/api/compendio/dungeon/mementos${partita ? `?partita=${partita}` : ''}`).expect(200)).body.data as DungeonDettaglioDto;
/** Il dedalo dato, dalla scheda. */
const dedalo = async (chiave: string, partita?: number) => (await scheda(partita)).aree.find((a) => a.chiave === chiave)! as AreaDungeonDto & { dedalo: NonNullable<AreaDungeonDto['dedalo']> };
/** Una nuova partita, per cominciare da zero. */
const nuovaPartita = async (nome: string) => ((await request(app).post('/api/partite').send({ nome })).body.data as { id: number }).id;
/** Crea un'area nel dedalo, pretendendo il 201. */
const nuovaArea = async (dedaloChiave: string, corpo: Record<string, unknown>) => (await request(app).post(`/api/compendio/dedali/${dedaloChiave}/aree`).send(corpo).expect(201)).body.data as AreaDedaloDto;
/** Segna una voce nella partita. */
const segnaVoce = (partita: number, punto: string, stato: 'ottenuto' | 'esaurito' | null) => request(app).put(`/api/partite/${partita}/punti`).send({ punto, stato }).expect(200);
/** Imposta il totale dei timbri di un'area del dedalo. */
const totaleTimbri = (area: string, totale: number | null) => request(app).put(`/api/compendio/aree-dedalo/${area}`).send({ timbriTotale: totale }).expect(200);
/** Segna i timbri raccolti in un'area. */
const raccolti = (partita: number, area: string, n: number) => request(app).put(`/api/partite/${partita}/timbri`).send({ area, raccolti: n });
const q = (n: number) => `${QIMRANUT}-area-${n}`;
const a = (n: number) => `${AIYATSBUS}-area-${n}`;

describe('le aree dei dedali', () => {
  beforeEach(() => { dbDiProva(); });
  afterEach(() => closeDb());

  it('si aggiungono in fondo al dedalo, si correggono (nome, dettagli, timbri), si spostano; solo nei dedali dei Memento', async () => {
    expect((await dedalo(QIMRANUT)).dedalo.aree.map((x) => [x.chiave, x.nome, x.ordine])).toEqual([[q(1), 'Area 1', 0], [q(2), 'Area 2', 1]]);
    const nuova = await nuovaArea(QIMRANUT, { nome: 'Treno fermo', descrizione: 'Il treno fermo e la banchina.', timbriTotale: 4 });
    expect(nuova).toMatchObject({ chiave: `${QIMRANUT}-treno-fermo`, ordine: 2, nome: 'Treno fermo', descrizione: 'Il treno fermo e la banchina.', timbri: { totale: 4, raccolti: null }, richieste: [], elementi: { totale: 4, fatti: null }, completata: null });
    // lo stesso nome dà una chiave diversa
    expect((await nuovaArea(QIMRANUT, { nome: 'Treno fermo' })).chiave).toBe(`${QIMRANUT}-treno-fermo-2`);
    const corretta = (await request(app).put(`/api/compendio/aree-dedalo/${nuova.chiave}`).send({ nome: 'Banchina', timbriTotale: null }).expect(200)).body.data as AreaDedaloDto;
    expect(corretta).toMatchObject({ nome: 'Banchina', descrizione: 'Il treno fermo e la banchina.', timbri: null });
    // un nome vuoto lascia quello di prima; i campi non mandati restano
    expect((await request(app).put(`/api/compendio/aree-dedalo/${nuova.chiave}`).send({ descrizione: 'Solo la banchina.' }).expect(200)).body.data).toMatchObject({ nome: 'Banchina', descrizione: 'Solo la banchina.' });
    for (let i = 0; i < 2; i++) await request(app).put(`/api/compendio/aree-dedalo/${nuova.chiave}/sposta`).send({ verso: -1 }).expect(200);
    expect((await dedalo(QIMRANUT)).dedalo.aree.map((x) => [x.nome, x.ordine])).toEqual([['Banchina', 0], ['Area 1', 1], ['Area 2', 2], ['Treno fermo', 3]]);
    expect((await request(app).put(`/api/compendio/aree-dedalo/${nuova.chiave}/sposta`).send({ verso: -1 })).body.error.code).toBe('area-al-limite');
    // fuori dai Memento non ci sono aree del dedalo
    expect((await request(app).post('/api/compendio/dedali/kamoshida-01-cancello-del-castello-ingresso/aree').send({ nome: 'X' })).body.error.code).toBe('non-un-dedalo');
    expect((await request(app).post('/api/compendio/dedali/nessuno/aree').send({ nome: 'X' })).status).toBe(404);
    expect((await request(app).put('/api/compendio/aree-dedalo/nessuna').send({ nome: 'X' })).status).toBe(404);
    expect((await request(app).post(`/api/compendio/dedali/${QIMRANUT}/aree`).send({ nome: 'X', timbriTotale: -1 })).status).toBe(400);
  });

  it('un\'area è completata quando lo sono tutti i suoi elementi (Trama, Richieste, timbri; le Persona non contano); un\'area vuota lo è; il dedalo quando lo sono tutte', async () => {
    const partita = await nuovaPartita('Aree complete');
    // Qimranut: Area 1 con una Richiesta e due voci di Trama, Area 2 con una voce di Trama; i timbri dell'Area 2 li imposta l'utente
    await totaleTimbri(q(2), 2);
    const prima = await dedalo(QIMRANUT, partita);
    expect(prima.dedalo.aree.map((x) => x.completata)).toEqual([false, false]);
    // un'area vuota è completata (scelta dell'utente)
    const vuota = await nuovaArea(QIMRANUT, { nome: 'Vuota' });
    expect((await dedalo(QIMRANUT, partita)).dedalo.aree.find((x) => x.chiave === vuota.chiave)).toMatchObject({ elementi: { totale: 0, fatti: 0 }, completata: true });
    // le Persona si incontrano in tutte e due le aree ma non contano: il totale è Trama + Richieste + timbri
    const trama = prima.punti.filter((p) => p.tipo === 'trama');
    const area2 = prima.dedalo.aree[1];
    expect(prima.punti.some((p) => p.tipo === 'persona' && p.areeDedalo.includes(q(2)))).toBe(true);
    expect(area2.elementi).toEqual({ totale: trama.filter((p) => p.areaDedalo === q(2)).length + area2.richieste.length + 2, fatti: 0 });
    for (const [i, v] of trama.entries()) await segnaVoce(partita, v.chiave, i % 2 === 0 ? 'ottenuto' : 'esaurito');
    for (const r of prima.dedalo.aree.flatMap((x) => x.richieste)) await request(app).put(`/api/partite/${partita}/richieste`).send({ richiesta: r.chiave, stato: 'completata' }).expect(200);
    let d = await dedalo(QIMRANUT, partita);
    // mancano i timbri dell'Area 2, che contano uno per timbro
    expect(d.dedalo.aree.map((x) => x.completata)).toEqual([true, false, true]);
    await raccolti(partita, q(2), 1).expect(200);
    expect((await dedalo(QIMRANUT, partita)).dedalo.aree[1]).toMatchObject({ elementi: { fatti: area2.elementi.totale - 1 }, completata: false });
    await raccolti(partita, q(2), 2).expect(200);
    d = await dedalo(QIMRANUT, partita);
    expect(d.dedalo).toMatchObject({ completato: true, obiettivi: { fatti: d.dedalo.obiettivi.totale } });
    expect((await scheda(partita)).raccolta.mappeComplete).toBe(1);
    // riaperta una voce, l'area e il dedalo tornano da completare
    await segnaVoce(partita, trama[0].chiave, null);
    expect((await dedalo(QIMRANUT, partita)).dedalo).toMatchObject({ completato: false });
    // senza partita niente è completato né fatto
    expect((await dedalo(QIMRANUT)).dedalo).toMatchObject({ completato: null, obiettivi: { fatti: null } });
  });

  it('una voce Trama di un dedalo si segna, si collega alle condizioni e conta; «Altro» fuori dai dedali resta descrittiva', async () => {
    const partita = await nuovaPartita('Trama con stato');
    const d = await dedalo(QIMRANUT, partita);
    const voce = d.punti.find((p) => p.tipo === 'trama' && p.areaDedalo === q(1))!;
    await segnaVoce(partita, voce.chiave, 'ottenuto');
    expect((await dedalo(QIMRANUT, partita)).punti.find((p) => p.chiave === voce.chiave)?.stato).toBe('ottenuto');
    const citabili = (await request(app).get('/api/condizioni/voci').expect(200)).body.data as Array<{ chiave: string; gruppo: string }>;
    expect(citabili.find((v) => v.chiave === voce.chiave)?.gruppo).toBe('Memento › 1. Dedalo di Qimranut › Area 1');
    const palazzo = prepared("SELECT chiave FROM punto_interesse WHERE tipo = 'altro' AND area_dedalo_chiave IS NULL LIMIT 1").pluck().get() as string;
    expect((await request(app).put(`/api/partite/${partita}/punti`).send({ punto: palazzo, stato: 'ottenuto' })).body.error.code).toBe('punto-descrittivo');
    expect(citabili.some((v) => v.chiave === palazzo)).toBe(false);
  });

  it('le voci di Trama nascono in un\'area del dedalo e si spostano fra le aree dello stesso dedalo', async () => {
    const crea = async (corpo: Record<string, unknown>) => (await request(app).post(`/api/compendio/aree/${QIMRANUT}/punti`).send(corpo).expect(201)).body.data as PuntoInteresseDto;
    // in un dedalo l'area è obbligatoria e dev'essere sua; fuori dai dedali non c'è; niente Enigmi
    expect((await request(app).post(`/api/compendio/aree/${QIMRANUT}/punti`).send({ nome: 'Senza area', tipo: 'trama' })).body.error.code).toBe('area-dedalo-mancante');
    expect((await request(app).post(`/api/compendio/aree/${QIMRANUT}/punti`).send({ nome: 'Altrui', tipo: 'trama', areaDedalo: a(1) })).body.error.code).toBe('area-di-altro-dedalo');
    expect((await request(app).post('/api/compendio/aree/kamoshida-01-cancello-del-castello-ingresso/punti').send({ nome: 'X', tipo: 'storia', areaDedalo: q(1) })).body.error.code).toBe('non-un-dedalo');
    expect((await request(app).post(`/api/compendio/aree/${QIMRANUT}/punti`).send({ nome: 'Enigma', tipo: 'puzzle', areaDedalo: q(1) })).body.error.code).toBe('tipo-non-del-dedalo');
    // una voce nuova va dopo l'ultima della sua area
    const ultimoInArea2 = Math.max(-1, ...(await dedalo(QIMRANUT)).punti.filter((p) => p.areaDedalo === q(2)).map((p) => p.ordine));
    const banchina = await crea({ nome: 'Jose alla banchina', tipo: 'trama', areaDedalo: q(1) });
    expect(banchina.areaDedalo).toBe(q(1));
    const sola = await crea({ nome: 'Nota della seconda area', tipo: 'trama', areaDedalo: q(2) });
    expect(sola).toMatchObject({ areaDedalo: q(2), ordine: ultimoInArea2 + 1 });
    // una voce passa a un'altra area e va in fondo
    const spostata = (await request(app).put(`/api/compendio/punti/${encodeURIComponent(banchina.chiave)}`).send({ areaDedalo: q(2) }).expect(200)).body.data as PuntoInteresseDto;
    expect(spostata).toMatchObject({ areaDedalo: q(2), ordine: ultimoInArea2 + 2 });
    // lo spostamento su e giù resta fra le voci della stessa area
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(banchina.chiave)}/sposta`).send({ verso: -1 }).expect(200);
    const nomi = (await dedalo(QIMRANUT)).punti.filter((p) => p.areaDedalo === q(2)).sort((x, y) => x.ordine - y.ordine).map((p) => p.nome);
    expect(nomi.slice(-2)).toEqual(['Jose alla banchina', 'Nota della seconda area']);
    // una voce dei Palazzi non riceve un'area del dedalo; una del dedalo non va in un altro dedalo
    const palazzo = prepared("SELECT chiave FROM punto_interesse WHERE area_dedalo_chiave IS NULL AND area_chiave NOT LIKE 'mementos-%' LIMIT 1").pluck().get() as string;
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(palazzo)}`).send({ areaDedalo: q(1) })).body.error.code).toBe('non-un-dedalo');
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(sola.chiave)}`).send({ areaDedalo: a(1) })).body.error.code).toBe('area-di-altro-dedalo');
  });

  it('una Persona di un dedalo si incontra in più aree: nasce collegata a quelle scelte, se ne cambiano le aree, resta Persona (101)', async () => {
    const pixie = prepared("SELECT id FROM persona WHERE nome = 'Pixie'").pluck().get() as number;
    const nuova = (corpo: Record<string, unknown>) => request(app).post(`/api/compendio/aree/${QIMRANUT}/punti`).send({ nome: 'Fatina', tipo: 'persona', persona: pixie, ...corpo });
    expect((await nuova({})).body.error.code).toBe('aree-dedalo-mancanti');
    expect((await nuova({ areeDedalo: [] })).body.error.code).toBe('aree-dedalo-mancanti');
    expect((await nuova({ areaDedalo: q(1) })).body.error.code).toBe('persona-in-piu-aree');
    expect((await nuova({ areeDedalo: [q(1), a(1)] })).body.error.code).toBe('area-di-altro-dedalo');
    const p = (await nuova({ areeDedalo: [q(2), q(1), q(2)] }).expect(201)).body.data as PuntoInteresseDto;
    // in ordine di area, senza ripetizioni; nessuna area sola
    expect(p).toMatchObject({ tipo: 'persona', areaDedalo: null, areeDedalo: [q(1), q(2)] });
    const corretta = (await request(app).put(`/api/compendio/punti/${encodeURIComponent(p.chiave)}`).send({ areeDedalo: [q(2)] }).expect(200)).body.data as PuntoInteresseDto;
    expect(corretta.areeDedalo).toEqual([q(2)]);
    // la correzione senza aree non le tocca
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(p.chiave)}`).send({ nome: 'Fatina del treno' }).expect(200)).body.data.areeDedalo).toEqual([q(2)]);
    // nei dedali una Persona resta una Persona e una Trama resta Trama; le aree multiple sono solo delle Persona
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(p.chiave)}`).send({ tipo: 'trama' })).body.error.code).toBe('persona-tipo-fisso');
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(p.chiave)}`).send({ areaDedalo: q(1) })).body.error.code).toBe('persona-in-piu-aree');
    const trama = (await dedalo(QIMRANUT)).punti.find((x) => x.tipo === 'trama')!;
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(trama.chiave)}`).send({ tipo: 'persona' })).body.error.code).toBe('persona-tipo-fisso');
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(trama.chiave)}`).send({ areeDedalo: [q(1)] })).body.error.code).toBe('aree-solo-per-persona');
    // nella scheda la Persona ha le sue aree
    expect((await dedalo(QIMRANUT)).punti.find((x) => x.chiave === p.chiave)?.areeDedalo).toEqual([q(2)]);
  });

  it('i timbri di un\'area: senza totale non si contano; cambiando il totale i conteggi delle partite seguono, più basso li ferma, nessuno li toglie', async () => {
    const partita = await nuovaPartita('Timbri');
    expect((await raccolti(partita, a(1), 1)).body.error.code).toBe('timbri-non-dichiarati');
    await totaleTimbri(a(1), 8);
    await raccolti(partita, a(1), 6).expect(200);
    await totaleTimbri(a(1), 4);
    expect(prepared('SELECT raccolti FROM timbri_dedalo_partita WHERE partita_id = ? AND area_chiave = ?').pluck().get(partita, a(1))).toBe(4);
    expect((await dedalo(AIYATSBUS, partita)).dedalo.aree[0].timbri).toEqual({ totale: 4, raccolti: 4 });
    await totaleTimbri(a(1), null);
    expect(prepared('SELECT COUNT(*) FROM timbri_dedalo_partita WHERE area_chiave = ?').pluck().get(a(1))).toBe(0);
    expect((await raccolti(partita, a(1), 1)).body.error.code).toBe('timbri-non-dichiarati');
    // un totale nuovo in un'area che non ne aveva: si contano da zero
    await totaleTimbri(q(1), 3);
    expect((await raccolti(partita, q(1), 3).expect(200)).body.data).toMatchObject({ raccolti: 3, totale: 3, completato: true });
  });

  it('eliminando un\'area: le voci di Trama se ne vanno con i loro stati, i timbri con lei, le Richieste restano da collocare, le Persona perdono solo quell\'area; le altre aree salgono', async () => {
    const partita = await nuovaPartita('Elimina area');
    const prima = await dedalo(AIYATSBUS, partita);
    const area2 = prima.dedalo.aree[1];
    const trama = (await request(app).post(`/api/compendio/aree/${AIYATSBUS}/punti`).send({ nome: 'Nota dell\'Area 2', tipo: 'trama', areaDedalo: a(2) }).expect(201)).body.data as PuntoInteresseDto;
    const persona = prima.punti.find((p) => p.tipo === 'persona' && p.areeDedalo.includes(a(2)) && p.areeDedalo.length > 1)!;
    const richieste = area2.richieste.map((r) => r.chiave);
    expect(richieste.length).toBeGreaterThan(0);
    await segnaVoce(partita, trama.chiave, 'ottenuto');
    await request(app).put(`/api/partite/${partita}/richieste`).send({ richiesta: richieste[0], stato: 'accettata' }).expect(200);
    await totaleTimbri(a(2), 3);
    await raccolti(partita, a(2), 2).expect(200);
    await request(app).delete(`/api/compendio/aree-dedalo/${a(2)}`).expect(204);
    expect(prepared('SELECT COUNT(*) FROM punto_interesse WHERE chiave = ?').pluck().get(trama.chiave)).toBe(0);
    expect(prepared('SELECT COUNT(*) FROM punto_partita WHERE punto_chiave = ?').pluck().get(trama.chiave)).toBe(0);
    expect(prepared('SELECT COUNT(*) FROM timbri_dedalo_partita WHERE area_chiave = ?').pluck().get(a(2))).toBe(0);
    const dopo = await dedalo(AIYATSBUS, partita);
    expect(dopo.dedalo.aree.map((x) => [x.chiave, x.ordine])).toEqual([1, 3, 4, 5, 6, 7].map((n, i) => [a(n), i]));
    // la Persona resta, nelle altre sue aree
    expect(dopo.punti.find((p) => p.chiave === persona.chiave)?.areeDedalo).toEqual(persona.areeDedalo.filter((x) => x !== a(2)));
    // le Richieste restano nel dedalo, da collocare, con il loro stato, e non contano finché non si collocano
    expect(dopo.dedalo.daCollocare.map((r) => r.chiave)).toEqual(richieste);
    expect(dopo.dedalo.daCollocare[0].stato).toBe('accettata');
    expect(prepared('SELECT area_chiave FROM richiesta WHERE chiave = ?').pluck().get(richieste[0])).toBe(AIYATSBUS);
    expect((await request(app).delete(`/api/compendio/aree-dedalo/${a(2)}`)).status).toBe(404);
  });

  it('una Richiesta si colloca in un\'area (anche di un altro dedalo) o si toglie dall\'area; il suo stato resta', async () => {
    const partita = await nuovaPartita('Colloca');
    const prima = await dedalo(AIYATSBUS, partita);
    const richiesta = prima.dedalo.aree.flatMap((x) => x.richieste)[0].chiave;
    await request(app).put(`/api/partite/${partita}/richieste`).send({ richiesta, stato: 'completata' }).expect(200);
    // fuori dall'area: da collocare, fuori dal conteggio
    expect((await request(app).put(`/api/compendio/richieste/${richiesta}/area`).send({ areaDedalo: null }).expect(200)).body.data).toMatchObject({ areaDedalo: null, areaChiave: AIYATSBUS });
    let d = await dedalo(AIYATSBUS, partita);
    expect(d.dedalo.daCollocare).toEqual([{ chiave: richiesta, nome: expect.any(String), stato: 'completata' }]);
    expect(d.dedalo.obiettivi.totale).toBe(prima.dedalo.obiettivi.totale - 1);
    // in un'area di un altro dedalo: cambia anche il dedalo della Richiesta
    expect((await request(app).put(`/api/compendio/richieste/${richiesta}/area`).send({ areaDedalo: q(2) }).expect(200)).body.data)
      .toMatchObject({ areaDedalo: q(2), areaDedaloNome: 'Area 2', areaChiave: QIMRANUT, area: 'Dedalo di Qimranut' });
    d = await dedalo(AIYATSBUS, partita);
    expect(d.dedalo.daCollocare).toEqual([]);
    expect((await dedalo(QIMRANUT, partita)).dedalo.aree[1].richieste.find((r) => r.chiave === richiesta)?.stato).toBe('completata');
    expect((await request(app).put(`/api/compendio/richieste/${richiesta}/area`).send({ areaDedalo: 'nessuna' })).status).toBe(404);
    expect((await request(app).put('/api/compendio/richieste/nessuna/area').send({ areaDedalo: q(1) })).status).toBe(404);
  });
});
