// ============================================================
// La condizione «Pin di una mappa»: la visibilità di un pin decisa dallo stato di altri pin (2026-10-03)
// ============================================================
//
// La richiesta dell'utente (2026-09-30): «La Porta Bloccata si visualizza solo se lo spillo Meccanismo risulta non Raccolto, o un
// Meccanismo risulta visibile solo se sono stati raccolti gli oggetti chiave… la condizione deve essere singola o multipla su
// altri spilli diversi e deve essere in and o in or». Lo stato è quello della partita (raccolto, aperto, parlato, incontrato, azionato…), anche
// tramite la voce della guida del pin; la condizione è di presenza e vale anche per gli elementi fissi del gioco.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { creaMappa, esportaMappe, importaMappe, verificaCondizioni } from '../services/mappe/mappeService.js';
import { palazzoDiOgniMappa } from '../services/palazziService.js';
import type { PuntoInteresseDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();
interface Pin { id: number; nome: string; raccolto: boolean; disponibilita?: { stato: string; requisiti: Array<{ tipo: string; stato: string; dettaglio: string }> }; condizioni: Array<{ tipo: string; testo: string }> }

describe('condizione «Pin di una mappa»', () => {
  let partita: number;
  let mappa: string;
  /** Restituisce l'uid stabile dello spillo con quell'id. */
  const uidDi = (id: number) => prepared('SELECT uid FROM spillo WHERE id = ?').pluck().get(id) as string;
  /** Crea sulla mappa di prova un pin del tipo dato (con le condizioni, se indicate), verifica il 201 e ne restituisce id e uid. */
  const nuovoPin = async (tipo: string, nome: string, condizioni?: unknown[]) => {
    const r = await request(app).post(`/api/mappe/${mappa}/spilli`).send({ tipo, nome, x: 10, y: 10, ...(condizioni ? { condizioni } : {}) });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    return { id: r.body.data.id as number, uid: uidDi(r.body.data.id as number) };
  };
  /** Sostituisce le condizioni del pin `id` con quelle date (restituisce la richiesta, per controllarne l'esito). */
  const condiziona = (id: number, condizioni: unknown[]) => request(app).put(`/api/mappe/spilli/${id}`).send({ condizioni });
  /** Segna (o toglie il segno) del pin `id` nella partita di prova, pretendendo il 200. */
  const segna = (id: number, si: boolean) => request(app).put(`/api/partite/${partita}/spilli/${id}`).send({ raccolto: si }).expect(200);
  /** Rilegge la mappa di prova (con la partita, salvo `conPartita` falso) e restituisce il pin con quell'id. */
  const leggi = async (id: number, conPartita = true) => ((await request(app).get(`/api/mappe/${mappa}${conPartita ? `?partita=${partita}` : ''}`).expect(200)).body.data.spilli as Pin[]).find((s) => s.id === id)!;
  /** Stato di disponibilità del pin nella partita; un pin senza disponibilità calcolata vale «disponibile». */
  const stato = async (id: number) => (await leggi(id)).disponibilita?.stato ?? 'disponibile';
  /** Costruisce una condizione «Pin di una mappa»: vale se lo spillo `uid` è (o non è) segnato. */
  const su = (uid: string, segnato: boolean) => ({ tipo: 'spillo' as const, spillo: uid, segnato });

  beforeAll(async () => {
    dbDiProva();
    partita = ((await request(app).post('/api/partite').send({ nome: 'Pin condizionati' })).body.data as { id: number }).id;
    // una planimetria di un Palazzo con una porta del gioco (nativa): un elemento fisso, che dal 2026-10-09 le condizioni nascondono come ogni pin
    mappa = prepared("SELECT mappa_chiave FROM spillo WHERE tipo = 'porta' AND nativo_json IS NOT NULL AND mappa_chiave IS NOT NULL ORDER BY id LIMIT 1").pluck().get() as string;
  });
  afterAll(() => closeDb());

  it('la porta si vede finché la leva non è azionata; azionata la leva sparisce, richiusa ricompare', async () => {
    const leva = await nuovoPin('meccanismo', 'Leva del ponte');
    const porta = await nuovoPin('porta', 'Porta del ponte', [su(leva.uid, false)]);
    expect(await stato(porta.id)).toBe('disponibile');
    expect((await leggi(porta.id)).condizioni[0].testo).toMatch(/^Leva del ponte \(.+\): non azionato$/);
    await segna(leva.id, true);
    const nascosta = await leggi(porta.id);
    expect(nascosta.disponibilita?.stato).toBe('bloccato');
    expect(nascosta.disponibilita?.requisiti[0]).toMatchObject({ tipo: 'spillo', stato: 'rosso', dettaglio: 'Leva del ponte: azionato' });
    await segna(leva.id, false);
    expect(await stato(porta.id)).toBe('disponibile');
  });

  it('TUTTE e ALMENO UNA su più pin, e NON: il meccanismo si vede solo con le due chiavi, il passaggio con una delle due', async () => {
    const a = await nuovoPin('oggetto-chiave', 'Chiave rossa');
    const b = await nuovoPin('oggetto-chiave', 'Chiave blu');
    const mecc = await nuovoPin('meccanismo', 'Serratura doppia', [{ tipo: 'gruppo', modo: 'tutte', condizioni: [su(a.uid, true), su(b.uid, true)] }]);
    const scorciatoia = await nuovoPin('punto-sensibile', 'Grata', [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [su(a.uid, true), su(b.uid, true)] }]);
    // NON(segnato) vale come «non segnato»
    const cartello = await nuovoPin('punto-sensibile', 'Cartello', [{ tipo: 'non', condizione: su(a.uid, true) }]);
    expect([await stato(mecc.id), await stato(scorciatoia.id), await stato(cartello.id)]).toEqual(['bloccato', 'bloccato', 'disponibile']);
    await segna(a.id, true);
    expect([await stato(mecc.id), await stato(scorciatoia.id), await stato(cartello.id)]).toEqual(['bloccato', 'disponibile', 'bloccato']);
    await segna(b.id, true);
    expect([await stato(mecc.id), await stato(scorciatoia.id)]).toEqual(['disponibile', 'disponibile']);
  });

  it('una porta del gioco (elemento fisso) sparisce per lo stato di un altro pin e per una data: le condizioni sono assolute (2026-10-09)', async () => {
    const nativa = prepared("SELECT id FROM spillo WHERE tipo = 'porta' AND nativo_json IS NOT NULL AND mappa_chiave = ? ORDER BY id LIMIT 1").pluck().get(mappa) as number;
    const leva = await nuovoPin('meccanismo', 'Leva della porta del gioco');
    await condiziona(nativa, [su(leva.uid, false)]).expect(200);
    expect(await stato(nativa)).toBe('disponibile');
    await segna(leva.id, true);
    // nascosta: niente `restaInVista`, il visore la toglie
    expect((await leggi(nativa)).disponibilita).toEqual(expect.objectContaining({ stato: 'bloccato' }));
    expect((await leggi(nativa)).disponibilita).not.toHaveProperty('restaInVista');
    // una data che non vale toglie la porta come qualunque altro pin: non resta più in vista marcata «non ancora»
    await segna(leva.id, false);
    await request(app).put(`/api/partite/${partita}`).send({ dataGioco: '04-21' }).expect(200);
    await condiziona(nativa, [{ tipo: 'data', dal: '12-24' }]).expect(200);
    expect((await leggi(nativa)).disponibilita).toEqual(expect.objectContaining({ stato: 'bloccato' }));
    expect((await leggi(nativa)).disponibilita).not.toHaveProperty('restaInVista');
    // il caso segnalato dall'utente: «NON dal 20 aprile», con la partita al 21 aprile, la nasconde
    await condiziona(nativa, [{ tipo: 'non', condizione: { tipo: 'data', dal: '04-20' } }]).expect(200);
    expect(await stato(nativa)).toBe('bloccato');
    expect((await leggi(nativa)).disponibilita).not.toHaveProperty('restaInVista');
    // al 19 aprile la stessa condizione vale e la porta c'è
    await request(app).put(`/api/partite/${partita}`).send({ dataGioco: '04-19' }).expect(200);
    expect(await stato(nativa)).toBe('disponibile');
    // in un gruppo, con la leva non azionata: manca solo la data, e la porta sparisce lo stesso
    await condiziona(nativa, [{ tipo: 'gruppo', modo: 'tutte', condizioni: [{ tipo: 'data', dal: '12-24' }, su(leva.uid, false)] }]).expect(200);
    expect((await leggi(nativa)).disponibilita).toEqual(expect.objectContaining({ stato: 'bloccato' }));
    expect((await leggi(nativa)).disponibilita).not.toHaveProperty('restaInVista');
    await condiziona(nativa, []).expect(200);
  });

  it('lo stato si legge anche dalla voce della guida del pin: segnata la voce, il pin è segnato', async () => {
    const leva = await nuovoPin('meccanismo', 'Leva con la sua voce');
    const porta = await nuovoPin('porta', 'Porta con la sua leva', [su(leva.uid, true)]);
    // una voce in un'area del Palazzo di questa planimetria: il collegamento dalla guida lo accetta
    const dungeon = palazzoDiOgniMappa().get(mappa)!;
    const area = prepared('SELECT chiave FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine LIMIT 1').pluck().get(dungeon) as string;
    const voce = (await request(app).post(`/api/compendio/aree/${area}/punti`).send({ nome: 'Aziona la leva della voce', tipo: 'meccanismo' }).expect(201)).body.data as PuntoInteresseDto;
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(voce.chiave)}/pin/${leva.id}`).expect(200);
    expect(await stato(porta.id)).toBe('bloccato');
    await request(app).put(`/api/partite/${partita}/punti`).send({ punto: voce.chiave, stato: 'ottenuto' }).expect(200);
    expect(await stato(porta.id)).toBe('disponibile');
    // dati di prima, con la voce segnata ma senza il segno sul pin: il visore lo mostra segnato (`dettagliSpillo`), e la
    // condizione dice lo stesso
    prepared('DELETE FROM spillo_partita WHERE partita_id = ? AND spillo_uid = ?').run(partita, leva.uid);
    expect((await leggi(leva.id)).raccolto).toBe(true);
    expect(await stato(porta.id)).toBe('disponibile');
  });

  it('un pin eliminato lascia la condizione «non si sa» (grigia), detta per nome; senza partita non si valuta', async () => {
    const leva = await nuovoPin('meccanismo', 'Leva che sparirà');
    const porta = await nuovoPin('porta', 'Porta orfana', [su(leva.uid, false)]);
    await request(app).delete(`/api/mappe/spilli/${leva.id}`).expect(204);
    const orfana = await leggi(porta.id);
    expect(orfana.condizioni[0].testo).toBe('Pin non più presente: non segnato');
    expect(orfana.disponibilita).toMatchObject({ stato: 'ignoto', requisiti: [{ tipo: 'spillo', stato: 'grigio' }] });
    expect((await leggi(porta.id, false)).disponibilita).toBeUndefined();
  });

  it('in scrittura: il pin deve esistere e avere uno stato; nel catalogo la condizione non vale', async () => {
    const nota = await nuovoPin('nota', 'Appunto senza stato');
    const porta = await nuovoPin('porta', 'Porta da condizionare');
    expect((await condiziona(porta.id, [su('f'.repeat(32), true)])).body.error.code).toBe('condizione-non-trovata');
    expect((await condiziona(porta.id, [su(nota.uid, true)])).body.error.code).toBe('condizione-non-trovata');
    expect((await condiziona(porta.id, [{ tipo: 'spillo', spillo: 'non-un-uid', segnato: true }])).status).toBe(400);
    expect(() => verificaCondizioni([{ tipo: 'spillo', spillo: porta.uid, segnato: true }])).toThrow(/solo nelle condizioni dei pin/);
    expect(() => verificaCondizioni([{ tipo: 'spillo', spillo: porta.uid, segnato: true }], true)).not.toThrow();
  });

  it('un pacchetto mappe porta con sé le condizioni sugli altri pin, anche verso un pin dello stesso pacchetto; un uid ignoto si scarta', async () => {
    const leva = await nuovoPin('meccanismo', 'Leva esportata');
    const porta = await nuovoPin('porta', 'Porta esportata', [su(leva.uid, false)]);
    // la «Porta orfana» del caso precedente cita un pin eliminato: si scarterebbe anche lei, e qui si conta solo questo caso
    await condiziona(prepared("SELECT id FROM spillo WHERE nome = 'Porta orfana'").pluck().get() as number, []).expect(200);
    const pacchetto = esportaMappe(mappa);
    const esportata = pacchetto.mappe.flatMap((m) => m.spilli).find((s) => s.nome === 'Porta esportata')!;
    expect(esportata.condizioni).toEqual([su(leva.uid, false)]);
    // reimportata per intero con la porta **prima** della leva: quando la porta entra, la leva non è ancora nel database, ed è
    // il pacchetto a dire che c'è
    for (const m of pacchetto.mappe) m.spilli = [...m.spilli].sort((x, y) => (x.nome === 'Porta esportata' ? -1 : y.nome === 'Porta esportata' ? 1 : 0));
    expect(importaMappe(pacchetto, { sovrascrivi: true }).condizioniScartate).toBe(0);
    const reimportata = prepared("SELECT condizioni_json FROM spillo WHERE nome = 'Porta esportata'").pluck().get() as string;
    expect(JSON.parse(reimportata)).toEqual([su(leva.uid, false)]);
    // un riferimento a un pin che non c'è né nel database né nel pacchetto si scarta, come le altre chiavi ignote
    const rotto = structuredClone(esportaMappe(mappa));
    rotto.mappe.flatMap((m) => m.spilli).find((s) => s.nome === 'Porta esportata')!.condizioni = [su('e'.repeat(32), true)];
    expect(importaMappe(rotto, { sovrascrivi: true }).condizioniScartate).toBe(1);
    void porta;
  });

  it('un pin non dipende da se stesso e le condizioni non chiudono giri, anche lunghi (scelta dell’utente): 400 coi nomi', async () => {
    const a = await nuovoPin('meccanismo', 'Leva A');
    const b = await nuovoPin('meccanismo', 'Leva B');
    const c = await nuovoPin('meccanismo', 'Leva C');
    expect((await condiziona(a.id, [su(a.uid, true)])).body.error.code).toBe('condizione-su-se-stesso');
    await condiziona(a.id, [su(b.uid, true)]).expect(200);
    const giro2 = (await condiziona(b.id, [{ tipo: 'non', condizione: su(a.uid, true) }])).body.error;
    expect(giro2.code).toBe('condizioni-in-giro');
    expect(giro2.message).toContain('Leva B → Leva A → Leva B');
    await condiziona(b.id, [su(c.uid, true)]).expect(200);
    // il giro a tre, dentro un gruppo ALMENO UNA
    const giro3 = (await condiziona(c.id, [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [{ tipo: 'piove' }, su(a.uid, false)] }])).body.error;
    expect(giro3.code).toBe('condizioni-in-giro');
    expect(giro3.message).toContain('Leva C → Leva A → Leva B → Leva C');
    // una catena senza giro va bene
    await condiziona(c.id, [{ tipo: 'piove' }]).expect(200);
    // un pacchetto che chiude un giro si rifiuta per intero
    const pacchetto = structuredClone(esportaMappe(mappa));
    pacchetto.mappe.flatMap((m) => m.spilli).find((s) => s.nome === 'Leva C')!.condizioni = [su(a.uid, true)];
    expect(() => importaMappe(pacchetto, { sovrascrivi: true })).toThrow(/giro fra i pin/);
    expect(prepared("SELECT condizioni_json FROM spillo WHERE nome = 'Leva C'").pluck().get()).toBe(JSON.stringify([{ tipo: 'piove' }]));
    await condiziona(a.id, []).expect(200);
    await condiziona(b.id, []).expect(200);
  });

  it('un pin citato che diventa di un tipo senza stato lascia la condizione grigia («Da correggere»), invece che rossa per sempre', async () => {
    const leva = await nuovoPin('meccanismo', 'Leva che diventa nota');
    const porta = await nuovoPin('porta', 'Porta della leva diventata nota', [su(leva.uid, true)]);
    expect(await stato(porta.id)).toBe('bloccato');
    await request(app).put(`/api/mappe/spilli/${leva.id}`).send({ tipo: 'nota' }).expect(200);
    const dopo = await leggi(porta.id);
    expect(dopo.disponibilita).toMatchObject({ stato: 'ignoto', requisiti: [{ tipo: 'spillo', stato: 'grigio', dettaglio: expect.stringMatching(/non ha più uno stato/) }] });
  });

  it('il catalogo rifiuta la condizione dei soli pin attraverso le sue rotte, anche negli effetti; e così una scheda della guida senza mappa', async () => {
    const leva = await nuovoPin('meccanismo', 'Leva fuori ambito');
    const libro = await request(app).post('/api/catalogo/libro').send({ nome: 'Libro condizionato da un pin', condizioni_json: [su(leva.uid, true)] });
    expect(libro.status).toBe(400);
    expect(JSON.stringify(libro.body)).toContain('solo nelle condizioni dei pin');
    const effetto = await request(app).post('/api/catalogo/libro').send({ nome: 'Libro con un effetto condizionato', effetti_json: [{ effetto: { famiglia: 'ripristina' }, condizioni: [{ tipo: 'non', condizione: su(leva.uid, true) }] }] });
    expect(effetto.status).toBe(400);
    expect(JSON.stringify(effetto.body)).toContain('solo nelle condizioni dei pin');
    const scheda = prepared('SELECT id FROM spillo WHERE mappa_chiave IS NULL AND area_guida_chiave IS NOT NULL ORDER BY id LIMIT 1').pluck().get() as number;
    expect((await condiziona(scheda, [su(leva.uid, true)])).body.error.code).toBe('condizione-solo-pin');
  });

  it('NON su un gruppo misto (difetto corretto): NON(TUTTE(Coraggio 5, leva azionata)) con il Coraggio basso è vera, e la leva azionata non toglie il pin', async () => {
    const leva = await nuovoPin('meccanismo', 'Leva del gruppo misto');
    const cartello = await nuovoPin('punto-sensibile', 'Cartello del gruppo misto', [{ tipo: 'non', condizione: { tipo: 'gruppo', modo: 'tutte', condizioni: [{ tipo: 'dote', dote: 'coraggio', rango: 5 }, su(leva.uid, true)] } }]);
    await segna(leva.id, true);
    expect(await stato(cartello.id)).toBe('disponibile');
  });

  it('tutti i pin con uno stato si segnano e si citano con la loro parola: Confidente «incontrato», Dialogo «parlato»; un pin senza stato proprio, con la sua voce della guida, «ottenuto»', async () => {
    const confidente = await nuovoPin('confidente', 'Confidente al parco');
    const dialogo = await nuovoPin('dialogo', 'Chiacchiera col custode');
    const sicura = await nuovoPin('sicura', 'Stanza sicura con la sua voce');
    const porta = await nuovoPin('porta', 'Porta dei tre');
    // la stanza sicura da sola non si cita (nessuno stato); con una voce della guida sì
    expect((await condiziona(porta.id, [su(sicura.uid, true)])).body.error.code).toBe('condizione-non-trovata');
    const dungeon = palazzoDiOgniMappa().get(mappa)!;
    const area = prepared('SELECT chiave FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine LIMIT 1').pluck().get(dungeon) as string;
    const voce = (await request(app).post(`/api/compendio/aree/${area}/punti`).send({ nome: 'Riposa nella stanza sicura', tipo: 'sicura' }).expect(201)).body.data as PuntoInteresseDto;
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(voce.chiave)}/pin/${sicura.id}`).expect(200);
    await condiziona(porta.id, [{ tipo: 'gruppo', modo: 'tutte', condizioni: [su(confidente.uid, true), su(dialogo.uid, true), su(sicura.uid, true)] }]).expect(200);
    const testi = (await leggi(porta.id)).condizioni[0].testo;
    expect(testi).toMatch(/Confidente al parco \(.+\): incontrato/);
    expect(testi).toMatch(/Chiacchiera col custode \(.+\): parlato/);
    expect(testi).toMatch(/Stanza sicura con la sua voce \(.+\): ottenuto/);
    // nell'elenco dell'editor, con la loro parola
    const elenco = (await request(app).get('/api/condizioni/spilli').expect(200)).body.data as Array<{ chiave: string; parola: string }>;
    expect(Object.fromEntries(elenco.filter((p) => [confidente.uid, dialogo.uid, sicura.uid].includes(p.chiave)).map((p) => [p.chiave, p.parola])))
      .toEqual({ [confidente.uid]: 'incontrato', [dialogo.uid]: 'parlato', [sicura.uid]: 'ottenuto' });
    expect(await stato(porta.id)).toBe('bloccato');
    await segna(confidente.id, true);
    await segna(dialogo.id, true);
    expect(await stato(porta.id)).toBe('bloccato');
    // la stanza sicura si segna dalla sua voce della guida
    await request(app).put(`/api/partite/${partita}/punti`).send({ punto: voce.chiave, stato: 'ottenuto' }).expect(200);
    expect(await stato(porta.id)).toBe('disponibile');
  });

  it('un pacchetto: la porta che entra prima cita un pin citabile solo per la sua voce della guida, che entra dopo', async () => {
    const sicura = await nuovoPin('sicura', 'Stanza sicura del pacchetto');
    const dungeon = palazzoDiOgniMappa().get(mappa)!;
    const area = prepared('SELECT chiave FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine LIMIT 1').pluck().get(dungeon) as string;
    const voce = (await request(app).post(`/api/compendio/aree/${area}/punti`).send({ nome: 'Riposa nella stanza del pacchetto', tipo: 'sicura' }).expect(201)).body.data as PuntoInteresseDto;
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(voce.chiave)}/pin/${sicura.id}`).expect(200);
    await nuovoPin('porta', 'Porta del pacchetto', [su(sicura.uid, true)]);
    const pacchetto = structuredClone(esportaMappe(mappa));
    for (const m of pacchetto.mappe) m.spilli = [...m.spilli].sort((x, y) => (x.nome === 'Porta del pacchetto' ? -1 : y.nome === 'Porta del pacchetto' ? 1 : 0));
    // (le altre condizioni del caso precedente: tolte, così si conta solo questa)
    for (const s of pacchetto.mappe.flatMap((m) => m.spilli)) if (s.nome !== 'Porta del pacchetto') delete s.condizioni;
    expect(importaMappe(pacchetto, { sovrascrivi: true }).condizioniScartate).toBe(0);
    expect(JSON.parse(prepared("SELECT condizioni_json FROM spillo WHERE nome = 'Porta del pacchetto'").pluck().get() as string)).toEqual([su(sicura.uid, true)]);
  });

  describe('un pacchetto con un pin citabile solo per la sua voce della guida: l’esito non dipende dall’ordine dei pin (F1)', () => {
    /** Una stanza sicura collegata a una voce della guida, sulla planimetria `su`, e una porta che la cita sulla planimetria `porta`. */
    const prepara = async (nomeSicura: string, nomePorta: string, mappaPorta = mappa) => {
      const sicura = await nuovoPin('sicura', nomeSicura);
      const dungeon = palazzoDiOgniMappa().get(mappa)!;
      const area = prepared('SELECT chiave FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine LIMIT 1').pluck().get(dungeon) as string;
      const voce = (await request(app).post(`/api/compendio/aree/${area}/punti`).send({ nome: `Voce di ${nomeSicura}`, tipo: 'sicura' }).expect(201)).body.data as PuntoInteresseDto;
      await request(app).put(`/api/compendio/punti/${encodeURIComponent(voce.chiave)}/pin/${sicura.id}`).expect(200);
      const r = await request(app).post(`/api/mappe/${mappaPorta}/spilli`).send({ tipo: 'porta', nome: nomePorta, x: 20, y: 20, condizioni: [su(sicura.uid, true)] });
      expect(r.status, JSON.stringify(r.body)).toBe(201);
      return sicura;
    };
    /** Legge dal DB le condizioni salvate sullo spillo col nome dato (lista vuota se non ne ha). */
    const condizioniDi = (nome: string) => JSON.parse((prepared('SELECT condizioni_json FROM spillo WHERE nome = ?').pluck().get(nome) as string | null) ?? '[]');
    /** Solo le condizioni del caso: le altre (dei casi precedenti) non devono contare negli scarti. */
    const soloQuesta = (p: ReturnType<typeof esportaMappe>, nomePorta: string) => { for (const s of p.mappe.flatMap((m) => m.spilli)) if (s.nome !== nomePorta) delete s.condizioni; return p; };

    it('la stanza sicura viene prima della porta, sulla stessa planimetria', async () => {
      const sicura = await prepara('Stanza sicura che viene prima', 'Porta che viene dopo');
      const pacchetto = soloQuesta(structuredClone(esportaMappe(mappa)), 'Porta che viene dopo');
      for (const m of pacchetto.mappe) m.spilli = [...m.spilli].sort((x, y) => (x.nome === 'Stanza sicura che viene prima' ? -1 : y.nome === 'Stanza sicura che viene prima' ? 1 : 0));
      expect(importaMappe(pacchetto, { sovrascrivi: true }).condizioniScartate).toBe(0);
      expect(condizioniDi('Porta che viene dopo')).toEqual([su(sicura.uid, true)]);
    });

    it('la stanza sicura sta su una planimetria importata prima di quella della porta', async () => {
      const altra = creaMappa(undefined, { nome: 'Planimetria della porta', tipo: 'area', genitore: prepared('SELECT genitore_chiave FROM mappa WHERE chiave = ?').pluck().get(mappa) as string });
      const sicura = await prepara('Stanza sicura dell’altra mappa', 'Porta dell’altra mappa', altra.chiave);
      const prima = soloQuesta(structuredClone(esportaMappe(mappa)), 'Porta dell’altra mappa');
      const seconda = soloQuesta(structuredClone(esportaMappe(altra.chiave)), 'Porta dell’altra mappa');
      const pacchetto = { ...prima, mappe: [...prima.mappe, ...seconda.mappe.filter((m) => !prima.mappe.some((p) => p.chiave === m.chiave))] };
      expect(importaMappe(pacchetto, { sovrascrivi: true }).condizioniScartate).toBe(0);
      expect(condizioniDi('Porta dell’altra mappa')).toEqual([su(sicura.uid, true)]);
    });

    it('il contrario: una porta che cita un pin del pacchetto senza stato si scarta a pacchetto inserito — una nota, o una stanza sicura la cui voce non è ammessa (G1)', async () => {
      const nota = await nuovoPin('nota', 'Nota del pacchetto');
      const sicura = await nuovoPin('sicura', 'Stanza sicura con una voce di un altro Palazzo');
      await nuovoPin('porta', 'Porta che cita una nota');
      await nuovoPin('porta', 'Porta che cita la stanza sbagliata');
      // una voce di un altro Palazzo: `voceAmmessa` la scarta, e la stanza resta senza stato
      const dungeon = palazzoDiOgniMappa().get(mappa)!;
      const altraArea = prepared('SELECT chiave FROM dungeon_area WHERE dungeon_chiave <> ? ORDER BY dungeon_chiave, ordine LIMIT 1').pluck().get(dungeon) as string;
      const voceAltrove = (await request(app).post(`/api/compendio/aree/${altraArea}/punti`).send({ nome: 'Voce di un altro Palazzo', tipo: 'sicura' }).expect(201)).body.data as PuntoInteresseDto;
      const pacchetto = structuredClone(esportaMappe(mappa));
      for (const s of pacchetto.mappe.flatMap((m) => m.spilli)) {
        if (s.nome === 'Porta che cita una nota') s.condizioni = [su(nota.uid, true)];
        else if (s.nome === 'Porta che cita la stanza sbagliata') s.condizioni = [su(sicura.uid, true)];
        else delete s.condizioni;
        if (s.nome === 'Stanza sicura con una voce di un altro Palazzo') (s as { voce?: string | null }).voce = voceAltrove.chiave;
      }
      // all'inserimento si accettano (pin del pacchetto); il riesame le scarta, una ciascuna
      const esito = importaMappe(pacchetto, { sovrascrivi: true });
      expect(esito.condizioniScartate).toBe(2);
      expect(esito.vociScartate).toBe(1);
      expect(condizioniDi('Porta che cita una nota')).toEqual([]);
      expect(condizioniDi('Porta che cita la stanza sbagliata')).toEqual([]);
    });

    it('un pacchetto senza il campo della voce (di prima della 094): la voce del pin reinserito vale lo stesso', async () => {
      const sicura = await prepara('Stanza sicura senza voce nel pacchetto', 'Porta del pacchetto senza voce');
      const pacchetto = soloQuesta(structuredClone(esportaMappe(mappa)), 'Porta del pacchetto senza voce');
      for (const s of pacchetto.mappe.flatMap((m) => m.spilli)) delete (s as { voce?: unknown }).voce;
      for (const m of pacchetto.mappe) m.spilli = [...m.spilli].sort((x, y) => (x.nome === 'Porta del pacchetto senza voce' ? -1 : y.nome === 'Porta del pacchetto senza voce' ? 1 : 0));
      expect(importaMappe(pacchetto, { sovrascrivi: true }).condizioniScartate).toBe(0);
      expect(condizioniDi('Porta del pacchetto senza voce')).toEqual([su(sicura.uid, true)]);
    });
  });

  it('un Confidente collegato a una voce della guida la segna quando lo si incontra, e la voce segnata segna lui', async () => {
    const confidente = await nuovoPin('confidente', 'Confidente della guida');
    const dungeon = palazzoDiOgniMappa().get(mappa)!;
    const area = prepared('SELECT chiave FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine LIMIT 1').pluck().get(dungeon) as string;
    const voce = (await request(app).post(`/api/compendio/aree/${area}/punti`).send({ nome: 'Incontra il Confidente', tipo: 'persona' }).expect(201)).body.data as PuntoInteresseDto;
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(voce.chiave)}/pin/${confidente.id}`).expect(200);
    await segna(confidente.id, true);
    expect(prepared('SELECT stato FROM punto_partita WHERE partita_id = ? AND punto_chiave = ?').pluck().get(partita, voce.chiave)).toBe('ottenuto');
    await request(app).put(`/api/partite/${partita}/punti`).send({ punto: voce.chiave, stato: null }).expect(200);
    expect((await leggi(confidente.id)).raccolto).toBe(false);
  });

  it('un pin senza stato proprio collegato solo a una voce «Altro» (descrittiva) non si segna e non si cita', async () => {
    const nota = await nuovoPin('nota', 'Nota con una voce descrittiva');
    prepared("INSERT INTO punto_interesse (chiave, area_chiave, ordine, tipo, nome, descrizione, esauribile, dettagli_json, fonte) SELECT 'prova-altro-descrittiva', chiave, 999, 'altro', 'Descrizione', '', 0, '{}', '' FROM dungeon_area ORDER BY ordine LIMIT 1").run();
    prepared("UPDATE spillo SET voce_chiave = 'prova-altro-descrittiva' WHERE id = ?").run(nota.id);
    expect((await request(app).put(`/api/partite/${partita}/spilli/${nota.id}`).send({ raccolto: true })).body.error.code).toBe('spillo-senza-stato');
    const porta = await nuovoPin('porta', 'Porta della nota descrittiva');
    expect((await condiziona(porta.id, [su(nota.uid, true)])).body.error.code).toBe('condizione-non-trovata');
  });

  it('l’elenco per l’editor: solo i pin con uno stato, con la mappa e il tipo', async () => {
    await nuovoPin('nota', 'Nota fuori elenco');
    const leva = await nuovoPin('meccanismo', 'Leva in elenco');
    const elenco = (await request(app).get('/api/condizioni/spilli').expect(200)).body.data as Array<{ chiave: string; nome: string; tipo: string; gruppo: string; parola: string }>;
    expect(elenco.find((p) => p.chiave === leva.uid)).toMatchObject({ nome: 'Leva in elenco', tipo: 'meccanismo', gruppo: expect.stringContaining(' › '), parola: 'azionato' });
    expect(elenco.some((p) => p.nome === 'Nota fuori elenco')).toBe(false);
    // i tipi senza stato proprio ci sono solo con una voce della guida, e allora col suo «ottenuto»
    expect(elenco.filter((p) => ['nota', 'sicura', 'passaggio'].includes(p.tipo)).every((p) => p.parola === 'ottenuto')).toBe(true);
  });
});
