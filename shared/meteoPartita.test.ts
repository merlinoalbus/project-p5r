// ============================================================
// Test meteoPartita — il testo della guida diviso nelle due fasce, e che cosa guasta un evento all'aperto
// ============================================================

import { fasceDellaGuida, guastaLAperto, meteoDelSegmento, piove } from './meteoPartita.js';

it('«A/B» è A di giorno e B di sera; un valore solo vale per entrambe', () => {
  expect(fasceDellaGuida('Sereno/Pioggia')).toEqual({ giorno: 'sereno', sera: 'pioggia' });
  expect(fasceDellaGuida('Nuvoloso')).toEqual({ giorno: 'nuvoloso', sera: 'nuvoloso' });
  expect(fasceDellaGuida('Neve/Nuvoloso (ondata di gelo)')).toEqual({ giorno: 'neve', sera: 'nuvoloso' });
  expect(fasceDellaGuida(null)).toEqual({ giorno: null, sera: null });
  expect(fasceDellaGuida('')).toEqual({ giorno: null, sera: null });
});

it('il modificatore fra parentesi non conta; acquazzone e temporale sono pioggia', () => {
  expect(meteoDelSegmento('Sereno (notte torrida)')).toBe('sereno');
  expect(meteoDelSegmento('Pioggia (acquazzone improvviso)')).toBe('pioggia');
  expect(meteoDelSegmento('Temporale')).toBe('pioggia');
  expect(meteoDelSegmento('Neve (ondata di gelo)')).toBe('neve');
  expect(meteoDelSegmento('???')).toBeNull();
});

it('all’aperto guastano pioggia e neve; «piove» è solo la pioggia', () => {
  expect(['sereno', 'nuvoloso', 'pioggia', 'neve'].map((m) => guastaLAperto(m as never))).toEqual([false, false, true, true]);
  expect(['sereno', 'nuvoloso', 'pioggia', 'neve'].map((m) => piove(m as never))).toEqual([false, false, true, false]);
});
