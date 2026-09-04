// ============================================================
// Test statistichePerLivello — +3 punti per livello in proporzione alle statistiche base
// ============================================================

import { PUNTI_PER_LIVELLO, statistichePerLivello, totaleStatistiche } from './statistiche.js';

const arsene = { forza: 2, magia: 2, resistenza: 2, agilita: 3, fortuna: 1 }; // livello 1

describe('statistichePerLivello', () => {
  it('al livello base (o sotto) restituisce le statistiche base', () => {
    expect(statistichePerLivello(arsene, 1, 1)).toEqual(arsene);
    expect(statistichePerLivello(arsene, 5, 3)).toEqual(arsene);
  });

  it('aggiunge esattamente 3 punti per livello, ripartiti in proporzione', () => {
    const l2 = statistichePerLivello(arsene, 1, 2);
    expect(totaleStatistiche(l2) - totaleStatistiche(arsene)).toBe(PUNTI_PER_LIVELLO);
    const l11 = statistichePerLivello(arsene, 1, 11);
    expect(totaleStatistiche(l11)).toBe(10 + 30);
    // la statistica più alta (agilità) riceve di più, la più bassa (fortuna) di meno
    expect(l11.agilita).toBeGreaterThan(l11.fortuna);
    expect(l11.agilita - arsene.agilita).toBe(9);
    expect(l11.fortuna - arsene.fortuna).toBe(3);
  });

  it('non supera il tetto di 99 e resta deterministica', () => {
    const alto = { forza: 95, magia: 90, resistenza: 80, agilita: 70, fortuna: 60 };
    const l99 = statistichePerLivello(alto, 80, 99);
    expect(Math.max(...Object.values(l99))).toBeLessThanOrEqual(99);
    expect(statistichePerLivello(alto, 80, 99)).toEqual(l99);
  });

  it('con statistiche base tutte a zero ripartisce comunque senza errori', () => {
    const zero = { forza: 0, magia: 0, resistenza: 0, agilita: 0, fortuna: 0 };
    const l3 = statistichePerLivello(zero, 1, 3);
    expect(totaleStatistiche(l3)).toBe(6);
    expect(Math.max(...Object.values(l3)) - Math.min(...Object.values(l3))).toBeLessThanOrEqual(1);
  });
});
