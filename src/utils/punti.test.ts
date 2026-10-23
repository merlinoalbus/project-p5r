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
  it('è il modulo del server: base × arcano × esame (solo i sette) × invito, interi a ogni passaggio', () => {
    expect(anteprimaPunti({ noteRisposta: 1 })).toBe(5);
    expect(anteprimaPunti({ noteRisposta: 1, bonusArcano: true })).toBe(7);
    expect(anteprimaPunti({ noteRisposta: 2, bonusArcano: true })).toBe(15);
    expect(anteprimaPunti({ noteRisposta: 3, bonusArcano: true })).toBe(22);
    expect(anteprimaPunti({ confidente: 'ryuji', regalo: true, bonusArcano: true, piazzamento: 'primi-10' })).toBe(90);
    expect(anteprimaPunti({ confidente: 'ryuji', uscita: true, piazzamento: 'primo', invito: true })).toBe(18);
    // l'esame non vale per chi non è fra i sette; dove il rango non sale a punti l'anteprima dice 0 (come il server)
    expect(anteprimaPunti({ confidente: 'takemi', noteRisposta: 1, piazzamento: 'primo' })).toBe(5);
    expect(anteprimaPunti({ confidente: 'yoshida', noteRisposta: 2, contaPunti: false })).toBe(0);
  });
});
