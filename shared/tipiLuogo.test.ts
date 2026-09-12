import { TIPI_LUOGO, definizioneTipoLuogo, eTipoLuogo, ordinaTipiLuogo, spilloPerLuogo } from './tipiLuogo';
import { DEFINIZIONI_SPILLO, TIPI_SPILLO } from './spilli';

describe('tipiLuogo', () => {
  it('copre i dieci tipi con chiavi uniche, nome e un\'icona che è uno spillo esistente', () => {
    expect(TIPI_LUOGO).toHaveLength(10);
    expect(new Set(TIPI_LUOGO.map((t) => t.chiave)).size).toBe(10);
    for (const t of TIPI_LUOGO) {
      expect(t.nome.length).toBeGreaterThan(0);
      expect(TIPI_SPILLO).toContain(t.icona);
    }
  });
  it('una sorgente sola: lo spillo sulla pianta e il colore della pastiglia vengono dal catalogo', () => {
    for (const t of TIPI_LUOGO) {
      expect(spilloPerLuogo(t.chiave)).toBe(t.icona);
      expect(t.colore).toBe(DEFINIZIONI_SPILLO[t.icona].colore);
    }
    expect(spilloPerLuogo('servizio')).toBe('attivita');
    expect(spilloPerLuogo('scuola')).toBe('biblioteca');
    expect(spilloPerLuogo('trasporto')).toBe('treno');
    // non sono tipi di luogo ma entità della città con un segno proprio
    expect(spilloPerLuogo('velluto')).toBe('velluto');
    expect(spilloPerLuogo('mementos')).toBe('mementos');
    expect(spilloPerLuogo('sconosciuto')).toBe('nota');
  });
  it('riconosce i tipi e ricade su «Altro» per quelli sconosciuti', () => {
    expect(eTipoLuogo('negozio')).toBe(true);
    expect(eTipoLuogo('bar')).toBe(false);
    expect(definizioneTipoLuogo('bar').chiave).toBe('altro');
  });
  it('ordina i tipi presenti secondo il catalogo, senza doppioni', () => {
    expect(ordinaTipiLuogo(['trasporto', 'negozio', 'servizio', 'negozio'])).toEqual(['negozio', 'servizio', 'trasporto']);
  });
});
