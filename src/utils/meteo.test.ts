// ============================================================
// Test meteo — riconoscimento delle chiavi delle icone dal testo della guida
// ============================================================

import { chiaveMeteo, modificatoreMeteo, segmentiMeteo } from './meteo';

describe('meteo', () => {
  it('riconosce le condizioni principali e i modificatori fra parentesi', () => {
    expect(chiaveMeteo('Sereno')).toBe('sereno');
    expect(chiaveMeteo('Nuvoloso')).toBe('nuvoloso');
    expect(chiaveMeteo('Pioggia (acquazzone improvviso)')).toBe('pioggia');
    expect(chiaveMeteo('Neve')).toBe('neve');
    expect(chiaveMeteo('Sereno (notte torrida)')).toBe('sereno');
    expect(modificatoreMeteo('Sereno (notte torrida)')).toBe('caldo');
    expect(modificatoreMeteo('Neve/Neve (ondata di gelo)'.split('/')[1])).toBe('freddo');
    expect(modificatoreMeteo('Sereno')).toBeNull();
    expect(chiaveMeteo('boh')).toBeNull();
  });

  it('divide giorno e sera e unisce i segmenti uguali', () => {
    expect(segmentiMeteo('Sereno/Nuvoloso')).toEqual([{ chiave: 'sereno', testo: 'Sereno' }, { chiave: 'nuvoloso', testo: 'Nuvoloso' }]);
    expect(segmentiMeteo('Neve/Neve (ondata di gelo)')).toEqual([{ chiave: 'neve', testo: 'Neve (ondata di gelo)' }]);
    expect(segmentiMeteo('Pioggia/Sereno')).toHaveLength(2);
    expect(segmentiMeteo(null)).toEqual([]);
    expect(segmentiMeteo('')).toEqual([]);
  });
});
