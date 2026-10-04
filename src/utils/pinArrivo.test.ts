// ============================================================
// Test pinArrivo — i pin con lo stesso nome si distinguono col posto
// ============================================================

import { opzioniPinArrivo } from './pinArrivo';

/** Un pin di prova con nome, tipo e posizione. */
const pin = (id: number, nome: string, x: number, y: number, tipoNome = 'Passaggio') => ({ id, nome, tipoNome, x, y });

describe('opzioniPinArrivo', () => {
  it('in ordine di nome; a parità di nome dall’alto in basso, poi da sinistra, col posto nel nome', () => {
    expect(opzioniPinArrivo([pin(1, 'Passaggio', 50, 80), pin(2, 'Stanza sicura', 10, 10, 'Stanza sicura'), pin(3, 'Passaggio', 70, 20), pin(4, 'Passaggio', 30, 20), pin(5, 'Armeria', 0, 0, 'Nota')])).toEqual([
      { chiave: '5', nome: 'Armeria', dettaglio: 'Nota' },
      { chiave: '4', nome: 'Passaggio — 1° di 3 dall’alto', dettaglio: 'Passaggio' },
      { chiave: '3', nome: 'Passaggio — 2° di 3 dall’alto', dettaglio: 'Passaggio' },
      { chiave: '1', nome: 'Passaggio — 3° di 3 dall’alto', dettaglio: 'Passaggio' },
      { chiave: '2', nome: 'Stanza sicura', dettaglio: 'Stanza sicura' },
    ]);
  });

  it('un pin senza nome si chiama col suo numero; un elenco vuoto resta vuoto', () => {
    expect(opzioniPinArrivo([pin(9, '', 1, 1, 'Nota')])).toEqual([{ chiave: '9', nome: 'Pin 9', dettaglio: 'Nota' }]);
    expect(opzioniPinArrivo([])).toEqual([]);
  });
});
