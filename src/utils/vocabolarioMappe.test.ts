import { describe, expect, it } from 'vitest';
import { etichettaMappeSorelle, titoloMappeSorelle, titoloMappeVicine } from './vocabolarioMappe';

// L0 (2026-10-20): l'intestazione del visore sopra le mappe figlie e il genitore diceva «Luoghi e planimetrie» per tutto, ma
// «luogo» è solo l'attività: le figlie di Tokyo sono quartieri, di un quartiere aree, di un Palazzo planimetrie.
describe('titoloMappeVicine', () => {
  it('dice che cosa sono le mappe sotto e sopra quella aperta', () => {
    expect(titoloMappeVicine('citta')).toBe('Quartieri');
    expect(titoloMappeVicine('quartiere')).toBe('Aree');
    expect(titoloMappeVicine('luogo')).toBe('Planimetrie e mappe collegate');
    expect(titoloMappeVicine('palazzo')).toBe('Planimetrie');
    expect(titoloMappeVicine('area')).toBe('Planimetrie');
    expect(titoloMappeVicine('dedalo')).toBe('Mappe collegate');
    expect(titoloMappeVicine('generica')).toBe('Mappe collegate');
  });
});

// L0: il selettore del pannello cambia fra le mappe dello stesso genitore — quartieri fra i quartieri, aree fra le aree,
// planimetrie fra le planimetrie di un Palazzo (al primo giro diceva «Aree» anche sotto Shibuya, che è un quartiere)
describe('titoloMappeSorelle', () => {
  it('dice che cosa sono le mappe accanto a quella aperta', () => {
    expect(titoloMappeSorelle('quartiere')).toBe('Quartieri');
    expect(titoloMappeSorelle('luogo')).toBe('Aree');
    expect(titoloMappeSorelle('area')).toBe('Planimetrie');
    expect(titoloMappeSorelle('palazzo')).toBe('Palazzi');
    expect(titoloMappeSorelle('generica')).toBe('Mappe');
  });
});
describe('etichettaMappeSorelle', () => {
  it('accorda il nome del gruppo per i lettori di schermo', () => {
    expect(etichettaMappeSorelle('quartiere')).toBe('Altri quartieri');
    expect(etichettaMappeSorelle('luogo')).toBe('Altre aree');
    expect(etichettaMappeSorelle('area')).toBe('Altre planimetrie');
    expect(etichettaMappeSorelle('palazzo')).toBe('Altri Palazzi');
    expect(etichettaMappeSorelle('citta')).toBe('Altre mappe');
  });
});
