// ============================================================
// Test partiteService — funzioni pure delle meccaniche di gioco (note → punti, ranghi)
// ============================================================

import { progressoDote, puntiConfidente, puntiDaNote } from './partiteService.js';

describe('puntiDaNote (Doti sociali)', () => {
  it('1♪=2, 2♪=3, 3♪=5, libro 7, fortuna ×1,5 per difetto', () => {
    expect(puntiDaNote(1)).toBe(2);
    expect(puntiDaNote(2)).toBe(3);
    expect(puntiDaNote(3)).toBe(5);
    expect(puntiDaNote(3, true)).toBe(7);
    expect(puntiDaNote(1, false, true)).toBe(3);
    expect(puntiDaNote(2, false, true)).toBe(4);
    expect(puntiDaNote(3, false, true)).toBe(7);
    expect(puntiDaNote(3, true, true)).toBe(10);
    // il libro conta solo con 3 note
    expect(puntiDaNote(1, true)).toBe(2);
  });
});

describe('progressoDote', () => {
  const ranghi = [
    { rango: 1, nome: 'Pavido', soglia: 0 },
    { rango: 2, nome: 'Audace', soglia: 11 },
    { rango: 3, nome: 'Coraggioso', soglia: 38 },
    { rango: 4, nome: 'Temerario', soglia: 68 },
    { rango: 5, nome: 'Cuor di leone', soglia: 113 },
  ];
  it('individua il rango dalla soglia e la distanza dal successivo', () => {
    expect(progressoDote(0, ranghi)).toEqual({ rango: 1, nomeRango: 'Pavido', sogliaProssima: 11, mancanti: 11 });
    expect(progressoDote(10, ranghi)).toEqual({ rango: 1, nomeRango: 'Pavido', sogliaProssima: 11, mancanti: 1 });
    expect(progressoDote(11, ranghi)).toEqual({ rango: 2, nomeRango: 'Audace', sogliaProssima: 38, mancanti: 27 });
    expect(progressoDote(112, ranghi)).toEqual({ rango: 4, nomeRango: 'Temerario', sogliaProssima: 113, mancanti: 1 });
    expect(progressoDote(113, ranghi)).toEqual({ rango: 5, nomeRango: 'Cuor di leone', sogliaProssima: null, mancanti: null });
    expect(progressoDote(500, ranghi)).toMatchObject({ rango: 5, mancanti: null });
  });
  it('senza ranghi resta al rango 1 senza soglie', () => {
    expect(progressoDote(40, [])).toEqual({ rango: 1, nomeRango: '', sogliaProssima: null, mancanti: null });
  });
});

describe('puntiConfidente', () => {
  it('note 5/10/15, regalo 50, uscita 10, nessuna sorgente = 0', () => {
    expect(puntiConfidente({ noteRisposta: 1 })).toBe(5);
    expect(puntiConfidente({ noteRisposta: 2 })).toBe(10);
    expect(puntiConfidente({ noteRisposta: 3 })).toBe(15);
    expect(puntiConfidente({ regalo: true })).toBe(50);
    expect(puntiConfidente({ uscita: true })).toBe(10);
    expect(puntiConfidente({})).toBe(0);
    expect(puntiConfidente({ bonusArcano: true, esame: 'primo', invito: true })).toBe(0);
  });
  it('moltiplicatori cumulativi con arrotondamento ai centesimi', () => {
    expect(puntiConfidente({ noteRisposta: 1, bonusArcano: true })).toBe(7.5);
    expect(puntiConfidente({ noteRisposta: 3, bonusArcano: true })).toBe(22.5);
    expect(puntiConfidente({ noteRisposta: 2, esame: 'top10' })).toBe(12);
    expect(puntiConfidente({ noteRisposta: 2, esame: 'primo' })).toBe(15);
    expect(puntiConfidente({ noteRisposta: 2, invito: true })).toBe(12);
    expect(puntiConfidente({ regalo: true, bonusArcano: true, esame: 'top10' })).toBe(90);
    expect(puntiConfidente({ noteRisposta: 1, bonusArcano: true, esame: 'primo', invito: true })).toBe(13.5);
    expect(puntiConfidente({ noteRisposta: 1, esame: 'top10', invito: true })).toBe(7.2);
  });
});
