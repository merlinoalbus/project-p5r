// ============================================================
// Test API — la giornata della guida è modificabile: correzioni delle azioni (per tutte le partite),
// rimozione e ripristino, correzioni superate da un pacchetto nuovo, agenda dell'utente dentro le fasce
// ============================================================

import request from 'supertest';
import { closeDb, initDb, prepared } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { AzionePercorsoDto, DoteSocialePartitaDto, PercorsoGiornoDto, PercorsoIndiceDto, SuggerimentiOggiDto } from '../../shared/types.js';

const app = createApp();

const giorno = async (data: string, partita?: number) =>
  (await request(app).get(`/api/compendio/percorso/${data}${partita ? `?partita=${partita}` : ''}`)).body.data as PercorsoGiornoDto;
const nuovaPartita = async (nome: string) => ((await request(app).post('/api/partite').send({ nome })).body.data as { id: number }).id;
const riassunto = async (data: string, partita?: number) =>
  ((await request(app).get(`/api/compendio/percorso${partita ? `?partita=${partita}` : ''}`)).body.data as PercorsoIndiceDto).giorni.find((g) => g.giorno === data)!;

describe('API — correzioni della guida giorno per giorno', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    caricaPacchetto(db);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('corregge testo, note e fascia di un\'azione per tutte le partite; la spunta resta all\'azione; «Ripristina» la riporta com\'era', async () => {
    const prima = await giorno('04-12');
    const originale = prima.azioni[3];
    expect(originale.fascia).toBe('sera');
    const p1 = await nuovaPartita('Correzioni 1');
    const p2 = await nuovaPartita('Correzioni 2');
    await request(app).put(`/api/partite/${p1}/percorso`).send({ data: '04-12', indice: 3, fatta: true });

    const r = await request(app).put('/api/compendio/percorso/04-12/azioni/3').send({ azione: '  Scaffale del Leblanc: aprire lo scatolone  ', note: 'Da fare prima di dormire', fascia: 'giorno' });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ indice: 3, azione: 'Scaffale del Leblanc: aprire lo scatolone', note: 'Da fare prima di dormire', fascia: 'giorno', correzione: { azione: originale.azione, note: originale.note, fascia: 'sera' } });

    // vale per tutte le partite, e la spunta della partita 1 resta a quell'azione
    for (const [p, fatta] of [[p1, true], [p2, false]] as const) {
      const g = await giorno('04-12', p);
      const a = g.azioni.find((x) => x.indice === 3)!;
      expect(a).toMatchObject({ azione: 'Scaffale del Leblanc: aprire lo scatolone', fascia: 'giorno', fatta });
      expect(a.correzione?.azione).toBe(originale.azione);
    }
    // le altre azioni non cambiano
    const g = await giorno('04-12');
    expect(g.azioni.filter((x) => x.indice !== 3).every((x) => x.correzione === null)).toBe(true);

    // una correzione parziale tiene le altre
    const solo = (await request(app).put('/api/compendio/percorso/04-12/azioni/3').send({ fascia: 'sera' })).body.data as AzionePercorsoDto;
    expect(solo).toMatchObject({ azione: 'Scaffale del Leblanc: aprire lo scatolone', note: 'Da fare prima di dormire', fascia: 'sera' });

    expect((await request(app).delete('/api/compendio/percorso/04-12/azioni/3/correzione')).status).toBe(204);
    const dopo = (await giorno('04-12')).azioni.find((x) => x.indice === 3)!;
    expect(dopo).toMatchObject({ azione: originale.azione, note: originale.note, fascia: 'sera', correzione: null });
    expect((await request(app).delete('/api/compendio/percorso/04-12/azioni/3/correzione')).status).toBe(404);
  });

  it('riportare i campi al testo della guida non lascia una correzione; note vuote = nessuna nota', async () => {
    const originale = (await giorno('04-12')).azioni[0];
    await request(app).put('/api/compendio/percorso/04-12/azioni/0').send({ azione: 'Altro testo' });
    const tornata = (await request(app).put('/api/compendio/percorso/04-12/azioni/0').send({ azione: originale.azione })).body.data as AzionePercorsoDto;
    expect(tornata.correzione).toBeNull();
    expect((prepared('SELECT COUNT(*) AS n FROM correzione_azione_guida WHERE data = ?').get('04-12') as { n: number }).n).toBe(0);
    const senzaNote = (await request(app).put('/api/compendio/percorso/04-12/azioni/0').send({ note: '   ' })).body.data as AzionePercorsoDto;
    expect(senzaNote.note).toBeNull();
    expect(senzaNote.correzione?.note).toBe(originale.note);
    await request(app).delete('/api/compendio/percorso/04-12/azioni/0/correzione');
  });

  it('le Doti della spunta si leggono dalle note corrette', async () => {
    const p = await nuovaPartita('Note corrette');
    await request(app).put('/api/compendio/percorso/04-12/azioni/0').send({ note: 'Coraggio +2' });
    const a = (await request(app).put(`/api/partite/${p}/percorso`).send({ data: '04-12', indice: 0, fatta: true })).body.data as AzionePercorsoDto;
    expect(a.effetti?.doti.map((d) => d.chiave)).toEqual(['coraggio']);
    // la riga restituita dalla spunta porta stato e mappa come la scheda del giorno
    expect(a.stato).not.toBeNull();
    expect(a).toHaveProperty('mappa');
    const doti = (await request(app).get(`/api/partite/${p}/doti`)).body.data as DoteSocialePartitaDto[];
    expect(doti.find((d) => d.chiave === 'coraggio')!.punti).toBeGreaterThan(0);
    expect(doti.find((d) => d.chiave === 'conoscenza')!.punti).toBe(0);
    await request(app).put(`/api/partite/${p}/percorso`).send({ data: '04-12', indice: 0, fatta: false });
    await request(app).delete('/api/compendio/percorso/04-12/azioni/0/correzione');
  });

  it('rimuove un\'azione dalla giornata (non si spunta, non conta, non suggerisce), la spunta si può togliere, e la rimette', async () => {
    const p = await nuovaPartita('Rimozioni');
    await request(app).put(`/api/partite/${p}/giorno`).send({ data: '04-12' });
    const prima = await giorno('04-12', p);
    const rif = prima.azioni[2];
    expect(rif.riferimento).toEqual({ tipo: 'confidente', chiave: 'ryuji' });
    const conteggioPrima = await riassunto('04-12', p);
    // prima della rimozione l'azione suggerisce Ryuji: il controllo dopo non è a vuoto
    const suggPrima = (await request(app).get(`/api/partite/${p}/suggerimenti`)).body.data as SuggerimentiOggiDto;
    expect(suggPrima.motivi.some((m) => m.azione === rif.azione)).toBe(true);
    await request(app).put(`/api/partite/${p}/percorso`).send({ data: '04-12', indice: 2, fatta: true });

    const r = await request(app).put('/api/compendio/percorso/04-12/azioni/2/rimossa').send({ rimossa: true });
    expect(r.status).toBe(200);
    const g = await giorno('04-12', p);
    expect(g.azioni.map((a) => a.indice)).not.toContain(2);
    expect(g.rimosse).toEqual([{ indice: 2, fascia: 'giorno', azione: rif.azione }]);
    expect(g.fatte).toBe(0);
    const conteggio = await riassunto('04-12', p);
    expect(conteggio.azioni).toBe(conteggioPrima.azioni - 1);
    expect(conteggio.fatte).toBe(0);
    const sugg = (await request(app).get(`/api/partite/${p}/suggerimenti`)).body.data as SuggerimentiOggiDto;
    expect(sugg.motivi.some((m) => m.azione === rif.azione)).toBe(false);

    expect((await request(app).put(`/api/partite/${p}/percorso`).send({ data: '04-12', indice: 2, fatta: true })).status).toBe(400);
    expect((await request(app).put(`/api/partite/${p}/percorso`).send({ data: '04-12', indice: 2, fatta: false })).status).toBe(200);

    await request(app).put('/api/compendio/percorso/04-12/azioni/2/rimossa').send({ rimossa: false });
    const rimessa = await giorno('04-12', p);
    expect(rimessa.rimosse).toEqual([]);
    expect(rimessa.azioni.find((a) => a.indice === 2)).toMatchObject({ azione: rif.azione, fatta: false, correzione: null });
    expect((prepared('SELECT COUNT(*) AS n FROM correzione_azione_guida').get() as { n: number }).n).toBe(0);
  });

  it('una correzione superata da un pacchetto nuovo non si applica all\'azione sbagliata: la si riapplica o la si scarta', async () => {
    const originale = (await giorno('04-13')).azioni[0];
    await request(app).put('/api/compendio/percorso/04-13/azioni/0').send({ azione: 'Testo corretto dall\'utente' });
    // un pacchetto nuovo mette un'altra azione a quel posto
    const riga = prepared('SELECT azioni_json FROM giorno_percorso WHERE data = ?').get('04-13') as { azioni_json: string };
    const azioni = JSON.parse(riga.azioni_json) as Array<{ azione: string }>;
    azioni[0] = { ...azioni[0], azione: 'Azione nuova del pacchetto' };
    prepared('UPDATE giorno_percorso SET azioni_json = ? WHERE data = ?').run(JSON.stringify(azioni), '04-13');

    let g = await giorno('04-13');
    expect(g.azioni[0]).toMatchObject({ azione: 'Azione nuova del pacchetto', correzione: null });
    expect(g.correzioniSuperate).toEqual([{ indice: 0, azioneAllora: originale.azione, azioneAttuale: 'Azione nuova del pacchetto', azioneCorretta: 'Testo corretto dall\'utente', nascosta: false }]);

    const riapplicata = (await request(app).put('/api/compendio/percorso/04-13/azioni/0/riapplica')).body.data as AzionePercorsoDto;
    expect(riapplicata).toMatchObject({ azione: 'Testo corretto dall\'utente', correzione: { azione: 'Azione nuova del pacchetto' } });
    g = await giorno('04-13');
    expect(g.correzioniSuperate).toEqual([]);
    expect(g.azioni[0].azione).toBe('Testo corretto dall\'utente');

    // di nuovo superata, stavolta scartata
    azioni[0] = { ...azioni[0], azione: 'Terza versione' };
    prepared('UPDATE giorno_percorso SET azioni_json = ? WHERE data = ?').run(JSON.stringify(azioni), '04-13');
    expect((await giorno('04-13')).correzioniSuperate).toHaveLength(1);
    // finché è da rivedere non la si sovrascrive in silenzio con un'altra correzione o una rimozione
    expect((await request(app).put('/api/compendio/percorso/04-13/azioni/0').send({ fascia: 'sera' })).status).toBe(409);
    expect((await request(app).put('/api/compendio/percorso/04-13/azioni/0/rimossa').send({ rimossa: true })).status).toBe(409);
    expect((await giorno('04-13')).correzioniSuperate[0]).toMatchObject({ azioneCorretta: 'Testo corretto dall\'utente', nascosta: false });
    expect((await request(app).delete('/api/compendio/percorso/04-13/azioni/0/correzione')).status).toBe(204);
    expect((await giorno('04-13')).correzioniSuperate).toEqual([]);
  });

  it('una correzione a una posizione che il pacchetto nuovo non ha più: superata senza azione attuale, non si riapplica, si scarta', async () => {
    const riga = prepared('SELECT azioni_json FROM giorno_percorso WHERE data = ?').get('04-15') as { azioni_json: string };
    const azioni = JSON.parse(riga.azioni_json) as unknown[];
    const ultimo = azioni.length - 1;
    await request(app).put(`/api/compendio/percorso/04-15/azioni/${ultimo}/rimossa`).send({ rimossa: true });
    prepared('UPDATE giorno_percorso SET azioni_json = ? WHERE data = ?').run(JSON.stringify(azioni.slice(0, ultimo)), '04-15');
    const g = await giorno('04-15');
    expect(g.rimosse).toEqual([]);
    expect(g.correzioniSuperate).toEqual([expect.objectContaining({ indice: ultimo, azioneAttuale: null, azioneCorretta: null, nascosta: true })]);
    expect((await request(app).put(`/api/compendio/percorso/04-15/azioni/${ultimo}/riapplica`)).status).toBe(404);
    expect((await request(app).delete(`/api/compendio/percorso/04-15/azioni/${ultimo}/correzione`)).status).toBe(204);
    expect((await giorno('04-15')).correzioniSuperate).toEqual([]);
  });

  it('validazione: corpo vuoto o testo vuoto 400, azione o giorno inesistenti 404', async () => {
    expect((await request(app).put('/api/compendio/percorso/04-12/azioni/0').send({})).status).toBe(400);
    expect((await request(app).put('/api/compendio/percorso/04-12/azioni/0').send({ azione: '   ' })).status).toBe(400);
    expect((await request(app).put('/api/compendio/percorso/04-12/azioni/0').send({ fascia: 'notte' })).status).toBe(400);
    expect((await request(app).put('/api/compendio/percorso/04-12/azioni/99').send({ azione: 'x' })).status).toBe(404);
    expect((await request(app).put('/api/compendio/percorso/13-40/azioni/0').send({ azione: 'x' })).status).toBe(404);
    expect((await request(app).put('/api/compendio/percorso/04-12/azioni/0/rimossa').send({})).status).toBe(400);
    expect((await request(app).put('/api/compendio/percorso/04-12/azioni/0/riapplica')).status).toBe(404);
  });

  it('la scheda del giorno porta l\'agenda dell\'utente (eventi con fascia) e l\'indice conta le sue cose da fare', async () => {
    const p = await nuovaPartita('Agenda');
    const prima = await riassunto('04-14', p);
    const ev = (await request(app).post('/api/catalogo/agenda/eventi').send({ data: '04-14', tipo: 'scadenza', fascia: 'sera', titolo: 'Consegna', partitaId: p })).body.data as { id: number; fascia: string };
    expect(ev.fascia).toBe('sera');
    const senzaFascia = (await request(app).post('/api/catalogo/agenda/eventi').send({ data: '04-14', titolo: 'Senza fascia' })).body.data as { fascia: string };
    expect(senzaFascia.fascia).toBe('giorno');
    const az = (await request(app).post('/api/catalogo/agenda/azioni').send({ data: '04-14', fascia: 'sera', azione: 'Comprare il pane', partitaId: p })).body.data as { id: number };

    const g = await giorno('04-14', p);
    expect(g.agenda.eventi.map((e) => [e.titolo, e.fascia])).toEqual([['Consegna', 'sera'], ['Senza fascia', 'giorno']]);
    expect(g.agenda.azioni.map((a) => a.azione)).toEqual(['Comprare il pane']);
    // senza partita la cosa da fare della partita non si vede
    expect((await giorno('04-14')).agenda.azioni).toEqual([]);

    let conteggio = await riassunto('04-14', p);
    expect(conteggio.azioni).toBe(prima.azioni + 1);
    await request(app).put(`/api/catalogo/agenda/azioni/${az.id}/fatta`).send({ partita: p, fatta: true });
    conteggio = await riassunto('04-14', p);
    expect(conteggio.fatte).toBe(prima.fatte + 1);
    // un'altra partita non vede né conta la cosa da fare di questa
    const altra = await nuovaPartita('Altra');
    expect((await riassunto('04-14', altra)).azioni).toBe(prima.azioni);

    const spostato = (await request(app).put(`/api/catalogo/agenda/eventi/${ev.id}`).send({ fascia: 'giorno' })).body.data as { fascia: string };
    expect(spostato.fascia).toBe('giorno');
    expect((await request(app).post('/api/catalogo/agenda/eventi').send({ data: '04-14', titolo: 'x', fascia: 'notte' })).status).toBe(400);
  });
});
