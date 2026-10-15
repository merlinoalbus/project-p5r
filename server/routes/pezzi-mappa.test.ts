// ============================================================
// I pezzi delle planimetrie (102): zone dell'immagine scelte dall'utente, posate altrove con condizioni (2026-10-14), in una o più
// copie (103, 2026-10-15)
// ============================================================
//
// Richiesta dell'utente: «in alcune mappe ci sono dei pezzi che sono previsti originariamente per posizionarli sopra il resto come
// parti mobili soggette a condizioni... permettermi di selezionarle con il mouse (toglierle dalla visualizzazione ordinaria e
// gestirle con le condizioni come i pin in punti specifici della mappa occupando lo stesso spazio originale...)»; «devo poter
// selezionare io aree da gestire come pezzi». Scelte: zona d'origine sempre cancellata; senza condizioni il pezzo è nascosto
// (in trasparenza a richiesta, nel visore); rotazione a 90° e specchio.
// Poi (2026-10-15): «vorrei poter usare un pezzo una volta recuperato e definito per inserirlo più volte nella mappa». Scelte:
// ritaglio con copie; condizioni per copia; eliminata l'ultima copia se ne va il ritaglio; nome del ritaglio + etichetta della copia.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import type { CopiaPezzoDto, EsportazioneMappeDto, MappaDto, PezzoMappaDto, PezzoPacchetto, PezzoPacchetto102 } from '../../shared/types.js';
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

/** Una copia del pacchetto, ferma (senza rotazione né specchio). */
const copiaPacchetto = (x: number, y: number, extra: Partial<PezzoPacchetto['copie'][number]> = {}): PezzoPacchetto['copie'][number] =>
  ({ posizione: { x, y }, rotazione: 0, specchio: { orizzontale: false, verticale: false }, ordine: 0, ...extra });
/** I pezzi del pacchetto di una mappa nella forma della 103 (l'esportazione scrive solo quella). */
const della103 = (m: EsportazioneMappeDto['mappe'][number]): PezzoPacchetto[] => (m.pezzi ?? []) as PezzoPacchetto[];

describe('pezzi delle planimetrie', () => {
  let partita: number;
  const crea = (corpo: Record<string, unknown>, mappa = MAPPA) => request(app).post(`/api/mappe/${mappa}/pezzi`).send(corpo);
  const aggiungiCopia = (pezzo: number, corpo: Record<string, unknown>) => request(app).post(`/api/mappe/pezzi/${pezzo}/copie`).send(corpo);
  const correggiCopia = (copia: number, corpo: Record<string, unknown>) => request(app).put(`/api/mappe/pezzi/copie/${copia}`).send(corpo);
  const scheda = async (conPartita = false) => (await request(app).get(`/api/mappe/${MAPPA}${conPartita ? `?partita=${partita}` : ''}`).expect(200)).body.data as MappaDto;
  const codice = async (r: request.Test) => { const x = await r; return [x.status, x.body.error?.code]; };

  beforeAll(async () => {
    dbDiProva();
    partita = ((await request(app).post('/api/partite').send({ nome: 'Pezzi' })).body.data as { id: number }).id;
  });
  afterAll(() => closeDb());

  it('crea un pezzo dalla zona scelta con la sua prima copia: senza posizione sta dove stava, senza nome «Pezzo N»; la copia si sposta, si ruota, si specchia; il pezzo si rinomina', async () => {
    const r = await crea({ sorgente: { x: 100, y: 900, larghezza: 120, altezza: 40 } });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const p = r.body.data as PezzoMappaDto;
    expect(p).toMatchObject({ nome: 'Pezzo 1', sorgente: { x: 100, y: 900, larghezza: 120, altezza: 40 }, ordine: 0 });
    expect(p.copie).toHaveLength(1);
    expect(p.copie[0]).toMatchObject({ pezzoId: p.id, etichetta: '', posizione: { x: 100, y: 900 }, rotazione: 0, specchio: { orizzontale: false, verticale: false }, condizioni: [], ordine: 0 });
    expect(p.uid).toMatch(/^[0-9a-f]{32}$/);
    expect(p.copie[0].uid).toMatch(/^[0-9a-f]{32}$/);
    expect(p.copie[0].uid).not.toBe(p.uid);
    expect(p.copie[0]).not.toHaveProperty('disponibilita');
    const a = await correggiCopia(p.copie[0].id, { posizione: { x: 500, y: 300 }, rotazione: 90, specchio: { orizzontale: true, verticale: false } });
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect(a.body.data).toMatchObject({ id: p.copie[0].id, uid: p.copie[0].uid, posizione: { x: 500, y: 300 }, rotazione: 90, specchio: { orizzontale: true, verticale: false } });
    const n = await request(app).put(`/api/mappe/pezzi/${p.id}`).send({ nome: 'Muro della sala' });
    expect(n.status, JSON.stringify(n.body)).toBe(200);
    expect(n.body.data).toMatchObject({ id: p.id, uid: p.uid, nome: 'Muro della sala', sorgente: p.sorgente });
    expect((n.body.data as PezzoMappaDto).copie[0]).toMatchObject({ posizione: { x: 500, y: 300 }, rotazione: 90 });
    // un nome vuoto lascia quello di prima; i campi assenti restano
    expect((await request(app).put(`/api/mappe/pezzi/${p.id}`).send({ nome: '  ' }).expect(200)).body.data).toMatchObject({ nome: 'Muro della sala' });
    expect((await correggiCopia(p.copie[0].id, {}).expect(200)).body.data).toMatchObject({ posizione: { x: 500, y: 300 }, rotazione: 90, specchio: { orizzontale: true, verticale: false } });
    // il secondo nasce dopo; la prima copia si può già descrivere alla creazione
    const secondo = (await crea({ sorgente: { x: 0, y: 0, larghezza: 10, altezza: 10 }, copia: { etichetta: ' In alto ', posizione: { x: 40, y: 50 }, rotazione: 180 } }).expect(201)).body.data as PezzoMappaDto;
    expect(secondo).toMatchObject({ nome: 'Pezzo 2', ordine: 1 });
    expect(secondo.copie[0]).toMatchObject({ etichetta: 'In alto', posizione: { x: 40, y: 50 }, rotazione: 180 });
    expect((await scheda()).pezzi.map((x) => x.nome)).toEqual(['Muro della sala', 'Pezzo 2']);
  });

  it('un pezzo si posa in più copie: ognuna con posizione, rotazione, specchio ed etichetta propri; la zona resta una', async () => {
    const muro = (await scheda()).pezzi.find((p) => p.nome === 'Muro della sala')!;
    // senza posizione la copia sta sulla zona d'origine, e va in fondo alle copie
    const c2 = await aggiungiCopia(muro.id, {});
    expect(c2.status, JSON.stringify(c2.body)).toBe(201);
    expect(c2.body.data).toMatchObject({ pezzoId: muro.id, etichetta: '', posizione: { x: 100, y: 900 }, rotazione: 0, specchio: { orizzontale: false, verticale: false }, ordine: 1 });
    const c3 = (await aggiungiCopia(muro.id, { etichetta: 'Ala est', posizione: { x: 1500, y: 100 }, rotazione: 270, specchio: { orizzontale: false, verticale: true } }).expect(201)).body.data as CopiaPezzoDto;
    expect(c3).toMatchObject({ etichetta: 'Ala est', posizione: { x: 1500, y: 100 }, rotazione: 270, specchio: { orizzontale: false, verticale: true }, ordine: 2 });
    const dopo = (await scheda()).pezzi.find((p) => p.id === muro.id)!;
    expect(dopo.sorgente).toEqual(muro.sorgente);
    expect(dopo.copie.map((c) => [c.posizione.x, c.posizione.y, c.rotazione, c.etichetta])).toEqual([[500, 300, 90, ''], [100, 900, 0, ''], [1500, 100, 270, 'Ala est']]);
    expect(new Set(dopo.copie.map((c) => c.uid)).size).toBe(3);
    // `nomePezzo` rinomina il ritaglio insieme alla copia (una transazione); vuoto, il nome resta
    expect((await correggiCopia(c3.id, { etichetta: 'Ala ovest', nomePezzo: 'Muro mobile' }).expect(200)).body.data).toMatchObject({ etichetta: 'Ala ovest' });
    expect((await scheda()).pezzi.find((p) => p.id === muro.id)!.nome).toBe('Muro mobile');
    await correggiCopia(c3.id, { nomePezzo: '   ' }).expect(200);
    expect((await scheda()).pezzi.find((p) => p.id === muro.id)!.nome).toBe('Muro mobile');
    // un'etichetta vuota torna alla vista «Nome · copia N»
    expect((await correggiCopia(c3.id, { etichetta: '' }).expect(200)).body.data).toMatchObject({ etichetta: '' });
    // copia e pezzo che non ci sono
    expect(await codice(aggiungiCopia(99999, {}))).toEqual([404, 'pezzo-non-trovato']);
    expect(await codice(correggiCopia(99999, { etichetta: 'x' }))).toEqual([404, 'copia-non-trovata']);
    expect(await codice(request(app).delete('/api/mappe/pezzi/copie/99999'))).toEqual([404, 'copia-non-trovata']);
    // il contratto della 102 (la posa mandata al ritaglio, o il ritaglio mandato alla copia) è un 400, non un 200 che perde i campi
    expect(await codice(request(app).put(`/api/mappe/pezzi/${muro.id}`).send({ posizione: { x: 1, y: 1 } }))).toEqual([400, 'validation-error']);
    expect((await crea({ sorgente: { x: 0, y: 0, larghezza: 4, altezza: 4 }, posizione: { x: 1, y: 1 } })).status).toBe(400);
    expect((await correggiCopia(c3.id, { sorgente: { x: 0, y: 0, larghezza: 4, altezza: 4 } })).status).toBe(400);
    expect((await aggiungiCopia(muro.id, { nomePezzo: 'x' })).status).toBe(400);
    // forme: rotazione a 90°, niente decimali, etichetta non oltre il limite del nome
    expect((await aggiungiCopia(muro.id, { rotazione: 45 })).status).toBe(400);
    expect((await aggiungiCopia(muro.id, { posizione: { x: 1.5, y: 0 } })).status).toBe(400);
    expect((await aggiungiCopia(muro.id, { etichetta: 'x'.repeat(500) })).status).toBe(400);
  });

  it('zona e ingombro di ogni copia devono stare nell\'immagine (2048×1024), anche ruotati; le forme sbagliate si rifiutano', async () => {
    expect(await codice(crea({ sorgente: { x: 2000, y: 0, larghezza: 49, altezza: 10 } }))).toEqual([400, 'pezzo-fuori-immagine']);
    expect(await codice(crea({ sorgente: { x: 0, y: 1000, larghezza: 10, altezza: 25 } }))).toEqual([400, 'pezzo-fuori-immagine']);
    // la zona esce anche quando la copia è posata dentro
    expect(await codice(crea({ sorgente: { x: 2000, y: 1000, larghezza: 49, altezza: 25 }, copia: { posizione: { x: 0, y: 0 } } }))).toEqual([400, 'pezzo-fuori-immagine']);
    // la zona sta (300 × 10 in fondo), ma la copia posata più in basso no
    expect(await codice(crea({ sorgente: { x: 0, y: 1014, larghezza: 300, altezza: 10 }, copia: { posizione: { x: 0, y: 1015 } } }))).toEqual([400, 'pezzo-fuori-immagine']);
    // 300 × 10 posato a x 1700 sta; ruotato di 90° diventa 10 × 300 e a y 800 esce in basso (800 + 300 > 1024)
    const p = (await crea({ sorgente: { x: 0, y: 1014, larghezza: 300, altezza: 10 }, copia: { posizione: { x: 1700, y: 800 } } }).expect(201)).body.data as PezzoMappaDto;
    expect(await codice(correggiCopia(p.copie[0].id, { rotazione: 90 }))).toEqual([400, 'pezzo-fuori-immagine']);
    expect((await correggiCopia(p.copie[0].id, { rotazione: 90, posizione: { x: 1700, y: 700 } }).expect(200)).body.data).toMatchObject({ rotazione: 90, posizione: { x: 1700, y: 700 } });
    // anche una copia aggiunta
    expect(await codice(aggiungiCopia(p.id, { posizione: { x: 1800, y: 0 } }))).toEqual([400, 'pezzo-fuori-immagine']);
    expect((await aggiungiCopia(p.id, { posizione: { x: 1700, y: 0 } })).status).toBe(201);
    // cambiando la zona si riverificano tutte le copie: 400 × 10 non ci sta più nella copia a x 1700 (ruotata: 10 × 400 a y 700)
    const larga = await request(app).put(`/api/mappe/pezzi/${p.id}`).send({ sorgente: { x: 0, y: 1014, larghezza: 400, altezza: 10 } });
    expect([larga.status, larga.body.error?.code]).toEqual([400, 'pezzo-fuori-immagine']);
    expect(larga.body.error.message).toMatch(/copia 1 del pezzo/);
    expect((await request(app).put(`/api/mappe/pezzi/${p.id}`).send({ sorgente: { x: 0, y: 1014, larghezza: 320, altezza: 10 } }).expect(200)).body.data.sorgente).toEqual({ x: 0, y: 1014, larghezza: 320, altezza: 10 });
    // forme: niente decimali, niente dimensioni nulle, rotazioni solo a 90°
    expect((await crea({ sorgente: { x: 1.5, y: 0, larghezza: 10, altezza: 10 } })).status).toBe(400);
    expect((await crea({ sorgente: { x: 0, y: 0, larghezza: 0, altezza: 10 } })).status).toBe(400);
    expect((await crea({ sorgente: { x: 0, y: 0, larghezza: 10, altezza: 10 }, copia: { rotazione: 45 } })).status).toBe(400);
    expect(await codice(crea({ sorgente: { x: 0, y: 0, larghezza: 10, altezza: 10 } }, 'mappa-che-non-esiste'))).toEqual([404, 'mappa-non-trovata']);
    expect(await codice(request(app).put('/api/mappe/pezzi/99999').send({ nome: 'x' }))).toEqual([404, 'pezzo-non-trovato']);
    expect(await codice(request(app).delete('/api/mappe/pezzi/99999'))).toEqual([404, 'pezzo-non-trovato']);
    // al massimo 200 copie per pezzo
    const piena = (await crea({ sorgente: { x: 0, y: 0, larghezza: 5, altezza: 5 } }).expect(201)).body.data as PezzoMappaDto;
    const inserisci = prepared("INSERT INTO copia_pezzo (uid, pezzo_id, x, y, ordine, updated_at) VALUES (lower(hex(randomblob(16))), ?, 0, 0, ?, 'x')");
    for (let i = 1; i < 200; i++) inserisci.run(piena.id, i);
    expect(await codice(aggiungiCopia(piena.id, {}))).toEqual([400, 'troppe-copie']);
    await request(app).delete(`/api/mappe/pezzi/${piena.id}`).expect(204);
    expect(prepared('SELECT COUNT(*) FROM copia_pezzo WHERE pezzo_id = ?').pluck().get(piena.id)).toBe(0);
  });

  it('senza dimensioni salvate si leggono dall\'immagine mostrata; senza immagine 409', async () => {
    const senza = prepared("SELECT chiave, asset FROM mappa WHERE larghezza IS NULL AND asset LIKE 'mappe/%' ORDER BY chiave LIMIT 1").get() as { chiave: string; asset: string };
    expect(senza).toBeDefined();
    expect(await codice(crea({ sorgente: { x: 0, y: 0, larghezza: 10, altezza: 10 } }, senza.chiave))).toEqual([409, 'mappa-senza-immagine']);
    // l'asset della mappa (ambito «mappe») da 300 × 200: la zona deve starci
    // (il pacchetto di prova registra l'asset senza contenuto: per questo prima era «senza immagine»)
    prepared(`INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, contenuto) VALUES ('mappe', ?, 'prova.png', 'image/png', 33, 'x', ?)
      ON CONFLICT(ambito, chiave) DO UPDATE SET contenuto = excluded.contenuto, byte = excluded.byte`).run(senza.asset.slice('mappe/'.length), intestazionePng(300, 200));
    expect(await codice(crea({ sorgente: { x: 0, y: 0, larghezza: 301, altezza: 10 } }, senza.chiave))).toEqual([400, 'pezzo-fuori-immagine']);
    const p = (await crea({ sorgente: { x: 0, y: 190, larghezza: 300, altezza: 10 } }, senza.chiave).expect(201)).body.data as PezzoMappaDto;
    // anche per le copie: 300 × 10 ruotato è 10 × 300, più alto dell'immagine
    expect(await codice(aggiungiCopia(p.id, { posizione: { x: 0, y: 0 }, rotazione: 90 }))).toEqual([400, 'pezzo-fuori-immagine']);
  });

  it('le condizioni sono per copia, quelle dei pin: con la partita ogni copia porta il suo esito; senza partita nessun esito; si tolgono con null', async () => {
    const sera = (await crea({ nome: 'Di sera', sorgente: { x: 10, y: 10, larghezza: 10, altezza: 10 }, copia: { condizioni: [{ tipo: 'fascia', fascia: 'sera' }] } }).expect(201)).body.data as PezzoMappaDto;
    // la seconda copia dello stesso pezzo, di giorno: lo stesso ritaglio si vede in un punto o nell'altro
    const giorno = (await aggiungiCopia(sera.id, { posizione: { x: 600, y: 10 }, condizioni: [{ tipo: 'fascia', fascia: 'giorno' }] }).expect(201)).body.data as CopiaPezzoDto;
    const senza = (await aggiungiCopia(sera.id, { posizione: { x: 700, y: 10 } }).expect(201)).body.data as CopiaPezzoDto;
    expect(sera.copie[0].condizioni).toEqual([expect.objectContaining({ tipo: 'fascia', fascia: 'sera', testo: expect.any(String) })]);
    const copie = (await scheda(true)).pezzi.find((p) => p.id === sera.id)!.copie;
    expect(copie.find((c) => c.id === sera.copie[0].id)?.disponibilita?.stato).toBe('bloccato');
    expect(copie.find((c) => c.id === giorno.id)?.disponibilita?.stato).toBe('disponibile');
    // senza condizioni: disponibile
    expect(copie.find((c) => c.id === senza.id)?.disponibilita).toEqual({ stato: 'disponibile', requisiti: [] });
    expect((await scheda()).pezzi.every((p) => p.copie.every((c) => c.disponibilita === undefined))).toBe(true);
    // anche lo stato di un pin (condizione dei soli pin) vale per una copia
    const leva = (await request(app).post(`/api/mappe/${MAPPA}/spilli`).send({ tipo: 'forziere', nome: 'Forziere della prova', x: 50, y: 50 }).expect(201)).body.data as { uid: string };
    const conPin = await correggiCopia(sera.copie[0].id, { condizioni: [{ tipo: 'spillo', spillo: leva.uid, segnato: true }] });
    expect(conPin.status, JSON.stringify(conPin.body)).toBe(200);
    expect((await scheda(true)).pezzi.find((p) => p.id === sera.id)!.copie.find((c) => c.id === sera.copie[0].id)?.disponibilita?.stato).toBe('bloccato');
    // una chiave che non c'è si rifiuta, come nei pin (alla correzione, all'aggiunta e alla creazione)
    expect((await correggiCopia(sera.copie[0].id, { condizioni: [{ tipo: 'palazzo', dungeon: 'palazzo-che-non-esiste' }] })).body.error.code).toBe('condizione-non-trovata');
    expect((await aggiungiCopia(sera.id, { condizioni: [{ tipo: 'palazzo', dungeon: 'palazzo-che-non-esiste' }] })).body.error.code).toBe('condizione-non-trovata');
    expect((await crea({ sorgente: { x: 0, y: 0, larghezza: 3, altezza: 3 }, copia: { condizioni: [{ tipo: 'palazzo', dungeon: 'palazzo-che-non-esiste' }] } })).body.error.code).toBe('condizione-non-trovata');
    expect((await correggiCopia(sera.copie[0].id, { condizioni: null }).expect(200)).body.data.condizioni).toEqual([]);
    // le altre copie hanno tenuto le loro
    expect((await scheda()).pezzi.find((p) => p.id === sera.id)!.copie.find((c) => c.id === giorno.id)!.condizioni).toEqual([expect.objectContaining({ fascia: 'giorno' })]);
  });

  it('eliminando una copia restano le altre; eliminando l\'ultima se ne va anche il pezzo e la sua zona torna', async () => {
    const p = (await crea({ nome: 'Da eliminare', sorgente: { x: 900, y: 10, larghezza: 20, altezza: 20 } }).expect(201)).body.data as PezzoMappaDto;
    const seconda = (await aggiungiCopia(p.id, { posizione: { x: 950, y: 10 } }).expect(201)).body.data as CopiaPezzoDto;
    expect((await request(app).delete(`/api/mappe/pezzi/copie/${p.copie[0].id}`).expect(200)).body.data).toEqual({ pezzoEliminato: false });
    expect((await scheda()).pezzi.find((x) => x.id === p.id)!.copie.map((c) => c.id)).toEqual([seconda.id]);
    expect((await request(app).delete(`/api/mappe/pezzi/copie/${seconda.id}`).expect(200)).body.data).toEqual({ pezzoEliminato: true });
    expect((await scheda()).pezzi.some((x) => x.id === p.id)).toBe(false);
    expect(prepared('SELECT COUNT(*) FROM pezzo_mappa WHERE id = ?').pluck().get(p.id)).toBe(0);
    // eliminando il pezzo se ne vanno tutte le sue copie
    const tre = (await crea({ nome: 'Tre copie', sorgente: { x: 900, y: 40, larghezza: 20, altezza: 20 } }).expect(201)).body.data as PezzoMappaDto;
    await aggiungiCopia(tre.id, {}).expect(201);
    await aggiungiCopia(tre.id, {}).expect(201);
    expect(prepared('SELECT COUNT(*) FROM copia_pezzo WHERE pezzo_id = ?').pluck().get(tre.id)).toBe(3);
    await request(app).delete(`/api/mappe/pezzi/${tre.id}`).expect(204);
    expect(prepared('SELECT COUNT(*) FROM copia_pezzo WHERE pezzo_id = ?').pluck().get(tre.id)).toBe(0);
  });

  it('esportazione e importazione: i pezzi viaggiano con le loro copie; un pacchetto senza il campo li lascia; un reseed non li tocca', () => {
    const esportate = esportaMappe().mappe;
    const pacchettoMappa = esportate.find((m) => della103(m).some((p) => p.nome === 'Muro mobile'))!;
    const pezzi = della103(pacchettoMappa);
    expect(pezzi.map((p) => p.nome)).toEqual(['Muro mobile', 'Pezzo 2', 'Pezzo 3', 'Di sera']);
    expect(pezzi[0]).toMatchObject({ sorgente: { x: 100, y: 900, larghezza: 120, altezza: 40 }, ordine: 0 });
    expect(pezzi[0].copie.map((c) => [c.posizione, c.rotazione, c.specchio, c.ordine])).toEqual([
      [{ x: 500, y: 300 }, 90, { orizzontale: true, verticale: false }, 0], [{ x: 100, y: 900 }, 0, { orizzontale: false, verticale: false }, 1], [{ x: 1500, y: 100 }, 270, { orizzontale: false, verticale: true }, 2],
    ]);
    // l'etichetta viaggia solo se c'è; le condizioni solo se ce ne sono
    expect(pezzi[1].copie[0]).toMatchObject({ etichetta: 'In alto' });
    expect(pezzi[0].copie[0]).not.toHaveProperty('etichetta');
    expect(pezzi[3].copie.map((c) => c.condizioni?.length ?? 0)).toEqual([0, 1, 0]);
    // la vecchia forma della 102 non si scrive più
    expect(pezzi.every((p) => !('posizione' in p))).toBe(true);
    // ogni mappa dice i suoi pezzi, anche nessuno
    expect(esportate.every((m) => Array.isArray(m.pezzi))).toBe(true);
    const contaPezzi = () => prepared('SELECT COUNT(*) FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(MAPPA) as number;
    const contaCopie = () => prepared('SELECT COUNT(*) FROM copia_pezzo c JOIN pezzo_mappa p ON p.id = c.pezzo_id WHERE p.mappa_chiave = ?').pluck().get(MAPPA) as number;
    // un pacchetto che toglie gli ultimi due pezzi, toglie una copia al primo e la rinomina: sostituisce, e tiene gli uid
    const primo = { ...pezzi[0], nome: 'Muro importato', copie: [{ ...pezzi[0].copie[0], condizioni: [{ tipo: 'palazzo', dungeon: 'palazzo-che-non-esiste' }] as unknown as [] }, pezzi[0].copie[2]] };
    const esito = importaMappe({ versione: 1, mappe: [{ ...pacchettoMappa, pezzi: [primo, pezzi[1]] }], immagini: {} }, { sovrascrivi: true });
    expect([esito.pezzi, esito.copie, esito.pezziScartati, esito.copieScartate]).toEqual([2, 3, 0, 0]);
    expect(esito.condizioniScartate).toBeGreaterThanOrEqual(1);
    const dopo = prepared('SELECT id, uid, nome FROM pezzo_mappa WHERE mappa_chiave = ? ORDER BY ordine, id').all(MAPPA) as Array<{ id: number; uid: string; nome: string }>;
    expect(dopo.map((p) => p.nome)).toEqual(['Muro importato', 'Pezzo 2']);
    expect(dopo.map((p) => p.uid)).toEqual([pezzi[0].uid, pezzi[1].uid]);
    const copie = prepared('SELECT uid, x, condizioni_json FROM copia_pezzo WHERE pezzo_id = ? ORDER BY ordine, id').all(dopo[0].id) as Array<{ uid: string; x: number; condizioni_json: string | null }>;
    expect(copie.map((c) => [c.uid, c.x])).toEqual([[pezzi[0].copie[0].uid, 500], [pezzi[0].copie[2].uid, 1500]]);
    expect(copie[0].condizioni_json).toBeNull();
    // un pacchetto di prima della 102, senza il campo: i pezzi restano
    const { pezzi: _tolti, ...senzaPezzi } = pacchettoMappa;
    importaMappe({ versione: 1, mappe: [senzaPezzi], immagini: {} }, { sovrascrivi: true });
    expect([contaPezzi(), contaCopie()]).toEqual([2, 3]);
    // un reseed (seed sopra seed, senza sovrascrivi) non li tocca, anche se il pacchetto ne porta altri
    prepared("UPDATE mappa SET origine = 'seed' WHERE chiave = ?").run(MAPPA);
    importaMappe({ versione: 1, mappe: [{ ...pacchettoMappa, pezzi: [] }], immagini: {} }, { origine: 'seed' });
    expect([contaPezzi(), contaCopie()]).toEqual([2, 3]);
    // forme sbagliate: 400 e nulla cambia (rotazione a 45°, un pezzo senza copie, una forma che non è né l'una né l'altra)
    expect(() => importaMappe({ versione: 1, mappe: [{ ...pacchettoMappa, pezzi: [{ ...pezzi[0], copie: [{ ...pezzi[0].copie[0], rotazione: 45 as 90 }] }] }], immagini: {} }, { sovrascrivi: true })).toThrow(/Pezzi della planimetria non validi/);
    expect(() => importaMappe({ versione: 1, mappe: [{ ...pacchettoMappa, pezzi: [{ ...pezzi[0], copie: [] }] }], immagini: {} }, { sovrascrivi: true })).toThrow(/Pezzi della planimetria non validi/);
    const { copie: _c, ...senzaCopie } = pezzi[0];
    expect(() => importaMappe({ versione: 1, mappe: [{ ...pacchettoMappa, pezzi: [senzaCopie as PezzoPacchetto] }], immagini: {} }, { sovrascrivi: true })).toThrow(/Pezzi della planimetria non validi/);
    expect([contaPezzi(), contaCopie()]).toEqual([2, 3]);
  });

  it('un pacchetto della 102 (la posa accanto alla zona) si importa ancora: ogni pezzo diventa un pezzo con una copia', () => {
    const pacchettoMappa = esportaMappe().mappe.find((m) => della103(m).some((p) => p.nome === 'Muro importato'))!;
    const vecchio: PezzoPacchetto102 = { uid: 'c'.repeat(32), nome: 'Dalla 102', sorgente: { x: 20, y: 20, larghezza: 30, altezza: 10 }, posizione: { x: 600, y: 400 }, rotazione: 90, specchio: { orizzontale: false, verticale: true }, condizioni: [{ tipo: 'fascia', fascia: 'sera' }], ordine: 0 };
    const esito = importaMappe({ versione: 1, mappe: [{ ...pacchettoMappa, pezzi: [vecchio] }], immagini: {} }, { sovrascrivi: true });
    expect([esito.pezzi, esito.copie]).toEqual([1, 1]);
    const p = prepared('SELECT * FROM pezzo_mappa WHERE mappa_chiave = ?').all(MAPPA) as Array<{ id: number; uid: string; nome: string; sorgente_x: number }>;
    expect(p.map((r) => [r.uid, r.nome, r.sorgente_x])).toEqual([['c'.repeat(32), 'Dalla 102', 20]]);
    const c = prepared('SELECT * FROM copia_pezzo WHERE pezzo_id = ?').all(p[0].id) as Array<{ uid: string; x: number; y: number; rotazione: number; specchio_verticale: number; condizioni_json: string }>;
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ x: 600, y: 400, rotazione: 90, specchio_verticale: 1 });
    expect(c[0].uid).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.parse(c[0].condizioni_json)).toEqual([expect.objectContaining({ tipo: 'fascia', fascia: 'sera' })]);
  });

  it('sostituire l\'immagine di una mappa con dei pezzi chiede conferma (409, con le copie); confermata, i pezzi se ne vanno con le copie', async () => {
    const ALTRA = 'nativo-rmap-001-2-0';
    const png = intestazionePng(1000, 500);
    const carica = (q = '') => request(app).put(`/api/mappe/${ALTRA}/immagine${q}`).set('Content-Type', 'image/png').send(png);
    const dim = () => prepared('SELECT larghezza, altezza FROM mappa WHERE chiave = ?').get(ALTRA) as { larghezza: number; altezza: number };
    const primo = (await crea({ sorgente: { x: 10, y: 10, larghezza: 50, altezza: 20 } }, ALTRA).expect(201)).body.data as PezzoMappaDto;
    await aggiungiCopia(primo.id, { posizione: { x: 300, y: 10 } }).expect(201);
    await crea({ sorgente: { x: 100, y: 10, larghezza: 50, altezza: 20 } }, ALTRA).expect(201);
    const no = await carica();
    expect([no.status, no.body.error.code, no.body.error.details]).toEqual([409, 'mappa-con-pezzi', { pezzi: 2, copie: 3 }]);
    expect(no.body.error.message).toMatch(/2 pezzi ritagliati.*3 copie posate.*verranno eliminati con le copie/);
    expect(dim()).toEqual({ larghezza: 2048, altezza: 1024 });
    expect(prepared('SELECT COUNT(*) FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(ALTRA)).toBe(2);
    const si = await carica('?eliminaPezzi=1');
    expect(si.status, JSON.stringify(si.body)).toBe(200);
    expect((si.body.data as MappaDto).pezzi).toEqual([]);
    expect(dim()).toEqual({ larghezza: 1000, altezza: 500 });
    expect(prepared('SELECT COUNT(*) FROM copia_pezzo WHERE pezzo_id = ?').pluck().get(primo.id)).toBe(0);
    // senza pezzi non c'è niente da confermare
    expect((await carica()).status).toBe(200);
  });

  it('all\'importazione le copie che escono dall\'immagine della mappa d\'arrivo si scartano; il pezzo con la zona fuori o senza copie dentro anche', () => {
    const ALTRA = 'nativo-rmap-001-2-0'; // ora 1000 × 500 (test precedente)
    const esportate = esportaMappe().mappe;
    // l'immagine caricata nel test precedente ha la chiave della mappa
    const mappa = esportate.find((m) => m.immagine === ALTRA)!;
    expect(mappa).toMatchObject({ larghezza: 1000, altezza: 500 });
    const pezzo = (x: number, larghezza: number, copie = [copiaPacchetto(0, 0)]): PezzoPacchetto => ({ nome: `a ${x}`, sorgente: { x, y: 0, larghezza, altezza: 10 }, ordine: 0, copie });
    const esito = importaMappe({ versione: 1, mappe: [{ ...mappa, pezzi: [
      // dentro, con una copia che esce (a x 950 un pezzo largo 100) e una ruotata che esce (10 × 100, a y 450 arriva a 550 su 500)
      pezzo(0, 100, [copiaPacchetto(0, 0), copiaPacchetto(950, 0), copiaPacchetto(0, 450, { rotazione: 90 }), copiaPacchetto(800, 400)]),
      // la zona esce (990 + 20): il pezzo se ne va con le sue due copie
      pezzo(990, 20, [copiaPacchetto(0, 0), copiaPacchetto(10, 0)]),
      // la zona sta, ma nessuna copia: il pezzo non resta senza copie
      pezzo(0, 600, [copiaPacchetto(0, 0, { rotazione: 90 })]),
    ] }], immagini: {} }, { sovrascrivi: true });
    expect([esito.pezzi, esito.copie, esito.pezziScartati, esito.copieScartate]).toEqual([1, 2, 2, 5]);
    expect(prepared('SELECT nome FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().all(ALTRA)).toEqual(['a 0']);
    expect(prepared('SELECT c.x || \',\' || c.y FROM copia_pezzo c JOIN pezzo_mappa p ON p.id = c.pezzo_id WHERE p.mappa_chiave = ? ORDER BY c.ordine, c.id').pluck().all(ALTRA)).toEqual(['0,0', '800,400']);
    // una mappa senza immagine né dimensioni: tutti scartati
    // l'esportazione usa la chiave pubblica (`mappa_percorso`)
    const chiaveSenza = prepared(`SELECT COALESCE((SELECT p.chiave FROM mappa_percorso p WHERE p.mappa_chiave = m.chiave), m.chiave) FROM mappa m WHERE m.larghezza IS NULL AND m.chiave LIKE 'citta-%' AND NOT EXISTS (SELECT 1 FROM immagine i WHERE i.contenuto IS NOT NULL
      AND ((i.ambito = 'mappe' AND 'mappe/' || i.chiave = m.asset) OR (i.ambito = 'mappa' AND i.chiave = m.chiave))) ORDER BY m.chiave LIMIT 1`).pluck().get() as string;
    const senza = esportate.find((m) => m.chiave === chiaveSenza)!;
    expect(senza).toMatchObject({ larghezza: null });
    const nessuna = importaMappe({ versione: 1, mappe: [{ ...senza, pezzi: [pezzo(0, 10, [copiaPacchetto(0, 0), copiaPacchetto(5, 5)])] }], immagini: {} }, { sovrascrivi: true });
    expect([nessuna.pezzi, nessuna.copie, nessuna.pezziScartati, nessuna.copieScartate]).toEqual([0, 0, 1, 2]);
  });

  it('un pacchetto senza pezzi che porta un\'immagine diversa toglie i pezzi della mappa, con le copie, e li conta; con la stessa immagine restano', () => {
    const ALTRA = 'nativo-rmap-001-2-0'; // 1000 × 500 con il pezzo «a 0» e due copie (test precedente)
    const conta = () => prepared('SELECT COUNT(*) FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(ALTRA) as number;
    const contaCopie = () => prepared('SELECT COUNT(*) FROM copia_pezzo c JOIN pezzo_mappa p ON p.id = c.pezzo_id WHERE p.mappa_chiave = ?').pluck().get(ALTRA) as number;
    const tutteLeCopie = () => prepared('SELECT COUNT(*) FROM copia_pezzo').pluck().get() as number;
    expect([conta(), contaCopie()]).toEqual([1, 2]);
    const { pezzi: _p, ...mappa } = esportaMappe().mappe.find((m) => m.immagine === ALTRA)!;
    const uguale = intestazionePng(1000, 500).toString('base64');
    const stessa = importaMappe({ versione: 1, mappe: [mappa], immagini: { [ALTRA]: { mime: 'image/png', base64: uguale } } }, { sovrascrivi: true });
    expect([stessa.immagini, stessa.pezziEliminati]).toEqual([1, 0]);
    expect([conta(), contaCopie()]).toEqual([1, 2]);
    // stesse dimensioni, contenuto diverso: è un'altra immagine; le copie se ne vanno col pezzo (nessuna resta orfana)
    const prima = tutteLeCopie();
    const diversa = Buffer.concat([intestazionePng(1000, 500), Buffer.from([1])]).toString('base64');
    const altra = importaMappe({ versione: 1, mappe: [mappa], immagini: { [ALTRA]: { mime: 'image/png', base64: diversa } } }, { sovrascrivi: true });
    expect([altra.immagini, altra.pezziEliminati, altra.copieEliminate, altra.pezzi]).toEqual([1, 1, 2, 0]);
    expect([conta(), contaCopie(), tutteLeCopie()]).toEqual([0, 0, prima - 2]);
    // un pacchetto che fa puntare la mappa a un'altra immagine già presente, senza portarne il contenuto (nota N1 del validatore)
    prepared(`INSERT INTO immagine (ambito, chiave, nome_file, mime, byte, created_at, contenuto) VALUES ('mappa', 'altra-immagine-presente', 'a.png', 'image/png', 34, 'x', ?)`)
      .run(Buffer.concat([intestazionePng(1000, 500), Buffer.from([2])]));
    const ripresa = esportaMappe().mappe.find((m) => m.immagine === ALTRA)!;
    importaMappe({ versione: 1, mappe: [ripresa], immagini: {} }, { sovrascrivi: true });
    const id = Number(prepared("INSERT INTO pezzo_mappa (uid, mappa_chiave, nome, sorgente_x, sorgente_y, larghezza, altezza, updated_at) VALUES ('ab'||hex(randomblob(15)), ?, 'p', 0, 0, 10, 10, 'x')").run(ALTRA).lastInsertRowid);
    prepared("INSERT INTO copia_pezzo (uid, pezzo_id, x, y, updated_at) VALUES (lower(hex(randomblob(16))), ?, 0, 0, 'x')").run(id);
    const { pezzi: _q, ...versoAltra } = { ...ripresa, immagine: 'altra-immagine-presente' };
    const cambio = importaMappe({ versione: 1, mappe: [versoAltra], immagini: {} }, { sovrascrivi: true });
    expect([cambio.immagini, cambio.pezziEliminati, cambio.copieEliminate]).toEqual([0, 1, 1]);
    expect([conta(), contaCopie()]).toEqual([0, 0]);
  });

  it('eliminando la mappa se ne vanno i suoi pezzi con le copie', async () => {
    const ids = (await scheda()).pezzi.map((p) => p.id);
    expect(ids.length).toBeGreaterThan(0);
    const copieDellaMappa = () => prepared(`SELECT COUNT(*) FROM copia_pezzo WHERE pezzo_id IN (${ids.join(',')})`).pluck().get() as number;
    expect(copieDellaMappa()).toBeGreaterThan(0);
    await request(app).delete(`/api/mappe/${MAPPA}`).expect(204);
    expect(prepared('SELECT COUNT(*) FROM pezzo_mappa WHERE mappa_chiave = ?').pluck().get(MAPPA)).toBe(0);
    expect(copieDellaMappa()).toBe(0);
  });
});
