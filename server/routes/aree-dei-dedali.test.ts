// ============================================================
// Le aree dei dedali dei Memento: Dedalo → Aree → Elementi (099, richiesta dell'utente del 2026-10-11)
// ============================================================
//
// «devo poter definire in ogni Dedalo delle aree... e in quelle aree devo poter modificare gli elementi... i dettagli dell'area
// e le cose da vedere o da fare... ogni elemento deve avere uno stato... solo quando tutti gli elementi di un'area sono in stato
// completato l'area deve risultare completata. un dedalo diventa completato se tutte le sue aree sono completate.»
// Scelte dell'utente: Richieste e timbri «Elementi delle aree»; le voci «In un'area iniziale»; «Tutti con stato»; un elemento è
// completato Ottenuto o Esaurito; un'area vuota «Sì, completata»; i timbri «Uno per timbro»; eliminando un'area «Voci via,
// Richieste da collocare».
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

describe('le aree dei dedali', () => {
  beforeEach(() => { dbDiProva(); });
  afterEach(() => closeDb());

  it('si aggiungono in fondo al dedalo, si correggono (nome, dettagli, timbri), si spostano; solo nei dedali dei Memento', async () => {
    const nuova = await nuovaArea(QIMRANUT, { nome: 'Area 2', descrizione: 'Il treno fermo e la banchina.', timbriTotale: 4 });
    expect(nuova).toMatchObject({ chiave: `${QIMRANUT}-area-2`, ordine: 1, nome: 'Area 2', descrizione: 'Il treno fermo e la banchina.', timbri: { totale: 4, raccolti: null }, richieste: [], elementi: { totale: 4, fatti: null }, completata: null });
    // lo stesso nome dà una chiave diversa
    expect((await nuovaArea(QIMRANUT, { nome: 'Area 2' })).chiave).toBe(`${QIMRANUT}-area-2-2`);
    const corretta = (await request(app).put(`/api/compendio/aree-dedalo/${nuova.chiave}`).send({ nome: 'Banchina', timbriTotale: null }).expect(200)).body.data as AreaDedaloDto;
    expect(corretta).toMatchObject({ nome: 'Banchina', descrizione: 'Il treno fermo e la banchina.', timbri: null });
    // un nome vuoto lascia quello di prima; i campi non mandati restano
    expect((await request(app).put(`/api/compendio/aree-dedalo/${nuova.chiave}`).send({ descrizione: 'Solo la banchina.' }).expect(200)).body.data).toMatchObject({ nome: 'Banchina', descrizione: 'Solo la banchina.' });
    await request(app).put(`/api/compendio/aree-dedalo/${nuova.chiave}/sposta`).send({ verso: -1 }).expect(200);
    expect((await dedalo(QIMRANUT)).dedalo.aree.map((a) => [a.nome, a.ordine])).toEqual([['Banchina', 0], ['Area 1', 1], ['Area 2', 2]]);
    expect((await request(app).put(`/api/compendio/aree-dedalo/${nuova.chiave}/sposta`).send({ verso: -1 })).body.error.code).toBe('area-al-limite');
    // fuori dai Memento non ci sono aree del dedalo
    expect((await request(app).post('/api/compendio/dedali/kamoshida-01-cancello-del-castello-ingresso/aree').send({ nome: 'X' })).body.error.code).toBe('non-un-dedalo');
    expect((await request(app).post('/api/compendio/dedali/nessuno/aree').send({ nome: 'X' })).status).toBe(404);
    expect((await request(app).put('/api/compendio/aree-dedalo/nessuna').send({ nome: 'X' })).status).toBe(404);
    expect((await request(app).post(`/api/compendio/dedali/${QIMRANUT}/aree`).send({ nome: 'X', timbriTotale: -1 })).status).toBe(400);
  });

  it('un\'area è completata quando lo sono tutti i suoi elementi (voci, anche «Altro», Richieste, timbri); un\'area vuota lo è; il dedalo quando lo sono tutte', async () => {
    const partita = await nuovaPartita('Aree complete');
    const prima = await dedalo(AIYATSBUS, partita);
    const area1 = prima.dedalo.aree[0];
    expect(area1.completata).toBe(false);
    // un'area vuota è completata (scelta dell'utente)
    const vuota = await nuovaArea(AIYATSBUS, { nome: 'Vuota' });
    const conVuota = await dedalo(AIYATSBUS, partita);
    expect(conVuota.dedalo.aree.find((a) => a.chiave === vuota.chiave)).toMatchObject({ elementi: { totale: 0, fatti: 0 }, completata: true });
    expect(conVuota.dedalo.completato).toBe(false);
    // tutte le voci dell'Area 1 segnate (anche «Altro»: nei dedali ogni elemento ha uno stato), Ottenute o Esaurite
    const voci = prima.punti.filter((p) => p.areaDedalo === area1.chiave && !p.contenitore);
    expect(voci.some((p) => p.tipo === 'altro')).toBe(true);
    for (const [i, v] of voci.entries()) await segnaVoce(partita, v.chiave, i % 2 === 0 ? 'ottenuto' : 'esaurito');
    let d = await dedalo(AIYATSBUS, partita);
    const vociDellArea = d.punti.filter((p) => p.areaDedalo === area1.chiave);
    expect(vociDellArea.every((p) => p.stato !== null)).toBe(true);
    // mancano ancora Richieste e timbri: l'area non è completata, e i timbri contano uno per timbro
    let a = d.dedalo.aree.find((x) => x.chiave === area1.chiave)!;
    expect(a).toMatchObject({ elementi: { totale: vociDellArea.length + a.richieste.length + 8, fatti: vociDellArea.length }, completata: false });
    for (const r of a.richieste) await request(app).put(`/api/partite/${partita}/richieste`).send({ richiesta: r.chiave, stato: 'completata' }).expect(200);
    await request(app).put(`/api/partite/${partita}/timbri`).send({ area: area1.chiave, raccolti: 7 }).expect(200);
    a = (await dedalo(AIYATSBUS, partita)).dedalo.aree.find((x) => x.chiave === area1.chiave)!;
    expect(a).toMatchObject({ elementi: { fatti: a.elementi.totale - 1 }, completata: false });
    await request(app).put(`/api/partite/${partita}/timbri`).send({ area: area1.chiave, raccolti: 8 }).expect(200);
    d = await dedalo(AIYATSBUS, partita);
    expect(d.dedalo.aree.every((x) => x.completata)).toBe(true);
    expect(d.dedalo.completato).toBe(true);
    expect(d.dedalo.obiettivi.fatti).toBe(d.dedalo.obiettivi.totale);
    const memento = await scheda(partita);
    expect(memento.raccolta.mappeComplete).toBe(1);
    // riaperta una voce, l'area e il dedalo tornano da completare
    await segnaVoce(partita, voci[0].chiave, null);
    expect((await dedalo(AIYATSBUS, partita)).dedalo).toMatchObject({ completato: false });
    // senza partita niente è completato né fatto
    expect((await dedalo(AIYATSBUS)).dedalo).toMatchObject({ completato: null, obiettivi: { fatti: null } });
  });

  it('una voce «Altro» di un dedalo si segna, si collega alle condizioni e conta; fuori dai dedali resta descrittiva', async () => {
    const partita = await nuovaPartita('Altro con stato');
    const d = await dedalo(QIMRANUT, partita);
    const altro = d.punti.find((p) => p.tipo === 'altro')!;
    expect(altro.areaDedalo).toBe(`${QIMRANUT}-area-1`);
    await segnaVoce(partita, altro.chiave, 'ottenuto');
    expect((await dedalo(QIMRANUT, partita)).punti.find((p) => p.chiave === altro.chiave)?.stato).toBe('ottenuto');
    const citabili = (await request(app).get('/api/condizioni/voci').expect(200)).body.data as Array<{ chiave: string; gruppo: string }>;
    expect(citabili.find((v) => v.chiave === altro.chiave)?.gruppo).toBe('Memento › 1. Dedalo di Qimranut › Area 1');
    const palazzo = prepared("SELECT chiave FROM punto_interesse WHERE tipo = 'altro' AND area_dedalo_chiave IS NULL LIMIT 1").pluck().get() as string;
    expect((await request(app).put(`/api/partite/${partita}/punti`).send({ punto: palazzo, stato: 'ottenuto' })).body.error.code).toBe('punto-descrittivo');
    expect(citabili.some((v) => v.chiave === palazzo)).toBe(false);
  });

  it('le voci nascono in un\'area del dedalo e si spostano fra le aree dello stesso dedalo, l\'Enigma coi suoi passi', async () => {
    const area1 = `${QIMRANUT}-area-1`;
    const area2 = (await nuovaArea(QIMRANUT, { nome: 'Area 2' })).chiave;
    // in un dedalo l'area è obbligatoria e dev'essere sua; fuori dai dedali non c'è
    expect((await request(app).post(`/api/compendio/aree/${QIMRANUT}/punti`).send({ nome: 'Senza area', tipo: 'persona' })).body.error.code).toBe('area-dedalo-mancante');
    expect((await request(app).post(`/api/compendio/aree/${QIMRANUT}/punti`).send({ nome: 'Altrui', tipo: 'persona', areaDedalo: `${AIYATSBUS}-area-1` })).body.error.code).toBe('area-di-altro-dedalo');
    expect((await request(app).post('/api/compendio/aree/kamoshida-01-cancello-del-castello-ingresso/punti').send({ nome: 'X', tipo: 'persona', areaDedalo: area1 })).body.error.code).toBe('non-un-dedalo');
    const crea = async (corpo: Record<string, unknown>) => (await request(app).post(`/api/compendio/aree/${QIMRANUT}/punti`).send(corpo).expect(201)).body.data as PuntoInteresseDto;
    const enigma = await crea({ nome: 'Enigma della banchina', tipo: 'puzzle', areaDedalo: area1 });
    // un passo nasce nell'area del suo Enigma, anche senza dirla
    const passo = await crea({ nome: 'Leva', tipo: 'meccanismo', contenitore: enigma.chiave });
    expect(passo.areaDedalo).toBe(area1);
    const sola = await crea({ nome: 'Nota della seconda area', tipo: 'altro', areaDedalo: area2 });
    expect(sola).toMatchObject({ areaDedalo: area2, ordine: 0 });
    // un passo non lascia da solo l'area del suo Enigma
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(passo.chiave)}`).send({ areaDedalo: area2 })).body.error.code).toBe('passo-di-altra-area');
    // l'Enigma si sposta e i passi lo seguono; va in fondo all'altra area
    const spostato = (await request(app).put(`/api/compendio/punti/${encodeURIComponent(enigma.chiave)}`).send({ areaDedalo: area2 }).expect(200)).body.data as PuntoInteresseDto;
    expect(spostato).toMatchObject({ areaDedalo: area2, ordine: 1 });
    expect(prepared('SELECT area_dedalo_chiave FROM punto_interesse WHERE chiave = ?').pluck().get(passo.chiave)).toBe(area2);
    // lo spostamento su e giù resta fra le voci della stessa area
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(sola.chiave)}/sposta`).send({ verso: -1 })).body.error.code).toBe('punto-al-limite');
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(enigma.chiave)}/sposta`).send({ verso: -1 }).expect(200);
    expect((await dedalo(QIMRANUT)).punti.filter((p) => p.areaDedalo === area2 && !p.contenitore).sort((a, b) => a.ordine - b.ordine).map((p) => p.nome)).toEqual(['Enigma della banchina', 'Nota della seconda area']);
    // una voce dei Palazzi non riceve un'area del dedalo
    const palazzo = prepared('SELECT chiave FROM punto_interesse WHERE area_dedalo_chiave IS NULL LIMIT 1').pluck().get() as string;
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(palazzo)}`).send({ areaDedalo: area1 })).body.error.code).toBe('non-un-dedalo');
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(sola.chiave)}`).send({ areaDedalo: `${AIYATSBUS}-area-1` })).body.error.code).toBe('area-di-altro-dedalo');
  });

  it('cambiando il totale dei timbri i conteggi delle partite seguono: più basso li ferma al totale, nessun timbro li toglie', async () => {
    const partita = await nuovaPartita('Timbri');
    const area1 = `${AIYATSBUS}-area-1`;
    await request(app).put(`/api/partite/${partita}/timbri`).send({ area: area1, raccolti: 6 }).expect(200);
    await request(app).put(`/api/compendio/aree-dedalo/${area1}`).send({ timbriTotale: 4 }).expect(200);
    expect(prepared('SELECT raccolti FROM timbri_dedalo_partita WHERE partita_id = ? AND area_chiave = ?').pluck().get(partita, area1)).toBe(4);
    expect((await dedalo(AIYATSBUS, partita)).dedalo.aree[0].timbri).toEqual({ totale: 4, raccolti: 4 });
    await request(app).put(`/api/compendio/aree-dedalo/${area1}`).send({ timbriTotale: null }).expect(200);
    expect(prepared('SELECT COUNT(*) FROM timbri_dedalo_partita WHERE area_chiave = ?').pluck().get(area1)).toBe(0);
    expect((await request(app).put(`/api/partite/${partita}/timbri`).send({ area: area1, raccolti: 1 })).body.error.code).toBe('timbri-non-dichiarati');
    // un totale nuovo in un'area che non ne aveva: si contano da zero
    await request(app).put(`/api/compendio/aree-dedalo/${QIMRANUT}-area-1`).send({ timbriTotale: 3 }).expect(200);
    expect((await request(app).put(`/api/partite/${partita}/timbri`).send({ area: `${QIMRANUT}-area-1`, raccolti: 3 }).expect(200)).body.data).toMatchObject({ raccolti: 3, totale: 3, completato: true });
  });

  it('eliminando un\'area: le voci se ne vanno con i loro stati, i timbri con lei, le Richieste restano da collocare; le altre aree salgono', async () => {
    const partita = await nuovaPartita('Elimina area');
    const area1 = `${AIYATSBUS}-area-1`;
    const area2 = (await nuovaArea(AIYATSBUS, { nome: 'Area 2' })).chiave;
    const prima = await dedalo(AIYATSBUS, partita);
    const voci = prima.punti.filter((p) => p.areaDedalo === area1).map((p) => p.chiave);
    const richieste = prima.dedalo.aree[0].richieste.map((r) => r.chiave);
    await segnaVoce(partita, voci[0], 'ottenuto');
    await request(app).put(`/api/partite/${partita}/richieste`).send({ richiesta: richieste[0], stato: 'accettata' }).expect(200);
    await request(app).put(`/api/partite/${partita}/timbri`).send({ area: area1, raccolti: 2 }).expect(200);
    await request(app).delete(`/api/compendio/aree-dedalo/${area1}`).expect(204);
    expect(prepared(`SELECT COUNT(*) FROM punto_interesse WHERE chiave IN (${voci.map(() => '?').join(',')})`).pluck().get(...voci)).toBe(0);
    expect(prepared('SELECT COUNT(*) FROM punto_partita WHERE punto_chiave = ?').pluck().get(voci[0])).toBe(0);
    expect(prepared('SELECT COUNT(*) FROM timbri_dedalo_partita WHERE area_chiave = ?').pluck().get(area1)).toBe(0);
    const dopo = await dedalo(AIYATSBUS, partita);
    expect(dopo.dedalo.aree.map((a) => [a.chiave, a.ordine])).toEqual([[area2, 0]]);
    // le Richieste restano nel dedalo, da collocare, con il loro stato, e non contano finché non si collocano
    expect(dopo.dedalo.daCollocare.map((r) => r.chiave)).toEqual(richieste);
    expect(dopo.dedalo.daCollocare[0].stato).toBe('accettata');
    expect(dopo.dedalo).toMatchObject({ obiettivi: { totale: 0, fatti: 0 }, completato: true });
    expect(prepared('SELECT area_chiave FROM richiesta WHERE chiave = ?').pluck().get(richieste[0])).toBe(AIYATSBUS);
    expect((await request(app).delete(`/api/compendio/aree-dedalo/${area1}`)).status).toBe(404);
  });

  it('una Richiesta si colloca in un\'area (anche di un altro dedalo) o si toglie dall\'area; il suo stato resta', async () => {
    const partita = await nuovaPartita('Colloca');
    const prima = await dedalo(AIYATSBUS, partita);
    const richiesta = prima.dedalo.aree[0].richieste[0].chiave;
    await request(app).put(`/api/partite/${partita}/richieste`).send({ richiesta, stato: 'completata' }).expect(200);
    // fuori dall'area: da collocare, fuori dal conteggio
    expect((await request(app).put(`/api/compendio/richieste/${richiesta}/area`).send({ areaDedalo: null }).expect(200)).body.data).toMatchObject({ areaDedalo: null, areaChiave: AIYATSBUS });
    let d = await dedalo(AIYATSBUS, partita);
    expect(d.dedalo.daCollocare).toEqual([{ chiave: richiesta, nome: expect.any(String), stato: 'completata' }]);
    expect(d.dedalo.obiettivi.totale).toBe(prima.dedalo.obiettivi.totale - 1);
    // in un'area di un altro dedalo: cambia anche il dedalo della Richiesta
    const altra = `${QIMRANUT}-area-1`;
    expect((await request(app).put(`/api/compendio/richieste/${richiesta}/area`).send({ areaDedalo: altra }).expect(200)).body.data)
      .toMatchObject({ areaDedalo: altra, areaDedaloNome: 'Area 1', areaChiave: QIMRANUT, area: 'Dedalo di Qimranut' });
    d = await dedalo(AIYATSBUS, partita);
    expect(d.dedalo.daCollocare).toEqual([]);
    const q = await dedalo(QIMRANUT, partita);
    expect(q.dedalo.aree[0].richieste.find((r) => r.chiave === richiesta)?.stato).toBe('completata');
    expect((await request(app).put(`/api/compendio/richieste/${richiesta}/area`).send({ areaDedalo: 'nessuna' })).status).toBe(404);
    expect((await request(app).put('/api/compendio/richieste/nessuna/area').send({ areaDedalo: altra })).status).toBe(404);
  });
});
