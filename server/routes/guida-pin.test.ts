// ============================================================
// Guida del Palazzo modificabile e collegata ai pin (richiesta dell'utente, 2026-10-01)
// ============================================================
//
// «Mi serve la possibilità di modificare proprio la guida così da poter modificare/aggiornare, aggiungere, rimuovere le voci
// della guida o correggerli agganciandoli ad elementi della mappa»; «lascia i punti come sono senza fare riconciliazioni».
// Un punto si collega a uno o più pin delle planimetrie del suo Palazzo; da lì lo stato è uno solo.
// ============================================================

import request from 'supertest';
import { closeDb, initDb, prepared } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import { palazzoDiOgniMappa } from '../services/palazziService.js';
import { esportaMappe, importaMappe } from '../services/mappe/mappeService.js';
import type { DungeonDettaglioDto, MappaDto, PuntoInteresseDto } from '../../shared/types.js';
import type { AccessoMondoDto } from '../../shared/accessoMondo.js';

const app = createApp();

describe('guida del Palazzo: voci modificabili e collegate ai pin', () => {
  let partita: number;
  let area: string;
  let pinLiberi: Array<{ id: number; uid: string; tipo: string }>;
  const nuovoPunto = async (nome: string, tipo = 'forziere') => (await request(app).post(`/api/compendio/aree/${area}/punti`).send({ nome, tipo }).expect(201)).body.data as PuntoInteresseDto;
  const collega = (punto: string, pin: number) => request(app).put(`/api/compendio/punti/${encodeURIComponent(punto)}/pin/${pin}`);
  const scollega = (punto: string, pin: number) => request(app).delete(`/api/compendio/punti/${encodeURIComponent(punto)}/pin/${pin}`);
  const raccolto = (uid: string) => (prepared('SELECT raccolto FROM spillo_partita WHERE partita_id = ? AND spillo_uid = ?').get(partita, uid) as { raccolto: number } | undefined)?.raccolto ?? 0;
  const segnato = (punto: string) => (prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').get(partita, punto) as { stato: string } | undefined)?.stato ?? null;
  const raccogli = (pin: number, si: boolean) => request(app).put(`/api/partite/${partita}/spilli/${pin}`).send({ raccolto: si }).expect(200);
  const statoPunto = (punto: string, stato: string | null) => request(app).put(`/api/partite/${partita}/punti`).send({ punto, stato }).expect(200);

  beforeAll(async () => {
    const db = initDb(':memory:');
    caricaPacchetto(db);
    invalidaCacheTraduzioni();
    partita = ((await request(app).post('/api/partite').send({ nome: 'Guida e pin' })).body.data as { id: number }).id;
    // un'area di Kamoshida con una planimetria e almeno tre pin liberi (senza collegamento) sopra
    const palazzi = palazzoDiOgniMappa();
    const righe = prepared(`SELECT e.entita_chiave AS area, s.id, s.uid, s.tipo FROM mappa_entita e JOIN spillo s ON s.mappa_chiave = e.mappa_chiave
      WHERE e.entita_tipo = 'area' AND e.entita_chiave LIKE 'kamoshida-%' AND s.riferimento_tipo IS NULL AND s.uid IS NOT NULL AND s.tipo <> 'nemico' ORDER BY e.entita_chiave, s.id`)
      .all() as Array<{ area: string; id: number; uid: string; tipo: string }>;
    const perArea = new Map<string, typeof righe>();
    for (const r of righe) perArea.set(r.area, [...(perArea.get(r.area) ?? []), r]);
    const [scelta, pin] = [...perArea].find(([, v]) => v.length >= 3)!;
    area = scelta;
    pinLiberi = pin;
    expect(pinLiberi.every((p) => palazzi.get(prepared('SELECT mappa_chiave FROM spillo WHERE id = ?').pluck().get(p.id) as string) === 'kamoshida')).toBe(true);
  });
  afterAll(() => closeDb());
  // ogni caso parte pulito: nessuno stato nella partita e i pin di prova liberi (i casi non dipendono l'uno dall'altro)
  beforeEach(() => {
    prepared('DELETE FROM punto_partita WHERE partita_id = ?').run(partita);
    prepared('DELETE FROM spillo_partita WHERE partita_id = ?').run(partita);
    prepared(`UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL, voce_chiave = NULL WHERE id IN (${pinLiberi.map(() => '?').join(',')})`).run(...pinLiberi.map((p) => p.id));
  });

  it('collega e scollega un pin; la scheda del Palazzo lo mostra sotto la voce', async () => {
    const p = await nuovoPunto('Forziere di prova');
    expect(p.pin).toEqual([]);
    const dopo = (await collega(p.chiave, pinLiberi[0].id).expect(200)).body.data as PuntoInteresseDto;
    expect(dopo.pin.map((x) => x.id)).toEqual([pinLiberi[0].id]);
    expect(dopo.pin[0].mappaNome).toBeTruthy();
    const scheda = (await request(app).get('/api/compendio/dungeon/kamoshida').expect(200)).body.data as DungeonDettaglioDto;
    expect(scheda.aree.find((a) => a.chiave === area)!.punti.find((x) => x.chiave === p.chiave)!.pin.map((x) => x.id)).toEqual([pinLiberi[0].id]);
    // ripetere il collegamento non fa niente; scollegare lo toglie
    await collega(p.chiave, pinLiberi[0].id).expect(200);
    expect(((await scollega(p.chiave, pinLiberi[0].id).expect(200)).body.data as PuntoInteresseDto).pin).toEqual([]);
    await scollega(p.chiave, pinLiberi[0].id).expect(409);
  });

  it('rifiuta un pin collegato ad altro (dicendo a che cosa) e un pin fuori dal Palazzo', async () => {
    const a = await nuovoPunto('Primo');
    const b = await nuovoPunto('Secondo');
    await collega(a.chiave, pinLiberi[1].id).expect(200);
    const r = await collega(b.chiave, pinLiberi[1].id).expect(409);
    expect(r.body.error.code).toBe('pin-gia-collegato');
    expect(r.body.error.message).toMatch(/al punto «Primo»/);
    const fuori = prepared("SELECT id FROM spillo WHERE mappa_chiave LIKE 'citta-%' AND riferimento_tipo IS NULL LIMIT 1").pluck().get() as number;
    expect((await collega(b.chiave, fuori).expect(400)).body.error.code).toBe('pin-fuori-dal-palazzo');
    await collega('nessuno', pinLiberi[1].id).expect(404);
    await collega(b.chiave, 99999999).expect(404);
    await scollega(a.chiave, pinLiberi[1].id).expect(200);
  });

  it('lo stato è uno solo: la voce segna e riapre i suoi pin; un punto con due pin è segnato quando li ha raccolti tutti', async () => {
    const p = await nuovoPunto('Due forzieri');
    const [x, y] = [pinLiberi[0], pinLiberi[2]];
    await collega(p.chiave, x.id).expect(200);
    await collega(p.chiave, y.id).expect(200);
    await statoPunto(p.chiave, 'ottenuto');
    expect([raccolto(x.uid), raccolto(y.uid)]).toEqual([1, 1]);
    await statoPunto(p.chiave, null);
    expect([raccolto(x.uid), raccolto(y.uid)]).toEqual([0, 0]);
    // dalla mappa: uno solo non basta, tutti e due sì, toglierne uno lo riapre
    await raccogli(x.id, true);
    expect(segnato(p.chiave)).toBeNull();
    await raccogli(y.id, true);
    expect(segnato(p.chiave)).toBe('ottenuto');
    await raccogli(x.id, false);
    expect(segnato(p.chiave)).toBeNull();
    await raccogli(y.id, false);
    await scollega(p.chiave, x.id).expect(200);
    await scollega(p.chiave, y.id).expect(200);
  });

  it('collegando, gli stati che c’erano si uniscono: il punto segnato raccoglie il pin, il pin raccolto segna il punto', async () => {
    const a = await nuovoPunto('Segnato prima');
    await statoPunto(a.chiave, 'ottenuto');
    expect(raccolto(pinLiberi[0].uid)).toBe(0);
    await collega(a.chiave, pinLiberi[0].id).expect(200);
    expect(raccolto(pinLiberi[0].uid)).toBe(1);
    await statoPunto(a.chiave, null);
    await scollega(a.chiave, pinLiberi[0].id).expect(200);

    const b = await nuovoPunto('Raccolto prima');
    await raccogli(pinLiberi[1].id, true);
    expect(segnato(b.chiave)).toBeNull();
    await collega(b.chiave, pinLiberi[1].id).expect(200);
    expect(segnato(b.chiave)).toBe('ottenuto');
    // scollegando gli stati restano come sono, a ciascuno il suo
    await scollega(b.chiave, pinLiberi[1].id).expect(200);
    expect([segnato(b.chiave), raccolto(pinLiberi[1].uid)]).toEqual(['ottenuto', 1]);
    await raccogli(pinLiberi[1].id, false);
  });

  it('eliminare la voce scollega i pin e lascia il loro «raccolto»', async () => {
    const p = await nuovoPunto('Da togliere');
    await collega(p.chiave, pinLiberi[2].id).expect(200);
    await statoPunto(p.chiave, 'ottenuto');
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(p.chiave)}`).expect(204);
    expect(prepared('SELECT voce_chiave FROM spillo WHERE id = ?').pluck().get(pinLiberi[2].id)).toBeNull();
    expect(raccolto(pinLiberi[2].uid)).toBe(1);
    await raccogli(pinLiberi[2].id, false);
  });

  it('sposta una voce su e giù nella sua area, con l’ordine ricompattato; ai capi dice di no', async () => {
    const ordine = async () => ((await request(app).get('/api/compendio/dungeon/kamoshida').expect(200)).body.data as DungeonDettaglioDto).aree.find((a) => a.chiave === area)!.punti.map((p) => p.chiave);
    const prima = await ordine();
    const ultimo = prima[prima.length - 1];
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(ultimo)}/sposta`).send({ verso: -1 }).expect(200);
    const dopo = await ordine();
    expect(dopo.slice(-2)).toEqual([ultimo, prima[prima.length - 2]]);
    const numeri = prepared('SELECT ordine FROM punto_interesse WHERE area_chiave = ? ORDER BY ordine').pluck().all(area) as number[];
    expect(numeri).toEqual(numeri.map((_, i) => i));
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(dopo[0])}/sposta`).send({ verso: -1 }).expect(409);
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(dopo[0])}/sposta`).send({ verso: 2 }).expect(400);
  });

  it('un nemico collegato a una voce (un’Ombra sciagura) si segna; uno libero no', async () => {
    const nemico = prepared("SELECT id, uid FROM spillo WHERE tipo = 'nemico' AND riferimento_tipo IS NULL AND mappa_chiave IN (SELECT chiave FROM mappa WHERE chiave LIKE 'nativo-rmap-15%') LIMIT 1").get() as { id: number; uid: string } | undefined;
    expect(nemico).toBeTruthy();
    await request(app).put(`/api/partite/${partita}/spilli/${nemico!.id}`).send({ raccolto: true }).expect(400);
    const dungeon = palazzoDiOgniMappa().get(prepared('SELECT mappa_chiave FROM spillo WHERE id = ?').pluck().get(nemico!.id) as string)!;
    const areaNemico = prepared('SELECT chiave FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine LIMIT 1').pluck().get(dungeon) as string;
    const p = (await request(app).post(`/api/compendio/aree/${areaNemico}/punti`).send({ nome: 'Ombra sciagura di prova', tipo: 'ombra-sciagura' }).expect(201)).body.data as PuntoInteresseDto;
    await collega(p.chiave, nemico!.id).expect(200);
    await raccogli(nemico!.id, true);
    expect(segnato(p.chiave)).toBe('ottenuto');
  });

  it('i tipi del 2026-10-01: Persona e Storia si collegano a qualunque pin e si segnano; Porta e Meccanismo esistono', async () => {
    const persona = await nuovoPunto('Leanan Sidhe', 'persona');
    await collega(persona.chiave, pinLiberi[0].id).expect(200);
    await statoPunto(persona.chiave, 'ottenuto');
    expect(raccolto(pinLiberi[0].uid)).toBe(1);
    const storia = await nuovoPunto('Si apre il passaggio della torre', 'storia');
    // «Storia» si collega a qualunque pin, anche a uno di un tipo che non c'entra col suo nome
    await collega(storia.chiave, pinLiberi[1].id).expect(200);
    await statoPunto(storia.chiave, 'ottenuto');
    expect(segnato(storia.chiave)).toBe('ottenuto');
    for (const tipo of ['porta', 'meccanismo']) expect((await nuovoPunto(`Prova ${tipo}`, tipo)).tipo).toBe(tipo);
    // il pin «Tesoro» generico non esiste più
    const mappa = prepared('SELECT mappa_chiave FROM spillo WHERE id = ?').pluck().get(pinLiberi[0].id) as string;
    await request(app).post(`/api/mappe/${mappa}/spilli`).send({ tipo: 'tesoro', nome: 'Tesoro', x: 10, y: 10 }).expect(400);
  });

  it('una voce descrittiva («Altro») non ha stato né pin: il server lo rifiuta, e uno stato rimasto si ignora', async () => {
    const d = await nuovoPunto('Nota di prova', 'altro');
    expect((await request(app).put(`/api/partite/${partita}/punti`).send({ punto: d.chiave, stato: 'ottenuto' }).expect(400)).body.error.code).toBe('punto-descrittivo');
    // azzerare resta possibile (per ripulire)
    await request(app).put(`/api/partite/${partita}/punti`).send({ punto: d.chiave, stato: null }).expect(200);
    expect((await collega(d.chiave, pinLiberi[0].id).expect(400)).body.error.code).toBe('punto-descrittivo');
    // uno stato di prima della scelta (scritto a mano qui) non si mostra e non conta nei gestiti
    const scheda = async () => (await request(app).get(`/api/compendio/dungeon/kamoshida?partita=${partita}`).expect(200)).body.data as DungeonDettaglioDto;
    const prima = (await scheda()).gestiti;
    prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', 'x')").run(partita, d.chiave);
    const dopo = await scheda();
    expect(dopo.aree.find((a) => a.chiave === area)!.punti.find((x) => x.chiave === d.chiave)!.stato).toBeNull();
    expect(dopo.gestiti).toBe(prima);
    // la riga resta dov'è: nessuna riconciliazione
    expect(segnato(d.chiave)).toBe('ottenuto');
  });

  it('anche dalla mappa una voce descrittiva non ha stato né pin nuovi: niente stato nel dettaglio, il raccolto non la segna, l’editor la rifiuta', async () => {
    const d = await nuovoPunto('Nota della sala', 'altro');
    const pin = pinLiberi[1];
    const mappa = prepared('SELECT mappa_chiave FROM spillo WHERE id = ?').pluck().get(pin.id) as string;
    // un collegamento nuovo dall'editor delle mappe si rifiuta, sia in modifica sia in creazione
    expect((await request(app).put(`/api/mappe/spilli/${pin.id}`).send({ riferimento: { tipo: 'punto', chiave: d.chiave } }).expect(400)).body.error.code).toBe('punto-descrittivo');
    expect((await request(app).post(`/api/mappe/${mappa}/spilli`).send({ tipo: 'nota', nome: 'Nota', x: 10, y: 10, riferimento: { tipo: 'punto', chiave: d.chiave } }).expect(400)).body.error.code).toBe('punto-descrittivo');
    // uno che c'è già (scritto a mano qui: una voce diventata descrittiva prima della regola) resta modificabile, e non porta stato
    prepared('UPDATE spillo SET voce_chiave = ? WHERE id = ?').run(d.chiave, pin.id);
    await request(app).put(`/api/mappe/spilli/${pin.id}`).send({ nome: 'Ancora qui' }).expect(200);
    prepared("INSERT INTO punto_partita (partita_id, punto_chiave, stato, updated_at) VALUES (?, ?, 'ottenuto', 'x')").run(partita, d.chiave);
    const voce = ((await request(app).get(`/api/mappe/${mappa}?partita=${partita}`).expect(200)).body.data as MappaDto).spilli.find((s) => s.id === pin.id)!.voce;
    expect(voce?.chiave).toBe(d.chiave);
    expect(voce?.stato).toBeNull();
    // raccogliere il pin non scrive lo stato della voce (la riga rimasta resta com'è, la si toglie per vederlo)
    prepared('DELETE FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').run(partita, d.chiave);
    await raccogli(pin.id, true);
    expect(segnato(d.chiave)).toBeNull();
    expect(raccolto(pin.uid)).toBe(1);
    await raccogli(pin.id, false);
  });

  // ---- La voce in un campo suo (094): «Campo dedicato alla voce», scelta dell'utente del 2026-10-01 ----

  /** Un passaggio o una scala di Kamoshida, con la sua destinazione: prima della 094 non si poteva collegare a nessuna voce. */
  const pinConDestinazione = () => {
    const palazzi = palazzoDiOgniMappa();
    const righe = prepared("SELECT id, uid, mappa_chiave, riferimento_chiave FROM spillo WHERE tipo IN ('passaggio', 'scala') AND riferimento_tipo = 'mappa' AND uid IS NOT NULL ORDER BY id")
      .all() as Array<{ id: number; uid: string; mappa_chiave: string; riferimento_chiave: string }>;
    return righe.find((r) => palazzi.get(r.mappa_chiave) === 'kamoshida')!;
  };

  it('una «Storia» si collega a un pin con destinazione: il riferimento resta, lo stato è uno solo, scollegando la destinazione non si tocca', async () => {
    const pin = pinConDestinazione();
    expect(pin).toBeTruthy();
    const storia = await nuovoPunto('Si apre il passaggio', 'storia');
    const dopo = (await collega(storia.chiave, pin.id).expect(200)).body.data as PuntoInteresseDto;
    expect(dopo.pin.map((x) => x.id)).toEqual([pin.id]);
    expect(prepared('SELECT riferimento_tipo, riferimento_chiave, voce_chiave FROM spillo WHERE id = ?').get(pin.id)).toEqual({ riferimento_tipo: 'mappa', riferimento_chiave: pin.riferimento_chiave, voce_chiave: storia.chiave });
    // il pin sulla mappa porta altrove e insieme è della voce
    await statoPunto(storia.chiave, 'ottenuto');
    expect(raccolto(pin.uid)).toBe(1);
    const sullaMappa = ((await request(app).get(`/api/mappe/${pin.mappa_chiave}?partita=${partita}`).expect(200)).body.data as MappaDto).spilli.find((s) => s.id === pin.id)!;
    expect(sullaMappa.riferimento?.tipo).toBe('mappa');
    expect(sullaMappa.voce).toMatchObject({ chiave: storia.chiave, tipo: 'storia', stato: 'ottenuto' });
    expect(sullaMappa.raccolto).toBe(true);
    // dalla mappa: riaprire il pin riapre la voce
    await raccogli(pin.id, false);
    expect(segnato(storia.chiave)).toBeNull();
    // un'altra voce non lo prende finché è di questa
    const altra = await nuovoPunto('Altra storia', 'storia');
    expect((await collega(altra.chiave, pin.id).expect(409)).body.error.message).toMatch(/al punto «Si apre il passaggio»/);
    await scollega(storia.chiave, pin.id).expect(200);
    expect(prepared('SELECT riferimento_tipo, riferimento_chiave, voce_chiave FROM spillo WHERE id = ?').get(pin.id)).toEqual({ riferimento_tipo: 'mappa', riferimento_chiave: pin.riferimento_chiave, voce_chiave: null });
    prepared('UPDATE spillo SET voce_chiave = NULL WHERE id = ?').run(pin.id);
  });

  it('dall’editor delle mappe un riferimento «punto» diventa la voce del pin e lascia libero il riferimento', async () => {
    const p = await nuovoPunto('Forziere dall’editor');
    const pin = pinLiberi[0];
    const dto = (await request(app).put(`/api/mappe/spilli/${pin.id}`).send({ riferimento: { tipo: 'punto', chiave: p.chiave } }).expect(200)).body.data as MappaDto['spilli'][number];
    expect(dto.riferimento).toBeNull();
    expect(dto.voce?.chiave).toBe(p.chiave);
    expect(prepared('SELECT voce_chiave FROM spillo WHERE id = ?').pluck().get(pin.id)).toBe(p.chiave);
    // un salvataggio che non tocca il riferimento non tocca la voce
    await request(app).put(`/api/mappe/spilli/${pin.id}`).send({ nome: 'Rinominato', riferimento: null }).expect(200);
    expect(prepared('SELECT voce_chiave FROM spillo WHERE id = ?').pluck().get(pin.id)).toBe(p.chiave);
    // una voce che non esiste si rifiuta
    await request(app).put(`/api/mappe/spilli/${pin.id}`).send({ riferimento: { tipo: 'punto', chiave: 'nessuna-voce' } }).expect(404);
  });

  it('«Sulla mappa» di una voce porta ai suoi pin, che la portano nel campo suo', async () => {
    const p = await nuovoPunto('Forziere da trovare');
    const pin = pinLiberi[0];
    await collega(p.chiave, pin.id).expect(200);
    const accesso = (await request(app).get(`/api/mappe/accesso/punto/${encodeURIComponent(p.chiave)}`).expect(200)).body.data as AccessoMondoDto;
    expect(accesso.destinazioni.find((d) => d.spillo === pin.id)?.provenienze).toContainEqual({ tipo: 'punto', chiave: p.chiave, criterio: 'riferimento-spillo' });
    await scollega(p.chiave, pin.id).expect(200);
    const dopo = (await request(app).get(`/api/mappe/accesso/punto/${encodeURIComponent(p.chiave)}`).expect(200)).body.data as AccessoMondoDto;
    expect(dopo.destinazioni.some((d) => d.spillo === pin.id)).toBe(false);
  });

  it('il pacchetto delle mappe porta la voce; uno di prima (riferimento «punto») la ritrova nel campo suo, con lo stesso uid', async () => {
    const pin = pinConDestinazione();
    const libero = pinLiberi[1];
    const storia = await nuovoPunto('Storia esportata', 'storia');
    const forziere = await nuovoPunto('Forziere esportato');
    await collega(storia.chiave, pin.id).expect(200);
    await collega(forziere.chiave, libero.id).expect(200);
    const mappaLibero = prepared('SELECT mappa_chiave FROM spillo WHERE id = ?').pluck().get(libero.id) as string;
    const pacchetto = esportaMappe(mappaLibero);
    const spilli = pacchetto.mappe.flatMap((m) => m.spilli);
    const esportato = spilli.find((s) => s.uid === libero.uid)!;
    expect(esportato.voce).toBe(forziere.chiave);
    expect(esportato.riferimento).toBeNull();
    const conDestinazione = esportaMappe(pin.mappa_chiave).mappe.flatMap((m) => m.spilli).find((s) => s.uid === pin.uid)!;
    expect(conDestinazione).toMatchObject({ voce: storia.chiave, riferimento: { tipo: 'mappa' } });
    // com'era un pacchetto prima della 094: la voce nel riferimento
    delete esportato.voce;
    esportato.riferimento = { tipo: 'punto', chiave: forziere.chiave };
    importaMappe(pacchetto, { sovrascrivi: true });
    const dopo = prepared('SELECT id, riferimento_tipo, voce_chiave FROM spillo WHERE uid = ?').get(libero.uid) as { id: number; riferimento_tipo: string | null; voce_chiave: string | null };
    expect(dopo).toMatchObject({ riferimento_tipo: null, voce_chiave: forziere.chiave });
    // gli id della mappa reimportata cambiano (l'uid no): i casi successivi usano quelli nuovi
    pinLiberi = pinLiberi.map((p) => ({ ...p, id: prepared('SELECT id FROM spillo WHERE uid = ?').pluck().get(p.uid) as number }));
    await scollega(storia.chiave, prepared('SELECT id FROM spillo WHERE uid = ?').pluck().get(pin.uid) as number).expect(200);
  });

  it('dall’editor la voce segue le regole della guida e un passaggio tiene la sua destinazione', async () => {
    const pin = pinConDestinazione();
    const v = await nuovoPunto('Storia dall’editor', 'storia');
    // un riferimento «punto» su un pin con destinazione: la voce entra, il riferimento resta (rilievo della revisione)
    const dto = (await request(app).put(`/api/mappe/spilli/${pin.id}`).send({ riferimento: { tipo: 'punto', chiave: v.chiave } }).expect(200)).body.data as MappaDto['spilli'][number];
    expect(dto.riferimento).toEqual({ tipo: 'mappa', chiave: expect.any(String) });
    expect(prepared('SELECT riferimento_tipo, riferimento_chiave, voce_chiave FROM spillo WHERE id = ?').get(pin.id)).toEqual({ riferimento_tipo: 'mappa', riferimento_chiave: pin.riferimento_chiave, voce_chiave: v.chiave });
    // già di una voce: un'altra si rifiuta, come dalla guida
    const altra = await nuovoPunto('Altra dall’editor', 'storia');
    expect((await request(app).put(`/api/mappe/spilli/${pin.id}`).send({ riferimento: { tipo: 'punto', chiave: altra.chiave } }).expect(409)).body.error.code).toBe('pin-gia-collegato');
    // un pin fuori dal Palazzo della voce (una mappa della città), in modifica e in creazione, si rifiuta
    const citta = prepared("SELECT id, mappa_chiave FROM spillo WHERE mappa_chiave LIKE 'citta-%' AND riferimento_tipo IS NULL LIMIT 1").get() as { id: number; mappa_chiave: string };
    expect((await request(app).put(`/api/mappe/spilli/${citta.id}`).send({ riferimento: { tipo: 'punto', chiave: altra.chiave } }).expect(400)).body.error.code).toBe('pin-fuori-dal-palazzo');
    expect((await request(app).post(`/api/mappe/${citta.mappa_chiave}/spilli`).send({ tipo: 'nota', nome: 'Nota', x: 10, y: 10, riferimento: { tipo: 'punto', chiave: altra.chiave } }).expect(400)).body.error.code).toBe('pin-fuori-dal-palazzo');
    expect(prepared('SELECT voce_chiave FROM spillo WHERE id = ?').pluck().get(citta.id)).toBeNull();
    // spostato su una planimetria fuori dal Palazzo della sua voce, il pin si rifiuta e resta dov'è
    expect((await request(app).put(`/api/mappe/spilli/${pin.id}`).send({ mappa: citta.mappa_chiave }).expect(400)).body.error.code).toBe('pin-fuori-dal-palazzo');
    expect(prepared('SELECT mappa_chiave FROM spillo WHERE id = ?').pluck().get(pin.id)).toBe(pin.mappa_chiave);
    prepared('UPDATE spillo SET voce_chiave = NULL WHERE id = ?').run(pin.id);
  });

  it('un pacchetto con una voce non valida si rifiuta (400), una voce di un altro Palazzo si scarta e si conta', async () => {
    const libero = pinLiberi[2];
    const mappa = prepared('SELECT mappa_chiave FROM spillo WHERE id = ?').pluck().get(libero.id) as string;
    const rovinato = esportaMappe(mappa);
    rovinato.mappe.flatMap((m) => m.spilli).find((s) => s.uid === libero.uid)!.voce = { chiave: 'x' } as unknown as string;
    expect(() => importaMappe(rovinato, { sovrascrivi: true })).toThrow(expect.objectContaining({ code: 'voce-non-valida' }));
    const fuori = esportaMappe(mappa);
    const mementos = prepared("SELECT p.chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE a.dungeon_chiave = 'mementos' AND p.tipo <> 'altro' LIMIT 1").pluck().get() as string;
    fuori.mappe.flatMap((m) => m.spilli).find((s) => s.uid === libero.uid)!.voce = mementos;
    expect(importaMappe(fuori, { sovrascrivi: true }).vociScartate).toBe(1);
    expect(prepared('SELECT voce_chiave FROM spillo WHERE uid = ?').pluck().get(libero.uid)).toBeNull();
    pinLiberi = pinLiberi.map((p) => ({ ...p, id: prepared('SELECT id FROM spillo WHERE uid = ?').pluck().get(p.uid) as number }));
  });

  it('reimportando un pacchetto che tace sulla voce (di prima della 094) la voce resta al pin con lo stesso uid; uno che la dichiara vuota la toglie', async () => {
    const libero = pinLiberi[0];
    const p = await nuovoPunto('Forziere reimportato');
    await collega(p.chiave, libero.id).expect(200);
    const mappa = prepared('SELECT mappa_chiave FROM spillo WHERE id = ?').pluck().get(libero.id) as string;
    const muto = esportaMappe(mappa);
    for (const s of muto.mappe.flatMap((m) => m.spilli)) delete s.voce;
    importaMappe(muto, { sovrascrivi: true });
    expect(prepared('SELECT voce_chiave FROM spillo WHERE uid = ?').pluck().get(libero.uid)).toBe(p.chiave);
    const esplicito = esportaMappe(mappa);
    esplicito.mappe.flatMap((m) => m.spilli).find((s) => s.uid === libero.uid)!.voce = null;
    importaMappe(esplicito, { sovrascrivi: true });
    expect(prepared('SELECT voce_chiave FROM spillo WHERE uid = ?').pluck().get(libero.uid)).toBeNull();
    pinLiberi = pinLiberi.map((x) => ({ ...x, id: prepared('SELECT id FROM spillo WHERE uid = ?').pluck().get(x.uid) as number }));
  });

  it('reseed del seed: un pin invariato tiene id e voce; cambiato, torna con la voce; un pacchetto di prima (riferimento «punto») la dà nel campo suo', async () => {
    // i Memento: le sole planimetrie di un Palazzo ancora d'origine «seed» nel canone
    const mappa = 'nativo-rmap-190-2-0';
    const pin = prepared("SELECT id, uid FROM spillo WHERE mappa_chiave = ? AND origine = 'seed' AND tipo = 'porta'").get(mappa) as { id: number; uid: string };
    const [v, w] = prepared("SELECT p.chiave FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave WHERE a.dungeon_chiave = 'mementos' AND p.tipo <> 'altro' ORDER BY p.chiave LIMIT 2").pluck().all() as string[];
    await collega(v, pin.id).expect(200);
    const muto = () => { const x = esportaMappe(mappa); for (const s of x.mappe.flatMap((m) => m.spilli)) delete s.voce; return x; };
    // invariato: stesso id, stessa voce
    importaMappe(muto(), { origine: 'seed' });
    expect(prepared('SELECT id, voce_chiave FROM spillo WHERE uid = ?').get(pin.uid)).toEqual({ id: pin.id, voce_chiave: v });
    // il seed lo cambia (il nome): torna con un id nuovo, lo stesso uid e la sua voce
    const cambiato = muto();
    cambiato.mappe.flatMap((m) => m.spilli).find((s) => s.uid === pin.uid)!.nome = 'Porta rinominata dal seed';
    importaMappe(cambiato, { origine: 'seed' });
    const dopo = prepared('SELECT id, nome, voce_chiave FROM spillo WHERE uid = ?').get(pin.uid) as { id: number; nome: string; voce_chiave: string };
    expect(dopo).toMatchObject({ nome: 'Porta rinominata dal seed', voce_chiave: v });
    expect(dopo.id).not.toBe(pin.id);
    // un pacchetto di prima della 094 dichiara la voce nel riferimento: entra nel campo suo, il riferimento resta libero
    const vecchio = muto();
    vecchio.mappe.flatMap((m) => m.spilli).find((s) => s.uid === pin.uid)!.riferimento = { tipo: 'punto', chiave: w };
    importaMappe(vecchio, { origine: 'seed' });
    expect(prepared('SELECT riferimento_tipo, voce_chiave FROM spillo WHERE uid = ?').get(pin.uid)).toEqual({ riferimento_tipo: null, voce_chiave: w });
  });

  it('una voce con pin non diventa descrittiva finché non li si scollega', async () => {
    const p = await nuovoPunto('Forziere che cambia tipo');
    await collega(p.chiave, pinLiberi[0].id).expect(200);
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(p.chiave)}`).send({ tipo: 'altro' }).expect(409)).body.error.code).toBe('punto-con-pin');
    await scollega(p.chiave, pinLiberi[0].id).expect(200);
    expect(((await request(app).put(`/api/compendio/punti/${encodeURIComponent(p.chiave)}`).send({ tipo: 'altro' }).expect(200)).body.data as PuntoInteresseDto).tipo).toBe('altro');
  });
});
