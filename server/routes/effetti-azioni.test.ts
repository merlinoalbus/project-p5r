// ============================================================
// Test API — la spunta di un'azione della guida applica ciò che l'azione produce, non il testo delle note
// ============================================================
//
// Segnalato dall'utente (2026-09-30): dopo aver finito Zorro, il fuorilegge la Gentilezza è rimasta
// ferma; «Sbloccare il lavoro da fioraio Rafflesia» dava la Gentilezza del turno. La spunta leggeva
// i punti dalle note e dava per letto ogni libro collegato: prenderlo in prestito lo finiva, e
// «restituire Zorro e prendere la Ballerina» finiva la Ballerina. Ora ogni azione dichiara che cosa
// produce (`produce`): Doti, letture («almeno» n sessioni, mai indietro), turni di un lavoro.
// ============================================================

import request from 'supertest';
import { closeDb, getDb, initDb, prepared } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { createApp } from '../bootstrap.js';
import { contestoConversione, effettiDellAzione } from '../db/conversioneEffettiAzione.js';
import { utente007 } from '../db/migrazioniUtente/007_effetti_delle_azioni.js';
import { orfaniPartite } from '../services/pacchettoGiocoService.js';
import type { AzionePercorsoDto, DoteSocialePartitaDto, PercorsoGiornoDto, ProgressiPartitaDto } from '../../shared/types.js';

const app = createApp();

describe('API — effetti strutturati delle azioni della guida', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    caricaPacchetto(db);
  });
  afterAll(() => closeDb());

  const nuovaPartita = async (nome: string, data: string) => {
    const id = ((await request(app).post('/api/partite').send({ nome })).body.data as { id: number }).id;
    await request(app).put(`/api/partite/${id}/giorno`).send({ data }).expect(200);
    return id;
  };
  const spunta = (p: number, data: string, indice: number, fatta = true) => request(app).put(`/api/partite/${p}/percorso`).send({ data, indice, fatta });
  const dote = async (p: number, chiave: string) => ((await request(app).get(`/api/partite/${p}/doti`)).body.data as DoteSocialePartitaDto[]).find((d) => d.chiave === chiave)!.punti;
  const libro = (p: number, chiave: string) => ({
    avanzamento: (prepared('SELECT avanzamento FROM progresso_libro_partita WHERE partita_id = ? AND libro_chiave = ?').get(p, chiave) as { avanzamento: number } | undefined)?.avanzamento ?? 0,
    letto: !!prepared("SELECT 1 FROM lettura_partita WHERE partita_id = ? AND tipo = 'libro' AND chiave = ?").get(p, chiave),
  });
  const azione = async (data: string, indice: number) => ((await request(app).get(`/api/compendio/percorso/${data}`)).body.data as PercorsoGiornoDto).azioni.find((a) => a.indice === indice)!;

  it('la guida dichiara gli effetti delle azioni dei libri secondo il loro senso', async () => {
    expect((await azione('04-18', 0)).produce).toEqual([]); // prendere in prestito La leggenda dei pirati
    expect((await azione('04-19', 5)).produce).toEqual([{ tipo: 'lettura', categoria: 'libro', chiave: 'la-leggenda-dei-pirati', almeno: 1 }]);
    expect((await azione('04-20', 0)).produce).toEqual([{ tipo: 'lettura', categoria: 'libro', chiave: 'la-leggenda-dei-pirati', almeno: null }]);
    expect((await azione('04-25', 1)).produce).toEqual([{ tipo: 'lettura', categoria: 'libro', chiave: 'zorro-il-fuorilegge', almeno: null }]);
    expect((await azione('04-25', 4)).produce).toEqual([{ tipo: 'dote', dote: 'fascino', note: 3 }]); // bagno: la guida scrive +3
    expect((await azione('04-26', 0)).produce).toEqual([{ tipo: 'turno', attivita: 'lavoro-rafflesia' }]);
    expect((await azione('05-08', 4)).produce).toEqual([{ tipo: 'turno', attivita: 'lavoro-ore-no-beko', doti: [{ dote: 'perizia', note: 3 }] }]);
  });

  it('Zorro: il prestito non legge, «(1/2)» porta a una sessione, «restituire Zorro» lo finisce e dà la Gentilezza (+7), non la Ballerina', async () => {
    const p = await nuovaPartita('Zorro', '04-25');
    await spunta(p, '04-18', 0).expect(200);
    expect(libro(p, 'la-leggenda-dei-pirati')).toEqual({ avanzamento: 0, letto: false });
    await spunta(p, '04-19', 5).expect(200);
    expect(libro(p, 'la-leggenda-dei-pirati')).toEqual({ avanzamento: 1, letto: false });
    expect(await dote(p, 'coraggio')).toBe(0);
    await spunta(p, '04-20', 0).expect(200);
    expect(libro(p, 'la-leggenda-dei-pirati')).toEqual({ avanzamento: 2, letto: true });
    expect(await dote(p, 'coraggio')).toBe(7);
    expect(libro(p, 'zorro-il-fuorilegge')).toEqual({ avanzamento: 0, letto: false });

    await spunta(p, '04-24', 3).expect(200);
    expect(libro(p, 'zorro-il-fuorilegge')).toEqual({ avanzamento: 1, letto: false });
    const r = (await spunta(p, '04-25', 1).expect(200)).body.data as AzionePercorsoDto;
    // la spunta dice anche che cosa ha dato il libro: il bonus che l'utente non vedeva
    expect(r.effetti?.letture).toEqual([{ categoria: 'libro', chiave: 'zorro-il-fuorilegge', nome: 'Zorro, il fuorilegge', prima: 1, dopo: 2, doti: [{ chiave: 'gentilezza', nome: 'Gentilezza', delta: 7 }] }]);
    expect(await dote(p, 'gentilezza')).toBe(7);
    expect(libro(p, 'la-ballerina-seducente')).toEqual({ avanzamento: 0, letto: false });
    expect(await dote(p, 'fascino')).toBe(0);

    // togliere la spunta non disfa la lettura (si disfa dalla pagina dei Libri), e rispuntare non dà punti due volte
    await spunta(p, '04-25', 1, false).expect(200);
    expect(await dote(p, 'gentilezza')).toBe(7);
    await spunta(p, '04-25', 1).expect(200);
    expect(await dote(p, 'gentilezza')).toBe(7);
  });

  it('una sola sorgente: Zorro finito dalla pagina Libri, poi la spunta non dà altro; e viceversa', async () => {
    const p = await nuovaPartita('Zorro dai Libri', '04-25');
    await request(app).put(`/api/partite/${p}/letture`).send({ tipo: 'libro', chiave: 'zorro-il-fuorilegge', fatto: true }).expect(200);
    expect(await dote(p, 'gentilezza')).toBe(7);
    const r = (await spunta(p, '04-25', 1).expect(200)).body.data as AzionePercorsoDto;
    expect(r.effetti?.letture).toEqual([{ categoria: 'libro', chiave: 'zorro-il-fuorilegge', nome: 'Zorro, il fuorilegge', prima: 2, dopo: 2 }]);
    expect(await dote(p, 'gentilezza')).toBe(7);

    const q = await nuovaPartita('Zorro dalla spunta', '04-25');
    await spunta(q, '04-25', 1).expect(200);
    await request(app).put(`/api/partite/${q}/letture`).send({ tipo: 'libro', chiave: 'zorro-il-fuorilegge', fatto: true }).expect(200);
    expect(await dote(q, 'gentilezza')).toBe(7);
  });

  it('un libro non ancora disponibile ferma la spunta con il suo motivo, senza lasciarla a metà', async () => {
    const p = await nuovaPartita('Troppo presto', '04-12');
    const r = await spunta(p, '04-25', 1);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('lettura-non-disponibile');
    expect(prepared('SELECT COUNT(*) AS n FROM azione_partita WHERE partita_id = ?').get(p)).toEqual({ n: 0 });
  });

  it('il turno di un lavoro: la spunta registra il turno con le Doti del lavoro, togliendola si toglie il turno', async () => {
    const p = await nuovaPartita('Rafflesia', '04-26');
    const volte = () => (prepared("SELECT volte FROM attivita_svolta_partita WHERE partita_id = ? AND attivita_chiave = 'lavoro-rafflesia'").get(p) as { volte: number } | undefined)?.volte ?? 0;
    const r = (await spunta(p, '04-26', 0).expect(200)).body.data as AzionePercorsoDto;
    expect(r.effetti?.turni).toEqual([{ attivita: 'lavoro-rafflesia', nome: expect.any(String), ordine: 1, doti: [{ chiave: 'gentilezza', nome: 'Gentilezza', delta: 3, note: 2 }] }]);
    expect(r.effetti?.doti).toEqual([]);
    expect(volte()).toBe(1);
    expect(await dote(p, 'gentilezza')).toBe(3);
    await spunta(p, '04-26', 0, false).expect(200);
    expect(volte()).toBe(0);
    expect(await dote(p, 'gentilezza')).toBe(0);
    expect(prepared("SELECT COUNT(*) AS n FROM effetto_lettura_partita WHERE partita_id = ? AND tipo = 'attivita'").get(p)).toEqual({ n: 0 });
  });

  it('un turno con Doti proprie le usa al posto di quelle del lavoro (secondo turno al Beef Bowl Shop: Perizia, 3 note)', async () => {
    const p = await nuovaPartita('Beef Bowl', '05-08');
    await spunta(p, '05-06', 7).expect(200);
    expect(await dote(p, 'perizia')).toBe(3);
    await spunta(p, '05-08', 4).expect(200);
    expect(await dote(p, 'perizia')).toBe(8);
    // si toglie il primo turno: il secondo resta con i suoi punti
    await spunta(p, '05-06', 7, false).expect(200);
    expect(await dote(p, 'perizia')).toBe(5);
    expect(prepared("SELECT volte FROM attivita_svolta_partita WHERE partita_id = ? AND attivita_chiave = 'lavoro-ore-no-beko'").get(p)).toEqual({ volte: 1 });
  });

  it('la conversione legge i titoli solo prima del «;»; al cinema ogni azione è «una visione»', () => {
    const ctx = contestoConversione(getDb());
    const trova = (data: string, indice: number) => ctx.successive.find((s) => s.data === data && s.indice === indice)!;
    const rivelazioni = trova('10-31', 0);
    expect(effettiDellAzione(rivelazioni.azione, rivelazioni, ctx)).toEqual([{ tipo: 'lettura', categoria: 'libro', chiave: 'rivelazioni-eroiche', almeno: null }]);
    const cinema = trova('07-31', 2);
    expect(effettiDellAzione(cinema.azione, cinema, ctx)).toEqual([{ tipo: 'lettura', categoria: 'film', chiave: 'cinema-l-amore-chissa', almeno: null }]);
    const primaSerata = trova('07-18', 0);
    expect(effettiDellAzione(primaSerata.azione, primaSerata, ctx)).toEqual([{ tipo: 'lettura', categoria: 'film', chiave: 'dvd-the-running-dead', almeno: 1 }]);
    // un'azione dell'utente senza posto nella guida: le Doti dal testo delle note
    expect(effettiDellAzione({ azione: 'Bagno', tipo: 'altro', riferimento: null, note: 'Fascino +2' }, null, ctx)).toEqual([{ tipo: 'dote', dote: 'fascino', note: 2 }]);
  });

  it('al cinema una spunta è una visione: saltare la prima visita non regala una visione, togliere e rimettere non ne aggiunge', async () => {
    const p = await nuovaPartita('Cinema', '07-31');
    const visioni = () => (prepared("SELECT avanzamento FROM progresso_film_partita WHERE partita_id = ? AND film_chiave = 'cinema-l-amore-chissa'").get(p) as { avanzamento: number } | undefined)?.avanzamento ?? 0;
    // la seconda visita della guida, senza la prima: una visione, con i punti della prima (tre note, 5 punti)
    const r = (await spunta(p, '07-31', 2).expect(200)).body.data as AzionePercorsoDto;
    expect(visioni()).toBe(1);
    expect(await dote(p, 'fascino')).toBe(5);
    expect(r.effetti?.letture).toEqual([expect.objectContaining({ prima: 0, dopo: 1, visione: true })]);
    // poi la prima visita: la seconda visione, con la voce «dalla seconda volta in poi» (una nota, 2 punti)
    await spunta(p, '07-05', 0).expect(200);
    expect(visioni()).toBe(2);
    expect(await dote(p, 'fascino')).toBe(7);
    // togliere e rimettere la spunta non conta una terza visione
    await spunta(p, '07-05', 0, false).expect(200);
    await spunta(p, '07-05', 0).expect(200);
    expect(visioni()).toBe(2);
    expect(await dote(p, 'fascino')).toBe(7);
  });

  it('spunta e contatore dei turni restano coerenti: un turno tolto dal contatore non si toglie una seconda volta', async () => {
    const p = await nuovaPartita('Turni', '05-08');
    const volte = () => (prepared("SELECT volte FROM attivita_svolta_partita WHERE partita_id = ? AND attivita_chiave = 'lavoro-ore-no-beko'").get(p) as { volte: number } | undefined)?.volte ?? 0;
    await spunta(p, '05-06', 7).expect(200); // turno 1: Perizia, 2 note = 3
    await spunta(p, '05-08', 4).expect(200); // turno 2: Perizia, 3 note = 5
    expect(volte()).toBe(2);
    expect(await dote(p, 'perizia')).toBe(8);
    // il contatore scende a 1: toglie l'ultimo turno registrato con i suoi punti
    await request(app).put(`/api/condizioni/partite/${p}/attivita/lavoro-ore-no-beko`).send({ volte: 1 }).expect(200);
    expect(volte()).toBe(1);
    expect(await dote(p, 'perizia')).toBe(3);
    // la spunta del secondo turno non ha più un turno da togliere: il contatore resta a 1
    await spunta(p, '05-08', 4, false).expect(200);
    expect(volte()).toBe(1);
    expect(await dote(p, 'perizia')).toBe(3);
    await spunta(p, '05-06', 7, false).expect(200);
    expect(volte()).toBe(0);
    expect(await dote(p, 'perizia')).toBe(0);
    expect(prepared('SELECT COUNT(*) AS n FROM turno_partita WHERE partita_id = ?').get(p)).toEqual({ n: 0 });
  });

  it('il contatore dà e restituisce i punti di ogni turno, anche accanto a turni contati prima del registro', async () => {
    const p = await nuovaPartita('Contatore', '04-26');
    const contatore = (volte: number) => request(app).put(`/api/condizioni/partite/${p}/attivita/lavoro-rafflesia`).send({ volte }).expect(200);
    // la risposta dice di quanto sono cambiate le Doti e che cosa dà un turno
    const r = (await contatore(2)).body.data as ProgressiPartitaDto;
    expect(r.cambioDoti).toEqual([{ chiave: 'gentilezza', nome: 'Gentilezza', delta: 6 }]);
    expect(r.attivita.find((a) => a.chiave === 'lavoro-rafflesia')).toMatchObject({ volte: 2, effettiTurno: ['1° turno: Gentilezza ♪♪', 'Dal 2° turno: Gentilezza ♪♪'] });
    expect(await dote(p, 'gentilezza')).toBe(6);
    expect(((await contatore(2)).body.data as ProgressiPartitaDto).cambioDoti).toEqual([]);
    await contatore(0);
    expect(await dote(p, 'gentilezza')).toBe(0);
    // due turni segnati prima che esistesse il registro: nessun punto da restituire, ma si contano
    prepared("INSERT INTO attivita_svolta_partita (partita_id, attivita_chiave, volte, updated_at) VALUES (?, 'lavoro-rafflesia', 2, 'x') ON CONFLICT(partita_id, attivita_chiave) DO UPDATE SET volte = 2").run(p);
    await contatore(3);
    expect(prepared("SELECT ordine FROM turno_partita WHERE partita_id = ? AND attivita_chiave = 'lavoro-rafflesia'").all(p)).toEqual([{ ordine: 3 }]);
    expect(await dote(p, 'gentilezza')).toBe(3);
    await contatore(1);
    expect(await dote(p, 'gentilezza')).toBe(0);
    expect(prepared("SELECT volte FROM attivita_svolta_partita WHERE partita_id = ? AND attivita_chiave = 'lavoro-rafflesia'").get(p)).toEqual({ volte: 1 });
    // un'attività che non si conta per volte non ha turni
    expect((await request(app).put(`/api/condizioni/partite/${p}/attivita/studio-leblanc`).send({ volte: 1 })).status).toBe(400);
  });

  it('turni e punti di un\'attività che il pacchetto non ha più sono orfani segnalati', async () => {
    const p = await nuovaPartita('Orfani', '04-26');
    prepared("INSERT INTO turno_partita (partita_id, attivita_chiave, ordine, created_at) VALUES (?, 'lavoro-che-non-esiste', 1, 'x')").run(p);
    prepared("INSERT INTO effetto_lettura_partita (partita_id, tipo, chiave, ordine, dote_chiave, punti, note, updated_at) VALUES (?, 'attivita', 'lavoro-che-non-esiste', 1, 'gentilezza', 3, 2, 'x')").run(p);
    const orfani = orfaniPartite(getDb());
    expect(orfani).toEqual(expect.arrayContaining([
      expect.objectContaining({ tabella: 'effetto_lettura_partita', colonna: 'chiave', entita: 'attività', esempi: ['lavoro-che-non-esiste'] }),
      expect.objectContaining({ tabella: 'turno_partita', colonna: 'attivita_chiave', entita: 'attività', esempi: ['lavoro-che-non-esiste'] }),
    ]));
    prepared('DELETE FROM turno_partita WHERE partita_id = ?').run(p);
    prepared("DELETE FROM effetto_lettura_partita WHERE partita_id = ? AND chiave = 'lavoro-che-non-esiste'").run(p);
  });

  it('migrazione utente 007: una correzione che cambiava le note tiene i punti che quelle note davano', async () => {
    const originale = (JSON.parse((prepared("SELECT azioni_json FROM giorno_percorso WHERE data = '04-12'").get() as { azioni_json: string }).azioni_json) as Array<Record<string, unknown>>)[0];
    const adesso = 'x';
    // com'era salvata prima della 086: solo la nota corretta, e l'originale senza effetti
    const { produce: _senza, ...originaleVecchio } = originale;
    prepared("INSERT INTO correzione_azione_guida (data, indice, originale_json, modifiche_json, nascosta, created_at, updated_at) VALUES ('04-12', 0, ?, ?, 0, ?, ?)")
      .run(JSON.stringify(originaleVecchio), JSON.stringify({ note: 'Coraggio +2' }), adesso, adesso);
    // e una che cambiava solo la fascia: resta com'è
    prepared("INSERT INTO correzione_azione_guida (data, indice, originale_json, modifiche_json, nascosta, created_at, updated_at) VALUES ('04-12', 1, ?, ?, 0, ?, ?)")
      .run(JSON.stringify((JSON.parse((prepared("SELECT azioni_json FROM giorno_percorso WHERE data = '04-12'").get() as { azioni_json: string }).azioni_json) as unknown[])[1]), JSON.stringify({ fascia: 'sera' }), adesso, adesso);
    utente007.up(getDb());
    expect(JSON.parse((prepared("SELECT modifiche_json FROM correzione_azione_guida WHERE data = '04-12' AND indice = 0").get() as { modifiche_json: string }).modifiche_json))
      .toEqual({ note: 'Coraggio +2', produce: [{ tipo: 'dote', dote: 'coraggio', note: 2 }] });
    expect(JSON.parse((prepared("SELECT modifiche_json FROM correzione_azione_guida WHERE data = '04-12' AND indice = 1").get() as { modifiche_json: string }).modifiche_json)).toEqual({ fascia: 'sera' });
    // la spunta applica gli effetti della correzione
    const p = await nuovaPartita('Correzione convertita', '04-12');
    const r = (await spunta(p, '04-12', 0).expect(200)).body.data as AzionePercorsoDto;
    expect(r.produce).toEqual([{ tipo: 'dote', dote: 'coraggio', note: 2 }]);
    expect(await dote(p, 'coraggio')).toBe(3);
    expect(await dote(p, 'conoscenza')).toBe(0);
    prepared('DELETE FROM correzione_azione_guida').run();
  });
});
