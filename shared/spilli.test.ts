// ============================================================
// Test registro dei tipi di spillo — conteggio, completezza delle definizioni, colori distinti, tipo «dialogo»
// ============================================================

import { DEFINIZIONI_SPILLO, TIPI_SPILLO, spilloPerLuogo, spilloPerPunto } from './spilli.js';

describe('registro dei tipi di spillo', () => {
  it('conta 20 tipi distinti, ognuno con nome, colore esadecimale e riserva nel registro', () => {
    expect(TIPI_SPILLO).toHaveLength(20);
    expect(new Set(TIPI_SPILLO).size).toBe(20);
    for (const t of TIPI_SPILLO) expect(DEFINIZIONI_SPILLO[t]).toMatchObject({ nome: expect.any(String), colore: expect.stringMatching(/^#[0-9a-f]{6}$/) });
    expect(new Set(TIPI_SPILLO.map((t) => DEFINIZIONI_SPILLO[t].colore)).size).toBe(20);
  });

  it('«dialogo» è collezionabile, senza riferimento tipico e non nasce da alcuna corrispondenza automatica', () => {
    expect(DEFINIZIONI_SPILLO.dialogo).toEqual({ nome: 'Dialogo', colore: '#6366f1', collezionabile: true, riferimento: null });
    expect(spilloPerPunto('persona')).toBe('nota');
    expect(spilloPerLuogo('altro')).toBe('nota');
  });
});
