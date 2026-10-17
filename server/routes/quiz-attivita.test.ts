// ============================================================
// Test API — la guida del quiz delle attività (migrazione 105): il quiz dei codici a barre del Triple Seven si legge
// dall'attività, accompagna le voci della giornata che registrano un turno di quel lavoro, si corregge e si ripristina
// (richiesta dell'utente, 2026-10-17)
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { QUIZ_TRIPLE_SEVEN } from '../db/migrations/105_quiz_delle_attivita.js';
import type { AttivitaTutteDto, AzionePercorsoDto, ElementoCatalogoDto, NegozioDettaglioDto, PercorsoGiornoDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();
const TRIPLE = 'lavoro-triple-seven';

/** Le attività e i lavori della guida. */
const attivita = async () => (await request(app).get('/api/compendio/attivita')).body.data as AttivitaTutteDto;
/** Le voci del giorno `data` del percorso. */
const voci = async (data: string) => ((await request(app).get(`/api/compendio/percorso/${data}`)).body.data as PercorsoGiornoDto).azioni;
/** La voce del giorno con quell'uid. */
const voce = async (data: string, uid: string) => (await voci(data)).find((v) => v.uid === uid)!;

describe('API — la guida del quiz delle attività', () => {
  beforeAll(() => {
    dbDiProva();
  });
  afterAll(() => closeDb());

  it('il Triple Seven ha la sua guida del quiz in italiano (12 prodotti, il 7, 17 e 27, tre esiti); gli altri lavori nessuna', async () => {
    const a = await attivita();
    const triple = a.lavori.find((l) => l.chiave === TRIPLE)!;
    expect(triple.quiz).toEqual(QUIZ_TRIPLE_SEVEN);
    expect(triple.quiz!.giorni).toEqual([7, 17, 27]);
    expect(triple.quiz!.voci).toHaveLength(12);
    // le due righe dall'abbinamento incerto: nome e risposta della lista dell'utente, i due nomi italiani possibili, la nota
    expect(triple.quiz!.voci.filter((v) => v.nota !== null).map((v) => [v.oggetto, v.altroNome, v.risposta])).toEqual([['Boy Chance', 'Black Box o Shonen Trip', 'Sul retro, sul logo dell’azienda'], ['Tokyo Food Tour', 'Black Box o Shonen Trip', 'Sul retro della copertina']]);
    expect(triple.quiz!.esiti.map((e) => e.premio)).toEqual(['7.400 ¥ e 3 punti Fascino', '5.800 ¥ e 2 punti Fascino', '3.500 ¥ e 2 punti Fascino']);
    for (const l of a.lavori.filter((x) => x.chiave !== TRIPLE)) expect(l.quiz, l.chiave).toBeNull();
    for (const x of a.attivita) expect(x.quiz, x.chiave).toBeNull();
  });

  it('le voci che registrano un turno del Triple Seven portano la guida, con «oggi» solo nei giorni del quiz; le altre no', async () => {
    // i turni della guida: 23 e 29 maggio, 12 agosto (nessuno nei giorni del quiz)
    for (const data of ['05-23', '05-29', '08-12']) {
      const turno = (await voci(data)).find((v) => v.produce.some((e) => e.tipo === 'turno' && e.attivita === TRIPLE))!;
      expect(turno.quiz, data).toEqual([{ attivita: TRIPLE, nome: 'Commesso al Triple Seven', quiz: QUIZ_TRIPLE_SEVEN, oggi: false }]);
    }
    // le voci senza turno né collegamento al lavoro non ne hanno
    expect((await voci('05-23')).filter((v) => !v.produce.some((e) => e.tipo === 'turno')).every((v) => v.quiz?.length === 0)).toBe(true);
    // un turno aggiunto il 27 maggio: è un giorno del quiz
    const nuova = (await request(app).post('/api/compendio/percorso/05-27/voci').send({ fascia: 'giorno', azione: 'Turno al Triple Seven', tipo: 'lavoro', produce: [{ tipo: 'turno', attivita: TRIPLE }] }).expect(201)).body.data as AzionePercorsoDto;
    expect(nuova.quiz).toEqual([{ attivita: TRIPLE, nome: 'Commesso al Triple Seven', quiz: QUIZ_TRIPLE_SEVEN, oggi: true }]);
    // collegata all'attività invece che con un turno: la guida c'è lo stesso, una volta sola anche con entrambi
    const collegata = (await request(app).put(`/api/compendio/percorso/voci/${nuova.uid}`).send({ riferimento: { tipo: 'attivita', chiave: TRIPLE }, produce: [] }).expect(200)).body.data as AzionePercorsoDto;
    expect(collegata.quiz).toHaveLength(1);
    const entrambi = (await request(app).put(`/api/compendio/percorso/voci/${nuova.uid}`).send({ riferimento: { tipo: 'attivita', chiave: TRIPLE }, produce: [{ tipo: 'turno', attivita: TRIPLE }] }).expect(200)).body.data as AzionePercorsoDto;
    expect(entrambi.quiz).toHaveLength(1);
    // un turno di un lavoro senza quiz: niente
    const altro = (await request(app).put(`/api/compendio/percorso/voci/${nuova.uid}`).send({ riferimento: null, produce: [{ tipo: 'turno', attivita: 'lavoro-rafflesia' }] }).expect(200)).body.data as AzionePercorsoDto;
    expect(altro.quiz).toEqual([]);
    await request(app).delete(`/api/compendio/percorso/voci/${nuova.uid}`).expect(204);
  });

  it('il quiz si corregge dal catalogo (normalizzato), si toglie, si ripristina con la riga della guida; un quiz non valido è 400', async () => {
    const url = `/api/catalogo/attivita/${TRIPLE}`;
    const prima = (await request(app).get(url)).body.data as ElementoCatalogoDto;
    expect(JSON.parse(prima.dati.quiz_json as string)).toEqual(QUIZ_TRIPLE_SEVEN);
    // la riga intera come la manda il modulo (i campi JSON letti, la stellina come vero/falso): lo schema parziale di zod 4
    // rimette i predefiniti ai campi assenti, quindi una correzione manda sempre tutti i campi
    const base: Record<string, unknown> = Object.fromEntries(Object.entries(prima.dati).map(([k, v]) => [k, k.endsWith('_json') && typeof v === 'string' ? JSON.parse(v) : k === 'verificato' ? v === 1 || v === true : v]));
    const { quiz_json: _quiz, ...senzaQuiz } = base;
    /** Salva la riga intera con i campi indicati al posto dei suoi. */
    const salva = (extra: Record<string, unknown>) => request(app).put(url).send({ ...base, ...extra });
    // giorni disordinati e doppi, una riga vuota, un altro nome uguale al nome: salvati puliti
    const corretto = {
      giorni: [27, 7, 7], spiegazione: '  Ricorda il codice.  ', domanda: 'Dov’è il codice?',
      voci: [{ oggetto: 'Panda Bread', altroNome: 'panda bread', risposta: 'Vicino alla coda' }, { oggetto: '', altroNome: null, risposta: 'niente' }],
      esiti: [{ esito: 'Perfetto', premio: '7.400 ¥' }, { esito: '', premio: 'x' }],
    };
    const r = await salva({ quiz_json: corretto }).expect(200);
    expect(JSON.parse((r.body.data as ElementoCatalogoDto).dati.quiz_json as string)).toEqual({
      giorni: [7, 27], spiegazione: 'Ricorda il codice.', domanda: 'Dov’è il codice?',
      voci: [{ oggetto: 'Panda Bread', altroNome: null, risposta: 'Vicino alla coda', nota: null }], esiti: [{ esito: 'Perfetto', premio: '7.400 ¥' }],
    });
    const triple = (await attivita()).lavori.find((l) => l.chiave === TRIPLE)!;
    expect(triple.quiz!.voci).toHaveLength(1);
    expect((await voci('05-23')).find((v) => v.produce.some((e) => e.tipo === 'turno' && e.attivita === TRIPLE))!.quiz![0].quiz.voci).toHaveLength(1);
    // non valido: giorno 32, troppi caratteri
    expect((await salva({ quiz_json: { ...corretto, giorni: [32] } })).status).toBe(400);
    expect((await salva({ quiz_json: { ...corretto, domanda: 'x'.repeat(301) } })).status).toBe(400);
    // toglierlo: null, e un quiz senza domanda né elementi vale «nessun quiz»
    await salva({ quiz_json: null }).expect(200);
    expect((await attivita()).lavori.find((l) => l.chiave === TRIPLE)!.quiz).toBeNull();
    await salva({ quiz_json: { giorni: [7], voci: [], esiti: [] } }).expect(200);
    expect(prepared('SELECT quiz_json FROM attivita WHERE chiave = ?').pluck().get(TRIPLE)).toBeNull();
    expect((await voci('05-23')).find((v) => v.produce.some((e) => e.tipo === 'turno' && e.attivita === TRIPLE))!.quiz).toEqual([]);
    // un'altra correzione non tocca il quiz se non lo manda
    await salva({ quiz_json: corretto }).expect(200);
    await request(app).put(url).send({ ...senzaQuiz, nome: 'Commesso al Triple Seven' }).expect(200);
    expect((await attivita()).lavori.find((l) => l.chiave === TRIPLE)!.quiz!.giorni).toEqual([7, 27]);
    // ripristinare la riga della guida riporta il quiz originale
    expect((await request(app).delete(url).expect(200)).body.data.esito).toBe('ripristinata');
    expect((await attivita()).lavori.find((l) => l.chiave === TRIPLE)!.quiz).toEqual(QUIZ_TRIPLE_SEVEN);
  });

  it('la pagina del negozio porta la guida dei lavori della sua sede, con «oggi» dal giorno della partita', async () => {
    /** Il dettaglio del negozio, con la partita se indicata. */
    const negozio = async (chiave: string, partita?: number) => (await request(app).get(`/api/compendio/negozi/${chiave}${partita ? `?partita=${partita}` : ''}`)).body.data as NegozioDettaglioDto;
    expect((await negozio('triple-seven')).quiz).toEqual([{ attivita: TRIPLE, nome: 'Commesso al Triple Seven', quiz: QUIZ_TRIPLE_SEVEN, oggi: false }]);
    // un negozio di un'altra sede: niente
    expect((await negozio('untouchable')).quiz).toEqual([]);
    const partita = ((await request(app).post('/api/partite').send({ nome: 'Quiz al negozio' })).body.data as { id: number }).id;
    prepared("UPDATE partita SET data_gioco = '05-17' WHERE id = ?").run(partita);
    expect((await negozio('triple-seven', partita)).quiz[0].oggi).toBe(true);
    prepared("UPDATE partita SET data_gioco = '05-18' WHERE id = ?").run(partita);
    expect((await negozio('triple-seven', partita)).quiz[0].oggi).toBe(false);
  });

  it('un lavoro nascosto dal catalogo non porta la guida nelle voci né nel negozio', async () => {
    await request(app).put(`/api/catalogo/attivita/${TRIPLE}/nascosta`).send({ nascosta: true }).expect(200);
    expect((await voci('05-23')).find((v) => v.produce.some((e) => e.tipo === 'turno' && e.attivita === TRIPLE))!.quiz).toEqual([]);
    expect(((await request(app).get('/api/compendio/negozi/triple-seven')).body.data as NegozioDettaglioDto).quiz).toEqual([]);
    await request(app).put(`/api/catalogo/attivita/${TRIPLE}/nascosta`).send({ nascosta: false }).expect(200);
    expect((await voce('05-23', (await voci('05-23')).find((v) => v.produce.some((e) => e.tipo === 'turno'))!.uid)).quiz).toHaveLength(1);
    // il ripristino del nascosto: la riga torna della guida
    await request(app).delete(`/api/catalogo/attivita/${TRIPLE}`).expect(200);
  });
});
