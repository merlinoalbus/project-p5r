// ============================================================
// Test API — le cose da fare dell'utente sono azioni come quelle della guida
// ============================================================
//
// Richiesta dell'utente (2026-09-30): «gli eventi in guida che mi hai permesso di aggiungere non possono minimamente essere
// classificati come gli altri né collegati ad altri elementi (Confidenti, Libri, Doti Sociali, ecc.)». Una cosa da fare ha ora
// tipo, collegamento verificato, rango atteso ed effetti della spunta; la spunta li applica con lo stesso motore della guida (le
// note del Confidente comprese) e li annulla togliendola. Prima la spunta di una cosa da fare non dava mai punti.
// ============================================================

import request from 'supertest';
import { closeDb, getDb, initDb, prepared } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { createApp } from '../bootstrap.js';
import { utente008 } from '../db/migrazioniUtente/008_effetti_delle_azioni_utente.js';
import type { AzioneUtenteDto, DoteSocialePartitaDto, PercorsoGiornoDto } from '../../shared/types.js';

const app = createApp();

describe('API — cose da fare dell\'utente come azioni della guida', () => {
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
  const crea = (corpo: object) => request(app).post('/api/catalogo/agenda/azioni').send(corpo);
  const spunta = (id: number, partita: number, fatta: boolean, noteRisposta?: 1 | 2 | 3) => request(app).put(`/api/catalogo/agenda/azioni/${id}/fatta`).send({ partita, fatta, ...(noteRisposta ? { noteRisposta } : {}) });
  const dote = async (p: number, chiave: string) => ((await request(app).get(`/api/partite/${p}/doti`)).body.data as DoteSocialePartitaDto[]).find((d) => d.chiave === chiave)!.punti;

  it('si crea classificata e collegata: il nome lo dà il server, gli effetti si leggono in parole; un collegamento a vuoto no', async () => {
    const r = await crea({ data: '04-25', azione: 'Clinica Takemi: test clinico', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, rangoAtteso: 2, produce: [{ tipo: 'dote', dote: 'coraggio', note: 1 }] });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({
      tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, riferimentoTesto: 'Tae Takemi - Morte', rangoAtteso: 2,
      produce: [{ tipo: 'dote', dote: 'coraggio', note: 1 }], produceTesto: ['Coraggio, 1 nota'], fatta: false, effetti: null,
    });
    expect((await crea({ data: '04-25', azione: 'x', riferimento: { tipo: 'confidente', chiave: 'nessuno' } })).body.error.code).toBe('riferimento-inesistente');
    expect((await crea({ data: '04-25', azione: 'x', tipo: 'boh' })).status).toBe(400);
    expect((await crea({ data: '04-25', azione: 'x', produce: [{ tipo: 'turno', attivita: 'studio-leblanc' }] })).body.error.code).toBe('effetto-non-valido');
    await request(app).delete(`/api/catalogo/agenda/azioni/${(r.body.data as AzioneUtenteDto).id}`).expect(204);
  });

  it('la spunta applica gli effetti e le note del Confidente, e li annulla togliendola; con effetti non si elimina', async () => {
    const p = await nuovaPartita('Takemi mia', '04-25');
    await request(app).put(`/api/partite/${p}/confidenti/takemi`).send({ forza: true, rango: 1 }).expect(200);
    // il rango 1 dalla pagina è già un incontro (la Dote a ogni incontro, voce 5): si misura da qui
    const base = await dote(p, 'coraggio');
    const a = (await crea({ data: '04-25', azione: 'Clinica Takemi', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, rangoAtteso: 2, produce: [{ tipo: 'dote', dote: 'coraggio', note: 1 }], partitaId: p })).body.data as AzioneUtenteDto;
    const r = (await spunta(a.id, p, true, 2).expect(200)).body.data as AzioneUtenteDto;
    expect(r.fatta).toBe(true);
    // l'effetto dichiarato dell'azione, l'incontro verso il rango 2 (passaggio) e le note della risposta
    expect(r.effetti).toMatchObject({
      doti: [{ chiave: 'coraggio', delta: 2, note: 1 }], confidente: { chiave: 'takemi', noteRisposta: 2 },
      incontro: { verso: 2, passaggio: true, giaContato: false, doti: [{ chiave: 'coraggio', delta: 2, note: 1 }] },
    });
    expect(await dote(p, 'coraggio')).toBe(base + 4);
    const puntiTakemi = async () => ((await request(app).get(`/api/partite/${p}/confidenti`)).body.data as Array<{ chiave: string; punti: number }>).find((c) => c.chiave === 'takemi')!.punti;
    expect(await puntiTakemi()).toBeGreaterThan(0);
    // una seconda spunta non dà punti due volte
    await spunta(a.id, p, true, 2).expect(200);
    expect(await dote(p, 'coraggio')).toBe(base + 4);
    // con effetti non si elimina: prima si toglie la spunta
    const rifiuto = (await request(app).delete(`/api/catalogo/agenda/azioni/${a.id}`)).body.error as { code: string; message: string };
    expect(rifiuto.code).toBe('azione-con-effetti');
    // il messaggio dice in quale partita va riaperta (una voce di tutte le partite può essere spuntata in più d'una)
    expect(rifiuto.message).toMatch(/in una partita \(«Takemi mia»\)/);
    await spunta(a.id, p, false).expect(200);
    expect(await dote(p, 'coraggio')).toBe(base);
    expect(await puntiTakemi()).toBe(0);
    await request(app).delete(`/api/catalogo/agenda/azioni/${a.id}`).expect(204);
    // lo storico dice che cosa ha dato la spunta
    const storico = (await request(app).get(`/api/partite/${p}/storico`)).body.data as { eventi: Array<{ tipo: string; dettaglio: string }> };
    expect(storico.eventi.some((e) => e.tipo === 'percorso' && /la mia/.test(e.dettaglio) && /Coraggio \+2/.test(e.dettaglio))).toBe(true);
  });

  it('una lettura e un turno funzionano come nella guida (Zorro +7, turno Rafflesia), il turno si toglie con la spunta', async () => {
    const p = await nuovaPartita('Letture mie', '04-26');
    const zorro = (await crea({ data: '04-25', azione: 'Finire Zorro', tipo: 'libro', riferimento: { tipo: 'libro', chiave: 'zorro-il-fuorilegge' }, produce: [{ tipo: 'lettura', categoria: 'libro', chiave: 'zorro-il-fuorilegge', almeno: null }], partitaId: p })).body.data as AzioneUtenteDto;
    expect(zorro.produceTesto).toEqual(['Zorro, il fuorilegge: completato']);
    await spunta(zorro.id, p, true).expect(200);
    expect(await dote(p, 'gentilezza')).toBe(7);
    const turno = (await crea({ data: '04-26', azione: 'Svolgere il primo giorno di lavoro dal Fioraio', tipo: 'lavoro', riferimento: { tipo: 'attivita', chiave: 'lavoro-rafflesia' }, produce: [{ tipo: 'turno', attivita: 'lavoro-rafflesia' }], partitaId: p })).body.data as AzioneUtenteDto;
    const r = (await spunta(turno.id, p, true).expect(200)).body.data as AzioneUtenteDto;
    expect(r.effetti?.turni).toEqual([expect.objectContaining({ attivita: 'lavoro-rafflesia', ordine: 1 })]);
    expect(await dote(p, 'gentilezza')).toBe(10);
    await spunta(turno.id, p, false).expect(200);
    expect(await dote(p, 'gentilezza')).toBe(7);
    expect(prepared("SELECT volte FROM attivita_svolta_partita WHERE partita_id = ? AND attivita_chiave = 'lavoro-rafflesia'").get(p)).toEqual({ volte: 0 });
  });

  it('nella scheda del giorno la cosa da fare ha stato e mappa come le azioni della guida', async () => {
    const p = await nuovaPartita('Stato mio', '04-25');
    const a = (await crea({ data: '04-25', azione: 'Clinica Takemi', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, rangoAtteso: 3, partitaId: p })).body.data as AzioneUtenteDto;
    const g = (await request(app).get(`/api/compendio/percorso/04-25?partita=${p}`)).body.data as PercorsoGiornoDto;
    const mia = g.agenda.azioni.find((x) => x.id === a.id)!;
    expect(mia.stato).not.toBeNull();
    expect(mia.stato!.tipo).toBe('bloccata');
    // la guida del giorno ha un'azione su Takemi: la mappa del suo luogo è la stessa
    const guida = g.azioni.find((x) => x.riferimento?.chiave === 'takemi')!;
    expect(mia.mappa).toEqual(guida.mappa);
  });

  it('al cinema una cosa da fare conta la visione insieme alle spunte della guida', async () => {
    const p = await nuovaPartita('Cinema mio', '07-31');
    await request(app).put(`/api/partite/${p}/percorso`).send({ data: '07-05', indice: 0, fatta: true }).expect(200);
    const a = (await crea({ data: '07-31', azione: 'Rivedere L\'amore chissà', tipo: 'dote', riferimento: { tipo: 'film', chiave: 'cinema-l-amore-chissa' }, produce: [{ tipo: 'lettura', categoria: 'film', chiave: 'cinema-l-amore-chissa', almeno: null }], partitaId: p })).body.data as AzioneUtenteDto;
    await spunta(a.id, p, true).expect(200);
    expect(prepared("SELECT avanzamento FROM progresso_film_partita WHERE partita_id = ? AND film_chiave = 'cinema-l-amore-chissa'").get(p)).toEqual({ avanzamento: 2 });
  });

  it('correggere la nota di una cosa da fare riesce anche se il libro collegato è stato nascosto dal catalogo', async () => {
    const a = (await crea({ data: '04-25', azione: 'Zorro', tipo: 'libro', riferimento: { tipo: 'libro', chiave: 'zorro-il-fuorilegge' }, produce: [{ tipo: 'lettura', categoria: 'libro', chiave: 'zorro-il-fuorilegge', almeno: null }] })).body.data as AzioneUtenteDto;
    prepared("UPDATE libro SET nascosto = 1 WHERE chiave = 'zorro-il-fuorilegge'").run();
    try {
      const r = await request(app).put(`/api/catalogo/agenda/azioni/${a.id}`).send({ azione: 'Zorro', note: 'nota', tipo: a.tipo, riferimento: a.riferimento, rangoAtteso: a.rangoAtteso, produce: a.produce });
      expect(r.status).toBe(200);
      expect((r.body.data as AzioneUtenteDto).note).toBe('nota');
    } finally {
      prepared("UPDATE libro SET nascosto = 0 WHERE chiave = 'zorro-il-fuorilegge'").run();
      await request(app).delete(`/api/catalogo/agenda/azioni/${a.id}`);
    }
  });

  it('migrazione utente 008: le cose da fare già scritte ricevono gli effetti dalle loro note', () => {
    const adesso = 'x';
    const id = Number(prepared("INSERT INTO azione_utente (partita_id, data, fascia, tipo, azione, note, ordine, created_at, updated_at) VALUES (NULL, '04-25', 'sera', 'altro', 'Bagno pubblico', 'Fascino +2', 1, ?, ?)").run(adesso, adesso).lastInsertRowid);
    const senza = Number(prepared("INSERT INTO azione_utente (partita_id, data, fascia, tipo, azione, note, ordine, created_at, updated_at) VALUES (NULL, '04-25', 'sera', 'altro', 'Comprare il pane', NULL, 2, ?, ?)").run(adesso, adesso).lastInsertRowid);
    utente008.up(getDb());
    expect(JSON.parse((prepared('SELECT produce_json FROM azione_utente WHERE id = ?').get(id) as { produce_json: string }).produce_json)).toEqual([{ tipo: 'dote', dote: 'fascino', note: 2 }]);
    expect(prepared('SELECT produce_json FROM azione_utente WHERE id = ?').get(senza)).toEqual({ produce_json: '[]' });
    prepared('DELETE FROM azione_utente WHERE id IN (?, ?)').run(id, senza);
  });
});
