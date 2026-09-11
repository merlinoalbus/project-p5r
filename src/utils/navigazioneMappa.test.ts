import { arrivoSpillo, destinazioneMappaSpillo } from './navigazioneMappa';
import type { SpilloDto } from '../types';
const legacy = { tipo: 'passaggio', riferimento: { tipo: 'mappa', chiave: 'vecchia' }, dettaglio: { tipo: 'mappa', mappa: { chiave: 'vecchia' } } } as SpilloDto;
it('la destinazione esplicita vince sul vecchio riferimento, e porta lo spillo di arrivo', () => {
  expect(arrivoSpillo({ ...legacy, destinazione: { mappa: 'nuova', spillo: 5 } })).toEqual({ mappa: 'nuova', spillo: 5 });
  expect(destinazioneMappaSpillo({ ...legacy, destinazione: { mappa: 'nuova', spillo: null } })).toBe('nuova');
});
it('non considera raggiungibile un arrivo invalidato', () => {
  expect(destinazioneMappaSpillo({ ...legacy, destinazioneNonDisponibile: true })).toBeNull();
});
it('mantiene il collegamento legacy risolto e scarta quello non risolto', () => {
  expect(destinazioneMappaSpillo(legacy)).toBe('vecchia');
  expect(destinazioneMappaSpillo({ ...legacy, dettaglio: null })).toBeNull();
});
it('solo gli spostamenti portano altrove: un negozio o una nota con un riferimento a una mappa non sono un passaggio', () => {
  expect(destinazioneMappaSpillo({ ...legacy, tipo: 'negozio' })).toBeNull();
  expect(destinazioneMappaSpillo({ ...legacy, tipo: 'nota', destinazione: { mappa: 'nuova', spillo: null } })).toBeNull();
  expect(destinazioneMappaSpillo({ ...legacy, tipo: 'ingresso-palazzo' })).toBe('vecchia');
});
