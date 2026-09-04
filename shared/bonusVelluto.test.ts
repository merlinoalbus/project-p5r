// ============================================================
// Test bonusVelluto — sconti del Registro, EXP del Confidente, Forca, Isolamento, Gemelle
// ============================================================

import {
  FORCA_INCIDENTE_BONUS, INCENSI, bonusLivelliFusione, puntiAllarmeFusione, giorniIsolamento, guadagnoIncenso, moltiplicatoreExpConfidente, moltiplicatoreForca, prezzoScontato, sblocchiGemelle, scontoRegistro, tierResistenza,
} from './bonusVelluto.js';

describe('sconto del Registro', () => {
  it('soglie 25/50/75/100 → 10/15/25/50 %', () => {
    expect(scontoRegistro(0)).toBe(0);
    expect(scontoRegistro(24.9)).toBe(0);
    expect(scontoRegistro(25)).toBe(10);
    expect(scontoRegistro(49)).toBe(10);
    expect(scontoRegistro(50)).toBe(15);
    expect(scontoRegistro(75)).toBe(25);
    expect(scontoRegistro(100)).toBe(50);
    expect(prezzoScontato(2300, 15)).toBe(1955);
    expect(prezzoScontato(2300, 0)).toBe(2300);
  });
});

describe('EXP del Confidente', () => {
  it('tabella per rango con estremi bloccati', () => {
    expect(moltiplicatoreExpConfidente(0)).toBe(1);
    expect(moltiplicatoreExpConfidente(5)).toBe(2);
    expect(moltiplicatoreExpConfidente(10)).toBe(3);
    expect(moltiplicatoreExpConfidente(12)).toBe(3);
    expect(moltiplicatoreExpConfidente(-1)).toBe(1);
  });
});

describe('bonus di livello alla fusione', () => {
  it("tabella per fase del Matto e rango dell'arcano", () => {
    expect(bonusLivelliFusione(3, 0)).toMatchObject({ min: 0, max: 0 });
    expect(bonusLivelliFusione(3, 2)).toMatchObject({ min: 1, max: 2 });
    expect(bonusLivelliFusione(5, 5)).toMatchObject({ min: 2, max: 2 });
    expect(bonusLivelliFusione(7, 5)).toMatchObject({ min: 3, max: 3 });
    expect(bonusLivelliFusione(9, 10)).toMatchObject({ min: 4, max: 4 });
    expect(bonusLivelliFusione(10, 10)).toMatchObject({ min: 5, max: 6 });
    expect(bonusLivelliFusione(10, 4)).toMatchObject({ min: 2, max: 3 });
    expect([puntiAllarmeFusione(0), puntiAllarmeFusione(1), puntiAllarmeFusione(2), puntiAllarmeFusione(3)]).toEqual([15, 20, 25, 25]);
  });
});

describe('Forca', () => {
  const base = { rangoConfidente: 0, igorMax: false, stessaArcana: false, tesoro: false, allarme: false, penalitaLivello: false };
  it('ranghi documentati, interpolazione e fattori cumulativi', () => {
    expect(moltiplicatoreForca({ ...base }).moltiplicatore).toBe(1);
    expect(moltiplicatoreForca({ ...base, rangoConfidente: 1 }).moltiplicatore).toBe(1.25);
    expect(moltiplicatoreForca({ ...base, rangoConfidente: 1, igorMax: true }).moltiplicatore).toBe(1.5);
    expect(moltiplicatoreForca({ ...base, rangoConfidente: 10 }).moltiplicatore).toBe(3.5);
    const r3 = moltiplicatoreForca({ ...base, rangoConfidente: 3 });
    expect(r3.interpolato).toBe(true);
    expect(r3.moltiplicatore).toBe(1.75); // fra 1,25 (r1) e 2,25 (r5)
    expect(moltiplicatoreForca({ ...base, rangoConfidente: 5, stessaArcana: true }).moltiplicatore).toBe(3.38); // 2,25 × 1,5
    expect(moltiplicatoreForca({ ...base, rangoConfidente: 5, tesoro: true }).moltiplicatore).toBe(6.75);
    expect(moltiplicatoreForca({ ...base, rangoConfidente: 5, tesoro: true, stessaArcana: true }).moltiplicatore).toBe(11.25);
    expect(moltiplicatoreForca({ ...base, rangoConfidente: 5, penalitaLivello: true }).moltiplicatore).toBe(1.13);
  });
  it('con l\'Allarme la scala fissa sostituisce i moltiplicatori; skill trasferite 1–3', () => {
    expect(moltiplicatoreForca({ ...base, rangoConfidente: 10, allarme: true }).moltiplicatore).toBe(2);
    expect(moltiplicatoreForca({ ...base, allarme: true, stessaArcana: true }).moltiplicatore).toBe(3);
    expect(moltiplicatoreForca({ ...base, allarme: true, tesoro: true }).moltiplicatore).toBe(5);
    expect(moltiplicatoreForca({ ...base, allarme: true, tesoro: true, stessaArcana: true }).moltiplicatore).toBe(7);
    expect(moltiplicatoreForca({ ...base, allarme: true }).skillTrasferite).toMatch(/1–3/);
    expect(moltiplicatoreForca({ ...base }).skillTrasferite).toMatch(/^1 /);
    expect(FORCA_INCIDENTE_BONUS.entrambeCariche).toBe(15);
  });
});

describe('Isolamento', () => {
  it('giorni per rango delle Gemelle e tier di resistenza per livello', () => {
    expect(giorniIsolamento(3)).toBe(4);
    expect(giorniIsolamento(4)).toBe(3);
    expect(giorniIsolamento(7)).toBe(2);
    expect(giorniIsolamento(10)).toBe(1);
    expect(tierResistenza(1).chiave).toBe('Dodge');
    expect(tierResistenza(33).chiave).toBe('Evade');
    expect(tierResistenza(34).chiave).toBe('Resist');
    expect(tierResistenza(62).chiave).toBe('Null');
    expect(tierResistenza(74).chiave).toBe('Repel');
    expect(tierResistenza(99).chiave).toBe('Drain');
  });
  it('guadagno dell\'incenso: un\'applicazione ogni 2 giorni, raddoppiata con l\'Allarme', () => {
    const nirvana = INCENSI.find((i) => i.chiave === 'nirvana')!;
    expect(guadagnoIncenso(nirvana, 4, false)).toEqual({ applicazioni: 2, puntiPerStatistica: 6, totale: 6 });
    expect(guadagnoIncenso(nirvana, 4, true)).toEqual({ applicazioni: 2, puntiPerStatistica: 12, totale: 12 });
    const rasta = INCENSI.find((i) => i.chiave === 'rasta')!;
    expect(guadagnoIncenso(rasta, 3, false)).toEqual({ applicazioni: 1, puntiPerStatistica: 1, totale: 3 });
    expect(guadagnoIncenso(rasta, 1, false).applicazioni).toBe(0);
  });
});

describe('Gemelle Custodi', () => {
  it('sblocchi per rango e prossimo sblocco', () => {
    expect(sblocchiGemelle(0).ottenuti).toEqual([]);
    expect(sblocchiGemelle(0).prossimo?.rango).toBe(1);
    expect(sblocchiGemelle(4).ottenuti.map((s) => s.rango)).toEqual([1, 3]);
    expect(sblocchiGemelle(4).prossimo?.nome).toBe('Trattamento speciale');
    expect(sblocchiGemelle(10).prossimo).toBeNull();
  });
});
