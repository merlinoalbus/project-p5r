// ============================================================
// Test API — compendio, traduzioni, partite, immagini (DB in memoria + seed reale)
// ============================================================

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { config } from '../config.js';
import { createApp } from '../bootstrap.js';
import type { PersonaDettaglioDto, PersonaPossedutaDto, PersonaRiassuntoDto, SkillDettaglioDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  // ---- Compendio ----
  it('GET /api/compendio/arcani → 24 arcani con nome italiano', async () => {
    const res = await request(app).get('/api/compendio/arcani');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(24);
    expect(res.body.data[0]).toMatchObject({ chiave: 'Fool', nome: 'Matto', ordine: 0, numero: 0 });
  });

  it('GET /api/compendio/glossario → sezioni tradotte', async () => {
    const res = await request(app).get('/api/compendio/glossario');
    expect(res.body.data.elementiSkill.fire).toBe('Fuoco');
    expect(res.body.data.affinita.wk).toEqual({ nome: 'Debole', sigla: 'Deb' });
    expect(res.body.data.statistiche.map((s: { sigla: string }) => s.sigla)).toEqual(['FR', 'MA', 'RS', 'AG', 'FO']);
    expect(res.body.data.dotiSociali).toHaveLength(5);
  });

  it('GET /api/compendio/persona con filtri e validazione', async () => {
    const tutti = await request(app).get('/api/compendio/persona');
    expect(tutti.body.data).toHaveLength(232);
    const p0 = tutti.body.data[0] as PersonaRiassuntoDto;
    expect(p0.affinita).toHaveLength(10);
    expect(p0.affinita[0]).toMatchObject({ elemento: 'phys', elementoNome: 'Fisico' });
    const filtrati = await request(app).get('/api/compendio/persona?arcana=Fool&livelloMax=20&dlc=false');
    expect(filtrati.status).toBe(200);
    for (const p of filtrati.body.data as PersonaRiassuntoDto[]) {
      expect(p.arcana).toBe('Fool');
      expect(p.livello).toBeLessThanOrEqual(20);
      expect(p.dlc).toBe(false);
    }
    const perSkill = await request(app).get('/api/compendio/persona?skill=Bufu');
    expect(perSkill.body.data.length).toBeGreaterThan(0);
    const errato = await request(app).get('/api/compendio/persona?livelloMin=abc');
    expect(errato.status).toBe(400);
    expect(errato.body.error.code).toBe('validation-error');
  });

  it('GET /api/compendio/persona/:id → scheda completa in italiano', async () => {
    const lista = await request(app).get('/api/compendio/persona?q=Jack%20Frost');
    const jf = (lista.body.data as PersonaRiassuntoDto[]).find((p) => p.nome === 'Jack Frost')!;
    const res = await request(app).get(`/api/compendio/persona/${jf.id}`);
    expect(res.status).toBe(200);
    const d = res.body.data as PersonaDettaglioDto;
    expect(d.arcanaNome).toBe('Mago');
    expect(d.skill.length).toBeGreaterThan(0);
    expect(d.skill[0].effettoNome).not.toBe(d.skill[0].effetto);
    expect(d.trattoDettaglio?.elemento).toBe('trait');
    expect(d.areeMementos.length).toBeGreaterThan(0);
    expect(d.areeMementos[0].nome).toMatch(/^Dedalo di/);
    expect(d.ingredienteDi.map((r) => r.risultato.nome)).toContain('Black Frost');
    const speciale = (await request(app).get('/api/compendio/persona?speciale=true')).body.data as PersonaRiassuntoDto[];
    const bf = (await request(app).get(`/api/compendio/persona/${speciale.find((p) => p.nome === 'Black Frost')!.id}`)).body.data as PersonaDettaglioDto;
    expect(bf.ricettaSpeciale?.ingredienti.map((i) => i.nome).sort()).toEqual(["Jack Frost", "Jack-o'-Lantern", 'King Frost'].sort());
    expect((await request(app).get('/api/compendio/persona/99999')).status).toBe(404);
  });

  it('GET /api/compendio/skill e /skill/:id', async () => {
    const lista = await request(app).get('/api/compendio/skill?elemento=fire');
    expect(lista.status).toBe(200);
    expect(lista.body.data.every((s: { elemento: string }) => s.elemento === 'fire')).toBe(true);
    const agi = lista.body.data.find((s: { nome: string }) => s.nome === 'Agi');
    expect(agi.costo).toEqual({ tipo: 'sp', valore: 4, testo: '4 SP' });
    expect(agi.effettoNome).toBe('Infligge danni di Fuoco lievi a 1 nemico.');
    const det = (await request(app).get(`/api/compendio/skill/${agi.id}`)).body.data as SkillDettaglioDto;
    expect(det.persone.length).toBeGreaterThan(0);
    expect(det.negoziazioneNome).toContain("(Jack-o'-Lantern)");
    const drain = await request(app).get('/api/compendio/skill?q=Drain%20Fire');
    expect(drain.body.data.some((s: { nome: string }) => s.nome === 'Drain Fire')).toBe(true);
  });

  it('GET /api/compendio/oggetti, /confidenti, /fusione/regole', async () => {
    const ogg = await request(app).get('/api/compendio/oggetti?categoria=Gun');
    expect(ogg.body.data.every((o: { categoriaNome: string }) => o.categoriaNome === 'Arma a distanza')).toBe(true);
    const conf = await request(app).get('/api/compendio/confidenti');
    expect(conf.body.data).toHaveLength(23);
    expect(conf.body.data[0]).toMatchObject({ chiave: 'igor', arcanaNome: 'Matto' });
    // Localizzazione italiana: nomi skill/Persona e glossario dei termini
    const cleave = ((await request(app).get('/api/compendio/skill?q=Cleave')).body.data as Array<{ nome: string; nomeIt: string }>).find((s) => s.nome === 'Cleave')!;
    expect(cleave.nomeIt).toBe('Fendente');
    const agi = ((await request(app).get('/api/compendio/skill?q=Agi')).body.data as Array<{ nome: string; nomeIt: string }>).find((s) => s.nome === 'Agi')!;
    expect(agi.nomeIt).toBe('Agi');
    const regent = ((await request(app).get('/api/compendio/persona?q=Regent')).body.data as Array<{ nome: string; nomeIt: string }>).find((p) => p.nome === 'Regent')!;
    expect(regent.nomeIt).toBe('Reggente');
    // 10.4: localizzazione completa — ricerca anche per nome italiano (senza accenti) e nomi dell'equipaggiamento
    const resistFire = ((await request(app).get('/api/compendio/skill?q=resiste fuoco')).body.data as Array<{ nome: string; nomeIt: string }>).find((s) => s.nome === 'Resist Fire')!;
    expect(resistFire.nomeIt).toBe('Resiste fuoco');
    const cerbero = ((await request(app).get('/api/compendio/persona?q=Cerbero')).body.data as Array<{ nome: string; nomeIt: string }>).find((p) => p.nome === 'Cerberus')!;
    expect(cerbero.nomeIt).toBe('Cerbero');
    const bastone = ((await request(app).get('/api/compendio/oggetti?q=bastone di ars')).body.data as Array<{ nome: string; nomeIt: string | null }>).find((o) => o.nome === "Arsène's Cane")!;
    expect(bastone.nomeIt).toBe('Bastone di Arsène');
    expect(((await request(app).get('/api/compendio/oggetti?q=Cane')).body.data as Array<{ nome: string }>).some((o) => o.nome === "Arsène's Cane")).toBe(true);
    const arsene = ((await request(app).get('/api/compendio/persona?q=Arsene')).body.data as PersonaRiassuntoDto[]).find((p) => p.nome === 'Arsène')!;
    const detArsene = (await request(app).get(`/api/compendio/persona/${arsene.id}`)).body.data as PersonaDettaglioDto;
    expect(detArsene).toMatchObject({ oggetto: "Arsène's Cane", oggettoNomeIt: 'Bastone di Arsène' });
    const termini = await request(app).get('/api/compendio/termini');
    expect(termini.body.data).toHaveLength(56);
    expect(termini.body.data.find((t: { chiave: string }) => t.chiave === 'Hold Up')).toMatchObject({ nome: 'Rapina', categoria: 'battaglia' });
    const regole = await request(app).get('/api/compendio/fusione/regole');
    expect(regole.body.data.tabella).toHaveLength(273);
    expect(regole.body.data.speciali).toHaveLength(24);
    expect(regole.body.data.tesori.nomi).toHaveLength(9);
    expect(regole.body.data.tesori.modificatori.Fool).toHaveLength(9);
  });

  // ---- Traduzioni ----
  it('traduzioni: elenco, modifica utente e ripristino dal seed', async () => {
    const ambiti = await request(app).get('/api/traduzioni/ambiti');
    expect(ambiti.body.data.find((a: { ambito: string }) => a.ambito === 'effettoSkill').voci).toBe(512);
    const mod = await request(app).put('/api/traduzioni/arcana/Fool').send({ testo: 'Il Folle' });
    expect(mod.status).toBe(200);
    expect(mod.body.data).toMatchObject({ testo: 'Il Folle', fonte: 'utente' });
    const arcani = await request(app).get('/api/compendio/arcani');
    expect(arcani.body.data[0].nome).toBe('Il Folle');
    const soloUtente = await request(app).get('/api/traduzioni?soloUtente=true');
    expect(soloUtente.body.data).toHaveLength(1);
    const rip = await request(app).delete('/api/traduzioni/arcana/Fool');
    expect(rip.body.data).toMatchObject({ testo: 'Matto', fonte: 'seed' });
    // Ripristino anche per gli ambiti della localizzazione (skill, persona, termine)
    for (const [ambito, chiave, seed] of [['skill', 'Cleave', 'Fendente'], ['persona', 'Regent', 'Reggente'], ['termine', 'Hold Up', 'Rapina']] as const) {
      expect((await request(app).put(`/api/traduzioni/${ambito}/${encodeURIComponent(chiave)}`).send({ testo: 'prova' })).body.data.testo).toBe('prova');
      const rip = await request(app).delete(`/api/traduzioni/${ambito}/${encodeURIComponent(chiave)}`);
      expect(rip.status).toBe(200);
      expect(rip.body.data).toMatchObject({ testo: seed, fonte: 'seed' });
    }
    expect((await request(app).put('/api/traduzioni/arcana/Inesistente').send({ testo: 'x' })).status).toBe(404);
    expect((await request(app).put('/api/traduzioni/arcana/Fool').send({ testo: '' })).status).toBe(400);
  });

  // ---- Partite ----
  it('partite: creazione, attiva unica, doti, confidenti, compendio, possedute, eliminazione', async () => {
    const p1 = await request(app).post('/api/partite').send({ nome: 'Prima partita' });
    expect(p1.status).toBe(201);
    expect(p1.body.data.attiva).toBe(true);
    const p2 = await request(app).post('/api/partite').send({ nome: 'Seconda', difficolta: 'difficile', nuovaPartitaPlus: true });
    expect(p2.body.data.attiva).toBe(false);
    const attiva = await request(app).post(`/api/partite/${p2.body.data.id}/attiva`);
    expect(attiva.body.data.attiva).toBe(true);
    expect((await request(app).get('/api/partite/attiva')).body.data.id).toBe(p2.body.data.id);
    expect((await request(app).get(`/api/partite/${p1.body.data.id}`)).body.data.attiva).toBe(false);
    expect((await request(app).post('/api/partite').send({ difficolta: 'x' })).status).toBe(400);

    const id = p2.body.data.id as number;
    // Doti sociali: 5 righe a zero, incremento e set
    const doti = await request(app).get(`/api/partite/${id}/doti`);
    expect(doti.body.data).toHaveLength(5);
    expect(doti.body.data.every((d: { punti: number }) => d.punti === 0)).toBe(true);
    const piu = await request(app).patch(`/api/partite/${id}/doti/fascino`).send({ delta: 3 });
    expect(piu.body.data.punti).toBe(3);
    const meno = await request(app).patch(`/api/partite/${id}/doti/fascino`).send({ delta: -10 });
    expect(meno.body.data.punti).toBe(0);
    const set = await request(app).patch(`/api/partite/${id}/doti/conoscenza`).send({ punti: 42 });
    // 42 punti = rango 2 «Diligente» (soglia 34); al rango 3 «Studioso» (82) mancano 40
    expect(set.body.data).toMatchObject({ chiave: 'conoscenza', nome: 'Conoscenza', punti: 42, rango: 2, nomeRango: 'Diligente', sogliaProssima: 82, mancanti: 40 });
    expect(set.body.data.ranghi).toHaveLength(5);
    // Note: 1 nota = 2, 2 note = 3, 3 note = 5 (7 con libro), ×1,5 per difetto con la fortuna
    expect((await request(app).patch(`/api/partite/${id}/doti/coraggio`).send({ note: 1 })).body.data.punti).toBe(2);
    expect((await request(app).patch(`/api/partite/${id}/doti/coraggio`).send({ note: 2 })).body.data.punti).toBe(5);
    expect((await request(app).patch(`/api/partite/${id}/doti/coraggio`).send({ note: 3 })).body.data.punti).toBe(10);
    expect((await request(app).patch(`/api/partite/${id}/doti/coraggio`).send({ note: 3, libro: true })).body.data.punti).toBe(17);
    const fortuna = await request(app).patch(`/api/partite/${id}/doti/coraggio`).send({ note: 2, fortuna: true });
    expect(fortuna.body.data.punti).toBe(21); // 17 + floor(3 × 1,5) = 17 + 4
    expect(fortuna.body.data).toMatchObject({ rango: 2, nomeRango: 'Audace', mancanti: 17 });
    const massimo = await request(app).patch(`/api/partite/${id}/doti/perizia`).send({ punti: 90 });
    expect(massimo.body.data).toMatchObject({ rango: 5, nomeRango: 'Migliore', sogliaProssima: null, mancanti: null });
    expect((await request(app).patch(`/api/partite/${id}/doti/inesistente`).send({ delta: 1 })).status).toBe(404);
    expect((await request(app).patch(`/api/partite/${id}/doti/fascino`).send({})).status).toBe(400);
    expect((await request(app).patch(`/api/partite/${id}/doti/fascino`).send({ note: 4 })).status).toBe(400);

    // Confidenti: 23 righe, rango implica sblocco
    const conf = await request(app).get(`/api/partite/${id}/confidenti`);
    expect(conf.body.data).toHaveLength(23);
    const ryuji = await request(app).put(`/api/partite/${id}/confidenti/ryuji`).send({ rango: 3 });
    // Ryuji al rango 3 ha bisogno di 30 punti per il rango 4
    expect(ryuji.body.data).toMatchObject({ chiave: 'ryuji', rango: 3, sbloccato: true, arcanaNome: 'Carro', punti: 0, puntiNecessari: 30, mancanti: 30 });
    // Note della risposta: 2 note = 10 punti base; con Persona dell'arcano ×1,5 → 15; regalo 50 × 1,5 × 1,2 (esame top 10) = 90
    const dueNote = await request(app).put(`/api/partite/${id}/confidenti/ryuji`).send({ noteRisposta: 2 });
    expect(dueNote.body.data).toMatchObject({ punti: 10, mancanti: 20, personaArcanoInScorta: false });
    const conArcano = await request(app).put(`/api/partite/${id}/confidenti/ryuji`).send({ noteRisposta: 1, bonusArcano: true });
    expect(conArcano.body.data).toMatchObject({ punti: 17.5, mancanti: 12.5 });
    const regalo = await request(app).put(`/api/partite/${id}/confidenti/ryuji`).send({ regalo: true, bonusArcano: true, esame: 'top10' });
    expect(regalo.body.data).toMatchObject({ punti: 107.5, mancanti: 0 });
    expect((await request(app).put(`/api/partite/${id}/confidenti/ryuji`).send({ noteRisposta: 1, regalo: true })).status).toBe(400);
    const corretto = await request(app).put(`/api/partite/${id}/confidenti/ryuji`).send({ deltaPunti: -100 });
    expect(corretto.body.data).toMatchObject({ punti: 7.5, mancanti: 22.5 });
    // al cambio di rango i punti ripartono da zero (nessun riporto dell'eccedenza)
    const salito = await request(app).put(`/api/partite/${id}/confidenti/ryuji`).send({ rango: 4 });
    expect(salito.body.data).toMatchObject({ rango: 4, punti: 0, puntiNecessari: 20 });
    // Confidenti a progressione non a punti: soglia nulla
    const igor = (conf.body.data as Array<{ chiave: string; puntiNecessari: number | null }>).find((c) => c.chiave === 'igor')!;
    expect(igor.puntiNecessari).toBeNull();
    expect((await request(app).put(`/api/partite/${id}/confidenti/ryuji`).send({ rango: 11 })).status).toBe(400);
    // Invariante: rango > 0 forza lo sblocco anche se il client manda sbloccato=false
    const forzato = await request(app).put(`/api/partite/${id}/confidenti/ryuji`).send({ sbloccato: false, rango: 5 });
    expect(forzato.body.data).toMatchObject({ sbloccato: true, rango: 5 });
    const bloccato = await request(app).put(`/api/partite/${id}/confidenti/ryuji`).send({ sbloccato: false, rango: 0 });
    expect(bloccato.body.data).toMatchObject({ sbloccato: false, rango: 0 });

    // Persona posseduta: aggiunta con skill automatiche, registrazione nel compendio, duplicato rifiutato
    const jf = ((await request(app).get('/api/compendio/persona?q=Jack%20Frost')).body.data as PersonaRiassuntoDto[]).find((p) => p.nome === 'Jack Frost')!;
    const agg = await request(app).post(`/api/partite/${id}/persona`).send({ personaId: jf.id, livello: 15 });
    expect(agg.status).toBe(201);
    // Jack Frost è del Mago: Morgana ottiene il bonus ×1,5 (Persona dello stesso arcano in scorta), Ryuji (Carro) no
    const dopoScorta = (await request(app).get(`/api/partite/${id}/confidenti`)).body.data as Array<{ chiave: string; personaArcanoInScorta: boolean }>;
    expect(dopoScorta.find((c) => c.chiave === 'morgana')!.personaArcanoInScorta).toBe(true);
    expect(dopoScorta.find((c) => c.chiave === 'ryuji')!.personaArcanoInScorta).toBe(false);
    const poss = agg.body.data as PersonaPossedutaDto;
    expect(poss.skill.length).toBeGreaterThan(0);
    expect(poss.skill.length).toBeLessThanOrEqual(8);
    expect(poss.statisticheBase).toBe(true);
    // statistiche stimate al livello 15 (base al livello 11): +3 punti per livello → +12 sul totale
    const sommaBase = Object.values(poss.statisticheBaseLivello).reduce((a, b) => a + b, 0);
    const sommaStimata = Object.values(poss.statistiche).reduce((a, b) => a + b, 0);
    expect(sommaStimata - sommaBase).toBe(12);
    expect(poss.tratto?.elemento).toBe('trait');
    expect((await request(app).post(`/api/partite/${id}/persona`).send({ personaId: jf.id })).status).toBe(409);
    const comp = await request(app).get(`/api/partite/${id}/compendio`);
    expect(comp.body.data).toHaveLength(1);
    expect(comp.body.data[0]).toMatchObject({ nome: 'Jack Frost', registrata: true, livelloRegistrato: 15 });
    // aggiornamento: livello, bonus per statistica (si sommano alla stima del livello), skill esplicite
    const bufu = (await request(app).get('/api/compendio/skill?q=Bufu')).body.data.find((s: { nome: string }) => s.nome === 'Bufu');
    const upd = await request(app).put(`/api/partite/${id}/persona/${poss.id}`).send({ livello: 20, bonus: { forza: 0, magia: 5, resistenza: 0, agilita: 0, fortuna: 0 }, skillIds: [bufu.id] });
    const aggiornata = upd.body.data as PersonaPossedutaDto;
    expect(aggiornata).toMatchObject({ livello: 20, statisticheBase: false, bonus: { magia: 5 } });
    expect(aggiornata.statistiche.magia).toBe(aggiornata.statisticheStimate.magia + 5);
    expect(aggiornata.skill).toHaveLength(1);
    // il compendio NON segue i cambiamenti finché non si registra (istantanea alla registrazione)
    expect((await request(app).get(`/api/partite/${id}/compendio`)).body.data[0]).toMatchObject({ livelloRegistrato: 15, bonus: { magia: 0 } });
    const reg = await request(app).post(`/api/partite/${id}/persona/${poss.id}/registra`);
    expect(reg.status).toBe(200);
    expect(reg.body.data[0]).toMatchObject({ livelloRegistrato: 20, bonus: { magia: 5 }, carica: false });
    expect(reg.body.data[0].skill.map((x: { id: number }) => x.id)).toEqual([bufu.id]);
    // il bonus resta quando la Persona sale di livello: le statistiche seguono la stima
    const liv25 = (await request(app).put(`/api/partite/${id}/persona/${poss.id}`).send({ livello: 25 })).body.data as PersonaPossedutaDto;
    expect(liv25.bonus.magia).toBe(5);
    expect(liv25.statistiche.magia).toBe(liv25.statisticheStimate.magia + 5);
    expect(liv25.statisticheStimate.magia).toBeGreaterThanOrEqual(aggiornata.statisticheStimate.magia);
    expect((await request(app).put(`/api/partite/${id}/persona/${poss.id}`).send({ skillIds: [bufu.id, bufu.id] })).status).toBe(400);
    // rimozione dalla scorta: il compendio resta
    expect((await request(app).delete(`/api/partite/${id}/persona/${poss.id}`)).status).toBe(204);
    expect((await request(app).get(`/api/partite/${id}/persona`)).body.data).toHaveLength(0);
    expect((await request(app).get(`/api/partite/${id}/compendio`)).body.data).toHaveLength(1);
    // evocazione dal Registro: ripristina l'istantanea (livello 20, bonus magia +5, skill Bufu); il compendio resta invariato
    const evocata = await request(app).post(`/api/partite/${id}/persona`).send({ personaId: jf.id, daRegistro: true, origine: 'evocazione dal Registro' });
    expect(evocata.status).toBe(201);
    expect(evocata.body.data).toMatchObject({ livello: 20, bonus: { magia: 5 } });
    expect((evocata.body.data as PersonaPossedutaDto).skill.map((x) => x.id)).toEqual([bufu.id]);
    expect((await request(app).get(`/api/partite/${id}/compendio`)).body.data[0]).toMatchObject({ livelloRegistrato: 20 });
    expect((await request(app).delete(`/api/partite/${id}/persona/${evocata.body.data.id}`)).status).toBe(204);
    // evocare una Persona non registrata è un errore
    const pixie = ((await request(app).get('/api/compendio/persona?q=Pixie')).body.data as PersonaRiassuntoDto[]).find((p) => p.nome === 'Pixie')!;
    expect((await request(app).post(`/api/partite/${id}/persona`).send({ personaId: pixie.id, daRegistro: true })).status).toBe(400);
    const dereg = await request(app).put(`/api/partite/${id}/compendio/${jf.id}`).send({ registrata: false });
    expect(dereg.body.data).toHaveLength(0);

    // Eliminazione della partita attiva: l'altra viene promossa
    expect((await request(app).delete(`/api/partite/${id}`)).status).toBe(204);
    expect((await request(app).get('/api/partite/attiva')).body.data.id).toBe(p1.body.data.id);
    expect((await request(app).get(`/api/partite/${id}/doti`)).status).toBe(404);
  });

  // ---- Immagini ----
  it('immagini: caricamento grezzo, lettura file, sostituzione, eliminazione', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-img-'));
    const originale = config.dataDir;
    (config as { dataDir: string }).dataDir = dataDir;
    try {
      const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
      const up = await request(app).put('/api/immagini/arcana/Fool').set('Content-Type', 'image/png').send(png);
      expect(up.status).toBe(201);
      expect(up.body.data).toMatchObject({ ambito: 'arcana', chiave: 'Fool', mime: 'image/png', byte: png.length });
      const file = await request(app).get('/api/immagini/arcana/Fool/file');
      expect(file.status).toBe(200);
      expect(file.headers['content-type']).toContain('image/png');
      expect(Buffer.from(file.body).equals(png)).toBe(true);
      const lista = await request(app).get('/api/immagini?ambito=arcana');
      expect(lista.body.data).toHaveLength(1);
      // rimozione multipla per ambito e globale (12.1)
      expect((await request(app).put('/api/immagini/persona/Pixie').set('Content-Type', 'image/png').send(png)).status).toBe(201);
      expect((await request(app).delete('/api/immagini?ambito=arcana')).body.data).toEqual({ eliminate: 1 });
      expect((await request(app).get('/api/immagini?ambito=arcana')).body.data).toHaveLength(0);
      expect((await request(app).get('/api/immagini?ambito=persona')).body.data).toHaveLength(1);
      expect((await request(app).delete('/api/immagini')).body.data).toEqual({ eliminate: 1 });
      expect((await request(app).get('/api/immagini')).body.data).toHaveLength(0);
      expect(fs.readdirSync(path.join(dataDir, 'immagini', 'persona'))).toHaveLength(0);
      const sost = await request(app).put('/api/immagini/arcana/Fool').set('Content-Type', 'image/webp').send(Buffer.from('RIFF'));
      expect(sost.body.data.mime).toBe('image/webp');
      expect(fs.readdirSync(path.join(dataDir, 'immagini', 'arcana'))).toHaveLength(1);
      expect((await request(app).put('/api/immagini/arcana/Fool').set('Content-Type', 'text/plain').send('ciao')).status).toBe(400);
      const grande = await request(app).put('/api/immagini/arcana/Grande').set('Content-Type', 'image/png').send(Buffer.alloc(9 * 1024 * 1024, 1));
      expect(grande.status).toBe(413);
      expect(grande.body.error.code).toBe('corpo-troppo-grande');
      expect(grande.body.error.message).toMatch(/dimensione massima consentita \(massimo 8 MB\)/);
      expect((await request(app).put('/api/immagini/pippo/Fool').set('Content-Type', 'image/png').send(png)).status).toBe(400);
      expect((await request(app).delete('/api/immagini/arcana/Fool')).status).toBe(204);
      expect((await request(app).get('/api/immagini/arcana/Fool')).status).toBe(404);
      expect(fs.readdirSync(path.join(dataDir, 'immagini', 'arcana'))).toHaveLength(0);
    } finally {
      (config as { dataDir: string }).dataDir = originale;
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it('immagini: importazione da URL (successo, formato rifiutato, 404 remoto, URL non http)', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-url-'));
    const originale = config.dataDir;
    (config as { dataDir: string }).dataDir = dataDir;
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    // Server HTTP locale che simula la sorgente remota.
    const server = http.createServer((req, res) => {
      if (req.url === '/carta.png') { res.writeHead(200, { 'Content-Type': 'image/png; charset=binary' }); res.end(png); return; }
      if (req.url === '/pagina.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<html></html>'); return; }
      if (req.url === '/redirect') { res.writeHead(302, { Location: '/carta.png' }); res.end(); return; }
      res.writeHead(404); res.end();
    });
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', () => ok()));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const ok = await request(app).post('/api/immagini/confidente/ryuji/da-url').send({ url: `${base}/carta.png` });
      expect(ok.status).toBe(201);
      expect(ok.body.data).toMatchObject({ ambito: 'confidente', chiave: 'ryuji', mime: 'image/png', byte: png.length });
      expect(fs.readdirSync(path.join(dataDir, 'immagini', 'confidente'))).toHaveLength(1);
      // i redirect vengono seguiti e il file precedente sostituito (un solo file su disco)
      const redir = await request(app).post('/api/immagini/confidente/ryuji/da-url').send({ url: `${base}/redirect` });
      expect(redir.status).toBe(201);
      expect(fs.readdirSync(path.join(dataDir, 'immagini', 'confidente'))).toHaveLength(1);
      const html = await request(app).post('/api/immagini/confidente/ann/da-url').send({ url: `${base}/pagina.html` });
      expect(html.status).toBe(400);
      expect(html.body.error.code).toBe('formato-non-ammesso');
      const manca = await request(app).post('/api/immagini/confidente/ann/da-url').send({ url: `${base}/nulla.png` });
      expect(manca.status).toBe(400);
      expect(manca.body.error).toMatchObject({ code: 'download-fallito' });
      expect(manca.body.error.message).toMatch(/404/);
      const ftp = await request(app).post('/api/immagini/confidente/ann/da-url').send({ url: 'ftp://esempio.it/a.png' });
      expect(ftp.status).toBe(400);
      expect(ftp.body.error.code).toBe('url-non-valido');
      expect((await request(app).post('/api/immagini/confidente/ann/da-url').send({ url: 'non-un-url' })).status).toBe(400);
      // nessun file orfano per i tentativi falliti
      expect(fs.readdirSync(path.join(dataDir, 'immagini', 'confidente'))).toHaveLength(1);
    } finally {
      await new Promise<void>((ok) => server.close(() => ok()));
      (config as { dataDir: string }).dataDir = originale;
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
