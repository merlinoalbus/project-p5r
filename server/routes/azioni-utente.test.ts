// ============================================================
// Test API — le voci aggiunte dall'utente sono azioni come quelle della guida
// ============================================================
//
// Richiesta dell'utente (2026-09-30): «gli eventi in guida che mi hai permesso di aggiungere non possono minimamente essere
// classificati come gli altri né collegati ad altri elementi (Confidenti, Libri, Doti Sociali, ecc.)». Una voce aggiunta ha
// tipo, collegamento verificato, rango atteso ed effetti della spunta; la spunta li applica con lo stesso motore della guida
// (le note del Confidente comprese) e li annulla togliendola. Dallo stesso giorno la voce aggiunta è canone (file di gioco).
// ============================================================

import request from 'supertest';
import { closeDb, getDb, initDb, prepared } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { createApp } from '../bootstrap.js';
import { utente008 } from '../db/migrazioniUtente/008_effetti_delle_azioni_utente.js';
import { DDL_UTENTE_STORICHE } from '../db/schemaUtente.js';
import type { AzionePercorsoDto, DoteSocialePartitaDto, PercorsoGiornoDto } from '../../shared/types.js';

const app = createApp();

describe('API — voci aggiunte dall\'utente come azioni della guida', () => {
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
  const crea = (data: string, corpo: object) => request(app).post(`/api/compendio/percorso/${data}/voci`).send(corpo);
  const spunta = (uid: string, partita: number, fatta: boolean, noteRisposta?: 1 | 2 | 3) => request(app).put(`/api/partite/${partita}/percorso`).send({ uid, fatta, ...(noteRisposta ? { noteRisposta } : {}) });
  const elimina = (uid: string) => request(app).delete(`/api/compendio/percorso/voci/${uid}`);
  const dote = async (p: number, chiave: string) => ((await request(app).get(`/api/partite/${p}/doti`)).body.data as DoteSocialePartitaDto[]).find((d) => d.chiave === chiave)!.punti;

  it('si crea classificata e collegata: il nome lo dà il server, gli effetti si leggono in parole; un collegamento a vuoto no', async () => {
    const r = await crea('04-25', { azione: 'Clinica Takemi: test clinico', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, rangoAtteso: 2, produce: [{ tipo: 'dote', dote: 'coraggio', note: 1 }] });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({
      tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, riferimentoTesto: 'Tae Takemi - Morte', rangoAtteso: 2,
      produce: [{ tipo: 'dote', dote: 'coraggio', note: 1 }], produceTesto: ['Coraggio, 1 nota'], fatta: false, effetti: null,
    });
    expect((await crea('04-25', { azione: 'x', riferimento: { tipo: 'confidente', chiave: 'nessuno' } })).body.error.code).toBe('riferimento-inesistente');
    expect((await crea('04-25', { azione: 'x', tipo: 'boh' })).status).toBe(400);
    expect((await crea('04-25', { azione: 'x', produce: [{ tipo: 'turno', attivita: 'studio-leblanc' }] })).body.error.code).toBe('effetto-non-valido');
    await elimina((r.body.data as AzionePercorsoDto).uid).expect(204);
  });

  it('la spunta dice le Doti (senza toccarle), applica le note del Confidente e le annulla togliendola', async () => {
    const p = await nuovaPartita('Takemi mia', '04-25');
    await request(app).put(`/api/partite/${p}/confidenti/takemi`).send({ forza: true, rango: 1 }).expect(200);
    // il rango 1 dalla pagina è già un incontro (la Dote a ogni incontro, voce 5): si misura da qui
    const base = await dote(p, 'coraggio');
    const a = (await crea('04-25', { azione: 'Clinica Takemi', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, rangoAtteso: 2, produce: [{ tipo: 'dote', dote: 'coraggio', note: 1 }] })).body.data as AzionePercorsoDto;
    const r = (await spunta(a.uid, p, true, 2).expect(200)).body.data as AzionePercorsoDto;
    expect(r.fatta).toBe(true);
    // l'effetto dichiarato dell'azione, l'incontro verso il rango 2 (passaggio) e le note della risposta
    expect(r.effetti).toMatchObject({
      doti: [{ chiave: 'coraggio', delta: 2, note: 1 }], confidente: { chiave: 'takemi', noteRisposta: 2 },
      incontro: { verso: 2, passaggio: true, giaContato: false, doti: [{ chiave: 'coraggio', delta: 2, note: 1 }] },
    });
    // le Doti si segnano a mano: gli effetti le dicono, i punti delle Doti non si muovono
    expect(await dote(p, 'coraggio')).toBe(base);
    const puntiTakemi = async () => ((await request(app).get(`/api/partite/${p}/confidenti`)).body.data as Array<{ chiave: string; punti: number }>).find((c) => c.chiave === 'takemi')!.punti;
    expect(await puntiTakemi()).toBeGreaterThan(0);
    // una seconda spunta non applica niente due volte
    await spunta(a.uid, p, true, 2).expect(200);
    expect(await dote(p, 'coraggio')).toBe(base);
    await spunta(a.uid, p, false).expect(200);
    expect(await dote(p, 'coraggio')).toBe(base);
    expect(await puntiTakemi()).toBe(0);
    await elimina(a.uid).expect(204);
    // lo storico dice che cosa ha dato la spunta
    const storico = (await request(app).get(`/api/partite/${p}/storico`)).body.data as { eventi: Array<{ tipo: string; dettaglio: string }> };
    expect(storico.eventi.some((e) => e.tipo === 'percorso' && /Tae Takemi/.test(e.dettaglio) && /Coraggio \+2/.test(e.dettaglio))).toBe(true);
  });

  it('una voce spuntata con effetti non si elimina: prima si toglie la spunta (in ogni partita, detta per nome); senza effetti sì', async () => {
    const p = await nuovaPartita('Elimina con effetti', '04-25');
    const q = await nuovaPartita('Senza effetti', '04-25');
    await request(app).put(`/api/partite/${p}/confidenti/takemi`).send({ forza: true, rango: 1 }).expect(200);
    const puntiTakemi = async () => ((await request(app).get(`/api/partite/${p}/confidenti`)).body.data as Array<{ chiave: string; punti: number }>).find((c) => c.chiave === 'takemi')!.punti;
    const prima = await puntiTakemi();
    const a = (await crea('04-25', { azione: 'Clinica Takemi', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, rangoAtteso: 2 })).body.data as AzionePercorsoDto;
    await spunta(a.uid, p, true, 2).expect(200);
    expect(await puntiTakemi()).toBeGreaterThan(prima);
    // spuntata anche in un'altra partita, senza effetti (nessuna voce del Confidente sbloccata lì non registra punti)
    const b = (await crea('04-25', { azione: 'Comprare il pane' })).body.data as AzionePercorsoDto;
    await spunta(b.uid, q, true).expect(200);
    const rifiuto = await elimina(a.uid);
    expect(rifiuto.status).toBe(409);
    expect(rifiuto.body.error).toMatchObject({ code: 'voce-con-effetti', message: expect.stringMatching(/in una partita \(«Elimina con effetti»\)/) });
    expect((await request(app).get('/api/compendio/percorso/04-25')).body.data.azioni.some((x: AzionePercorsoDto) => x.uid === a.uid)).toBe(true);
    // tolta la spunta, gli effetti tornano indietro e la voce si elimina
    await spunta(a.uid, p, false).expect(200);
    expect(await puntiTakemi()).toBe(prima);
    await elimina(a.uid).expect(204);
    // una spunta senza effetti se ne va con la voce
    await elimina(b.uid).expect(204);
    expect(prepared('SELECT COUNT(*) AS n FROM spunta_voce_partita WHERE voce_uid IN (?, ?)').get(a.uid, b.uid)).toEqual({ n: 0 });
  });

  it('una lettura e un turno funzionano come nella guida (Zorro +7, turno Rafflesia), il turno si toglie con la spunta', async () => {
    const p = await nuovaPartita('Letture mie', '04-26');
    const zorro = (await crea('04-25', { azione: 'Finire Zorro', tipo: 'libro', riferimento: { tipo: 'libro', chiave: 'zorro-il-fuorilegge' }, produce: [{ tipo: 'lettura', categoria: 'libro', chiave: 'zorro-il-fuorilegge', almeno: null }] })).body.data as AzionePercorsoDto;
    expect(zorro.produceTesto).toEqual(['Zorro, il fuorilegge: completato']);
    const letto = (await spunta(zorro.uid, p, true).expect(200)).body.data as AzionePercorsoDto;
    expect(letto.effetti?.letture).toEqual([expect.objectContaining({ chiave: 'zorro-il-fuorilegge', doti: [{ chiave: 'gentilezza', nome: 'Gentilezza', delta: 7 }] })]);
    expect(await dote(p, 'gentilezza')).toBe(0);
    const turno = (await crea('04-26', { azione: 'Svolgere il primo giorno di lavoro dal Fioraio', tipo: 'lavoro', riferimento: { tipo: 'attivita', chiave: 'lavoro-rafflesia' }, produce: [{ tipo: 'turno', attivita: 'lavoro-rafflesia' }] })).body.data as AzionePercorsoDto;
    const r = (await spunta(turno.uid, p, true).expect(200)).body.data as AzionePercorsoDto;
    expect(r.effetti?.turni).toEqual([expect.objectContaining({ attivita: 'lavoro-rafflesia', ordine: 1, doti: [expect.objectContaining({ chiave: 'gentilezza', delta: 3 })] })]);
    await spunta(turno.uid, p, false).expect(200);
    expect(await dote(p, 'gentilezza')).toBe(0);
    expect(prepared("SELECT volte FROM attivita_svolta_partita WHERE partita_id = ? AND attivita_chiave = 'lavoro-rafflesia'").get(p)).toEqual({ volte: 0 });
    await spunta(zorro.uid, p, false).expect(200);
    await elimina(zorro.uid).expect(204);
    await elimina(turno.uid).expect(204);
  });

  it('nella scheda del giorno la voce aggiunta ha stato e mappa come le azioni della guida', async () => {
    const p = await nuovaPartita('Stato mio', '04-25');
    const a = (await crea('04-25', { azione: 'Clinica Takemi', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, rangoAtteso: 3 })).body.data as AzionePercorsoDto;
    const g = (await request(app).get(`/api/compendio/percorso/04-25?partita=${p}`)).body.data as PercorsoGiornoDto;
    const mia = g.azioni.find((x) => x.uid === a.uid)!;
    expect(mia.stato).not.toBeNull();
    expect(mia.stato!.tipo).toBe('bloccata');
    // la guida del giorno ha un'azione su Takemi: la mappa del suo luogo è la stessa
    const guida = g.azioni.find((x) => x.uid !== a.uid && x.riferimento?.chiave === 'takemi')!;
    expect(mia.mappa).toEqual(guida.mappa);
    await elimina(a.uid).expect(204);
  });

  it('al cinema una voce aggiunta conta la visione insieme alle spunte della guida', async () => {
    const p = await nuovaPartita('Cinema mio', '07-31');
    const prima = ((await request(app).get('/api/compendio/percorso/07-05')).body.data as PercorsoGiornoDto).azioni[0];
    await spunta(prima.uid, p, true).expect(200);
    const a = (await crea('07-31', { azione: 'Rivedere L\'amore chissà', tipo: 'dote', riferimento: { tipo: 'film', chiave: 'cinema-l-amore-chissa' }, produce: [{ tipo: 'lettura', categoria: 'film', chiave: 'cinema-l-amore-chissa', almeno: null }] })).body.data as AzionePercorsoDto;
    await spunta(a.uid, p, true).expect(200);
    expect(prepared("SELECT avanzamento FROM progresso_film_partita WHERE partita_id = ? AND film_chiave = 'cinema-l-amore-chissa'").get(p)).toEqual({ avanzamento: 2 });
  });

  it('modificare la nota di una voce aggiunta riesce anche se il libro collegato è stato nascosto dal catalogo', async () => {
    const a = (await crea('04-25', { azione: 'Zorro', tipo: 'libro', riferimento: { tipo: 'libro', chiave: 'zorro-il-fuorilegge' }, produce: [{ tipo: 'lettura', categoria: 'libro', chiave: 'zorro-il-fuorilegge', almeno: null }] })).body.data as AzionePercorsoDto;
    prepared("UPDATE libro SET nascosto = 1 WHERE chiave = 'zorro-il-fuorilegge'").run();
    try {
      const r = await request(app).put(`/api/compendio/percorso/voci/${a.uid}`).send({ azione: 'Zorro', note: 'nota', tipo: a.tipo, riferimento: a.riferimento, rangoAtteso: a.rangoAtteso, produce: a.produce });
      expect(r.status).toBe(200);
      expect((r.body.data as AzionePercorsoDto).note).toBe('nota');
    } finally {
      prepared("UPDATE libro SET nascosto = 0 WHERE chiave = 'zorro-il-fuorilegge'").run();
      await elimina(a.uid);
    }
  });

  it('migrazione utente 008: le cose da fare scritte prima ricevono gli effetti dalle loro note', () => {
    // la tabella di allora (la «utente» 015 l'ha convertita e tolta)
    getDb().exec(DDL_UTENTE_STORICHE.find((s) => s.includes('utente.azione_utente ('))!);
    const adesso = 'x';
    const id = Number(prepared("INSERT INTO utente.azione_utente (partita_id, data, fascia, tipo, azione, note, ordine, created_at, updated_at) VALUES (NULL, '04-25', 'sera', 'altro', 'Bagno pubblico', 'Fascino +2', 1, ?, ?)").run(adesso, adesso).lastInsertRowid);
    const senza = Number(prepared("INSERT INTO utente.azione_utente (partita_id, data, fascia, tipo, azione, note, ordine, created_at, updated_at) VALUES (NULL, '04-25', 'sera', 'altro', 'Comprare il pane', NULL, 2, ?, ?)").run(adesso, adesso).lastInsertRowid);
    utente008.up(getDb());
    expect(JSON.parse((prepared('SELECT produce_json FROM utente.azione_utente WHERE id = ?').get(id) as { produce_json: string }).produce_json)).toEqual([{ tipo: 'dote', dote: 'fascino', note: 2 }]);
    expect(prepared('SELECT produce_json FROM utente.azione_utente WHERE id = ?').get(senza)).toEqual({ produce_json: '[]' });
    getDb().exec('DROP TABLE utente.azione_utente');
  });
});
