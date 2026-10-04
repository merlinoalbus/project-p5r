// ============================================================
// L'Enigma contiene i suoi passi (095, scelte dell'utente del 2026-10-01)
// ============================================================
//
// «Enigma deve diventare un contenitore di sotto elementi che insieme descrivono l'enigma e come sbloccarlo»; «una porta
// chiusa può aprirsi con un Meccanismo di sblocco... rappresentabile in guida con i relativi Pin agganciati». I passi sono voci
// vere di qualunque tipo, ordinate dentro l'Enigma; l'Enigma è risolto quando i passi sono fatti; i pin stanno solo sui passi.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { bossFinali } from '../services/palazziService.js';
import { creaMappa } from '../services/mappe/mappeService.js';
import type { DungeonDettaglioDto, PuntoInteresseDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

describe('Enigma con i suoi passi', () => {
  let partita: number;
  let area: string;
  let altraArea: string;
  let pinLiberi: Array<{ id: number; uid: string }>;
  /** Crea una voce della guida nell'area (di serie quella di prova), dentro un contenitore se indicato; pretende il 201 e la restituisce. */
  const nuova = async (nome: string, tipo: string, contenitore?: string, inArea = area) =>
    (await request(app).post(`/api/compendio/aree/${inArea}/punti`).send({ nome, tipo, ...(contenitore ? { contenitore } : {}) }).expect(201)).body.data as PuntoInteresseDto;
  /** Modifica la voce della guida con quella chiave (restituisce la richiesta, per controllarne l'esito). */
  const modifica = (chiave: string, dati: Record<string, unknown>) => request(app).put(`/api/compendio/punti/${encodeURIComponent(chiave)}`).send(dati);
  /** Imposta (o, con null, toglie) lo stato della voce nella partita di prova, pretendendo il 200. */
  const statoPunto = (punto: string, stato: string | null) => request(app).put(`/api/partite/${partita}/punti`).send({ punto, stato }).expect(200);
  /** Stato salvato della voce nella partita di prova, letto dal DB (null se non segnata). */
  const segnato = (punto: string) => (prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partita, punto) as { stato: string } | undefined)?.stato ?? null;
  /** Valore di «raccolto» dello spillo `uid` nella partita di prova, letto dal DB (0 se non c'è la riga). */
  const raccolto = (uid: string) => (prepared('SELECT raccolto FROM spillo_partita WHERE partita_id = ? AND spillo_uid = ?').get(partita, uid) as { raccolto: number } | undefined)?.raccolto ?? 0;
  /** Collega la voce della guida al pin dato (restituisce la richiesta, per controllarne l'esito). */
  const collega = (punto: string, pin: number) => request(app).put(`/api/compendio/punti/${encodeURIComponent(punto)}/pin/${pin}`);
  /** Legge la scheda del Palazzo di Kamoshida con la partita di prova, pretendendo il 200. */
  const scheda = async () => (await request(app).get(`/api/compendio/dungeon/kamoshida?partita=${partita}`).expect(200)).body.data as DungeonDettaglioDto;
  /** Le voci (punti) dell'area data, di serie quella di prova, come le mostra la scheda del Palazzo. */
  const vociDi = async (a = area) => (await scheda()).aree.find((x) => x.chiave === a)!.punti;

  beforeAll(async () => {
    dbDiProva();
    partita = ((await request(app).post('/api/partite').send({ nome: 'Enigmi' })).body.data as { id: number }).id;
    // un'area di Kamoshida con una planimetria e due pin liberi sopra; un'altra area del Palazzo
    const righe = prepared(`SELECT e.entita_chiave AS area, s.id, s.uid FROM mappa_entita e JOIN spillo s ON s.mappa_chiave = e.mappa_chiave
      WHERE e.entita_tipo = 'area' AND e.entita_chiave LIKE 'kamoshida-%' AND s.riferimento_tipo IS NULL AND s.voce_chiave IS NULL AND s.uid IS NOT NULL AND s.tipo <> 'nemico' ORDER BY e.entita_chiave, s.id`)
      .all() as Array<{ area: string; id: number; uid: string }>;
    const perArea = new Map<string, typeof righe>();
    for (const r of righe) perArea.set(r.area, [...(perArea.get(r.area) ?? []), r]);
    const [scelta, pin] = [...perArea].find(([, v]) => v.length >= 2)!;
    area = scelta;
    pinLiberi = pin;
    altraArea = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' AND chiave <> ? ORDER BY ordine LIMIT 1").pluck().get(area) as string;
  });
  afterAll(() => closeDb());

  it('i passi nascono dentro l’Enigma, in fondo e in ordine fra loro; su e giù si muovono fra i passi', async () => {
    const enigma = await nuova('La porta della torre', 'puzzle');
    const a = await nuova('Tira la leva', 'meccanismo', enigma.chiave);
    const b = await nuova('Apri la porta', 'porta', enigma.chiave);
    expect([a.contenitore, b.contenitore]).toEqual([enigma.chiave, enigma.chiave]);
    const passi = (await vociDi()).filter((p) => p.contenitore === enigma.chiave).sort((x, y) => x.ordine - y.ordine);
    expect(passi.map((p) => p.chiave)).toEqual([a.chiave, b.chiave]);
    // il primo passo non sale oltre l'Enigma: «già il primo del suo Enigma»
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(a.chiave)}/sposta`).send({ verso: -1 }).expect(409)).body.error.message).toMatch(/del suo Enigma/);
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(b.chiave)}/sposta`).send({ verso: -1 }).expect(200);
    const dopo = (await vociDi()).filter((p) => p.contenitore === enigma.chiave).sort((x, y) => x.ordine - y.ordine);
    expect(dopo.map((p) => p.chiave)).toEqual([b.chiave, a.chiave]);
    // le voci dell'area non si mescolano ai passi: l'ultima voce dell'area è ancora l'Enigma (creato dopo le altre)
    const area1 = (await vociDi()).filter((p) => !p.contenitore).sort((x, y) => x.ordine - y.ordine);
    expect(area1[area1.length - 1].chiave).toBe(enigma.chiave);
  });

  it('le regole: un passo sta solo in un Enigma della sua area, un livello solo, e un Enigma con i passi non ha pin né cambia tipo', async () => {
    const enigma = await nuova('Enigma delle regole', 'puzzle');
    const forziere = await nuova('Forziere qualsiasi', 'forziere');
    expect((await request(app).post(`/api/compendio/aree/${area}/punti`).send({ nome: 'X', tipo: 'porta', contenitore: forziere.chiave }).expect(400)).body.error.code).toBe('non-un-enigma');
    expect((await request(app).post(`/api/compendio/aree/${altraArea}/punti`).send({ nome: 'X', tipo: 'porta', contenitore: enigma.chiave }).expect(400)).body.error.code).toBe('enigma-di-altra-area');
    expect((await modifica(enigma.chiave, { contenitore: enigma.chiave }).expect(400)).body.error.code).toBe('enigma-dentro-enigma');
    const passo = await nuova('Passo', 'meccanismo', enigma.chiave);
    // un Enigma dentro un Enigma: né un Enigma coi passi dentro un altro, né un passo che fa da Enigma
    const altro = await nuova('Altro enigma', 'puzzle');
    expect((await modifica(enigma.chiave, { contenitore: altro.chiave }).expect(400)).body.error.code).toBe('enigma-dentro-enigma');
    const enigmaPasso = await nuova('Enigma passo', 'puzzle', altro.chiave);
    expect((await request(app).post(`/api/compendio/aree/${area}/punti`).send({ nome: 'X', tipo: 'porta', contenitore: enigmaPasso.chiave }).expect(400)).body.error.code).toBe('enigma-dentro-enigma');
    // i pin stanno sui passi
    expect((await collega(enigma.chiave, pinLiberi[0].id).expect(400)).body.error.code).toBe('enigma-con-passi');
    await collega(passo.chiave, pinLiberi[0].id).expect(200);
    // un Enigma coi pin non accoglie passi finché non li scollega
    const conPin = await nuova('Enigma con pin', 'puzzle');
    await collega(conPin.chiave, pinLiberi[1].id).expect(200);
    expect((await request(app).post(`/api/compendio/aree/${area}/punti`).send({ nome: 'X', tipo: 'porta', contenitore: conPin.chiave }).expect(409)).body.error.code).toBe('enigma-con-pin');
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(conPin.chiave)}/pin/${pinLiberi[1].id}`).expect(200);
    // un Enigma coi passi resta un Enigma
    expect((await modifica(enigma.chiave, { tipo: 'forziere' }).expect(409)).body.error.code).toBe('enigma-con-passi');
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(passo.chiave)}/pin/${pinLiberi[0].id}`).expect(200);
  });

  it('risolto quando i passi sono fatti; segnarlo segna i passi e i loro pin, riaprirlo li riapre; le voci descrittive non contano', async () => {
    const enigma = await nuova('Enigma degli stati', 'puzzle');
    const leva = await nuova('Leva', 'meccanismo', enigma.chiave);
    const porta = await nuova('Porta', 'porta', enigma.chiave);
    await nuova('Nota su come si fa', 'altro', enigma.chiave);
    await collega(leva.chiave, pinLiberi[0].id).expect(200);
    await statoPunto(leva.chiave, 'ottenuto');
    expect(segnato(enigma.chiave)).toBeNull();
    await statoPunto(porta.chiave, 'ottenuto');
    expect(segnato(enigma.chiave)).toBe('ottenuto');
    // riaprire un passo riapre l'Enigma
    await statoPunto(porta.chiave, null);
    expect(segnato(enigma.chiave)).toBeNull();
    // segnare l'Enigma segna i passi, e i pin dei passi
    await statoPunto(enigma.chiave, 'ottenuto');
    expect([segnato(leva.chiave), segnato(porta.chiave), raccolto(pinLiberi[0].uid)]).toEqual(['ottenuto', 'ottenuto', 1]);
    // riaprirlo li riapre
    await statoPunto(enigma.chiave, null);
    expect([segnato(leva.chiave), segnato(porta.chiave), raccolto(pinLiberi[0].uid)]).toEqual([null, null, 0]);
    // dalla mappa: raccogliere il pin dell'ultimo passo che manca risolve l'Enigma
    await statoPunto(porta.chiave, 'ottenuto');
    await request(app).put(`/api/partite/${partita}/spilli/${pinLiberi[0].id}`).send({ raccolto: true }).expect(200);
    expect([segnato(leva.chiave), segnato(enigma.chiave)]).toEqual(['ottenuto', 'ottenuto']);
    await request(app).put(`/api/partite/${partita}/spilli/${pinLiberi[0].id}`).send({ raccolto: false }).expect(200);
    expect([segnato(leva.chiave), segnato(enigma.chiave)]).toEqual([null, null]);
    await statoPunto(porta.chiave, null);
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(leva.chiave)}/pin/${pinLiberi[0].id}`).expect(200);
  });

  it('un passo nuovo ancora da fare riapre un Enigma risolto (scelta dell’utente); spostare, cambiare tipo o togliere passi lo ricalcola', async () => {
    const enigma = await nuova('Enigma che cresce', 'puzzle');
    const primo = await nuova('Primo', 'meccanismo', enigma.chiave);
    await statoPunto(enigma.chiave, 'ottenuto');
    expect([segnato(primo.chiave), segnato(enigma.chiave)]).toEqual(['ottenuto', 'ottenuto']);
    // un passo nuovo: resta da fare, e l'Enigma si riapre (i progressi non cambiano da soli)
    const secondo = await nuova('Secondo', 'porta', enigma.chiave);
    expect([segnato(secondo.chiave), segnato(enigma.chiave)]).toEqual([null, null]);
    await statoPunto(secondo.chiave, 'ottenuto');
    expect(segnato(enigma.chiave)).toBe('ottenuto');
    // una voce dell'area ancora da fare, portata dentro: lo stesso
    const fuori = await nuova('Ancora da fare', 'storia');
    await modifica(fuori.chiave, { contenitore: enigma.chiave }).expect(200);
    expect([segnato(fuori.chiave), segnato(enigma.chiave)]).toEqual([null, null]);
    // portata fuori, l'Enigma torna risolto (gli altri passi sono fatti)
    await modifica(fuori.chiave, { contenitore: null }).expect(200);
    expect(segnato(enigma.chiave)).toBe('ottenuto');
    expect(((await vociDi()).find((p) => p.chiave === fuori.chiave)!).contenitore).toBeNull();
    // di nuovo dentro (riapre), poi diventa una nota: le descrittive non contano, l'Enigma è risolto
    await modifica(fuori.chiave, { contenitore: enigma.chiave }).expect(200);
    expect(segnato(enigma.chiave)).toBeNull();
    await modifica(fuori.chiave, { tipo: 'altro' }).expect(200);
    expect(segnato(enigma.chiave)).toBe('ottenuto');
    // tolto un passo da fare, l'Enigma segue quelli che restano
    await statoPunto(primo.chiave, null);
    expect(segnato(enigma.chiave)).toBeNull();
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(primo.chiave)}`).expect(204);
    expect(segnato(enigma.chiave)).toBe('ottenuto');
  });

  it('un elemento della guida senza mappa (lo strato di prima) che segna un Enigma coi passi segna anche i passi, e riaprendolo li riapre', async () => {
    const el = prepared("SELECT s.id, s.riferimento_chiave AS punto, p.area_chiave AS area FROM spillo s JOIN punto_interesse p ON p.chiave = s.riferimento_chiave WHERE s.mappa_chiave IS NULL AND s.riferimento_tipo = 'punto' AND s.uid IS NOT NULL AND p.tipo <> 'altro' ORDER BY s.id LIMIT 1").get() as { id: number; punto: string; area: string };
    expect(el).toBeTruthy();
    // la voce dell'elemento diventa un Enigma e riceve un passo
    await modifica(el.punto, { tipo: 'puzzle' }).expect(200);
    const passo = await nuova('Passo dell’elemento', 'meccanismo', el.punto, el.area);
    await request(app).put(`/api/partite/${partita}/spilli/${el.id}`).send({ raccolto: true }).expect(200);
    expect([segnato(el.punto), segnato(passo.chiave)]).toEqual(['ottenuto', 'ottenuto']);
    await request(app).put(`/api/partite/${partita}/spilli/${el.id}`).send({ raccolto: false }).expect(200);
    expect([segnato(el.punto), segnato(passo.chiave)]).toEqual([null, null]);
  });

  it('segnare l’Enigma non riscrive i passi già segnati: un passo «esaurito» resta «esaurito»', async () => {
    const enigma = await nuova('Enigma con un passo esaurito', 'puzzle');
    const esaurito = await nuova('Forziere esaurito', 'forziere', enigma.chiave);
    const libero = await nuova('Leva', 'meccanismo', enigma.chiave);
    await statoPunto(esaurito.chiave, 'esaurito');
    await statoPunto(enigma.chiave, 'ottenuto');
    expect([segnato(esaurito.chiave), segnato(libero.chiave), segnato(enigma.chiave)]).toEqual(['esaurito', 'ottenuto', 'ottenuto']);
    // anche segnandolo «esaurito»: i passi già fatti restano come sono
    await statoPunto(enigma.chiave, 'esaurito');
    expect([segnato(esaurito.chiave), segnato(libero.chiave), segnato(enigma.chiave)]).toEqual(['esaurito', 'ottenuto', 'esaurito']);
    await statoPunto(enigma.chiave, null);
  });

  it('collegando a un passo un pin già raccolto, gli stati si uniscono e l’Enigma che aspettava solo quel passo è risolto', async () => {
    const enigma = await nuova('Enigma dell’unione', 'puzzle');
    const fatto = await nuova('Già fatto', 'meccanismo', enigma.chiave);
    const ultimo = await nuova('L’ultimo', 'porta', enigma.chiave);
    await statoPunto(fatto.chiave, 'ottenuto');
    // il pin raccolto prima, ancora di nessuna voce
    await request(app).put(`/api/partite/${partita}/spilli/${pinLiberi[1].id}`).send({ raccolto: true }).expect(200);
    expect(segnato(enigma.chiave)).toBeNull();
    await collega(ultimo.chiave, pinLiberi[1].id).expect(200);
    expect([segnato(ultimo.chiave), segnato(enigma.chiave)]).toEqual(['ottenuto', 'ottenuto']);
    await statoPunto(enigma.chiave, null);
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(ultimo.chiave)}/pin/${pinLiberi[1].id}`).expect(200);
  });

  it('anche dall’editor delle mappe: un pin già raccolto dato all’ultimo passo che manca risolve l’Enigma', async () => {
    const enigma = await nuova('Enigma dell’editor', 'puzzle');
    const fatto = await nuova('Fatto prima', 'meccanismo', enigma.chiave);
    const ultimo = await nuova('Ultimo passo', 'porta', enigma.chiave);
    await statoPunto(fatto.chiave, 'ottenuto');
    await request(app).put(`/api/partite/${partita}/spilli/${pinLiberi[1].id}`).send({ raccolto: true }).expect(200);
    // l'editor delle mappe: un riferimento «punto» diventa la voce del pin, e gli stati si uniscono
    await request(app).put(`/api/mappe/spilli/${pinLiberi[1].id}`).send({ riferimento: { tipo: 'punto', chiave: ultimo.chiave } }).expect(200);
    expect([segnato(ultimo.chiave), segnato(enigma.chiave)]).toEqual(['ottenuto', 'ottenuto']);
    await statoPunto(enigma.chiave, null);
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(ultimo.chiave)}/pin/${pinLiberi[1].id}`).expect(200);
  });

  it('il boss finale che fa da passo: il Tesoro raccolto lo segna e l’Enigma lo segue; tolto, si riapre', async () => {
    const finale = bossFinali().get('okumura')!;
    const enigma = await nuova('Enigma del boss', 'puzzle', undefined, finale.area);
    for (const p of finale.punti) await modifica(p, { contenitore: enigma.chiave }).expect(200);
    const mappa = creaMappa(undefined, { nome: 'Caveau degli enigmi', tipo: 'area', genitore: 'dungeon-okumura' });
    const tesoro = (await request(app).post(`/api/mappe/${mappa.chiave}/spilli`).send({ tipo: 'tesoro-palazzo', nome: 'Tesoro del Palazzo', x: 50, y: 50 }).expect(201)).body.data as { id: number };
    await request(app).put(`/api/partite/${partita}/spilli/${tesoro.id}`).send({ raccolto: true }).expect(200);
    expect([...finale.punti.map(segnato), segnato(enigma.chiave)].every((s) => s === 'ottenuto')).toBe(true);
    await request(app).put(`/api/partite/${partita}/spilli/${tesoro.id}`).send({ raccolto: false }).expect(200);
    expect([...finale.punti.map(segnato), segnato(enigma.chiave)].every((s) => s === null)).toBe(true);
  });

  it('nei contenuti della guida di una planimetria i passi stanno subito sotto il loro Enigma, nel loro ordine', async () => {
    const enigma = await nuova('Enigma dei contenuti', 'puzzle');
    const primo = await nuova('Primo passo', 'meccanismo', enigma.chiave);
    const secondo = await nuova('Secondo passo', 'porta', enigma.chiave);
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(secondo.chiave)}/sposta`).send({ verso: -1 }).expect(200);
    const mappa = prepared("SELECT mappa_chiave FROM mappa_entita WHERE entita_tipo = 'area' AND entita_chiave = ?").pluck().get(area) as string;
    const contenuti = (await request(app).get(`/api/mappe/contenuti/${mappa}`).expect(200)).body.data as { aree: Array<{ chiave: string; punti: Array<{ id: string | number; nome: string; contenitore?: string | number | null }> }> };
    const punti = contenuti.aree.find((a) => a.chiave === area)!.punti;
    const i = punti.findIndex((p) => p.id === `punto:${enigma.chiave}`);
    expect(punti.slice(i, i + 3).map((p) => [p.nome, p.contenitore ?? null])).toEqual([
      ['Enigma dei contenuti', null], ['Secondo passo', `punto:${enigma.chiave}`], ['Primo passo', `punto:${enigma.chiave}`],
    ]);
    expect(punti.filter((p) => p.contenitore === `punto:${enigma.chiave}`)).toHaveLength(2);
    expect(primo.contenitore).toBe(enigma.chiave);
  });

  it('eliminato l’Enigma, i passi restano voci dell’area, in fondo e nel loro ordine, con il loro stato', async () => {
    const enigma = await nuova('Enigma da togliere', 'puzzle');
    const a = await nuova('Passo A', 'meccanismo', enigma.chiave);
    const b = await nuova('Passo B', 'porta', enigma.chiave);
    await statoPunto(a.chiave, 'ottenuto');
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(enigma.chiave)}`).expect(204);
    const voci = (await vociDi()).filter((p) => !p.contenitore).sort((x, y) => x.ordine - y.ordine);
    expect(voci.slice(-2).map((p) => p.chiave)).toEqual([a.chiave, b.chiave]);
    expect([segnato(a.chiave), segnato(b.chiave)]).toEqual(['ottenuto', null]);
    expect(prepared('SELECT COUNT(*) FROM punto_interesse WHERE contenitore_chiave = ?').pluck().get(enigma.chiave)).toBe(0);
  });

  it('gli stati nuovi dei pin (2026-10-03) seguono la guida e l’Enigma: leva azionata e porta aperta risolvono l’Enigma, e il contrario', async () => {
    const mappaArea = prepared('SELECT mappa_chiave FROM spillo WHERE id = ?').pluck().get(pinLiberi[0].id) as string;
    /** Crea sulla planimetria dell'area un pin del tipo dato, pretende il 201 e ne restituisce l'id. */
    const nuovoPin = async (tipo: string, nome: string) => (await request(app).post(`/api/mappe/${mappaArea}/spilli`).send({ tipo, nome, x: 5, y: 5 }).expect(201)).body.data as { id: number };
    /** Restituisce l'uid stabile dello spillo con quell'id. */
    const uid = (id: number) => prepared('SELECT uid FROM spillo WHERE id = ?').pluck().get(id) as string;
    /** Segna (o toglie il segno) del pin `id` nella partita di prova, pretendendo il 200. */
    const segna = (id: number, si: boolean) => request(app).put(`/api/partite/${partita}/spilli/${id}`).send({ raccolto: si }).expect(200);
    const leva = await nuovoPin('meccanismo', 'Leva del ponte');
    const porta = await nuovoPin('porta', 'Porta del ponte');
    const enigma = await nuova('Il ponte levatoio', 'puzzle');
    const passoLeva = await nuova('Aziona la leva', 'meccanismo', enigma.chiave);
    const passoPorta = await nuova('Apri la porta del ponte', 'porta', enigma.chiave);
    await collega(passoLeva.chiave, leva.id).expect(200);
    await collega(passoPorta.chiave, porta.id).expect(200);
    // pin → voce → Enigma
    await segna(leva.id, true);
    expect([segnato(passoLeva.chiave), segnato(enigma.chiave)]).toEqual(['ottenuto', null]);
    await segna(porta.id, true);
    expect([segnato(passoPorta.chiave), segnato(enigma.chiave)]).toEqual(['ottenuto', 'ottenuto']);
    // la porta richiusa riapre il suo passo e l'Enigma; la leva resta azionata
    await segna(porta.id, false);
    expect([segnato(passoLeva.chiave), segnato(passoPorta.chiave), segnato(enigma.chiave)]).toEqual(['ottenuto', null, null]);
    // l'Enigma segnato dalla guida segna i passi e i loro pin
    await statoPunto(enigma.chiave, 'ottenuto');
    expect([raccolto(uid(leva.id)), raccolto(uid(porta.id))]).toEqual([1, 1]);
    const spilli = (await request(app).get(`/api/mappe/${mappaArea}?partita=${partita}`).expect(200)).body.data.spilli as Array<{ id: number; raccolto: boolean; voce: { stato: string | null } | null }>;
    expect(spilli.find((s) => s.id === porta.id)).toMatchObject({ raccolto: true, voce: { stato: 'ottenuto' } });
    // riaperto l'Enigma, tutto torna da fare: passi e pin
    await statoPunto(enigma.chiave, null);
    expect([raccolto(uid(leva.id)), raccolto(uid(porta.id)), segnato(passoLeva.chiave), segnato(passoPorta.chiave)]).toEqual([0, 0, null, null]);
  });
});
