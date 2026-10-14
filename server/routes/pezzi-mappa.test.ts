// ============================================================
// I pezzi delle planimetrie (102): zone dell'immagine scelte dall'utente, posate altrove con condizioni (2026-10-14)
// ============================================================
//
// Richiesta dell'utente: «in alcune mappe ci sono dei pezzi che sono previsti originariamente per posizionarli sopra il resto come
// parti mobili soggette a condizioni... permettermi di selezionarle con il mouse (toglierle dalla visualizzazione ordinaria e
// gestirle con le condizioni come i pin in punti specifici della mappa occupando lo stesso spazio originale...)»; «devo poter
// selezionare io aree da gestire come pezzi». Scelte: zona d'origine sempre cancellata; senza condizioni il pezzo è nascosto
// (in trasparenza a richiesta, nel visore); rotazione a 90° e specchio.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import type { EsportazioneMappeDto, MappaDto, PezzoMappaDto } from '../../shared/types.js';
import { esportaMappe, importaMappe } from '../services/mappe/mappeService.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();
/** Una planimetria del gioco di 2048×1024 px (dimensioni salvate). */
const MAPPA = 'nativo-rmap-001-1-0';

/** Un PNG ridotto all'intestazione: quanto basta per leggerne le dimensioni. */
function intestazionePng(larghezza: number, altezza: number): Buffer {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(larghezza, 16);
  b.writeUInt32BE(altezza, 20);
  return b;
}

describe('pezzi delle planimetrie', () => {
  let partita: number;
  const crea = (corpo: Record<string, unknown>, mappa = MAPPA) => request(app).post(`/api/mappe/${mappa}/pezzi`).send(corpo);
  const scheda = async (conPartita = false) => (await request(app).get(`/api/mappe/${MAPPA}${conPartita ? `?partita=${partita}` : ''}`).expect(200)).body.data as MappaDto;

  beforeAll(async () => {
    dbDiProva();
    partita = ((await request(app).post('/api/partite').send({ nome: 'Pezzi' })).body.data as { id: number }).id;
  });
  afterAll(() => closeDb());

  it('crea un pezzo dalla zona scelta: senza posizione sta dove stava, senza nome «Pezzo N»; si sposta, si ruota, si specchia e si rinomina', async () => {
    const r = await crea({ sorgente: { x: 100, y: 900, larghezza: 120, altezza: 40 } });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const p = r.body.data as PezzoMappaDto;
    expect(p).toMatchObject({ nome: 'Pezzo 1', sorgente: { x: 100, y: 900, larghezza: 120, altezza: 40 }, posizione: { x: 100, y: 900 }, rotazione: 0, specchio: { orizzontale: false, verticale: false }, condizioni: [], ordine: 0 });
    expect(p.uid).toMatch(/^[0-9a-f]{32}$/);
    expect(p).not.toHaveProperty('disponibilita');
    const a = await request(app).put(`/api/mappe/pezzi/${p.id}`).send({ nome: 'Muro della sala', posizione: { x: 500, y: 300 }, rotazione: 90, specchio: { orizzontale: true, verticale: false } });
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect(a.body.data).toMatchObject({ id: p.id, uid: p.uid, nome: 'Muro della sala', sorgente: p.sorgente, posizione: { x: 500, y: 300 }, rotazione: 90, specchio: { orizzontale: true, verticale: false } });
    // un nome vuoto lascia quello di prima; i campi assenti restano
    expect((await request(app).put(`/api/mappe/pezzi/${p.id}`).send({ nome: '  ' }).expect(200)).body.data).toMatchObject({ nome: 'Muro della sala', rotazione: 90 });
    // il secondo nasce dopo
    expect((await crea({ sorgente: { x: 0, y: 0, larghezza: 10, altezza: 10 } }).expect(201)).body.data).toMatchObject({ nome: 'Pezzo 2', ordine: 1 });
    expect((await scheda()).pezzi.map((x) => x.nome)).toEqual(['Muro della sala', 'Pezzo 2']);
  });

  it('zona e ingombro devono stare nell\'immagine (2048×1024), anche ruotato; le forme sbagliate si rifiutano', async () => {
    const codice = async (r: request.Test) => { const x = await r; return [x.status, x.body.error?.code]; };
    expect(await codice(crea({ sorgente: { x: 2000, y: 0, larghezza: 49, altezza: 10 } }))).toEqual([400, 'pezzo-fuori-immagine']);
    expect(await codice(crea({ sorgente: { x: 0, y: 1000, larghezza: 10, altezza: 25 } }))).toEqual([400, 'pezzo-fuori-immagine']);
    // la zona esce anche quando il pezzo è posato dentro
    expect(await codice(crea({ sorgente: { x: 2000, y: 1000, larghezza: 49, altezza: 25 }, posizione: { x: 0, y: 0 } }))).toEqual([400, 'pezzo-fuori-immagine']);
    // la zona sta (2048 × 10 in fondo a destra), ma posato più in basso no
    expect(await codice(crea({ sorgente: { x: 0, y: 1014, larghezza: 300, altezza: 10 }, posizione: { x: 0, y: 1015 } }))).toEqual([400, 'pezzo-fuori-immagine']);
    // 300 × 10 posato a x 1800 sta; ruotato di 90° diventa 10 × 300 e a y 800 esce in basso (800 + 300 > 1024)
    const p = (await crea({ sorgente: { x: 0, y: 1014, larghezza: 300, altezza: 10 }, posizione: { x: 1700, y: 800 } }).expect(201)).body.data as PezzoMappaDto;
    expect(await codice(request(app).put(`/api/mappe/pezzi/${p.id}`).send({ rotazione: 90 }))).toEqual([400, 'pezzo-fuori-immagine']);
    expect((await request(app).put(`/api/mappe/pezzi/${p.id}`).send({ rotazione: 90, posizione: { x: 1700, y: 700 } }).expect(200)).body.data).toMatchObject({ rotazione: 90, posizione: { x: 1700, y: 700 } });
    // forme: niente decimali, niente dimensioni nulle, rotazioni solo a 90°
    expect((await crea({ sorgente: { x: 1.5, y: 0, larghezza: 10, altezza: 10 } })).status).toBe(400);
    expect((await crea({ sorgente: { x: 0, y: 0, larghezza: 0, altezza: 10 } })).status).toBe(400);
    expect((await crea({ sorgente: { x: 0, y: 0, larghezza: 10, altezza: 10 }, rotazione: 45 })).status).toBe(400);
    expect(await codice(crea({ sorgente: { x: 0, y: 0, larghezza: 10, altezza: 10 } }, 'mappa-che-non-esiste'))).toEqual([404, 'mappa-non-trovata']);
    expect(await codice(request(app).put('/api/mappe/pezzi/99999').send({ nome: 'x' }))).toEqual([404, 'pezzo-non-trovato']);
    expect(await codice(request(app).delete('/api/mappe/pezzi/99999'))).toEqual([404, 'pezzo-non-trovato']);
  });

  it('senza dimensioni salvate si leggono dall\'immagine mostrata; senza immagine 409', async () => {
    const senza = prepared("SELECT chiave, asset FROM mappa WHERE larghezza IS NULL AND asset LIKE 'mappe/%' ORDER BY chiave LIMIT 1").get() as { chiave: string; asset: string };
    expect(senza).toBeDefined();
    const codice = async (r: request.Test) => { const x = await r; return [x.status, x.body.error?.code]; };
    expect(await codice(crea({ sorgente: { x: 0, y: 0, larghezza: 10, altezza: 10 } }, senza.chiave))).toEqual([409, 'mappa-senza-immagine']);
    // l'asset della mappa (ambito «mappe») da 300 × 200: la zona deve starci
    // (il pacchetto di prova registra l'asset senza contenuto: per questo prima era «senza immagine»)
    prepared(`INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, contenuto) VALUES ('mappe', ?, 'prova.png', 'image/png', 33, 'x', ?)
      ON CONFLICT(ambito, chiave) DO UPDATE SET contenuto = excluded.contenuto, byte = excluded.byte`).run(senza.asset.slice('mappe/'.length), intestazionePng(300, 200));
    expect(await codice(crea({ sorgente: { x: 0, y: 0, larghezza: 301, altezza: 10 } }, senza.chiave))).toEqual([400, 'pezzo-fuori-immagine']);
    expect((await crea({ sorgente: { x: 0, y: 190, larghezza: 300, altezza: 10 } }, senza.chiave)).status).toBe(201);
  });

  it('le condizioni sono quelle dei pin: con la partita ogni pezzo porta il suo esito; senza partita nessun esito; si tolgono con null', async () => {
    const sera = (await crea({ nome: 'Di sera', sorgente: { x: 10, y: 10, larghezza: 10, altezza: 10 }, condizioni: [{ tipo: 'fascia', fascia: 'sera' }] }).expect(201)).body.data as PezzoMappaDto;
    const giorno = (await crea({ nome: 'Di giorno', sorgente: { x: 30, y: 10, larghezza: 10, altezza: 10 }, condizioni: [{ tipo: 'fascia', fascia: 'giorno' }] }).expect(201)).body.data as PezzoMappaDto;
    expect(sera.condizioni).toEqual([expect.objectContaining({ tipo: 'fascia', fascia: 'sera', testo: expect.any(String) })]);
    const conPartita = (await scheda(true)).pezzi;
    expect(conPartita.find((p) => p.id === sera.id)?.disponibilita?.stato).toBe('bloccato');
    expect(conPartita.find((p) => p.id === giorno.id)?.disponibilita?.stato).toBe('disponibile');
    // senza condizioni: disponibile
    expect(conPartita.find((p) => p.nome === 'Pezzo 2')?.disponibilita).toEqual({ stato: 'disponibile', requisiti: [] });
    expect((await scheda()).pezzi.every((p) => p.disponibilita === undefined)).toBe(true);
    // anche lo stato di un pin (condizione dei soli pin) vale per un pezzo
    const leva = (await request(app).post(`/api/mappe/${MAPPA}/spilli`).send({ tipo: 'forziere', nome: 'Forziere della prova', x: 50, y: 50 }).expect(201)).body.data as { uid: string };
    const conPin = await request(app).put(`/api/mappe/pezzi/${sera.id}`).send({ condizioni: [{ tipo: 'spillo', spillo: leva.uid, segnato: true }] });
    expect(conPin.status, JSON.stringify(conPin.body)).toBe(200);
    expect((await scheda(true)).pezzi.find((p) => p.id === sera.id)?.disponibilita?.stato).toBe('bloccato');
    // una chiave che non c'è si rifiuta, come nei pin
    expect((await request(app).put(`/api/mappe/pezzi/${sera.id}`).send({ condizioni: [{ tipo: 'palazzo', dungeon: 'palazzo-che-non-esiste' }] })).body.error.code).toBe('condizione-non-trovata');
    expect((await request(app).put(`/api/mappe/pezzi/${sera.id}`).send({ condizioni: null }).expect(200)).body.data.condizioni).toEqual([]);
  });

  it('esportazione e importazione: i pezzi viaggiano con la mappa; un pacchetto senza il campo li lascia; un reseed non li tocca', () => {
    const esportate = esportaMappe().mappe;
    const pacchettoMappa = esportate.find((m) => (m.pezzi ?? []).some((p) => p.nome === 'Muro della sala'))!;
    expect(pacchettoMappa.pezzi!.map((p) => p.nome)).toEqual(['Muro della sala', 'Pezzo 2', 'Pezzo 3', 'Di sera', 'Di giorno']);
    expect(pacchettoMappa.pezzi![0]).toMatchObject({ sorgente: { x: 100, y: 900, larghezza: 120, altezza: 40 }, posizione: { x: 500, y: 300 }, rotazione: 90, specchio: { orizzontale: true, verticale: false } });
    // ogni mappa dice i suoi pezzi, anche nessuno
    expect(esportate.every((m) => Array.isArray(m.pezzi))).toBe(true);
    const uidPrima = pacchettoMappa.pezzi!.map((p) => p.uid);
    const conta = () => prepared('SELECT COUNT(*) FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(MAPPA) as number;
    // un pacchetto che toglie il terzo e cambia il primo: sostituisce, e tiene gli uid
    const nuovo: EsportazioneMappeDto = { versione: 1, mappe: [{ ...pacchettoMappa, pezzi: [{ ...pacchettoMappa.pezzi![0], nome: 'Muro importato', condizioni: [{ tipo: 'palazzo', dungeon: 'palazzo-che-non-esiste' }] }, ...pacchettoMappa.pezzi!.slice(1, 2)] }], immagini: {} };
    const esito = importaMappe(nuovo, { sovrascrivi: true });
    expect(esito.pezzi).toBe(2);
    expect(esito.condizioniScartate).toBeGreaterThanOrEqual(1);
    const dopo = prepared('SELECT uid, nome, condizioni_json FROM pezzo_mappa WHERE mappa_chiave = ? ORDER BY ordine, id').all(MAPPA) as Array<{ uid: string; nome: string; condizioni_json: string | null }>;
    expect(dopo.map((p) => p.nome)).toEqual(['Muro importato', 'Pezzo 2']);
    expect(dopo.map((p) => p.uid)).toEqual(uidPrima.slice(0, 2));
    expect(dopo[0].condizioni_json).toBeNull();
    // un pacchetto di prima, senza il campo: i pezzi restano
    const { pezzi: _tolti, ...senzaPezzi } = pacchettoMappa;
    importaMappe({ versione: 1, mappe: [senzaPezzi], immagini: {} }, { sovrascrivi: true });
    expect(conta()).toBe(2);
    // un reseed (seed sopra seed, senza sovrascrivi) non li tocca, anche se il pacchetto ne porta altri
    prepared("UPDATE mappa SET origine = 'seed' WHERE chiave = ?").run(MAPPA);
    importaMappe({ versione: 1, mappe: [{ ...pacchettoMappa, pezzi: [] }], immagini: {} }, { origine: 'seed' });
    expect(conta()).toBe(2);
    // forme sbagliate: 400 e nulla cambia
    expect(() => importaMappe({ versione: 1, mappe: [{ ...pacchettoMappa, pezzi: [{ ...pacchettoMappa.pezzi![0], rotazione: 45 as 90 }] }], immagini: {} }, { sovrascrivi: true })).toThrow(/Pezzi della planimetria non validi/);
    expect(conta()).toBe(2);
  });

  it('sostituire l\'immagine di una mappa con dei pezzi chiede conferma (409); confermata, i pezzi se ne vanno con l\'immagine di prima', async () => {
    const ALTRA = 'nativo-rmap-001-2-0';
    const png = intestazionePng(1000, 500);
    const carica = (q = '') => request(app).put(`/api/mappe/${ALTRA}/immagine${q}`).set('Content-Type', 'image/png').send(png);
    const dim = () => prepared('SELECT larghezza, altezza FROM mappa WHERE chiave = ?').get(ALTRA) as { larghezza: number; altezza: number };
    await crea({ sorgente: { x: 10, y: 10, larghezza: 50, altezza: 20 } }, ALTRA).expect(201);
    await crea({ sorgente: { x: 100, y: 10, larghezza: 50, altezza: 20 } }, ALTRA).expect(201);
    const no = await carica();
    expect([no.status, no.body.error.code, no.body.error.details]).toEqual([409, 'mappa-con-pezzi', { pezzi: 2 }]);
    expect(no.body.error.message).toMatch(/2 pezzi ritagliati.*verranno eliminati/);
    expect(dim()).toEqual({ larghezza: 2048, altezza: 1024 });
    expect(prepared('SELECT COUNT(*) FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(ALTRA)).toBe(2);
    const si = await carica('?eliminaPezzi=1');
    expect(si.status, JSON.stringify(si.body)).toBe(200);
    expect((si.body.data as MappaDto).pezzi).toEqual([]);
    expect(dim()).toEqual({ larghezza: 1000, altezza: 500 });
    // senza pezzi non c'è niente da confermare
    expect((await carica()).status).toBe(200);
  });

  it('all\'importazione i pezzi che escono dall\'immagine della mappa d\'arrivo si scartano e si contano', () => {
    const ALTRA = 'nativo-rmap-001-2-0'; // ora 1000 × 500 (test precedente)
    const esportate = esportaMappe().mappe;
    // l'immagine caricata nel test precedente ha la chiave della mappa
    const mappa = esportate.find((m) => m.immagine === ALTRA)!;
    expect(mappa).toMatchObject({ larghezza: 1000, altezza: 500 });
    const pezzo = (x: number, larghezza: number) => ({ nome: `a ${x}`, sorgente: { x, y: 0, larghezza, altezza: 10 }, posizione: { x: 0, y: 0 }, rotazione: 0 as const, specchio: { orizzontale: false, verticale: false }, ordine: 0 });
    // dentro (0..999), la zona esce (990 + 20), l'ingombro ruotato esce (10 × 600 in altezza su 500)
    const esito = importaMappe({ versione: 1, mappe: [{ ...mappa, pezzi: [pezzo(0, 100), pezzo(990, 20), { ...pezzo(0, 600), rotazione: 90 }] }], immagini: {} }, { sovrascrivi: true });
    expect([esito.pezzi, esito.pezziScartati]).toEqual([1, 2]);
    expect(prepared('SELECT nome FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().all(ALTRA)).toEqual(['a 0']);
    // una mappa senza immagine né dimensioni: tutti scartati
    // l'esportazione usa la chiave pubblica (`mappa_percorso`)
    const chiaveSenza = prepared(`SELECT COALESCE((SELECT p.chiave FROM mappa_percorso p WHERE p.mappa_chiave = m.chiave), m.chiave) FROM mappa m WHERE m.larghezza IS NULL AND m.chiave LIKE 'citta-%' AND NOT EXISTS (SELECT 1 FROM immagine i WHERE i.contenuto IS NOT NULL
      AND ((i.ambito = 'mappe' AND 'mappe/' || i.chiave = m.asset) OR (i.ambito = 'mappa' AND i.chiave = m.chiave))) ORDER BY m.chiave LIMIT 1`).pluck().get() as string;
    const senza = esportate.find((m) => m.chiave === chiaveSenza)!;
    expect(senza).toMatchObject({ larghezza: null });
    const nessuna = importaMappe({ versione: 1, mappe: [{ ...senza, pezzi: [pezzo(0, 10)] }], immagini: {} }, { sovrascrivi: true });
    expect([nessuna.pezzi, nessuna.pezziScartati]).toEqual([0, 1]);
  });

  it('un pacchetto senza pezzi che porta un\'immagine diversa toglie i pezzi della mappa e li conta; con la stessa immagine restano', () => {
    const ALTRA = 'nativo-rmap-001-2-0'; // 1000 × 500 con il pezzo «a 0» (test precedente)
    const conta = () => prepared('SELECT COUNT(*) FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(ALTRA) as number;
    expect(conta()).toBe(1);
    const { pezzi: _p, ...mappa } = esportaMappe().mappe.find((m) => m.immagine === ALTRA)!;
    const uguale = intestazionePng(1000, 500).toString('base64');
    const stessa = importaMappe({ versione: 1, mappe: [mappa], immagini: { [ALTRA]: { mime: 'image/png', base64: uguale } } }, { sovrascrivi: true });
    expect([stessa.immagini, stessa.pezziEliminati]).toEqual([1, 0]);
    expect(conta()).toBe(1);
    // stesse dimensioni, contenuto diverso: è un'altra immagine
    const diversa = Buffer.concat([intestazionePng(1000, 500), Buffer.from([1])]).toString('base64');
    const altra = importaMappe({ versione: 1, mappe: [mappa], immagini: { [ALTRA]: { mime: 'image/png', base64: diversa } } }, { sovrascrivi: true });
    expect([altra.immagini, altra.pezziEliminati, altra.pezzi]).toEqual([1, 1, 0]);
    expect(conta()).toBe(0);
    // un pacchetto che fa puntare la mappa a un'altra immagine già presente, senza portarne il contenuto (nota N1 del validatore)
    prepared(`INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, contenuto) VALUES ('mappa', 'altra-immagine-presente', 'a.png', 'image/png', 34, 'x', ?)`)
      .run(Buffer.concat([intestazionePng(1000, 500), Buffer.from([2])]));
    const ripresa = esportaMappe().mappe.find((m) => m.immagine === ALTRA)!;
    importaMappe({ versione: 1, mappe: [ripresa], immagini: {} }, { sovrascrivi: true });
    prepared("INSERT INTO pezzo_mappa (uid, mappa_chiave, nome, sorgente_x, sorgente_y, larghezza, altezza, x, y, updated_at) VALUES ('ab'||hex(randomblob(15)), ?, 'p', 0, 0, 10, 10, 0, 0, 'x')").run(ALTRA);
    const { pezzi: _q, ...versoAltra } = { ...ripresa, immagine: 'altra-immagine-presente' };
    const cambio = importaMappe({ versione: 1, mappe: [versoAltra], immagini: {} }, { sovrascrivi: true });
    expect([cambio.immagini, cambio.pezziEliminati]).toEqual([0, 1]);
    expect(conta()).toBe(0);
  });

  it('eliminando il pezzo la sua zona torna; eliminando la mappa se ne vanno i suoi pezzi', async () => {
    const p = (await scheda()).pezzi[0];
    await request(app).delete(`/api/mappe/pezzi/${p.id}`).expect(204);
    expect((await scheda()).pezzi.some((x) => x.id === p.id)).toBe(false);
    expect(prepared('SELECT COUNT(*) FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(MAPPA)).toBeGreaterThan(0);
    await request(app).delete(`/api/mappe/${MAPPA}`).expect(204);
    expect(prepared('SELECT COUNT(*) FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(MAPPA)).toBe(0);
  });
});
