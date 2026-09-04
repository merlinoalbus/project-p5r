// ============================================================
// Test API operazioni della Stanza di Velluto dalla scorta — anteprima ed esecuzione della fusione, Forca, Isolamento
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { AnteprimaFusioneDto, EsitoForcaDto, EsitoFusioneScortaDto, EsitoIsolamentoDto, PersonaPossedutaDto, PersonaRiassuntoDto, StoricoDto, SuggerimentoIsolamentoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

async function idDi(nome: string): Promise<number> {
  const lista = (await request(app).get(`/api/compendio/persona?q=${encodeURIComponent(nome)}`)).body.data as PersonaRiassuntoDto[];
  const p = lista.find((x) => x.nome === nome);
  if (!p) throw new Error(`Persona ${nome} non trovata`);
  return p.id;
}

describe('API operazioni della Stanza di Velluto', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('fusione dalla scorta: anteprima con bonus del Confidente e skill ereditabili, esecuzione, Allarme e Persona carica', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Velluto', livelloProtagonista: 30 })).body.data as { id: number }).id;
    const arsene = await idDi('Arsène');
    const pixie = await idDi('Pixie');
    const a = (await request(app).post(`/api/partite/${id}/persona`).send({ personaId: arsene, livello: 5 })).body.data as PersonaPossedutaDto;
    const b = (await request(app).post(`/api/partite/${id}/persona`).send({ personaId: pixie })).body.data as PersonaPossedutaDto;
    let ant = (await request(app).post(`/api/partite/${id}/velluto/fusione/anteprima`).send({ possedutaIds: [a.id, b.id] })).body.data as AnteprimaFusioneDto;
    const nomeRisultato = ant.risultato.nome;
    const nomeRisultatoIt = ant.risultato.nomeIt;
    expect(nomeRisultato.length).toBeGreaterThan(0);
    expect(ant.bonusLivelli).toMatchObject({ min: 0, max: 0, rangoArcano: 0 });
    expect(ant.livelloSuggerito).toBe(ant.livelloBase);
    expect(ant.allarme).toBe(false);
    expect(ant.puntiAllarme).toBe(0);
    expect(ant.candidate.length).toBeGreaterThan(0);
    expect(ant.slotScelti).toBe(ant.slot - 1);
    // Confidente dell'arcano del risultato al rango 5, Matto al 7 → +3 livelli
    const confidenti = (await request(app).get('/api/compendio/confidenti')).body.data as Array<{ chiave: string; arcana: string }>;
    const conf = confidenti.find((c) => c.arcana === ant.risultato.arcana)!;
    expect(conf).toBeDefined();
    await request(app).put(`/api/partite/${id}/confidenti/${conf.chiave}`).send({ forza: true, rango: 5 });
    await request(app).put(`/api/partite/${id}/confidenti/igor`).send({ forza: true, rango: 7 });
    ant = (await request(app).post(`/api/partite/${id}/velluto/fusione/anteprima`).send({ possedutaIds: [a.id, b.id] })).body.data as AnteprimaFusioneDto;
    expect(ant.bonusLivelli).toMatchObject({ min: 3, max: 3, rangoMatto: 7, rangoArcano: 5 });
    expect(ant.livelloSuggerito).toBe(ant.livelloBase + 3);
    // validazioni
    expect((await request(app).post(`/api/partite/${id}/velluto/fusione/anteprima`).send({ possedutaIds: [a.id, a.id] })).status).toBe(400);
    expect((await request(app).post(`/api/partite/${id}/velluto/fusione/anteprima`).send({ possedutaIds: [a.id, 99999] })).status).toBe(404);
    expect((await request(app).post(`/api/partite/${id}/velluto/fusione/anteprima`).send({ possedutaIds: [a.id, b.id], risultatoId: pixie })).status).toBe(400);
    const ered = ant.candidate.filter((c) => c.ereditabile).map((c) => c.id);
    const troppe = ered.slice(0, ant.slotScelti + 1);
    if (troppe.length > ant.slotScelti) expect((await request(app).post(`/api/partite/${id}/velluto/fusione`).send({ possedutaIds: [a.id, b.id], skillIds: troppe })).status).toBe(400);
    const nonEred = ant.candidate.find((c) => !c.ereditabile);
    if (nonEred) expect((await request(app).post(`/api/partite/${id}/velluto/fusione`).send({ possedutaIds: [a.id, b.id], skillIds: [nonEred.id] })).status).toBe(400);
    // esecuzione con Allarme attivo → Persona carica, skill ereditata in testa, ingredienti rimossi, eventi
    await request(app).put(`/api/partite/${id}`).send({ allarmeAttivo: true });
    const scelte = ered.slice(0, Math.min(1, ered.length));
    const es = await request(app).post(`/api/partite/${id}/velluto/fusione`).send({ possedutaIds: [a.id, b.id], skillIds: scelte, note: 'prova' });
    expect(es.status).toBe(201);
    const esito = es.body.data as EsitoFusioneScortaDto;
    expect(esito.risultato).toMatchObject({ nome: nomeRisultato, livello: ant.livelloBase + 3, carica: true, note: 'prova' });
    expect(esito.rimosse.map((r) => r.nomeIt).sort()).toEqual(['Arsène', 'Pixie']);
    if (scelte.length) expect(esito.risultato.skill[0].id).toBe(scelte[0]);
    expect(esito.risultato.skill.length).toBeLessThanOrEqual(8);
    expect(esito.anteprima.puntiAllarme).toBe(15);
    const scorta = (await request(app).get(`/api/partite/${id}/persona`)).body.data as PersonaPossedutaDto[];
    expect(scorta.map((p) => p.nome)).toEqual([nomeRisultato]);
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=fusione-eseguita`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);
    expect(storico.eventi[0].titolo).toBe(`Fusione: Arsène + Pixie → ${nomeRisultatoIt}`);
    expect(storico.eventi[0].dettaglio).toContain('Allarme');
    // ingrediente carico → punti 20 con l'Allarme
    const b2 = (await request(app).post(`/api/partite/${id}/persona`).send({ personaId: pixie })).body.data as PersonaPossedutaDto;
    const jack = scorta[0];
    ant = (await request(app).post(`/api/partite/${id}/velluto/fusione/anteprima`).send({ possedutaIds: [jack.id, b2.id] })).body.data as AnteprimaFusioneDto;
    expect(ant.cariche).toBe(1);
    expect(ant.puntiAllarme).toBe(20);
    expect(ant.rischioIncidente).toBe(true);
    // il risultato già in scorta blocca la fusione (conflitto), la scorta resta intatta
    const arsene2 = (await request(app).post(`/api/partite/${id}/persona`).send({ personaId: arsene })).body.data as PersonaPossedutaDto;
    expect((await request(app).post(`/api/partite/${id}/velluto/fusione`).send({ possedutaIds: [arsene2.id, b2.id] })).status).toBe(409);
    expect(((await request(app).get(`/api/partite/${id}/persona`)).body.data as PersonaPossedutaDto[]).length).toBe(3);
  });

  it('Forca: sacrificio rimosso, livello e skill trasferite, incidente con punti; Isolamento: statistiche e skill di resistenza', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Forca', livelloProtagonista: 40 })).body.data as { id: number }).id;
    const jackId = await idDi('Jack Frost');
    const pixieId = await idDi('Pixie');
    const jack = (await request(app).post(`/api/partite/${id}/persona`).send({ personaId: jackId, livello: 12 })).body.data as PersonaPossedutaDto;
    const pixie = (await request(app).post(`/api/partite/${id}/persona`).send({ personaId: pixieId, livello: 20 })).body.data as PersonaPossedutaDto;
    expect((await request(app).post(`/api/partite/${id}/velluto/forca`).send({ riceventeId: jack.id, sacrificioId: jack.id })).status).toBe(400);
    expect((await request(app).post(`/api/partite/${id}/velluto/forca`).send({ riceventeId: jack.id, sacrificioId: pixie.id, skillTrasferiteIds: [1, 2] })).status).toBe(400);
    expect((await request(app).post(`/api/partite/${id}/velluto/forca`).send({ riceventeId: jack.id, sacrificioId: pixie.id, incidente: true, nuovoLivello: 15 })).status).toBe(400);
    const skillPixie = pixie.skill.find((s) => !jack.skill.some((j) => j.id === s.id))!;
    const es = (await request(app).post(`/api/partite/${id}/velluto/forca`).send({ riceventeId: jack.id, sacrificioId: pixie.id, nuovoLivello: 14, skillTrasferiteIds: [skillPixie.id], puntiStatistica: { forza: 3, magia: 3 } })).body.data as EsitoForcaDto;
    expect(es.ricevente.livello).toBe(14);
    expect(es.ricevente.skill.some((s) => s.id === skillPixie.id)).toBe(true);
    expect(es.ricevente.statisticheBase).toBe(false);
    expect(es.fattori.some((f) => f.nome.includes('livello superiore'))).toBe(true);
    expect(es.puntiGarantiti).toBe(5);
    expect(((await request(app).get(`/api/partite/${id}/persona`)).body.data as PersonaPossedutaDto[]).map((p) => p.nome)).toEqual(['Jack Frost']);
    const pixie2 = (await request(app).post(`/api/partite/${id}/persona`).send({ personaId: pixieId, carica: true })).body.data as PersonaPossedutaDto;
    const prima = ((await request(app).get(`/api/partite/${id}/persona`)).body.data as PersonaPossedutaDto[]).find((p) => p.id === jack.id)!;
    const inc = (await request(app).post(`/api/partite/${id}/velluto/forca`).send({ riceventeId: jack.id, sacrificioId: pixie2.id, incidente: true, puntiStatistica: { agilita: 10 } })).body.data as EsitoForcaDto;
    expect(inc).toMatchObject({ incidente: true, puntiGarantiti: 10 });
    expect(inc.ricevente.livello).toBe(14);
    expect(inc.ricevente.statistiche.agilita).toBe(Math.min(99, prima.statistiche.agilita + 10));
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=forca`)).body.data as StoricoDto;
    expect(storico.totale).toBe(2);
    expect(storico.eventi[0].dettaglio).toContain('Incidente');
    const sug = (await request(app).get(`/api/partite/${id}/velluto/isolamento/${jack.id}`)).body.data as SuggerimentoIsolamentoDto;
    expect(sug.tier).toBe('Dodge');
    expect(sug.elemento).toBe('fire');
    expect(sug.skill?.nome).toBe('Dodge Fire');
    expect((await request(app).post(`/api/partite/${id}/velluto/isolamento`).send({ possedutaId: jack.id, incenso: 'musk', giorni: 4, statistiche: ['forza'] })).status).toBe(400);
    const iso = (await request(app).post(`/api/partite/${id}/velluto/isolamento`).send({ possedutaId: jack.id, incenso: 'nirvana', giorni: 4, statistiche: ['magia'] })).body.data as EsitoIsolamentoDto;
    expect(iso.guadagno).toEqual({ applicazioni: 2, puntiPerStatistica: 6, totale: 6 });
    expect(iso.persona.statistiche.magia).toBe(Math.min(99, inc.ricevente.statistiche.magia + 6));
    expect(iso.skillAppresa?.nome).toBe('Dodge Fire');
    expect(iso.persona.skill.some((s) => s.nome === 'Dodge Fire')).toBe(true);
    expect(((await request(app).get(`/api/partite/${id}/storico?tipi=isolamento`)).body.data as StoricoDto).totale).toBe(1);
  });
});
