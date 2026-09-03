// ============================================================
// Test API cicli di fusione — ricerca con partita, salvataggio validato, anello corrente, esecuzione e conteggio dei giri
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { CicliFusioneDto, CicloSalvatoDto, EsitoFusioneScortaDto, PersonaPossedutaDto, PersonaRiassuntoDto, StoricoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

async function idDi(nome: string): Promise<number> {
  const lista = (await request(app).get(`/api/compendio/persona?q=${encodeURIComponent(nome)}`)).body.data as PersonaRiassuntoDto[];
  const p = lista.find((x) => x.nome === nome);
  if (!p) throw new Error(`Persona ${nome} non trovata`);
  return p.id;
}

describe('API cicli di fusione', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('cerca i cicli con il Registro della partita, li salva, li esegue anello per anello e conta i giri', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Cicli', livelloProtagonista: 40 })).body.data as { id: number }).id;
    const jack = await idDi('Jack Frost');
    // senza partita né catture: nessun partner procurabile
    const vuoto = (await request(app).get(`/api/fusione/cicli/${jack}`)).body.data as CicliFusioneDto;
    expect(vuoto.cicli).toEqual([]);
    expect(vuoto.disponibilita).toEqual({ scorta: 0, registro: 0 });
    // con le catture si trovano cicli anche senza partita
    const catture = (await request(app).get(`/api/fusione/cicli/${jack}?catture=true&lunghezza=3&alternative=3`)).body.data as CicliFusioneDto;
    expect(catture.cicli.length).toBeGreaterThan(0);
    expect(catture.cicli.every((c) => c.costo === 0 && c.anelli.every((a) => a.partnerModo === 'cattura'))).toBe(true);
    // registra nel compendio tutte le Persona fino al livello 30 → partner dal Registro
    const tutte = (await request(app).get('/api/compendio/persona?livelloMax=30&limite=500')).body.data as PersonaRiassuntoDto[];
    for (const p of tutte.filter((x) => !x.dlc)) await request(app).put(`/api/partite/${id}/compendio/${p.id}`).send({ registrata: true });
    const con = (await request(app).get(`/api/fusione/cicli/${jack}?partita=${id}&lunghezza=3&alternative=4&limitaLivello=true`)).body.data as CicliFusioneDto;
    expect(con.cicli.length).toBeGreaterThan(0);
    expect(con.inScorta).toBe(false);
    expect(con.disponibilita.registro).toBeGreaterThan(0);
    const c0 = con.cicli[0];
    expect(c0.anelli[0].ingrediente.id).toBe(jack);
    expect(c0.anelli[c0.anelli.length - 1].risultato.id).toBe(jack);
    expect(c0.anelli.every((a) => a.partnerModo === 'registro' && a.partnerCosto > 0)).toBe(true);
    expect(c0.costo).toBe(c0.anelli.reduce((s, a) => s + a.partnerCosto, 0));
    expect(c0.anelli.every((a) => a.risultato.id === jack || a.risultato.livello <= 40)).toBe(true);
    for (let i = 1; i < con.cicli.length; i++) expect(con.cicli[i].costo).toBeGreaterThanOrEqual(con.cicli[i - 1].costo);
    expect((await request(app).get(`/api/fusione/cicli/${jack}?lunghezza=9`)).status).toBe(400);
    expect((await request(app).get('/api/fusione/cicli/999999')).status).toBe(404);

    // salvataggio: validazione degli anelli (catena rotta / risultato sbagliato) e caso corretto
    const anelli = c0.anelli.map((a) => ({ ingredienteId: a.ingrediente.id, partnerId: a.partner.id, risultatoId: a.risultato.id }));
    expect((await request(app).post(`/api/partite/${id}/cicli`).send({ personaId: jack, anelli: [anelli[0]] })).status).toBe(400);
    expect((await request(app).post(`/api/partite/${id}/cicli`).send({ personaId: jack, anelli: [{ ...anelli[0], risultatoId: jack }, anelli[1] ?? anelli[0]] })).status).toBe(400);
    const salvato = await request(app).post(`/api/partite/${id}/cicli`).send({ personaId: jack, anelli, nome: 'Il mio ciclo' });
    expect(salvato.status).toBe(201);
    const ciclo = salvato.body.data as CicloSalvatoDto;
    expect(ciclo).toMatchObject({ personaId: jack, titolo: 'Il mio ciclo', iterazioni: 0, anelloCorrente: 0, lunghezza: c0.lunghezza, costo: c0.costo });
    expect(ciclo.avanzamento).toMatchObject({ ingredientePossedutaId: null, partnerRegistrato: true, eseguibile: false });
    expect(((await request(app).get(`/api/partite/${id}/storico?tipi=ciclo-salvato`)).body.data as StoricoDto).totale).toBe(1);

    // esecuzione del primo anello: Jack Frost e il partner in scorta → eseguibile; fusione dalla scorta; avanza
    await request(app).post(`/api/partite/${id}/persona`).send({ personaId: jack });
    await request(app).post(`/api/partite/${id}/persona`).send({ personaId: ciclo.anelli[0].partner.id });
    let stato = ((await request(app).get(`/api/partite/${id}/cicli`)).body.data as CicloSalvatoDto[])[0];
    expect(stato.avanzamento.eseguibile).toBe(true);
    const fus = (await request(app).post(`/api/partite/${id}/velluto/fusione`).send({ possedutaIds: [stato.avanzamento.ingredientePossedutaId, stato.avanzamento.partnerPossedutaId], risultatoId: stato.anelli[0].risultato.id })).body.data as EsitoFusioneScortaDto;
    expect(fus.risultato.personaId).toBe(stato.anelli[0].risultato.id);
    stato = (await request(app).post(`/api/partite/${id}/cicli/${ciclo.id}/avanza`)).body.data as CicloSalvatoDto;
    expect(stato.anelloCorrente).toBe(1 % ciclo.lunghezza);
    expect(stato.iterazioni).toBe(ciclo.lunghezza === 1 ? 1 : 0);
    // completa il giro eseguendo gli anelli rimanenti
    for (let i = 1; i < ciclo.lunghezza; i++) {
      const a = stato.anelli[stato.anelloCorrente];
      await request(app).post(`/api/partite/${id}/persona`).send({ personaId: a.partner.id });
      stato = ((await request(app).get(`/api/partite/${id}/cicli`)).body.data as CicloSalvatoDto[])[0];
      expect(stato.avanzamento.eseguibile).toBe(true);
      await request(app).post(`/api/partite/${id}/velluto/fusione`).send({ possedutaIds: [stato.avanzamento.ingredientePossedutaId, stato.avanzamento.partnerPossedutaId], risultatoId: a.risultato.id });
      stato = (await request(app).post(`/api/partite/${id}/cicli/${ciclo.id}/avanza`)).body.data as CicloSalvatoDto;
    }
    expect(stato).toMatchObject({ anelloCorrente: 0, iterazioni: 1 });
    const scorta = (await request(app).get(`/api/partite/${id}/persona`)).body.data as PersonaPossedutaDto[];
    expect(scorta.map((p) => p.personaId)).toEqual([jack]);
    const eventi = (await request(app).get(`/api/partite/${id}/storico?tipi=ciclo-iterazione,ciclo-anello`)).body.data as StoricoDto;
    expect(eventi.eventi.filter((e) => e.tipo === 'ciclo-iterazione')).toHaveLength(1);
    expect(eventi.eventi.filter((e) => e.tipo === 'ciclo-anello')).toHaveLength(ciclo.lunghezza - 1);
    // anello corrente manuale, validazione, eliminazione
    expect(((await request(app).put(`/api/partite/${id}/cicli/${ciclo.id}`).send({ anelloCorrente: 1 })).body.data as CicloSalvatoDto).anelloCorrente).toBe(Math.min(1, ciclo.lunghezza - 1));
    expect((await request(app).put(`/api/partite/${id}/cicli/${ciclo.id}`).send({ anelloCorrente: 4 })).status).toBe(ciclo.lunghezza > 4 ? 200 : 400);
    expect((await request(app).delete(`/api/partite/${id}/cicli/${ciclo.id}`)).status).toBe(204);
    expect((await request(app).delete(`/api/partite/${id}/cicli/${ciclo.id}`)).status).toBe(404);
    expect((await request(app).get('/api/partite/99999/cicli')).status).toBe(404);
  });
});
