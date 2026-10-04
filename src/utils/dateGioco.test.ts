// ============================================================
// Test dateGioco — date di gioco in parole, con l'articolo giusto davanti
// ============================================================

import { dataGiocoConArticolo, dataGiocoTesto, meseGioco } from './dateGioco';

it('«MM-GG» in parole e il mese', () => {
  expect(dataGiocoTesto('04-12')).toBe('12 aprile');
  expect(dataGiocoTesto('01-08')).toBe('8 gennaio');
  expect(meseGioco('03-01')).toBe('Marzo');
});

it('l’articolo si apostrofa davanti a 8 e 11, anche con le preposizioni', () => {
  expect(dataGiocoConArticolo('04-12')).toBe('il 12 aprile');
  expect(dataGiocoConArticolo('04-11')).toBe('l’11 aprile');
  expect(dataGiocoConArticolo('05-08')).toBe('l’8 maggio');
  expect(dataGiocoConArticolo('04-11', 'di')).toBe('dell’11 aprile');
  expect(dataGiocoConArticolo('04-12', 'di')).toBe('del 12 aprile');
  expect(dataGiocoConArticolo('04-11', 'a')).toBe('all’11 aprile');
  expect(dataGiocoConArticolo('04-18', 'a')).toBe('al 18 aprile');
  expect(dataGiocoConArticolo('04-11', 'da')).toBe('dall’11 aprile');
  expect(dataGiocoConArticolo('05-08', 'da')).toBe('dall’8 maggio');
  expect(dataGiocoConArticolo('04-12', 'da')).toBe('dal 12 aprile');
  // 1 e 18 non si apostrofano
  expect(dataGiocoConArticolo('05-01')).toBe('il 1 maggio');
});
