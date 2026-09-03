// ============================================================
// Test API obiettivi — creazione, avanzamento sulla scorta, chiusura automatica, stati, validazione, eventi
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { ObiettivoDto, PersonaRiassuntoDto, SkillRiassuntoDto, StoricoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

async function idDi(nome: string): Promise<number> {
  const lista = (await request(app).get(`/api/compendio/persona?q=${encodeURIComponent(nome)}`)).body.data as PersonaRiassuntoDto[];
  const p = lista.find((x) => x.nome === nome);
  if (!p) throw new Error(`Persona ${nome} non trovata`);
  return p.id;
}
async function skillId(nome: string): Promise<number> {
  const lista = (await request(app).get(`/api/compendio/skill?q=${encodeURIComponent(nome)}`)).body.data as SkillRiassuntoDto[];
  const s = lista.find((x) => x.nome === nome);
  if (!s) throw new Error(`Skill ${nome} non trovata`);
  return s.id;
}

describe('API obiettivi', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('crea, mostra l\'avanzamento sulla scorta, chiude da solo quando le condizioni sono soddisfatte, gestisce stati e validazione', async () => {
    const p = await request(app).post('/api/partite').send({ nome: 'Obiettivi' });
    const id = p.body.data.id as number;
    const jack = await idDi('Jack Frost');
    const pixie = await idDi('Pixie');
    const agi = await skillId('Agi');
    const dia = await skillId('Dia');

    // creazione con skill e livello minimo
    const creato = await request(app).post(`/api/partite/${id}/obiettivi`).send({ personaId: jack, skillIds: [agi, dia], livelloMin: 15, priorita: 2, note: 'per Regent' });
    expect(creato.status).toBe(201);
    const o = creato.body.data as ObiettivoDto;
    expect(o).toMatchObject({ personaId: jack, nome: 'Jack Frost', stato: 'aperto', priorita: 2, livelloMin: 15, possedutaId: null, livelloAttuale: null, soddisfatto: false, livelloRaggiunto: false });
    expect(o.skill.map((s) => s.nome)).toEqual(['Agi', 'Dia']);
    expect(o.skillMancanti.map((s) => s.nome)).toEqual(['Agi', 'Dia']);
    // un solo aperto per Persona
    expect((await request(app).post(`/api/partite/${id}/obiettivi`).send({ personaId: jack })).status).toBe(409);
    // tratti vietati, skill inesistente, Persona inesistente, priorità fuori scala
    const tratti = (await request(app).get('/api/compendio/skill?elemento=trait')).body.data as SkillRiassuntoDto[];
    expect((await request(app).post(`/api/partite/${id}/obiettivi`).send({ personaId: pixie, skillIds: [tratti[0].id] })).status).toBe(400);
    expect((await request(app).post(`/api/partite/${id}/obiettivi`).send({ personaId: pixie, skillIds: [999999] })).status).toBe(404);
    expect((await request(app).post(`/api/partite/${id}/obiettivi`).send({ personaId: 999999 })).status).toBe(404);
    expect((await request(app).post(`/api/partite/${id}/obiettivi`).send({ personaId: pixie, priorita: 5 })).status).toBe(400);
    // evento nello storico
    let storico = (await request(app).get(`/api/partite/${id}/storico?tipi=obiettivo-creato`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);
    expect(storico.eventi[0].dettaglio).toContain('livello 15');

    // Jack Frost entra in scorta al livello 11 senza Agi: avanzamento parziale, obiettivo ancora aperto
    const poss = (await request(app).post(`/api/partite/${id}/persona`).send({ personaId: jack, livello: 11 })).body.data as { id: number; skill: SkillRiassuntoDto[] };
    let lista = (await request(app).get(`/api/partite/${id}/obiettivi`)).body.data as ObiettivoDto[];
    expect(lista[0]).toMatchObject({ stato: 'aperto', possedutaId: poss.id, livelloAttuale: 11, livelloRaggiunto: false, soddisfatto: false });
    expect(lista[0].skillMancanti.map((s) => s.nome)).toContain('Agi');
    // livello 15 e Agi appresa → chiusura automatica con evento
    const skillIds = [...poss.skill.map((s) => s.id).filter((s) => s !== agi).slice(0, 7), agi];
    await request(app).put(`/api/partite/${id}/persona/${poss.id}`).send({ livello: 15, skillIds });
    lista = (await request(app).get(`/api/partite/${id}/obiettivi`)).body.data as ObiettivoDto[];
    expect(lista[0]).toMatchObject({ stato: 'raggiunto', soddisfatto: true, livelloRaggiunto: true });
    expect(lista[0].raggiuntoAt).not.toBeNull();
    storico = (await request(app).get(`/api/partite/${id}/storico?tipi=obiettivo-raggiunto`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);
    expect(storico.eventi[0].dettaglio).toContain('livello 15');
    // filtro per stato
    expect(((await request(app).get(`/api/partite/${id}/obiettivi?stato=aperto`)).body.data as ObiettivoDto[])).toEqual([]);
    expect(((await request(app).get(`/api/partite/${id}/obiettivi?stato=raggiunto`)).body.data as ObiettivoDto[]).length).toBe(1);
    expect((await request(app).get(`/api/partite/${id}/obiettivi?stato=x`)).status).toBe(400);

    // nuovo obiettivo per una Persona già in scorta che soddisfa tutto → nasce raggiunto
    const subito = (await request(app).post(`/api/partite/${id}/obiettivi`).send({ personaId: jack, livelloMin: 10 })).body.data as ObiettivoDto;
    expect(subito.stato).toBe('raggiunto');
    // riaprirlo è possibile (nessun altro aperto), poi aggiornamento e verifica: si richiude subito
    const riaperto = (await request(app).put(`/api/partite/${id}/obiettivi/${subito.id}`).send({ stato: 'aperto', livelloMin: 50 })).body.data as ObiettivoDto;
    expect(riaperto).toMatchObject({ stato: 'aperto', livelloMin: 50, livelloRaggiunto: false });
    // riaprire il primo mentre il secondo è aperto → conflitto
    expect((await request(app).put(`/api/partite/${id}/obiettivi/${o.id}`).send({ stato: 'aperto' })).status).toBe(409);
    // annullamento e segnatura manuale
    const annullato = (await request(app).put(`/api/partite/${id}/obiettivi/${riaperto.id}`).send({ stato: 'annullato' })).body.data as ObiettivoDto;
    expect(annullato.stato).toBe('annullato');
    const pix = (await request(app).post(`/api/partite/${id}/obiettivi`).send({ personaId: pixie })).body.data as ObiettivoDto;
    expect(pix.skill).toEqual([]);
    const manuale = (await request(app).put(`/api/partite/${id}/obiettivi/${pix.id}`).send({ stato: 'raggiunto' })).body.data as ObiettivoDto;
    expect(manuale.stato).toBe('raggiunto');
    storico = (await request(app).get(`/api/partite/${id}/storico?tipi=obiettivo-raggiunto`)).body.data as StoricoDto;
    expect(storico.totale).toBe(3);
    expect(storico.eventi[0].dettaglio).toBe('Segnato a mano.');
    // ordinamento: aperti prima, poi raggiunti, poi annullati
    lista = (await request(app).get(`/api/partite/${id}/obiettivi`)).body.data as ObiettivoDto[];
    expect(lista.map((x) => x.stato)).toEqual(['raggiunto', 'raggiunto', 'raggiunto', 'annullato'].slice(0, lista.length));
    // eliminazione
    expect((await request(app).delete(`/api/partite/${id}/obiettivi/${pix.id}`)).status).toBe(204);
    expect((await request(app).delete(`/api/partite/${id}/obiettivi/${pix.id}`)).status).toBe(404);
    expect((await request(app).get('/api/partite/99999/obiettivi')).status).toBe(404);
  });
});
