// ============================================================
// Test lotti
// ============================================================

import { lotti } from './lotti';

describe('lotti', () => {
  it('divide in blocchi consecutivi, ultimo più corto', () => {
    expect(lotti([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(lotti([1, 2], 10)).toEqual([[1, 2]]);
    expect(lotti([], 3)).toEqual([]);
  });
  it('rifiuta dimensioni non valide', () => {
    expect(() => lotti([1], 0)).toThrow();
    expect(() => lotti([1], 1.5)).toThrow();
  });
});
