// ============================================================
// La condizione «Voce della guida»: la visibilità di un pin decisa dallo stato di una voce della guida di un Palazzo o dei Memento (2026-10-11)
// ============================================================
//
// La richiesta dell'utente: «i pin tra le condizioni devono avere anche la possibilità di scegliere sulla base dello stato dei
// passi della guida di un'area la condizione di visibilità». Scelte dell'utente: «Segnata / non segnata» (segnata = Ottenuta o
// Esaurita) e «Solo nei pin delle mappe». È di presenza: non soddisfatta, il pin sparisce.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { esportaMappe, importaMappe, verificaCondizioni } from '../services/mappe/mappeService.js';
import { palazzoDiOgniMappa } from '../services/palazziService.js';
import type { PuntoInteresseDto, VoceCitabileDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();
interface Pin { id: number; nome: string; disponibilita?: { stato: string; requisiti: Array<{ tipo: string; stato: string; dettaglio: string }> }; condizioni: Array<{ tipo: string; testo: string }> }

describe('condizione «Voce della guida»', () => {
  let partita: number;
  let mappa: string;
  let area: string;
  /** Crea sulla mappa di prova un pin del tipo dato (con le condizioni, se indicate), verifica il 201 e ne restituisce l'id. */
  const nuovoPin = async (tipo: string, nome: string, condizioni?: unknown[]) => {
    const r = await request(app).post(`/api/mappe/${mappa}/spilli`).send({ tipo, nome, x: 10, y: 10, ...(condizioni ? { condizioni } : {}) });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    return r.body.data.id as number;
  };
  /** Crea nell'area di prova una voce della guida del tipo dato e la restituisce. */
  const nuovaVoce = async (nome: string, tipo = 'storia') => (await request(app).post(`/api/compendio/aree/${area}/punti`).send({ nome, tipo }).expect(201)).body.data as PuntoInteresseDto;
  /** Imposta (o, con null, toglie) lo stato della voce nella partita di prova, pretendendo il 200. */
  const statoVoce = (voce: string, stato: string | null) => request(app).put(`/api/partite/${partita}/punti`).send({ punto: voce, stato }).expect(200);
  /** Rilegge la mappa di prova con la partita e restituisce il pin con quell'id. */
  const leggi = async (id: number) => ((await request(app).get(`/api/mappe/${mappa}?partita=${partita}`).expect(200)).body.data.spilli as Pin[]).find((s) => s.id === id)!;
  /** Stato di disponibilità del pin nella partita; un pin senza disponibilità calcolata vale «disponibile». */
  const stato = async (id: number) => (await leggi(id)).disponibilita?.stato ?? 'disponibile';
  /** Costruisce una condizione «Voce della guida»: vale se la voce è (o non è) segnata. */
  const su = (voce: string, segnata: boolean) => ({ tipo: 'voce-guida' as const, voce, segnata });

  beforeAll(async () => {
    dbDiProva();
    partita = ((await request(app).post('/api/partite').send({ nome: 'Pin e voci' })).body.data as { id: number }).id;
    // una planimetria di Kamoshida e un'area di Kamoshida
    mappa = [...palazzoDiOgniMappa()].find(([, d]) => d === 'kamoshida')![0];
    area = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine LIMIT 1").pluck().get() as string;
  });
  afterAll(() => closeDb());

  it('il pin compare quando la voce è segnata (Ottenuta o Esaurita) e sparisce quando si riapre; «non segnata» fa il contrario', async () => {
    const v = await nuovaVoce('Si apre il passaggio');
    // esauribile: da L4 (R4-07) «Esaurita» vale solo per una voce esauribile
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(v.chiave)}`).send({ esauribile: true }).expect(200);
    const dopo = await nuovoPin('passaggio', 'Passaggio aperto', [su(v.chiave, true)]);
    const prima = await nuovoPin('nota', 'Indizio prima del passaggio', [su(v.chiave, false)]);
    expect([await stato(dopo), await stato(prima)]).toEqual(['bloccato', 'disponibile']);
    const testo = (await leggi(dopo)).condizioni[0].testo;
    expect(testo).toMatch(/^Voce «Si apre il passaggio» \(Palazzo di Kamoshida › 1\. .+\): segnata$/);
    await statoVoce(v.chiave, 'ottenuto');
    expect([await stato(dopo), await stato(prima)]).toEqual(['disponibile', 'bloccato']);
    await statoVoce(v.chiave, 'esaurito');
    expect(await stato(dopo)).toBe('disponibile');
    await statoVoce(v.chiave, null);
    expect([await stato(dopo), await stato(prima)]).toEqual(['bloccato', 'disponibile']);
    // il dettaglio dice lo stato della voce
    expect((await leggi(dopo)).disponibilita!.requisiti[0]).toMatchObject({ tipo: 'voce-guida', stato: 'rosso', dettaglio: '«Si apre il passaggio»: non segnata' });
  });

  it('si combina con TUTTE, ALMENO UNA e NON, anche con le altre condizioni', async () => {
    const a = await nuovaVoce('Passo A');
    const b = await nuovaVoce('Passo B');
    const tutte = await nuovoPin('nota', 'Dopo A e B', [{ tipo: 'gruppo', modo: 'tutte', condizioni: [su(a.chiave, true), su(b.chiave, true)] }]);
    const una = await nuovoPin('nota', 'Dopo A o B', [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [su(a.chiave, true), su(b.chiave, true)] }]);
    const non = await nuovoPin('nota', 'Non dopo A', [{ tipo: 'non', condizione: su(a.chiave, true) }]);
    expect([await stato(tutte), await stato(una), await stato(non)]).toEqual(['bloccato', 'bloccato', 'disponibile']);
    await statoVoce(a.chiave, 'ottenuto');
    expect([await stato(tutte), await stato(una), await stato(non)]).toEqual(['bloccato', 'disponibile', 'bloccato']);
    await statoVoce(b.chiave, 'ottenuto');
    expect(await stato(tutte)).toBe('disponibile');
  });

  it('al salvataggio: una voce che non c’è o è descrittiva si rifiuta (404), una chiave malformata pure (400); fuori dai pin non vale', async () => {
    const id = await nuovoPin('nota', 'Nota da condizionare');
    const r = await request(app).put(`/api/mappe/spilli/${id}`).send({ condizioni: [su('nessuna-voce/0', true)] });
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('condizione-non-trovata');
    const descrittiva = await nuovaVoce('Solo da leggere', 'altro');
    expect((await request(app).put(`/api/mappe/spilli/${id}`).send({ condizioni: [su(descrittiva.chiave, true)] })).body.error.code).toBe('condizione-non-trovata');
    expect((await request(app).put(`/api/mappe/spilli/${id}`).send({ condizioni: [{ tipo: 'voce-guida', voce: 'Con Spazi', segnata: true }] })).status).toBe(400);
    // nel catalogo (effetti, negozi, articoli…) la condizione non esiste: solo nei pin delle mappe
    const v = await nuovaVoce('Voce valida');
    expect(() => verificaCondizioni([su(v.chiave, true)])).toThrow(expect.objectContaining({ code: 'condizione-solo-pin' }));
    expect(() => verificaCondizioni([su(v.chiave, true)], true)).not.toThrow();
  });

  it('il catalogo la rifiuta attraverso le sue rotte, anche negli effetti; e così una scheda della guida senza mappa', async () => {
    const v = await nuovaVoce('Voce fuori ambito');
    const libro = await request(app).post('/api/catalogo/libro').send({ nome: 'Libro condizionato da una voce', condizioni_json: [su(v.chiave, true)] });
    expect(libro.status).toBe(400);
    expect(JSON.stringify(libro.body)).toContain('voce della guida si usa solo nelle condizioni dei pin');
    // lo ferma già lo schema delle rotte del catalogo (oltre al controllo del servizio)
    expect(libro.body.error.code).toBe('validation-error');
    const effetto = await request(app).post('/api/catalogo/libro').send({ nome: 'Libro con un effetto da una voce', effetti_json: [{ effetto: { famiglia: 'ripristina' }, condizioni: [{ tipo: 'non', condizione: su(v.chiave, true) }] }] });
    expect(effetto.status).toBe(400);
    const scheda = prepared('SELECT id FROM spillo WHERE mappa_chiave IS NULL AND area_guida_chiave IS NOT NULL ORDER BY id LIMIT 1').pluck().get() as number;
    expect((await request(app).put(`/api/mappe/spilli/${scheda}`).send({ condizioni: [su(v.chiave, true)] })).body.error.code).toBe('condizione-solo-pin');
  });

  it('una voce eliminata lascia la condizione grigia («ignoto», da correggere): il pin resta nascosto finché non la si corregge', async () => {
    const v = await nuovaVoce('Voce che se ne va');
    const id = await nuovoPin('nota', 'Nota orfana', [su(v.chiave, true)]);
    await request(app).delete(`/api/compendio/punti/${encodeURIComponent(v.chiave)}`).expect(204);
    const p = await leggi(id);
    expect(p.disponibilita!.requisiti[0]).toMatchObject({ tipo: 'voce-guida', stato: 'grigio' });
    expect(p.condizioni[0].testo).toBe('Voce della guida non più presente: segnata');
    expect(p.disponibilita!.stato).toBe('ignoto');
  });

  it('una voce diventata descrittiva lascia la condizione grigia: non ha più stato, e la condizione va corretta', async () => {
    const v = await nuovaVoce('Voce che diventa una nota');
    const id = await nuovoPin('nota', 'Nota della voce descrittiva', [su(v.chiave, true)]);
    expect(await stato(id)).toBe('bloccato');
    // senza pin collegati la voce può diventare «Altro» anche se una condizione la cita
    await request(app).put(`/api/compendio/punti/${encodeURIComponent(v.chiave)}`).send({ tipo: 'altro' }).expect(200);
    const p = await leggi(id);
    expect(p.disponibilita!.requisiti[0]).toMatchObject({ tipo: 'voce-guida', stato: 'grigio', dettaglio: '«Voce che diventa una nota» è diventata una voce descrittiva, senza stato: correggi la condizione nell’editor della mappa' });
    // grigio: «ignoto», non «bloccato»; il visore lo nasconde come ogni condizione che non vale e, richiamato, dice «Da correggere»
    expect(p.disponibilita!.stato).toBe('ignoto');
  });

  it('il pacchetto delle mappe porta la condizione; una voce che non c’è si scarta e si conta', async () => {
    const v = await nuovaVoce('Voce del pacchetto');
    await nuovoPin('nota', 'Nota del pacchetto', [su(v.chiave, true)]);
    const pacchetto = esportaMappe(mappa);
    const nota = pacchetto.mappe.flatMap((m) => m.spilli).find((s) => s.nome === 'Nota del pacchetto')!;
    expect(nota.condizioni).toEqual([su(v.chiave, true)]);
    importaMappe(pacchetto, { sovrascrivi: true });
    /** Le condizioni salvate della nota del pacchetto (nessuna = colonna vuota). */
    const condizioni = () => JSON.parse((prepared("SELECT condizioni_json FROM spillo WHERE nome = 'Nota del pacchetto'").pluck().get() as string | null) ?? '[]') as unknown[];
    expect(condizioni()).toEqual([su(v.chiave, true)]);
    const rotto = esportaMappe(mappa);
    rotto.mappe.flatMap((m) => m.spilli).find((s) => s.nome === 'Nota del pacchetto')!.condizioni = [su('voce-inesistente/9', true)];
    expect(importaMappe(rotto, { sovrascrivi: true }).condizioniScartate).toBe(1);
    expect(condizioni()).toEqual([]);
  });

  it('GET /api/condizioni/voci elenca le voci che si segnano, passi degli Enigmi compresi, col posto; non le descrittive', async () => {
    const enigma = await nuovaVoce('Enigma di prova', 'puzzle');
    const passo = (await request(app).post(`/api/compendio/aree/${area}/punti`).send({ nome: 'Passo di prova', tipo: 'meccanismo', contenitore: enigma.chiave }).expect(201)).body.data as PuntoInteresseDto;
    const descrittiva = await nuovaVoce('Nota descrittiva di prova', 'altro');
    const voci = (await request(app).get('/api/condizioni/voci').expect(200)).body.data as VoceCitabileDto[];
    expect(voci.find((v) => v.chiave === passo.chiave)).toMatchObject({ nome: 'Passo di prova', tipo: 'meccanismo', gruppo: expect.stringMatching(/^Palazzo di Kamoshida › 1\. /) });
    expect(voci.some((v) => v.chiave === descrittiva.chiave)).toBe(false);
    // il passo viene subito dopo il suo Enigma
    expect(voci.findIndex((v) => v.chiave === passo.chiave)).toBe(voci.findIndex((v) => v.chiave === enigma.chiave) + 1);
    // anche le voci dei dedali dei Memento (scelta dell'utente, 2026-10-11: «Anche i Memento»), dopo i Palazzi, e si citano
    const memento = voci.find((v) => v.gruppo.startsWith('Memento › '));
    expect(memento).toMatchObject({ gruppo: expect.stringMatching(/^Memento › \d+\. Dedalo /) });
    expect(voci.findIndex((v) => v.gruppo.startsWith('Memento › '))).toBeGreaterThan(voci.findIndex((v) => v.chiave === passo.chiave));
    await nuovoPin('nota', 'Nota da un dedalo', [su(memento!.chiave, false)]);
  });

  it('una Persona dei Memento è «segnata» se è catturata, cioè registrata nel compendio; il vecchio stato e i pin non la segnano (rilievo F1)', async () => {
    const voce = prepared("SELECT p.chiave FROM punto_interesse p WHERE p.tipo = 'persona' AND p.area_chiave LIKE 'mementos-%' AND json_extract(p.dettagli_json, '$.maschera') = 'Pixie' LIMIT 1").pluck().get() as string;
    const pixie = prepared("SELECT id FROM persona WHERE nome = 'Pixie'").pluck().get() as number;
    // resta citabile nell'editor delle mappe
    expect(((await request(app).get('/api/condizioni/voci').expect(200)).body.data as VoceCitabileDto[]).some((v) => v.chiave === voce)).toBe(true);
    const dopo = await nuovoPin('nota', 'Dopo aver catturato Pixie', [su(voce, true)]);
    const prima = await nuovoPin('nota', 'Prima di catturare Pixie', [su(voce, false)]);
    const annidato = await nuovoPin('nota', 'Pixie o un passo', [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [su(voce, true), su((await nuovaVoce('Passo mai fatto')).chiave, true)] }]);
    expect([await stato(dopo), await stato(prima), await stato(annidato)]).toEqual(['bloccato', 'disponibile', 'bloccato']);
    expect((await leggi(dopo)).disponibilita!.requisiti[0]).toMatchObject({ stato: 'rosso', dettaglio: '«Ragazza seducente»: non catturata (non è nel compendio)' });
    // il vecchio stato della voce si rifiuta (azzerarlo resta possibile), e non cambia niente
    const vecchio = await request(app).put(`/api/partite/${partita}/punti`).send({ punto: voce, stato: 'ottenuto' });
    expect([vecchio.status, vecchio.body.error.code]).toEqual([400, 'cattura-nel-compendio']);
    await statoVoce(voce, null);
    expect(prepared('SELECT COUNT(*) FROM punto_partita WHERE punto_chiave = ?').pluck().get(voce)).toBe(0);
    expect(await stato(dopo)).toBe('bloccato');
    // registrata nel compendio: catturata, in ogni condizione; tolta, di nuovo no
    await request(app).put(`/api/partite/${partita}/compendio/${pixie}`).send({ registrata: true }).expect(200);
    expect([await stato(dopo), await stato(prima), await stato(annidato)]).toEqual(['disponibile', 'bloccato', 'disponibile']);
    expect((await leggi(dopo)).disponibilita!.requisiti[0]).toMatchObject({ stato: 'verde', dettaglio: '«Ragazza seducente»: catturata (nel compendio)' });
    // anche lo stato della voce nella scheda del Memento viene dal compendio
    const scheda = (await request(app).get(`/api/compendio/dungeon/mementos?partita=${partita}`).expect(200)).body.data as { aree: Array<{ punti: PuntoInteresseDto[] }> };
    expect(scheda.aree.flatMap((a) => a.punti).find((p) => p.chiave === voce)!.stato).toBe('ottenuto');
    await request(app).put(`/api/partite/${partita}/compendio/${pixie}`).send({ registrata: false }).expect(200);
    expect(await stato(dopo)).toBe('bloccato');
    // un pin non vi si collega, né dalla guida né come voce del pin
    const pin = await nuovoPin('nota', 'Pin da collegare a Pixie');
    const dallaGuida = await request(app).put(`/api/compendio/punti/${encodeURIComponent(voce)}/pin/${pin}`);
    expect([dallaGuida.status, dallaGuida.body.error.code]).toEqual([400, 'cattura-nel-compendio']);
    const comeVoce = await request(app).post(`/api/mappe/${mappa}/spilli`).send({ tipo: 'nota', nome: 'Pin di Pixie', x: 5, y: 5, riferimento: { tipo: 'punto', chiave: voce } });
    expect([comeVoce.status, comeVoce.body.error.code]).toEqual([400, 'cattura-nel-compendio']);
    // né come riferimento di una scheda della guida senza mappa (lo strato di prima, che tiene il riferimento «punto»)
    const scheda2 = prepared("SELECT id FROM spillo WHERE mappa_chiave IS NULL AND area_guida_chiave IS NOT NULL AND riferimento_tipo = 'punto' ORDER BY id LIMIT 1").pluck().get() as number;
    const comeRiferimento = await request(app).put(`/api/mappe/spilli/${scheda2}`).send({ riferimento: { tipo: 'punto', chiave: voce } });
    expect([comeRiferimento.status, comeRiferimento.body.error?.code]).toEqual([400, 'cattura-nel-compendio']);
    // un collegamento rimasto da prima (scritto nel file): segnare il pin non segna la Persona in `punto_partita`
    prepared('INSERT INTO spillo_voce (spillo_id, voce_chiave) VALUES (?, ?)').run(pin, voce);
    await request(app).put(`/api/partite/${partita}/spilli/${pin}`).send({ raccolto: true }).expect(200);
    expect(prepared('SELECT COUNT(*) FROM punto_partita WHERE punto_chiave = ?').pluck().get(voce)).toBe(0);
    prepared('DELETE FROM spillo_voce WHERE spillo_id = ?').run(pin);
    // una Persona di un Palazzo si segna come prima
    const diPalazzo = await nuovaVoce('Persona del Palazzo', 'persona');
    await statoVoce(diPalazzo.chiave, 'ottenuto');
  });
});
