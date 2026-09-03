// ============================================================
// Test normalizzatore — funzioni pure + dataset reale in data/seed/sorgenti
// ============================================================

import fs from 'node:fs';
import {
  caricaDatiGrezzi,
  normalizzaFusione,
  normalizzaOggetto,
  normalizzaPersona,
  normalizzaSkill,
  traduciPiani,
} from './normalizzaDataset.js';
import { percorsoSorgente } from './percorsi.js';
import { FONTE_CHINHODADO } from './fonti.js';

describe('traduciPiani', () => {
  it('traduce le notazioni dei piani di Mementos', () => {
    expect(traduciPiani(undefined)).toBeNull();
    expect(traduciPiani('All')).toBe('tutti i piani');
    expect(traduciPiani('L6 & 7')).toBe('piano 6 e 7');
    expect(traduciPiani('L13 (after Palace 7)')).toBe('piano 13 (dopo il Palazzo 7)');
    expect(traduciPiani('L5, 7-9 (before Palace 7) / L3 & 4 (after Palace 7)')).toBe(
      'piano 5, 7-9 (prima del Palazzo 7) / piano 3 e 4 (dopo il Palazzo 7)',
    );
    expect(traduciPiani('Any / L1')).toBe('qualsiasi piano / piano 1');
    expect(traduciPiani('???')).toBe('sconosciuto');
  });
});

describe('normalizzaSkill', () => {
  it('converte il costo: <100 = % HP, ≥100 = SP/100, passive/tratti = nessuno', () => {
    expect(normalizzaSkill('Lunge', { effect: 'x', element: 'phys', cost: 5 }).costo).toEqual({ tipo: 'hp', valore: 5 });
    expect(normalizzaSkill('Agi', { effect: 'x', element: 'fire', cost: 400 }).costo).toEqual({ tipo: 'sp', valore: 4 });
    expect(normalizzaSkill('Absorb Fire', { effect: 'x', element: 'passive' }).costo).toEqual({ tipo: 'nessuno', valore: 0 });
    expect(normalizzaSkill('Tratto', { effect: 'x', element: 'trait', cost: 100 }).costo).toEqual({ tipo: 'nessuno', valore: 0 });
  });

  it('rifiuta elementi sconosciuti', () => {
    expect(() => normalizzaSkill('X', { effect: 'x', element: 'acqua' })).toThrow(/elemento sconosciuto/);
  });
});

describe('normalizzaOggetto', () => {
  it('scompone categoria e vincolo', () => {
    expect(normalizzaOggetto('A', { type: 'Accessory', description: 'd' })).toEqual({ nome: 'A', categoria: 'Accessory', vincolo: null, descrizione: 'd' });
    expect(normalizzaOggetto('B', { type: 'Gun - Ann only', description: 'd' })).toEqual({ nome: 'B', categoria: 'Gun', vincolo: 'Ann', descrizione: 'd' });
    expect(normalizzaOggetto('C', { type: 'Protector - Women only', description: 'd' }).vincolo).toBe('Women');
  });

  it('rifiuta categorie o vincoli sconosciuti', () => {
    expect(() => normalizzaOggetto('X', { type: 'Hat', description: 'd' })).toThrow(/categoria sconosciuta/);
    expect(() => normalizzaOggetto('X', { type: 'Gun - Pippo only', description: 'd' })).toThrow(/vincolo sconosciuto/);
  });
});

describe('normalizzaPersona', () => {
  const base = {
    item: 'i', itemr: 'ir', level: 10, arcana: 'Fool', elems: ['-', '-', 'wk', '-', 'rs', '-', '-', '-', 'nu', 'ab'],
    skills: { Agi: 0, Dia: 3, Cleave: 2 }, stats: [1, 2, 3, 4, 5], trait: 't', inherits: 'Fire', area: 'Qimranut / Aiyatsbus', floor: 'L1-4',
  };

  it('normalizza statistiche, skill ordinate per livello e aree', () => {
    const p = normalizzaPersona('Test', base);
    expect(p.statistiche).toEqual({ forza: 1, magia: 2, resistenza: 3, agilita: 4, fortuna: 5 });
    expect(p.skill.map((s) => s.nome)).toEqual(['Agi', 'Cleave', 'Dia']);
    expect(p.areeMementos).toEqual(['Qimranut', 'Aiyatsbus']);
    expect(p.pianiMementos).toBe('piano 1-4');
    expect(p.eredita).toBe('Fire');
    expect(p.rara).toBe(false);
  });

  it('rifiuta arcani, affinità e aree sconosciuti e l’eredità mancante sui non rari', () => {
    expect(() => normalizzaPersona('X', { ...base, arcana: 'Pippo' })).toThrow(/arcana sconosciuto/);
    expect(() => normalizzaPersona('X', { ...base, elems: [...base.elems.slice(0, 9), 'zz'] })).toThrow(/codice affinità/);
    expect(() => normalizzaPersona('X', { ...base, area: 'Narnia' })).toThrow(/area Mementos/);
    expect(() => normalizzaPersona('X', { ...base, inherits: undefined })).toThrow(/eredità mancante/);
    expect(normalizzaPersona('X', { ...base, inherits: undefined, rare: true }).eredita).toBeNull();
  });
});

const sorgentiPresenti = fs.existsSync(percorsoSorgente(FONTE_CHINHODADO.id, 'data/PersonaDataRoyal.ts'));

describe.skipIf(!sorgentiPresenti)('dataset reale (data/seed/sorgenti)', () => {
  it('carica 232 Persona, 525 skill, 223 oggetti, 24 ricette, 9 tesori e 273 coppie di arcani', () => {
    const g = caricaDatiGrezzi();
    expect(Object.keys(g.personaMapRoyal)).toHaveLength(232);
    expect(Object.keys(g.skillMapRoyal)).toHaveLength(525);
    expect(Object.keys(g.itemMapRoyal)).toHaveLength(223);
    const f = normalizzaFusione(g);
    expect(f.speciali).toHaveLength(24);
    expect(f.tesori.nomi).toHaveLength(9);
    expect(f.tabella).toHaveLength(273);
    expect(f.eredita.tipi).toHaveLength(12);
    expect(Object.keys(f.tesori.modificatori)).toHaveLength(24);
  });

  it('ogni Persona e ogni skill del dataset reale si normalizzano senza errori', () => {
    const g = caricaDatiGrezzi();
    for (const [n, p] of Object.entries(g.personaMapRoyal)) expect(() => normalizzaPersona(n, p)).not.toThrow();
    for (const [n, s] of Object.entries(g.skillMapRoyal)) expect(() => normalizzaSkill(n, s)).not.toThrow();
    for (const [n, o] of Object.entries(g.itemMapRoyal)) expect(() => normalizzaOggetto(n, o)).not.toThrow();
  });
});
