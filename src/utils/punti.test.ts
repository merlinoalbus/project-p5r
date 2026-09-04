// ============================================================
// Test punti — formato italiano e anteprima dei punti Confidente
// ============================================================

import { anteprimaPunti, formattaPunti } from './punti';

describe('formattaPunti', () => {
  it('mostra interi senza decimali e frazioni con la virgola', () => {
    expect(formattaPunti(10)).toBe('10');
    expect(formattaPunti(7.5)).toBe('7,5');
    expect(formattaPunti(22.5)).toBe('22,5');
    expect(formattaPunti(107.5)).toBe('107,5');
  });
});

describe('anteprimaPunti', () => {
  it('replica la formula del backend: base × arcano × esami × invito, ai centesimi', () => {
    expect(anteprimaPunti(5, false, null, false)).toBe(5);
    expect(anteprimaPunti(5, true, null, false)).toBe(7.5);
    expect(anteprimaPunti(10, true, null, false)).toBe(15);
    expect(anteprimaPunti(15, true, null, false)).toBe(22.5);
    expect(anteprimaPunti(50, true, 'top10', false)).toBe(90);
    expect(anteprimaPunti(10, false, 'primo', true)).toBe(18);
    expect(anteprimaPunti(5, true, 'primo', true)).toBe(13.5);
  });
});
