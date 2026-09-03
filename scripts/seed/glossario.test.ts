// ============================================================
// Test glossario — traduzione delle fonti carta e coerenza delle mappe
// ============================================================

import { ARCANI, ELEMENTI_AFFINITA, COLONNE_EREDITA, STATISTICHE, traduciFonteCarta } from './glossario.js';

describe('traduciFonteCarta', () => {
  it('traduce le visite al Jazz Club numerate e con date', () => {
    expect(traduciFonteCarta('Jazz 1')).toBe('Jazz Club, visita n. 1');
    expect(traduciFonteCarta('Jazz 1/15 Foggy Day 50')).toBe('Jazz Club il 15/1; Sfida Giorno di Nebbia (punteggio 50)');
    expect(traduciFonteCarta('Jazz 7/10 10/9')).toBe('Jazz Club il 10/7 o il 9/10');
    expect(traduciFonteCarta('Jazz 7/31 10/23 CJ Aquarium')).toBe('Jazz Club il 31/7 o il 23/10; uscita con le Gemelle Custodi: Acquario');
  });

  it('traduce uscite con le Gemelle, Lavenza, sfide, fusioni e anelli', () => {
    expect(traduciFonteCarta('CJ Gym Trickster 50')).toBe('uscita con le Gemelle Custodi: Palestra; Sfida Trickster (punteggio 50)');
    expect(traduciFonteCarta('L Leblanc')).toBe('Lavenza al Leblanc');
    expect(traduciFonteCarta('Trial 80')).toBe('Sfida Prova (punteggio 80)');
    expect(traduciFonteCarta('Full Moon ???')).toBe('Sfida Luna Piena (punteggio da verificare)');
    expect(traduciFonteCarta('Network Fusion')).toBe('Fusione in rete');
    expect(traduciFonteCarta('Fusion Mutation')).toBe('Mutazione da fusione');
    expect(traduciFonteCarta('Ring of Lust')).toBe('Anello della Lussuria');
  });

  it('restituisce null su frammenti sconosciuti (il normalizzatore li tratta come errore)', () => {
    expect(traduciFonteCarta('Qualcosa di ignoto')).toBeNull();
    expect(traduciFonteCarta('Jazz 1 Ignoto')).toBeNull();
  });
});

describe('mappe del glossario', () => {
  it('ha 24 arcani con chiavi uniche e Mondo per ultimo', () => {
    expect(ARCANI).toHaveLength(24);
    expect(new Set(ARCANI.map((a) => a.chiave)).size).toBe(24);
    expect(ARCANI[ARCANI.length - 1].chiave).toBe('World');
  });

  it('ha 10 affinità, 12 colonne di eredità e 5 statistiche', () => {
    expect(ELEMENTI_AFFINITA).toHaveLength(10);
    expect(COLONNE_EREDITA).toHaveLength(12);
    expect(STATISTICHE.map((s) => s.sigla)).toEqual(['FR', 'MA', 'RS', 'AG', 'FO']);
  });
});
