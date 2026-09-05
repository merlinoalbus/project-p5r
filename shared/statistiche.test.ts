// ============================================================
// Test statistichePerLivello — +3 punti per livello in proporzione alle statistiche base
// ============================================================

import { PUNTI_PER_LIVELLO, origineStima, statistichePerLivello, statisticheStimate, totaleStatistiche } from './statistiche.js';

const arsene = { forza: 2, magia: 2, resistenza: 2, agilita: 3, fortuna: 1 }; // livello 1

describe('statisticheStimate con i valori reali osservati (15.26)', () => {
  // Arsène al livello 2 nel gioco dell'utente: FR 4, MA 2, RS 2, AG 4, FO 1 (la stima dalla base dava 3/3/2/4/1)
  const reali = { livello: 2, forza: 4, magia: 2, resistenza: 2, agilita: 4, fortuna: 1 };

  it('senza valori reali la stima parte dalla base del dataset', () => {
    expect(origineStima(null, 2)).toBe('base');
    expect(statisticheStimate(arsene, 1, null, 2)).toEqual(statistichePerLivello(arsene, 1, 2));
    expect(statisticheStimate(arsene, 1, null, 2)).toEqual({ forza: 3, magia: 3, resistenza: 2, agilita: 4, fortuna: 1 });
  });

  it('al livello registrato restituisce esattamente i valori reali; da lì in su riparte da loro (+3 per livello, in proporzione ai valori reali)', () => {
    expect(origineStima(reali, 2)).toBe('osservate');
    expect(statisticheStimate(arsene, 1, reali, 2)).toEqual({ forza: 4, magia: 2, resistenza: 2, agilita: 4, fortuna: 1 });
    const l3 = statisticheStimate(arsene, 1, reali, 3);
    expect(totaleStatistiche(l3)).toBe(13 + PUNTI_PER_LIVELLO);
    // la forza (4) ora cresce almeno quanto la magia (2): la ripartizione segue i valori reali, non più la base
    expect(l3.forza - reali.forza).toBeGreaterThanOrEqual(l3.magia - reali.magia);
    expect(l3.forza).toBeGreaterThanOrEqual(4);
  });

  it('sotto il livello registrato (una Persona non scende di livello, ma l’utente può correggere) torna alla base del dataset', () => {
    expect(origineStima(reali, 1)).toBe('base');
    expect(statisticheStimate(arsene, 1, reali, 1)).toEqual(arsene);
  });
});

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
