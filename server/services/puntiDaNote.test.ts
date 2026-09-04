// ============================================================
// Test puntiDaNote — scalini 2/3/5/7, libro a resa maggiorata, «Anima da cineasta», ×1,5 per difetto
// ============================================================

import { puntiDaNote } from './partiteService.js';

describe('puntiDaNote', () => {
  it('note → punti: 1 = 2, 2 = 3, 3 = 5; libro a resa maggiorata: 3 note = 7', () => {
    expect([puntiDaNote(1), puntiDaNote(2), puntiDaNote(3)]).toEqual([2, 3, 5]);
    expect(puntiDaNote(3, true)).toBe(7);
    expect(puntiDaNote(2, true)).toBe(3);
  });

  it('«Anima da cineasta» alza di uno scalino: 2→3, 3→5, 5→7; il quarto scalino resta 7', () => {
    expect([puntiDaNote(1, false, false, true), puntiDaNote(2, false, false, true), puntiDaNote(3, false, false, true)]).toEqual([3, 5, 7]);
    expect(puntiDaNote(3, true, false, true)).toBe(7);
  });

  it('la fortuna di Chihaya moltiplica per 1,5 per difetto, dopo il cinema: 2→3, 3→4, 5→7, 7→10', () => {
    expect([puntiDaNote(1, false, true), puntiDaNote(2, false, true), puntiDaNote(3, false, true), puntiDaNote(3, true, true)]).toEqual([3, 4, 7, 10]);
    expect(puntiDaNote(2, false, true, true)).toBe(7);
    expect(puntiDaNote(3, false, true, true)).toBe(10);
  });
});
