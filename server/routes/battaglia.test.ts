// ============================================================
// Test API aiuto in battaglia (Fase 7.3) — seed, sezioni, indice delle Ombre con collegamento alle Persona
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { BattagliaDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API aiuto in battaglia', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('sezioni della guida: negoziazione (4 personalità), tecnico (11 stati), Staffetta (3 ranghi), 8 Speciali, Ombre sciagura, Mietitore, 9 Demoni del Tesoro', async () => {
    const res = await request(app).get('/api/compendio/battaglia');
    expect(res.status).toBe(200);
    const d = res.body.data as BattagliaDto;
    expect(d.negoziazione.personalita.map((p) => p.nome)).toEqual(['Giocosa', 'Timida', 'Irritabile', 'Cupa']);
    expect(d.negoziazione.personalita.every((p) => p.risposteEfficaci.length > 0 && p.risposteDaEvitare.length > 0)).toBe(true);
    expect(d.negoziazione.opzioniHoldUp).toHaveLength(3);
    expect(d.tecnico.stati).toHaveLength(11);
    expect(d.tecnico.stati.find((s) => s.stato === 'Congelamento')?.elementi).toContain('Nucleare');
    expect(d.sistema.statiAlterati.length).toBeGreaterThanOrEqual(11);
    expect(d.staffetta.ranghi).toHaveLength(3);
    expect(d.speciali.elenco).toHaveLength(8);
    expect(d.speciali.elenco[0]).toMatchObject({ nome: 'Via col piombo', personaggi: ['Morgana', 'Ann'] });
    expect(d.ombreSciagura.caratteristiche.length).toBeGreaterThan(0);
    expect(d.mietitore.strategia.length).toBeGreaterThan(0);
    expect(d.demoniTesoro.elenco).toHaveLength(9);
    expect(d.demoniTesoro.elenco[0]).toMatchObject({ nome: 'Reggente', livello: 10, arcano: 'Imperatore' });
    for (const u of [d.tecnico.urlFonte, d.staffetta.urlFonte, d.speciali.urlFonte, d.ombreSciagura.urlFonte, d.mietitore.urlFonte, d.demoniTesoro.urlFonte, ...d.negoziazione.urlFonti]) expect(u.startsWith('https://www.allgamestaff.it/')).toBe(true);
  });

  it('indice delle Ombre: tutti i dungeon coperti, debolezze e personalità, maschere collegate alle Persona del compendio', async () => {
    const d = (await request(app).get('/api/compendio/battaglia')).body.data as BattagliaDto;
    expect(d.ombre.length).toBeGreaterThan(200);
    const dungeons = new Set(d.ombre.map((o) => o.dungeonChiave));
    for (const k of ['kamoshida', 'madarame', 'kaneshiro', 'futaba', 'okumura', 'niijima', 'shido', 'iweleth', 'maruki', 'mementos']) expect(dungeons.has(k)).toBe(true);
    const bicorno = d.ombre.find((o) => o.dungeonChiave === 'kamoshida' && o.persona === 'Bicorno')!;
    expect(bicorno).toMatchObject({ ombra: 'Bestia bicorne sporca', debolezze: ['Tuono'], personalita: 'Cupa' });
    expect(bicorno.personaCollegata?.nome).toBe('Bicorn');
    const arahabaki = d.ombre.find((o) => o.dungeonChiave === 'okumura' && o.persona === 'Arahabaki')!;
    expect(arahabaki.debolezze).toEqual(['Psicocinesi', 'Nucleare']);
    expect(arahabaki.personaCollegata?.id).toBeGreaterThan(0);
    const mementos = d.ombre.filter((o) => o.dungeonChiave === 'mementos');
    expect(mementos.length).toBeGreaterThan(100);
    expect(mementos.every((o) => o.areaChiave !== null && o.fonte.startsWith('http'))).toBe(true);
    const collegate = d.ombre.filter((o) => o.personaCollegata).length;
    expect(collegate / d.ombre.length).toBeGreaterThan(0.8);
    // chiavi uniche per dungeon + persona/ombra
    const chiavi = d.ombre.map((o) => `${o.dungeonChiave}/${(o.persona ?? o.ombra ?? '').toLowerCase()}`);
    expect(new Set(chiavi).size).toBe(chiavi.length);
  });
});
